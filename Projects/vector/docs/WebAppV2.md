# Vector — Web App v2

From a simulator with a start screen to a complete web app: a public site, pilot
profiles and career history, verified records, a community forum, and account
email, laid out so plans and purchases can be added later without rework.

---

## 1. Goals

- **One app, three areas.** A public site anyone can browse, a signed-in app for
  playing and managing your account, and the full-screen scope, all in the one
  React single-page app.
- **A career that lasts.** Every finished session is recorded for good, whether or
  not it stays saved. Profiles and records are built on these results.
- **Records nobody can fake.** The server replays every result it puts on a
  leaderboard and computes the score itself.
- **A community that belongs to Vector.** The forum uses Vector accounts, handles
  and profiles, and admins moderate it from the admin pages.
- **Ready to monetize.** Access to airspaces (and later features) already goes
  through the server; plans and purchases plug in there.

### Guiding principles

- Everything the simulator promises stays true: real FAA data, UI-only control,
  every tunable value a setting.
- Public pages never show an email address. People appear by their handle.
- Every public number is one the server worked out itself.
- Admin actions are audited; moderation actions too.

---

## 2. Site Map

Three layouts, chosen by route:

| Layout          | What it has                                                                                                                    | Used by                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| **Site**        | Header (logo, Airspaces, Records, Community, Guide, News; Sign in or the account menu), footer (About, Terms, Privacy, status) | All public pages, the play hub, profile and account pages, admin |
| **Focus**       | Minimal bar with a way back                                                                                                    | Sign in, register, verify email, reset password                  |
| **Full screen** | Nothing but the page                                                                                                           | Session setup, the scope                                         |

### Public (signed in or not)

| Route                                                        | Page                                                                                                                                                                                                      |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                                          | **Landing.** A live scope running real traffic behind the hero (the engine, headless, in the page), what Vector is, the three airspaces, the real-data story, screenshots, and a call to sign up or play. |
| `/airspaces`, `/airspaces/:id`                               | Each airspace: airports, runway flows, STAR and SID counts, what makes it different (from the pack data).                                                                                                 |
| `/records`                                                   | Leaderboards (section 5).                                                                                                                                                                                 |
| `/pilots/:handle`                                            | A pilot's public profile (section 4).                                                                                                                                                                     |
| `/community`, `/community/:category`, `/community/t/:thread` | The forum (section 6). Reading is public; posting needs a verified account.                                                                                                                               |
| `/guide`                                                     | The Controller's Handbook, in the app.                                                                                                                                                                    |
| `/news`, `/news/:slug`                                       | Release notes and announcements, written by admins.                                                                                                                                                       |
| `/about`, `/terms`, `/privacy`                               | About Vector; legal pages (needed before payments).                                                                                                                                                       |
| `*`                                                          | Not found.                                                                                                                                                                                                |

### Signed in

| Route                      | Page                                                                                                                             |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `/play`                    | Today's start screen: airspaces, saved sessions, career summary. Signed-in visitors to `/` see the landing with a "Play" button. |
| `/setup/:id`, `/scope/:id` | Unchanged (full screen).                                                                                                         |
| `/me`                      | Your profile: the public view plus private details.                                                                              |
| `/results/:id`             | A finished session's overview: the debrief, kept for good (public when its pilot's profile is).                                  |
| `/account`                 | Handle, display name, email (re-verified), password, privacy, sign out other devices, delete your account.                       |
| `/settings`                | Simulator settings (existing).                                                                                                   |
| `/admin`                   | Existing, plus Records (hide a result), Community (reports, moderation), News (write posts).                                     |

---

## 3. Accounts

### 3.1 Handles

Every account gets a unique public **handle**: 3–20 characters, letters, numbers
and underscores, case-insensitive, with a small reserved list (`admin`, `vector`,
`support`, …). Registration asks for one; existing accounts are asked to choose
one on their next visit (until then they get a generated one). Handles can be
changed at most once every 30 days; the old one stays reserved for 30 days.

### 3.2 Email

With Resend as the provider (`RESEND_API_KEY` and `EMAIL_FROM` in `apps/server/.env`,
never committed). `EMAIL_DELIVERY` picks where emails go: `resend`, `log` (the server
log, the default outside production) or `outbox` (a file each, for end-to-end tests).

