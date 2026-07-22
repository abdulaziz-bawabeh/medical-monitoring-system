# Interactive Medical Monitoring and Emergency Response System

A full-stack medical operations platform for monitoring healthcare capacity, ambulance availability, emergencies, dispatch activity, geographic resources, and historical telemetry across Syria.

The repository is organized as a monorepo:

```text
medical-monitoring-system/
├── frontend/   # React + Vite dashboard
└── backend/    # Node.js + Express + Socket.IO + PostgreSQL/PostGIS
```

> **Current state:** The core system is implemented and tested locally. Production database hosting, deployment, HTTPS/cookie hardening, scheduled retention jobs, and final production verification are still pending.

---

## 1. Project Purpose

The system provides a real-time command center for a `health_manager` who needs to:

- Monitor medical facility capacity.
- View available and occupied beds.
- See high-occupancy facilities.
- Track ambulances and their operational status.
- Create and monitor emergency cases.
- Receive operational alerts.
- Generate the nearest eligible ambulance recommendation.
- Confirm or reject dispatch recommendations.
- Track ambulance missions from assignment to completion.
- View live routes and ambulance movement on a GIS map.
- Review the most recent 48 hours of operational history.
- Recover readings missed during temporary disconnection.
- Generate realistic demonstration data through a built-in simulation engine.

---

## 2. Main User Role

The currently implemented protected role is:

```text
health_manager
```

This role can access the live dashboard, history, emergency and alert operations, dispatch workflows, simulation controls, and recovery workflows.

---

## 3. Technology Stack and Why It Was Used

## Frontend

### React

React is used to build the user interface as reusable pages and components.

Why it was selected:

- Component-based architecture.
- Efficient rendering of frequently changing operational data.
- Good fit for dashboards and map-based interfaces.
- Easy integration with routing, validation, Zustand, and Socket.IO.

### Vite

Vite is used as the frontend development server and production build tool.

Why it was selected:

- Fast startup.
- Fast hot module replacement.
- Simple React setup.
- Optimized production output.

### Zustand

Zustand is used as the dedicated frontend state-management layer.

It stores and coordinates:

- Authentication state.
- Dashboard data.
- Facility occupancy.
- Ambulance status and location.
- Emergencies.
- Alerts.
- Dispatches.
- Dispatch routes.
- Historical data.
- Simulation state.
- Socket connection state.
- Recovery state.

Why it was selected:

- Streaming data should not depend only on local React component state.
- Socket listeners can update the central store directly.
- Sequence-based deduplication is easier to implement centrally.
- Multiple pages and components can share the same operational state.

### Zod

Zod validates:

- API responses.
- Socket.IO payloads.
- Form input.
- Simulation settings.
- Recovery responses.

Why it was selected:

- Prevents invalid payloads from entering application state.
- Produces clear validation errors.
- Improves reliability for medical and operational data.

### Socket.IO Client

The Socket.IO client provides the real-time browser connection.

It supports:

- WebSocket communication.
- Automatic reconnection.
- Connection lifecycle events.
- Facility occupancy updates.
- Ambulance location updates.
- Emergency and alert updates.
- Dispatch status updates.
- Route-point streaming.
- Recovery coordination after reconnect.

### React Router

React Router organizes public and protected pages and handles unauthorized and not-found routes.

### GIS UI

The frontend includes geographic layers for:

- Syrian governorates.
- Medical facilities.
- Ambulances.
- Emergencies.
- Active routes.
- Historical route replay.

---

## Backend

### Node.js

Node.js runs the backend application.

Why it was selected:

- JavaScript can be used across the full stack.
- Good support for REST APIs and real-time services.
- Suitable for Socket.IO and simulation timers.

### Express

Express provides the REST API and middleware architecture.

It is used for:

- API routes.
- Authentication.
- Authorization.
- Validation.
- CORS.
- Error handling.
- Simulation controls.
- Recovery endpoints.

### Socket.IO Server

