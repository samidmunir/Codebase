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
| `npm test`                         | Run all tests                                             |
| `npm run build`                    | Production builds for client and server                   |
| `npm run migrate:up`               | Apply migrations (`-- --test` for the test database)      |
| `npm run migrate:down`             | Roll back the last migration                              |
| `npm run migrate:create -- <name>` | Create a new SQL migration                                |

## Branching

- `vector/develop`: integration branch for Vector
- `vector/feature/<name>`: one branch per milestone or feature, merged into `vector/develop`
- `vector/develop` merges into `main` when a milestone set is complete
