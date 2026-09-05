# 🚍 Open Transit AI

### Intelligent Transit Simulation • GTFS • Real-Time Vehicle Simulation • Traffic AI • Dynamic Headway Control

**Open Transit AI** is an interactive transit operations and simulation platform designed around a realistic urban bus network.

The system combines **GTFS static transit data**, road-based route geometry, **synthetic real-time vehicle simulation**, traffic and incident modeling, dynamic headway control, passenger/occupancy simulation, and **GTFS-Realtime-style JSON export** into a single interactive map-based application.

The current demonstration is centered around **Delhi, India**, with support for loading custom GTFS datasets directly into the application.

> **The goal:** move beyond static route visualization and simulate how a transit network behaves as buses, passengers, traffic, delays, incidents, and operational decisions change over time.

---

## ✨ Features

* 🗺️ Interactive Delhi transit map
* 📥 Load custom GTFS static data
* 🚌 Synthetic bus fleet simulation
* ⏱️ Virtual transit clock with adjustable simulation speed
* 🚦 Traffic signal simulation
* 🚗 Time-dependent traffic intensity
* 📊 Delay prediction and comparison
* 🤖 Dynamic headway control
* 🚍 Bus bunching detection
* 📏 Large-gap detection between buses
* 🛑 Dynamic holding at major stops
* 👥 Passenger boarding/off-boarding simulation
* 🧍 Stop crowding model
* 📍 GPS location simulation
* 🚨 Accident, diversion, and road-block incidents
* 🔀 Automatic incident detours
* 🏥 Emergency / medical-aid workflow
* 🔧 Bus breakdown and recovery simulation
* 📡 Synthetic GTFS-RT JSON export
* 💾 Route caching with `localStorage`
* 📤 Route export/import
* 🧪 Automated browser-independent QA tests
* 🌐 Road and satellite map modes

---

# 🧠 System Overview

Open Transit AI models a transit network as a continuously changing operational environment.

The basic data flow is:

```text
                    ┌─────────────────────┐
                    │     GTFS STATIC     │
                    │                     │
                    │ stops.txt           │
                    │ stop_times.txt      │
                    │ routes.txt          │
                    │ trips.txt           │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   GTFS DATA MODEL   │
                    │                     │
                    │ Stops               │
                    │ Routes              │
                    │ Trips               │
                    │ Stop Times          │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   ROUTE BUILDER     │
                    │                     │
                    │ OSRM road routing   │
                    │ + offline fallback  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   TRANSIT NETWORK   │
                    └──────────┬──────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
             ▼                 ▼                 ▼
       ┌───────────┐     ┌────────────┐    ┌────────────┐
       │ Bus Fleet │     │   Traffic  │    │ Incidents  │
       │ Simulator │     │   Model    │    │ & Detours  │
       └─────┬─────┘     └──────┬─────┘    └──────┬─────┘
             │                  │                  │
             └──────────────────┼──────────────────┘
                                ▼
                    ┌─────────────────────┐
                    │    TRANSIT AI       │
                    │                     │
                    │ Headway Control     │
                    │ Delay Prediction    │
                    │ Occupancy Advice    │
                    │ Operational State   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ SYNTHETIC GTFS-RT   │
                    │       JSON          │
                    └─────────────────────┘
```

---

# 🗺️ Interactive Transit Map

The application uses **Leaflet** to render an interactive map centered on Delhi.

Two map styles are available:

* Road
* Satellite

The application displays different operational layers independently:

```text
Map
├── Transit Routes
├── Stops
├── Buses
├── Traffic Signals
├── Incidents
├── GPS Location
└── Emergency / Hospital Layer
```

The application refreshes its simulation state every **2 seconds** while allowing the virtual clock to run faster than real time.

---

# 📥 GTFS Static Data

The application can load a custom GTFS dataset through four files:

```text
stops.txt
stop_times.txt
routes.txt
trips.txt
```

These files are parsed directly in the browser.

## Required GTFS fields

### `stops.txt`

```text
stop_id
stop_lat
stop_lon
```

Optional fields such as:

```text
stop_code
stop_name
crowd_rating
```

can also be used.

### `stop_times.txt`

```text
trip_id
stop_id
stop_sequence
```

Arrival and departure times are also consumed when available.

### `routes.txt`

```text
route_id
```

Optional route metadata includes:

```text
route_short_name
route_long_name
route_color
route_text_color
```

### `trips.txt`

