# Deploying Vector

How Vector goes from this repository to a live site, and how to set it up the first
time. The plan behind it is in `ReleaseV4.md`.

## How it works

- **One container** does everything: the API under `/api`, and the built client for
  every other address (with each public page's own HTML, for search engines and link
  previews). It's built from `Dockerfile`, so it runs on any container host.
- **Two environments** on [Render](https://render.com), each a web service and a
  Postgres database, described in `render.yaml`:

  | Environment | Deploys from     | Address (example)     |
  | ----------- | ---------------- | --------------------- |
  | Staging     | `vector/develop` | `staging.your-domain` |
  | Production  | `main`           | `your-domain`         |

- **Every push** runs GitHub Actions (`.github/workflows/vector.yml` at the repository
  root): format, lint, types, unit and integration tests, the build, the end-to-end
  tests, then the Docker image (migrated and started against a real database). Render
  deploys a branch only after those pass.
- **Each deploy** runs the database migrations first (`npm run migrate:up`); if they
  fail, the old version keeps running.
- **A release** is merging `vector/develop` into `main`. Staging always shows what's
  coming; production changes only when you merge.

Roughly **$30 a month** to start: two Starter web services (about $7 each) and two
small Postgres databases (about $7 each). Staging can be suspended in Render when you
don't need it.

## Setting it up (once)

You'll need accounts with Render, Resend and a domain registrar (Cloudflare is
recommended for the domain's DNS). None of the steps put secrets in the repository.

### 1. Domain

1. Buy a domain (any registrar), and move its DNS to Cloudflare (free plan).
2. You'll add records for it in steps 3 and 4.

### 2. Render

1. Sign up at Render and connect your GitHub account, with access to the `Codebase`
   repository.
2. **New → Blueprint**, choose the repository, and set the blueprint file to
   `Projects/vector/render.yaml`.
3. Render shows the two databases and two web services. Fill in the values it asks for
   (the ones marked `sync: false`):
   - `CLIENT_ORIGIN`: the site's address, e.g. `https://your-domain` (production) and
     `https://staging.your-domain` (staging). Email links are built from it.
   - `RESEND_API_KEY` and `EMAIL_FROM`: from step 4 (you can come back to these).
4. **Apply.** Render creates the databases, builds the image and deploys. `JWT_SECRET`
   is generated for you, separately for each environment.

### 3. The address

For each web service, in Render: **Settings → Custom Domains → Add**, and enter
`your-domain` (production) or `staging.your-domain` (staging). Render shows a CNAME
target; in Cloudflare, add that **CNAME** record. Render issues the HTTPS certificate
itself within a few minutes.

- If you turn on Cloudflare's proxy (the orange cloud) for a record, set SSL/TLS to
  **Full (strict)** in Cloudflare and change that service's `TRUST_PROXY` to `2`
  (Cloudflare and Render are both in front of Vector), so sign-ins record the right IP.
  With the proxy off (DNS only), leave it at `1`.

### 4. Email (Resend)

1. In Resend: **Domains → Add**, enter your domain, and add the DNS records it lists
   (SPF, DKIM and the return path) in Cloudflare. Wait for it to show **Verified**.
2. **API Keys → Create** (sending access only), and put it in both services'
   `RESEND_API_KEY` in Render.
3. Set `EMAIL_FROM` to an address on your domain, e.g. `Vector <hello@your-domain>`.

Until Resend is set up, choose `EMAIL_DELIVERY=log` for a service: emails go to its
log instead (Render → the service → Logs), which is fine for a first look.

### 5. The first admin

1. Open the production site and create your account (registration is open on a new
   database).
2. In Render: the production service → **Shell**, and run
   `npm run admin:prod -- grant your@email`. Sign in again: Admin is in your menu.
3. Do the same on staging.

Then, before telling anyone about it, open the beta:

1. **Admin → Site:** set Registration to **Invite only**, and turn **Beta** on (the
   badge by the logo).
2. **Admin → Beta → Invite codes:** make a code for each group of testers (e.g. one
   with 25 uses for a Discord server), and send its link (**Copy link**): it opens the
   registration page with the code filled in.
3. Everyone else can ask on the registration page: they're in **Admin → Beta →
   Waitlist**, and **Invite** emails them their own single-use code.
4. Testers send feedback from their account menu (**Send feedback**); it's in
   **Admin → Beta → Feedback**, with the page they were on and their browser. A
   "Beta feedback" category in **Admin → Community** is a good place for discussion.

When the beta's over, set Registration to **Open** and turn Beta off.

## Day to day

- **Ship to staging:** merge a feature branch into `vector/develop` and push. Watch
  it in GitHub Actions, then Render.
- **Release to production:** merge `vector/develop` into `main` and push.
- **Roll back:** Render → the service → **Events** → a previous deploy → **Rollback**.
  Migrations only ever add (the down migrations aren't run on deploys), so the
  previous version runs against the newer database.
- **Logs:** Render → the service → **Logs**. Requests are logged at `LOG_LEVEL`.
- **Backups:** Render's paid Postgres plans keep daily backups (and point-in-time
  recovery on larger plans). Check what your plan includes under the database's
  **Recovery** tab.
- **Rotating a secret:** change it in the service's **Environment**; Render redeploys.
  Changing `JWT_SECRET` signs everyone out.

## Running the production build locally

```sh
npm run build
NODE_ENV=production CLIENT_ORIGIN=https://localhost EMAIL_DELIVERY=log \
  DATABASE_URL=postgres://localhost:5432/vector_dev JWT_SECRET=<a long random value> \
  node apps/server/dist/index.js
# then open http://localhost:4000
```

Or with Docker: `docker build -t vector .` and
`docker run -p 4000:4000 --env-file <a file with those values> vector`.
