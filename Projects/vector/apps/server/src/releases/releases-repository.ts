import type { releaseRequestSchema } from '@vector/shared';
import { compareVersionsDesc, type Release, type ReleaseFeature } from '@vector/shared';
import type { z } from 'zod';
import type { Database } from '../platform/database';

export class ReleaseNotFoundError extends Error {
  constructor() {
    super('That release doesn’t exist');
    this.name = 'ReleaseNotFoundError';
  }
}

export class VersionTakenError extends Error {
  constructor(version: string) {
    super(`There’s already a v${version}`);
    this.name = 'VersionTakenError';
  }
}

type ReleaseInput = z.output<typeof releaseRequestSchema>;

interface ReleaseRow {
  id: string;
  version: string;
  name: string;
  summary: string;
  status: Release['status'];
  released_on: string | null;
  updated_at: Date;
  features: ReleaseFeature[] | null;
}

const SELECT = `
  SELECT r.id, r.version, r.name, r.summary, r.status, to_char(r.released_on, 'YYYY-MM-DD') AS released_on,
         r.updated_at,
         (SELECT json_agg(json_build_object('title', f.title, 'description', f.description, 'status', f.status)
                          ORDER BY f.position)
            FROM release_features f WHERE f.release_id = r.id) AS features
    FROM releases r`;

const toRelease = (row: ReleaseRow): Release => ({
  id: row.id,
  version: row.version,
  name: row.name,
  summary: row.summary,
  status: row.status,
  releasedOn: row.released_on,
  features: row.features ?? [],
  updatedAt: row.updated_at.toISOString(),
});

const unique = (error: unknown) => (error as { code?: string }).code === '23505';

/** Releases and their features (a release's features are saved with it, in order). */
export function releasesRepository(db: Database) {
  /** Saves a release's features in place of the ones it had. */
  const saveFeatures = async (
    client: { query: Database['query'] },
    releaseId: string,
    features: ReleaseFeature[],
  ) => {
    await client.query('DELETE FROM release_features WHERE release_id = $1', [releaseId]);
    for (const [index, feature] of features.entries())
      await client.query(
        `INSERT INTO release_features (release_id, position, title, description, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [releaseId, index + 1, feature.title, feature.description, feature.status],
      );
  };

  /** Runs `work` in a transaction. */
  const transaction = async <T>(work: (client: { query: Database['query'] }) => Promise<T>) => {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client as unknown as { query: Database['query'] });
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };

  const get = async (id: string): Promise<Release> => {
    const { rows } = await db.query<ReleaseRow>(`${SELECT} WHERE r.id = $1`, [id]);
    if (!rows[0]) throw new ReleaseNotFoundError();
    return toRelease(rows[0]);
  };

  return {
    /** Every release, newest version first. */
    async list(): Promise<Release[]> {
      const { rows } = await db.query<ReleaseRow>(SELECT);
      return rows.map(toRelease).sort((a, b) => compareVersionsDesc(a.version, b.version));
    },

    get,

    async create(input: ReleaseInput): Promise<Release> {
      try {
        const id = await transaction(async (client) => {
          const { rows } = await client.query<{ id: string }>(
            `INSERT INTO releases (version, name, summary, status, released_on)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [input.version, input.name, input.summary, input.status, input.releasedOn],
          );
          await saveFeatures(client, rows[0]!.id, input.features);
          return rows[0]!.id;
        });
        return await get(id);
      } catch (error) {
        if (unique(error)) throw new VersionTakenError(input.version);
        throw error;
      }
    },

    async update(id: string, input: ReleaseInput): Promise<Release> {
      try {
        await transaction(async (client) => {
          const { rowCount } = await client.query(
            `UPDATE releases SET version = $2, name = $3, summary = $4, status = $5,
                    released_on = $6, updated_at = now()
              WHERE id = $1`,
            [id, input.version, input.name, input.summary, input.status, input.releasedOn],
          );
          if (!rowCount) throw new ReleaseNotFoundError();
          await saveFeatures(client, id, input.features);
        });
        return await get(id);
      } catch (error) {
        if (unique(error)) throw new VersionTakenError(input.version);
        throw error;
      }
    },

    async delete(id: string): Promise<Release> {
      const release = await get(id);
      await db.query('DELETE FROM releases WHERE id = $1', [id]);
      return release;
    },

    /** The newest released version, for the footer (undefined before any). */
    async currentVersion(): Promise<string | undefined> {
      const { rows } = await db.query<{ version: string }>(
        "SELECT version FROM releases WHERE status = 'released'",
      );
      return rows.map((row) => row.version).sort(compareVersionsDesc)[0];
    },
  };
}

export type ReleasesRepository = ReturnType<typeof releasesRepository>;