```text
trip_id
route_id
```

Optional trip information includes:

```text
trip_headsign
direction_id
```

---

# 🧩 GTFS Processing Pipeline

Once the files are loaded, the application:

1. Parses the CSV files.
2. Validates required columns.
3. Normalizes stops.
4. Builds route objects.
5. Builds trip objects.
6. Groups stop times by trip.
7. Sorts stops by `stop_sequence`.
8. Selects usable trip patterns.
9. Builds road-based route geometry.
10. Creates a simulation-ready transit network.

Conceptually:

```text
GTFS CSV
   │
   ▼
CSV Parser
   │
   ▼
Validation
   │
   ▼
Normalized Dataset
   │
   ├── Stops
   ├── Routes
   ├── Trips
   └── Stop Times
   │
   ▼
Representative Trip
   │
   ▼
Route Plan
```

---

# 🛣️ Route Building

The current routing layer uses **OSRM's driving router** to build road geometry between consecutive GTFS stops.

For each trip:

```text
STOP A → STOP B → STOP C → STOP D
```

the application creates individual route legs:

```text
STOP A ──────► STOP B
STOP B ──────► STOP C
STOP C ──────► STOP D
```

Each leg stores:

* Origin stop
* Destination stop
* Distance
* Duration
* Geometry
* Routing source

The shortest returned OSRM alternative is selected for each leg.

### Offline fallback

If the OSRM request fails or times out, the application generates a synthetic fallback path between the two stops.

This allows the simulation to continue even when external road routing is unavailable.

---

# 🚍 Synthetic Bus Simulation

The application creates a configurable fleet of synthetic buses.

The UI currently allows a fleet size between **2 and 24 buses**.

Each bus maintains state including:

```text
Bus
├── ID
├── Route
├── Trip
├── Route position
├── Speed
├── Target speed
├── Occupancy
├── Capacity
├── Status
├── Dwell state
├── Traffic wait
├── Detour state
├── Breakdown state
├── Completed trips
└── Control note
```

The default simulated bus capacity is:

```text
60 passengers
```

Buses are distributed across selected routes and initially positioned around the route to create a realistic operating fleet.

---

# ⏱️ Virtual Transit Clock

The simulator uses a virtual clock rather than relying exclusively on wall-clock time.

The initial demonstration begins at:

```text
08:00:00
```

The simulation speed can be changed through the UI.

For example:

```text
0x      Paused
1x      Real-time simulation
5x      Accelerated simulation
30x     Highly accelerated simulation
60x     Maximum configured simulation speed
```

This makes it possible to observe an entire operational period without waiting for real-world time to pass.

---

# 🤖 Transit AI

The current Transit AI is primarily an **operational control layer** implemented through deterministic simulation logic.

It continuously evaluates the state of the bus network and applies control decisions.

The major components are:

```text
                 Transit AI
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   Headway AI    Delay Model   Occupancy AI
        │            │            │
        ▼            ▼            ▼
 Dynamic Holds   ETA/Delay     Bus Advice
```

---

# 🚦 Dynamic Headway Control

One of the core operational features is dynamic headway control.

The system monitors the time gap between buses operating on the same route.

Two conditions are specifically modeled:

### Bus bunching

When two buses become too close:

```text
BUS A ── 40 sec ── BUS B
```

the controller can schedule a dynamic hold for the following bus at the next major stop.

```text
BUS A ───────────────►

BUS B ──► HOLD ─────────►
```

### Excessive gap

When the gap between buses becomes too large:

```text
BUS A ───────────────►

                 BUS B ─────────►
```

the controller can apply a hold strategy to improve service spacing.

The current implementation uses configurable thresholds for:

```text
Bunching threshold: 3 minutes
Large gap threshold: 9 minutes
```

The controller then converts the detected condition into a temporary holding instruction.

---

# 🛑 Dynamic Bus Holding

At major stops, buses can enter a:

```text
HOLDING
```

state.

A bus may therefore transition through:

```text
NORMAL
   │
   ▼
BUNCHING DETECTED
   │
   ▼
HOLD INTENT
   │
   ▼
MAJOR STOP
   │
   ▼
DYNAMIC HOLD
   │
   ▼
NORMAL SERVICE
```

This is designed to demonstrate how transit agencies can regulate service spacing without immediately changing the underlying timetable.

---

# 👥 Passenger & Occupancy Simulation

Passenger activity is simulated at stops.

Each stop receives a crowd rating between:

