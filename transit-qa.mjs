import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const appPath = fileURLToPath(new URL("./app.js", import.meta.url));
const appSource = await readFile(appPath, "utf8");
const callbacks = new Map();
const elements = new Map();
const markers = [];
const layers = [];
const downloads = [];

class FakeElement {
  constructor(id = "", tag = "div") {
    this.id = id;
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.listeners = {};
    this.files = [];
    this.style = {};
    this.classList = {
      values: new Set(),
      toggle: (name, enabled) => {
        if (enabled) {
          this.classList.values.add(name);
        } else {
          this.classList.values.delete(name);
        }
      }
    };
    this._innerHTML = "";
    this._textContent = "";
    this._value = "";
    this.selected = false;
    this.disabled = false;
  }

  addEventListener(type, handler) {
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push(handler);
  }

  async trigger(type, event = { target: this }) {
    const handlers = this.listeners[type] || [];
    for (const handler of handlers) {
      await handler(event);
    }
  }

  appendChild(child) {
    this.children.push(child);
    if (this.tagName === "SELECT" && this.children.length === 1 && !this.multiple && !this._value) {
      this._value = child.value;
    }
    return child;
  }

  remove() {
    this.removed = true;
  }

  click() {
    downloads.push(this.download || this.id || this.tagName);
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
    if (this.tagName === "SELECT") {
      this.children = [];
      this._value = "";
    }
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set textContent(value) {
    this._textContent = String(value);
  }

  get textContent() {
    return this._textContent;
  }

  set value(value) {
    this._value = String(value);
    if (this.tagName === "SELECT") {
      this.children.forEach((child) => {
        child.selected = child.value === this._value;
      });
    }
  }

  get value() {
    if (this.tagName === "SELECT" && !this._value) {
      const selected = this.children.find((child) => child.selected && !child.disabled);
      return selected ? selected.value : this.children.find((child) => !child.disabled)?.value || "";
    }
    return this._value;
  }

  get selectedOptions() {
    if (this.tagName !== "SELECT") {
      return [];
    }
    const selected = this.children.filter((child) => child.selected && !child.disabled);
    return selected.length ? selected : this.children.filter((child) => !child.disabled && !this.multiple).slice(0, 1);
  }
}

function element(id) {
  if (!elements.has(id)) {
    const el = new FakeElement(id, id.includes("select") || id.endsWith("source") || id.endsWith("type") ? "select" : "div");
    if (id === "route-select") {
      el.multiple = true;
    }
    elements.set(id, el);
  }
  return elements.get(id);
}

const ids = [
  "map-style", "load-demo", "load-files", "file-stops", "file-stop-times", "file-routes", "file-trips", "route-select",
  "build-route", "export-route", "import-route", "toggle-sim", "time-input", "set-time", "time-scale", "scale-readout",
  "bus-count", "reset-buses", "gps-lat", "gps-lon", "set-gps", "gps-pick-map", "gps-status", "incident-type",
  "incident-lat", "incident-lon", "incident-severity", "add-incident", "incident-pick-map", "clear-incidents",
  "incident-status", "emergency-source", "send-emergency", "emergency-status", "delay-graph", "traffic-summary",
  "bus-select", "break-bus", "recover-bus", "recover-all", "download-rt",
  "feed-status", "route-status", "control-status", "route-summary", "bus-list", "stop-eta-list", "clock-display", "live-pill"
];
ids.forEach(element);
element("map-style").value = "road";
element("time-input").value = "08:00:00";
element("time-scale").value = "1";
element("bus-count").value = "8";
element("incident-type").value = "blocked";
element("incident-severity").value = "2";
element("emergency-source").value = "gps";

const document = {
  body: new FakeElement("body", "body"),
  activeElement: null,
  addEventListener(type, handler) {
    callbacks.set(type, callbacks.get(type) || []);
    callbacks.get(type).push(handler);
  },
  getElementById: element,
  createElement(tag) {
    return new FakeElement("", tag);
  }
};

const localStorage = {
  data: new Map(),
  setItem(key, value) {
    this.data.set(key, String(value));
  },
  getItem(key) {
    return this.data.get(key) || null;
  }
};

function layerObject() {
  const layer = {
    added: false,
    children: [],
    addTo(target) {
      this.added = true;
      target?.children?.push?.(this);
      return this;
    },
    remove() {
      this.removed = true;
    },
    clearLayers() {
      this.children = [];
    },
    getBounds() {
      return [[28.5, 77.1], [28.7, 77.3]];
    }
  };
  layers.push(layer);
  return layer;
}

function markerObject(latLng, options = {}) {
  const marker = {
    latLng,
    options,
    popup: "",
    tooltip: "",
    handlers: {},
    addTo(layer) {
      layer?.children?.push?.(this);
      markers.push(this);
      return this;
    },
    bindPopup(html) {
      this.popup = html;
      return this;
    },
    bindTooltip(html) {
      this.tooltip = html;
      return this;
    },
    setLatLng(next) {
      this.latLng = next;
      return this;
    },
    setIcon(icon) {
      this.options.icon = icon;
      return this;
    },
    setPopupContent(html) {
      this.popup = html;
      return this;
    },
    setTooltipContent(html) {
      this.tooltip = html;
      return this;
    },
    getTooltip() {
      return this.tooltip ? {} : null;
    },
    isPopupOpen() {
      return false;
    },
    openPopup() {
      this.popupOpen = true;
      return this;
    },
    on(type, handler) {
      this.handlers[type] = handler;
      return this;
    },
    remove() {
      this.removed = true;
    }
  };
  return marker;
}

const L = {
  map() {
    return {
      children: [],
      handlers: {},
      removeLayer() {},
      fitBounds() {},
      getCenter() {
        return { lat: 28.627528, lng: 77.240317 };
      },
      on(type, handler) {
        this.handlers[type] = handler;
        return this;
      },
      trigger(type, event) {
        this.handlers[type]?.(event);
      }
    };
  },
  control: {
    zoom() {
      return { addTo() {} };
    }
  },
  tileLayer() {
    return layerObject();
  },
  layerGroup: layerObject,
  polyline(points, options) {
    return { ...layerObject(), points, options };
  },
  featureGroup() {
    return {
      getBounds() {
        return [[28.5, 77.1], [28.7, 77.3]];
      }
    };
  },
  marker: markerObject,
  divIcon(options) {
    return options;
  }
};

const Papa = {
  parse(text, options) {
    const lines = text.trim().split(/\r?\n/);
    const headers = lines.shift().split(",").map((header) => options.transformHeader(header));
    const data = lines.map((line) => {
      const values = line.split(",");
      return Object.fromEntries(headers.map((header, index) => [header, options.transform(values[index] || "")]));
    });
    return { data, errors: [] };
  }
};

async function fetch(url) {
  const coords = String(url).match(/driving\/([^?]+)/)?.[1] || "";
  const waypoints = coords.split(";").map((raw) => {
    const [lon, lat] = raw.split(",").map(Number);
    return { lon, lat };
  });
  const coordinates = [];
  let distance = 0;
  for (let pointIndex = 1; pointIndex < waypoints.length; pointIndex += 1) {
    const from = waypoints[pointIndex - 1];
    const to = waypoints[pointIndex];
    distance += Math.hypot(to.lon - from.lon, to.lat - from.lat) * 111000;
    for (let i = pointIndex === 1 ? 0 : 1; i <= 8; i += 1) {
      const ratio = i / 8;
      coordinates.push([from.lon + (to.lon - from.lon) * ratio, from.lat + (to.lat - from.lat) * ratio]);
    }
  }
  return {
    ok: true,
    async json() {
      return {
        code: "Ok",
        routes: [
          {
            distance,
            duration: 300,
            geometry: { coordinates }
          }
        ]
      };
    }
  };
}

const context = vm.createContext({
  console,
  document,
  localStorage,
  L,
  Papa,
  fetch,
  performance: { now: () => Date.now() },
  setInterval: () => 0,
  clearInterval: () => {},
  setTimeout,
  clearTimeout,
  AbortController: globalThis.AbortController,
  Blob: globalThis.Blob,
  URL: {
    createObjectURL: () => "blob:qa",
    revokeObjectURL: () => {}
  },
  Math,
  Date,
  Number,
  String,
  Array,
  Object,
  Map,
  Set,
  RegExp,
  JSON,
  Infinity,
  window: {}
});
context.window = context;

vm.runInContext(`${appSource}\nglobalThis.__test = { state, ui, loadFilesDataset, buildSelectedRoute, exportCurrentRoute, importRouteFile, downloadGtfsRtSnapshot, tick, calculateDelayMetrics, delaySeriesForCurrentDay, trafficIntensityAt, trafficLabelAt, updateStopArrivals, applyHeadwayController };`, context, {
  filename: appPath
});

for (const handler of callbacks.get("DOMContentLoaded") || []) {
  handler();
}

await waitFor(() => context.__test.state.routePlans.length > 0, "demo route build");

const results = [];
function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
}
function fail(name, detail) {
  results.push({ name, ok: false, detail });
}
function assert(name, condition, detail = "") {
  if (condition) {
    pass(name, detail);
  } else {
    fail(name, detail);
  }
}

