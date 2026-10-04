import type { AuditAction, AuditEntry } from '@vector/shared';
import type { Database } from '../platform/database';

/** Who made a change: an admin, or the command line (`npm run admin:grant`). */
export type AuditActor = { id: string; email: string } | 'command line';

interface AuditRow {
  id: string;
  actor: string;
  action: AuditAction;
  target: string;
  details: Record<string, unknown>;
  created_at: Date;
}

export const AUDIT_LOG_PAGE_SIZE = 200;

/** Every administrative change, newest first. Entries are never edited or removed by the app. */
export function auditRepository(db: Database) {
  return {
    async record(
      actor: AuditActor,
      action: AuditAction,
      target: string,
      details: Record<string, unknown> = {},
    ): Promise<void> {
      await db.query(
        'INSERT INTO admin_audit_log (actor_id, actor, action, target, details) VALUES ($1, $2, $3, $4, $5)',
        [
          actor === 'command line' ? null : actor.id,
          actor === 'command line' ? actor : actor.email,
          action,
          target,
          JSON.stringify(details),
        ],
      );
    },

    async list(limit = AUDIT_LOG_PAGE_SIZE): Promise<AuditEntry[]> {
      const { rows } = await db.query<AuditRow>(
        `SELECT id::text, actor, action, target, details, created_at FROM admin_audit_log
         ORDER BY created_at DESC, id DESC LIMIT $1`,
        [limit],
      );
      return rows.map((row) => ({
        id: row.id,
        actor: row.actor,
        action: row.action,
        target: row.target,
        details: row.details,
        createdAt: row.created_at.toISOString(),
      }));
    },
  };
}

export type AuditRepository = ReturnType<typeof auditRepository>;
