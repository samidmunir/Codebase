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

---

## 2. Core User Flow (v1)

```
Register / Login
      │
      ▼
Home ──► New Session ──► Select Airspace ──► Configure ──► Radar Scope (live)
  │                      (New York ✔,       (runway configs,      │
  │                       others "coming     traffic density)     │
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
  - Active **runway configuration** per airport (chosen from realistic presets, e.g. JFK "Arrive 22L / Depart 22R, 31L")
  - **Traffic density**: Light / Medium / Heavy

### 3.2 Radar Scope (STARS-style display)

- Full-screen dark scope rendered on **HTML Canvas**, targeting 60 fps for UI and animation.
- **Video map** layers: runways, airport outlines, Class B boundaries, key fixes and navaids, final approach courses, sector boundary, coastline and rivers (toggleable).
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

| Property | Notes |
|---|---|
| Callsign & telephony | Real ICAO airline codes and radio names (`DAL`/"Delta", `JBU`/"JetBlue", `BAW`/"Speedbird") |
| Aircraft type | ICAO type (A320, A321, B738, B739, B752, B763, B77W, B789, A333, E175, CRJ9, …) |
| Position | Latitude / longitude |
| Altitude | Feet MSL, with assigned vs current altitude |
| Heading | Degrees magnetic, with assigned vs current heading |
| Speed | Indicated airspeed, true airspeed and ground speed (kts) |
| Vertical rate | ft/min, based on the aircraft's performance |
| Squawk | Assigned transponder code |
| Flight plan | Origin, destination, route / procedure |
| Flight phase | Departure climb, en route, arrival, approach, handed off, … |

**Flight model**
- Performance profiles per aircraft type: climb/descent rates by altitude band, min/max speeds, acceleration, approach speed.
- **Standard-rate turns** (3°/s, bank-limited at higher speeds) with realistic turn direction.
- Basic ISA atmosphere for IAS ↔ TAS conversion (no wind in v1).
- **Regulatory limits** respected by pilots: 250 kts below 10,000 ft, and speed restrictions on procedures.
- **Pilot response delay**: instructions take effect after a short, realistic delay, not instantly.

### 3.4 Traffic Generation

- **Arrivals** spawn at the edge of the N90 sector on realistic arrival routes into JFK, EWR and LGA, at realistic handoff altitudes and speeds.
- **Departures** appear after takeoff from the active runways, climbing on initial departure procedures and headings.
- Airline mix, aircraft types and destinations reflect each airport's real-world traffic (e.g. heavy international widebodies at JFK, JetBlue presence at JFK, United hub at EWR, regional jets and narrowbodies at LGA).
- **Scenario/spawn definitions** are data files, so densities and traffic patterns can be tuned without code changes.
- Target of **20–40 simultaneous aircraft** under Heavy density.

### 3.5 Issuing Instructions (Click / Context Menu)

- **Click a target or data block** to select an aircraft and open a **radial or context command menu**.
- v1 commands:
  - **Heading**: turn left / right / fly heading `XXX`
  - **Altitude**: climb / descend and maintain `XXXX`
  - **Speed**: maintain / increase / reduce to `XXX` kts (with "resume normal speed")
  - **Direct to fix**: pick from nearby fixes
  - **Cleared ILS approach**: runway `XX` at the aircraft's destination (intercept, localizer capture, glideslope descent)
  - **Handoff**: arrivals to the correct Tower (Kennedy / Newark / LaGuardia), departures to New York Center
- Menus only offer **valid values** (e.g. altitudes within the aircraft's performance, fixes that exist).
- Keyboard shortcuts for common actions (power-user friendly; typed command entry can be added later).

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

### 3.8 Session Controls

- **Pause / resume**
- **Sim speed**: 1x, 2x, 4x
- **Save session** (while paused)
- **Exit to home**

### 3.9 Accounts & Saved Sessions

- **Register / login / logout** with email and password.
- **Save** the current session to the player's account with a name (auto-suggested, e.g. `New York — Medium — 14:32Z`).
- **Saved sessions list**: name, airspace, sim time, aircraft count and last saved time. Sessions can be loaded, renamed and deleted.
- **Loading** restores the session exactly as it was, paused, and ready to resume.
- Saves are versioned so older saves keep loading as the simulator evolves.

### 3.10 Out of Scope for v1 (planned for later)

- Scoring, ratings and performance analytics
- Voice commands and text-to-speech pilot readbacks
- Typed command line entry
- Weather, wind, altimeter changes and runway config changes mid-session
- Holding patterns, go-arounds and missed approaches
- Emergencies (medical, engine failure, NORDO)
- Tower and Center positions, ground movement
- Additional airspaces (e.g. SoCal, Chicago, Atlanta, London)
- Multiplayer and shared airspace
- Autosave and cloud sync across devices during a live session

---

## 4. Architecture

### 4.1 Tech Stack

| Layer | Technology |
|---|---|
| Language | **TypeScript** everywhere |
| Monorepo | npm workspaces |
| Sim engine | `@vector/sim-core`, pure TypeScript with no DOM or network code |
| Client | React + Vite, HTML Canvas renderer for the scope, CSS design tokens for theming |
| Server | Node.js + Fastify (REST in v1; WebSockets later for multiplayer) |
| Database | PostgreSQL |
| Validation | Zod (shared schemas for API payloads, data files and save snapshots) |
| Auth | JWT access tokens + rotating refresh tokens (same model as Atlas) |
| Testing | Vitest (unit + integration), Playwright (end-to-end, later milestones) |

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
│   │   ├── navigation/         # Geo math, fixes, procedures, ILS
│   │   ├── comms/              # Phraseology generation and readbacks
│   │   └── snapshot/           # Serialize / restore full sim state
│   └── shared/                 # Zod schemas and types shared by client + server
├── data/
│   ├── airspaces/
│   │   └── new-york/           # airspace.json, airports/, fixes, procedures, video maps, runway configs
│   ├── aircraft-types/         # Performance profiles per ICAO type
│   └── airlines/               # ICAO codes, telephony, liveries/colors
├── migrations/                 # PostgreSQL migrations
└── docs/
    └── MVPv1.md
```