assert("Demo auto-load builds routes", context.__test.state.routePlans.length >= 2, `${context.__test.state.routePlans.length} route plans`);
assert("Buses generated", context.__test.state.buses.length >= 2, `${context.__test.state.buses.length} buses`);
const averageCruise = context.__test.state.buses.reduce((sum, bus) => sum + bus.normalSpeedKmph, 0) / context.__test.state.buses.length;
assert("Bus cruise speed near 30 kmph", averageCruise >= 29 && averageCruise <= 31.5, `${averageCruise.toFixed(1)} kmph`);
assert("Stops rendered", context.__test.state.stopMarkers.size >= 4, `${context.__test.state.stopMarkers.size} markers`);
assert("Signals rendered", context.__test.state.trafficSignals.length >= 2, `${context.__test.state.trafficSignals.length} signals`);
const signalsAwayFromStops = context.__test.state.trafficSignals.every((signal) => {
  const plan = context.__test.state.routePlans.find((item) => item.id === signal.planId);
  const stop = plan?.stops.find((item) => item.id === signal.stopId);
  return stop && /junction/i.test(signal.source);
});
assert("Signals placed at route junctions", signalsAwayFromStops, `${context.__test.state.trafficSignals.length} junction-snapped signals`);
assert("Delay line graph renders", /delay-line-chart/.test(element("delay-graph").innerHTML), "current before/after line graph");
assert("Route multi-select populated", element("route-select").children.length >= 2 && element("route-select").multiple, `${element("route-select").children.length} options`);

