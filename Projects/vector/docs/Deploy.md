# Deploying Vector

How Vector goes from this repository to a live site, and how to set it up the first
time. The plan behind it is in `ReleaseV4.md`.

## How it works

- **One container** does everything: the API under `/api`, and the built client for
  every other address (with each public page's own HTML, for search engines and link
  previews). It's built from `Dockerfile`, so it runs on any container host.
- **Two environments** on [Render](https://render.com), each a web service and a
  Postgres database, described in `render.yaml`:

  | Environment | Deploys from     | Address                 |
  | ----------- | ---------------- | ----------------------- |
  | Staging     | `vector/develop` | `staging.vectorsim.net` |
  | Production  | `main`           | `vectorsim.net`         |

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

You'll need accounts with Render, Resend and a domain registrar. Vector's domain,
`vectorsim.net`, is registered with Squarespace and uses Squarespace's DNS. None of the
steps put secrets in the repository.

### 1. Domain

1. Buy a domain (any registrar). Its own DNS is fine (Squarespace's works); moving it
   to Cloudflare is optional.
2. You'll add records for it in steps 3 and 4.

### 2. Render

1. Sign up at Render and connect your GitHub account, with access to the `Codebase`
   repository.
2. **New → Blueprint**, choose the repository, and set the blueprint file to
   `Projects/vector/render.yaml`.
3. Render shows the two databases and two web services. Fill in the values it asks for
   (the ones marked `sync: false`):
   - `CLIENT_ORIGIN`: the site's address, e.g. `https://vectorsim.net` (production) and
     `https://staging.vectorsim.net` (staging). It's only used to build email links,
     so it can be the domain before the domain is set up.
   - `EMAIL_DELIVERY`: `log` until Resend is set up (step 4), then `resend`. The server
     won't start with `resend` and no `RESEND_API_KEY`.
   - `RESEND_API_KEY` and `EMAIL_FROM`: from step 4 (leave them empty until then).
4. **Apply.** Render creates the databases, builds the image and deploys. `JWT_SECRET`
   is generated for you, separately for each environment.
5. Production builds from `main`, so its first deploy fails until the first release
   (merging `vector/develop` into `main`). That's expected.

### 3. The address

For each web service, in Render: **Settings → Custom Domains → Add**, and enter the
address. Render shows the record to add; add it in the domain's DNS (Squarespace:
**Domains → the domain → DNS → Custom records → Add record**), then **Verify** in
Render. It issues the HTTPS certificate itself within a few minutes.

| Address                 | Service           | Record                                              |
| ----------------------- | ----------------- | --------------------------------------------------- |
| `staging.vectorsim.net` | vector-staging    | CNAME `staging` → the service's `onrender.com` host |
| `vectorsim.net`         | vector-production | A `@` → the IP Render shows                         |
| `www.vectorsim.net`     | vector-production | CNAME `www` → the service's `onrender.com` host     |

Squarespace adds default records (A records on `@` and a `www` CNAME, for its parking
page): delete those before adding production's.

- If you turn on Cloudflare's proxy (the orange cloud) for a record, set SSL/TLS to
  **Full (strict)** in Cloudflare and change that service's `TRUST_PROXY` to `2`
  (Cloudflare and Render are both in front of Vector), so sign-ins record the right IP.
  With the proxy off (DNS only), leave it at `1`.

### 4. Email (Resend)

1. In Resend: **Domains → Add**, enter your domain, and add the DNS records it lists
   (SPF, DKIM and the return path) in the domain's DNS. Wait for it to show
   **Verified**.
2. **API Keys → Create** (sending access only), and put it in both services'
   `RESEND_API_KEY` in Render.
3. Set `EMAIL_FROM` to an address on your domain, e.g. `Vector <hello@vectorsim.net>`,
   and `EMAIL_DELIVERY` to `resend`.

Until then, `EMAIL_DELIVERY=log` sends emails to the service's log instead (Render →
the service → Logs), which is fine for a first look.

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

### 6. Search engines

Production is indexed (`SEARCH_INDEXING=on` in `render.yaml`): it serves `robots.txt` and
`sitemap.xml` (the public pages and published news). Staging isn't (`off`): its
`robots.txt` disallows everything and every page says `noindex`.

To get into Google sooner, add the site to
[Google Search Console](https://search.google.com/search-console) (a **Domain** property
for `vectorsim.net`: it gives a TXT record to add in Squarespace), then submit
`https://vectorsim.net/sitemap.xml` under **Sitemaps**.

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
