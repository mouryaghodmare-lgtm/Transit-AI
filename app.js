const CRUISE_SPEED_KMPH = 30;
const TOP_SPEED_KMPH = 34;
const BOOST_SPEED_KMPH = 36;
const DETOUR_SPEED_KMPH = 24;
const UPDATE_MS = 2000;
const DELHI_CENTER = [28.6139, 77.2090];
const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving/";
const ROUTE_CACHE_PREFIX = "open-transit-ai-route-v2:";
const LEG_CACHE_PREFIX = "open-transit-ai-leg-v2:";
const DETOUR_CACHE_PREFIX = "open-transit-ai-detour-v1:";
const BUNCH_THRESHOLD_SEC = 3 * 60;
const GAP_THRESHOLD_SEC = 9 * 60;
const ARRIVAL_MARGIN_M = 20;
const DWELL_STOP_MARGIN_M = 24;
const LOW_DWELL_SEC = 10;
const NORMAL_DWELL_SEC = 25;
const STAR_DWELL_MIN_SEC = 40;
const STAR_DWELL_MAX_SEC = 50;
const BUS_CAPACITY = 60;
const FULL_BUS_THRESHOLD = 0.95;
const SIGNAL_CYCLE_SEC = 90;
const INCIDENT_IMPACT_M = 720;
const INCIDENT_LOOKAHEAD_M = 460;
const DETOUR_REJOIN_M = 620;
const DETOUR_HOLD_BASE_SEC = 18;

const TRAFFIC_WINDOWS = [
  { start: 0, end: 5 * 3600, label: "Late night light traffic", intensity: 0.18 },
  { start: 5 * 3600, end: 7 * 3600, label: "Early morning buildup", intensity: 0.32 },
  { start: 7 * 3600, end: 9 * 3600, label: "School and office buildup", intensity: 0.62 },
  { start: 9 * 3600, end: 11 * 3600, label: "Morning rush", intensity: 1 },
  { start: 11 * 3600, end: 15 * 3600, label: "Midday traffic", intensity: 0.42 },
  { start: 15 * 3600, end: 17 * 3600, label: "School pickup traffic", intensity: 0.58 },
  { start: 17 * 3600, end: 18 * 3600, label: "Evening buildup", intensity: 0.72 },
  { start: 18 * 3600, end: 20 * 3600, label: "Evening rush", intensity: 0.96 },
  { start: 20 * 3600, end: 22 * 3600, label: "Post-rush traffic", intensity: 0.48 },
  { start: 22 * 3600, end: 24 * 3600, label: "Late evening light traffic", intensity: 0.24 }
];

const HOSPITALS = [
  { name: "AIIMS Trauma Centre", lat: 28.5672, lon: 77.2100 },
  { name: "Lok Nayak Hospital", lat: 28.6387, lon: 77.2372 },
  { name: "G B Pant Hospital", lat: 28.6384, lon: 77.2342 },
  { name: "Maulana Azad Medical College Hospital Emergency", lat: 28.6389, lon: 77.2386 },
  { name: "Ram Manohar Lohia Hospital", lat: 28.6254, lon: 77.2008 },
  { name: "Safdarjung Hospital", lat: 28.5687, lon: 77.2044 },
  { name: "Primus Super Speciality Hospital", lat: 28.5956, lon: 77.1809 },
  { name: "Dharamshila Narayana Superspeciality Hospital", lat: 28.6340, lon: 77.3144 },
  { name: "Max Super Speciality Patparganj", lat: 28.6325, lon: 77.3091 }
];

const SIGNAL_NAME_RE = /\b(ito|crossing|chowk|gate|mandi|market|place|laxmi|preet|pragati|patel|connaught)\b/i;
const SIGNAL_EXCLUDE_RE = /\b(ring road|circle|roundabout|rotary)\b/i;

const demoFeed = {
  stops: `stop_id,stop_code,stop_name,stop_lat,stop_lon,location_type
KGATE,KGATE,Kashmere Gate ISBT,28.667856,77.227306,0
REDFORT,REDFORT,Red Fort,28.656159,77.241020,0
DELGATE,DELGATE,Delhi Gate,28.640470,77.240080,0
ITO,ITO,ITO Crossing,28.627528,77.240317,0
PRAGATI,PRAGATI,Pragati Maidan,28.615887,77.245536,0
INDIAGATE,INDIAGATE,India Gate,28.612912,77.229510,0
KHAN,KHAN,Khan Market,28.600800,77.227200,0
LODHI,LODHI,Lodhi Garden,28.593300,77.219700,0
AIIMS,AIIMS,AIIMS,28.567200,77.210000,0
ANAND,ANAND,Anand Vihar ISBT,28.646900,77.316000,0
PREET,PREET,Preet Vihar,28.637900,77.295100,0
NIRMAN,NIRMAN,Nirman Vihar,28.637500,77.286000,0
LAXMI,LAXMI,Laxmi Nagar,28.630600,77.277000,0
MANDI,MANDI,Mandi House,28.625700,77.234000,0
CP,CP,Connaught Place,28.631500,77.216700,0
PATEL,PATEL,Patel Chowk,28.623700,77.210600,0
DHAULA,DHAULA,Dhaula Kuan,28.592100,77.160600,0`,
  routes: `route_id,agency_id,route_short_name,route_long_name,route_type,route_color,route_text_color
DLI-01,OTAI,DL-01,Kashmere Gate - AIIMS via India Gate,3,0F5FBA,FFFFFF
DLI-02,OTAI,DL-02,Anand Vihar - Dhaula Kuan via ITO,3,138A55,FFFFFF`,
  trips: `route_id,service_id,trip_id,trip_headsign,direction_id
DLI-01,WKD,DLI-01-0800,AIIMS,0
DLI-01,WKD,DLI-01-0810,AIIMS,0
DLI-01,WKD,DLI-01-0820,AIIMS,0
DLI-02,WKD,DLI-02-0805,Dhaula Kuan,0
DLI-02,WKD,DLI-02-0815,Dhaula Kuan,0
DLI-02,WKD,DLI-02-0825,Dhaula Kuan,0`,
  stopTimes: `trip_id,arrival_time,departure_time,stop_id,stop_sequence
DLI-01-0800,08:00:00,08:00:20,KGATE,1
DLI-01-0800,08:04:00,08:04:20,REDFORT,2
DLI-01-0800,08:09:00,08:09:20,DELGATE,3
DLI-01-0800,08:14:00,08:14:20,ITO,4
DLI-01-0800,08:19:00,08:19:20,PRAGATI,5
DLI-01-0800,08:24:00,08:24:20,INDIAGATE,6
DLI-01-0800,08:30:00,08:30:20,KHAN,7
DLI-01-0800,08:35:00,08:35:20,LODHI,8
DLI-01-0800,08:43:00,08:43:00,AIIMS,9
DLI-01-0810,08:10:00,08:10:20,KGATE,1
DLI-01-0810,08:14:00,08:14:20,REDFORT,2
DLI-01-0810,08:19:00,08:19:20,DELGATE,3
DLI-01-0810,08:24:00,08:24:20,ITO,4
DLI-01-0810,08:29:00,08:29:20,PRAGATI,5
DLI-01-0810,08:34:00,08:34:20,INDIAGATE,6
DLI-01-0810,08:40:00,08:40:20,KHAN,7
DLI-01-0810,08:45:00,08:45:20,LODHI,8
DLI-01-0810,08:53:00,08:53:00,AIIMS,9
DLI-01-0820,08:20:00,08:20:20,KGATE,1
DLI-01-0820,08:24:00,08:24:20,REDFORT,2
DLI-01-0820,08:29:00,08:29:20,DELGATE,3
DLI-01-0820,08:34:00,08:34:20,ITO,4
DLI-01-0820,08:39:00,08:39:20,PRAGATI,5
DLI-01-0820,08:44:00,08:44:20,INDIAGATE,6
DLI-01-0820,08:50:00,08:50:20,KHAN,7
DLI-01-0820,08:55:00,08:55:20,LODHI,8
DLI-01-0820,09:03:00,09:03:00,AIIMS,9
DLI-02-0805,08:05:00,08:05:20,ANAND,1
DLI-02-0805,08:10:00,08:10:20,PREET,2
DLI-02-0805,08:14:00,08:14:20,NIRMAN,3
DLI-02-0805,08:18:00,08:18:20,LAXMI,4
DLI-02-0805,08:25:00,08:25:20,ITO,5
DLI-02-0805,08:30:00,08:30:20,MANDI,6
DLI-02-0805,08:36:00,08:36:20,CP,7
DLI-02-0805,08:41:00,08:41:20,PATEL,8
DLI-02-0805,08:54:00,08:54:00,DHAULA,9
DLI-02-0815,08:15:00,08:15:20,ANAND,1
DLI-02-0815,08:20:00,08:20:20,PREET,2
DLI-02-0815,08:24:00,08:24:20,NIRMAN,3
DLI-02-0815,08:28:00,08:28:20,LAXMI,4
DLI-02-0815,08:35:00,08:35:20,ITO,5
DLI-02-0815,08:40:00,08:40:20,MANDI,6
DLI-02-0815,08:46:00,08:46:20,CP,7
DLI-02-0815,08:51:00,08:51:20,PATEL,8
DLI-02-0815,09:04:00,09:04:00,DHAULA,9
DLI-02-0825,08:25:00,08:25:20,ANAND,1
DLI-02-0825,08:30:00,08:30:20,PREET,2
DLI-02-0825,08:34:00,08:34:20,NIRMAN,3
DLI-02-0825,08:38:00,08:38:20,LAXMI,4
DLI-02-0825,08:45:00,08:45:20,ITO,5
DLI-02-0825,08:50:00,08:50:20,MANDI,6
DLI-02-0825,08:56:00,08:56:20,CP,7
DLI-02-0825,09:01:00,09:01:20,PATEL,8
DLI-02-0825,09:14:00,09:14:00,DHAULA,9`
};

const state = {
  dataset: null,
  selectedRouteIds: [],
  selectedRouteId: null,
  selectedTripId: null,
  routePlans: [],
  routePlan: null,
  routeBuildToken: 0,
  routeLayers: [],
  routeLayer: null,
  buses: [],
  busMarkers: new Map(),
  stopMarkers: new Map(),
  signalMarkers: new Map(),
  incidentMarkers: new Map(),
  trafficSignals: [],
  incidents: [],
  emergencyLog: [],
  userLocation: null,
  gpsMarker: null,
  mapPickMode: null,
  running: true,
  timeScale: 1,
  virtualTimeSec: 8 * 3600,
  lastTickMs: performance.now(),
  map: null,
  baseLayers: {},
  routeLayerGroup: null,
  stopLayer: null,
  busLayer: null,
  trafficLayer: null,
  incidentLayer: null,
  gpsLayer: null,
  emergencyLayer: null,
  stopArrivals: new Map()
};

const ui = {};

document.addEventListener("DOMContentLoaded", () => {
  bindUi();
  initMap();
  wireEvents();
  loadDemoDataset();
  startLoop();
});

function bindUi() {
  [
    "map-style",
    "load-demo",
    "load-files",
    "file-stops",
    "file-stop-times",
    "file-routes",
    "file-trips",
    "route-select",
    "build-route",
    "export-route",
    "import-route",
    "toggle-sim",
    "time-input",
    "set-time",
    "time-scale",
    "scale-readout",
    "bus-count",
    "reset-buses",
    "gps-lat",
    "gps-lon",
    "set-gps",
    "gps-pick-map",
    "gps-status",
    "incident-type",
    "incident-lat",
    "incident-lon",
    "incident-severity",
    "add-incident",
    "incident-pick-map",
    "clear-incidents",
    "incident-status",
    "emergency-source",
    "send-emergency",
    "emergency-status",
    "delay-graph",
    "traffic-summary",
    "bus-select",
    "break-bus",
    "recover-bus",
    "recover-all",
    "download-rt",
    "feed-status",
    "route-status",
    "control-status",
    "route-summary",
    "bus-list",
    "stop-eta-list",
    "clock-display",
    "live-pill"
  ].forEach((id) => {
    ui[toCamel(id)] = document.getElementById(id);
  });
}

function toCamel(id) {
  return id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function on(name, event, handler) {
  if (ui[name]) {
    ui[name].addEventListener(event, handler);
  }
}

function initMap() {
  state.map = L.map("map", {
    center: DELHI_CENTER,
    zoom: 12,
    zoomControl: false
  });

  L.control.zoom({ position: "bottomright" }).addTo(state.map);

  state.baseLayers.road = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  });

  state.baseLayers.satellite = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      maxZoom: 19,
      attribution: "Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community"
    }
  );

  state.baseLayers.road.addTo(state.map);
  state.routeLayerGroup = L.layerGroup().addTo(state.map);
  state.stopLayer = L.layerGroup().addTo(state.map);
  state.trafficLayer = L.layerGroup().addTo(state.map);
  state.incidentLayer = L.layerGroup().addTo(state.map);
  state.busLayer = L.layerGroup().addTo(state.map);
  state.gpsLayer = L.layerGroup().addTo(state.map);
  state.emergencyLayer = L.layerGroup().addTo(state.map);
  state.map.on("click", handleMapClick);
}

function wireEvents() {
  on("mapStyle", "change", () => setBaseLayer(ui.mapStyle.value));
  on("loadDemo", "click", loadDemoDataset);
  on("loadFiles", "click", loadFilesDataset);
  on("routeSelect", "change", () => selectRoutes(selectedRouteIdsFromUi()));
  on("buildRoute", "click", () => buildSelectedRoute());
  on("exportRoute", "click", exportCurrentRoute);
  on("importRoute", "change", importRouteFile);
  on("toggleSim", "click", toggleSimulation);
  on("setTime", "click", setManualTime);
  on("timeScale", "input", () => {
    state.timeScale = Number(ui.timeScale.value);
    ui.scaleReadout.textContent = `${state.timeScale.toFixed(state.timeScale % 1 ? 2 : 1)}x`;
  });
  on("resetBuses", "click", resetBusesFromUi);
  on("setGps", "click", setGpsFromInputs);
  on("gpsPickMap", "click", () => enableMapPick("gps"));
  on("incidentPickMap", "click", () => enableMapPick("incident"));
  on("addIncident", "click", addIncidentFromInputs);
  on("clearIncidents", "click", clearIncidents);
  on("sendEmergency", "click", sendEmergencyAid);
  on("breakBus", "click", () => setBreakdown(true));
  on("recoverBus", "click", () => setBreakdown(false));
  on("recoverAll", "click", recoverAllBuses);
  on("downloadRt", "click", downloadGtfsRtSnapshot);
}

function setBaseLayer(style) {
  Object.values(state.baseLayers).forEach((layer) => state.map.removeLayer(layer));
  state.baseLayers[style].addTo(state.map);
}

