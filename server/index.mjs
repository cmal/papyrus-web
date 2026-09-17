// Papyrus Web - lightweight proxy + static file server
// Reads the local daemon port/token and proxies API requests.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PAPYRUS_WEB_PORT || "5174", 10);

function daemonStateDir() {
  if (process.env.PAPYRUS_DAEMON_DIR) return process.env.PAPYRUS_DAEMON_DIR;
  if (process.env.XDG_RUNTIME_DIR) return path.join(process.env.XDG_RUNTIME_DIR, "papyrus");
  if (process.env.XDG_STATE_HOME) return path.join(process.env.XDG_STATE_HOME, "papyrus");
  return path.join(os.homedir(), ".local", "state", "papyrus");
}

function readDaemonHandle() {
  const dir = daemonStateDir();
  const portFile = path.join(dir, "port");
  const tokenFile = path.join(dir, "token");
  try {
    const port = fs.readFileSync(portFile, "utf8").trim().split("\n")[0];
    const token = fs.readFileSync(tokenFile, "utf8").trim();
    return { baseUrl: `http://127.0.0.1:${port}`, token };
  } catch {
    return null;
  }
}

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function serveStatic(req, res) {
  const distDir = path.join(__dirname, "..", "dist");
  let urlPath = req.url.split("?")[0];
  if (urlPath === "/") urlPath = "/index.html";
  const filePath = path.join(distDir, urlPath);
  if (!filePath.startsWith(distDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback
      fs.readFile(path.join(distDir, "index.html"), (err2, indexData) => {
        if (err2) {
          res.writeHead(404);
          res.end("Not found. Run `npm run build` first.");
          return;
        }
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(indexData);
      });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}

function proxyRequest(req, res) {
  const handle = readDaemonHandle();
  if (!handle) {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Papyrus daemon not running. Start it with `papyrus serve`." }));
    return;
  }

  const target = new URL(req.url, handle.baseUrl);
  const options = {
    hostname: target.hostname,
    port: target.port,
    path: target.pathname + target.search,
    method: req.method,
    headers: {
      ...req.headers,
      host: target.host,
      authorization: `Bearer ${handle.token}`,
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `Daemon connection failed: ${err.message}` }));
  });

  req.pipe(proxyReq);
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/") || req.url.startsWith("/health") || req.url.startsWith("/daemon/") || req.url.startsWith("/push") || req.url.startsWith("/vehicle/")) {
    proxyRequest(req, res);
  } else {
    serveStatic(req, res);
  }
});

server.listen(PORT, () => {
  console.log(`Papyrus Web running at http://127.0.0.1:${PORT}`);
  const handle = readDaemonHandle();
  if (handle) {
    console.log(`Daemon detected at ${handle.baseUrl}`);
  } else {
    console.log("Warning: Papyrus daemon not detected. Start it with `papyrus serve`.");
  }
});
