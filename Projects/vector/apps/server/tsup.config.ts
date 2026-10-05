import { defineConfig } from 'tsup';

export default defineConfig({
  // The server, and the admin command (npm run admin:grant) for use on the host.
  entry: { index: 'src/index.ts', 'cli/admin': 'src/cli/admin.ts' },
  format: ['esm'],
  target: 'node24',
  platform: 'node',
  clean: true,
  // Workspace packages ship TypeScript source, so bundle them into the server build.
  noExternal: [/^@vector\//],
});