Socket.IO provides the authenticated persistent connection between the backend and browser.

It handles:

- Authenticated connections.
- Role validation.
- Reconnection.
- Short-term connection-state recovery.
- Live event broadcasting.
- Route-point streaming.
- Preserved test-reading events.

### PostgreSQL

PostgreSQL stores all persistent operational data.

Why it was selected:

- Strong relational consistency.
- Transactions.
- Constraints and indexes.
- Reliable event history.
- Good support for concurrent operational workflows.

### PostGIS

PostGIS adds spatial capabilities to PostgreSQL.

It is used for:

- Governorate boundaries.
- Facility coordinates.
- Ambulance coordinates.
- Emergency coordinates.
- Route points.
- Nearest-ambulance calculations.
- Geographic filtering.

### `pg` Connection Pool

The backend uses a connection pool instead of opening a new database connection for every request.

The pool provides:

- Reusable database connections.
- Maximum connection limits.
- Idle timeout handling.
- Connection timeout handling.
- Central database error handling.

### Security and Supporting Packages

The backend uses:

- `helmet` for secure HTTP headers.
- `cors` for controlled frontend access.
- `dotenv` for local environment variables.
- `morgan` and application logs for development diagnostics.
- JWT authentication.
- HttpOnly cookies.
- Login rate limiting.
- Role-based access control.
- Zod validation.
- Central HTTP error handling.

---

## 4. Replacement for the Missing Streaming Package

The original requirement referenced:

```text
react-med-geo-streamer@2.1
```

That package was not available from a reliable public package source.

The implemented replacement is:

```text
Socket.IO Client + Zustand + Zod
```

Together, they provide:

- Real-time medical and geographic streaming.
- Dedicated streaming state.
- Payload validation.
- Automatic reconnection.
- Sequence tracking.
- Duplicate rejection.
- Missed-reading recovery.
- Ordered event application.

---

## 5. High-Level Architecture

```text
Browser
  │
  ├── REST API + HttpOnly cookie
  └── Socket.IO WebSocket
        │
        ▼
React + Vite Frontend
        │
        ▼
Node.js + Express + Socket.IO Backend
        │
        ▼
PostgreSQL + PostGIS
```

The backend uses a layered architecture:

```text
Route
  → Middleware
  → Controller
  → Service
  → Repository
  → PostgreSQL/PostGIS
```

### Route layer

Defines API paths and attaches authentication, authorization, and controllers.

### Middleware layer

Handles authentication, roles, rate limiting, security, and errors.

### Controller layer

Receives requests, validates input, calls services, and returns structured responses.

### Service layer

Contains business logic such as occupancy generation, dispatching, movement, recovery, history, and simulation.

### Repository layer

Contains SQL queries and database transactions.

### Validator layer

Contains Zod schemas for requests and operational payloads.

---

## 6. Repository Structure

```text
medical-monitoring-system/
│
├── .gitignore
├── README.md
│
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── package-lock.json
│   │
│   ├── data/
│   │   └── geoboundaries/
│   │       ├── syria-adm1-metadata.json
│   │       └── syria-adm1-simplified.geojson
│   │
│   └── src/
│       ├── app.js
│       ├── server.js
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── migrations/
│       ├── repositories/
│       ├── routes/
│       ├── scripts/
│       ├── services/
│       ├── utils/
│       └── validators/
│
└── frontend/
    ├── package.json
    ├── package-lock.json
    ├── vite.config.js
    ├── index.html
    │
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── components/
        ├── hooks/
        ├── layouts/
        ├── pages/
        ├── routes/
        ├── schemas/
        ├── services/
        ├── stores/
        ├── styles/
        └── utils/
```

---

## 7. Database Migrations

The project currently includes these migrations:

```text
001_create_users_table.sql
002_create_governorates_table.sql
003_create_medical_facilities_and_ambulances.sql
004_create_live_monitoring_events.sql
005_create_emergency_cases_and_alerts.sql
006_create_emergency_case_number_sequence.sql
007_create_dispatch_workflow.sql
008_strengthen_dispatch_recommendations.sql
009_add_history_retention_index.sql
010_create_simulation_runtime.sql
```