element("map-style").value = "satellite";
await element("map-style").trigger("change");
element("map-style").value = "road";
await element("map-style").trigger("change");
pass("Map style selector", "road and satellite changes completed");

await element("toggle-sim").trigger("click");
assert("Pause simulation", context.__test.state.running === false, "paused");
await element("toggle-sim").trigger("click");
assert("Run simulation", context.__test.state.running === true, "running");

const timeChecks = [
  ["02:00:00", "Late night"],
  ["12:00:00", "Midday"],
  ["19:00:00", "Evening"]
];
for (const [time, label] of timeChecks) {
  element("time-input").value = time;
  await element("set-time").trigger("click");
  const delay = context.__test.calculateDelayMetrics();
  assert(`${label} current delay prediction`, delay.before > 0 && delay.after > 0 && delay.after < delay.before, `${Math.round(delay.before)}s -> ${Math.round(delay.after)}s`);
}
assert("Delay time series", context.__test.delaySeriesForCurrentDay().length >= 4, `${context.__test.delaySeriesForCurrentDay().length} points`);

element("time-scale").value = "4";
await element("time-scale").trigger("input");
assert("Time scale control", context.__test.state.timeScale === 4, `${context.__test.state.timeScale}x`);

element("bus-count").value = "10";
await element("reset-buses").trigger("click");
assert("Reset buses control", context.__test.state.buses.length === 10, `${context.__test.state.buses.length} buses`);

await exerciseOccupancyAdvice();
await exerciseDynamicHolding();

await element("gps-pick-map").trigger("click");
context.__test.state.map.trigger("click", { latlng: { lat: 28.627528, lng: 77.240317 } });
assert("GPS map click picker", element("gps-lat").value === "28.627528" && element("gps-lon").value === "77.240317", `${element("gps-lat").value},${element("gps-lon").value}`);

element("gps-lat").value = "28.627528";
element("gps-lon").value = "77.240317";
await element("set-gps").trigger("click");
assert("GPS nearest stop panel", /BUS|No bus|nearest/i.test(element("gps-status").innerHTML), element("gps-status").innerHTML.slice(0, 120));
assert(
  "GPS route terminal details",
  /Intermediate stop between/i.test(element("gps-status").innerHTML) && /Kashmere Gate ISBT/i.test(element("gps-status").innerHTML) && /Dhaula Kuan/i.test(element("gps-status").innerHTML),
  element("gps-status").innerHTML.slice(0, 220)
);

element("emergency-source").value = "gps";
await element("send-emergency").trigger("click");
assert("Medical emergency dispatch", /hospital/i.test(element("emergency-status").innerHTML) && /traffic headquarter/i.test(element("emergency-status").innerHTML), element("emergency-status").innerHTML.slice(0, 180));

