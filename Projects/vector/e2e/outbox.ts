import { fileURLToPath } from 'node:url';

/** Where the test API server writes the emails it sends. */
export const EMAIL_OUTBOX = fileURLToPath(new URL('../test-results/e2e-outbox', import.meta.url));
