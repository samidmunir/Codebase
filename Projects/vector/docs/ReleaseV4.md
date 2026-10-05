# Vector Release V4: Beta, then Pro

Getting Vector to beta testers (MVP1), then charging for it. Builds on the web app
(WebAppV2) and the admin pages (AdminV3).

## Decisions

| Question    | Decision                                                                                                                                                                                                                                                    |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Order       | **Beta first.** Deploy, invite testers, learn; build monetization against the live beta, with Stripe in test mode until it's switched on.                                                                                                                   |
| Beta access | **Invite codes** that admins create and share; registration asks for one. Everyone else can join a waitlist.                                                                                                                                                |
| Model       | **Free + Pro subscription** (monthly or yearly). What each plan includes is decided after beta feedback and set by admins, not hard-coded.                                                                                                                  |
| Hosting     | **One Docker image** (the API serving the built client) on **Render**, with **Render Postgres**, behind the domain's DNS on **Cloudflare**. Staging and production each get their own service and database. Portable: the image runs on any container host. |

## Shape of the deployment

```
            vector.example (Cloudflare DNS, HTTPS)
                         │
           ┌─────────────┴──────────────┐
           │  Render web service        │   one container:
           │  Fastify: /api/* and the   │   the API, and the built client
           │  client (static files)     │   (with each public page's HTML)
           └─────────────┬──────────────┘
                         │
                 Render Postgres (daily backups)
```

- **Staging** deploys every push to `vector/develop`; **production** deploys `main`
  (merging `vector/develop` into `main` is the release, and only on the owner's say).
- Migrations run before the new version starts; a failed migration stops the deploy.
- Secrets (JWT, Resend, Stripe, Sentry) live in Render's environment settings, never in
  the repository.
- GitHub Actions runs `npm run check`, the build and the end-to-end tests on every
  push and pull request; a red build doesn't deploy.

## Milestones

### Beta

1. **Deployable.** A Dockerfile; the server serves the client (static files, the
   single-page app fallback, each public page's prerendered HTML, long caching for
   hashed assets) with security headers; production settings checked at startup;
   migrations on deploy; a `render.yaml` describing staging and production; CI in
   GitHub Actions; and `docs/Deploy.md`, a step-by-step for the owner (accounts,
   secrets, domain, Resend domain verification).
2. **Beta access.** Invite codes (single-use or for a number of people, optional
   expiry, a note of who they're for), a waitlist for everyone else, a beta notice,
   a Feedback button and a Beta feedback category, release notes through News.
3. **Watching it.** Error tracking (Sentry, on when its key is set) for the server and
   client, uptime checks, and what to do when something breaks (`docs/Operations.md`:
   backups and restoring, rolling back, rotating secrets).

### Pro

4. **Plans and entitlements.** Free and Pro, and what each includes (airspaces, saved
   session slots, and anything else) as settings admins edit; the server enforces
   them; players see what Pro adds.
5. **Stripe.** Checkout for monthly and yearly Pro, the billing portal, webhooks that
   keep each account's plan in step, Stripe Tax; test mode until switched on.
6. **Billing in admin.** Subscribers and revenue on the dashboard, comping an account
   Pro (e.g. beta testers), refunds through Stripe.

Before charging real money (the owner's to do, with help drafting): a business to
receive payments, Terms and a refund policy reviewed, and Stripe's account checks.
