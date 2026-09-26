import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      { test: { name: 'shared', root: 'packages/shared', environment: 'node' } },
      { test: { name: 'sim-core', root: 'packages/sim-core', environment: 'node' } },
      { test: { name: 'server', root: 'apps/server', environment: 'node' } },
      { test: { name: 'client', root: 'apps/client', environment: 'node' } },
      { test: { name: 'scripts', root: 'scripts', environment: 'node' } },
    ],
  },
});