await element("incident-pick-map").trigger("click");
context.__test.state.map.trigger("click", { latlng: { lat: 28.627528, lng: 77.240317 } });
assert("Incident map click picker", element("incident-lat").value === "28.627528" && element("incident-lon").value === "77.240317", `${element("incident-lat").value},${element("incident-lon").value}`);

element("incident-type").value = "blocked";
element("incident-lat").value = "28.627528";
element("incident-lon").value = "77.240317";
element("incident-severity").value = "3";
await element("add-incident").trigger("click");
assert("Incident plotting", context.__test.state.incidents.length === 1 && /plotted/i.test(element("incident-status").textContent), element("incident-status").textContent);
const activeIncident = context.__test.state.incidents[0];
assert(
  "Incident creates route bypass",
  activeIncident.detourStartPositionM < activeIncident.positionM && activeIncident.detourEndPositionM > activeIncident.positionM && activeIncident.detourPath.length > 3 && /OSRM/i.test(activeIncident.detourSource),
  `${Math.round(activeIncident.detourStartPositionM)} -> ${Math.round(activeIncident.positionM)} -> ${Math.round(activeIncident.detourEndPositionM)} (${activeIncident.detourSource})`
);

const firstBus = context.__test.state.buses[0];
element("bus-select").value = firstBus.id;
await element("break-bus").trigger("click");
assert("Breakdown control", firstBus.brokenDown && firstBus.status === "breakdown", firstBus.controlNote);
assert("Breakdown boosts lagging bus", context.__test.state.buses.some((bus) => bus.breakdownBoostSec > 0), "lagging service boosted");
await element("recover-bus").trigger("click");
assert("Recover selected bus", !firstBus.brokenDown, firstBus.status);
context.__test.state.buses.slice(0, 2).forEach((bus) => {
  bus.brokenDown = true;
  bus.status = "breakdown";
});
await element("recover-all").trigger("click");
assert("Recover all buses", context.__test.state.buses.every((bus) => !bus.brokenDown), "all recovered");

assert("Runtime edit controls removed", !("addManualBus" in context.__test.ui) && !("addManualStop" in context.__test.ui), "manual route edits unavailable");

context.__test.exportCurrentRoute();
context.__test.downloadGtfsRtSnapshot();
assert("Export/download controls", downloads.length >= 2, `${downloads.length} downloads triggered`);

const exportedPlans = JSON.stringify({ routePlans: context.__test.state.routePlans, incidents: context.__test.state.incidents });
await context.__test.importRouteFile({ target: { files: [{ text: async () => exportedPlans }], value: "qa.json" } });
assert("Import route control", context.__test.state.routePlans.length >= 1 && /Imported/.test(element("route-status").textContent), element("route-status").textContent);

await element("clear-incidents").trigger("click");
assert("Clear incidents", context.__test.state.incidents.length === 0, `${context.__test.state.incidents.length} incidents`);

await element("load-demo").trigger("click");
await waitFor(() => context.__test.state.routePlans.length >= 2, "reload demo");
assert("Load demo button", /Loaded demo feed/.test(element("feed-status").textContent), element("feed-status").textContent);

element("route-select").children.forEach((option, index) => {
  option.selected = index === 0;
});
await element("route-select").trigger("change");
await element("build-route").trigger("click");
await waitFor(() => context.__test.state.routePlans.length === 1, "single route rebuild");
assert("Build selected route button", context.__test.state.routePlans.length === 1, `${context.__test.state.routePlans.length} route`);

await runGeneratedGtfsLoad();
assert("Generated GTFS load", /Loaded 3 routes/.test(element("feed-status").textContent) && context.__test.state.routePlans.length >= 1, element("feed-status").textContent);

for (let i = 0; i < 4; i += 1) {
  context.__test.tick();
}
assert("Simulation tick keeps panels alive", /Current delay/.test(element("traffic-summary").innerHTML) && context.__test.state.buses.every((bus) => Number.isFinite(bus.routeDistanceM)), "ticks completed");

const failed = results.filter((item) => !item.ok);
console.log(JSON.stringify({ ok: failed.length === 0, passed: results.length - failed.length, failed: failed.length, results }, null, 2));
if (failed.length) {
  process.exitCode = 1;
}