- **Verification.** New accounts get a link (valid 24 hours); unverified pilots see a
  banner with "Send it again". Unverified accounts can play and save but don't appear
  on the records (and won't post in the forum). Existing accounts start unverified.
  Admins can mark an email verified, and choose whether a new account is sent a link.
- **Password reset.** "Forgot password" sends a link (valid 1 hour, single use).
  Resetting ends every sign-in, and verifies the address.
- **Email change.** Needs the current password. The link goes to the new address and
  the change happens when it's opened; the old address is then told, with a link
  (valid 7 days) that moves the account back and signs it out everywhere. If the new
  address already has an account, its owner is told instead; the requester sees the
  same "we sent a link".
- Tokens are random 256-bit values; only their SHA-256 hash is stored (`email_tokens`).
  Links carry them in the URL fragment, which the client reads once and removes.
  Requests are rate-limited, each kind of email goes at most once a minute per
  account, emails are sent in the background, and nothing reveals whether an email
  has an account.

### 3.3 Self-service

`/account` covers everything an admin can do for a user that a user should be able
to do for themselves: change handle, display name, email and password (with the
current password), sign out other devices, and delete the account (typing the
handle to confirm; deletes saved sessions and settings, and anonymizes forum posts
and records to "deleted pilot").

### 3.4 Privacy

A profile is **public** (default) or **private**. A private profile shows only the
handle; its results still count on leaderboards under the handle unless the pilot
opts out of records entirely.

---

## 4. Career History and Profiles

### 4.1 Session results

A **result** is written when a session ends: the player leaves the scope, saves and
quits, or the debrief is shown. It's kept even if the saved session is deleted,
and it's separate from saved sessions (which are just resumable snapshots).

```
session_results
  id, user_id, airspace_id, difficulty, settings_hash,
  started_at, ended_at, sim_time_sec,
  rp, stats (jsonb: the SessionStats), timing (jsonb), rp_history (jsonb),
  engine_version, verification ('pending' | 'verified' | 'mismatch' | 'unverifiable'),
  hidden_by_admin (bool), saved_session_id (nullable)
```

A resumed session continues the same result rather than starting a new one.

### 4.2 Profile pages

- **Header:** handle, display name, joined date, home airspace (most played),
  career RP, rank on the career board.
- **Career totals:** sessions, hours controlled, landed, handed off, on-time rate,
  losses of separation per 100 flights, go-arounds.
- **Charts:** career RP over time; RP and on-time rate by airspace.
- **History:** every result, newest first, with airspace, difficulty, duration, RP
  and flights; each opens the session overview.
- **Session overview** (`/results/:id`, public when the profile is): the
  debrief as it was (RP chart, timing table, flights by kind, every RP event),
  plus whether the result is verified.

---

## 5. Records

### 5.1 Boards

| Board        | Ranks by                                      | Notes                                                        |
| ------------ | --------------------------------------------- | ------------------------------------------------------------ |
| Career RP    | Sum of verified results                       | All-time, this month, this week                              |
| Best session | RP in one session                             | Per airspace and difficulty; sessions of at least 30 minutes |
| Landings     | Arrivals landed                               | Per period                                                   |
| Safety       | Losses of separation per 100 flights (lowest) | At least 200 flights in the period                           |
| On time      | On-time rate                                  | At least 100 timed flights in the period                     |

Only verified results from verified-email accounts count. Admins can hide a result
(audited). Boards are computed with SQL over `session_results`, cached for a
minute.

### 5.2 Verified replays

The engine is deterministic: the same start and the same inputs give the same
session, tick for tick. So the server can replay a result and compute the score
itself.

- **What the client records:** the start (seed, start time, session settings,
  runway choices, airspace, engine version) and an **input log**: every call that
  changes the simulation, with its tick. There are four: `issueInstruction`,
  `releaseDeparture`, `applyLiveWeather` and `updateTrafficSettings`. Pausing and
  sim speed don't change the outcome and aren't recorded.
- **Where it lives:** `SimEngine` records its own input log, so it's in every
  snapshot. A resumed session keeps its log, and a replay always starts from the
  very beginning.
- **On the server:** when a result arrives, a background job builds the engine
  from the start, applies each input at its tick, runs to the final tick, and
  compares the score, stats and final state hash. Equal: `verified`. Different:
  `mismatch` (never on a board; logged for admins). From an older engine
  version: `unverifiable` (kept in the history, not on boards).
- **Cost:** a busy hour replays in a few seconds of CPU, run outside the request
  in a queue with a concurrency limit.
- **The same in every browser:** JavaScript leaves `Math.sin`, `Math.atan2`, `Math.exp`
  and the like to each engine, which can differ in the last bit. sim-core uses its own
  ports of fdlibm (`math/dmath.ts`) built only on operations IEEE 754 makes exact, and
  ESLint forbids the Math versions there. End-to-end tests verify sessions played in
  Chromium, WebKit and Firefox.
- **Timing:** results are checked once their session has been quiet for
  `RESULT_VERIFY_SETTLE_SEC` (180 s by default), polled every `RESULT_VERIFY_POLL_MS`.
- **Bounds:** a log is at most a few thousand inputs (about 1 MB); bigger
  submissions are refused.

---

## 6. Community

Built into Vector.

- **Structure:** categories (General, Airspaces, Techniques, Bug reports, Feature
  requests, Announcements, which only admins post in), threads and replies.
- **Posts:** Markdown, rendered safely (no raw HTML; links get `rel="nofollow
ugc"`), editable by the author for 24 hours (with an "edited" mark), and quotable.
  Threads can link a session overview, which shows as a card.
- **Engagement:** a "useful" reaction, view and reply counts, "new since your last
  visit", and following a thread (notifications on the site; email digests later).
- **Safety:** posting needs a verified email; new accounts are rate-limited (a few
  posts an hour, links limited until they've posted a few times). Anyone signed in
  can report a post with a reason.
- **Moderation (admin):** a reports queue; hide or delete posts; lock, pin, move or
  delete threads; suspend a user from posting for a time or for good. All audited.

Tables: `forum_categories`, `forum_threads`, `forum_posts`, `forum_reactions`,
`forum_reports`, `forum_follows`, `forum_reads`, and `posting_suspended_until` on
users.

---

## 7. Landing, Guide and News

- **Landing:** a live scope behind the hero: a real session in New York with a
  simple scripted controller (`apps/client/src/demo`), loaded once the page is
  showing and paused when it's off screen or the tab is hidden. `og-image.jpg` is
  the static image for link previews.
- **Airspace pages:** `/airspaces` and `/airspaces/:id`, the same live scope plus
  facts read from the airspace pack (runways, ILS, flows, STARs, carriers).
- **SEO:** each public page's title and description are in
  `apps/client/src/site/public-pages.json`. The pages read it, and the build writes
  `dist/<page>/index.html` with those tags in the head (`vite.config.ts`), so search
  engines and link previews see them without running the app. The page body is
  still rendered by the app; full prerendering can follow if search needs it.
- **Guide:** the handbook is HTML in the repo (`screens/guide/guide.html`), shown at
  `/guide` with its contents. The scope's quick reference links to it.
- **News:** `news_posts` (title, slug, summary, Markdown body, published_at),
  written in the admin pages with a live preview; the latest shows on the landing
  and the play hub. Markdown is rendered with marked and cleaned with DOMPurify.
- **Legal:** About, Terms and Privacy are plain-language drafts of what Vector does
  today. Have them reviewed before taking payments.

---

## 8. Monetization (later; hooks now)

Not built in this phase, but nothing will need reworking for it:

- **Entitlements:** an `entitlements` table (user, kind, expires) and one server
  function, `canUse(user, thing)`, that airspace access already goes through. A
  plan can then be "New York free, Chicago and Dallas with a subscription or a
  one-time purchase".
- **Payments:** Stripe Checkout and the customer portal, with webhooks writing
  entitlements; `/pricing` and `/account/billing` pages.
- **Records** stay open to everyone who plays the airspace.

---

## 9. Milestones

Each is a `vector/feature/<name>` branch, tested and merged on approval.

1. **Site foundation.** The three layouts and the header, footer and account menu;
   routing (`/` landing placeholder, `/play`, 404); handles (migration,
   registration, choosing one for existing accounts, admin pages showing them);
   `/account` self-service (handle, name, password with the current one, sign out
   other devices, delete account).
2. **Career history.** Session results with the input log in the engine and
   snapshots; writing results when a session ends; `/me`, `/pilots/:handle` and the
   session overview; privacy.
3. **Records.** Server replay verification (queue, versions, mismatch handling),
   the boards, admin result moderation.
4. **Landing, guide, news, legal.** The landing page with the live demo, airspace
   pages, the guide in the app, news with admin authoring, About/Terms/Privacy,
   prerendering.
5. **Email.** Resend, verification, password reset, email change; records and the
   forum require a verified email.
6. **Community.** The forum and its moderation.

---

## 10. Decisions

| Topic             | Decision                                                                        |
| ----------------- | ------------------------------------------------------------------------------- |
| Records integrity | Server-verified replays of the engine's input log; only verified results count  |
| Forum             | Built into Vector, on Vector accounts                                           |
| Email provider    | Resend                                                                          |
| Order             | Foundation, career history, records, landing/guide/news/legal, email, community |
| Public identity   | A unique handle; emails are never public                                        |
| Results vs saves  | Results are permanent career history; saved sessions are resumable snapshots    |
