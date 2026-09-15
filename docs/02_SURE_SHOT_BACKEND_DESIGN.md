# Meghdoot — Sure-Shot Backend Design

## SCOPE DECISIONS — AND WHY EACH ONE IS SAFE TO DEFER

| Full-spec component | Sure-shot replacement | Why this is safe for tonight |
|---|---|---|
| Neon Postgres persistence | In-memory Python dict, refreshed on a background loop | Fewer moving parts, nothing to provision/migrate/connect under time pressure; risk data doesn't need to survive a restart for a demo |
| bharatlas LGD polygons + geopandas | A hardcoded Python list of ~10 named points (lat/lon) | Downloading, filtering, and rendering real polygons is real engineering time with real failure modes (CRS mismatches, file size, render perf) — points on a map look almost identical to a judge and carry zero of that risk |
| pysheds flow-accumulation raster | A hand-assigned terrain multiplier per block, clearly labeled a placeholder | Real flow accumulation needs a downloaded DEM + a working geospatial toolchain; a placeholder in the *correct direction* (floodplain towns score higher) tells the same story honestly |
| MetPy spatial convergence (needs a wind field over an area) | Surface-pressure trend over the last few hours, from the same single-point Open-Meteo call, as a lift proxy | True convergence needs wind vectors at multiple grid points — genuinely harder to get right fast. Falling pressure is a legitimate, single-point-derivable precursor signal and keeps the "lift" category honestly represented |
| Cron (GitHub Actions / Render cron) | An `asyncio` background task started on FastAPI startup, looping every ~5 min | Achieves the same effect locally with zero external infra to configure |
| Trained GRU/MLP | The heuristic formula (already an accepted, honestly-labeled fallback in the project's own docs) | Training, validating, and safely deploying a model in a few hours is the highest-risk item on this whole list — don't attempt it tonight |

Nothing here is a permanent decision — every row has a documented upgrade path elsewhere in the
project's own docs. This is a scoping decision for the next inspection, not an architecture change.

---

## APP STRUCTURE

Single FastAPI service, one file to start (`main.py`), split out once it's working:
```
backend/
  main.py            # FastAPI app, startup event, route registration
  blocks.py          # static block registry
  fetch.py           # Open-Meteo calls
  features.py        # feature derivation from raw Open-Meteo response
  heuristic.py        # risk scoring formula
  narrative.py        # Groq call + template fallback
  replay_data.json    # pre-baked Aug 2025 frames
  cache.py           # in-memory store + background refresh loop
```

---

## STATIC BLOCK REGISTRY (`blocks.py`)

Ten points across the Ghaggar-Yamuna belt — mix of floodplain-adjacent and elevated/foothill
towns, so the terrain-multiplier placeholder has something real to differentiate. Adjust
coordinates slightly if more precise centroids are handy; ~1km precision is fine for a demo.

```python
BLOCKS = [
    {"id": 1, "name": "Rupnagar",    "lat": 30.9686, "lon": 76.5262, "terrain_multiplier": 1.35},  # near Sutlej
    {"id": 2, "name": "Mohali",      "lat": 30.7046, "lon": 76.7179, "terrain_multiplier": 1.05},
    {"id": 3, "name": "Chandigarh",  "lat": 30.7333, "lon": 76.7794, "terrain_multiplier": 0.85},  # foothill, elevated
    {"id": 4, "name": "Panchkula",   "lat": 30.6942, "lon": 76.8606, "terrain_multiplier": 0.85},  # foothill
    {"id": 5, "name": "Ambala",      "lat": 30.3752, "lon": 76.7821, "terrain_multiplier": 1.15},
    {"id": 6, "name": "Patiala",     "lat": 30.3398, "lon": 76.3869, "terrain_multiplier": 1.10},
    {"id": 7, "name": "Sangrur",     "lat": 30.2458, "lon": 75.8421, "terrain_multiplier": 1.30},  # Ghaggar belt
    {"id": 8, "name": "Ludhiana",    "lat": 30.9010, "lon": 75.8573, "terrain_multiplier": 1.20},  # near Sutlej
    {"id": 9, "name": "Kurukshetra", "lat": 29.9695, "lon": 76.8783, "terrain_multiplier": 1.25},
    {"id": 10, "name": "Yamunanagar","lat": 30.1290, "lon": 77.2674, "terrain_multiplier": 1.40},  # near Yamuna
]
```
`terrain_multiplier` is the honestly-labeled placeholder from the dashboard doc — say so if asked.

---

## DATA FETCH (`fetch.py`)

**One call for all ten blocks per refresh cycle**, not ten separate calls — Open-Meteo's forecast
endpoint accepts comma-separated `latitude`/`longitude` lists and returns one array-of-results
response. This keeps the refresh loop fast and simple.

```
GET https://api.open-meteo.com/v1/forecast
    ?latitude={lat1},{lat2},...,{lat10}
    &longitude={lon1},{lon2},...,{lon10}
    &hourly=cape,convective_inhibition,relative_humidity_2m,cloud_cover,precipitation,
            surface_pressure,wind_gusts_10m
    &past_hours=6
    &forecast_hours=3
    &timezone=Asia/Kolkata
```
`&timezone=Asia/Kolkata` is non-negotiable per the project's own existing rule — add a test that
fails the build if it's ever missing.

---

## FEATURE DERIVATION (`features.py`) — single-point-only, no spatial grid needed

Per block, from the hourly arrays returned above:

| Feature | Derivation |
|---|---|
| `cape` | latest hourly value, direct |
| `cin` | latest `convective_inhibition`, direct |
| `humidity_proxy` | latest `relative_humidity_2m` |
| `cloud_trend` | `cloud_cover[now] - cloud_cover[2h ago]` — rising trend = growing storm |
| `rainfall_recent` | sum of `precipitation` over the last 3 hourly entries |
| `rainfall_forecast_3h` | sum of `precipitation` over the next 3 forecast hours |
| `pressure_trend_3h` | `surface_pressure[3h ago] - surface_pressure[now]` — positive = falling pressure = lift proxy |
| `gusts` | latest `wind_gusts_10m` |

This deliberately swaps true spatial convergence/shear (needs wind vectors across multiple grid
cells, real MetPy work) for a pressure-tendency lift proxy computable from one point's own time
series. Say this trade-off out loud if asked — it's the same "own the deviation" instinct the
project already uses everywhere else.

---

## HEURISTIC FORMULA (`heuristic.py`) — concrete starting weights, tunable

Normalize each raw feature to 0–1 using a fixed reasonable range per feature (e.g. CAPE 0–4000
J/kg → 0–1, clipped) before combining. Starting weights — treat as a first pass, adjust if a
held-out gut-check looks obviously wrong:

```
p_thunderstorm_raw = 0.40 * norm(cape)
                    + 0.25 * norm(-cin)              # less negative CIN → higher score
                    + 0.20 * norm(gusts)
                    + 0.15 * norm(pressure_trend_3h)

p_cloudburst_raw   = 0.35 * norm(humidity_proxy)
                    + 0.25 * norm(cloud_trend)
                    + 0.25 * norm(rainfall_recent)
                    + 0.15 * norm(pressure_trend_3h)

rain_intensity_proxy = norm(rainfall_recent + rainfall_forecast_3h)
flash_flood_risk     = clip(rain_intensity_proxy * terrain_multiplier[block], 0, 1)
```

Map every `_raw` score through the shared severity thresholds in the dashboard doc (0–0.25
Green … 0.75–1 Red). Set `is_baseline_heuristic: true` on every response — this is the honest,
already-accepted fallback path from `06_ml_model_spec.md`, not a lesser thing to hide.

---

## ROUTES

### `GET /api/v1/blocks`
Returns the static registry (id, name, lat, lon) — no `terrain_multiplier` exposed raw to the
frontend, just used server-side.

### `GET /api/v1/risk/current`
Reads the in-memory cache (populated by the background loop below), returns all 10 blocks' current
scores + `data_mode` + `generated_at`. Never calls Open-Meteo synchronously on this route — always
serves from cache, so a slow/failed upstream call never makes a page load hang.

### `GET /api/v1/blocks/{id}/detail`
Same cache, one block, plus `features_history` (the last 3–6 hourly points already fetched) and
the XAI narrative (see below).

### `GET /api/v1/replay/aug_2025_punjab_floods/frames`
Serves the static bundled JSON, no live calls, ever.

### `GET /api/v1/status`
Returns `{"last_success": ..., "status": "ok"|"degraded", "age_seconds": ...}` from the same
in-memory state the background loop maintains.

---

## IN-MEMORY CACHE & REFRESH LOOP (`cache.py`)

```python
STATE = {"data_mode": "starting_up", "generated_at": None, "blocks": {}}

@app.on_event("startup")
async def startup():
    await refresh_all()                       # do one real fetch before serving any traffic
    asyncio.create_task(refresh_loop())

async def refresh_loop():
    while True:
        await asyncio.sleep(300)               # 5 minutes
        await refresh_all()

async def refresh_all():
    try:
        raw = await fetch_all_blocks()          # the one batched Open-Meteo call
        STATE["blocks"] = {b["id"]: compute_risk(b, raw) for b in BLOCKS}
        STATE["data_mode"] = "live"
        STATE["generated_at"] = now_iso()
    except Exception:
        if STATE["blocks"]:
            STATE["data_mode"] = "cached_fallback"   # keep serving the last good snapshot
        # else: stays "starting_up" — frontend shows this honestly, never fabricates data
```
This is the whole fallback story for tonight: try live, fall back to the last real snapshot,
never fabricate a first snapshot out of nothing. The `startup` event's single `await refresh_all()`
before the server starts accepting traffic means `cached_fallback`, when it happens, is always
backed by one real prior successful call — never a placeholder pretending to be a cache.

---

## XAI NARRATIVE (`narrative.py`) — Groq best-effort, template fallback

1. Compute the top-weighted contributing term from the heuristic formula per block (e.g. whichever
   of `cape`, `humidity_proxy`, `rainfall_recent`, `pressure_trend_3h` has the largest weighted
   contribution to whichever hazard is currently highest).
2. **Try** one Groq call: *"In one sentence, explain to a non-technical disaster response officer
   why {block} shows {severity} {hazard} risk, given {top_feature}={value} and {second_feature}=
   {value}."*
3. **If Groq fails or times out** (~3s budget), fall back to a plain template:
   `f"{severity} {hazard} risk, driven primarily by {top_feature_label} ({value})."`
   This must never be visibly worse than "no explanation" — a template sentence beats a blank
   field or an error state every time.
4. Cache the generated sentence per block per refresh cycle (same 5-minute cadence) — don't call
   Groq per page click.

---

## REPLAY DATA — MAKE IT REAL IF THERE'S 20 SPARE MINUTES

The single most convincing demo asset available tonight is a real Aug 20 2025 pull, not a
hand-authored one. Open-Meteo's Historical Forecast API is already confirmed accessible for this
exact date range in the project's own docs. A short one-off script:

```
GET https://archive-api.open-meteo.com/v1/forecast
    ?latitude={...10 blocks...}&longitude={...10 blocks...}
    &start_date=2025-08-19&end_date=2025-08-21
    &hourly=cape,convective_inhibition,relative_humidity_2m,cloud_cover,precipitation,
            surface_pressure,wind_gusts_10m
    &timezone=Asia/Kolkata
```
Run this once, feed the results through the same `features.py`/`heuristic.py` functions used
live, and bake the resulting per-hour, per-block risk scores into `replay_data.json`. This makes
Replay Mode a **real reconstruction of a real event**, not an illustrative story — and it reuses
code you already wrote for the live path, so it's genuinely ~20 minutes of work, not a new
feature. If time runs out before this, a hand-authored plausible sequence is an acceptable last
resort — but label it honestly as illustrative if you go that route and get asked directly.

---

## STATUS ENDPOINT

Trivial — just expose the `cache.py` `STATE` dict's health fields. No `api_health_log` table
needed tonight; that's the Phase 2 persistence upgrade.

---

## WHAT'S DEFERRED (same list as the dashboard doc, for consistency)

Neon persistence · real bharatlas polygons · real pysheds DEM · trained GRU/MLP · all-India scope ·
location-search endpoint (separate plan) · MOSDAC.
