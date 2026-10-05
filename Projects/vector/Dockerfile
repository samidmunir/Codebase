# Vector: one image with the API and the built client.
#   docker build -t vector .
#   docker run -p 4000:4000 --env-file apps/server/.env vector

# ---- Build: install everything, build the client and the server --------------------
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/client/package.json apps/client/
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
COPY packages/sim-core/package.json packages/sim-core/
RUN npm ci
COPY . .
RUN npm run build

# ---- Production dependencies only ----------------------------------------------------
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/client/package.json apps/client/
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
COPY packages/sim-core/package.json packages/sim-core/
RUN npm ci --omit=dev --ignore-scripts --workspace @vector/server --include-workspace-root

# ---- Run ----------------------------------------------------------------------------
FROM node:24-alpine
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4000
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/apps/server/package.json ./apps/server/
COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/apps/client/dist ./apps/client/dist
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/scripts/migrate.js ./scripts/migrate.js
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:4000/api/health > /dev/null || exit 1
# Migrations run separately before each deploy (npm run migrate:up); see docs/Deploy.md.
CMD ["node", "apps/server/dist/index.js"]