```text
1 ───────── 5
Low       High
```

The model uses crowd level to influence:

* Expected boarding
* Expected alighting
* Waiting passengers
* Dwell time
* Vehicle occupancy
* Stop-level service information

Bus capacity is modeled as:

```text
60 passengers
```

A vehicle approaching the capacity threshold can trigger an occupancy-based recommendation.

---

# 🧠 Occupancy-Aware Bus Recommendation

If the next arriving bus is heavily occupied and another bus is expected shortly afterward with available capacity, the system can recommend the later vehicle.

Conceptually:

```text
BUS 01
Occupancy: 97%
ETA: 2 min

BUS 02
Occupancy: 35%
ETA: 6 min

             ↓

AI Recommendation:
Consider BUS 02
```

This demonstrates how real-time occupancy information can become part of passenger-facing transit intelligence.

---

# 🚦 Traffic Simulation

Traffic intensity changes according to the virtual time of day.

The current model includes periods such as:

```text
Late Night
Early Morning Buildup
School & Office Buildup
Morning Rush
Midday Traffic
School Pickup
Evening Buildup
Evening Rush
Post-Rush
Late Evening
```

Traffic intensity influences simulated transit behavior including:

* Vehicle speed
* Traffic signal waiting
* Predicted delay
* Incident impact
* Passenger waiting generation
* Dwell-related effects

---

# 🚥 Traffic Signal Simulation

Traffic signals are generated along route geometry using stop/road naming heuristics.

Signals operate on a simulated cycle:

```text
RED
 ↓
YELLOW
 ↓
GREEN
 ↓
RED
```

Traffic intensity affects the simulated red duration.

Buses approaching a red signal can enter a traffic-wait state before continuing.

---

# 📊 Delay Prediction

The application provides a visual comparison between:

```text
Delay without AI
        vs.
Delay with AI
```

The model considers several contributors:

```text
Signal delay
+
Incident delay
+
Route distance delay
+
Crowding delay
+
Bus bunching
```

The resulting dashboard provides:

* Current traffic level
* Traffic intensity
* Active red signals
* Delay without AI
* Delay with AI
* Estimated delay savings

The application also renders a delay trend visualization across selected times of the day.

> The displayed "AI savings" are simulation-model outputs, not measurements from a real transit authority.

---

# 🚨 Incident Management

The application supports three incident types:

```text
Accident
Diversion
No available road / Blocked
```

Each incident has a configurable severity:

```text
1 ─ 2 ─ 3
Low → High
```

Incidents can be positioned directly from the map or by entering coordinates.

---

# 🔀 Automatic Detours

When an incident affects a route, the system can construct a bypass.

The detour pipeline is:

```text
Incident
   │
   ▼
Affected Route Segment
   │
   ▼
Detour Candidates
   │
   ▼
Road Routing
   │
   ▼
Clearance Evaluation
   │
   ▼
Selected Detour
   │
   ▼
Bus Diversion
   │
   ▼
Route Rejoin
```

The preferred detour uses road routing through OSRM.

If road routing cannot provide a suitable path, the application has a synthetic fallback detour.

---

# 🚫 Blocked Route Behavior

A blocked incident can cause affected stops to be marked as:

```text
NO SERVICE
```

This allows the simulation to represent the operational consequences of a road closure rather than merely displaying an incident marker.

---

# 🔧 Bus Breakdown & Recovery

Individual buses can be placed into a simulated breakdown state.

A broken bus:

```text
Status: BREAKDOWN
Speed: 0
```

The simulation also changes the operational behavior of nearby buses to help compensate for the lost service.

Recovery controls include:

```text
Recover selected bus
Recover all buses
```

This provides a controlled way to test fleet disruption scenarios.

---

# 📍 GPS Simulation

Users can specify a simulated location using:

```text
Latitude
Longitude
```

or select a point directly on the map.

The system then identifies:

* Nearest transit stop
* Distance to the stop
* Next approaching bus
* ETA
* Bus occupancy
* Final destination
* Recommended bus when applicable

Example:

```text
Your location
     │
     ▼
Nearest Stop
     │
     ▼
Next Bus
     │
     ▼
ETA + Occupancy
     │
     ▼
AI Recommendation
```

---

# 🏥 Emergency & Medical Aid

The application includes an experimental emergency-response workflow.

An emergency can originate from:

```text
Selected Bus
GPS Location
Latest Incident
```

