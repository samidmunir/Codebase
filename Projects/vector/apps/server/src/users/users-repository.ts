import {
  HANDLE_CHANGE_DAYS,
  type AdminUser,
  type AdminUserListQuery,
  type UserRole,
} from '@vector/shared';
import type { Database } from '../platform/database';

export interface UserRecord {
  id: string;
  email: string;
  handle: string;
  /** Made up for an account from before handles; the pilot should choose one. */
  handleGenerated: boolean;
  handleChangedAt: Date | null;
  displayName: string;
  passwordHash: string;
  role: UserRole;
  disabledAt: Date | null;
  createdAt: Date;
  /** Others can see this pilot's profile and results. */
  profilePublic: boolean;
}

interface UserRow {
  id: string;
  email: string;
  handle: string;
  handle_generated: boolean;
  handle_changed_at: Date | null;
  display_name: string;
  password_hash: string;
  role: UserRole;
  disabled_at: Date | null;
  created_at: Date;
  profile_public: boolean;
}

const COLUMNS =
  'id, email, handle, handle_generated, handle_changed_at, display_name, password_hash, role, disabled_at, created_at, profile_public';

const toRecord = (row: UserRow): UserRecord => ({
  id: row.id,
  email: row.email,
  handle: row.handle,
  handleGenerated: row.handle_generated,
  handleChangedAt: row.handle_changed_at,
  displayName: row.display_name,
  passwordHash: row.password_hash,
  role: row.role,
  disabledAt: row.disabled_at,
  createdAt: row.created_at,
  profilePublic: row.profile_public,
});

interface AdminUserRow {
  id: string;
  email: string;
  handle: string;
  display_name: string;
  role: UserRole;
  disabled_at: Date | null;
  created_at: Date;
  last_active_at: Date | null;
  active_sign_ins: number;
  saved_sessions: number;
  career_rp: number;
}

/** A user with their activity and saved-session totals, for the admin pages. */
const ADMIN_USER_SELECT = `
  SELECT u.id, u.email, u.handle, u.display_name, u.role, u.disabled_at, u.created_at,
    (SELECT max(a.last_used_at) FROM auth_sessions a WHERE a.user_id = u.id) AS last_active_at,
    (SELECT count(*)::int FROM auth_sessions a
       WHERE a.user_id = u.id AND a.revoked_at IS NULL AND a.rotated_at IS NULL
         AND a.expires_at > now()) AS active_sign_ins,
    (SELECT count(*)::int FROM saved_sessions s WHERE s.user_id = u.id) AS saved_sessions,
    (SELECT coalesce(sum(r.rp), 0)::float FROM session_results r
       WHERE r.user_id = u.id AND NOT r.hidden) AS career_rp
  FROM users u`;

const toAdminUser = (row: AdminUserRow): AdminUser => ({
  id: row.id,
  email: row.email,
  handle: row.handle,
  displayName: row.display_name,
  role: row.role,
  disabledAt: row.disabled_at?.toISOString() ?? null,
  createdAt: row.created_at.toISOString(),
  lastActiveAt: row.last_active_at?.toISOString() ?? null,
  activeSignIns: row.active_sign_ins,
  savedSessions: row.saved_sessions,
  careerRp: row.career_rp,
});

/** Thrown when registering an email that is already in use. */
export class EmailTakenError extends Error {
  constructor() {
    super('An account with that email already exists');
    this.name = 'EmailTakenError';
  }
}

/** Thrown for a handle someone else has, or has just given up. */
export class HandleTakenError extends Error {
  constructor() {
    super('That handle is taken');
    this.name = 'HandleTakenError';
  }
}

export class UserNotFoundError extends Error {
  constructor() {
    super('That user no longer exists');
    this.name = 'UserNotFoundError';
  }
}

const isUniqueViolation = (error: unknown) => (error as { code?: string }).code === '23505';
const violated = (error: unknown) => (error as { constraint?: string }).constraint;

/** Maps a unique violation on users to the field it was about. */
function uniqueError(error: unknown): Error {
  return violated(error) === 'users_handle_key' ? new HandleTakenError() : new EmailTakenError();
}