async function runGeneratedGtfsLoad() {
  const stopRows = [
    ["A", "A", "QA Terminal A", 28.6601, 77.2201, 0],
    ["B", "B", "QA Chowk B", 28.6462, 77.2364, 0],
    ["C", "C", "QA Market C", 28.6313, 77.2412, 0],
    ["D", "D", "QA Hospital D", 28.6153, 77.2304, 0],
    ["E", "E", "QA Terminal E", 28.6005, 77.2181, 0],
    ["F", "F", "QA Crossing F", 28.6378, 77.2921, 0],
    ["G", "G", "QA Garden G", 28.6229, 77.2604, 0]
  ];
  const stops = `stop_id,stop_code,stop_name,stop_lat,stop_lon,location_type\n${stopRows.map((row) => row.join(",")).join("\n")}`;
  const routes = `route_id,agency_id,route_short_name,route_long_name,route_type,route_color,route_text_color
QA-1,QA,Q1,QA Terminal A - E,3,0F5FBA,FFFFFF
QA-2,QA,Q2,QA Crossing F - D,3,138A55,FFFFFF
QA-3,QA,Q3,QA Terminal E - A,3,8A3FFC,FFFFFF`;
  const trips = `route_id,service_id,trip_id,trip_headsign,direction_id
QA-1,WKD,QA-1-0800,QA Terminal E,0
QA-2,WKD,QA-2-0805,QA Hospital D,0
QA-3,WKD,QA-3-0810,QA Terminal A,0`;
  const stopTimes = `trip_id,arrival_time,departure_time,stop_id,stop_sequence
QA-1-0800,08:00:00,08:00:20,A,1
QA-1-0800,08:08:00,08:08:20,B,2
QA-1-0800,08:18:00,08:18:20,C,3
QA-1-0800,08:32:00,08:32:20,D,4
QA-1-0800,08:44:00,08:44:00,E,5
QA-2-0805,08:05:00,08:05:20,F,1
QA-2-0805,08:17:00,08:17:20,C,2
QA-2-0805,08:29:00,08:29:20,D,3
QA-3-0810,08:10:00,08:10:20,E,1
QA-3-0810,08:22:00,08:22:20,G,2
QA-3-0810,08:38:00,08:38:20,B,3
QA-3-0810,08:52:00,08:52:00,A,4`;
  element("file-stops").files = [file(stops)];
  element("file-stop-times").files = [file(stopTimes)];
  element("file-routes").files = [file(routes)];
  element("file-trips").files = [file(trips)];
  await context.__test.loadFilesDataset();
  await waitFor(() => context.__test.state.routePlans.length >= 1, "generated gtfs route build");
}

async function exerciseOccupancyAdvice() {
  const plan = context.__test.state.routePlans[0];
  const stopIndex = Math.min(2, plan.stops.length - 1);
  const stop = plan.stops[stopIndex];
  const stopPosition = plan.stopPositions[stopIndex];
  const routeBuses = context.__test.state.buses.filter((bus) => bus.planId === plan.id);
  if (routeBuses.length < 2) {
    fail("Occupancy routing suggestion", "not enough buses on route");
    return;
  }
  routeBuses[0].routeDistanceM = Math.max(0, stopPosition - 120);
  routeBuses[0].speedKmph = 24;
  routeBuses[0].normalSpeedKmph = 24;
  routeBuses[0].occupancy = routeBuses[0].capacity;
  routeBuses[1].routeDistanceM = Math.max(0, stopPosition - 720);
  routeBuses[1].speedKmph = 24;
  routeBuses[1].normalSpeedKmph = 24;
  routeBuses[1].occupancy = 20;
  context.__test.updateStopArrivals();
  const arrival = context.__test.state.stopArrivals.get(stop.id);
  assert("Occupancy routing suggestion", Boolean(arrival?.recommended), arrival?.recommended?.message || "no recommendation");
}

async function exerciseDynamicHolding() {
  const plan = context.__test.state.routePlans[0];
  const routeBuses = context.__test.state.buses.filter((bus) => bus.planId === plan.id);
  if (routeBuses.length < 2) {
    fail("Dynamic holding controller", "not enough buses on route");
    return;
  }
  routeBuses[0].routeDistanceM = 1000;
  routeBuses[1].routeDistanceM = 1040;
  routeBuses[0].speedKmph = 22;
  routeBuses[1].speedKmph = 22;
  context.__test.applyHeadwayController();
  assert("Dynamic holding controller", routeBuses.some((bus) => bus.holdIntentSec > 0 || /hold/i.test(bus.controlNote)), routeBuses.map((bus) => bus.controlNote).join(" | "));
}

function file(text) {
  return { text: async () => text };
}

async function waitFor(predicate, label) {
  const start = Date.now();
  while (Date.now() - start < 5000) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Timed out waiting for ${label}`);
}
