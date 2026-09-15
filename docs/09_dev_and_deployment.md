# Local Dev Setup + Deployment (final day only)

## Local setup — do this first, every session

```bash
mkdir -p meghdoot/{backend,frontend,model,data/{raw,processed,samples},notebooks,scripts,docs}
```

**Neon**: sign up free (no card), create project, connection string → `backend/.env` as
`DATABASE_URL=...`, gitignore `.env` immediately. Run `05_database_schema.md`'s DDL against it via
Alembic or a plain `psql` run. Same connection string used locally and in production later —
that's the point of using Neon from Day 1 (it's a DB connection, not "hosting the app").

**Backend**:
```bash
cd backend && python -m venv venv && source venv/bin/activate  # Windows: venv\Scripts\activate
pip install fastapi uvicorn sqlalchemy psycopg2-binary pandas numpy xarray requests \
            scikit-learn torch metpy geopandas rasterio pysheds python-dotenv groq h5py netCDF4
uvicorn main:app --reload --port 8000
```

**Frontend**:
```bash
cd frontend && npx create-next-app@latest . --typescript --tailwind --app
npm install leaflet react-leaflet
npm run dev
```
Set `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000` in `frontend/.env.local` — route every API
call through this one var, never hardcode `localhost:8000`, since this becomes the Render URL later.

**Groq**: free key at console.groq.com → `GROQ_API_KEY` in `backend/.env`, test in isolation first.

**External registrations** — see `03_data_sources.md` for exact URLs/process per source; do all in
parallel, don't block one on another.

**Windows-specific gotchas already hit once** (see `03_data_sources.md` for full IMERG detail):
- Always use `r"..."` raw strings for Windows paths in Python — a bare `"C:\SIHTry\..."` can
  silently mis-parse escape sequences.
- `.netrc` is `_netrc` on Windows (no extension) — Notepad must save as "All Files" or it silently
  becomes `_netrc.txt`.
- A `200 OK` status does not guarantee valid content — validate file content (e.g. magic bytes),
  don't trust status code alone, especially for bulk authenticated downloads.

## Phase 1 smoke test — the four green boxes
```
[ ] Open-Meteo: live request returns cape/cin/wind fields         <- CONFIRMED WORKING
[ ] IMD API: authenticated request returns JSON, no whitelist wall <- NOT YET TESTED
[ ] SRTM DEM: loads for region, pysheds runs without erroring      <- NOT YET CONFIRMED
[ ] bharatlas boundaries: load in geopandas, render with names     <- NOT YET CONFIRMED
```
Don't proceed to model work until these four are green or explicitly, documentedly degraded.

---

## Deployment — FINAL DAY ONLY, do not run early

Nothing here happens until the project explicitly reaches "deploy now." Neon has been live since
Day 1; Vercel/Render deploy in minutes from a GitHub repo with minimal config, so there's no
integration risk saved by deploying early — only extra moving parts during the highest-risk days.

1. **Push to GitHub** — confirm `.env` files are gitignored, secrets go in platform dashboards only.
2. **Backend → Render**: new Web Service, root `backend/`, build `pip install -r requirements.txt`,
   start `uvicorn main:app --host 0.0.0.0 --port $PORT`. Add `DATABASE_URL`, `GROQ_API_KEY`, IMD key
   as env vars. Confirm `/api/v1/status` responds.
3. **Frontend → Vercel**: new Project, root `frontend/`, env var
   `NEXT_PUBLIC_API_BASE_URL=https://<render-service>.onrender.com`. Confirm Landing loads.
4. **Cron**: Render's own cron job or a GitHub Actions scheduled workflow hitting
   `POST /api/v1/internal/poll` — check both are viable at deploy time, use whichever works.
5. **Keep-alive**: free UptimeRobot monitor, 5-min ping, starting a couple hours before demo window.
6. **Domain**: default `*.vercel.app`/`*.onrender.com` is sufficient — don't spend time on a custom one.
7. **Post-deploy checklist**: Landing loads publicly · Dashboard renders real polygons · Live mode
   ticks · block click → real XAI narrative · Replay works with wifi off · Status page shows real
   health · Alerts page links back to map.
8. **Rollback**: keep local `npm run dev`/`uvicorn` runnable at all times as literal fallback if
   public deployment breaks minutes before demo — a laptop on localhost is a completely acceptable
   last resort.
