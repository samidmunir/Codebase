// Runs node-pg-migrate against the Vector database using apps/server/.env.
//   npm run migrate:up                 migrate DATABASE_URL
//   npm run migrate:up -- --test       migrate TEST_DATABASE_URL
//   npm run migrate:create -- <name>   create a new SQL migration
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const envFile = `${root}apps/server/.env`;
if (existsSync(envFile)) process.loadEnvFile(envFile);

const args = process.argv.slice(2);
const useTestDb = args.includes('--test');
const passthrough = args.filter((arg) => arg !== '--test');

const cliArgs = [
  ...passthrough,
  '--migrations-dir',
  'migrations',
  '--database-url-var',
  useTestDb ? 'TEST_DATABASE_URL' : 'DATABASE_URL',
];
if (passthrough[0] === 'create') cliArgs.push('--migration-file-language', 'sql');

const result = spawnSync('node-pg-migrate', cliArgs, { cwd: root, stdio: 'inherit', shell: true });
process.exit(result.status ?? 1);
