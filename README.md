# Boston Double-Parking Reporter

A City of Boston-branded PWA for anonymously reporting illegally double-parked
cars, plus an analytics dashboard with a live heat map, time-window
filtering, and pattern metrics (peak hours, peak day, hotspot streets,
volume trend).

## Structure

```
server/   Express + TypeScript API, Prisma + PostgreSQL (PostGIS-enabled)
web/      React + TypeScript PWA (Vite), Mapbox GL for maps, Recharts for charts
```

## Prerequisites

- Node.js 20+
- Docker Desktop (for local Postgres)
- A free [Mapbox](https://account.mapbox.com/) access token (public/`pk.` token)

## 1. Database

```bash
docker compose up -d
```

This starts Postgres+PostGIS on **port 55432** on the host (not 5432 — many
dev machines already run a local Postgres on 5432, so this avoids clashing
with it). Check `docker-compose.yml` if you need to change it.

## 2. Backend

```bash
cd server
cp .env.example .env      # adjust DATABASE_URL/PORT if you changed the port above
npm install
npm run prisma:migrate    # creates tables
npm run seed               # optional: 500 sample reports around Boston for demo purposes
npm run dev                 # starts the API on http://localhost:4000
```

## 3. Frontend

```bash
cd web
cp .env.example .env
# edit .env and set VITE_MAPBOX_TOKEN to your own Mapbox public token
npm install
npm run dev                 # http://localhost:5173
```

Open `http://localhost:5173` for the report flow, `/dashboard` for the
analytics dashboard.

Without a real Mapbox token the map tiles won't render (you'll see a 401 in
the console), but the rest of the UI — including the address-search flow —
still works.

## Notes on the design

- **Anonymous by design**: the `Report` model has no user/device identifier
  at all — only latitude/longitude, an optional resolved address, the
  location method used, and a timestamp.
- **Three location-entry methods**, per the brief: current-location (GPS),
  drop-a-pin on a Mapbox map (mouse/touch click, or fully keyboard-operable
  via arrow-key panning + Enter to drop at a crosshair), and an address
  search bar (Mapbox Geocoding, biased to Boston).
- **Live dashboard**: polls the API every 15s while "Live updates" is
  checked; the time-window filter (Today / 7 days / 30 days / custom range)
  applies to both the heat map and the metrics panel.
- **Accessibility**: skip link, semantic headings, visible focus rings tuned
  for contrast against both light and dark (navy header) backgrounds,
  ARIA roles/labels for the map and the address combobox, `prefers-reduced-motion`
  support, and hidden `<table>` alternatives beside the bar/line charts so
  screen-reader users get the same data non-visually.
- **PWA**: installable, works offline for the app shell (API calls are
  always network-only so reports/stats are never stale).

## Production build

```bash
cd server && npm run build && npm start
cd web && npm run build && npm run preview
```