function setStatus(text, type = "ok") {
  if (!ui.livePill) {
    return;
  }
  ui.livePill.textContent = text;
  ui.livePill.classList.toggle("warn", type === "warn");
  ui.livePill.classList.toggle("error", type === "error");
}

function loadDemoDataset() {
  const tables = {
    stops: parseCsv(demoFeed.stops),
    stopTimes: parseCsv(demoFeed.stopTimes),
    routes: parseCsv(demoFeed.routes),
    trips: parseCsv(demoFeed.trips)
  };
  state.dataset = buildDataset(tables);
  ui.feedStatus.textContent = `Loaded demo feed with ${state.dataset.routes.length} routes and ${state.dataset.stops.length} stops.`;
  setStatus("Demo loaded");
  populateRouteSelect(true);
  clearRoute();
  buildSelectedRoute();
}

async function loadFilesDataset() {
  try {
    setStatus("Loading GTFS...", "warn");
    ui.feedStatus.textContent = "Reading GTFS files...";
    ui.routeStatus.textContent = "Waiting for GTFS files.";
    const [stopsText, stopTimesText, routesText, tripsText] = await Promise.all([
      readRequiredFile(ui.fileStops.files[0], "stop.txt or stops.txt"),
      readRequiredFile(ui.fileStopTimes.files[0], "stop_times.txt"),
      readRequiredFile(ui.fileRoutes.files[0], "routes.txt"),
      readRequiredFile(ui.fileTrips.files[0], "trips.txt")
    ]);
    state.dataset = buildDataset({
      stops: parseCsv(stopsText),
      stopTimes: parseCsv(stopTimesText),
      routes: parseCsv(routesText),
      trips: parseCsv(tripsText)
    });
    ui.feedStatus.textContent = `Loaded ${state.dataset.routes.length} routes, ${state.dataset.trips.length} trips, and ${state.dataset.stops.length} stops.`;
    setStatus("GTFS loaded");
    populateRouteSelect(false);
    clearRoute();
    await buildSelectedRoute();
  } catch (error) {
    ui.feedStatus.textContent = error.message;
    setStatus("GTFS error", "error");
  }
}

function readRequiredFile(file, label) {
  if (!file) {
    return Promise.reject(new Error(`Choose ${label} before loading the feed.`));
  }
  return file.text();
}

function parseCsv(text) {
  const parsed = Papa.parse(text.replace(/^\uFEFF/, ""), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
    transform: (value) => (typeof value === "string" ? value.trim() : value)
  });

  if (parsed.errors.length) {
    const first = parsed.errors[0];
    throw new Error(`CSV parse error near row ${first.row || "?"}: ${first.message}`);
  }

  return parsed.data.filter((row) => Object.values(row).some((value) => value !== ""));
}

function buildDataset({ stops, stopTimes, routes, trips }) {
  assertColumns(stops, ["stop_id", "stop_lat", "stop_lon"], "stops");
  assertColumns(stopTimes, ["trip_id", "stop_id", "stop_sequence"], "stop_times");
  assertColumns(routes, ["route_id"], "routes");
  assertColumns(trips, ["trip_id", "route_id"], "trips");

  const normalizedStops = stops
    .map((stop) => ({
      id: stop.stop_id,
      code: stop.stop_code || stop.stop_id,
      name: stop.stop_name || stop.stop_id,
      lat: Number(stop.stop_lat),
      lon: Number(stop.stop_lon),
      crowd: clamp(Number(stop.crowd_rating) || seededRating(stop.stop_id), 1, 5),
      waitingPassengers: seededRating(stop.stop_id) * 3
    }))
    .filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lon));

  const stopsById = new Map(normalizedStops.map((stop) => [stop.id, stop]));
  const normalizedRoutes = routes.map((route) => ({
    id: route.route_id,
    shortName: route.route_short_name || route.route_id,
    longName: route.route_long_name || "",
    color: normalizeColor(route.route_color, "#0f5fba"),
    textColor: normalizeColor(route.route_text_color, "#ffffff")
  }));

  const normalizedTrips = trips.map((trip) => ({
    id: trip.trip_id,
    routeId: trip.route_id,
    headsign: trip.trip_headsign || "",
    directionId: trip.direction_id || ""
  }));

  const stopTimesByTrip = new Map();
  stopTimes.forEach((row) => {
    if (!stopsById.has(row.stop_id)) {
      return;
    }
    const list = stopTimesByTrip.get(row.trip_id) || [];
    list.push({
      tripId: row.trip_id,
      stopId: row.stop_id,
      sequence: Number(row.stop_sequence),
      arrival: parseGtfsTime(row.arrival_time || row.departure_time || "00:00:00"),
      departure: parseGtfsTime(row.departure_time || row.arrival_time || "00:00:00")
    });
    stopTimesByTrip.set(row.trip_id, list);
  });

  stopTimesByTrip.forEach((list) => {
    list.sort((a, b) => a.sequence - b.sequence);
  });

  return {
    stops: normalizedStops,
    stopsById,
    routes: normalizedRoutes,
    routesById: new Map(normalizedRoutes.map((route) => [route.id, route])),
    trips: normalizedTrips,
    tripsById: new Map(normalizedTrips.map((trip) => [trip.id, trip])),
    stopTimesByTrip
  };
}

function assertColumns(rows, columns, tableName) {
  const first = rows[0];
  if (!first) {
    throw new Error(`${tableName}.txt is empty.`);
  }
  const missing = columns.filter((column) => !(column in first));
  if (missing.length) {
    throw new Error(`${tableName}.txt is missing: ${missing.join(", ")}`);
  }
}

function populateRouteSelect(selectDemoRoutes) {
  ui.routeSelect.innerHTML = "";
  const usableRoutes = state.dataset.routes.filter((route) => representativeTripForRoute(route.id));

  state.dataset.routes.forEach((route) => {
    const option = document.createElement("option");
    option.value = route.id;
    const pattern = representativeTripForRoute(route.id);
    option.textContent = route.longName
      ? `${route.shortName} - ${route.longName} (${pattern ? "route pattern ready" : "no usable pattern"})`
      : `${route.shortName} (${pattern ? "route pattern ready" : "no usable pattern"})`;
    option.disabled = !pattern;
    option.selected = selectDemoRoutes ? usableRoutes.slice(0, 2).some((item) => item.id === route.id) : usableRoutes[0]?.id === route.id;
    ui.routeSelect.appendChild(option);
  });

  selectRoutes(selectedRouteIdsFromUi());
}

function selectedRouteIdsFromUi() {
  return Array.from(ui.routeSelect.selectedOptions || [])
    .filter((option) => !option.disabled)
    .map((option) => option.value);
}

function selectRoutes(routeIds) {
  const usable = routeIds.filter((routeId) => representativeTripForRoute(routeId));
  state.selectedRouteIds = usable.length ? usable : [representativeTripForRoute(state.dataset.routes[0]?.id)?.routeId].filter(Boolean);
  state.selectedRouteId = state.selectedRouteIds[0] || null;
  state.selectedTripId = state.selectedRouteId ? representativeTripForRoute(state.selectedRouteId)?.id || null : null;
  clearRoute();
  ui.routeStatus.textContent = state.selectedRouteIds.length
    ? `Selected ${state.selectedRouteIds.length} route${state.selectedRouteIds.length > 1 ? "s" : ""}. Build will use the longest stop pattern for each route.`
    : "No route has a usable pattern with at least two valid stops.";
}

function representativeTripForRoute(routeId) {
  return tripsForRoute(routeId)
    .slice()
    .sort((a, b) => getTripStops(b.id).length - getTripStops(a.id).length)[0] || null;
}

function tripsForRoute(routeId) {
  return state.dataset.trips.filter((trip) => trip.routeId === routeId && getTripStops(trip.id).length >= 2);
}

function getTripStops(tripId) {
  const stopTimes = state.dataset.stopTimesByTrip.get(tripId) || [];
  return stopTimes
    .map((time) => state.dataset.stopsById.get(time.stopId))
    .filter(Boolean);
}

function getTripStopTimes(tripId) {
  return state.dataset.stopTimesByTrip.get(tripId) || [];
}

async function buildSelectedRoute() {
  if (!state.dataset || !state.selectedRouteIds.length) {
    ui.routeStatus.textContent = "Load GTFS data and select at least one route first.";
    return;
  }

  const token = (state.routeBuildToken += 1);
  clearRoute(false);
  setStatus("Routing...", "warn");
  ui.routeStatus.textContent = `Building ${state.selectedRouteIds.length} route${state.selectedRouteIds.length > 1 ? "s" : ""}.`;

  try {
    const plans = [];
    for (const routeId of state.selectedRouteIds) {
      const trip = representativeTripForRoute(routeId);
      if (!trip) {
        continue;
      }
      ui.routeStatus.textContent = `Routing ${routeId} using representative trip ${trip.id}.`;
      const plan = await buildRoutePlan(routeId, trip.id, token);
      plans.push(plan);
    }

    if (token !== state.routeBuildToken) {
      return;
    }

    if (!plans.length) {
      ui.routeStatus.textContent = "No selected route has a usable stop pattern.";
      setStatus("No route", "warn");
      return;
    }

    state.routePlans = plans;
    state.routePlan = plans[0];
    state.selectedRouteId = plans[0].routeId;
    state.selectedTripId = plans[0].tripId;
    createTrafficModel();
    ui.routeStatus.textContent = `Built ${plans.length} route${plans.length > 1 ? "s" : ""}: ${formatDistance(totalNetworkDistance())}, ${state.trafficSignals.length} traffic signals.`;
    setStatus("Route ready");
    afterRouteReady();
  } catch (error) {
    if (token === state.routeBuildToken) {
      ui.routeStatus.textContent = error.message;
      setStatus("Routing error", "error");
    }
  }
}

async function buildRoutePlan(routeId, tripId, token) {
  const stopTimes = getTripStopTimes(tripId);
  const stops = getTripStops(tripId);
  if (stops.length < 2) {
    throw new Error(`${routeId} needs at least two valid stops.`);
  }

  const cacheKey = routeCacheKey(routeId, tripId, stops);
  const cached = loadJson(cacheKey);
  if (cached && cached.points && cached.stopPositions) {
    return normalizePlan(cached);
  }

  const pairs = stops.slice(0, -1).map((from, index) => ({
    from,
    to: stops[index + 1],
    index
  }));

  const legs = await mapLimit(
    pairs,
    3,
    async (pair) => {
      const leg = await routeLeg(pair.from, pair.to);
      if (token !== state.routeBuildToken) {
        throw new Error("Route build was replaced by a newer request.");
      }
      return leg;
    },
    (done, total) => {
      ui.routeStatus.textContent = `Routing ${routeId}: ${done}/${total} legs complete.`;
    }
  );

  const plan = assembleRoutePlan({
    routeId,
    tripId,
    stops,
    stopTimes,
    legs
  });
  saveJson(cacheKey, plan);
  return plan;
}

async function routeLeg(from, to) {
  const legKey = legCacheKey(from, to);
  const cached = loadJson(legKey);
  if (cached) {
    return cached;
  }

  const coords = `${from.lon},${from.lat};${to.lon},${to.lat}`;
  const url = `${OSRM_BASE}${coords}?alternatives=3&steps=false&geometries=geojson&overview=full&annotations=false`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    if (data.code !== "Ok" || !data.routes || !data.routes.length) {
      throw new Error("No OSRM route");
    }
    const best = data.routes.reduce((winner, route) => (route.distance < winner.distance ? route : winner));
    const leg = {
      fromStopId: from.id,
      toStopId: to.id,
      distanceM: best.distance,
      durationSec: best.duration,
      points: best.geometry.coordinates.map(([lon, lat]) => ({ lat, lon })),
      source: "OSRM driving route, shortest returned alternative"
    };
    saveJson(legKey, leg);
    return leg;
  } catch (error) {
    const fallback = fallbackLeg(from, to);
    saveJson(legKey, fallback);
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}

function fallbackLeg(from, to) {
  const points = [];
  for (let i = 0; i <= 10; i += 1) {
    const ratio = i / 10;
    const wobble = Math.sin(ratio * Math.PI) * 0.0012;
    points.push({
      lat: from.lat + (to.lat - from.lat) * ratio + wobble,
      lon: from.lon + (to.lon - from.lon) * ratio + wobble * 0.55
    });
  }
  const distanceM = haversineMeters(from, to) * 1.18;
  return {
    fromStopId: from.id,
    toStopId: to.id,
    distanceM,
    durationSec: distanceM / ((24 * 1000) / 3600),
    points,
    source: "Offline synthetic road fallback"
  };
}

function assembleRoutePlan({ routeId, tripId, stops, stopTimes, legs }) {
  const points = [];
  const cumulative = [];
  const stopPositions = [0];
  let totalDistanceM = 0;

  legs.forEach((leg, legIndex) => {
    const legPoints = leg.points;
    const startIndex = legIndex === 0 ? 0 : 1;
    for (let i = startIndex; i < legPoints.length; i += 1) {
      const point = legPoints[i];
      if (points.length) {
        totalDistanceM += haversineMeters(points[points.length - 1], point);
      }
      points.push(point);
      cumulative.push(totalDistanceM);
    }
    stopPositions.push(totalDistanceM);
  });

  const route = state.dataset.routesById.get(routeId);
  const schedule = stopTimes.map((time, index) => ({
    stopId: time.stopId,
    sequence: time.sequence,
    arrival: time.arrival,
    departure: time.departure,
    positionM: stopPositions[index] || 0
  }));

  return normalizePlan({
    version: 2,
    id: `${routeId}:${tripId}`,
    routeId,
    tripId,
    route,
    createdAt: new Date().toISOString(),
    totalDistanceM,
    points,
    cumulative,
    stopPositions,
    stops,
    schedule,
    legs
  });
}

function normalizePlan(plan) {
  const route = state.dataset?.routesById.get(plan.routeId) || plan.route || null;
  return {
    ...plan,
    id: plan.id || `${plan.routeId}:${plan.tripId}`,
    route,
    stops: plan.stops || [],
    stopPositions: plan.stopPositions || [],
    incidents: []
  };
}

function afterRouteReady() {
  renderRoutes();
  resetBusesFromUi();
  renderStops();
  renderTrafficSignals();
  renderIncidents();
  renderGps();
  updateStopArrivals();
  renderSystemPanels();
}

function clearRoute(clearSelection = true) {
  state.routePlans = [];
  state.routePlan = null;
  state.buses = [];
  state.trafficSignals = [];
  state.incidents = clearSelection ? [] : state.incidents;
  state.stopArrivals.clear();
  state.routeLayerGroup?.clearLayers();
  state.stopLayer?.clearLayers();
  state.busLayer?.clearLayers();
  state.trafficLayer?.clearLayers();
  state.incidentLayer?.clearLayers();
  state.emergencyLayer?.clearLayers();
  state.busMarkers.clear();
  state.stopMarkers.clear();
  state.signalMarkers.clear();
  state.incidentMarkers.clear();
  state.routeLayers = [];
  state.routeLayer = null;
  renderSystemPanels();
}

