# Vector — MVP v1

> A realistic, web-based air traffic control simulator.
> v1 puts the player in the seat of a **New York TRACON (N90) approach/departure controller**, working all IFR traffic in and out of **KJFK, KEWR and KLGA** on a modern, STARS-style 2D radar scope.

---

## 1. Vision

Vector should feel like sitting at a real radar scope: dark display, crisp video maps, data blocks ticking over every sweep, and traffic that behaves like real aircraft flown by real pilots. The UI must be **modern, polished and immediately impressive**, without sacrificing the look and discipline of real ATC equipment.

v1 is intentionally focused on **one airspace done well**, but every layer is built so new airspaces, airports, aircraft types, commands and (eventually) multiplayer can be added without rewrites.

### Guiding principles

1. **Realism first**: real airports, real runways, real procedures, realistic aircraft performance and phraseology.
2. **Data-driven**: airspaces, airports, procedures and aircraft types live in data files, not code.
3. **Simulation is independent of the UI**: the sim engine is a pure TypeScript package with no DOM or network dependencies.
4. **Deterministic and serializable**: any moment of a session can be saved and restored exactly.
5. **Built in milestones**: each milestone ends in something runnable and tested.
6. **UI-only aircraft control**: every aircraft instruction is issued through the UI (selection, menus, panels). There is **no text or command-line entry**, now or later.
7. **Keyboard is for the game, not the aircraft**: shortcuts control the sim, menus and display (pause, sim speed, zoom, layers, panels). They never issue aircraft instructions.
8. **If it can vary, it's a setting**: any tunable value (thresholds, timings, display options, audio, realism limits) is exposed as a setting with a sensible default, not hard-coded.
9. **Airborne only**: no ground or taxi simulation. Aircraft exist from the moment they're ready for departure until they land or leave the airspace.

---

## 2. Core User Flow (v1)

```
Register / Login
      │
      ▼
Home ──► New Session ──► Select Airspace ──► Configure ──► Radar Scope (live)
  │                      (New York ✔,       (wind, runways,       │
  │                       others "coming     difficulty)          │
  │                       soon")                                  ▼
  │                                                       Pause ──► Save ──► Close
  │                                                                           │
  └──► Saved Sessions ──► Load ──► Radar Scope (paused) ──► Resume ◄──────────┘
                                                             (after relaunch + login)
```

---

## 3. v1 Feature Set

### 3.1 Airspace & Airport Selection

- An **airspace selection screen** lists available airspaces as cards (name, region, airports, difficulty).
- v1 ships with one playable airspace: **New York (N90)**.
  - **KJFK**: John F. Kennedy International (runways 4L/22R, 4R/22L, 13L/31R, 13R/31L)
  - **KEWR**: Newark Liberty International (runways 4L/22R, 4R/22L, 11/29)
  - **KLGA**: LaGuardia (runways 4/22, 13/31)
- The player controls **all arrival and departure traffic for all three airports** in a single session.
- Other airspaces may appear as locked "coming soon" cards, so the foundation for choosing between them exists from day one.
- **Session configuration** before launch:
  - **Wind** per airport (direction and speed), **randomly generated but realistic** for the region by default, or set manually in Settings. Generation uses the session's seeded random number generator and a regional wind profile (typical directions and speeds for New York), and the three airports get consistent winds since they're only a few miles apart.
  - **Active runways** per airport, derived from the wind (runways with an acceptable headwind/crosswind component are available; the rest are not)
  - **Difficulty**: Easy / Normal / Hard / Expert (see 3.4.1)
  - **Gameplay and realism settings** for this session (see 3.9)
- In v1, wind stays the same for the whole session and is used to pick active runways. Wind drift on aircraft in flight comes later.

### 3.2 Radar Scope (STARS-style display)