The system identifies the nearest hospital from a predefined Delhi hospital dataset and displays an emergency route on the map.

The emergency workflow generates an operational message containing:

* Source
* Hospital
* Distance
* Virtual time
* Emergency notification
* Traffic-corridor instruction

This feature is intended as a **simulation of transit emergency coordination**, not a real emergency-response service.

---

# 📡 Synthetic GTFS-Realtime Export

The application can export the current simulation state as a GTFS-RT-style JSON snapshot.

The exported structure contains:

```text
header
entity[]
traffic
```

Each vehicle entity can include:

```text
Trip ID
Route ID
Vehicle ID
Vehicle Label
Latitude
Longitude
Speed
Occupancy Status
Current Stop Sequence
Current Status
Timestamp
```

Additional simulation metadata is also exported:

```text
Speed
Status
Breakdown
Occupancy
Capacity
Route Distance
ETA to Next Stop
Dwell Time
Traffic Wait
Detour Remaining
ETA to Final Stop
Control Note
```

This makes the simulated vehicle state available for downstream experimentation.

---

# 🧾 Example Synthetic GTFS-RT Entity

```json
{
  "id": "DL-01-BUS-01",
  "vehicle": {
    "trip": {
      "trip_id": "DLI-01-0800",
      "route_id": "DLI-01",
      "start_time": "08:15:00"
    },
    "vehicle": {
      "id": "DL-01-BUS-01",
      "label": "DL-01-BUS-01"
    },
    "position": {
      "latitude": 28.627528,
      "longitude": 77.240317,
      "speed": 8.21
    },
    "occupancy_status": "MANY_SEATS_AVAILABLE",
    "current_stop_sequence": 4,
    "current_status": "IN_TRANSIT_TO"
  }
}
```

> The current exporter produces a JSON representation inspired by GTFS-Realtime vehicle data; it is not currently a binary GTFS-RT protobuf feed.

---

# 🏙️ Demo Network

The built-in demonstration contains two Delhi bus routes.

### DL-01

```text
Kashmere Gate ISBT
        ↓
Red Fort
        ↓
Delhi Gate
        ↓
ITO Crossing
        ↓
Pragati Maidan
        ↓
India Gate
        ↓
Khan Market
        ↓
Lodhi Garden
        ↓
AIIMS
```

### DL-02

```text
Anand Vihar ISBT
        ↓
Preet Vihar
        ↓
Nirman Vihar
        ↓
Laxmi Nagar
        ↓
ITO Crossing
        ↓
Mandi House
        ↓
Connaught Place
        ↓
Patel Chowk
        ↓
Dhaula Kuan
```

The demonstration data includes multiple trips on each route to provide a basic operating timetable for the simulation.

---

# 🏗️ Architecture

```text
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                         │
│                                                     │
│ HTML + CSS + JavaScript + Leaflet                   │
└─────────────────────────┬───────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│                  DATA INGESTION                      │
│                                                     │
│ Papa Parse → GTFS CSV → Normalized Transit Dataset │
└─────────────────────────┬───────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│                  ROUTE ENGINE                       │
│                                                     │
│ GTFS Stop Pattern                                   │
│        ↓                                            │
│ OSRM Road Routing                                   │
│        ↓                                            │
│ Synthetic Fallback                                  │
└─────────────────────────┬───────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│                SIMULATION ENGINE                    │
│                                                     │
│ Virtual Clock                                       │
│ Bus Movement                                        │
│ Passenger Flow                                      │
│ Vehicle Occupancy                                   │
│ Traffic Signals                                     │
│ Incidents                                           │
│ Detours                                             │
│ Breakdowns                                          │
└─────────────────────────┬───────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│                 TRANSIT AI                          │
│                                                     │
│ Headway Control                                     │
│ Bunching Detection                                   │
│ Gap Detection                                        │
│ Dynamic Holding                                     │
│ Delay Modeling                                      │
│ Occupancy Recommendations                            │
└─────────────────────────┬───────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│                 OUTPUTS                             │
│                                                     │
│ Live Map                                             │
│ Vehicle States                                       │
│ Stop ETAs                                            │
│ Delay Analytics                                      │
│ Route JSON                                           │
│ Synthetic GTFS-RT JSON                              │
└─────────────────────────────────────────────────────┘
```

---

# 🛠️ Technology Stack