function renderRoutes() {
  state.routeLayerGroup.clearLayers();
  state.routeLayers = [];
  state.routeLayer = null;
  state.routePlans.forEach((plan, index) => {
    const latLngs = plan.points.map((point) => [point.lat, point.lon]);
    const route = plan.route || state.dataset.routesById.get(plan.routeId);
    const layer = L.polyline(latLngs, {
      color: route ? route.color : "#0f5fba",
      weight: index === 0 ? 6 : 5,
      opacity: 0.88,
      lineJoin: "round"
    }).addTo(state.routeLayerGroup);
    state.routeLayers.push(layer);
    if (!state.routeLayer) {
      state.routeLayer = layer;
    }
  });

  if (state.routeLayers.length) {
    const group = L.featureGroup(state.routeLayers);
    state.map.fitBounds(group.getBounds(), { padding: [26, 26] });
  }
}

function createTrafficModel() {
  state.trafficSignals = [];
  state.routePlans.forEach((plan) => {
    const signals = inferSignalsForPlan(plan);
    state.trafficSignals.push(...signals);
  });
}

function inferSignalsForPlan(plan) {
  const signals = [];
  plan.stops.forEach((stop, index) => {
    if (index === 0 || index === plan.stops.length - 1 || SIGNAL_EXCLUDE_RE.test(stop.name)) {
      return;
    }
    const realLifeNamed = SIGNAL_NAME_RE.test(stop.name);
    const artificialChowk = !realLifeNamed && stop.crowd >= 4 && index % 2 === 0;
    if (!realLifeNamed && !artificialChowk) {
      return;
    }
    signals.push(createSignalAtJunction(plan, stop, index, {
      id: `${plan.id}:signal:${stop.id}`,
      name: realLifeNamed ? `${stop.name} junction signal` : `${stop.name} junction signal`,
      source: realLifeNamed ? "Known route junction name" : "AI inferred route junction"
    }));
  });

  if (signals.length < 2) {
    plan.stops.slice(1, -1).forEach((stop, offset) => {
      const index = offset + 1;
      if (signals.some((signal) => signal.stopId === stop.id) || SIGNAL_EXCLUDE_RE.test(stop.name)) {
        return;
      }
      if (index % 3 === 0) {
        signals.push(createSignalAtJunction(plan, stop, index, {
          id: `${plan.id}:signal:auto:${stop.id}`,
          name: `${stop.name} junction signal`,
          source: "AI inferred route junction"
        }));
      }
    });
  }
  return signals;
}

function createSignalAtJunction(plan, stop, index, details) {
  const junction = routeJunctionNearStop(plan, index);
  return {
    id: details.id,
    routeId: plan.routeId,
    planId: plan.id,
    stopId: stop.id,
    name: details.name,
    lat: junction.lat,
    lon: junction.lon,
    positionM: junction.positionM,
    source: `${details.source}; placed at ${junction.method}`
  };
}

function routeJunctionNearStop(plan, stopIndex) {
  const stopPosition = plan.stopPositions[stopIndex] || 0;
  const previousPosition = plan.stopPositions[stopIndex - 1] ?? 0;
  const nextPosition = plan.stopPositions[stopIndex + 1] ?? plan.totalDistanceM;
  const radiusM = Math.min(220, Math.max(80, (nextPosition - previousPosition) * 0.18));
  let best = null;

  for (let index = 1; index < plan.points.length - 1; index += 1) {
    const positionM = plan.cumulative[index] || 0;
    const offsetM = Math.abs(positionM - stopPosition);
    if (offsetM > radiusM) {
      continue;
    }
    const angle = turnAngle(plan.points[index - 1], plan.points[index], plan.points[index + 1]);
    const score = angle - offsetM / Math.max(1, radiusM);
    if (!best || score > best.score) {
      best = {
        lat: plan.points[index].lat,
        lon: plan.points[index].lon,
        positionM,
        score,
        angle
      };
    }
  }

  if (best && best.angle > 0.16) {
    return { ...best, method: "nearest route turn/junction" };
  }

  const approachPosition = clamp(
    stopPosition - Math.min(90, Math.max(40, (stopPosition - previousPosition) * 0.2)),
    previousPosition + 35,
    Math.max(previousPosition + 35, nextPosition - 35)
  );
  const point = positionAtDistance(plan, approachPosition);
  return {
    ...point,
    positionM: approachPosition,
    method: "approach junction before the stop"
  };
}

function renderStops() {
  state.stopMarkers.forEach((marker) => marker.remove());
  state.stopMarkers.clear();
  state.stopLayer.clearLayers();

  uniqueRouteStops().forEach(({ stop, terminal }) => {
    const marker = L.marker([stop.lat, stop.lon], {
      icon: stopIcon(stop, terminal),
      title: stop.name
    }).addTo(state.stopLayer);
    marker.bindPopup(stopPopup(stop));
    marker.bindTooltip(stopTooltip(stop), {
      permanent: false,
      direction: "top",
      offset: [0, -14],
      className: "stop-tooltip"
    });
    marker.on("click", () => {
      marker.setPopupContent(stopPopup(stop));
      marker.openPopup();
    });
    state.stopMarkers.set(stop.id, marker);
  });
}