- Full-screen dark scope rendered on **HTML Canvas**, targeting 60 fps for UI and animation.
- **Video map** layers: runways, airport outlines, Class B boundaries, key fixes and navaids, final approach courses, sector boundary, coastline and rivers (toggleable). Drawn by Vector's own renderer from real geographic data, placing KJFK, KEWR and KLGA at their exact real-world positions.
- **Real-world map (optional):** a dark-styled real map (terrain, water, roads, city names) can be shown underneath the video map, with adjustable opacity. Off by default, since real STARS scopes show line maps only.
- **Range rings** and a compass rose (toggleable).
- **Radar sweep realism**: target positions update on a realistic ~4.8 s radar interval, while the rest of the display stays smooth.
- **Targets** with **history trails** (last N positions) and **leader lines**.
- **Full data blocks** (STARS-style):
  - Line 1: callsign (e.g. `JBU1024`)
  - Line 2: altitude in hundreds of feet + climb/descend indicator + ground speed (e.g. `050↓ 21`), alternating with aircraft type and destination (e.g. `A320 JFK`)
- **Pan, zoom** and a **range/bearing line** tool.
- **Selected aircraft highlight** and hover states.
- **UTC clock**, sim-speed indicator and session status bar.

### 3.3 Aircraft Simulation

Each aircraft has:

| Property             | Notes                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------- |
| Callsign & telephony | Real ICAO airline codes and radio names (`DAL`/"Delta", `JBU`/"JetBlue", `BAW`/"Speedbird") |
| Aircraft type        | ICAO type (A320, A321, B738, B739, B752, B763, B77W, B789, A333, E175, CRJ9, …)             |
| Position             | Latitude / longitude                                                                        |
| Altitude             | Feet MSL, with assigned vs current altitude                                                 |
| Heading              | Degrees magnetic, with assigned vs current heading                                          |
| Speed                | Indicated airspeed, true airspeed and ground speed (kts)                                    |
| Vertical rate        | ft/min, based on the aircraft's performance                                                 |
| Squawk               | Assigned transponder code                                                                   |
| Flight plan          | Origin, destination, route / procedure                                                      |
| Flight phase         | Departure climb, en route, arrival, approach, handed off, …                                 |

**Flight model**

- Performance profiles per aircraft type: climb/descent rates by altitude band, min/max speeds, acceleration, approach speed.
- **Standard-rate turns** (3°/s, bank-limited at higher speeds) with realistic turn direction.
- Basic ISA atmosphere for IAS ↔ TAS conversion (no wind in v1).
- **Regulatory limits** respected by pilots: 250 kts below 10,000 ft, and speed restrictions on procedures.
- **Pilot response delay**: instructions take effect after a short, realistic delay, not instantly.

### 3.4 Traffic Generation

- **Arrivals** spawn at the edge of the N90 sector on realistic arrival routes into JFK, EWR and LGA, at realistic handoff altitudes and speeds.
- **Departures** appear in a **departure queue** at each airport once they are ready to go (see 3.5.1). Nothing takes off until the player clears it.
- Airline mix, aircraft types and destinations reflect each airport's real-world traffic (e.g. heavy international widebodies at JFK, JetBlue presence at JFK, United hub at EWR, regional jets and narrowbodies at LGA).
- **Scenario/spawn definitions** are data files, so densities and traffic patterns can be tuned without code changes.
- Target of **20–40 simultaneous aircraft** on Hard and Expert.

#### 3.4.1 Difficulty

Difficulty is a preset that sets a group of traffic settings at once. Each value can still be adjusted individually in Settings (the difficulty then shows as "Custom").

| Setting                                | Easy | Normal   | Hard | Expert          |
| -------------------------------------- | ---- | -------- | ---- | --------------- |
| Arrival rate (per airport, per hour)   | Low  | Moderate | High | Peak real-world |
| Departure rate (per airport, per hour) | Low  | Moderate | High | Peak real-world |
| **Max departure queue** (per airport)  | 3    | 5        | 8    | 12              |

- The departure queue **can grow, but only up to its maximum**. When an airport's queue is full, new departures are **held at the gate**: they don't enter the queue until a slot opens. This keeps traffic realistic without flooding the player.
- The exact rates and queue sizes are defaults to tune during playtesting.