| Component            | Technology                |
| -------------------- | ------------------------- |
| Frontend             | HTML5 / CSS3 / JavaScript |
| Mapping              | Leaflet                   |
| CSV Parsing          | Papa Parse                |
| Road Routing         | OSRM                      |
| Map Tiles            | OpenStreetMap / Esri      |
| Local Server         | Python `http.server`      |
| Automated QA         | Node.js                   |
| Transit Data         | GTFS                      |
| Real-Time Simulation | Synthetic vehicle state   |
| Storage              | Browser `localStorage`    |

---

# 📁 Project Structure

```text
Transit-AI/
│
├── index.html
│       Main application interface
│
├── styles.css
│       Application styling and UI
│
├── app.js
│       Main transit simulation and AI logic
│
├── server.py
│       Local development HTTP server
│
├── dev-server.mjs
│       Development server helper
│
├── smoke.mjs
│       Smoke-test utilities
│
├── transit-qa.mjs
│       Automated transit QA suite
│
├── README.md
│       Project documentation
│
└── dev-server.*.log
        Local development logs
```

---

# 🚀 Running the Project

The project is a browser-based application and does not currently require a build framework.

## Option 1 — Python server

From the project directory:

```bash
python server.py
```

The local server uses port:

```text
5173
```

Then open:

```text
http://127.0.0.1:5173
```

The server can also be configured using:

```text
TRANSIT_APP_ROOT
TRANSIT_APP_JS
TRANSIT_APP_PORT
```

---

## Option 2 — Any Static HTTP Server

Because the application is primarily a client-side HTML/CSS/JavaScript application, it can also be served using another local static HTTP server.

For example:

```bash
python -m http.server 5173
```

Then visit:

```text
http://localhost:5173
```

---

# 📥 Loading Your Own GTFS Dataset

1. Open the application.
2. Go to **GTFS Static**.
3. Select:

```text
stops.txt
stop_times.txt
routes.txt
trips.txt
```

4. Click:

```text
Load GTFS files
```

5. Select one or more routes.
6. Click:

```text
Build
```

The application will parse the files and construct route geometry.

---

# 💾 Route Import / Export

Built route plans can be exported as JSON.

Example structure:

```json
{
  "version": 2,
  "routePlans": [],
  "incidents": [],
  "exportedAt": "2026-01-01T00:00:00.000Z"
}
```

Previously exported route plans can be imported back into the application.

Route and leg information is also cached locally in the browser to avoid repeatedly requesting the same road geometry.

---

# 🧪 Testing

The repository includes an automated QA suite:

```text
transit-qa.mjs
```

The tests exercise major application behaviors including:

* Demo GTFS loading
* Route construction
* Route import/export
* GTFS loading
* Simulation ticks
* Bus state updates
* Synthetic GTFS-RT export
* Incident handling
* Dynamic holding
* Occupancy-based recommendations
* Breakdown/recovery behavior

Run the QA suite with:

```bash
node transit-qa.mjs
```

A successful run reports the number of passed and failed checks in JSON format.

---

# 📈 Simulation Model

The simulator intentionally uses deterministic and pseudo-random components to create repeatable operational behavior.

Some of the modeled variables include:

```text
Vehicle speed
Traffic intensity
Traffic signals
Passenger demand
Crowding
Dwell time
Vehicle occupancy
Bus spacing
Incidents
Road closures
Detours
Breakdowns
```

The simulation is therefore useful for experimenting with transit-control strategies without requiring access to a live transit agency feed.

---

# ⚠️ Current Limitations

This project is currently an experimental simulation platform.

### Routing

The current route geometry is generated using OSRM rather than a transit-graph shortest-path implementation.

**Bidirectional Dijkstra is not yet part of the current routing engine.**

### GTFS-Realtime

The application currently exports a **GTFS-RT-style JSON representation** rather than a protobuf-encoded GTFS-Realtime feed.

### AI

The current "AI" control layer is primarily deterministic simulation logic and heuristics.

It does not currently use a trained machine-learning model or LLM to make scheduling decisions.

### Traffic

Traffic conditions are simulated using predefined time-of-day intensity windows rather than live traffic data.

### Passenger Demand

Passenger demand and crowding are simulated rather than derived from live ridership data.

### Emergency Response

The medical-aid system is a simulation feature and should not be treated as a real emergency-dispatch system.

---

# 🔬 Research Direction

The project is designed to evolve toward a more advanced intelligent transit architecture.

A future routing pipeline could become:

