import {
  HANDLE_CHANGE_DAYS,
  type AdminBulkAction,
  type AdminBulkResult,
  type AdminAirspace,
  type AdminCreateUserRequest,
  type AdminSummary,
  type AdminUpdateUserRequest,
  type AdminUser,
  type AdminUserDetail,
  type AdminUserList,
  type AdminUserListQuery,
  type UserRole,
} from '@vector/shared';
import type { AirspacesRepository } from '../airspaces/airspaces-repository';
import type { ResultsRepository } from '../results/results-repository';
import type { Verifier } from '../results/verifier';
import { hashPassword } from '../auth/passwords';
import type { SessionsRepository } from '../auth/sessions-repository';
import type { SavedSessionsRepository } from '../sessions/sessions-repository';
import {
  UserNotFoundError,
  type UserRecord,
  type UsersRepository,
} from '../users/users-repository';
import type { UserDetailRepository } from './user-detail-repository';
import type { AuditRepository } from './audit-repository';

/** A change an admin isn't allowed to make (to themselves, or to the last admin). */
export class AdminGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdminGuardError';
  }
}

/** The admin making a change. */
export interface Actor {
  id: string;
  email: string;
}

/** The most users one export holds. */
const EXPORT_LIMIT = 10_000;

/** What each bulk action changes on a user. */
const BULK_CHANGES: Record<
  Exclude<AdminBulkAction, 'delete' | 'signOut'>,
  AdminUpdateUserRequest
> = {
  disable: { disabled: true },
  enable: { disabled: false },
  verifyEmail: { emailVerified: true },
  suspendPosting: { postingSuspension: 7 },
  liftSuspension: { postingSuspension: 'lift' },
};

/**
 * A CSV field: quoted when needed, and with spreadsheet formulas defused
 * (a leading =, +, - or @ would run as a formula when opened).
 */
