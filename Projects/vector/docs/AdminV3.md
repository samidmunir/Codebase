# Vector Admin V3: Monitoring and Full Control

The admin pages after the web app (WebAppV2): charts and trends to watch Vector by,
and control over everything players and staff touch.

## Decisions

| Question        | Decision                                                                                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Staff levels    | **Admin** (everything) and **Moderator** (the community only: reports, posts, threads, posting suspensions). Admins grant either.                                 |
| Sign-in details | Each sign-in records its **browser, operating system and IP address**, shown to admins and to the pilot on their Account page, kept only while the sign-in lasts. |
| Order           | Dashboard, then users and sign-ins, then site-wide content, then site switches.                                                                                   |

## Milestones

1. **Dashboard.** Charts by day or week over 7 days, 30 days, 90 days, a year or all
   time: signups and verified emails, active pilots, sessions played and hours flown,
   verification outcomes, airspaces and difficulties played, and community threads,
   posts and reports. Headline numbers with the change from the previous period, and
   what's happening now (pilots online, open reports, results waiting to verify).
   Everything comes from data Vector already keeps (see below).
2. **Users and sign-ins.** The Moderator role. A page per user with their profile,
   career, results, saved sessions, posts, sign-ins (with device and IP) and history.
   Email a password reset or a verification link, change privacy and records
   settings, lift the handle-change limit, end single sign-ins. Bulk actions and CSV
   export.
3. **Site-wide content.** Community categories (create, rename, reorder, remove),
   searching every thread and post, editing any post; a browser of every saved
   session; records controls (take a pilot off the records, all results filtered).
4. **Site switches.** Registration open or closed, a maintenance banner, community
   read-only. All audited.

## Where the dashboard's numbers come from

| Chart                    | Source                                                                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Signups, verified emails | `users.created_at`, `users.email_verified_at`                                                                                      |
| Active pilots            | Distinct pilots with a sign-in or token refresh (`auth_sessions.created_at`; each refresh adds a row) or a session result that day |
| Sessions, hours flown    | `session_results.created_at`, `sim_time_sec`                                                                                       |
| Verification             | `session_results.verification` by the day the session was first played                                                             |
| Airspaces, difficulties  | `session_results.airspace_id`, `difficulty`                                                                                        |
| Community                | `forum_threads.created_at`, `forum_posts.created_at`, `forum_reports.created_at`                                                   |
| Online now               | `auth_sessions.last_used_at` in the last 15 minutes                                                                                |

Deleted accounts take their sign-ins and results with them, so history counts only
pilots who still have accounts; signups count accounts that still exist.

## Built so far

- **Dashboard** (milestone 1): Admin → Dashboard; `GET /api/admin/stats`.
- **Users and sign-ins** (milestone 2):
  - Roles are `player`, `moderator` and `admin`. Moderators get the Community tab
    (reports, hiding and deleting posts, thread tools) and can suspend players from
    posting (`POST /api/admin/community/users/:handle/suspension`); every other admin
    route is for admins.
  - A sign-in is a family of refresh-token rows (`auth_sessions.family_id`); each live
    row keeps its device's User-Agent and IP, cleared when the row is replaced or
    revoked, and hourly for rows that expired. Set `TRUST_PROXY` behind a proxy.
  - `/admin/users/:id` is a page per user: details, password, email (send a link,
    mark verified, send a reset), privacy, handle limit, sign-ins with device and IP
    (end any one), access, posting suspension, career (hide results), posts, saved
    sessions, and history (`admin_audit_log.target_user_id`).
  - The users list selects users for bulk actions (`POST /api/admin/users/bulk`) and
    exports the filtered list as CSV (`GET /api/admin/users/export.csv`, logged).
  - Pilots see their own devices on the Account page and can sign out any one.
- **Site-wide content** (milestone 3):
  - Admin → Community has Reports, Threads, Posts and Categories. Staff search every
    thread (title, category, pinned or locked) and post (text, author, category,
    reported, hidden or edited), and act on them there; staff can rewrite any post
    (`PUT /api/admin/community/posts/:id/body`), which marks it edited and keeps the
    old text in the log.
  - Admins create, rename, describe, reorder and delete categories; a category with
    threads is deleted by moving them to another first.
  - Admin → Saved sessions lists every player's sessions with their owner and stored
    size (`GET /api/admin/sessions`).
  - Admin → Results filters by airspace and difficulty, sorts by RP, takes a pilot off
    the records (or back on), and hides or shows several results at once.
- **Site switches** (milestone 4): Admin → Site, stored in `site_settings` and
  served to everyone at `GET /api/site` (`PUT /api/admin/site` to change, admins
  only; each change is logged as `site.update`).
  - Registration open or closed, with a message for the registration page; while
    closed, `POST /api/auth/register` answers 403 `registration_closed` and the front
    page offers only sign-in. Admins can still create accounts.
  - A banner (information or warning) on every page, the sign-in pages, session
    setup and the scope; readers dismiss it, and a new message shows again.
  - Community read-only: players can read but not post, reply, edit, mark useful or
    report (503 `forum_readOnly`, with the admins' message); staff carry on.
