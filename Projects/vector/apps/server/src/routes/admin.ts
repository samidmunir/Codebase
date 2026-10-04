import {
  adminCreateUserRequestSchema,
  adminUpdateAirspaceRequestSchema,
  adminUpdateUserRequestSchema,
  adminUserListQuerySchema,
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
import type { Authenticator } from '../auth/authenticate';
import { UserNotFoundError } from '../users/users-repository';
import { SavedSessionNotFoundError } from '../sessions/sessions-repository';
import { AirspaceNotFoundError } from '../airspaces/airspaces-repository';

export interface AdminRouteOptions {
  admin: AdminService;
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

  app.get('/admin/audit', { preHandler }, async (): Promise<AuditLog> => ({
    entries: await admin.auditLog(),
  }));
}