```text
GTFS
 │
 ▼
Transit Graph
 │
 ▼
Time-Dependent Edge Weights
 │
 ▼
Bidirectional Dijkstra
 │
 ├── Travel Time
 ├── Waiting Time
 ├── Transfers
 └── Real-Time Delays
 │
 ▼
Dynamic Route
```

The long-term objective is to combine static transit topology with continuously changing operational conditions.

---

# 🧭 Roadmap

## Routing Engine

* [ ] Implement transit-network graph routing
* [ ] Implement Bidirectional Dijkstra
* [ ] Add time-dependent routing
* [ ] Add transfer penalties
* [ ] Add delay-aware edge weights
* [ ] Add multi-criteria routing
* [ ] Compare OSRM vs transit-graph routing
* [ ] Add routing benchmarks

## GTFS

* [ ] Support additional GTFS files
* [ ] `calendar.txt`
* [ ] `calendar_dates.txt`
* [ ] `shapes.txt`
* [ ] `frequencies.txt`
* [ ] More complete GTFS validation

## GTFS-Realtime

* [ ] Generate official GTFS-RT protobuf
* [ ] Vehicle Positions
* [ ] Trip Updates
* [ ] Service Alerts
* [ ] Real-time feed streaming
* [ ] WebSocket-based updates

## Transit AI

* [ ] Predictive delay model
* [ ] Demand prediction
* [ ] Dynamic dispatch
* [ ] Fleet reallocation
* [ ] Adaptive scheduling
* [ ] Multi-route headway optimization
* [ ] Reinforcement-learning experiments
* [ ] AI-assisted disruption recovery

## Infrastructure

* [ ] Backend API
* [ ] Persistent database
* [ ] Real-time WebSocket service
* [ ] Transit operations dashboard
* [ ] Performance monitoring
* [ ] Distributed simulation

---

# 📊 Future AI Architecture

The intended long-term architecture is:

```text
                  GTFS
                   │
                   ▼
            Transit Graph
                   │
                   ▼
        Bidirectional Dijkstra
                   │
                   ▼
             Route Engine
                   │
                   │
       ┌───────────┴───────────┐
       │                       │
       ▼                       ▼
 Synthetic GTFS-RT       Passenger Data
       │                       │
       └───────────┬───────────┘
                   ▼
             Transit AI
                   │
       ┌───────────┼───────────┐
       ▼           ▼           ▼
    Routing    Scheduling   Dispatch
       │           │           │
       └───────────┼───────────┘
                   ▼
            Transit Network
                   │
                   ▼
            Updated State
                   │
                   └──────────► GTFS-RT
```

This would allow routing and operations to become **time-aware and state-aware**, rather than treating the transit network as static.

---

# 🎯 Project Vision

Most route planners answer:

> **"What is the best route from A to B?"**

Open Transit AI aims to answer a broader question:

> **"What is happening across the transit network, and what should the system do about it?"**

That means combining:

```text
Static Transit Data
        +
Real-Time Vehicle State
        +
Traffic
        +
Passenger Demand
        +
Incidents
        +
Routing Algorithms
        +
Operational Control
        ↓
Intelligent Transit Network
```

The ultimate objective is a system capable of continuously adapting transit operations to the current state of the network.

---

# 🤝 Contributing

Contributions, ideas, algorithm improvements, and simulation scenarios are welcome.

Potential contribution areas include:

* Routing algorithms
* GTFS processing
* GTFS-RT generation
* Scheduling algorithms
* Transit optimization
* Simulation models
* Visualization
* Performance improvements
* Testing

If you are adding a new algorithm or operational strategy, please include tests and, where possible, benchmark results.

---

# 📜 License

License information will be added as the project license is finalized.

---

# 🚧 Project Status

**Experimental / Active Development**

Open Transit AI is currently a research and experimentation platform for intelligent transit operations.

The current implementation combines:

```text
GTFS
+
OSRM Routing
+
Synthetic Bus Simulation
+
Traffic Simulation
+
Dynamic Headway Control
+
Incident Management
+
Occupancy Modeling
+
Synthetic GTFS-RT
```

with a roadmap toward:

```text
Transit Graph
+
Bidirectional Dijkstra
+
Time-Dependent Routing
+
Predictive AI
+
Dynamic Scheduling
+
Real-Time GTFS-RT
```

---

## ⭐ Built to Explore the Future of Transit

**Open Transit AI** is not just a map with moving buses.

It is an experimental environment for studying how a transit system can:

**observe → predict → decide → adapt**

in response to changing network conditions.