### 3.5 Issuing Instructions (UI only)

All aircraft control happens through the UI. **There is no text or command-line entry.**

- **Click a target, data block, departure queue entry or comms log entry** to select an aircraft and open its **radial or context command menu**.
- Values are chosen with UI controls such as heading dials, altitude and speed pickers, and fix lists. Nothing is typed.
- Menus only offer **valid values** (e.g. altitudes within the aircraft's performance, fixes that exist, runways that are active).
- In-flight commands:
  - **Heading**: turn left / right / fly heading `XXX`
  - **Altitude**: climb / descend and maintain `XXXX`
  - **Speed**: maintain / increase / reduce to `XXX` kts (with "resume normal speed")
  - **Direct to fix**: pick from nearby fixes
  - **Cleared ILS approach**: an active runway at the aircraft's destination (see 3.5.2)
  - **Handoff to Center**: departures to New York Center
- **Arrivals are handed to Tower automatically** once established on the ILS (see 3.5.3). There is no manual Tower handoff command.

#### 3.5.1 Departures

1. When a departure is ready, it appears in its airport's **departure queue** panel with its callsign, type, destination and requested departure. It also shows on the scope at the airport.
2. The player selects it and **assigns a departure runway** from that airport's active runways, which **clears it for takeoff**.
3. The aircraft takes off and flies the **published departure procedure** for that runway (initial heading or route, initial altitude, speed limits) on its own.
4. Until it passes the **radar-contact altitude** (a setting, e.g. 1,500 ft), it appears on the scope as a **dimmed, non-interactive target**. At that altitude the pilot checks in, and the data block becomes **fully active and controllable**.
5. From then on, the player climbs, vectors and routes it, then hands it off to New York Center.

#### 3.5.2 Arrivals & the ILS Approach

"Cleared ILS approach" is only accepted when the aircraft is in a position where a real pilot could fly it. All thresholds below are settings with realistic defaults:

| Criterion                          | Default                                                                                                    |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Intercept angle to the localizer   | ≤ 30°                                                                                                      |
| Distance from the runway threshold | Within a set range (e.g. 5–25 NM)                                                                          |
| Lateral position                   | Within the localizer's usable width, on the correct side                                                   |
| Altitude                           | At or below glideslope intercept altitude (intercept from below), and above the minimum vectoring altitude |
| Speed                              | Slow enough to slow down to final approach speed before the stabilized-approach gate                       |

- If the criteria are **not met**, the pilot replies **"unable"** with a reason (e.g. `Unable, too high for the approach, Delta 412`) and keeps the current instruction. A setting can also show approach eligibility in the command menu, as a player aid.
- If the criteria **are met**, the aircraft intercepts the localizer, captures the glideslope, and **slows down on its own** according to its type's performance.
- **Stabilized-approach gate** (setting, default 1,000 ft AGL): if the aircraft is not on the localizer, on the glideslope, and at or near final approach speed by the gate, it performs an **automatic go-around**.
- **Go-around**: the aircraft flies the published missed approach (or runway heading and a set altitude) and reports it on the radio.

#### 3.5.3 Control Ownership & Automatic Handoffs

Every aircraft has an **owner**: the player (N90) or another facility (Tower or Center). Only aircraft the player owns can be selected and commanded. Aircraft owned by someone else are drawn **dimmed and non-interactive**. Control moves automatically at realistic points:

| Event                                                                          | Control moves                  | What the player sees                                                                                  |
| ------------------------------------------------------------------------------ | ------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Departure passes the radar-contact altitude (setting, default 1,500 ft)        | Tower → **Player**             | Pilot checks in and the data block becomes active                                                     |
| Player hands a departure to Center                                             | Player → Center                | Target dims and the pilot reads back the frequency change                                             |
| Arrival checks in at the sector boundary                                       | Center → **Player**            | Pilot checks in and the data block becomes active                                                     |
| Arrival is **established on the ILS** (localizer and glideslope both captured) | Player → Tower (automatic)     | ATC transmits the frequency change to Tower, the pilot reads it back, and the target dims             |
| Aircraft **goes around**                                                       | Tower → **Player** (automatic) | Pilot reports the go-around, and the data block becomes active again so the player can re-sequence it |
| Arrival lands                                                                  | Removed                        | Target disappears from the scope (no taxi)                                                            |

- All ownership changes appear in the comms log with realistic phraseology (e.g. `ATC: Delta four twelve, contact Kennedy Tower one one niner point one.` / `Tower one one niner point one, Delta four twelve.`).
- Ownership is part of the sim state, so it is saved and restored with the session.
- The same ownership model supports Tower and Center player positions later without changes to the engine.

### 3.6 Radio / Communications Log

- Scrolling transmission log showing each **controller instruction and pilot readback** in real phraseology:
  - `ATC: JetBlue ten twenty-four, turn left heading two seven zero, descend and maintain four thousand.`
  - `JBU1024: Left two seven zero, down to four thousand, JetBlue ten twenty-four.`
- **Pilot check-ins** when arrivals and departures enter the sector.
- Clicking a log entry selects that aircraft on the scope.

### 3.7 Separation & Safety

- Continuous separation monitoring: **3 NM lateral / 1,000 ft vertical** within the TRACON.
- **Conflict Alert (CA)**: predicted and active losses of separation flash the involved data blocks, with an audible alert.
- A **violation log** records every loss of separation (time, aircraft, distance and altitude difference).
- No scoring in v1. The violation log is for awareness only.

### 3.8 Session Controls & Keyboard Shortcuts

- **Pause / resume**
- **Sim speed**: 1x, 2x, 4x (available speeds are a setting)
- **Save session** (while paused)
- **Exit to home**
- **Keyboard shortcuts** are for game, menu and display controls **only**: pause/resume, sim speed, zoom, center scope, toggle map layers and panels, open settings, save, close menus. **No shortcut ever issues an aircraft instruction.**
- Every shortcut can be rebound in Settings.

### 3.9 Settings

Any value that can reasonably vary is a setting. Settings come in two scopes:

- **User preferences** are saved to the player's account and apply everywhere: display, audio and controls.
- **Session settings** are chosen when the session is created and saved with it: gameplay and realism.

Every setting has a realistic default and a "reset to default" option.

| Category       | Examples                                                                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Display**    | Theme and brightness, data block font size, trail length, leader line length, range ring spacing, sweep effect on/off, UI animation level, colors |
| **Map**        | Each video map layer on/off, real-world map on/off and its opacity                                                                                |
| **Audio**      | Master volume, Conflict Alert sound on/off, UI sounds on/off                                                                                      |
| **Controls**   | Keyboard shortcut bindings, mouse/scroll zoom sensitivity, menu style (radial or list)                                                            |
| **Traffic**    | Difficulty preset, arrival rate, departure rate, max departure queue per airport, airline and aircraft type mix                                   |
| **Weather**    | Wind mode (random but realistic, or manual), wind direction and speed per airport, maximum tailwind and crosswind for active runways              |
| **Separation** | Lateral minimum (NM), vertical minimum (ft), Conflict Alert look-ahead time                                                                       |
| **Radar**      | Sweep interval, history trail count                                                                                                               |
| **Pilots**     | Response delay range, readback detail                                                                                                             |
| **Departures** | Radar-contact altitude (when control moves from Tower to the player)                                                                              |
| **Approaches** | ILS intercept angle limit, intercept distance range, stabilized-approach gate altitude, go-around on/off, show approach eligibility in menus      |
| **Sim**        | Available sim speeds                                                                                                                              |

### 3.10 Accounts & Saved Sessions

- **Register / login / logout** with email and password.
- **Save** the current session to the player's account with a name (auto-suggested, e.g. `New York — Medium — 14:32Z`).
- **Saved sessions list**: name, airspace, sim time, aircraft count and last saved time. Sessions can be loaded, renamed and deleted.
- **Loading** restores the session exactly as it was, paused, and ready to resume.
- Saves are versioned so older saves keep loading as the simulator evolves.

### 3.11 Out of Scope for v1 (planned for later)

- Scoring, ratings and performance analytics
- Voice commands and text-to-speech pilot readbacks
- Wind drift on aircraft in flight, weather cells, altimeter changes, and wind or runway changes mid-session
- Holding patterns and controller-initiated go-arounds
- Emergencies (medical, engine failure, NORDO)
- Tower and Center positions

### 3.12 Never in Scope

- Text or command-line aircraft instructions
- Keyboard shortcuts that control aircraft
- Ground movement and taxi simulation
- Additional airspaces (e.g. SoCal, Chicago, Atlanta, London)
- Multiplayer and shared airspace
- Autosave and cloud sync across devices during a live session

---

## 4. Architecture

### 4.1 Tech Stack

| Layer      | Technology                                                                      |
| ---------- | ------------------------------------------------------------------------------- |
| Language   | **TypeScript** everywhere                                                       |
| Monorepo   | npm workspaces                                                                  |
| Sim engine | `@vector/sim-core`, pure TypeScript with no DOM or network code                 |
| Client     | React + Vite, HTML Canvas renderer for the scope, CSS design tokens for theming |
| Server     | Node.js + Fastify (REST in v1; WebSockets later for multiplayer)                |
| Database   | PostgreSQL                                                                      |
| Validation | Zod (shared schemas for API payloads, data files and save snapshots)            |
| Auth       | JWT access tokens + rotating refresh tokens (same model as Atlas)               |
| Testing    | Vitest (unit + integration), Playwright (end-to-end, later milestones)          |

### 4.2 Project Structure

```
Projects/vector/
├── apps/
│   ├── client/                 # React app: screens, scope renderer, menus, UI
│   └── server/                 # Fastify API: auth, saved sessions
├── packages/
│   ├── sim-core/               # Simulation engine (runs in browser now, Node later)
│   │   ├── aircraft/           # Aircraft state, flight model, performance
│   │   ├── commands/           # One module per ATC instruction (command pattern)
│   │   ├── traffic/            # Spawning and scenario playback
│   │   ├── separation/         # Conflict detection and alerts
│   │   ├── approach/           # ILS eligibility, stabilized-approach checks, go-arounds
│   │   ├── weather/            # Seeded realistic wind and active-runway selection
│   │   ├── ownership/          # Who controls each aircraft, automatic handoffs
│   │   ├── settings/           # Session settings schema and defaults
│   │   ├── navigation/         # Geo math, fixes, procedures, ILS
│   │   ├── comms/              # Phraseology generation and readbacks
│   │   └── snapshot/           # Serialize / restore full sim state
│   └── shared/                 # Zod schemas and types shared by client + server
├── data/
│   ├── airspaces/
│   │   └── new-york/           # airspace.json, airports/, fixes, procedures, video maps, runway wind limits
│   ├── aircraft-types/         # Performance profiles per ICAO type
│   └── airlines/               # ICAO codes, telephony, liveries/colors
├── migrations/                 # PostgreSQL migrations
└── docs/
    └── MVPv1.md
```

### 4.3 Key Design Decisions

- **Airspace packs.** An _airspace_ is a self-contained data pack (airports, runways, fixes, procedures, video maps, traffic profiles). The selection screen simply lists available packs. Adding "SoCal" later means adding `data/airspaces/socal/`, not new engine code.
- **Fixed-timestep simulation loop.** The sim advances in fixed ticks (e.g. 1 s of sim time) independently of rendering. Sim speed multiplies ticks per real second. The renderer interpolates between states for smooth animation, while radar targets only update on the sweep interval.
- **Command pattern.** Each instruction is a self-contained command (validate → apply → produce phraseology). New instructions plug in without touching existing ones.
- **Deterministic engine.** A seeded random number generator drives all randomness (spawns, pilot delays), so a saved session resumes exactly as it would have continued.
- **Snapshots.** The entire sim state (clock, RNG state, aircraft, pending spawns, comms log, violations, wind, active runways, session settings) serializes to one versioned JSON document, which is what gets saved to the server.
- **Browser now, server later.** In v1 the sim runs in the browser for zero-latency control. Because `sim-core` has no browser dependencies, it can later run on the Node server for authoritative multiplayer.
- **Settings as a schema.** Every setting is defined once (key, type, range, default, scope) in a shared Zod schema. The settings UI, validation, the sim engine and persistence all read from that one definition, so adding a setting means adding one schema entry.
- **Input layer split.** Aircraft commands only come through the command UI. Keyboard shortcuts go through a separate, rebindable game-controls layer that has no access to the command system.
- **Renderer abstraction.** The scope renderer consumes a read-only view of sim state, so the rendering technique (Canvas 2D today, WebGL later if needed) can change independently.

### 4.4 Data Model (v1)

```
users           id, email, password_hash, display_name, created_at
auth_sessions   id, user_id, refresh_token_hash, expires_at, revoked_at
user_settings   user_id, settings (JSONB), settings_version, updated_at
saved_sessions  id, user_id, name, airspace_id, snapshot_version,
                snapshot (JSONB), sim_time, aircraft_count,
                created_at, updated_at
```

### 4.5 API (v1)

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/settings                 # user preferences (defaults filled in)
PUT    /api/settings                 # update user preferences

GET    /api/sessions                 # list saved sessions (metadata only)
POST   /api/sessions                 # save a new session
GET    /api/sessions/:id             # load a session (full snapshot)
PUT    /api/sessions/:id             # overwrite / re-save
PATCH  /api/sessions/:id             # rename
DELETE /api/sessions/:id
```

Airspace data ships as static assets with the client in v1. It can move behind an API later.

---

## 5. Real-World Data

- Airport, runway, navaid, fix and procedure data will be built from **public FAA sources** (NASR / CIFP) and checked against current charts.
- The N90 lateral boundary and internal video maps are not fully published, so they will be **approximated from public charts** (Class B, sectional/TAC charts, published procedures).
- Coastlines, shorelines, rivers and borders for the video map come from **Natural Earth** (public domain). Class B boundaries come from the **FAA's published airspace data**.
- The optional real-world map uses **MapLibre GL** with free **OpenStreetMap-based vector tiles** (e.g. OpenFreeMap), styled dark to match the scope. OpenStreetMap requires on-screen attribution when this layer is shown. It needs an internet connection; the video map does not.
- Data is converted into Vector's own JSON schema by build scripts, so updating to a new FAA cycle is repeatable.
- Vector is a simulation for entertainment and training-style practice. **It is not for real-world navigation or operational use.**

---

## 6. UI / Design Direction

- **Look:** a modern take on a real STARS scope, with a near-black background, a restrained color palette (muted map lines, bright targets, amber/red alerts) and a subtle glow on targets and the sweep.
- **Typography:** a clean monospace font for data blocks and the comms log, and a modern sans-serif for menus and screens.
- **Layout:** the scope is the hero and takes up almost all of the screen. The comms log, departure queues, selected-aircraft panel and session bar sit in collapsible panels around it.
- **Motion:** smooth zoom and pan, animated menu transitions and fading history trails. Motion never makes the display harder to read.
- **Pre-session screens** (login, home, airspace selection, saved sessions) share the same aesthetic: dark, glassy panels and map-inspired backgrounds.
- **Accessibility:** readable contrast, scalable data-block font size and keyboard navigation for menus.

---

## 7. Milestones

| #   | Milestone                              | Outcome                                                                                                                                                                                                                                                                                        |
| --- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Project foundation**                 | Monorepo, TypeScript, lint/format, Vitest, Vite client shell, Fastify server shell, PostgreSQL + migrations                                                                                                                                                                                    |
| 2   | **Sim-core engine**                    | Fixed-timestep loop, geo math, aircraft state and flight model, performance profiles, seeded RNG, unit tests                                                                                                                                                                                   |
| 3   | **Settings framework**                 | One shared definition for every setting (type, range, default, scope), user and session registries, lenient loading of older stored settings, strict validation of updates, difficulty presets, keybinding conflict detection, map layer settings, and session settings saved in sim snapshots |
| 4   | **New York airspace data**             | Airspace pack schema (Zod), KJFK/KEWR/KLGA runways, fixes, departure/arrival/missed-approach procedures, ILS data and video maps, plus a data build pipeline                                                                                                                                   |
| 5   | **Radar scope**                        | Canvas renderer: video maps, targets, trails, data blocks, pan/zoom, range/bearing tool, game-control keyboard layer and the core visual design                                                                                                                                                |
| 6   | **Controller instructions**            | Selection, command menus and value pickers, command pattern implementation, pilot delay, comms log with phraseology and readbacks                                                                                                                                                              |
| 7   | **Departures**                         | Realistic wind generation, wind-based active runways, control ownership model, difficulty presets, bounded departure queues with gate holds, runway assignment and takeoff, published departure procedures, automatic Tower-to-player handoff at the radar-contact altitude, handoff to Center |
| 8   | **Arrivals & approaches**              | Arrival spawning on arrival routes, ILS eligibility with "unable" replies, localizer/glideslope capture, automatic handoff to Tower once established, pilot slowdown, stabilized-approach gate, automatic go-arounds with control returned to the player, landing                              |
| 9   | **Separation**                         | Conflict detection and prediction, Conflict Alert visuals and audio, violation log                                                                                                                                                                                                             |
| 10  | **Accounts & user settings**           | Register, login, token refresh and logout, plus user preferences saved to the account                                                                                                                                                                                                          |
| 11  | **Save & load**                        | Snapshot serialization, saved sessions API, save/load/rename/delete UI, exact resume                                                                                                                                                                                                           |
| 12  | **Session flow, settings UI & polish** | Home, airspace selection, session config (wind, runways, difficulty), saved sessions and settings screens, UX polish, performance pass, end-to-end tests                                                                                                                                       |

Each milestone is developed on a `vector/feature/<name>` branch and merged into `vector/develop`. `vector/develop` merges into `main` when the milestone set is complete.

---

## 8. Definition of Done (MVP v1)

A player can:

1. Register and log in.
2. Choose **New York** from the airspace selection screen, get realistic random wind (which determines active runways), pick a difficulty, and launch a session.
3. See realistic arrival traffic and departure queues for KJFK, KEWR and KLGA on a polished STARS-style scope.
4. Clear departures for takeoff by assigning an active runway, watch them fly the departure procedure, and take control once they pass the radar-contact altitude.
5. Select aircraft and issue heading, altitude, speed, direct-to, ILS approach and Center handoff instructions **entirely through the UI**, with realistic readbacks in the comms log.
6. Get an "unable" when an ILS clearance doesn't meet the approach criteria.
7. Watch arrivals get handed to Tower automatically once established on the ILS, then slow down and land. If an approach isn't stabilized, see an automatic go-around with control handed back.
8. Watch departures climb out and hand them off to Center.
9. Get Conflict Alerts on losses of separation, logged in the violation log.
10. Change display, audio, control and gameplay settings.
11. Pause, change sim speed, **save the session, close the browser, log back in later, load it and resume exactly where they left off**.

---

## 9. Decisions Log

| Topic             | Decision                                                                                                                            |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Wind              | Random but realistic for the region, seeded per session, fixed for the session in v1                                                |
| Departure queue   | Grows up to a maximum set by difficulty. New departures wait at the gate when it's full                                             |
| Tower handoff     | Automatic once the arrival is established on the ILS. Control returns to the player on a go-around                                  |
| Departure control | Automatic Tower-to-player transfer at the radar-contact altitude                                                                    |
| Aircraft commands | UI only. No text entry, and no keyboard shortcuts for aircraft                                                                      |
| Configurability   | Every tunable value is a setting with a realistic default                                                                           |
| Map               | Vector draws its own video map from real geodata. A real-world map (MapLibre + OpenStreetMap tiles) is an optional layer underneath |

## 10. Open Questions

- None at this time.
