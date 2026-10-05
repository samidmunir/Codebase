import type {
  AdminAirspace,
  AdminCreateUserRequest,
  AdminSummary,
  AdminUpdateUserRequest,
  AdminUser,
  AdminUserDetail,
  AdminUserList,
  AdminUserListQuery,
  UserRole,
} from '@vector/shared';
import type { AirspacesRepository } from '../airspaces/airspaces-repository';
import type { ResultsRepository } from '../results/results-repository';
import type { Verifier } from '../results/verifier';
import { hashPassword } from '../auth/passwords';
import type { SessionsRepository } from '../auth/sessions-repository';
import type { SavedSessionsRepository } from '../sessions/sessions-repository';
import type { UserRecord, UsersRepository } from '../users/users-repository';
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

const removesAdmin = (
  user: UserRecord,
  changes: { role?: UserRole | undefined; disabled?: boolean | undefined },
) =>
  user.role === 'admin' &&
  !user.disabledAt &&
  (changes.role === 'player' || changes.disabled === true);

export function adminService(deps: {
  users: UsersRepository;
  signIns: SessionsRepository;
  savedSessions: SavedSessionsRepository;
  airspaces: AirspacesRepository;
  audit: AuditRepository;
  results: ResultsRepository;
  verifier: Verifier;
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
      const user = await users.adminView(id);
      return { user, sessions: await savedSessions.list(id) };
    },

    async createUser(
      actor: Actor,
      input: Required<Pick<AdminCreateUserRequest, 'role'>> & Omit<AdminCreateUserRequest, 'role'>,
    ): Promise<AdminUser> {
      const user = await users.create({
        email: input.email,
        handle: input.handle,
        displayName: input.displayName,
        passwordHash: await hashPassword(input.password),
        role: input.role,
      });
      await audit.record(actor, 'user.create', user.email, {
        handle: user.handle,
        displayName: user.displayName,
        role: user.role,
      });
      return users.adminView(user.id);
    },

    async updateUser(
      actor: Actor,
      id: string,
      changes: AdminUpdateUserRequest,
    ): Promise<AdminUser> {
      const current = await users.findById(id);
      if (!current) return users.adminView(id); // Throws not found.
      if (id === actor.id && changes.role === 'player')
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
      if (Object.keys(details).length > 0)
        await audit.record(actor, 'user.update', before.email, details);
      return users.adminView(id);
    },

    async deleteUser(actor: Actor, id: string): Promise<void> {
      if (id === actor.id) throw new AdminGuardError('You can’t delete your own account');
      const current = await users.findById(id);
      if (current && removesAdmin(current, { role: 'player' })) await keepAnAdmin();
      const deleted = await users.delete(id);
      await audit.record(actor, 'user.delete', deleted.email, {
        displayName: deleted.displayName,
        role: deleted.role,
      });
    },

    async signOutEverywhere(actor: Actor, id: string): Promise<void> {
      const user = await users.adminView(id);
      await signIns.revokeAllForUser(id);
      await audit.record(actor, 'user.signOut', user.email, { signIns: user.activeSignIns });
    },

    async deleteSavedSession(actor: Actor, userId: string, sessionId: string): Promise<void> {
      const user = await users.adminView(userId);
      const name = await savedSessions.adminDelete(userId, sessionId);
      await audit.record(actor, 'user.sessionDelete', user.email, { session: name });
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