### 4.3 Key Design Decisions

- **Airspace packs.** An *airspace* is a self-contained data pack (airports, runways, runway configs, fixes, procedures, video maps, traffic profiles). The selection screen simply lists available packs. Adding "SoCal" later means adding `data/airspaces/socal/`, not new engine code.
- **Fixed-timestep simulation loop.** The sim advances in fixed ticks (e.g. 1 s of sim time) independently of rendering. Sim speed multiplies ticks per real second. The renderer interpolates between states for smooth animation, while radar targets only update on the sweep interval.
- **Command pattern.** Each instruction is a self-contained command (validate → apply → produce phraseology). New instructions plug in without touching existing ones.
- **Deterministic engine.** A seeded random number generator drives all randomness (spawns, pilot delays), so a saved session resumes exactly as it would have continued.
- **Snapshots.** The entire sim state (clock, RNG state, aircraft, pending spawns, comms log, violations, runway configs) serializes to one versioned JSON document, which is what gets saved to the server.
- **Browser now, server later.** In v1 the sim runs in the browser for zero-latency control. Because `sim-core` has no browser dependencies, it can later run on the Node server for authoritative multiplayer.
- **Renderer abstraction.** The scope renderer consumes a read-only view of sim state, so the rendering technique (Canvas 2D today, WebGL later if needed) can change independently.

### 4.4 Data Model (v1)

```
users           id, email, password_hash, display_name, created_at
auth_sessions   id, user_id, refresh_token_hash, expires_at, revoked_at
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
- Data is converted into Vector's own JSON schema by build scripts, so updating to a new FAA cycle is repeatable.
- Vector is a simulation for entertainment and training-style practice. **It is not for real-world navigation or operational use.**

---

## 6. UI / Design Direction

- **Look:** a modern take on a real STARS scope, with a near-black background, a restrained color palette (muted map lines, bright targets, amber/red alerts) and a subtle glow on targets and the sweep.
- **Typography:** a clean monospace font for data blocks and the comms log, and a modern sans-serif for menus and screens.
- **Layout:** the scope is the hero and takes up almost all of the screen. The comms log, selected-aircraft panel and session bar sit in collapsible panels around it.
- **Motion:** smooth zoom and pan, animated menu transitions and fading history trails. Motion never makes the display harder to read.
- **Pre-session screens** (login, home, airspace selection, saved sessions) share the same aesthetic: dark, glassy panels and map-inspired backgrounds.
- **Accessibility:** readable contrast, scalable data-block font size and keyboard navigation for menus.

---

## 7. Milestones

| # | Milestone | Outcome |
|---|---|---|
| 1 | **Project foundation** | Monorepo, TypeScript, lint/format, Vitest, Vite client shell, Fastify server shell, PostgreSQL + migrations |
| 2 | **Sim-core engine** | Fixed-timestep loop, geo math, aircraft state and flight model, performance profiles, seeded RNG, unit tests |
| 3 | **New York airspace data** | Airspace pack schema (Zod), KJFK/KEWR/KLGA runways, fixes, procedures, runway configs and video maps, plus a data build pipeline |
| 4 | **Radar scope** | Canvas renderer: video maps, targets, trails, data blocks, pan/zoom, range/bearing tool and the core visual design |
| 5 | **Controller instructions** | Selection, context menus, command pattern implementation, pilot delay, comms log with phraseology and readbacks |
| 6 | **Traffic & procedures** | Arrival/departure spawning, procedures, ILS approach and landing, handoffs to Tower and Center, density settings |
| 7 | **Separation** | Conflict detection and prediction, Conflict Alert visuals and audio, violation log |
| 8 | **Accounts** | Register, login, token refresh and logout (client + server) |
| 9 | **Save & load** | Snapshot serialization, saved sessions API, save/load/rename/delete UI, exact resume |
| 10 | **Session flow & polish** | Home, airspace selection, session config, saved sessions screens, UX polish, performance pass, end-to-end tests |

Each milestone is developed on a `vector/feature/<name>` branch and merged into `vector/develop`. `vector/develop` merges into `main` when the milestone set is complete.

---

## 8. Definition of Done (MVP v1)

A player can:

1. Register and log in.
2. Choose **New York** from the airspace selection screen, choose runway configurations and traffic density, and launch a session.
3. See realistic arrival and departure traffic for KJFK, KEWR and KLGA on a polished STARS-style scope.
4. Select aircraft and issue heading, altitude, speed, direct-to, ILS approach and handoff instructions through context menus, with realistic readbacks in the comms log.
5. Watch aircraft respond with realistic performance, intercept the ILS and land, or climb out and be handed off to Center.
6. Get Conflict Alerts on losses of separation, logged in the violation log.
7. Pause, change sim speed, **save the session, close the browser, log back in later, load it and resume exactly where they left off**.

---

## 9. Open Questions

- Which **runway configuration presets** should ship first for each airport? (For example, the most common real-world JFK/EWR/LGA combinations.)
- Should **departures** be pre-cleared to a SID and initial altitude, or should the player issue the initial climb?
- Is a **mouse-only** workflow acceptable for v1, or should keyboard shortcuts be a v1 requirement?
- Should the **audible Conflict Alert** be on by default?