/** Escapes LIKE wildcards in a search term. */
const likePattern = (term: string) => `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export function usersRepository(db: Database) {
  return {
    async create(input: {
      email: string;
      handle: string;
      displayName: string;
      passwordHash: string;
      role?: UserRole | undefined;
    }): Promise<UserRecord> {
      if (await this.findByEmail(input.email)) throw new EmailTakenError();
      if (!(await this.handleAvailable(input.handle))) throw new HandleTakenError();
      try {
        const { rows } = await db.query<UserRow>(
          `INSERT INTO users (email, handle, display_name, password_hash, role)
           VALUES ($1, $2, $3, $4, $5) RETURNING ${COLUMNS}`,
          [
            input.email,
            input.handle,
            input.displayName,
            input.passwordHash,
            input.role ?? 'player',
          ],
        );
        return toRecord(rows[0]!);
      } catch (error) {
        if (isUniqueViolation(error)) throw uniqueError(error);
        throw error;
      }
    },

    /**
     * Whether a handle is free for this user (or a new account): nobody has it, and
     * nobody else gave it up in the last 30 days.
     */
    async handleAvailable(handle: string, userId?: string): Promise<boolean> {
      const { rows } = await db.query<{ taken: boolean }>(
        `SELECT EXISTS (SELECT 1 FROM users WHERE handle = $1 AND id IS DISTINCT FROM $2)
             OR EXISTS (SELECT 1 FROM released_handles WHERE handle = $1
                          AND reserved_until > now() AND user_id IS DISTINCT FROM $2) AS taken`,
        [handle, userId ?? null],
      );
      return !rows[0]!.taken;
    },

    async findByHandle(handle: string): Promise<UserRecord | undefined> {
      const { rows } = await db.query<UserRow>(`SELECT ${COLUMNS} FROM users WHERE handle = $1`, [
        handle,
      ]);
      return rows[0] ? toRecord(rows[0]) : undefined;
    },

    async findByEmail(email: string): Promise<UserRecord | undefined> {
      const { rows } = await db.query<UserRow>(`SELECT ${COLUMNS} FROM users WHERE email = $1`, [
        email,
      ]);
      return rows[0] ? toRecord(rows[0]) : undefined;
    },

    async findById(id: string): Promise<UserRecord | undefined> {
      const { rows } = await db.query<UserRow>(`SELECT ${COLUMNS} FROM users WHERE id = $1`, [id]);
      return rows[0] ? toRecord(rows[0]) : undefined;
    },

    // ---- Administration ----------------------------------------------------------

    async list(
      query: Required<Pick<AdminUserListQuery, 'offset' | 'limit'>> &
        Omit<AdminUserListQuery, 'offset' | 'limit'>,
    ): Promise<{ users: AdminUser[]; total: number }> {
      const conditions: string[] = [];
      const params: unknown[] = [];
      if (query.q) {
        params.push(likePattern(query.q));
        conditions.push(
          `(u.email ILIKE $${params.length} OR u.handle ILIKE $${params.length} OR u.display_name ILIKE $${params.length})`,
        );
      }
      if (query.role) {
        params.push(query.role);
        conditions.push(`u.role = $${params.length}`);
      }
      if (query.status === 'active') conditions.push('u.disabled_at IS NULL');
      if (query.status === 'disabled') conditions.push('u.disabled_at IS NOT NULL');
      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const [{ rows }, count] = await Promise.all([
        db.query<AdminUserRow>(
          `${ADMIN_USER_SELECT} ${where} ORDER BY u.created_at DESC, u.id
           LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
          [...params, query.limit, query.offset],
        ),
        db.query<{ total: number }>(`SELECT count(*)::int AS total FROM users u ${where}`, params),
      ]);
      return { users: rows.map(toAdminUser), total: count.rows[0]!.total };
    },

    async adminView(id: string): Promise<AdminUser> {
      const { rows } = await db.query<AdminUserRow>(`${ADMIN_USER_SELECT} WHERE u.id = $1`, [id]);
      if (!rows[0]) throw new UserNotFoundError();
      return toAdminUser(rows[0]);
    },

    /** Changes any of a user's details. Returns the user as they were before. */
    async update(
      id: string,
      changes: {
        email?: string;
        handle?: string;
        displayName?: string;
        passwordHash?: string;
        role?: UserRole;
        disabled?: boolean;
        profilePublic?: boolean;
      },
    ): Promise<UserRecord> {
      const before = await this.findById(id);
      if (!before) throw new UserNotFoundError();
      const sets: string[] = [];
      const params: unknown[] = [id];
      const set = (column: string, value: unknown) => {
        params.push(value);
        sets.push(`${column} = $${params.length}`);
      };
      if (changes.email !== undefined) set('email', changes.email);
      // A new handle (not just a change of case): the old one is reserved for this user a while.
      const newHandle =
        changes.handle !== undefined &&
        changes.handle.toLowerCase() !== before.handle.toLowerCase();
      if (changes.handle !== undefined && changes.handle !== before.handle) {
        if (newHandle && !(await this.handleAvailable(changes.handle, id)))
          throw new HandleTakenError();
        set('handle', changes.handle);
        sets.push('handle_generated = false');
        if (newHandle) sets.push('handle_changed_at = now()');
      }
      if (changes.displayName !== undefined) set('display_name', changes.displayName);
      if (changes.passwordHash !== undefined) set('password_hash', changes.passwordHash);
      if (changes.role !== undefined) set('role', changes.role);
      if (changes.profilePublic !== undefined) set('profile_public', changes.profilePublic);
      if (changes.disabled !== undefined)
        sets.push(
          changes.disabled ? 'disabled_at = coalesce(disabled_at, now())' : 'disabled_at = NULL',
        );
      if (sets.length === 0) return before;
      try {
        const { rowCount } = await db.query(
          `UPDATE users SET ${sets.join(', ')}, updated_at = now() WHERE id = $1`,
          params,
        );
        if (!rowCount) throw new UserNotFoundError();
      } catch (error) {
        if (isUniqueViolation(error)) throw uniqueError(error);
        throw error;
      }
      if (newHandle)
        await db.query(
          `INSERT INTO released_handles (handle, user_id, reserved_until)
           VALUES ($1, $2, now() + make_interval(days => $3))
           ON CONFLICT (handle) DO UPDATE SET user_id = $2, reserved_until = excluded.reserved_until`,
          [before.handle, id, HANDLE_CHANGE_DAYS],
        );
      return before;
    },

    async delete(id: string): Promise<UserRecord> {
      const { rows } = await db.query<UserRow>(
        `DELETE FROM users WHERE id = $1 RETURNING ${COLUMNS}`,
        [id],
      );
      if (!rows[0]) throw new UserNotFoundError();
      return toRecord(rows[0]);
    },

    /** Admins who can still sign in. */
    async countActiveAdmins(): Promise<number> {
      const { rows } = await db.query<{ count: number }>(
        "SELECT count(*)::int AS count FROM users WHERE role = 'admin' AND disabled_at IS NULL",
      );
      return rows[0]!.count;
    },

    async summary(): Promise<{
      users: number;
      admins: number;
      disabled: number;
      activeToday: number;
    }> {
      const { rows } = await db.query<{
        users: number;
        admins: number;
        disabled: number;
        active_today: number;
      }>(
        `SELECT count(*)::int AS users,
           count(*) FILTER (WHERE role = 'admin')::int AS admins,
           count(*) FILTER (WHERE disabled_at IS NOT NULL)::int AS disabled,
           (SELECT count(DISTINCT user_id)::int FROM auth_sessions
              WHERE last_used_at > now() - interval '24 hours') AS active_today
         FROM users`,
      );
      const row = rows[0]!;
      return {
        users: row.users,
        admins: row.admins,
        disabled: row.disabled,
        activeToday: row.active_today,
      };
    },
  };
}

export type UsersRepository = ReturnType<typeof usersRepository>;
