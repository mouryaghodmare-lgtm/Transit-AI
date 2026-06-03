import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const __dirname = dirname(fileURLToPath(import.meta.url));

const defaultAppRoot = __dirname;
const appRoot = process.env.TRANSIT_APP_ROOT || defaultAppRoot;
const appJs = process.env.TRANSIT_APP_JS || join(__dirname, "app.js");
const pythonPath = process.env.PYTHON_PATH || "python";
const port = process.env.TRANSIT_APP_PORT || "5173";
const appUrl = `http://127.0.0.1:${port}/`;
const usesExternalServer = process.env.SMOKE_EXTERNAL_SERVER === "1";
const serverPath = join(appRoot, "server.py");

if (!usesExternalServer && !existsSync(serverPath)) {
  throw new Error(`server.py not found at ${serverPath}`);
}

const server = usesExternalServer
  ? null
  : spawn(pythonPath, [serverPath], {
      cwd: appRoot,
      env: {
        ...process.env,
        TRANSIT_APP_ROOT: appRoot,
        TRANSIT_APP_JS: appJs,
        TRANSIT_APP_PORT: port
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

let browser;

try {
  await waitForServer(appUrl, 12000);
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.BROWSER_EXECUTABLE_PATH || undefined
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#map.leaflet-container", { timeout: 15000 });
  await page.waitForSelector(".leaflet-marker-icon.bus-icon", { timeout: 45000 });
  await page.waitForSelector(".leaflet-marker-icon.traffic-signal-icon", { timeout: 15000 });

  const title = await page.locator("h1").innerText();
  const routeOptions = await page.locator("#route-select option").count();
  const tripSelectCount = await page.locator("#trip-select").count();
  const busMarkers = await page.locator(".leaflet-marker-icon.bus-icon").count();
  const busLogos = await page.locator(".bus-logo").count();
  const stopMarkers = await page.locator(".stop-dot").count();
  const signalMarkers = await page.locator(".leaflet-marker-icon.traffic-signal-icon").count();
  const delayRows = await page.locator("#delay-graph .delay-row").count();
  const delayLineCharts = await page.locator("#delay-graph .delay-line-chart").count();
  const runtimeEditPanels = await page.locator("text=Runtime Edits").count();

  await page.locator(".stop-dot").nth(0).hover({ force: true });
  await page.waitForSelector(".stop-tooltip", { timeout: 5000 });
  await page.locator(".stop-dot").nth(0).click({ force: true });
  await page.waitForSelector(".leaflet-popup-content .stop-arrival-card", { timeout: 5000 });
  const stopPopupText = await page.locator(".leaflet-popup-content").innerText();

  const beforeClock = await page.locator("#clock-display").innerText();
  await delay(2500);
  const afterClock = await page.locator("#clock-display").innerText();

  await page.locator("#time-input").fill("09:30:00");
  await page.locator("#set-time").click();
  await page.waitForFunction(() => document.querySelector("#traffic-summary")?.textContent.includes("Morning rush"));
  const trafficSummary = await page.locator("#traffic-summary").innerText();

  await page.locator("#gps-lat").fill("28.627528");
  await page.locator("#gps-lon").fill("77.240317");
  await page.locator("#set-gps").click();
  await page.waitForSelector(".leaflet-marker-icon.gps-icon", { timeout: 5000 });
  const gpsText = await page.locator("#gps-status").innerText();

  await page.locator("#emergency-source").selectOption("gps");
  await page.locator("#send-emergency").click();
  await page.waitForFunction(() => /traffic headquarter/i.test(document.querySelector("#emergency-status")?.textContent || ""));
  const emergencyText = await page.locator("#emergency-status").innerText();

  await page.locator("#incident-type").selectOption("blocked");
  await page.locator("#incident-lat").fill("28.627528");
  await page.locator("#incident-lon").fill("77.240317");
  await page.locator("#add-incident").click();
  await page.waitForSelector(".leaflet-marker-icon.incident-icon", { timeout: 5000 });
  const incidentMarkers = await page.locator(".leaflet-marker-icon.incident-icon").count();
  const incidentText = await page.locator("#incident-status").innerText();

  await page.locator("#break-bus").click();
  await page.waitForSelector(".leaflet-marker-icon.breakdown", { timeout: 5000 });
  const breakdownMarkers = await page.locator(".leaflet-marker-icon.breakdown").count();
  await page.locator("#recover-all").click();

  const sampleDir = writeSampleGtfs();
  await page.locator("#file-stops").setInputFiles(join(sampleDir, "stop.txt"));
  await page.locator("#file-stop-times").setInputFiles(join(sampleDir, "stop_times.txt"));
  await page.locator("#file-routes").setInputFiles(join(sampleDir, "routes.txt"));
  await page.locator("#file-trips").setInputFiles(join(sampleDir, "trips.txt"));
  await page.locator("#load-files").click();
  await page.waitForFunction(
    () => /Built .*route/.test(document.querySelector("#route-status")?.textContent || ""),
    null,
    { timeout: 45000 }
  );
  const loadedFileStatus = await page.locator("#feed-status").innerText();
  const routeStatusAfterFiles = await page.locator("#route-status").innerText();
  const routeSelectText = await page.locator("#route-select").innerText();

  if (title !== "Open Transit AI") {
    throw new Error(`Unexpected title: ${title}`);
  }
  if (routeOptions < 2) {
    throw new Error(`Expected demo routes, found ${routeOptions}`);
  }
  if (tripSelectCount !== 0) {
    throw new Error("Trip selector should be removed from the UI.");
  }
  if (busMarkers < 2) {
    throw new Error(`Expected bus markers, found ${busMarkers}`);
  }
  if (busLogos < busMarkers) {
    throw new Error(`Expected bus SVG logos, found ${busLogos} for ${busMarkers} bus markers`);
  }
  if (stopMarkers < 2) {
    throw new Error(`Expected stop markers, found ${stopMarkers}`);
  }
  if (signalMarkers < 2) {
    throw new Error(`Expected traffic signal markers, found ${signalMarkers}`);
  }
  if (delayRows !== 2) {
    throw new Error(`Expected before/after delay graph rows, found ${delayRows}`);
  }
  if (delayLineCharts !== 1) {
    throw new Error(`Expected one delay line graph, found ${delayLineCharts}`);
  }
  if (runtimeEditPanels !== 0) {
    throw new Error("Runtime edit UI should be removed.");
  }
  if (!/Stop name/.test(stopPopupText) || !/Boarding range/.test(stopPopupText)) {
    throw new Error(`Stop popup did not show crowd boarding data: ${stopPopupText}`);
  }
  if (beforeClock === afterClock) {
    throw new Error("Virtual clock did not advance.");
  }
  if (!/Morning rush/.test(trafficSummary)) {
    throw new Error(`Rush-hour traffic summary missing: ${trafficSummary}`);
  }
  if (!/ITO|Crossing|stop/i.test(gpsText) || !/BUS|No bus/i.test(gpsText)) {
    throw new Error(`GPS panel did not show nearest stop and next bus: ${gpsText}`);
  }
  if (!/hospital/i.test(emergencyText) || !/traffic headquarter/i.test(emergencyText)) {
    throw new Error(`Emergency panel missing dispatch messages: ${emergencyText}`);
  }
  if (incidentMarkers < 1 || !/No available road|plotted/i.test(incidentText)) {
    throw new Error(`Incident plotting failed: ${incidentText}`);
  }
  if (breakdownMarkers < 1) {
    throw new Error("Breakdown marker did not render.");
  }
  if (!/Loaded 2 routes/.test(loadedFileStatus)) {
    throw new Error(`File GTFS load did not report routes: ${loadedFileStatus}`);
  }
  if (!/route pattern ready/.test(routeSelectText)) {
    throw new Error(`Route selector did not show route patterns: ${routeSelectText}`);
  }

  const seriousErrors = errors.filter((error) => !/Failed to load resource/i.test(error));
  if (seriousErrors.length) {
    throw new Error(`Browser errors: ${seriousErrors.join(" | ")}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        title,
        routeOptions,
        tripSelectCount,
        busMarkers,
        busLogos,
        stopMarkers,
        signalMarkers,
        delayRows,
        stopPopupText,
        beforeClock,
        afterClock,
        trafficSummary,
        gpsText,
        emergencyText,
        incidentMarkers,
        incidentText,
        breakdownMarkers,
        loadedFileStatus,
        routeStatusAfterFiles
      },
      null,
      2
    )
  );
} finally {
  if (browser) {
    await browser.close();
  }
  if (server) {
    server.kill();
    await Promise.race([onceExit(server), delay(1000)]);
  }
}

async function waitForServer(url, timeoutMs) {
  const start = Date.now();
  let lastError;
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  throw new Error(`Server did not become ready at ${url}: ${lastError?.message || "timeout"}`);
}

function onceExit(child) {
  return new Promise((resolve) => child.once("exit", resolve));
}

function writeSampleGtfs() {
  const sampleDir = join(tmpdir(), "open-transit-ai-smoke-gtfs");
  mkdirSync(sampleDir, { recursive: true });
  writeFileSync(
    join(sampleDir, "stop.txt"),
    `stop_id,stop_code,stop_name,stop_lat,stop_lon,location_type
KGATE,KGATE,Kashmere Gate ISBT,28.667856,77.227306,0
ITO,ITO,ITO Crossing,28.627528,77.240317,0
AIIMS,AIIMS,AIIMS,28.567200,77.210000,0
ANAND,ANAND,Anand Vihar ISBT,28.646900,77.316000,0
LAXMI,LAXMI,Laxmi Nagar,28.630600,77.277000,0
DHAULA,DHAULA,Dhaula Kuan,28.592100,77.160600,0
`
  );
  writeFileSync(
    join(sampleDir, "routes.txt"),
    `route_id,agency_id,route_short_name,route_long_name,route_type,route_color,route_text_color
DLI-01,OTAI,DL-01,Kashmere Gate - AIIMS via ITO,3,0F5FBA,FFFFFF
DLI-02,OTAI,DL-02,Anand Vihar - Dhaula Kuan via ITO,3,138A55,FFFFFF
`
  );
  writeFileSync(
    join(sampleDir, "trips.txt"),
    `route_id,service_id,trip_id,trip_headsign,direction_id
DLI-01,WKD,DLI-01-0800,AIIMS,0
DLI-02,WKD,DLI-02-0805,Dhaula Kuan,0
`
  );
  writeFileSync(
    join(sampleDir, "stop_times.txt"),
    `trip_id,arrival_time,departure_time,stop_id,stop_sequence
DLI-01-0800,08:00:00,08:00:20,KGATE,1
DLI-01-0800,08:14:00,08:14:20,ITO,2
DLI-01-0800,08:43:00,08:43:00,AIIMS,3
DLI-02-0805,08:05:00,08:05:20,ANAND,1
DLI-02-0805,08:18:00,08:18:20,LAXMI,2
DLI-02-0805,08:25:00,08:25:20,ITO,3
DLI-02-0805,08:54:00,08:54:00,DHAULA,4
`
  );
  return sampleDir;
}