function stopIcon(stop, terminal) {
  const major = isMajorStop(stop) ? '<b class="crowd-star">*</b>' : "";
  return L.divIcon({
    className: "stop-icon",
    html: `<span class="stop-dot ${terminal ? "terminal" : "intermediate"}">${major}</span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
}

function stopPopup(stop) {
  const arrival = state.stopArrivals.get(stop.id);
  const primary = arrival?.primary;
  const recommendation = arrival?.recommended;
  const noService = noServiceNotice(stop);
  const arrivalClock = primary ? formatClock(state.virtualTimeSec + primary.etaSec) : "No bus due";
  const arrivalEta = primary ? formatDuration(primary.etaSec) : "No bus";
  const range = boardingRangeForStop(stop);
  return `
    <h4 class="popup-title">${escapeHtml(stop.name)}</h4>
    <div class="stop-arrival-card ${noService ? "blocked" : ""}">
      <span>${noService ? "Service alert" : "Next arrival"}</span>
      <strong>${noService ? "No service" : arrivalClock}</strong>
      <small>${noService ? escapeHtml(noService) : primary ? `${primary.busId} arriving in ${arrivalEta} to ${escapeHtml(primary.finalStop.name)}` : "No active bus is approaching this stop."}</small>
    </div>
    ${recommendation ? `<div class="ai-advice">${escapeHtml(recommendation.message)}</div>` : ""}
    <div class="popup-grid">
      <div><span>Stop name</span><strong>${escapeHtml(stop.name)}</strong></div>
      <div><span>Arrival time</span><strong>${arrivalClock}</strong></div>
      <div><span>Crowd</span><strong>${stop.crowd}/5</strong></div>
      <div><span>Boarding range</span><strong>${range.min}-${range.max}</strong></div>
      <div><span>Off board range</span><strong>${range.offMin}-${range.offMax}</strong></div>
      <div><span>Next bus</span><strong>${primary ? primary.busId : "Waiting"}</strong></div>
      <div><span>Occupancy</span><strong>${primary ? `${Math.round(primary.occupancyPct * 100)}%` : "-"}</strong></div>
      <div><span>Final stop</span><strong>${primary ? escapeHtml(primary.finalStop.name) : "-"}</strong></div>
    </div>
  `;
}

function stopTooltip(stop) {
  const arrival = state.stopArrivals.get(stop.id);
  const primary = arrival?.primary;
  const noService = noServiceNotice(stop);
  return `
    <strong>${escapeHtml(stop.name)}${isMajorStop(stop) ? " *" : ""}</strong>
    <span>${noService ? "No service" : primary ? `${primary.busId} in ${formatDuration(primary.etaSec)}` : "No bus due"}</span>
  `;
}

function renderTrafficSignals() {
  state.signalMarkers.forEach((marker) => marker.remove());
  state.signalMarkers.clear();
  state.trafficLayer.clearLayers();

  state.trafficSignals.forEach((signal) => {
    const marker = L.marker([signal.lat, signal.lon], {
      icon: trafficSignalIcon(signal),
      title: signal.name
    }).addTo(state.trafficLayer);
    marker.bindPopup(signalPopup(signal));
    state.signalMarkers.set(signal.id, marker);
  });
}

function updateTrafficSignalIcons() {
  state.trafficSignals.forEach((signal) => {
    const marker = state.signalMarkers.get(signal.id);
    if (marker) {
      marker.setIcon(trafficSignalIcon(signal));
      marker.setPopupContent(signalPopup(signal));
    }
  });
}

function trafficSignalIcon(signal) {
  const color = signalColor(signal);
  return L.divIcon({
    className: `traffic-signal-icon ${color}`,
    html: `<span></span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
}

function signalPopup(signal) {
  return `
    <h4 class="popup-title">${escapeHtml(signal.name)}</h4>
    <div class="popup-grid">
      <div><span>Route</span><strong>${escapeHtml(signal.routeId)}</strong></div>
      <div><span>Current phase</span><strong>${signalColor(signal)}</strong></div>
      <div><span>Traffic</span><strong>${trafficLabel()}</strong></div>
      <div><span>Source</span><strong>${escapeHtml(signal.source)}</strong></div>
    </div>
  `;
}

function signalColor(signal) {
  const traffic = trafficIntensity();
  const redSec = clamp(24 + traffic * 22, 24, 50);
  const yellowSec = 6;
  const offset = hashNumber(signal.id) % SIGNAL_CYCLE_SEC;
  const t = (Math.floor(state.virtualTimeSec) + offset) % SIGNAL_CYCLE_SEC;
  if (t < redSec) {
    return "red";
  }
  if (t < redSec + yellowSec) {
    return "yellow";
  }
  return "green";
}

function signalWaitRemaining(signal) {
  const traffic = trafficIntensity();
  const redSec = clamp(24 + traffic * 22, 24, 50);
  const offset = hashNumber(signal.id) % SIGNAL_CYCLE_SEC;
  const t = (Math.floor(state.virtualTimeSec) + offset) % SIGNAL_CYCLE_SEC;
  return t < redSec ? redSec - t + 4 * traffic : 0;
}

function resetBusesFromUi() {
  if (!state.routePlans.length) {
    if (ui.controlStatus) {
      ui.controlStatus.textContent = "Build a route before creating buses.";
    }
    return;
  }
  const count = clamp(Number(ui.busCount.value) || 8, 2, 24);
  state.buses = createBuses(count);
  populateBusSelect();
  renderBuses();
  updateStopArrivals();
  renderSystemPanels();
  if (ui.controlStatus) {
    ui.controlStatus.textContent = `Created ${count} synthetic buses across ${state.routePlans.length} selected route${state.routePlans.length > 1 ? "s" : ""}.`;
  }
}

function createBuses(count) {
  const buses = [];
  const counts = state.routePlans.map((_, index) => Math.floor(count / state.routePlans.length) + (index < count % state.routePlans.length ? 1 : 0));
  state.routePlans.forEach((plan, planIndex) => {
    const routeCount = Math.max(1, counts[planIndex]);
    const spacing = plan.totalDistanceM / routeCount;
    for (let index = 0; index < routeCount; index += 1) {
      const jitter = spacing * 0.18 * Math.sin((index + 1) * 1.91 + planIndex);
      const routeDistanceM = wrapDistance(index * spacing + jitter, plan.totalDistanceM);
      const normalSpeedKmph = randomBetween(CRUISE_SPEED_KMPH - 1.2, CRUISE_SPEED_KMPH + 1.4);
      const route = plan.route || state.dataset.routesById.get(plan.routeId);
      const occupancy = clamp(Math.round(BUS_CAPACITY * randomBetween(0.35, 0.98)), 5, BUS_CAPACITY);
      buses.push({
        id: `${route ? route.shortName : plan.routeId}-BUS-${String(index + 1).padStart(2, "0")}`,
        routeId: plan.routeId,
        planId: plan.id,
        routeDistanceM,
        normalSpeedKmph,
        speedKmph: normalSpeedKmph * randomBetween(0.94, 1.01),
        targetSpeedKmph: normalSpeedKmph,
        status: "normal",
        controlNote: "Normal service",
        brokenDown: false,
        dwellRemainingSec: 0,
        dwellStopId: null,
        lastDwellStopId: null,
        holdIntentSec: 0,
        trafficWaitRemainingSec: 0,
        lastSignalId: null,
        detourRemainingSec: 0,
        detourTotalSec: 0,
        detourElapsedSec: 0,
        detourPath: null,
        detourRejoinPositionM: null,
        displayPoint: null,
        lastIncidentId: null,
        breakdownBoostSec: 0,
        capacity: BUS_CAPACITY,
        occupancy,
        lastFlow: null,
        completedTrips: 0
      });
    }
  });
  return buses;
}

function populateBusSelect() {
  if (!ui.busSelect) {
    return;
  }
  ui.busSelect.innerHTML = "";
  state.buses.forEach((bus) => {
    const option = document.createElement("option");
    option.value = bus.id;
    option.textContent = `${bus.id} (${Math.round(occupancyPct(bus) * 100)}%)`;
    ui.busSelect.appendChild(option);
  });
}

function startLoop() {
  state.lastTickMs = performance.now();
  setInterval(tick, UPDATE_MS);
  renderSystemPanels();
}

function tick() {
  const now = performance.now();
  const realDeltaSec = Math.max(0, (now - state.lastTickMs) / 1000);
  state.lastTickMs = now;

  if (state.running) {
    state.virtualTimeSec = wrapClock(state.virtualTimeSec + realDeltaSec * state.timeScale);
  }

  if (state.running && state.routePlans.length && state.buses.length) {
    applyHeadwayController();
    advanceBuses(realDeltaSec * state.timeScale);
    updateStopArrivals();
    renderBuses();
    renderStopsPopups();
  }

  updateTrafficSignalIcons();
  renderGps();
  renderSystemPanels();
}

function applyHeadwayController() {
  state.buses.forEach((bus) => {
    if (bus.brokenDown) {
      bus.status = "breakdown";
      bus.targetSpeedKmph = 0;
      bus.controlNote = "Repair required; nearby lagging bus is boosted";
      return;
    }
    if (bus.detourRemainingSec > 0) {
      bus.status = "diversion";
      bus.targetSpeedKmph = DETOUR_SPEED_KMPH;
      bus.controlNote = `Following diversion path for ${formatDuration(bus.detourRemainingSec)}`;
      return;
    }
    if (bus.trafficWaitRemainingSec > 0) {
      bus.status = "traffic";
      bus.targetSpeedKmph = 0;
      bus.controlNote = `Waiting at traffic signal for ${formatDuration(bus.trafficWaitRemainingSec)}`;
      return;
    }
    if (bus.dwellRemainingSec > 0) {
      const stop = stopById(bus.dwellStopId);
      bus.status = bus.holdIntentSec > 0 ? "holding" : "dwelling";
      bus.targetSpeedKmph = 0;
      bus.controlNote = `Holding at ${stop ? stop.name : "stop"} for ${formatDuration(bus.dwellRemainingSec)}`;
      return;
    }
    const plan = planForBus(bus);
    bus.status = "normal";
    bus.targetSpeedKmph = targetSpeedForBus(bus, plan);
    bus.controlNote = `Current traffic ${trafficLabel().toLowerCase()}`;
  });

  state.routePlans.forEach((plan) => applyPlanHeadwayController(plan));
  applyBreakdownRecovery();
}

function applyPlanHeadwayController(plan) {
  const active = state.buses
    .filter((bus) => bus.planId === plan.id && !bus.brokenDown)
    .sort((a, b) => a.routeDistanceM - b.routeDistanceM);

  if (active.length < 2) {
    return;
  }

  active.forEach((bus, index) => {
    const leading = active[(index + 1) % active.length];
    const gapM = distanceAheadOnRoute(bus.routeDistanceM, leading.routeDistanceM, plan.totalDistanceM);
    const speedMps = Math.max(1, (bus.normalSpeedKmph * 1000) / 3600);
    const gapSec = gapM / speedMps;

    if (gapSec < BUNCH_THRESHOLD_SEC) {
      queueDynamicHold(bus, clamp(BUNCH_THRESHOLD_SEC - gapSec + 25, 30, 135), "Bunching control: hold at next major stop");
      bus.status = bus.status === "normal" ? "bunching" : bus.status;
      bus.controlNote = `Dynamic hold queued at next major stop to separate from ${leading.id}`;
    } else if (gapSec > GAP_THRESHOLD_SEC) {
      queueDynamicHold(leading, clamp((gapSec - GAP_THRESHOLD_SEC) * 0.22, 30, 150), "Gap control: hold at next major stop");
      leading.status = leading.status === "normal" ? "excess-gap" : leading.status;
      leading.controlNote = `Dynamic hold queued at next major stop to reduce ${Math.round(gapSec / 60)} min gap`;
    }
  });
}

function queueDynamicHold(bus, seconds, reason) {
  bus.holdIntentSec = Math.max(bus.holdIntentSec || 0, seconds);
  bus.holdReason = reason;
}

function applyBreakdownRecovery() {
  state.routePlans.forEach((plan) => {
    const ordered = state.buses
      .filter((bus) => bus.planId === plan.id)
      .sort((a, b) => a.routeDistanceM - b.routeDistanceM);

    ordered
      .filter((bus) => bus.brokenDown)
      .forEach((broken) => {
        const index = ordered.findIndex((bus) => bus.id === broken.id);
        const following = ordered[(index - 1 + ordered.length) % ordered.length];
        if (following && following.id !== broken.id && !following.brokenDown) {
          following.breakdownBoostSec = Math.max(following.breakdownBoostSec || 0, 180);
          following.targetSpeedKmph = Math.max(following.targetSpeedKmph || 0, targetSpeedForBus(following, plan));
          following.controlNote = `Breakdown ahead at ${broken.id}; lagging bus is boosted to close the service gap`;
          if (following.status === "normal") {
            following.status = "excess-gap";
          }
        }
      });
  });
}

function advanceBuses(deltaVirtualSec) {
  state.buses.forEach((bus) => {
    const plan = planForBus(bus);
    if (!plan) {
      return;
    }
    advanceBus(bus, plan, deltaVirtualSec);
  });
}

function advanceBus(bus, plan, deltaVirtualSec) {
  if (bus.brokenDown) {
    bus.speedKmph = 0;
    return;
  }
  bus.breakdownBoostSec = Math.max(0, (bus.breakdownBoostSec || 0) - deltaVirtualSec);

  let remainingSec = deltaVirtualSec;
  while (remainingSec > 0) {
    if (bus.detourRemainingSec > 0) {
      const used = Math.min(remainingSec, bus.detourRemainingSec);
      bus.detourElapsedSec = (bus.detourElapsedSec || 0) + used;
      bus.detourRemainingSec -= used;
      remainingSec -= used;
      bus.speedKmph = DETOUR_SPEED_KMPH;
      bus.status = "diversion";
      updateDetourDisplayPoint(bus);
      if (bus.detourRemainingSec > 0) {
        return;
      }
      completeIncidentDetour(bus, plan);
      if (remainingSec <= 0) {
        return;
      }
    }

    if (bus.trafficWaitRemainingSec > 0) {
      const used = Math.min(remainingSec, bus.trafficWaitRemainingSec);
      bus.trafficWaitRemainingSec -= used;
      remainingSec -= used;
      bus.speedKmph = 0;
      bus.status = "traffic";
      if (bus.trafficWaitRemainingSec > 0) {
        return;
      }
    }

    if (bus.dwellRemainingSec > 0) {
      const used = Math.min(remainingSec, bus.dwellRemainingSec);
      bus.dwellRemainingSec -= used;
      remainingSec -= used;
      bus.speedKmph = 0;
      if (bus.dwellRemainingSec > 0) {
        setDwellNote(bus);
        return;
      }
      releaseDwell(bus, plan);
      if (remainingSec <= 0) {
        return;
      }
    }

    const currentStop = stopAtCurrentPosition(bus, plan);
    if (currentStop && bus.lastDwellStopId !== currentStop.stop.id) {
      beginDwell(bus, currentStop.stop, currentStop.index, plan);
      continue;
    }

    bus.targetSpeedKmph = targetSpeedForBus(bus, plan);
    bus.speedKmph += (bus.targetSpeedKmph - bus.speedKmph) * 0.34;
    bus.speedKmph = Math.max(0, bus.speedKmph);
    const speedMps = (bus.speedKmph * 1000) / 3600;
    if (speedMps <= 0.01) {
      remainingSec = 0;
      continue;
    }

    const meters = speedMps * remainingSec;
    const nextSignal = nextSignalWithinDistance(plan, bus.routeDistanceM, meters);
    if (nextSignal && bus.lastSignalId !== nextSignal.signal.id && signalColor(nextSignal.signal) === "red") {
      const travelSec = Math.max(0, nextSignal.distanceM / speedMps);
      bus.routeDistanceM = nextSignal.signal.positionM;
      bus.trafficWaitRemainingSec = signalWaitRemaining(nextSignal.signal);
      bus.lastSignalId = nextSignal.signal.id;
      bus.status = "traffic";
      bus.controlNote = `Red light at ${nextSignal.signal.name}`;
      remainingSec = Math.max(0, remainingSec - travelSec);
      continue;
    }

    const nextIncident = nextIncidentWithinDistance(plan, bus.routeDistanceM, meters);
    if (nextIncident && bus.lastIncidentId !== nextIncident.incident.id) {
      const travelSec = Math.max(0, nextIncident.distanceM / speedMps);
      beginIncidentDetour(bus, nextIncident.incident, plan);
      remainingSec = Math.max(0, remainingSec - travelSec);
      continue;
    }

    const nextStop = nextStopWithinDistance(bus, plan, meters);
    if (nextStop) {
      const travelSec = Math.max(0, nextStop.distanceM / speedMps);
      bus.routeDistanceM = plan.stopPositions[nextStop.index] || 0;
      beginDwell(bus, nextStop.stop, nextStop.index, plan);
      remainingSec = Math.max(0, remainingSec - travelSec);
    } else {
      moveBusDistance(bus, meters, plan.totalDistanceM);
      maybeClearDwellGuard(bus, plan);
      maybeClearSignalGuard(bus, plan);
      maybeClearIncidentGuard(bus, plan);
      remainingSec = 0;
    }
  }
}

function beginIncidentDetour(bus, incident, plan) {
  const startPositionM = incident.detourStartPositionM ?? Math.max(0, incident.positionM - INCIDENT_LOOKAHEAD_M);
  const endPositionM = incident.detourEndPositionM ?? Math.min(plan.totalDistanceM, incident.positionM + DETOUR_REJOIN_M);
  const path = incident.detourPath || detourPolylineForIncident(incident);
  const detourDistanceM = polylineDistanceM(path);
  const travelSec = detourDistanceM / ((DETOUR_SPEED_KMPH * 1000) / 3600);
  const dispatchSec = DETOUR_HOLD_BASE_SEC * incident.severity * (1 + trafficIntensity() * 0.25);

  bus.routeDistanceM = startPositionM;
  bus.detourPath = path;
  bus.detourRejoinPositionM = endPositionM;
  bus.detourTotalSec = Math.max(18, travelSec + dispatchSec);
  bus.detourRemainingSec = bus.detourTotalSec;
  bus.detourElapsedSec = 0;
  bus.lastIncidentId = incident.id;
  bus.status = "diversion";
  bus.speedKmph = DETOUR_SPEED_KMPH;
  bus.controlNote = `${incident.typeLabel}: diverted around the closed segment`;
  updateDetourDisplayPoint(bus);
}

function updateDetourDisplayPoint(bus) {
  if (!bus.detourPath?.length || !bus.detourTotalSec) {
    bus.displayPoint = null;
    return;
  }
  const progress = clamp((bus.detourElapsedSec || 0) / Math.max(1, bus.detourTotalSec), 0, 1);
  bus.displayPoint = pointAlongLatLngPolyline(bus.detourPath, progress);
}

function completeIncidentDetour(bus, plan) {
  bus.routeDistanceM = wrapDistance(bus.detourRejoinPositionM ?? bus.routeDistanceM, plan.totalDistanceM);
  bus.detourRemainingSec = 0;
  bus.detourTotalSec = 0;
  bus.detourElapsedSec = 0;
  bus.detourPath = null;
  bus.detourRejoinPositionM = null;
  bus.displayPoint = null;
  bus.targetSpeedKmph = targetSpeedForBus(bus, plan);
  bus.status = "normal";
  bus.controlNote = "Rejoined route after diversion";
}

function beginDwell(bus, stop, index, plan) {
  bus.routeDistanceM = plan.stopPositions[index] || 0;
  bus.speedKmph = 0;
  bus.targetSpeedKmph = 0;
  const flow = passengerFlowForStop(stop, bus);
  bus.occupancy = clamp(bus.occupancy - flow.offBoarding + flow.boarding, 0, bus.capacity);
  stop.waitingPassengers = Math.max(0, (stop.waitingPassengers || 0) + flow.waitingAdded - flow.boarding);
  bus.lastFlow = flow;

  const baseDwell = dwellSecondsForStop(stop) + Math.min(32, flow.boarding * 1.2 + flow.offBoarding * 0.8);
  const dynamicHold = bus.holdIntentSec > 0 && isMajorStop(stop, index, plan) ? bus.holdIntentSec : 0;
  if (dynamicHold > 0) {
    bus.holdIntentSec = 0;
  }

  bus.dwellRemainingSec = baseDwell + dynamicHold;
  bus.dwellStopId = stop.id;
  bus.lastDwellStopId = stop.id;
  bus.status = dynamicHold > 0 ? "holding" : "dwelling";
  setDwellNote(bus);
}

function releaseDwell(bus, plan) {
  const leavingFrom = bus.routeDistanceM;
  const departureNudgeM = DWELL_STOP_MARGIN_M + 1;
  if (leavingFrom + departureNudgeM >= plan.totalDistanceM) {
    bus.completedTrips += 1;
  }
  bus.routeDistanceM = wrapDistance(leavingFrom + departureNudgeM, plan.totalDistanceM);
  bus.dwellRemainingSec = 0;
  bus.dwellStopId = null;
  bus.targetSpeedKmph = targetSpeedForBus(bus, plan);
  bus.status = "normal";
  bus.controlNote = "Leaving stop after dwell or dynamic hold";
}

function setDwellNote(bus) {
  const stop = stopById(bus.dwellStopId);
  const flow = bus.lastFlow ? `; +${bus.lastFlow.boarding}/-${bus.lastFlow.offBoarding} passengers` : "";
  bus.controlNote = `${bus.status === "holding" ? "Dynamic holding" : "Dwelling"} at ${stop ? stop.name : "stop"} for ${formatDuration(bus.dwellRemainingSec)}${flow}`;
}

function passengerFlowForStop(stop, bus) {
  const range = boardingRangeForStop(stop);
  const seed = `${stop.id}:${bus.id}:${Math.floor(state.virtualTimeSec / 300)}:${bus.completedTrips}`;
  const boardMax = range.max;
  const offMax = Math.min(range.offMax, bus.occupancy);
  const desiredBoarding = hashNumber(`${seed}:board`) % (boardMax + 1);
  const offBoarding = offMax <= 0 ? 0 : hashNumber(`${seed}:off`) % (offMax + 1);
  const waitingAdded = Math.floor((trafficIntensity() + 1) * stop.crowd);
  const available = Math.max(0, bus.capacity - (bus.occupancy - offBoarding));
  const boarding = Math.min(desiredBoarding, available);
  return { boarding, offBoarding, waitingAdded };
}

function boardingRangeForStop(stop) {
  const maxByCrowd = [0, 4, 8, 12, 16, 20][clamp(Math.round(stop.crowd), 1, 5)];
  const offMax = Math.max(2, Math.round(maxByCrowd * 0.65));
  return { min: 0, max: maxByCrowd, offMin: 0, offMax };
}

function dwellSecondsForStop(stop) {
  if (!stop) {
    return NORMAL_DWELL_SEC;
  }
  if (stop.crowd >= 4) {
    return STAR_DWELL_MIN_SEC + (hashNumber(String(stop.id || stop.name || "stop")) % (STAR_DWELL_MAX_SEC - STAR_DWELL_MIN_SEC + 1));
  }
  if (stop.crowd <= 2) {
    return LOW_DWELL_SEC;
  }
  return NORMAL_DWELL_SEC;
}

function dwellLabelForStop(stop) {
  return `${dwellSecondsForStop(stop)} sec`;
}

function moveBusDistance(bus, meters, total) {
  bus.routeDistanceM += meters;
  while (bus.routeDistanceM >= total) {
    bus.routeDistanceM -= total;
    bus.completedTrips += 1;
  }
}

function stopAtCurrentPosition(bus, plan) {
  let match = null;
  plan.stopPositions.forEach((position, index) => {
    const distance = routePositionGap(bus.routeDistanceM, position, plan.totalDistanceM);
    if (distance <= DWELL_STOP_MARGIN_M && (!match || distance < match.distanceM)) {
      match = {
        stop: plan.stops[index],
        index,
        distanceM: distance
      };
    }
  });
  return match;
}

function nextStopWithinDistance(bus, plan, meters) {
  let match = null;
  plan.stopPositions.forEach((position, index) => {
    const distance = distanceAheadOnRoute(bus.routeDistanceM, position, plan.totalDistanceM);
    if (distance > DWELL_STOP_MARGIN_M && distance <= meters + DWELL_STOP_MARGIN_M && (!match || distance < match.distanceM)) {
      match = {
        stop: plan.stops[index],
        index,
        distanceM: distance
      };
    }
  });
  return match;
}

function nextSignalWithinDistance(plan, routeDistanceM, meters) {
  let match = null;
  state.trafficSignals
    .filter((signal) => signal.planId === plan.id)
    .forEach((signal) => {
      const distance = distanceAheadOnRoute(routeDistanceM, signal.positionM, plan.totalDistanceM);
      if (distance > DWELL_STOP_MARGIN_M && distance <= meters + DWELL_STOP_MARGIN_M && (!match || distance < match.distanceM)) {
        match = { signal, distanceM: distance };
      }
    });
  return match;
}

function nextIncidentWithinDistance(plan, routeDistanceM, meters) {
  let match = null;
  state.incidents
    .filter((incident) => incident.planId === plan.id)
    .forEach((incident) => {
      const triggerPositionM = incident.detourStartPositionM ?? incident.positionM;
      const distance = distanceAheadOnRoute(routeDistanceM, triggerPositionM, plan.totalDistanceM);
      if (distance > DWELL_STOP_MARGIN_M && distance <= meters + DWELL_STOP_MARGIN_M && (!match || distance < match.distanceM)) {
        match = { incident, distanceM: distance };
      }
    });
  return match;
}

function maybeClearDwellGuard(bus, plan) {
  if (!bus.lastDwellStopId) {
    return;
  }
  const index = plan.stops.findIndex((stop) => stop.id === bus.lastDwellStopId);
  if (index === -1) {
    bus.lastDwellStopId = null;
    return;
  }
  const position = plan.stopPositions[index] || 0;
  if (routePositionGap(bus.routeDistanceM, position, plan.totalDistanceM) > DWELL_STOP_MARGIN_M * 2) {
    bus.lastDwellStopId = null;
  }
}

function maybeClearSignalGuard(bus, plan) {
  if (!bus.lastSignalId) {
    return;
  }
  const signal = state.trafficSignals.find((item) => item.id === bus.lastSignalId);
  if (!signal || routePositionGap(bus.routeDistanceM, signal.positionM, plan.totalDistanceM) > DWELL_STOP_MARGIN_M * 3) {
    bus.lastSignalId = null;
  }
}

function maybeClearIncidentGuard(bus, plan) {
  if (!bus.lastIncidentId) {
    return;
  }
  const incident = state.incidents.find((item) => item.id === bus.lastIncidentId);
  if (!incident || routePositionGap(bus.routeDistanceM, incident.positionM, plan.totalDistanceM) > INCIDENT_IMPACT_M) {
    bus.lastIncidentId = null;
  }
}

function stopById(stopId) {
  if (!stopId) {
    return null;
  }
  for (const plan of state.routePlans) {
    const stop = plan.stops.find((item) => item.id === stopId);
    if (stop) {
      return stop;
    }
  }
  return state.dataset?.stopsById.get(stopId) || null;
}

function planForBus(bus) {
  return state.routePlans.find((plan) => plan.id === bus.planId) || state.routePlans.find((plan) => plan.routeId === bus.routeId) || state.routePlan;
}

function plansForStop(stopId) {
  return state.routePlans
    .map((plan) => {
      const index = plan.stops.findIndex((stop) => stop.id === stopId);
      return index === -1 ? null : { plan, index, stop: plan.stops[index] };
    })
    .filter(Boolean);
}

function uniqueRouteStops() {
  const byId = new Map();
  state.routePlans.forEach((plan) => {
    plan.stops.forEach((stop, index) => {
      const current = byId.get(stop.id);
      byId.set(stop.id, {
        stop,
        terminal: Boolean(current?.terminal || index === 0 || index === plan.stops.length - 1)
      });
    });
  });
  return Array.from(byId.values());
}

function distanceAheadOnRoute(fromM, toM, total) {
  if (toM >= fromM) {
    return toM - fromM;
  }
  return total - fromM + toM;
}

function routePositionGap(a, b, total) {
  const direct = Math.abs(a - b);
  return Math.min(direct, total - direct);
}

function renderBuses() {
  const seen = new Set();
  state.buses.forEach((bus) => {
    const plan = planForBus(bus);
    if (!plan) {
      return;
    }
    const position = busMapPoint(bus, plan);
    const marker = state.busMarkers.get(bus.id);
    const icon = busIcon(bus);
    if (marker) {
      marker.setLatLng([position.lat, position.lon]);
      marker.setIcon(icon);
      marker.setPopupContent(busPopup(bus));
    } else {
      const created = L.marker([position.lat, position.lon], {
        icon,
        title: bus.id
      }).addTo(state.busLayer);
      created.bindPopup(busPopup(bus));
      created.on("click", () => created.setPopupContent(busPopup(bus)));
      state.busMarkers.set(bus.id, created);
    }
    seen.add(bus.id);
  });

  state.busMarkers.forEach((marker, id) => {
    if (!seen.has(id)) {
      marker.remove();
      state.busMarkers.delete(id);
    }
  });
}

function renderStopsPopups() {
  uniqueRouteStops().forEach(({ stop }) => {
    const marker = state.stopMarkers.get(stop.id);
    if (marker && marker.isPopupOpen()) {
      marker.setPopupContent(stopPopup(stop));
    }
    if (marker && marker.getTooltip()) {
      marker.setTooltipContent(stopTooltip(stop));
    }
  });
}

function busIcon(bus) {
  const badge = bus.brokenDown ? '<span class="repair-badge" aria-hidden="true">!</span>' : "";
  return L.divIcon({
    className: `bus-icon ${bus.status}`,
    html: `
      <svg class="bus-logo" viewBox="0 0 48 32" aria-hidden="true" focusable="false">
        <path class="bus-body" d="M8 6h26c4.4 0 8 3.6 8 8v9.5c0 1.4-1.1 2.5-2.5 2.5H36a5 5 0 0 1-10 0H18a5 5 0 0 1-10 0H6.5A2.5 2.5 0 0 1 4 23.5V10c0-2.2 1.8-4 4-4Z"/>
        <path class="bus-window" d="M10 10h8v8h-8zM21 10h8v8h-8zM32 11h5.5c.8 0 1.5.7 1.5 1.5V18h-7z"/>
        <path class="bus-light" d="M5.5 20h5v2h-5zM37 20h4v2h-4z"/>
        <circle class="bus-wheel" cx="13" cy="26" r="3.2"/>
        <circle class="bus-wheel" cx="31" cy="26" r="3.2"/>
      </svg>
      ${badge}
    `,
    iconSize: bus.brokenDown ? [42, 34] : [38, 30],
    iconAnchor: bus.brokenDown ? [21, 17] : [19, 15],
    popupAnchor: [0, -16]
  });
}

function busPopup(bus) {
  const plan = planForBus(bus);
  const next = nextStopForBus(bus, plan);
  const etaFinal = etaToFinal(bus, plan);
  const flow = bus.lastFlow ? `+${bus.lastFlow.boarding}/-${bus.lastFlow.offBoarding}` : "No stop event yet";
  return `
    <h4 class="popup-title">${escapeHtml(bus.id)}</h4>
    <div class="popup-grid">
      <div><span>Status</span><strong>${labelStatus(bus.status)}</strong></div>
      <div><span>Speed</span><strong>${bus.speedKmph.toFixed(1)} km/h</strong></div>
      <div><span>Route</span><strong>${escapeHtml(bus.routeId)}</strong></div>
      <div><span>Occupancy</span><strong>${bus.occupancy}/${bus.capacity} (${Math.round(occupancyPct(bus) * 100)}%)</strong></div>
      <div><span>Next stop</span><strong>${escapeHtml(next.stop.name)}</strong></div>
      <div><span>ETA next</span><strong>${formatDuration(next.etaSec)}</strong></div>
      <div><span>Final stop</span><strong>${escapeHtml(finalStopForPlan(plan).name)}</strong></div>
      <div><span>ETA final</span><strong>${formatDuration(etaFinal)}</strong></div>
      <div><span>Last crowd flow</span><strong>${escapeHtml(flow)}</strong></div>
      <div><span>Control</span><strong>${escapeHtml(bus.controlNote)}</strong></div>
    </div>
  `;
}

function updateStopArrivals() {
  state.stopArrivals.clear();
  if (!state.routePlans.length || !state.buses.length) {
    return;
  }

  uniqueRouteStops().forEach(({ stop }) => {
    const candidates = [];
    plansForStop(stop.id).forEach(({ plan, index }) => {
      const stopPosition = plan.stopPositions[index] || 0;
      state.buses
        .filter((bus) => bus.planId === plan.id && !bus.brokenDown)
        .forEach((bus) => {
          const etaSec = etaToRoutePosition(bus, plan, stopPosition);
          candidates.push({
            busId: bus.id,
            routeId: plan.routeId,
            etaSec,
            dwelling: bus.dwellStopId === stop.id && bus.dwellRemainingSec > 0,
            occupancyPct: occupancyPct(bus),
            occupancy: bus.occupancy,
            capacity: bus.capacity,
            finalStop: finalStopForPlan(plan),
            bus
          });
        });
    });

    candidates.sort((a, b) => a.etaSec - b.etaSec);
    state.stopArrivals.set(stop.id, {
      primary: candidates[0] || null,
      candidates,
      recommended: occupancyRecommendation(candidates)
    });
  });
}

function occupancyRecommendation(candidates) {
  const first = candidates[0];
  const second = candidates.find((candidate) => candidate.busId !== first?.busId && candidate.occupancyPct < FULL_BUS_THRESHOLD);
  if (!first || !second) {
    return null;
  }
  if (first.occupancyPct >= FULL_BUS_THRESHOLD && second.etaSec <= first.etaSec + 8 * 60) {
    return {
      busId: second.busId,
      message: `${first.busId} is ${Math.round(first.occupancyPct * 100)}% full. AI suggests ${second.busId} in ${formatDuration(second.etaSec)} for luggage or stroller passengers.`
    };
  }
  return null;
}

function etaToRoutePosition(bus, plan, stopPosition) {
  if (bus.dwellStopId && routePositionGap(bus.routeDistanceM, stopPosition, plan.totalDistanceM) <= DWELL_STOP_MARGIN_M) {
    return Math.max(0, bus.dwellRemainingSec || 0);
  }
  let distance = stopPosition - bus.routeDistanceM;
  if (distance < ARRIVAL_MARGIN_M) {
    distance += plan.totalDistanceM;
  }
  const speedMps = Math.max(1, (Math.max(bus.speedKmph, bus.normalSpeedKmph * trafficSpeedFactor(plan)) * 1000) / 3600);
  return distance / speedMps + Math.max(0, bus.dwellRemainingSec || 0) + predictedDelayForDistance(plan, bus.routeDistanceM, stopPosition);
}

function nextStopForBus(bus, plan) {
  if (bus.dwellRemainingSec > 0 && bus.dwellStopId) {
    const index = plan.stops.findIndex((stop) => stop.id === bus.dwellStopId);
    const stop = plan.stops[index] || stopById(bus.dwellStopId) || plan.stops[0];
    return {
      stop,
      index: Math.max(0, index),
      etaSec: 0
    };
  }
  const positions = plan.stopPositions;
  let index = positions.findIndex((position) => position > bus.routeDistanceM + ARRIVAL_MARGIN_M);
  if (index === -1) {
    index = positions.length - 1;
  }
  return {
    stop: plan.stops[index],
    index,
    etaSec: etaToRoutePosition(bus, plan, positions[index] || 0)
  };
}

function etaToFinal(bus, plan) {
  if (bus.brokenDown) {
    return Infinity;
  }
  return etaToRoutePosition(bus, plan, plan.totalDistanceM);
}

function predictedDelayForDistance(plan, fromM, toM) {
  const total = plan.totalDistanceM;
  const distance = distanceAheadOnRoute(fromM, toM, total);
  const distanceShare = clamp(distance / Math.max(1, total), 0, 1);
  const traffic = trafficIntensity();
  const signalDelay = state.trafficSignals.filter((signal) => signal.planId === plan.id).length * (7 + traffic * 18) * distanceShare;
  const incidentDelay = state.incidents.filter((incident) => incident.planId === plan.id).reduce((sum, incident) => sum + incident.severity * (24 + traffic * 12), 0) * distanceShare;
  const crowdDelay = plan.stops.reduce((sum, stop) => sum + stop.crowd * (0.55 + traffic * 1.1), 0) * distanceShare;
  return signalDelay + incidentDelay + crowdDelay;
}

function renderSystemPanels() {
  if (ui.clockDisplay) {
    ui.clockDisplay.textContent = formatClock(state.virtualTimeSec);
  }
  if (ui.timeInput && document.activeElement !== ui.timeInput) {
    ui.timeInput.value = formatInputTime(state.virtualTimeSec);
  }
  if (ui.toggleSim) {
    ui.toggleSim.textContent = state.running ? "Pause" : "Run";
  }

  if (!state.routePlans.length) {
    if (ui.routeSummary) {
      ui.routeSummary.innerHTML = `
        <div><span>Routes</span><strong>Not built</strong></div>
        <div><span>Traffic</span><strong>-</strong></div>
      `;
    }
    if (ui.busList) {
      ui.busList.innerHTML = emptyList("No buses yet");
    }
    if (ui.stopEtaList) {
      ui.stopEtaList.innerHTML = emptyList("Build a route to see arrivals");
    }
    renderDelayGraph();
    renderTrafficSummary();
    return;
  }

  const bunching = state.buses.filter((bus) => bus.status === "bunching").length;
  const holding = state.buses.filter((bus) => bus.status === "holding").length;
  const traffic = state.buses.filter((bus) => bus.status === "traffic").length;
  const incidents = state.incidents.length;
  const routeNames = state.routePlans.map((plan) => plan.route?.shortName || plan.routeId).join(", ");
  const delays = calculateDelayMetrics();

  ui.routeSummary.innerHTML = `
    <div><span>Routes</span><strong>${escapeHtml(routeNames)}</strong></div>
    <div><span>Distance</span><strong>${formatDistance(totalNetworkDistance())}</strong></div>
    <div><span>Stops</span><strong>${uniqueRouteStops().length}</strong></div>
    <div><span>Traffic</span><strong>${trafficLabel()}</strong></div>
    <div><span>Signals</span><strong>${state.trafficSignals.length}</strong></div>
    <div><span>AI delay</span><strong>${formatDuration(delays.after)} after</strong></div>
    <div><span>Alerts</span><strong>${bunching} bunch / ${holding} hold / ${traffic} signal</strong></div>
    <div><span>Incidents</span><strong>${incidents}</strong></div>
  `;

  ui.busList.innerHTML = state.buses
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((bus) => {
      const plan = planForBus(bus);
      const next = plan ? nextStopForBus(bus, plan) : null;
      const busDetail = next
        ? `${escapeHtml(bus.routeId)} -> ${escapeHtml(next.stop.name)} in ${formatDuration(next.etaSec)}; ${Math.round(occupancyPct(bus) * 100)}% full`
        : "No route";
      return `
        <div class="list-item">
          <div>
            <strong>${escapeHtml(bus.id)} ${bus.speedKmph.toFixed(1)} km/h</strong>
            <span>${busDetail}</span>
          </div>
          <span class="tag ${bus.status}">${labelStatus(bus.status)}</span>
        </div>
      `;
    })
    .join("");

  ui.stopEtaList.innerHTML = uniqueRouteStops()
    .map(({ stop }) => {
      const arrival = state.stopArrivals.get(stop.id);
      const primary = arrival?.primary;
      const recommendation = arrival?.recommended;
      const noService = noServiceNotice(stop);
      return `
        <div class="list-item ${noService ? "blocked" : ""}">
          <div>
            <strong>${escapeHtml(stop.name)}${isMajorStop(stop) ? " *" : ""}</strong>
            <span>${noService ? escapeHtml(noService) : `Crowd ${stop.crowd}/5, boarding ${boardingRangeForStop(stop).min}-${boardingRangeForStop(stop).max}${recommendation ? `; ${escapeHtml(recommendation.message)}` : ""}`}</span>
          </div>
          <span>${noService ? "No bus" : primary ? `${primary.busId} ${primary.dwelling ? "holding" : formatDuration(primary.etaSec)}` : "No bus"}</span>
        </div>
      `;
    })
    .join("");

  if (ui.controlStatus && state.buses.length) {
    ui.controlStatus.textContent = "Headway AI uses dynamic holding at major stops; traffic and incidents create delay predictions.";
  }

  renderTrafficSummary();
  renderDelayGraph();
  renderEmergencyPanel();
  updateGpsPanel();
}

function renderTrafficSummary() {
  if (!ui.trafficSummary) {
    return;
  }
  const delays = calculateDelayMetrics();
  const redSignals = state.trafficSignals.filter((signal) => signalColor(signal) === "red").length;
  const intensity = trafficIntensity();
  ui.trafficSummary.innerHTML = `
    <div class="mini-stat"><span>Current traffic</span><strong>${trafficLabel()}</strong></div>
    <div class="mini-stat"><span>Intensity</span><strong>${Math.round(intensity * 100)}%</strong></div>
    <div class="mini-stat"><span>Active signals</span><strong>${redSignals}/${state.trafficSignals.length} red</strong></div>
    <div class="mini-stat"><span>Current delay without AI</span><strong>${formatDuration(delays.before)}</strong></div>
    <div class="mini-stat"><span>Current delay with AI</span><strong>${formatDuration(delays.after)}</strong></div>
    <div class="mini-stat"><span>AI resolved</span><strong>${formatDuration(delays.saved)}</strong></div>
  `;
}

function renderDelayGraph() {
  if (!ui.delayGraph) {
    return;
  }
  const delays = calculateDelayMetrics();
  const series = delaySeriesForCurrentDay();
  const max = Math.max(60, delays.before, delays.after, ...series.flatMap((point) => [point.before, point.after]));
  const chart = delayLineChart(series, max);
  ui.delayGraph.innerHTML = `
    <div class="delay-current">
      <div class="delay-row">
        <span>Now without AI</span>
        <strong>${formatDuration(delays.before)}</strong>
      </div>
      <div class="delay-row">
        <span>Now with AI</span>
        <strong>${formatDuration(delays.after)}</strong>
      </div>
    </div>
    <div class="delay-legend">
      <span><i class="before"></i> Without AI</span>
      <span><i class="after"></i> With AI</span>
    </div>
    <div class="delay-line-chart" role="img" aria-label="Delay prediction line graph">
      <svg viewBox="0 0 320 152" preserveAspectRatio="none">
        <line class="axis" x1="28" y1="116" x2="302" y2="116"></line>
        <line class="axis" x1="28" y1="18" x2="28" y2="116"></line>
        <path class="delay-line before" d="${chart.beforePath}"></path>
        <path class="delay-line after" d="${chart.afterPath}"></path>
        ${chart.beforePoints.map((point) => `<circle class="delay-dot before" cx="${point.x}" cy="${point.y}" r="${point.current ? 4 : 3}"></circle>`).join("")}
        ${chart.afterPoints.map((point) => `<circle class="delay-dot after" cx="${point.x}" cy="${point.y}" r="${point.current ? 4 : 3}"></circle>`).join("")}
        ${chart.labels.map((label) => `<text x="${label.x}" y="138">${label.text}</text>`).join("")}
      </svg>
      <div class="delay-line-readout">
        ${series.map((point) => `<span class="${point.isCurrent ? "current" : ""}">${formatShortClock(point.timeSec)} ${formatDuration(point.after)}</span>`).join("")}
      </div>
    </div>
  `;
}

function delayLineChart(series, max) {
  const left = 28;
  const right = 302;
  const top = 18;
  const bottom = 116;
  const width = right - left;
  const height = bottom - top;
  const pointFor = (point, index, key) => {
    const x = left + (series.length <= 1 ? 0 : (index / (series.length - 1)) * width);
    const y = bottom - (point[key] / Math.max(1, max)) * height;
    return {
      x: round(x, 1),
      y: round(y, 1),
      current: point.isCurrent
    };
  };
  const beforePoints = series.map((point, index) => pointFor(point, index, "before"));
  const afterPoints = series.map((point, index) => pointFor(point, index, "after"));
  const pathFor = (points) => points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  return {
    beforePoints,
    afterPoints,
    beforePath: pathFor(beforePoints),
    afterPath: pathFor(afterPoints),
    labels: series.map((point, index) => ({
      x: round(left + (series.length <= 1 ? 0 : (index / (series.length - 1)) * width), 1),
      text: formatShortClock(point.timeSec)
    }))
  };
}

function delaySeriesForCurrentDay() {
  const currentHour = Math.floor(state.virtualTimeSec / 3600);
  const hours = Array.from(new Set([
    clamp(currentHour - 2, 0, 23),
    currentHour,
    clamp(currentHour + 1, 0, 23),
    clamp(currentHour + 2, 0, 23),
    9,
    18
  ])).sort((a, b) => a - b);

  return hours.map((hour) => {
    const timeSec = hour * 3600;
    const metrics = calculateDelayMetrics(timeSec);
    return {
      timeSec,
      before: metrics.before,
      after: metrics.after,
      isCurrent: hour === currentHour
    };
  });
}

function calculateDelayMetrics(timeSec = state.virtualTimeSec) {
  const traffic = trafficIntensityAt(timeSec);
  const signalDelay = state.trafficSignals.length * (10 + traffic * 34);
  const incidentDelay = state.incidents.reduce((sum, incident) => sum + incident.severity * (38 + traffic * 42), 0);
  const routeDistanceDelay = state.routePlans.reduce((sum, plan) => sum + (plan.totalDistanceM / 1000) * (4 + traffic * 9), 0);
  const crowdDelay = uniqueRouteStops().reduce((sum, { stop }) => sum + stop.crowd * (1.1 + traffic * 3.4), 0);
  const bunchingDelay = state.buses.filter((bus) => bus.status === "bunching" || bus.holdIntentSec > 0).length * (22 + traffic * 16);
  const before = signalDelay + incidentDelay + routeDistanceDelay + crowdDelay + bunchingDelay;
  const holdingSavings = state.buses.filter((bus) => bus.holdIntentSec > 0 || bus.status === "holding").length * (22 + traffic * 16);
  const adaptiveSignalSavings = state.trafficSignals.length * (4 + traffic * 8);
  const occupancySavings = state.stopArrivals.size * (0.55 + traffic * 1.3);
  const aiReduction = before * (0.27 + traffic * 0.16) + holdingSavings + adaptiveSignalSavings + occupancySavings;
  const after = Math.max(0, before - aiReduction);
  return {
    before,
    after,
    saved: Math.max(0, before - after),
    traffic
  };
}

function emptyList(text) {
  return `<div class="list-item"><strong>${escapeHtml(text)}</strong><span>-</span></div>`;
}

function toggleSimulation() {
  state.running = !state.running;
  ui.toggleSim.textContent = state.running ? "Pause" : "Run";
  setStatus(state.running ? "Running" : "Paused", state.running ? "ok" : "warn");
}

function setManualTime() {
  state.virtualTimeSec = parseGtfsTime(ui.timeInput.value || "00:00:00") % 86400;
  state.lastTickMs = performance.now();
  updateStopArrivals();
  updateTrafficSignalIcons();
  renderSystemPanels();
}

function setBreakdown(isBroken) {
  const bus = state.buses.find((item) => item.id === ui.busSelect.value);
  if (!bus) {
    ui.controlStatus.textContent = "Choose a bus first.";
    return;
  }
  bus.brokenDown = isBroken;
  bus.speedKmph = isBroken ? 0 : Math.max(10, bus.normalSpeedKmph * 0.8);
  bus.status = isBroken ? "breakdown" : "normal";
  ui.controlStatus.textContent = isBroken
    ? `${bus.id} is marked for repair. Dispatch will boost the lagging bus to close the gap.`
    : `${bus.id} recovered and returned to service.`;
  applyHeadwayController();
  renderBuses();
  renderSystemPanels();
}

function recoverAllBuses() {
  state.buses.forEach((bus) => {
    bus.brokenDown = false;
    bus.status = "normal";
    bus.speedKmph = Math.max(12, bus.normalSpeedKmph * 0.9);
  });
  ui.controlStatus.textContent = "All buses recovered.";
  renderBuses();
  renderSystemPanels();
}

function setGpsFromInputs() {
  const lat = Number(ui.gpsLat.value);
  const lon = Number(ui.gpsLon.value);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    ui.gpsStatus.textContent = "Enter a valid latitude and longitude.";
    return;
  }
  setGpsLocation({ lat, lon });
}

function setGpsLocation(location) {
  state.userLocation = location;
  renderGps();
  updateGpsPanel();
  setStatus("GPS set");
}

function renderGps() {
  if (!state.gpsLayer) {
    return;
  }
  if (!state.userLocation) {
    return;
  }
  const latLng = [state.userLocation.lat, state.userLocation.lon];
  if (state.gpsMarker) {
    state.gpsMarker.setLatLng(latLng);
    state.gpsMarker.setPopupContent(gpsPopup());
  } else {
    state.gpsMarker = L.marker(latLng, {
      icon: gpsIcon(),
      title: "My GPS location"
    }).addTo(state.gpsLayer);
    state.gpsMarker.bindPopup(gpsPopup());
  }
}

function gpsIcon() {
  return L.divIcon({
    className: "gps-icon",
    html: "<span></span>",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16]
  });
}