They create the authentication, geographic, monitoring, emergency, dispatch, history, and simulation structures.

---

## 8. Main Database Areas

### Users

Stores authenticated users and their roles.

### Governorates

Stores Syrian governorates and geographic boundaries.

The project includes all 14 Syrian governorate boundaries using SRID 4326.

### Medical Facilities

Stores facility identity, type, governorate, location, total beds, and operational data.

### Facility Current Occupancy

Stores the latest valid occupancy state for every facility.

This allows the dashboard to load quickly without scanning the complete history.

### Facility Occupancy Events

Stores append-only occupancy history including:

- Event UUID.
- Facility ID.
- Source device ID.
- Sequence number.
- Total beds.
- Occupied beds.
- Available beds.
- Occupancy percentage.
- Status.
- Recorded time.
- Received time.
- JSON payload.

### Ambulances

Stores ambulance code, operational status, availability, current position, last location time, and latest sequence information.

### Ambulance Location Events

Stores persistent location readings with device, sequence, PostGIS location, speed, heading, timestamps, and JSON payload.

### Emergency Cases

Stores case number, status, priority, location, creation time, and resolution state.

### Alerts

Stores operational alerts related to facilities, emergencies, and dispatch activity.

### Dispatch Recommendations

Stores nearest-ambulance recommendations and their current decision status.

### Ambulance Dispatches

Stores confirmed missions and their lifecycle.

### Dispatch Status Events

Stores every dispatch lifecycle transition.

### Dispatch Route Points

Stores the mission route for live display and historical replay.

### Simulation Runtime

Stores persistent simulation state, run ID, tick count, timing, settings, and interruption recovery information.

---

## 9. Facility Occupancy Rules

The system calculates:

```text
availableBeds = totalBeds - occupiedBeds
```

```text
occupancyPercentage = occupiedBeds / totalBeds × 100
```

The required status rule is:

```text
RED   when occupancyPercentage > 90
GREEN when occupancyPercentage <= 90
```

Therefore:

- Exactly `90%` is `GREEN`.
- More than `90%` is `RED`.

Occupancy events are saved to PostgreSQL before being broadcast to the browser. This prevents the UI from displaying uncommitted data.

---

## 10. Authentication and Authorization

The authentication system uses:

- JWT tokens.
- HttpOnly cookies.
- Protected REST routes.
- Authenticated Socket.IO connections.
- Role checks.
- Login rate limiting.

Authenticated sockets join rooms such as:

```text
user:<userId>
role:<role>
```

The browser cannot directly read the HttpOnly cookie, reducing the risk of client-side token theft.

---

## 11. Frontend Pages

## Login Page

File:

```text
frontend/src/pages/LoginPage.jsx
```

Responsibilities:

- Accept manager credentials.
- Send the login request.
- Load authenticated user state.
- Redirect authorized users.
- Display authentication errors.

## Live Operations Dashboard

File:

```text
frontend/src/pages/LiveOperationsDashboardPage.jsx
```

This is the main operational command center.

It contains:

### Governorate filter

Filters visible resources by governorate.

### Summary cards

Displays:

- Medical facility count.
- High-occupancy facility count.
- Available beds.
- Available ambulances.

### Simulation Control Panel

Allows development-time control of generated data.

Settings include:

- Tick interval.
- Occupancy generation frequency.
- Emergency generation frequency.
- Ambulance movement frequency.
- Maximum active emergencies.
- Automatic dispatch confirmation.

Runtime information includes:

- Run ID.
- Tick count.
- Timer state.
- Last tick.
- Start time.
- Latest run status.

Actions include:

- Start simulation.
- Stop simulation.
- Refresh status.
- Reset settings.
- Reset simulation-generated data.

### Facility Occupancy Panel

Displays facility capacity, occupancy, availability, percentage, status, and latest sequence information.

