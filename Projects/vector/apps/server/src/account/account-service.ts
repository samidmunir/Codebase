import {
  HANDLE_CHANGE_DAYS,
  type Account,
  type ChangePasswordRequest,
  type DeleteAccountRequest,
  type HandleAvailability,
  type UpdateProfileRequest,
} from '@vector/shared';
import { handleSchema } from '@vector/shared';
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from '../auth/passwords';
import type { SessionsRepository } from '../auth/sessions-repository';
import { hashRefreshToken } from '../auth/tokens';
import { UserNotFoundError, type UsersRepository } from '../users/users-repository';

/** The current password was wrong (changing the password, deleting the account). */
export class WrongPasswordError extends Error {
  constructor() {
    super('That password is incorrect');
    this.name = 'WrongPasswordError';
  }
}

/** Handles can change once every HANDLE_CHANGE_DAYS days. */
export class HandleChangeTooSoonError extends Error {
  constructor(readonly allowedAt: Date) {
    super(
      `You can change your handle again on ${allowedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    );
    this.name = 'HandleChangeTooSoonError';
  }
}

/** The handle typed to confirm deleting the account wasn't the account's. */
export class ConfirmationMismatchError extends Error {
  constructor() {
    super('Type your handle exactly to confirm');
    this.name = 'ConfirmationMismatchError';
  }
}

const DAY_MS = 86_400_000;

/** What pilots can do with their own account. */
export function accountService(users: UsersRepository, signIns: SessionsRepository) {
  async function current(userId: string) {
    const user = await users.findById(userId);
    if (!user) throw new UserNotFoundError();
    return user;
  }

  /** When the handle may next change: a made-up handle can always be replaced. */
  const changeableAt = (user: { handleGenerated: boolean; handleChangedAt: Date | null }) =>
    !user.handleGenerated && user.handleChangedAt
      ? new Date(user.handleChangedAt.getTime() + HANDLE_CHANGE_DAYS * DAY_MS)
      : undefined;

  async function verify(user: { passwordHash: string }, password: string) {
    if (!(await verifyPassword(password, user.passwordHash))) throw new WrongPasswordError();
  }

  return {
    async get(userId: string): Promise<Account> {
      const user = await current(userId);
      const allowed = changeableAt(user);
      return {
        id: user.id,
        email: user.email,
        handle: user.handle,
        handleGenerated: user.handleGenerated,
        displayName: user.displayName,
        profilePublic: user.profilePublic,
        showOnRecords: user.showOnRecords,
        handleChangeableAt:
          allowed && allowed.getTime() > Date.now() ? allowed.toISOString() : null,
        createdAt: user.createdAt.toISOString(),
        activeSignIns: await signIns.countActive(user.id),
      };
    },

    async handleAvailability(handle: string, userId?: string): Promise<HandleAvailability> {
      const parsed = handleSchema.safeParse(handle);
      if (!parsed.success)
        return { handle, available: false, reason: parsed.error.issues[0]?.message ?? 'Invalid' };
      const available = await users.handleAvailable(parsed.data, userId);
      return available
        ? { handle: parsed.data, available }
        : { handle: parsed.data, available, reason: 'That handle is taken' };
    },

    async updateProfile(userId: string, changes: UpdateProfileRequest): Promise<Account> {
      const user = await current(userId);
      const newHandle =
        changes.handle !== undefined && changes.handle.toLowerCase() !== user.handle.toLowerCase();
      const allowed = changeableAt(user);
      if (newHandle && allowed && allowed.getTime() > Date.now())
        throw new HandleChangeTooSoonError(allowed);
      await users.update(userId, {
        ...(changes.handle !== undefined ? { handle: changes.handle } : {}),
        ...(changes.displayName !== undefined ? { displayName: changes.displayName } : {}),
        ...(changes.profilePublic !== undefined ? { profilePublic: changes.profilePublic } : {}),
        ...(changes.showOnRecords !== undefined ? { showOnRecords: changes.showOnRecords } : {}),
      });
      return this.get(userId);
    },

    /** Changes the password with the current one; every other device is signed out. */
    async changePassword(
      userId: string,
      request: ChangePasswordRequest,
      refreshToken: string | undefined,
    ): Promise<void> {
      const user = await current(userId);
      await verify(user, request.currentPassword);
      await users.update(userId, { passwordHash: await hashPassword(request.newPassword) });
      await this.signOutOthers(userId, refreshToken);
    },

    /** Ends every sign-in except this device's (or all of them, if this one is unknown). */
    async signOutOthers(userId: string, refreshToken: string | undefined): Promise<void> {
      const session = refreshToken
        ? await signIns.findByTokenHash(hashRefreshToken(refreshToken))
        : undefined;
      if (session && session.userId === userId) await signIns.revokeOthers(userId, session.id);
      else await signIns.revokeAllForUser(userId);
    },

    /** Deletes the account and everything saved with it. */
    async delete(userId: string, request: DeleteAccountRequest): Promise<void> {
      const user = await users.findById(userId);
      // Verify a hash either way, so timing doesn't tell whether the account exists.
      const valid = await verifyPassword(
        request.password,
        user?.passwordHash ?? DUMMY_PASSWORD_HASH,
      );
      if (!user) throw new UserNotFoundError();
      if (!valid) throw new WrongPasswordError();
      if (request.confirmHandle.toLowerCase() !== user.handle.toLowerCase())
        throw new ConfirmationMismatchError();
      if (user.role === 'admin' && (await users.countActiveAdmins()) <= 1)
        throw new LastAdminError();
      await users.delete(userId);
    },
  };
}

/** The last admin can't delete their own account (someone must be able to manage Vector). */
export class LastAdminError extends Error {
  constructor() {
    super('You’re the only admin. Make someone else an admin before deleting your account.');
    this.name = 'LastAdminError';
  }
}

export type AccountService = ReturnType<typeof accountService>;
