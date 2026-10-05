import { apiRequest } from './api-client';

// Emailed links: verifying the address, resetting the password, changing the email.

const post = (path: string, body: object = {}) =>
  apiRequest<void>(path, { method: 'POST', body: JSON.stringify(body) });

export const sendVerificationEmail = () => post('/auth/verify-email/send');
export const verifyEmail = (token: string) => post('/auth/verify-email', { token });
export const forgotPassword = (email: string) => post('/auth/forgot-password', { email });
export const resetPassword = (token: string, password: string) =>
  post('/auth/reset-password', { token, password });
export const changeEmail = (email: string, currentPassword: string) =>
  post('/auth/email', { email, currentPassword });
export const cancelEmailChange = () => apiRequest<void>('/auth/email', { method: 'DELETE' });
export const confirmEmailChange = (token: string) => post('/auth/email/confirm', { token });
export const undoEmailChange = (token: string) => post('/auth/email/undo', { token });

/** The token from an emailed link (it's in the URL fragment, which never reaches a server). */
export function linkToken(hash: string): string {
  return hash.replace(/^#/, '').trim();
}