### Ambulance Status Panel

Displays ambulance code, operational state, availability, latest location, and mission-related status.

### Emergency Operations

Supports creating emergencies and monitoring active emergency cases.

### Alerts Panel

Displays live operational alerts.

### Dispatch Operations Panel

Supports recommendations, confirmation, rejection, active dispatches, and lifecycle monitoring.

### Medical Resource Map

Displays:

- Governorates.
- Facilities.
- Ambulances.
- Emergencies.
- Active routes.

## Historical Monitoring Page

File:

```text
frontend/src/pages/HistoricalMonitoringPage.jsx
```

Supports:

- Time-range queries.
- Occupancy history.
- Emergency history.
- Dispatch history.
- Charts.
- Historical operational records.

The history window is limited to the most recent 48 hours.

## Historical Time Machine Page

File:

```text
frontend/src/pages/HistoricalTimeMachinePage.jsx
```

Supports:

- Historical snapshots.
- Dispatch movement replay.
- Historical route points.
- Historical map layers.

## Connection Test Page

File:

```text
frontend/src/pages/SocketTestPage.jsx
```

Preserves the original Socket.IO test workflow.

It is used to:

- Verify connection.
- Send a test medical reading.
- Receive acknowledgement.
- Receive confirmation events.
- Diagnose Socket.IO independently of the dashboard.

## Unauthorized Page

File:

```text
frontend/src/pages/UnauthorizedPage.jsx
```

Displayed when an authenticated user does not have the required role.

## Not Found Page

File:

```text
frontend/src/pages/NotFoundPage.jsx
```

Displayed for unknown routes.

---

## 12. Important Real-Time Events

### Connection

```text
connection:ready
```

Includes connection information and whether Socket.IO recovered the previous session.

### Preserved test events

```text
medical:test-reading
medical:reading-confirmed
```

### Facility occupancy

```text
facility:occupancy-updated
```

The frontend validates the event and applies it only when the incoming sequence is newer.

### Ambulance location

```text
ambulance:location-updated
```

The frontend rejects stale timestamps and duplicate or older sequence numbers.

### Dispatch route

```text
dispatch:route-point
```

Each point updates the route polyline and ambulance marker.

### Other event categories

The socket lifecycle also handles emergency, alert, recommendation, dispatch, and ambulance status events.

---

## 13. Dispatch Recommendation Logic

The dispatch engine uses PostGIS to find the nearest eligible ambulance.

An ambulance is eligible only when:

- `is_operational = true`.
- Status is `AVAILABLE`.
- A current location exists.
- Location data is recent.
- No active mission already uses the ambulance.

A generated recommendation can be:

- Confirmed.
- Rejected.
- Automatically confirmed by simulation settings.

When auto-confirm is enabled, the simulation attempts to:

1. Generate an emergency.
2. Find the nearest eligible ambulance.
3. Create a recommendation.
4. Confirm the recommendation.
5. Create a dispatch mission.
6. Start ambulance movement.

### Local test note

If recommendations stop appearing, common causes are:

- No ambulance is available.
- Ambulance locations are stale.
- Maximum active emergencies was reached.
- Old simulation missions were not reset.

Recommended local recovery:

1. Stop the simulation.
2. Use **Reset Simulation Data**.
3. Confirm ambulances are operational and available.
4. Start a new run with a small maximum emergency count.
5. Enable **Auto-confirm Dispatch**.

---

## 14. Dispatch Lifecycle

The implemented lifecycle is:

```text
ASSIGNED
  → EN_ROUTE
  → ARRIVED
  → COMPLETED
```

When confirmed:

- A dispatch record is created.
- The ambulance becomes busy.
- The emergency becomes dispatched.
- Movement begins.

When completed:

- The dispatch becomes `COMPLETED`.
- The emergency becomes `RESOLVED`.
- The ambulance returns to `AVAILABLE`.

Lifecycle changes are persisted before live broadcast.

---

## 15. Ambulance Movement Engine

