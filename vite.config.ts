import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

function papyrusDbPath(): string {
  if (process.env.XDG_DATA_HOME) return path.join(process.env.XDG_DATA_HOME, "papyrus", "papyrus.db");
  return path.join(os.homedir(), ".local", "share", "papyrus", "papyrus.db");
}

// Custom plugin: expose /api/papyrus-web/redraft to set a note back to draft
function papyrusWebPlugin(): Plugin {
  return {
    name: "papyrus-web-custom",
    configureServer(server) {
      server.middlewares.use("/api/papyrus-web/redraft", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("Method Not Allowed");
          return;
        }
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", async () => {
          try {
            const { id } = JSON.parse(body || "{}");
            if (!id) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: "id is required" }));
              return;
            }
            const { DatabaseSync } = await import("node:sqlite");
            const db = new DatabaseSync(papyrusDbPath());
            const result = db.prepare("UPDATE artifacts SET status = 'draft', updated_at = datetime('now') WHERE id = ? AND subtype = 'note'").run(id);
            db.close();
            if (result.changes === 0) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: "note not found or already draft" }));
              return;
            }
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true, id }));
          } catch (e: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      });
    },
  };
}

function daemonStateDir(): string {
  if (process.env.PAPYRUS_DAEMON_DIR) return process.env.PAPYRUS_DAEMON_DIR;
  if (process.env.XDG_RUNTIME_DIR) return path.join(process.env.XDG_RUNTIME_DIR, "papyrus");
  if (process.env.XDG_STATE_HOME) return path.join(process.env.XDG_STATE_HOME, "papyrus");
  return path.join(os.homedir(), ".local", "state", "papyrus");
}

function readDaemonHandle(): { port: string; token: string } | null {
  const dir = daemonStateDir();
  try {
    const port = fs.readFileSync(path.join(dir, "port"), "utf8").trim().split("\n")[0];
    const token = fs.readFileSync(path.join(dir, "token"), "utf8").trim();
    return { port, token };
  } catch {
    return null;
  }
}

const daemon = readDaemonHandle();
const daemonTarget = daemon ? `http://127.0.0.1:${daemon.port}` : "http://127.0.0.1:1";
const daemonToken = daemon?.token || "";

if (daemon) {
  console.log(`[papyrus-web] daemon detected at ${daemonTarget}`);
} else {
  console.log("[papyrus-web] daemon not detected — start it with `papyrus serve`");
}

const papyrusProxy = {
  target: daemonTarget,
  changeOrigin: true,
  configure: (proxy: any) => {
    proxy.on("proxyReq", (proxyReq: any) => {
      if (daemonToken) {
        proxyReq.setHeader("authorization", `Bearer ${daemonToken}`);
      }
    });
  },
};

export default defineConfig({
  plugins: [react(), papyrusWebPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": papyrusProxy,
      "/health": papyrusProxy,
      "/daemon": papyrusProxy,
      "/push": papyrusProxy,
      "/vehicle": papyrusProxy,
    },
  },
});