function csvCell(value: unknown): string {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const removesAdmin = (
  user: UserRecord,
  changes: { role?: UserRole | undefined; disabled?: boolean | undefined },
) =>
  user.role === 'admin' &&
  !user.disabledAt &&
  ((changes.role !== undefined && changes.role !== 'admin') || changes.disabled === true);

export function adminService(deps: {
  users: UsersRepository;
  signIns: SessionsRepository;
  savedSessions: SavedSessionsRepository;
  airspaces: AirspacesRepository;
  audit: AuditRepository;
  results: ResultsRepository;
  verifier: Verifier;
  /** Emails a new account its verification link. */
  sendVerification?: (userId: string) => Promise<void>;
  /** Emails an account a password reset link. */
  sendPasswordReset?: (userId: string) => Promise<void>;
  /** What a user played and posted, for their page. */
  details?: UserDetailRepository;
  /** An email change waiting for its link, if any. */
  pendingEmail?: (userId: string) => Promise<string | null>;
}) {
  const { users, signIns, savedSessions, airspaces, audit, results, verifier } = deps;

  /** There must always be an admin who can sign in. */
  async function keepAnAdmin(): Promise<void> {
    if ((await users.countActiveAdmins()) <= 1)
      throw new AdminGuardError('There must always be at least one admin who can sign in');
  }

  return {
    async summary(): Promise<AdminSummary> {
      const [counts, saved] = await Promise.all([users.summary(), savedSessions.count()]);
      return { ...counts, savedSessions: saved };
    },

    listUsers(
      query: Required<Pick<AdminUserListQuery, 'offset' | 'limit'>> &
        Omit<AdminUserListQuery, 'offset' | 'limit'>,
    ): Promise<AdminUserList> {
      return users.list(query);
    },

    async getUser(id: string): Promise<AdminUserDetail> {
      const [user, record, sessions, active, history] = await Promise.all([
        users.adminView(id),
        users.findById(id),
        savedSessions.list(id),
        signIns.listActive(id),
        audit.forUser(id),
      ]);
      if (!record) throw new UserNotFoundError();
      const changeableAt =
        !record.handleGenerated && record.handleChangedAt
          ? new Date(record.handleChangedAt.getTime() + HANDLE_CHANGE_DAYS * 86_400_000)
          : undefined;
      const [resultsSummary, posts, pendingEmail] = await Promise.all([
        deps.details?.results(id) ?? { total: 0, recent: [] },
        deps.details?.posts(id) ?? { total: 0, recent: [] },
        deps.pendingEmail?.(id) ?? null,
      ]);
      return {
        user: {
          ...user,
          profilePublic: record.profilePublic,
          showOnRecords: record.showOnRecords,
          handleChangeableAt:
            changeableAt && changeableAt.getTime() > Date.now() ? changeableAt.toISOString() : null,
          pendingEmail,
        },
        sessions,
        signIns: active.map((signIn) => ({ ...signIn, current: false })),
        results: resultsSummary,
        posts,
        history,
      };
    },

    /** Ends one of a user's sign-ins (one device). */
    async endSignIn(actor: Actor, userId: string, signInId: string): Promise<void> {
      const user = await users.adminView(userId);
      const device = (await signIns.listActive(userId)).find((s) => s.id === signInId);
      if (!(await signIns.revokeFamily(userId, signInId)))
        throw new AdminGuardError('That sign-in has already ended');
      await audit.record(
        actor,
        'user.endSignIn',
        user.email,
        { device: device?.device ?? 'Unknown device', ...(device?.ip ? { ip: device.ip } : {}) },
        userId,
      );
    },

    async sendPasswordReset(actor: Actor, userId: string): Promise<void> {
      const user = await users.adminView(userId);
      if (user.disabledAt)
        throw new AdminGuardError('Re-enable the account before sending it a reset link');
      await deps.sendPasswordReset?.(userId);
      await audit.record(actor, 'user.sendReset', user.email, {}, userId);
    },

    async sendVerificationEmail(actor: Actor, userId: string): Promise<void> {
      const user = await users.adminView(userId);
      if (user.emailVerified) throw new AdminGuardError('Their email is already verified');
      await deps.sendVerification?.(userId);
      await audit.record(actor, 'user.sendVerification', user.email, {}, userId);
    },

    /** One action across many users; ones it can't be done to are reported, not fatal. */
    async bulk(actor: Actor, ids: string[], action: AdminBulkAction): Promise<AdminBulkResult> {
      const failed: AdminBulkResult['failed'] = [];
      let done = 0;
      for (const id of new Set(ids)) {
        try {
          if (action === 'delete') await this.deleteUser(actor, id);
          else if (action === 'signOut') await this.signOutEverywhere(actor, id);
          else await this.updateUser(actor, id, BULK_CHANGES[action]);
          done += 1;
        } catch (error) {
          const email = (await users.findById(id))?.email ?? id;
          failed.push({
            id,
            email,
            reason: error instanceof Error ? error.message : 'Something went wrong',
          });
        }
      }
      return { done, failed };
    },

    /** Every user matching the filters, as CSV. Exports are logged: it's personal data. */
    async exportCsv(
      actor: Actor,
      query: Omit<AdminUserListQuery, 'offset' | 'limit'>,
    ): Promise<string> {
      const { users: rows } = await users.list({ ...query, offset: 0, limit: EXPORT_LIMIT });
      await audit.record(actor, 'user.export', `${rows.length} users`, {
        ...(query.q ? { search: query.q } : {}),
        ...(query.role ? { role: query.role } : {}),
        ...(query.status ? { status: query.status } : {}),
      });
      const header = [
        'id',
        'email',
        'email_verified',
        'handle',
        'display_name',
        'role',
        'disabled_at',
        'posting_suspended_until',
        'created_at',
        'last_active_at',
        'active_sign_ins',
        'saved_sessions',
        'career_rp',
      ];
      const lines = rows.map((user) =>
        [
          user.id,
          user.email,
          user.emailVerified,
          user.handle,
          user.displayName,
          user.role,
          user.disabledAt ?? '',
          user.postingSuspendedUntil ?? '',
          user.createdAt,
          user.lastActiveAt ?? '',
          user.activeSignIns,
          user.savedSessions,
          Math.round(user.careerRp),
        ]
          .map(csvCell)
          .join(','),
      );
      return [header.join(','), ...lines].join('\r\n') + '\r\n';
    },

    async createUser(
      actor: Actor,
      input: Required<Pick<AdminCreateUserRequest, 'role' | 'sendVerification'>> &
        Omit<AdminCreateUserRequest, 'role' | 'sendVerification'>,
    ): Promise<AdminUser> {
      const user = await users.create({
        email: input.email,
        handle: input.handle,
        displayName: input.displayName,
        passwordHash: await hashPassword(input.password),
        role: input.role,
      });
      await audit.record(
        actor,
        'user.create',
        user.email,
        {
          handle: user.handle,
          displayName: user.displayName,
          role: user.role,
          verificationSent: input.sendVerification,
        },
        user.id,
      );
      if (input.sendVerification) await deps.sendVerification?.(user.id);
      return users.adminView(user.id);
    },

    async updateUser(
      actor: Actor,
      id: string,
      changes: AdminUpdateUserRequest,
    ): Promise<AdminUser> {
      const current = await users.findById(id);
      if (!current) return users.adminView(id); // Throws not found.
      if (id === actor.id && changes.role !== undefined && changes.role !== 'admin')
        throw new AdminGuardError('You can’t remove your own admin role');
      if (id === actor.id && changes.disabled === true)
        throw new AdminGuardError('You can’t disable your own account');
      if (removesAdmin(current, changes)) await keepAnAdmin();

      const before = await users.update(id, {
        ...(changes.email !== undefined ? { email: changes.email } : {}),
        ...(changes.handle !== undefined ? { handle: changes.handle } : {}),
        ...(changes.displayName !== undefined ? { displayName: changes.displayName } : {}),
        ...(changes.password !== undefined
          ? { passwordHash: await hashPassword(changes.password) }
          : {}),
        ...(changes.role !== undefined ? { role: changes.role } : {}),
        ...(changes.disabled !== undefined ? { disabled: changes.disabled } : {}),
        ...(changes.emailVerified !== undefined ? { emailVerified: changes.emailVerified } : {}),
        ...(changes.profilePublic !== undefined ? { profilePublic: changes.profilePublic } : {}),
        ...(changes.showOnRecords !== undefined ? { showOnRecords: changes.showOnRecords } : {}),
        ...(changes.liftHandleLimit ? { liftHandleLimit: true } : {}),
        ...(changes.postingSuspension !== undefined
          ? {
              postingSuspendedUntil:
                changes.postingSuspension === 'lift'
                  ? null
                  : changes.postingSuspension === 'forever'
                    ? 'forever'
                    : new Date(Date.now() + changes.postingSuspension * 86_400_000),
            }
          : {}),
      });

      // A new password, a disabled account or a role change ends every sign-in.
      const roleChanged = changes.role !== undefined && changes.role !== before.role;
      const disabling = changes.disabled === true && !before.disabledAt;
      if (changes.password !== undefined || disabling || roleChanged)
        await signIns.revokeAllForUser(id);

      const details: Record<string, unknown> = {};
      if (changes.email !== undefined && changes.email !== before.email)
        details.email = { from: before.email, to: changes.email };
      if (changes.handle !== undefined && changes.handle !== before.handle)
        details.handle = { from: before.handle, to: changes.handle };
      if (changes.displayName !== undefined && changes.displayName !== before.displayName)
        details.displayName = { from: before.displayName, to: changes.displayName };
      if (roleChanged) details.role = { from: before.role, to: changes.role };
      if (changes.disabled !== undefined && changes.disabled !== Boolean(before.disabledAt))
        details.disabled = changes.disabled;
      if (changes.password !== undefined) details.password = 'changed';
      const wasVerified = before.emailVerifiedAt !== null;
      const emailChanged =
        changes.email !== undefined && changes.email.toLowerCase() !== before.email.toLowerCase();
      const nowVerified = changes.emailVerified ?? (emailChanged ? false : wasVerified);
      if (nowVerified !== wasVerified) details.emailVerified = nowVerified;
      if (changes.postingSuspension !== undefined)
        details.postingSuspension =
          typeof changes.postingSuspension === 'number'
            ? `${changes.postingSuspension} days`
            : changes.postingSuspension;
      if (changes.profilePublic !== undefined && changes.profilePublic !== before.profilePublic)
        details.profilePublic = changes.profilePublic;
      if (changes.showOnRecords !== undefined && changes.showOnRecords !== before.showOnRecords)
        details.showOnRecords = changes.showOnRecords;
      if (changes.liftHandleLimit && before.handleChangedAt) details.handleLimit = 'lifted';
      if (Object.keys(details).length > 0)
        await audit.record(actor, 'user.update', before.email, details, id);
      return users.adminView(id);
    },

    /** Deletes an account; with `withPosts`, its community posts and threads too. */
    async deleteUser(
      actor: Actor,
      id: string,
      options: { withPosts?: boolean } = {},
    ): Promise<void> {
      if (id === actor.id) throw new AdminGuardError('You can’t delete your own account');
      const current = await users.findById(id);
      if (current && removesAdmin(current, { role: 'player' })) await keepAnAdmin();
      const deleted = await users.delete(id, options);
      await audit.record(actor, 'user.delete', deleted.email, {
        displayName: deleted.displayName,
        role: deleted.role,
        ...(options.withPosts
          ? { threadsDeleted: deleted.removedThreads, postsDeleted: deleted.removedPosts }
          : {}),
      });
    },

    async signOutEverywhere(actor: Actor, id: string): Promise<void> {
      const user = await users.adminView(id);
      await signIns.revokeAllForUser(id);
      await audit.record(actor, 'user.signOut', user.email, { signIns: user.activeSignIns }, id);
    },

    async deleteSavedSession(actor: Actor, userId: string, sessionId: string): Promise<void> {
      const user = await users.adminView(userId);
      const name = await savedSessions.adminDelete(userId, sessionId);
      await audit.record(actor, 'user.sessionDelete', user.email, { session: name }, userId);
    },

    listAirspaces(): Promise<AdminAirspace[]> {
      return airspaces.adminList();
    },

    async setAirspace(actor: Actor, id: string, enabled: boolean): Promise<AdminAirspace> {
      const was = await airspaces.setEnabled(id, enabled, actor.id);
      if (was !== enabled) await audit.record(actor, 'airspace.update', id, { enabled });
      return (await airspaces.adminList()).find((airspace) => airspace.id === id)!;
    },

    auditLog: () => audit.list(),

    listResults: (query: Parameters<ResultsRepository['adminList']>[0]) => results.adminList(query),

    listSavedSessions: (query: Parameters<SavedSessionsRepository['adminList']>[0]) =>
      savedSessions.adminList(query),

    /** Hides or shows several results; ones that are gone are skipped. */
    async setResultsHidden(
      actor: Actor,
      ids: string[],
      hidden: boolean,
    ): Promise<{ done: number }> {
      let done = 0;
      for (const id of new Set(ids)) {
        try {
          await this.setResultHidden(actor, id, hidden);
          done += 1;
        } catch {
          // Deleted meanwhile: nothing to hide.
        }
      }
      return { done };
    },

    async setResultHidden(actor: Actor, id: string, hidden: boolean): Promise<void> {
      const handle = await results.setHidden(id, hidden);
      await audit.record(actor, hidden ? 'result.hide' : 'result.show', `@${handle}`, {
        result: id,
      });
    },

    /** Checks a result again by replaying it (e.g. after a fix). */
    async reverifyResult(actor: Actor, id: string): Promise<void> {
      const handle = await results.handleOf(id);
      if (!(await results.requeue(id)))
        throw new AdminGuardError('That session has no replay, so it can’t be verified');
      await audit.record(actor, 'result.reverify', `@${handle}`, { result: id });
      void verifier.runOnce();
    },
  };
}

export type AdminService = ReturnType<typeof adminService>;