The simulation movement engine:

1. Finds active assigned or en-route missions.
2. Calculates the next route point.
3. Saves the route point in PostgreSQL.
4. Updates the ambulance current location.
5. Emits the point through Socket.IO.
6. Updates the map marker and polyline.
7. Detects arrival.
8. Completes the mission after a short delay.

Movement logs include counters such as:

```text
started
moved
arrived
completed
failed
```

---

## 16. Simulation Engine

The backend contains a persistent simulation engine for development and demonstrations.

### Occupancy generator

Generates realistic values for all facilities with:

- Initial occupancy range.
- Small normal changes.
- Temporary pressure scenarios.
- Bounds from zero to total beds.
- Increasing sequence numbers.
- Transactional persistence.
- Broadcast after commit.

### Emergency generator

Generates emergency cases according to the configured tick frequency and maximum active count.

### Dispatch automation

Can generate and auto-confirm the nearest eligible ambulance recommendation.

### Persistent runtime

Stores run state in PostgreSQL, including:

- Run ID.
- Tick count.
- Start time.
- Last tick.
- Settings.
- Interrupted-run status.

### Reset workflow

The reset removes simulation-generated emergencies, alerts, recommendations, dispatches, status events, and route points while preserving core facilities and ambulances.

The simulation must be stopped before reset.

---

## 17. Missed-Readings Recovery

Socket.IO connection-state recovery helps during short disconnections, but it is not sufficient after a long outage or backend restart.

The project therefore recovers missed readings from PostgreSQL.

### Endpoint

```text
POST /api/recovery/live-operations
```

The frontend sends the latest known sequence for every visible facility and ambulance.

The backend returns only newer events.

### Recovery process

```text
Reconnect
  → Build facility checkpoints
  → Build ambulance checkpoints
  → Fetch newer database events
  → Apply them in sequence order
  → Reject duplicates and stale events
  → Recover active dispatch routes
  → Resume live Socket.IO processing
```

The Zustand store tracks:

- Recovery status.
- Recovery errors.
- Recovered facility-event count.
- Recovered ambulance-event count.
- Last recovery time.

### Recovery test

1. Start the simulation.
2. Confirm dashboard status is `LIVE`.
3. Open Chrome Developer Tools.
4. Open **Network**.
5. Select **Offline**.
6. Wait while the backend continues generating data.
7. Return to **No throttling**.
8. Check Console for:

```text
Live readings recovery completed
```

9. Check Network for:

```text
POST /api/recovery/live-operations
```

with status `200`.

A result of zero events is valid when no database event is newer than the current checkpoint.

---

## 18. Historical Monitoring and Retention

The system retains operational telemetry for exactly:

```text
48 hours
```

Historical features include:

- Occupancy history.
- Operational snapshots.
- Emergency history.
- Dispatch history.
- Route history.
- Dispatch replay.
- Historical map layers.
- Occupancy charting.

The repository includes cleanup scripts and retention indexes. Production scheduling is still pending.

---

## 19. API Areas

The backend contains route groups for:

- Authentication.
- Dashboard.
- Governorate boundaries.
- Live monitoring.
- Emergencies.
- Alerts.
- Dispatch recommendations.
- Dispatches.
- Dispatch routes.
- History.
- Simulation.
- Recovery.

Important implemented endpoints include:

```text
POST /api/recovery/live-operations
POST /api/feed/dispatch-route-point
GET  /api/dispatches/:dispatchId/route
POST /api/simulation/reset
```

The complete route definitions are in:

```text
backend/src/routes/
```

---

## 20. Reliability and Data Integrity

The project applies several reliability rules.

### Commit before broadcast

Operational data is broadcast only after PostgreSQL commits successfully.

### Sequence numbers

Facility and ambulance readings use sequence numbers for:

- Ordering.
- Deduplication.
- Recovery checkpoints.
- Gap detection.

### Unique constraints

The database prevents duplicate event IDs and duplicate device/sequence combinations.