function gpsPopup() {
  const nearest = nearestStopToLocation(state.userLocation);
  if (!nearest) {
    return "<h4 class=\"popup-title\">My GPS location</h4><p>No stops loaded.</p>";
  }
  const arrival = state.stopArrivals.get(nearest.stop.id);
  const primary = arrival?.primary;
  const recommendation = arrival?.recommended;
  const routeDetails = routeTerminalDetailsForStop(nearest.stop.id);
  return `
    <h4 class="popup-title">My GPS location</h4>
    <div class="popup-grid">
      <div><span>Nearest stop</span><strong>${escapeHtml(nearest.stop.name)}</strong></div>
      <div><span>Walk distance</span><strong>${formatDistance(nearest.distanceM)}</strong></div>
      <div><span>Next bus</span><strong>${primary ? primary.busId : "No bus"}</strong></div>
      <div><span>ETA</span><strong>${primary ? formatDuration(primary.etaSec) : "-"}</strong></div>
      <div><span>Final stop</span><strong>${primary ? escapeHtml(primary.finalStop.name) : "-"}</strong></div>
      <div><span>Advice</span><strong>${recommendation ? escapeHtml(recommendation.busId) : "Fastest bus"}</strong></div>
    </div>
    ${routeDetails.length ? `
      <h4 class="popup-subtitle">Intermediate routes</h4>
      <div class="route-detail-list">
        ${routeDetails.map((detail) => `
          <div class="route-detail-item">
            <strong>${escapeHtml(detail.routeName)}</strong>
            <span>${escapeHtml(detail.startTerminal)} to ${escapeHtml(detail.endTerminal)}</span>
          </div>
        `).join("")}
      </div>
    ` : `<div class="ai-advice">No loaded route uses this stop as an intermediate stop.</div>`}
  `;
}

