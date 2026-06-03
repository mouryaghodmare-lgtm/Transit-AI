import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = process.env.TRANSIT_APP_ROOT || __dirname;
const appJs = process.env.TRANSIT_APP_JS || join(__dirname, "app.js");
const port = Number(process.env.TRANSIT_APP_PORT || 5173);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    const pathname = decodeURIComponent(url.pathname);
    const filePath = pathname === "/"
      ? join(root, "index.html")
      : pathname === "/app.js"
        ? appJs
        : join(root, normalize(pathname).replace(/^(\.\.[/\\])+/, ""));
    const body = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": contentTypes[extname(filePath).toLowerCase()] || "application/octet-stream"
    });
    response.end(body);
  } catch (error) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, "127.0.0.1");