### Current-state tables

Current-state tables provide fast dashboard loading while event tables preserve history.

### Transactions

Critical workflows use transactions, including occupancy generation, dispatch creation, status transitions, and simulation reset.

### Reconnection and recovery

Socket.IO reconnects automatically, then the frontend performs database-backed recovery.

---

## 21. Security Measures

Current implementation includes:

- JWT authentication.
- HttpOnly cookies.
- Role-based access control.
- Authenticated Socket.IO handshake.
- Login rate limiting.
- Helmet headers.
- CORS configuration.
- Zod request validation.
- Environment-based secrets.
- Central error handling.
- `.env` files excluded from Git.

The committed environment template is:

```text
backend/.env.example
```

The real secret file remains local:

```text
backend/.env
```

---

## 22. Prerequisites

Install:

- Node.js.
- npm.
- PostgreSQL.
- PostGIS.
- Git.
- A modern browser.
- Optional: pgAdmin 4.
- Optional: Postman.

Development environment used:

```text
Node.js 24.x
npm 11.x
PostgreSQL 18
PostGIS 3.6.x
Socket.IO 4.8.x
pg 8.22.x
Zustand 5.x
```

A current Node.js LTS release is recommended for production.

---

## 23. Detailed Local Setup

## Step 1: Clone the repository

```powershell
git clone https://github.com/abdulaziz-bawabeh/medical-monitoring-system.git
cd medical-monitoring-system
```

Original development directory:

```text
D:\medical-monitoring-system
```

## Step 2: Create the database

In pgAdmin or `psql`:

```sql
CREATE DATABASE medical_monitoring_db;
```

Connect to the database and enable PostGIS:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

Verify:

```sql
SELECT PostGIS_Version();
```

## Step 3: Configure backend environment

```powershell
cd D:\medical-monitoring-system\backend
Copy-Item .env.example .env
```

Edit:

```text
backend/.env
```

Use `backend/.env.example` as the source of truth.

Main local values include:

```dotenv
DB_HOST=localhost
DB_PORT=5432
DB_NAME=medical_monitoring_db
DB_USER=postgres
DB_PASSWORD=YOUR_LOCAL_DATABASE_PASSWORD

FRONTEND_URL=http://localhost:5173
PORT=5000

JWT_SECRET=GENERATE_A_STRONG_RANDOM_SECRET
```

Do not commit `.env`.

Generate a secret:

```powershell
node src/scripts/generateJwtSecret.js
```

Copy the generated value into the backend `.env` file.

## Step 4: Install backend dependencies

```powershell
cd D:\medical-monitoring-system\backend
npm install
```

## Step 5: Test PostgreSQL and PostGIS

```powershell
node src/scripts/testDatabase.js
```

## Step 6: Run migrations

```powershell
node src/scripts/runMigrations.js
```

## Step 7: Import Syrian governorate boundaries

The repository contains simplified boundary data.

```powershell
node src/scripts/importSyriaGovernorateBoundaries.js
```

Expected result: 14 governorate boundaries with SRID 4326.

The source data can be recreated with:

```powershell
node src/scripts/downloadSyriaGovernorateBoundaries.js
```

## Step 8: Seed dashboard resources

```powershell
node src/scripts/seedDashboardData.js
```

Optional browser demonstration data:

```powershell
node src/scripts/seedBrowserDemoData.js
```

## Step 9: Create a health manager

```powershell
node src/scripts/createHealthManager.js
```

Do not place real credentials in Git or this README.

## Step 10: Start the backend

```powershell
cd D:\medical-monitoring-system\backend
npm run dev
```

Expected local origin:

```text
http://localhost:5000
```

Keep the terminal open.

## Step 11: Install frontend dependencies

Open a second terminal:

```powershell
cd D:\medical-monitoring-system\frontend
npm install
```

## Step 12: Configure frontend environment

Create a frontend `.env` only when required by the current Vite configuration.

Typical local API setting:

```dotenv
VITE_API_URL=http://localhost:5000
```

