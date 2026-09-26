import type { Database } from '../platform/database';

export interface UserRecord {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
}

interface UserRow {
  id: string;
  email: string;
  display_name: string;
  password_hash: string;
}

const toRecord = (row: UserRow): UserRecord => ({
  id: row.id,
  email: row.email,
  displayName: row.display_name,
  passwordHash: row.password_hash,
});

/** Thrown when registering an email that is already in use. */
export class EmailTakenError extends Error {
  constructor() {
    super('An account with that email already exists');
    this.name = 'EmailTakenError';
  }
}

export function usersRepository(db: Database) {
  return {
    async create(input: {
      email: string;
      displayName: string;
      passwordHash: string;
    }): Promise<UserRecord> {
      try {
        const { rows } = await db.query<UserRow>(
          `INSERT INTO users (email, display_name, password_hash) VALUES ($1, $2, $3)
           RETURNING id, email, display_name, password_hash`,
          [input.email, input.displayName, input.passwordHash],
        );
        return toRecord(rows[0]!);
      } catch (error) {
        if ((error as { code?: string }).code === '23505') throw new EmailTakenError();
        throw error;
      }
    },

    async findByEmail(email: string): Promise<UserRecord | undefined> {
      const { rows } = await db.query<UserRow>(
        'SELECT id, email, display_name, password_hash FROM users WHERE email = $1',
        [email],
      );
      return rows[0] ? toRecord(rows[0]) : undefined;
    },

    async findById(id: string): Promise<UserRecord | undefined> {
      const { rows } = await db.query<UserRow>(
        'SELECT id, email, display_name, password_hash FROM users WHERE id = $1',
        [id],
      );
      return rows[0] ? toRecord(rows[0]) : undefined;
    },
  };
}

export type UsersRepository = ReturnType<typeof usersRepository>;
