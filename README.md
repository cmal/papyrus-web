# Papyrus Web

A modern web UI for [@danypops/papyrus](https://www.npmjs.com/package/@danypops/papyrus) — the graph artifact store (Tasks, Docs, Rules, Playbooks, Notes).

Built with **React + Vite + TypeScript + shadcn/ui + Tailwind CSS**.

## Features

- **Tasks** — Kanban board & list views, create/edit, lifecycle actions (start/complete/pause/cancel/reopen), focus management, dependency tracking
- **Docs** — knowledge document management with full-text body
- **Rules** — governance rules with condition/action pairs
- **Playbooks** — invoke playbooks with arguments, view run results
- **Notes** — quick-capture inbox with resolve/delete
- **Projects** — register and manage project scopes
- **Graph** — traverse and inspect the artifact graph

## Quick Start

### Development

```bash
npm install
npm run dev
```

Open http://localhost:5173, enter your Papyrus daemon URL and token.

### Production (with auto-detection proxy)

```bash
npm install
npm run build
npm start
```

Open http://localhost:5174. The built-in proxy server automatically reads the daemon port/token from `$XDG_RUNTIME_DIR/papyrus/`, so no manual configuration is needed.

## How It Connects

Papyrus runs as a local authenticated daemon. Its API is a unified JSON-RPC endpoint:

- `GET /health` — daemon health & version
- `GET /api/v1/ops` — list all available operations
- `POST /api/v1/ops` — call an operation: `{ "op": "tasks.list", "input": {} }`

Authentication is via `Authorization: Bearer <token>`. The port and token are stored in `$XDG_RUNTIME_DIR/papyrus/{port,token}`.

## Project Structure

```
src/
  components/
    ui/          # shadcn/ui components
    layout/      # Sidebar, Header
  pages/         # Tasks, Docs, Rules, Playbooks, Notes, Projects, Graph, Settings
  lib/           # API client, types, utils
  store/         # zustand connection state
  hooks/         # react-query hooks
server/          # production proxy server (auto-detects daemon)
```

## Tech Stack

- React 18 + TypeScript
- Vite 6
- Tailwind CSS + shadcn/ui
- React Router 7
- TanStack Query (data fetching)
- Zustand (state management)
- Lucide React (icons)