function updateGpsPanel() {
  if (!ui.gpsStatus) {
    return;
  }
  if (!state.userLocation) {
    ui.gpsStatus.innerHTML = "Set a GPS location to find the nearest stop and next bus.";
    return;
  }
  const nearest = nearestStopToLocation(state.userLocation);
  if (!nearest) {
    ui.gpsStatus.innerHTML = "No stops are available yet.";
    return;
  }
  const arrival = state.stopArrivals.get(nearest.stop.id);
  const primary = arrival?.primary;
  const recommendation = arrival?.recommended;
  const routeDetails = routeTerminalDetailsForStop(nearest.stop.id);
  ui.gpsStatus.innerHTML = `
    <div class="list-item">
      <div>
        <strong>${escapeHtml(nearest.stop.name)}</strong>
        <span>${formatDistance(nearest.distanceM)} away; ${primary ? `${primary.busId} in ${formatDuration(primary.etaSec)} to ${escapeHtml(primary.finalStop.name)}` : "no bus due"}</span>
      </div>
      <span>${recommendation ? `Use ${recommendation.busId}` : "Nearest"}</span>
    </div>
    ${routeDetails.length ? `
      <div class="route-detail-list">
        ${routeDetails.map((detail) => `
          <div class="list-item route-detail-item">
            <div>
              <strong>${escapeHtml(detail.routeName)}</strong>
              <span>Intermediate stop between ${escapeHtml(detail.startTerminal)} and ${escapeHtml(detail.endTerminal)}</span>
            </div>
            <span>${detail.nextBus ? `${escapeHtml(detail.nextBus.busId)} ${formatDuration(detail.nextBus.etaSec)}` : "Route"}</span>
          </div>
        `).join("")}
      </div>
    ` : `<div class="ai-advice">No loaded route uses ${escapeHtml(nearest.stop.name)} as an intermediate stop.</div>`}
    ${recommendation ? `<div class="ai-advice">${escapeHtml(recommendation.message)}</div>` : ""}
  `;
}