Do not commit the frontend `.env`.

## Step 13: Start the frontend

```powershell
cd D:\medical-monitoring-system\frontend
npm run dev
```

Open:

```text
http://localhost:5173
```

After authentication, the dashboard is available at:

```text
http://localhost:5173/dashboard
```

## Step 14: Log in

Use the local `health_manager` account created by the backend script.

After login, the dashboard should show a `LIVE` connection state.

---

## 24. Recommended Local Test Sequence

1. Start PostgreSQL.
2. Start the backend.
3. Start the frontend.
4. Log in as `health_manager`.
5. Confirm the dashboard shows `LIVE`.
6. Click **Refresh**.
7. Start the simulation.
8. Use these initial settings:

```text
Tick interval:         1000 ms
Occupancy every:       3 ticks
Emergency every:       5 ticks
Movement every:        1 tick
Maximum emergencies:  5
Auto-confirm dispatch: enabled
```

9. Verify occupancy changes.
10. Verify emergencies appear.
11. Verify recommendations or confirmed dispatches appear.
12. Verify ambulance movement and route polyline.
13. Verify arrival and completion.
14. Open historical monitoring.
15. Test temporary offline recovery.
16. Stop the simulation before reset or shutdown.

---

## 25. Simulation Reset

The simulation must be stopped before reset.

Use:

```text
Reset Simulation Data
```

The backend requires the exact confirmation value:

```text
RESET_SIMULATION_OPERATIONS
```

The reset preserves core facility and ambulance resources while removing simulation-generated operations.

---

## 26. History Cleanup

Cleanup scripts:

```text
backend/src/scripts/purgeHistoricalTelemetry.js
backend/src/scripts/cleanupLiveMonitoringHistory.js
```

Manual local run:

```powershell
node src/scripts/purgeHistoricalTelemetry.js
```

Production scheduling is still pending.

---

## 27. Production Build

### Frontend

```powershell
cd D:\medical-monitoring-system\frontend
npm run build
```

Output:

```text
frontend/dist/
```

The build directory is ignored by Git.

A large chunk warning may appear because the dashboard contains maps and many operational components. It is a warning, not necessarily a build failure.

### Backend

```powershell
cd D:\medical-monitoring-system\backend
npm start
```

Production environment variables must be configured on the hosting provider.

---

## 28. Common Problems

### `npm.ps1 cannot be loaded`

PowerShell may block npm scripts.

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Then reopen the terminal.

### Dashboard remains `CONNECTING`

Check:

1. Backend is running.
2. `FRONTEND_URL` is correct.
3. Browser is not in Offline mode.
4. Authentication cookie exists.
5. Socket.IO logs show an authenticated connection.
6. Port `5000` is available.

### `ERR_CONNECTION_REFUSED`

The backend is stopped or restarting.

```powershell
cd D:\medical-monitoring-system\backend
npm run dev
```

### Empty map

Check browser network, governorate import, dashboard snapshot response, and map container dimensions.

### No dispatch recommendation

Check:

- Simulation is running.
- Auto-confirm is enabled when expected.
- An active emergency exists.
- At least one ambulance is operational.
- An ambulance is `AVAILABLE`.
- Location data is recent.
- No active mission already uses the ambulance.
- Maximum emergency count was not reached.

Then stop and reset the simulation before starting a clean run.

### Recovery returns zero events

This is not an error.

```text
facilityEvents=0
ambulanceEvents=0
```

It means no database event was newer than the frontend checkpoint at that moment.

### Nested button warning

React may report:

```text
<button> cannot be a descendant of <button>
```

Each action in `SimulationControlPanel.jsx` must be a separate sibling button.

---

## 29. Important Backend Scripts

