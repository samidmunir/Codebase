import {
  adminCreateUserRequestSchema,
  adminResultListQuerySchema,
  adminUpdateResultRequestSchema,
  type AdminResultList,
  adminUpdateAirspaceRequestSchema,
  adminUpdateUserRequestSchema,
  adminUserListQuerySchema,
  adminResultBulkRequestSchema,
  adminSavedSessionQuerySchema,
  type AdminSavedSessionList,
  adminBulkRequestSchema,
  type AdminBulkResult,
  statsQuerySchema,
  type AdminStats,
  type AdminAirspace,
  type AdminAirspaceList,
  type AdminSummary,
  type AdminUser,
  type AdminUserDetail,
  type AdminUserList,
  type AuditLog,
} from '@vector/shared';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { AdminService, Actor } from '../admin/admin-service';
import type { StatsRepository } from '../admin/stats-repository';
import type { Authenticator } from '../auth/authenticate';
import { UserNotFoundError } from '../users/users-repository';
import { SavedSessionNotFoundError } from '../sessions/sessions-repository';
import { AirspaceNotFoundError } from '../airspaces/airspaces-repository';
import { ResultNotFoundError } from '../results/results-repository';

export interface AdminRouteOptions {
  admin: AdminService;
  stats: StatsRepository;
  authenticate: Authenticator;
}

const userParams = z.object({ id: z.uuid() });
const sessionParams = z.object({ id: z.uuid(), sessionId: z.uuid() });
const airspaceParams = z.object({ id: z.string().max(40) });