function routeTerminalDetailsForStop(stopId) {
  if (!state.dataset) {
    return [];
  }
  return state.dataset.routes
    .map((route) => {
      const trip = representativeTripForRoute(route.id);
      if (!trip) {
        return null;
      }
      const stops = getTripStops(trip.id);
      const index = stops.findIndex((stop) => stop.id === stopId);
      if (index <= 0 || index >= stops.length - 1) {
        return null;
      }
      const arrival = state.stopArrivals.get(stopId);
      const nextBus = arrival?.candidates?.find((candidate) => candidate.routeId === route.id) || null;
      return {
        routeId: route.id,
        routeName: route.shortName || route.id,
        startTerminal: stops[0]?.name || "Start terminal",
        endTerminal: stops[stops.length - 1]?.name || "End terminal",
        nextBus
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.routeName.localeCompare(b.routeName));
}

function nearestStopToLocation(location) {
  let best = null;
  uniqueRouteStops().forEach(({ stop }) => {
    const distanceM = haversineMeters(location, stop);
    if (!best || distanceM < best.distanceM) {
      best = { stop, distanceM };
    }
  });
  return best;
}

function enableMapPick(mode) {
  state.mapPickMode = mode;
  if (mode === "gps") {
    ui.gpsStatus.textContent = "Click the map to set your location.";
    setStatus("Pick GPS", "warn");
    return;
  }
  ui.incidentStatus.textContent = "Click the map to place the incident.";
  setStatus("Pick incident", "warn");
}

function handleMapClick(event) {
  const latlng = event?.latlng;
  if (!latlng || !state.mapPickMode) {
    return;
  }
  const point = { lat: latlng.lat, lon: latlng.lng };
  if (state.mapPickMode === "gps") {
    ui.gpsLat.value = point.lat.toFixed(6);
    ui.gpsLon.value = point.lon.toFixed(6);
    setGpsLocation(point);
  } else if (state.mapPickMode === "incident") {
    ui.incidentLat.value = point.lat.toFixed(6);
    ui.incidentLon.value = point.lon.toFixed(6);
    ui.incidentStatus.textContent = "Incident point selected. Choose the type and plot it.";
    setStatus("Incident picked", "warn");
  }
  state.mapPickMode = null;
}

async function addIncidentFromInputs() {
  if (!state.routePlans.length) {
    ui.incidentStatus.textContent = "Build a route before plotting an accident or diversion.";
    return;
  }
  const lat = Number(ui.incidentLat.value);
  const lon = Number(ui.incidentLon.value);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    ui.incidentStatus.textContent = "Enter a valid incident latitude and longitude.";
    return;
  }
  const nearest = nearestPointAcrossPlans({ lat, lon });
  if (!nearest) {
    ui.incidentStatus.textContent = "No route geometry is available.";
    return;
  }
  const type = ui.incidentType.value || "accident";
  const severity = clamp(Number(ui.incidentSeverity.value) || 2, 1, 3);
  ui.incidentStatus.textContent = "Finding a road-based bypass around the incident...";
  setStatus("Routing detour...", "warn");
  const detour = await buildIncidentDetourForPosition(nearest.plan, nearest.positionM, severity);
  const incident = {
    id: `INC-${Date.now().toString(36)}-${state.incidents.length + 1}`,
    type,
    typeLabel: labelIncidentType(type),
    severity,
    lat,
    lon,
    planId: nearest.plan.id,
    routeId: nearest.plan.routeId,
    positionM: nearest.positionM,
    detourStartPositionM: detour.startPositionM,
    detourEndPositionM: detour.endPositionM,
    detourPath: detour.path,
    detourSource: detour.source,
    detourClearanceM: detour.clearanceM,
    createdAtSec: state.virtualTimeSec
  };
  state.incidents.push(incident);
  if (ui.emergencySource) {
    ui.emergencySource.value = "incident";
  }
  renderIncidents();
  updateStopArrivals();
  renderSystemPanels();
  ui.incidentStatus.textContent = `${incident.typeLabel} plotted on ${incident.routeId}. Buses will detour and affected stops receive alerts.`;
  setStatus("Incident active", "warn");
}

function clearIncidents() {
  state.incidents = [];
  state.incidentLayer.clearLayers();
  state.incidentMarkers.clear();
  state.buses.forEach((bus) => {
    bus.lastIncidentId = null;
    bus.detourRemainingSec = 0;
    bus.detourTotalSec = 0;
    bus.detourElapsedSec = 0;
    bus.detourPath = null;
    bus.detourRejoinPositionM = null;
    bus.displayPoint = null;
  });
  if (ui.incidentStatus) {
    ui.incidentStatus.textContent = "Incident layer cleared.";
  }
  updateStopArrivals();
  renderSystemPanels();
}

function renderIncidents() {
  if (!state.incidentLayer) {
    return;
  }
  state.incidentLayer.clearLayers();
  state.incidentMarkers.clear();
  state.incidents.forEach((incident) => {
    const marker = L.marker([incident.lat, incident.lon], {
      icon: incidentIcon(incident),
      title: incident.typeLabel
    }).addTo(state.incidentLayer);
    marker.bindPopup(incidentPopup(incident));
    state.incidentMarkers.set(incident.id, marker);
    const detour = detourPolylineForIncident(incident);
    if (detour) {
      L.polyline(detour, {
        color: incident.type === "blocked" ? "#dc2f3f" : "#8a5a00",
        weight: 4,
        opacity: 0.72,
        dashArray: "7 8"
      }).addTo(state.incidentLayer);
    }
  });
}

function incidentIcon(incident) {
  return L.divIcon({
    className: `incident-icon ${incident.type}`,
    html: "<span>!</span>",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  });
}

function incidentPopup(incident) {
  return `
    <h4 class="popup-title">${escapeHtml(incident.typeLabel)}</h4>
    <div class="popup-grid">
      <div><span>Route</span><strong>${escapeHtml(incident.routeId)}</strong></div>
      <div><span>Severity</span><strong>${incident.severity}/3</strong></div>
      <div><span>Action</span><strong>Bypass and rejoin after ${formatDistance((incident.detourEndPositionM ?? incident.positionM) - (incident.detourStartPositionM ?? incident.positionM))}</strong></div>
      <div><span>Detour</span><strong>${escapeHtml(incident.detourSource || "Road bypass")}</strong></div>
      <div><span>Stop alert</span><strong>${incident.type === "blocked" ? "No service to blocked stops" : "Delay warning"}</strong></div>
    </div>
  `;
}

function detourPolylineForIncident(incident) {
  const plan = state.routePlans.find((item) => item.id === incident.planId);
  if (!plan) {
    return null;
  }
  if (incident.detourPath?.length) {
    return incident.detourPath;
  }
  return syntheticIncidentDetourForPosition(plan, incident.positionM, incident.severity).path;
}

async function buildIncidentDetourForPosition(plan, positionM, severity) {
  const fallback = syntheticIncidentDetourForPosition(plan, positionM, severity);
  const cacheKey = detourCacheKey(plan, positionM, severity);
  const cached = loadJson(cacheKey);
  if (cached?.path?.length) {
    return cached;
  }

  const incidentPoint = positionAtDistance(plan, positionM);
  const candidates = roadDetourCandidates(plan, positionM, severity, fallback);
  const avoidRadiusM = 140 + severity * 95;
  const roadOptions = [];

  for (const candidate of candidates) {
    const road = await roadDetourViaWaypoint(candidate.start, candidate.via, candidate.end);
    if (!road?.path?.length) {
      continue;
    }
    const clearanceM = minDistanceToLatLngPath(incidentPoint, road.path);
    roadOptions.push({
      ...candidate,
      path: road.path,
      distanceM: road.distanceM,
      durationSec: road.durationSec,
      clearanceM
    });
  }

  const usable = roadOptions
    .filter((option) => option.clearanceM >= avoidRadiusM)
    .sort((a, b) => a.distanceM - b.distanceM)[0];
  const best = usable || roadOptions.sort((a, b) => b.clearanceM - a.clearanceM || a.distanceM - b.distanceM)[0];

  if (best) {
    const detour = {
      startPositionM: fallback.startPositionM,
      endPositionM: fallback.endPositionM,
      path: best.path,
      source: best.clearanceM >= avoidRadiusM ? "OSRM road bypass" : "OSRM nearest road bypass",
      clearanceM: best.clearanceM,
      distanceM: best.distanceM,
      durationSec: best.durationSec
    };
    saveJson(cacheKey, detour);
    return detour;
  }

  saveJson(cacheKey, fallback);
  return fallback;
}

function syntheticIncidentDetourForPosition(plan, positionM, severity) {
  const startPositionM = Math.max(0, positionM - INCIDENT_LOOKAHEAD_M);
  const endPositionM = Math.min(plan.totalDistanceM, positionM + DETOUR_REJOIN_M);
  const start = positionAtDistance(plan, startPositionM);
  const incidentPoint = positionAtDistance(plan, positionM);
  const end = positionAtDistance(plan, endPositionM);
  const bearing = bearingVector(start, end);
  const offsetScale = (0.004 + severity * 0.0014) * (positionM % 2 > 1 ? -1 : 1);
  const mid = {
    lat: incidentPoint.lat + bearing.normalLat * offsetScale,
    lon: incidentPoint.lon + bearing.normalLon * offsetScale
  };
  return {
    startPositionM,
    endPositionM,
    source: "Offline estimated bypass",
    clearanceM: haversineMeters(incidentPoint, mid),
    path: [
      [start.lat, start.lon],
      [mid.lat, mid.lon],
      [end.lat, end.lon]
    ]
  };
}

function roadDetourCandidates(plan, positionM, severity, base) {
  const start = positionAtDistance(plan, base.startPositionM);
  const end = positionAtDistance(plan, base.endPositionM);
  const incidentPoint = positionAtDistance(plan, positionM);
  const normal = bearingVector(start, end);
  const degreesPerMeterLat = 1 / 111320;
  const degreesPerMeterLon = 1 / (111320 * Math.cos(toRad(incidentPoint.lat)) || 111320);
  const distancesM = [420 + severity * 120, 680 + severity * 150, 930 + severity * 170];
  const candidates = [];

  [-1, 1].forEach((side) => {
    distancesM.forEach((offsetM) => {
      candidates.push({
        start,
        end,
        via: {
          lat: incidentPoint.lat + normal.normalLat * offsetM * degreesPerMeterLat * side,
          lon: incidentPoint.lon + normal.normalLon * offsetM * degreesPerMeterLon * side
        }
      });
    });
  });

  return candidates;
}

async function roadDetourViaWaypoint(start, via, end) {
  const coords = [start, via, end].map((point) => `${point.lon},${point.lat}`).join(";");
  const url = `${OSRM_BASE}${coords}?alternatives=3&steps=false&geometries=geojson&overview=full&annotations=false`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    if (data.code !== "Ok" || !data.routes?.length) {
      throw new Error("No OSRM detour route");
    }
    const routes = data.routes.map((route) => ({
      distanceM: route.distance,
      durationSec: route.duration,
      path: route.geometry.coordinates.map(([lon, lat]) => [lat, lon])
    }));
    return routes.sort((a, b) => a.distanceM - b.distanceM)[0];
  } catch (error) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function noServiceNotice(stop) {
  const memberships = plansForStop(stop.id);
  for (const { plan, index } of memberships) {
    const stopPosition = plan.stopPositions[index] || 0;
    const blocked = state.incidents.find((incident) => {
      if (incident.planId !== plan.id || incident.type !== "blocked") {
        return false;
      }
      const ahead = distanceAheadOnRoute(incident.positionM, stopPosition, plan.totalDistanceM);
      return ahead > 0 && ahead < INCIDENT_IMPACT_M * incident.severity;
    });
    if (blocked) {
      return `${blocked.typeLabel} blocks the route before this stop. Stop is signaled as no bus service.`;
    }
  }
  return "";
}

function sendEmergencyAid() {
  const source = emergencySourcePoint();
  if (!source) {
    ui.emergencyStatus.textContent = "Set GPS or create buses before sending emergency aid.";
    return;
  }
  const hospital = nearestHospital(source);
  const distanceM = haversineMeters(source, hospital);
  const message = {
    id: `EMR-${Date.now().toString(36)}`,
    time: formatClock(state.virtualTimeSec),
    hospital: hospital.name,
    distanceM,
    sourceLabel: source.label,
    text: `Emergency from ${source.label}. Notify ${hospital.name} and traffic headquarter to clear a corridor for ${formatDistance(distanceM)}.`
  };
  state.emergencyLog.unshift(message);
  state.emergencyLog = state.emergencyLog.slice(0, 5);
  renderEmergencyRoute(source, hospital);
  renderEmergencyPanel();
  setStatus("Emergency sent", "error");
}

function emergencySourcePoint() {
  if (ui.emergencySource?.value === "incident" && state.incidents.length) {
    const incident = state.incidents[state.incidents.length - 1];
    return { lat: incident.lat, lon: incident.lon, label: `${incident.typeLabel} incident` };
  }
  if (ui.emergencySource?.value === "gps" && state.userLocation) {
    return { ...state.userLocation, label: "manual GPS location" };
  }
  const selectedBus = state.buses.find((bus) => bus.id === ui.busSelect?.value) || state.buses[0];
  if (selectedBus) {
    const plan = planForBus(selectedBus);
    const point = busMapPoint(selectedBus, plan);
    return { ...point, label: selectedBus.id };
  }
  if (state.userLocation) {
    return { ...state.userLocation, label: "manual GPS location" };
  }
  return null;
}

function nearestHospital(point) {
  return HOSPITALS.reduce((best, hospital) => {
    const distanceM = haversineMeters(point, hospital);
    return !best || distanceM < best.distanceM ? { ...hospital, distanceM } : best;
  }, null);
}

function renderEmergencyRoute(source, hospital) {
  state.emergencyLayer.clearLayers();
  L.marker([hospital.lat, hospital.lon], {
    icon: hospitalIcon(),
    title: hospital.name
  }).addTo(state.emergencyLayer);
  L.polyline(
    [
      [source.lat, source.lon],
      [hospital.lat, hospital.lon]
    ],
    { color: "#dc2f3f", weight: 4, opacity: 0.78, dashArray: "8 8" }
  ).addTo(state.emergencyLayer);
}

function hospitalIcon() {
  return L.divIcon({
    className: "hospital-icon",
    html: "<span>H</span>",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
  });
}

function renderEmergencyPanel() {
  if (!ui.emergencyStatus) {
    return;
  }
  if (!state.emergencyLog.length) {
    ui.emergencyStatus.innerHTML = "Emergency aid is ready. It will notify the nearest hospital and traffic headquarter.";
    return;
  }
  ui.emergencyStatus.innerHTML = state.emergencyLog
    .map((item) => `
      <div class="list-item emergency-item">
        <div>
          <strong>${escapeHtml(item.time)} -> ${escapeHtml(item.hospital)}</strong>
          <span>${escapeHtml(item.text)}</span>
        </div>
        <span>${formatDistance(item.distanceM)}</span>
      </div>
    `)
    .join("");
}

function exportCurrentRoute() {
  if (!state.routePlans.length) {
    ui.routeStatus.textContent = "Build a route before exporting.";
    return;
  }
  downloadJson(`routes-${new Date().toISOString().slice(0, 10)}.json`, {
    version: 2,
    routePlans: state.routePlans,
    incidents: state.incidents,
    exportedAt: new Date().toISOString()
  });
}

async function importRouteFile(event) {
  const file = event.target.files[0];
  if (!file) {
    return;
  }
  try {
    const imported = JSON.parse(await file.text());
    const plans = Array.isArray(imported.routePlans) ? imported.routePlans : [imported];
    if (!plans.every((plan) => plan.points && plan.stopPositions && plan.stops && plan.legs)) {
      throw new Error("Imported file is not an Open Transit AI route export.");
    }
    state.routePlans = plans.map(normalizePlan);
    state.routePlan = state.routePlans[0];
    state.selectedRouteIds = state.routePlans.map((plan) => plan.routeId);
    state.selectedRouteId = state.routePlan.routeId;
    state.selectedTripId = state.routePlan.tripId;
    state.incidents = imported.incidents || [];
    createTrafficModel();
    ui.routeStatus.textContent = `Imported ${state.routePlans.length} route${state.routePlans.length > 1 ? "s" : ""}.`;
    setStatus("Route imported");
    afterRouteReady();
  } catch (error) {
    ui.routeStatus.textContent = error.message;
    setStatus("Import error", "error");
  } finally {
    event.target.value = "";
  }
}

function downloadGtfsRtSnapshot() {
  if (!state.routePlans.length || !state.buses.length) {
    ui.controlStatus.textContent = "Create buses before exporting synthetic GTFS RT data.";
    return;
  }
  downloadJson(`synthetic-gtfs-rt-${formatClock(state.virtualTimeSec).replace(/:/g, "")}.json`, {
    header: {
      gtfs_realtime_version: "2.0",
      incrementality: "FULL_DATASET",
      timestamp: Math.floor(Date.now() / 1000)
    },
    entity: state.buses.map((bus) => {
      const plan = planForBus(bus);
      const point = busMapPoint(bus, plan);
      const next = nextStopForBus(bus, plan);
      return {
        id: bus.id,
        vehicle: {
          trip: {
            trip_id: plan.tripId,
            route_id: plan.routeId,
            start_time: formatClock(state.virtualTimeSec)
          },
          vehicle: {
            id: bus.id,
            label: bus.id
          },
          position: {
            latitude: round(point.lat, 6),
            longitude: round(point.lon, 6),
            speed: round((bus.speedKmph * 1000) / 3600, 2)
          },
          occupancy_status: occupancyPct(bus) >= FULL_BUS_THRESHOLD ? "FULL" : "MANY_SEATS_AVAILABLE",
          current_stop_sequence: next.index + 1,
          current_status: bus.brokenDown || bus.dwellRemainingSec > 0 ? "STOPPED_AT" : "IN_TRANSIT_TO",
          timestamp: Math.floor(Date.now() / 1000)
        },
        simulation: {
          speed_kmph: round(bus.speedKmph, 2),
          status: bus.status,
          breakdown: bus.brokenDown,
          occupancy: bus.occupancy,
          capacity: bus.capacity,
          route_distance_m: round(bus.routeDistanceM, 1),
          eta_next_stop_sec: Number.isFinite(next.etaSec) ? round(next.etaSec, 1) : null,
          next_stop_dwell_sec: dwellSecondsForStop(next.stop),
          dwell_stop_id: bus.dwellStopId,
          dwell_remaining_sec: round(Math.max(0, bus.dwellRemainingSec || 0), 1),
          traffic_wait_remaining_sec: round(Math.max(0, bus.trafficWaitRemainingSec || 0), 1),
          detour_remaining_sec: round(Math.max(0, bus.detourRemainingSec || 0), 1),
          eta_final_stop_sec: Number.isFinite(etaToFinal(bus, plan)) ? round(etaToFinal(bus, plan), 1) : null,
          control_note: bus.controlNote
        }
      };
    }),
    traffic: {
      traffic_label: trafficLabel(),
      traffic_intensity: trafficIntensity(),
      signals: state.trafficSignals.length,
      incidents: state.incidents.length,
      predicted_delay: calculateDelayMetrics()
    }
  });
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function mapLimit(items, limit, mapper, onProgress) {
  const results = new Array(items.length);
  let next = 0;
  let done = 0;

  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await mapper(items[index], index);
      done += 1;
      onProgress(done, items.length);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function routeCacheKey(routeId, tripId, stops) {
  const seed = `${routeId}|${tripId}|${stops.map((stop) => `${stop.id}:${round(stop.lat, 5)},${round(stop.lon, 5)}`).join(">")}`;
  return `${ROUTE_CACHE_PREFIX}${hashString(seed)}`;
}

function legCacheKey(from, to) {
  const seed = `${round(from.lat, 5)},${round(from.lon, 5)}>${round(to.lat, 5)},${round(to.lon, 5)}`;
  return `${LEG_CACHE_PREFIX}${hashString(seed)}`;
}

function detourCacheKey(plan, positionM, severity) {
  const seed = `${plan.id}:${round(positionM, 0)}:${severity}:${round(plan.totalDistanceM, 0)}`;
  return `${DETOUR_CACHE_PREFIX}${hashString(seed)}`;
}

function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("Route cache skipped:", error);
  }
}

function loadJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn("Route cache read failed:", error);
    return null;
  }
}