```text
backend/src/scripts/runMigrations.js
backend/src/scripts/testDatabase.js
backend/src/scripts/generateJwtSecret.js
backend/src/scripts/createHealthManager.js
backend/src/scripts/downloadSyriaGovernorateBoundaries.js
backend/src/scripts/importSyriaGovernorateBoundaries.js
backend/src/scripts/seedDashboardData.js
backend/src/scripts/seedBrowserDemoData.js
backend/src/scripts/cleanupLiveMonitoringHistory.js
backend/src/scripts/purgeHistoricalTelemetry.js
```

---

## 30. Current Implementation Status

### Completed locally

- [x] React + Vite frontend.
- [x] Node.js + Express backend.
- [x] PostgreSQL database.
- [x] PostGIS support.
- [x] Database connection pooling.
- [x] JWT HttpOnly-cookie authentication.
- [x] Protected routes.
- [x] `health_manager` role.
- [x] Authenticated Socket.IO connection.
- [x] Socket test page.
- [x] 14 Syrian governorate boundaries.
- [x] Medical facility resources.
- [x] Ambulance resources.
- [x] Facility occupancy events.
- [x] Current facility occupancy state.
- [x] GREEN/RED occupancy rules.
- [x] Live dashboard summary.
- [x] Interactive medical resource map.
- [x] Emergency cases.
- [x] Alerts.
- [x] Nearest-ambulance recommendation engine.
- [x] Recommendation confirmation and rejection.
- [x] Dispatch lifecycle.
- [x] Dispatch route storage.
- [x] Live ambulance movement.
- [x] Route polyline updates.
- [x] Automatic arrival and completion.
- [x] Emergency resolution.
- [x] Ambulance release after completion.
- [x] Simulation control panel.
- [x] Persistent simulation runtime.
- [x] Occupancy generator.
- [x] Emergency generator.
- [x] Automatic dispatch workflow.
- [x] Simulation reset.
- [x] Historical monitoring.
- [x] Historical dispatch replay.
- [x] 48-hour retention logic.
- [x] Recovery endpoint.
- [x] Facility sequence recovery.
- [x] Ambulance sequence recovery.
- [x] Dispatch route recovery.
- [x] Duplicate and stale event rejection.
- [x] Frontend production build.
- [x] Git repository initialized.
- [x] Secret files excluded from Git.

### Remaining production work

- [ ] Provision remote PostgreSQL with PostGIS.
- [ ] Run migrations on the production database.
- [ ] Import governorate boundaries in production.
- [ ] Seed production resources.
- [ ] Deploy backend to a WebSocket-capable runtime.
- [ ] Deploy frontend.
- [ ] Configure production API and Socket.IO URLs.
- [ ] Configure production CORS.
- [ ] Configure secure cookies.
- [ ] Configure HTTPS.
- [ ] Configure database SSL.
- [ ] Schedule 48-hour cleanup jobs.
- [ ] Test production Socket.IO reconnection.
- [ ] Test recovery after backend restart.
- [ ] Create final Postman collection.
- [ ] Complete production test checklist.
- [ ] Update this README with production URLs.
- [ ] Add final screenshots and diagrams.

---

## 31. Current Deployment State

```text
Frontend: http://localhost:5173
Backend:  http://localhost:5000
Database: local PostgreSQL/PostGIS
```

The current backend uses a persistent Express HTTP server and Socket.IO connection.

Production hosting must support the required persistent real-time connection or use a managed real-time architecture.

---

## 32. Git Workflow

After changes:

```powershell
cd D:\medical-monitoring-system

git status
git add .
git commit -m "Describe the completed change"
git push
```

Never force-add:

```text
.env
node_modules/
dist/
```

---

## 33. Planned README Updates

Before final submission, update:

- Production URLs.
- Hosting provider.
- Remote database configuration.
- Final test results.
- Screenshots.
- API documentation.
- Postman collection.
- Deployment instructions.
- Known limitations.
- Final architecture diagram.

---

## 34. Author

**Abd Ul Aziz Bawabeh**

GitHub username:

```text
abdulaziz-bawabeh
```

---

## 35. License

No license has been selected yet.

Until a license is added, the repository remains under the default copyright rules of its owner.