/** Everything under /api/admin requires an admin account (checked in the database each time). */
export async function adminRoutes(app: FastifyInstance, options: AdminRouteOptions) {
  const { admin } = options;
  const preHandler = options.authenticate.admin;
  const actor = (request: FastifyRequest): Actor => ({
    id: request.account!.id,
    email: request.account!.email,
  });
  const userId = (request: FastifyRequest) => {
    const parsed = userParams.safeParse(request.params);
    if (!parsed.success) throw new UserNotFoundError();
    return parsed.data.id;
  };

  app.get('/admin/summary', { preHandler }, async (): Promise<AdminSummary> => admin.summary());

  app.get('/admin/stats', { preHandler }, async (request): Promise<AdminStats> =>
    options.stats.stats(statsQuerySchema.parse(request.query).range),
  );

  app.get('/admin/users', { preHandler }, async (request): Promise<AdminUserList> => {
    const query = adminUserListQuerySchema.parse(request.query);
    return admin.listUsers(query);
  });

  app.post('/admin/users', { preHandler }, async (request, reply): Promise<AdminUser> => {
    const body = adminCreateUserRequestSchema.parse(request.body);
    reply.code(201);
    return admin.createUser(actor(request), body);
  });

  app.get('/admin/users/:id', { preHandler }, async (request): Promise<AdminUserDetail> =>
    admin.getUser(userId(request)),
  );

  app.patch('/admin/users/:id', { preHandler }, async (request): Promise<AdminUser> => {
    const id = userId(request);
    return admin.updateUser(actor(request), id, adminUpdateUserRequestSchema.parse(request.body));
  });

  app.delete('/admin/users/:id', { preHandler }, async (request, reply) => {
    await admin.deleteUser(actor(request), userId(request));
    return reply.code(204).send();
  });

  /** Ends every sign-in the user has, on every device. */
  app.post('/admin/users/:id/sign-out', { preHandler }, async (request, reply) => {
    await admin.signOutEverywhere(actor(request), userId(request));
    return reply.code(204).send();
  });

  /** Ends one sign-in (one device). */
  app.delete('/admin/users/:id/sign-ins/:signInId', { preHandler }, async (request, reply) => {
    const parsed = z.object({ id: z.uuid(), signInId: z.uuid() }).safeParse(request.params);
    if (!parsed.success) throw new UserNotFoundError();
    await admin.endSignIn(actor(request), parsed.data.id, parsed.data.signInId);
    return reply.code(204).send();
  });

  app.post('/admin/users/:id/send-reset', { preHandler }, async (request, reply) => {
    await admin.sendPasswordReset(actor(request), userId(request));
    return reply.code(204).send();
  });

  app.post('/admin/users/:id/send-verification', { preHandler }, async (request, reply) => {
    await admin.sendVerificationEmail(actor(request), userId(request));
    return reply.code(204).send();
  });

  app.post('/admin/users/bulk', { preHandler }, async (request): Promise<AdminBulkResult> => {
    const { ids, action } = adminBulkRequestSchema.parse(request.body);
    return admin.bulk(actor(request), ids, action);
  });

  /** The users matching the list's filters, as a CSV file. */
  app.get('/admin/users/export.csv', { preHandler }, async (request, reply) => {
    const { q, role, status } = adminUserListQuerySchema.parse(request.query);
    const csv = await admin.exportCsv(actor(request), {
      ...(q ? { q } : {}),
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
    });
    const date = new Date().toISOString().slice(0, 10);
    return reply
      .header('content-type', 'text/csv; charset=utf-8')
      .header('content-disposition', `attachment; filename="vector-users-${date}.csv"`)
      .header('cache-control', 'no-store')
      .send(csv);
  });

  app.delete('/admin/users/:id/sessions/:sessionId', { preHandler }, async (request, reply) => {
    const parsed = sessionParams.safeParse(request.params);
    if (!parsed.success) throw new SavedSessionNotFoundError();
    await admin.deleteSavedSession(actor(request), parsed.data.id, parsed.data.sessionId);
    return reply.code(204).send();
  });

  app.get('/admin/airspaces', { preHandler }, async (): Promise<AdminAirspaceList> => ({
    airspaces: await admin.listAirspaces(),
  }));

  app.patch('/admin/airspaces/:id', { preHandler }, async (request): Promise<AdminAirspace> => {
    const parsed = airspaceParams.safeParse(request.params);
    if (!parsed.success) throw new AirspaceNotFoundError();
    const { enabled } = adminUpdateAirspaceRequestSchema.parse(request.body);
    return admin.setAirspace(actor(request), parsed.data.id, enabled);
  });

  const resultId = (request: FastifyRequest) => {
    const parsed = z.object({ id: z.uuid() }).safeParse(request.params);
    if (!parsed.success) throw new ResultNotFoundError();
    return parsed.data.id;
  };

  app.get('/admin/results', { preHandler }, async (request): Promise<AdminResultList> => {
    const { hidden, ...query } = adminResultListQuerySchema.parse(request.query);
    return admin.listResults({
      ...query,
      ...(hidden !== undefined ? { hidden: hidden === 'true' } : {}),
    });
  });

  /** Hides a result from profiles and records, or shows it again. */
  app.patch('/admin/results/:id', { preHandler }, async (request, reply) => {
    const { hidden } = adminUpdateResultRequestSchema.parse(request.body);
    await admin.setResultHidden(actor(request), resultId(request), hidden);
    return reply.code(204).send();
  });

  /** Hides (or shows) several results at once. */
  app.post('/admin/results/bulk', { preHandler }, async (request) => {
    const { ids, hidden } = adminResultBulkRequestSchema.parse(request.body);
    return admin.setResultsHidden(actor(request), ids, hidden);
  });

  /** Every user's saved sessions. */
  app.get('/admin/sessions', { preHandler }, async (request): Promise<AdminSavedSessionList> =>
    admin.listSavedSessions(adminSavedSessionQuerySchema.parse(request.query)),
  );

  app.post('/admin/results/:id/verify', { preHandler }, async (request, reply) => {
    await admin.reverifyResult(actor(request), resultId(request));
    return reply.code(202).send();
  });

  app.get('/admin/audit', { preHandler }, async (): Promise<AuditLog> => ({
    entries: await admin.auditLog(),
  }));
}