function nearestPointAcrossPlans(point) {
  return state.routePlans
    .map((plan) => ({ plan, ...nearestPointOnPlan(plan, point) }))
    .sort((a, b) => a.distanceM - b.distanceM)[0] || null;
}

function nearestPointOnPlan(plan, point) {
  let best = { distanceM: Infinity, positionM: 0, point: plan.points[0] };
  for (let i = 1; i < plan.points.length; i += 1) {
    const a = plan.points[i - 1];
    const b = plan.points[i];
    const projected = projectPointToSegment(point, a, b);
    const distanceM = haversineMeters(point, projected);
    if (distanceM < best.distanceM) {
      const segStartM = plan.cumulative[i - 1] || 0;
      const segEndM = plan.cumulative[i] || segStartM;
      best = {
        distanceM,
        positionM: segStartM + (segEndM - segStartM) * projected.t,
        point: projected
      };
    }
  }
  return best;
}

function projectPointToSegment(point, a, b) {
  const ax = a.lon;
  const ay = a.lat;
  const bx = b.lon;
  const by = b.lat;
  const px = point.lon;
  const py = point.lat;
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const lengthSquared = vx * vx + vy * vy;
  const t = lengthSquared === 0 ? 0 : clamp((wx * vx + wy * vy) / lengthSquared, 0, 1);
  return {
    lat: ay + vy * t,
    lon: ax + vx * t,
    t
  };
}

function positionAtDistance(plan, distanceM) {
  const total = plan.totalDistanceM;
  const distance = clamp(distanceM, 0, total);
  const cumulative = plan.cumulative;
  let low = 0;
  let high = cumulative.length - 1;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (cumulative[mid] < distance) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  const index = Math.max(1, low);
  const prevDist = cumulative[index - 1] || 0;
  const nextDist = cumulative[index] || prevDist;
  const ratio = nextDist === prevDist ? 0 : (distance - prevDist) / (nextDist - prevDist);
  const prev = plan.points[index - 1] || plan.points[0];
  const next = plan.points[index] || prev;

  return {
    lat: prev.lat + (next.lat - prev.lat) * ratio,
    lon: prev.lon + (next.lon - prev.lon) * ratio
  };
}

function busMapPoint(bus, plan) {
  return bus.displayPoint || positionAtDistance(plan, bus.routeDistanceM);
}

function pointAlongLatLngPolyline(path, progress) {
  if (!path?.length) {
    return null;
  }
  if (path.length === 1) {
    return { lat: path[0][0], lon: path[0][1] };
  }
  const total = Math.max(1, polylineDistanceM(path));
  const target = total * clamp(progress, 0, 1);
  let walked = 0;

  for (let index = 1; index < path.length; index += 1) {
    const from = { lat: path[index - 1][0], lon: path[index - 1][1] };
    const to = { lat: path[index][0], lon: path[index][1] };
    const distance = haversineMeters(from, to);
    if (walked + distance >= target) {
      const ratio = distance <= 0 ? 0 : (target - walked) / distance;
      return {
        lat: from.lat + (to.lat - from.lat) * ratio,
        lon: from.lon + (to.lon - from.lon) * ratio
      };
    }
    walked += distance;
  }

  const last = path[path.length - 1];
  return { lat: last[0], lon: last[1] };
}

function polylineDistanceM(path) {
  if (!path?.length) {
    return 0;
  }
  let distance = 0;
  for (let index = 1; index < path.length; index += 1) {
    distance += haversineMeters(
      { lat: path[index - 1][0], lon: path[index - 1][1] },
      { lat: path[index][0], lon: path[index][1] }
    );
  }
  return distance;
}

function minDistanceToLatLngPath(point, path) {
  if (!path?.length) {
    return Infinity;
  }
  let best = Infinity;
  for (let index = 1; index < path.length; index += 1) {
    const projected = projectPointToSegment(
      point,
      { lat: path[index - 1][0], lon: path[index - 1][1] },
      { lat: path[index][0], lon: path[index][1] }
    );
    best = Math.min(best, haversineMeters(point, projected));
  }
  if (path.length === 1) {
    best = haversineMeters(point, { lat: path[0][0], lon: path[0][1] });
  }
  return best;
}

function bearingVector(start, end) {
  const dx = end.lon - start.lon;
  const dy = end.lat - start.lat;
  const length = Math.hypot(dx, dy) || 1;
  return {
    normalLat: -dx / length,
    normalLon: dy / length
  };
}

function turnAngle(previous, current, next) {
  const ax = current.lon - previous.lon;
  const ay = current.lat - previous.lat;
  const bx = next.lon - current.lon;
  const by = next.lat - current.lat;
  const aLength = Math.hypot(ax, ay);
  const bLength = Math.hypot(bx, by);
  if (!aLength || !bLength) {
    return 0;
  }
  const dot = (ax * bx + ay * by) / (aLength * bLength);
  return Math.acos(clamp(dot, -1, 1));
}

function totalNetworkDistance() {
  return state.routePlans.reduce((sum, plan) => sum + plan.totalDistanceM, 0);
}

function finalStopForPlan(plan) {
  return plan.stops[plan.stops.length - 1] || { name: "Final stop" };
}

function isMajorStop(stop, index = null, plan = null) {
  if (!stop) {
    return false;
  }
  if (stop.crowd >= 4 || SIGNAL_NAME_RE.test(stop.name)) {
    return true;
  }
  if (plan && (index === 0 || index === plan.stops.length - 1)) {
    return true;
  }
  return false;
}

function trafficSpeedFactor(plan) {
  const traffic = trafficIntensity();
  const incidentPenalty = state.incidents.filter((incident) => incident.planId === plan?.id).reduce((sum, incident) => sum + incident.severity * 0.025, 0);
  return clamp(1 - traffic * 0.12 - incidentPenalty, 0.82, 1);
}

function targetSpeedForBus(bus, plan) {
  const base = bus.normalSpeedKmph * trafficSpeedFactor(plan);
  if (bus.breakdownBoostSec > 0) {
    return clamp(base + 4.5, CRUISE_SPEED_KMPH, BOOST_SPEED_KMPH);
  }
  return clamp(base, CRUISE_SPEED_KMPH - 4, TOP_SPEED_KMPH);
}

function trafficIntensity() {
  return trafficIntensityAt(state.virtualTimeSec);
}

function trafficIntensityAt(timeSec) {
  return trafficProfileAt(timeSec).intensity;
}

function trafficLabel() {
  return trafficLabelAt(state.virtualTimeSec);
}

function trafficLabelAt(timeSec) {
  return trafficProfileAt(timeSec).label;
}

function trafficProfileAt(timeSec) {
  const seconds = wrapClock(timeSec);
  return TRAFFIC_WINDOWS.find((window) => seconds >= window.start && seconds < window.end) || TRAFFIC_WINDOWS[0];
}

function occupancyPct(bus) {
  return bus.capacity ? bus.occupancy / bus.capacity : 0;
}

function labelStatus(status) {
  return {
    normal: "Normal",
    dwelling: "Dwelling",
    holding: "Holding",
    bunching: "Bunching",
    "excess-gap": "Gap",
    traffic: "Signal",
    diversion: "Detour",
    breakdown: "Repair"
  }[status] || status;
}

function labelIncidentType(type) {
  return {
    accident: "Accident",
    diversion: "Diversion",
    blocked: "No available road"
  }[type] || "Incident";
}

function normalizeColor(value, fallback) {
  if (!value) {
    return fallback;
  }
  const text = value.startsWith("#") ? value : `#${value}`;
  return /^#[0-9a-f]{6}$/i.test(text) ? text : fallback;
}

function seededRating(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return (hash % 5) + 1;
}

function hashString(text) {
  return hashNumber(text).toString(36);
}

function hashNumber(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function haversineMeters(a, b) {
  const earth = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad((b.lon ?? b.lng) - (a.lon ?? a.lng));
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(h)));
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function parseGtfsTime(value) {
  const parts = String(value || "0:0:0")
    .split(":")
    .map((part) => Number(part));
  const [hours = 0, minutes = 0, seconds = 0] = parts;
  return hours * 3600 + minutes * 60 + seconds;
}

function formatClock(value) {
  const seconds = Math.floor(wrapClock(value));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function formatShortClock(value) {
  const seconds = Math.floor(wrapClock(value));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${pad(h)}:${pad(m)}`;
}

function formatInputTime(value) {
  return formatClock(value);
}

function wrapClock(value) {
  return ((value % 86400) + 86400) % 86400;
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) {
    return "repair";
  }
  if (seconds < 60) {
    return `${Math.max(0, Math.round(seconds))} sec`;
  }
  const mins = Math.floor(seconds / 60);
  const sec = Math.round(seconds % 60);
  return `${mins}m ${pad(sec)}s`;
}

function formatDistance(meters) {
  if (!Number.isFinite(meters)) {
    return "-";
  }
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

function wrapDistance(value, total) {
  return ((value % total) + total) % total;
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value, places) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
