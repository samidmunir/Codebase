# Vector

A realistic, web-based air traffic control simulator. v1 puts you in the New York TRACON (N90), working arrivals and departures for KJFK, KEWR and KLGA.

See [docs/MVPv1.md](docs/MVPv1.md) for the full MVP specification.

## Structure

```
apps/client        React + Vite front end (radar scope, UI)
apps/server        Fastify API (auth, saved sessions, settings)
packages/sim-core  Simulation engine: pure TypeScript, no DOM/Node APIs
packages/shared    Zod schemas and types shared by client and server
data/              Airspace packs, aircraft performance, airlines
migrations/        PostgreSQL migrations (node-pg-migrate, SQL)
```

## Requirements

- Node.js 24+
- PostgreSQL 17+

## Setup

```sh
npm install
cp apps/server/.env.example apps/server/.env
# Set JWT_SECRET in apps/server/.env to a long random value:
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
createdb vector_dev
createdb vector_test
npm run migrate:up
npm run migrate:up -- --test
```

## Commands

| Command                            | Description                                               |
| ---------------------------------- | --------------------------------------------------------- |
| `npm run dev`                      | Start the API (port 4000) and client (port 5173) together |
| `npm run check`                    | Format check, lint, type check and tests                  |
| `npm run test:e2e`                 | End-to-end browser tests (own servers, test database)     |
| `npm test`                         | Run all tests                                             |
| `npm run sim:demo`                 | Run the sim engine headlessly and print aircraft flying   |
| `npm run build`                    | Production builds for client and server                   |
| `npm run migrate:up`               | Apply migrations (`-- --test` for the test database)      |
| `npm run migrate:down`             | Roll back the last migration                              |
| `npm run migrate:create -- <name>` | Create a new SQL migration                                |
| `npm run admin:grant -- <email>`   | Make an existing account an admin (`--test` for test DB)  |
| `npm run admin:revoke -- <email>`  | Make an admin a player again                              |
| `npm run admin:list`               | List the admins                                           |
| `npm run data:airspace -- <id>`    | Rebuild an airspace pack from FAA data                    |

## Administration

Admins manage users (create, edit, set passwords, sign out everywhere, disable,
delete, and remove saved sessions) and open or close airspaces at `/admin`, linked
from the start screen. Every change is recorded in the audit log there.

The first admin is made from the command line, on the machine with the database:
register the account in Vector, then run `npm run admin:grant -- <email>` and sign
in again. No admin is ever created by a migration or from code. An admin can't
demote, disable or delete themselves, and there is always at least one admin who
can sign in; `admin:revoke` on the command line is the way around that if needed.

## Branching

- `vector/develop`: integration branch for Vector
- `vector/feature/<name>`: one branch per milestone or feature, merged into `vector/develop`
- `vector/develop` merges into `main` when a milestone set is complete
