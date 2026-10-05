import {
  feedbackListSchema,
  inviteCheckSchema,
  inviteCodeListSchema,
  inviteCodeSchema,
  waitlistSchema,
  type FeedbackList,
  type FeedbackRequest,
  type InviteCheck,
  type InviteCode,
  type InviteCodeList,
  type NewInviteCodeRequest,
  type Waitlist,
  type WaitlistRequest,
} from '@vector/shared';
import { apiRequest } from './api-client';

// The beta: checking an invite code, the waitlist and feedback; and the admin side.

const json = (method: string, body?: unknown) => ({
  method,
  ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
});

export async function checkInvite(code: string): Promise<InviteCheck> {
  return inviteCheckSchema.parse(await apiRequest(`/invites/${encodeURIComponent(code)}`));
}

export async function joinWaitlist(request: WaitlistRequest): Promise<void> {
  await apiRequest('/waitlist', json('POST', request));
}

export async function sendFeedback(request: FeedbackRequest): Promise<void> {
  await apiRequest('/feedback', json('POST', request));
}

export async function getInvites(): Promise<InviteCodeList> {
  return inviteCodeListSchema.parse(await apiRequest('/admin/invites'));
}

export async function createInvite(request: NewInviteCodeRequest): Promise<InviteCode> {
  return inviteCodeSchema.parse(await apiRequest('/admin/invites', json('POST', request)));
}

export async function revokeInvite(id: string): Promise<void> {
  await apiRequest(`/admin/invites/${id}/revoke`, json('POST'));
}

export async function getWaitlist(): Promise<Waitlist> {
  return waitlistSchema.parse(await apiRequest('/admin/waitlist'));
}

export async function inviteFromWaitlist(id: string): Promise<InviteCode> {
  return inviteCodeSchema.parse(await apiRequest(`/admin/waitlist/${id}/invite`, json('POST')));
}

export async function removeFromWaitlist(id: string): Promise<void> {
  await apiRequest(`/admin/waitlist/${id}`, json('DELETE'));
}

export async function getFeedback(status?: string): Promise<FeedbackList> {
  return feedbackListSchema.parse(
    await apiRequest(`/admin/feedback${status ? `?status=${status}` : ''}`),
  );
}

export async function setFeedbackStatus(id: string, status: string): Promise<void> {
  await apiRequest(`/admin/feedback/${id}`, json('PATCH', { status }));
}
