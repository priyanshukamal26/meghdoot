# 14 — Phase A: The Upstream MVP (next ~3h30)

> **NEW FILE, Session 7.** Sequential. Do steps in order. Do not skip ahead.
> Every step ends with a **VERIFY** gate. If a gate fails, fix it before moving on.
> Read `13_DIFFERENTIATION_AND_JUDGE_DEFENCE.md` first so you know *why* each step exists.

## Hard rules for this window

- **No model training. No pysheds. No DEM file download. No Postgres. No deployment. No MOSDAC.**
  All of that is Phase B (`15_PHASE_B_DEPTH_BUILD_PLAN.md`).
- Everything below is: one batched HTTP call + arithmetic + static Python dicts.
- **After every single step, run the build.** `cd frontend && npm run build` must exit 0 and
  `cd backend && python -c "import main"` must not raise. A step is not done until the build is green.
- Commit after every green step: `git add -A && git commit -m "phase-a: <step id>"`.

## Time budget

| Step | What | Minutes | Cumulative |
|---|---|---|---|
| A0 | Contract smoke test (curl only, no code) | 15 | 0:15 |
| A1 | `blocks.py` — registry, upstream points, exposure | 25 | 0:40 |
| A2 | `terrain.py` — elevation + kinematic-wave lag | 20 | 1:00 |
| A3 | `fetch.py` — one batched call for all 32 coords | 20 | 1:20 |
| A4 | `hydro.py` — inflow index, dry-sky flag, arrival window | 25 | 1:45 |
| A5 | Routes + in-memory cache | 20 | 2:05 |
| A6 | `hindcast.py` → `replay_data.json` + `leadtime.json` | 25 | 2:30 |
| A7 | Dashboard map + Block Detail panel | 55 | 3:25 |
| A8 | Evidence page (lead-time scorecard) | 20 | 3:45 |
| A9 | Offline rehearsal + script run-through | 15 | 4:00 |

If you fall behind: **A8 is the first thing to cut** (show `leadtime.json` in a terminal instead).
**A6 is the second.** A1–A5 and A7 are non-negotiable — they are the demo.

---

## A0 — Contract smoke test (15 min, no code written)

Run these four commands in a terminal **before writing anything**. They de-risk the whole build.
If any fails, you find out now, not at T+2:00.

**A0.1 — Batched forecast, many coordinates, one request.**
```bash
curl -s "https://api.open-meteo.com/v1/forecast?latitude=30.9686,30.9010,31.4104,31.3350&longitude=76.5262,75.8573,76.4336,76.7600&hourly=cape,convective_inhibition,relative_humidity_2m,cloud_cover,precipitation,surface_pressure,wind_gusts_10m&past_hours=12&forecast_hours=6&timezone=Asia/Kolkata" | head -c 600
```
**VERIFY:** response is a JSON **array** of 4 objects, each with `hourly.precipitation`.
If it returns a single object instead of an array, your parser must handle both shapes — write
`normalise_response()` to always return a list.

**A0.2 — Elevation API (this is what replaces hand-typed travel times).**
```bash
curl -s "https://api.open-meteo.com/v1/elevation?latitude=30.9686,31.4104,31.3350,31.4500&longitude=76.5262,76.4336,76.7600,77.6300"
```
**VERIFY:** returns `{"elevation":[...4 numbers...]}`. Rupnagar should be roughly 250–290 m,
Rampur Bushahr should be clearly higher (roughly 900–1,100 m). If the ordering looks wrong, your
lat/lon lists are misaligned — fix before proceeding.

**A0.3 — Historical Forecast API.** *(Note: the project docs previously named
`archive-api.open-meteo.com`. That is the ERA5 reanalysis archive, a different product. The
endpoint whose schema matches live is `historical-forecast-api`.)*
```bash
curl -s "https://historical-forecast-api.open-meteo.com/v1/forecast?latitude=30.9686&longitude=76.5262&start_date=2025-08-25&end_date=2025-08-27&hourly=precipitation,cape&timezone=Asia/Kolkata" | head -c 400
```
**VERIFY:** returns hourly arrays with real (non-null) precipitation values for Aug 2025.
If it 400s, fall back to `https://archive-api.open-meteo.com/v1/archive` (ERA5) and **label the
replay data as ERA5-reanalysis-derived** rather than matching-schema.

**A0.4 — Flood API (GloFAS river discharge). Coordinates must sit ON the river channel.**
```bash
curl -s "https://flood-api.open-meteo.com/v1/flood?latitude=30.9686&longitude=76.5262&daily=river_discharge&start_date=2025-08-20&end_date=2025-09-05"
```
**VERIFY:** returns daily `river_discharge` in m³/s with a visible spike in late August.
If values are near-zero or null, the point is off-channel — nudge the lat/lon onto the blue line
on a map and retry. Record the working coordinates; you'll reuse them in A1 as `river_point`.

**Record all four results in `project_track.md` before continuing.**

---

## A1 — `backend/blocks.py` (25 min)

Pure data entry. No logic. This file is the single most important correction of this session:
**the previous 10-block Ghaggar-Yamuna registry largely missed the August 2025 event.** The
replacement covers the Sutlej / Beas / Ravi systems that actually flooded, plus the Ghaggar /
Yamuna belt for breadth.

### A1.1 — Upstream sampling points (20 unique)

```python
# Upstream catchment sampling points. Chosen by walking each river upstream into the
# Shivalik / Himachal headwaters, spaced roughly 20-40 km apart.
UPSTREAM = {
    # --- Sutlej system ---
    "bhakra":    (31.4104, 76.4336),
    "bilaspur":  (31.3350, 76.7600),
    "sunni":     (31.2450, 77.1100),
    "rampur":    (31.4500, 77.6300),
    "karcham":   (31.5000, 78.1800),
    # --- Beas system ---
    "pong":      (31.9500, 76.0700),
    "mandi":     (31.7080, 76.9320),
    "pandoh":    (31.6700, 77.0600),
    "kullu":     (31.9580, 77.1090),
    # --- Ravi system ---
    "thein":     (32.4200, 75.7400),
    "basohli":   (32.5000, 75.8200),
    "chamba":    (32.5550, 76.1260),
    "bharmour":  (32.4400, 76.5300),
    # --- Ghaggar / Shivalik system ---
    "morni":     (30.6800, 77.1000),
    "kalka":     (30.8400, 76.9400),
    "nahan":     (30.5600, 77.3000),
    "panchkula": (30.6942, 76.8606),
    # --- Yamuna / Markanda system ---
    "paonta":    (30.4400, 77.6200),
    "dakpathar": (30.5000, 77.8500),
    "renuka":    (30.6100, 77.4500),
}
```

### A1.2 — Block registry (12 blocks)

```python
BLOCKS = [
  {"id":1,  "name":"Rupnagar",    "district":"Rupnagar",    "state":"Punjab",
   "lat":30.9686, "lon":76.5262, "river":"Sutlej",
   "upstream":["bhakra","bilaspur","sunni","rampur"],
   "dam_regulated":True,  "dam":"Bhakra"},

  {"id":2,  "name":"Ludhiana",    "district":"Ludhiana",    "state":"Punjab",
   "lat":30.9010, "lon":75.8573, "river":"Sutlej",
   "upstream":["bilaspur","sunni","rampur","karcham"],
   "dam_regulated":True,  "dam":"Bhakra"},

  {"id":3,  "name":"Ferozepur",   "district":"Ferozepur",   "state":"Punjab",
   "lat":30.9331, "lon":74.6225, "river":"Sutlej",
   "upstream":["bilaspur","rampur","mandi","pandoh"],
   "dam_regulated":True,  "dam":"Bhakra/Pong"},

  {"id":4,  "name":"Fazilka",     "district":"Fazilka",     "state":"Punjab",
   "lat":30.4028, "lon":74.0286, "river":"Sutlej",
   "upstream":["bilaspur","rampur","mandi","pong"],
   "dam_regulated":True,  "dam":"Bhakra/Pong"},

  {"id":5,  "name":"Hoshiarpur",  "district":"Hoshiarpur",  "state":"Punjab",
   "lat":31.5320, "lon":75.9119, "river":"Beas",
   "upstream":["pong","mandi","pandoh","kullu"],
   "dam_regulated":True,  "dam":"Pong"},

  {"id":6,  "name":"Pathankot",   "district":"Pathankot",   "state":"Punjab",
   "lat":32.2746, "lon":75.6522, "river":"Ravi",
   "upstream":["thein","basohli","chamba","bharmour"],
   "dam_regulated":True,  "dam":"Ranjit Sagar"},

  {"id":7,  "name":"Gurdaspur",   "district":"Gurdaspur",   "state":"Punjab",
   "lat":32.0419, "lon":75.4053, "river":"Ravi",
   "upstream":["thein","basohli","chamba","bharmour"],
   "dam_regulated":True,  "dam":"Ranjit Sagar"},

  {"id":8,  "name":"Amritsar",    "district":"Amritsar",    "state":"Punjab",
   "lat":31.6340, "lon":74.8723, "river":"Ravi",
   "upstream":["thein","chamba","bharmour","pong"],
   "dam_regulated":True,  "dam":"Ranjit Sagar"},

  {"id":9,  "name":"Patiala",     "district":"Patiala",     "state":"Punjab",
   "lat":30.3398, "lon":76.3869, "river":"Ghaggar",
   "upstream":["morni","kalka","nahan","panchkula"],
   "dam_regulated":False, "dam":None},

  {"id":10, "name":"Sangrur",     "district":"Sangrur",     "state":"Punjab",
   "lat":30.2458, "lon":75.8421, "river":"Ghaggar",
   "upstream":["morni","kalka","nahan","panchkula"],
   "dam_regulated":False, "dam":None},

  {"id":11, "name":"Ambala",      "district":"Ambala",      "state":"Haryana",
   "lat":30.3752, "lon":76.7821, "river":"Tangri/Markanda",
   "upstream":["morni","kalka","nahan","panchkula"],
   "dam_regulated":False, "dam":None},

  {"id":12, "name":"Yamunanagar", "district":"Yamunanagar", "state":"Haryana",
   "lat":30.1290, "lon":77.2674, "river":"Yamuna",
   "upstream":["paonta","dakpathar","nahan","renuka"],
   "dam_regulated":False, "dam":"Hathnikund barrage"},
]
```

**Note the unregulated blocks (9, 10, 11).** The Ghaggar has no major storage dam — which is
exactly why it flashes fast. That contrast is a good thing to point out live.

### A1.3 — Exposure register

```python
# DEMO EXPOSURE REGISTER — illustrative facility clusters, not an audited count.
# Labelled in the UI as "DDMA / LGD facility registry integration pending".
# Describe by cluster and type. Do NOT name a specific real institution.
EXPOSURE = {
 1: [{"name":"Low-lying settlement cluster, Sutlej Bela belt","type":"settlement","pop":620},
     {"name":"Government school complex (2)","type":"school","pop":410},
     {"name":"Sub-divisional hospital","type":"health","pop":120},
     {"name":"Bus stand / transit hub","type":"transit","pop":90}],
 # ... repeat for ids 2-12, 3-5 entries each, 300-2000 total pop per block.
 # Weight floodplain blocks (Gurdaspur, Ferozepur, Fazilka, Rupnagar) heavier than
 # elevated ones. Keep the numbers round and plainly illustrative.
}
```

**VERIFY A1:**
```bash
cd backend && python -c "
from blocks import BLOCKS, UPSTREAM, EXPOSURE
pts={u for b in BLOCKS for u in b['upstream']}
assert pts <= set(UPSTREAM), pts - set(UPSTREAM)
assert len(BLOCKS)==12 and len({b['id'] for b in BLOCKS})==12
assert set(EXPOSURE) == {b['id'] for b in BLOCKS}
print('blocks ok:', len(BLOCKS), 'upstream:', len(UPSTREAM), 'coords:', len(BLOCKS)+len(UPSTREAM))
"
```
Expect `coords: 32`. Must be ≤ 100 for one batched call.

---

## A2 — `backend/terrain.py` (20 min)

**This step is what converts "your travel times are made up" into a defensible answer.**
Run once at startup, cache the result to `terrain_cache.json` so it never re-calls.

```python
import json, math, os, requests

SINUOSITY   = 1.35   # channel length / straight-line, Himalayan foreland rivers
V_MIN, V_MAX = 0.8, 4.0      # m/s bounds on mean channel velocity
CELERITY    = 5.0/3.0        # kinematic wave celerity / mean velocity, wide channel (Manning)

def haversine_km(a, b):
    R=6371.0
    p1,p2=math.radians(a[0]),math.radians(b[0])
    dp=p2-p1; dl=math.radians(b[1]-a[1])
    h=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(h))

def fetch_elevations(points):
    """points: list of (lat, lon). One batched call, max 100."""
    lats=",".join(f"{p[0]:.4f}" for p in points)
    lons=",".join(f"{p[1]:.4f}" for p in points)
    r=requests.get("https://api.open-meteo.com/v1/elevation",
                   params={"latitude":lats,"longitude":lons}, timeout=20)
    r.raise_for_status()
    return r.json()["elevation"]

def routing_estimate(elev_up, elev_block, straight_km):
    """Lumped kinematic-wave routing estimate. Returns (lag_hours, velocity_ms, slope)."""
    L_km = straight_km * SINUOSITY
    drop = max(elev_up - elev_block, 1.0)           # metres, floored to avoid zero slope
    S    = drop / (L_km * 1000.0)                   # dimensionless
    v    = min(max(1.0 + 40.0*math.sqrt(S), V_MIN), V_MAX)   # m/s, Manning-type
    c    = CELERITY * v                              # flood-wave celerity, m/s
    lag  = (L_km*1000.0) / (c*3600.0)                # hours
    return lag, v, S
```

Build a `TERRAIN` dict at startup: for every block, for every one of its upstream points, store
`{distance_km, elev_up, elev_block, slope, velocity_ms, lag_hours}`, plus a block-level
`lag_hours = mean(...)` and `arrival_window = (lag*0.75, lag*1.25)` with a floor of ±0.5 h.

**VERIFY A2:**
```bash
python -c "
from terrain import build_terrain
t=build_terrain()
for bid in (1,2,7,11):
    print(bid, round(t[bid]['lag_hours'],2), 'h')
"
```
Sanity bounds — reject and debug if violated:
- Rupnagar (1): roughly **3–7 h**
- Ludhiana (2): roughly **5–11 h**
- Gurdaspur (7): roughly **4–10 h**
- Ambala (11): roughly **2–6 h** (short, steep Shivalik catchment)
- Every upstream elevation must be **greater than** its block elevation. If any is not, that
  upstream point is misplaced — move it further up the valley.

Write the result to `backend/terrain_cache.json` and load from there if present.

---

## A3 — `backend/fetch.py` (20 min)

One batched call. All 12 block coords **followed by** all 20 upstream coords, in a fixed,
documented order. Never reorder without updating the index map.

```
GET https://api.open-meteo.com/v1/forecast
    ?latitude=<12 block lats>,<20 upstream lats>
    &longitude=<12 block lons>,<20 upstream lons>
    &hourly=cape,convective_inhibition,relative_humidity_2m,cloud_cover,
            precipitation,surface_pressure,wind_gusts_10m
    &past_hours=12
    &forecast_hours=6
    &timezone=Asia/Kolkata
```

Requirements:
- `timezone=Asia/Kolkata` is mandatory (`11_fallback_playbook.md` #8). **Add a unit test that
  fails if the string is absent from the built URL.** Do this now, not later.
- `normalise_response()` must accept both a bare object and a list.
- Return `{"blocks": {id: hourly}, "upstream": {key: hourly}, "now_idx": int}`.
  `now_idx` = index of the last past hour = `past_hours` (i.e. 12), because the array runs
  `[t-12 ... t-1, t, t+1 ... t+6]`. **Assert this against `hourly.time` and the wall clock**;
  do not assume it.

**VERIFY A3:**
```bash
python -c "
from fetch import fetch_all
d=fetch_all()
print('blocks',len(d['blocks']),'upstream',len(d['upstream']),'now_idx',d['now_idx'])
print('sample time at now_idx:', d['blocks'][1]['time'][d['now_idx']])
assert len(d['blocks'])==12 and len(d['upstream'])==20
"
```
The printed timestamp must be within one hour of your actual local clock. If it is off by 5h30m,
the timezone param is missing.

---

## A4 — `backend/hydro.py` (25 min) — **the differentiator**

```python
UPSTREAM_SCALE = 45.0   # mm / 3h over the catchment mean that maps to inflow_index = 1.0
LOCAL_SCALE    = 40.0   # mm / (3h past + 3h fcst) locally that maps to local_index = 1.0
DAM_ATTEN      = 0.70   # attenuation when a major storage dam sits between upstream and block

def block_hydro(block, block_hourly, upstream_hourlies, now_idx, terrain):
    loc = block_hourly["precipitation"]
    local_3h  = sum(loc[now_idx-3:now_idx])
    local_f3h = sum(loc[now_idx:now_idx+3])

    up3 = mean(sum(h["precipitation"][now_idx-3:now_idx]) for h in upstream_hourlies)
    up6 = mean(sum(h["precipitation"][now_idx-6:now_idx]) for h in upstream_hourlies)

    inflow = clip((0.6*up3 + 0.4*(up6/2.0)) / UPSTREAM_SCALE, 0, 1)
    if block["dam_regulated"]:
        inflow *= DAM_ATTEN
    local  = clip((local_3h + local_f3h) / LOCAL_SCALE, 0, 1)

    flash_flood_risk = clip(0.65*inflow + 0.35*local, 0, 1)
    dry_sky = (inflow > 0.45) and (local < 0.15)

    lag = terrain[block["id"]]["lag_hours"]
    arrive_from = now + timedelta(hours=max(lag*0.75, lag-0.5))
    arrive_to   = now + timedelta(hours=lag*1.25 if lag*1.25 > lag+0.5 else lag+0.5)
    ...
```

Return, per block:
`inflow_index`, `local_index`, `upstream_rain_3h`, `local_rain_3h`, `flash_flood_risk`,
`dry_sky`, `lag_hours`, `arrival_from`, `arrival_to`, `contribution_split`
(= `{upstream_pct, local_pct}` from the 0.65/0.35 weighting times the two indices, renormalised).

**Keep the existing thunderstorm and cloudburst formulas from
`02_SURE_SHOT_BACKEND_DESIGN.md` exactly as they are.** Do not re-derive them. They are done.

### The honesty caveat you must encode now

`DAM_ATTEN` assumes the reservoir has headroom. **In August 2025 the dams were at capacity and
their releases *amplified* the flood rather than damping it.** Encode this:

```python
reservoir_state_modelled = False   # always False in Phase A
```
and surface it in the UI on dam-regulated blocks as:
> *"Dam attenuation applied (×0.70). Reservoir storage state is not modelled — when a reservoir
> is near capacity this understates risk. CWC reservoir integration is scoped for Phase B."*

Saying that out loud, unprompted, is worth more than the number itself. It shows you know the
actual failure mode of the actual event.

**VERIFY A4:**
```bash
python -c "
from fetch import fetch_all; from hydro import compute_all
r=compute_all(fetch_all())
for b in r: print(b['name'], round(b['inflow_index'],3), round(b['local_index'],3),
                  round(b['flash_flood_risk'],3), b['dry_sky'], round(b['lag_hours'],1))
"
```
Checks: every value in `[0,1]`; no NaN; dam-regulated blocks show a lower inflow than an
unregulated block given similar upstream rain. **In mid-September it is entirely normal for all
values to be near zero — that is not a bug** (`11_fallback_playbook.md` #9). Confirm the maths
against the replay data in A6 instead.

---

## A5 — Routes + in-memory cache (20 min)

Reuse `cache.py` from Session 5 verbatim: one `await refresh_all()` on startup, then a 5-minute
`asyncio` loop, `data_mode` ∈ `starting_up` / `live` / `cached_fallback`. Do not redesign it.

Five endpoints, no more:

| Route | Returns |
|---|---|
| `GET /api/v1/blocks` | static registry: id, name, district, state, lat, lon, river |
| `GET /api/v1/risk/current` | all 12 blocks: 3 hazard scores, severity, `dry_sky`, `data_mode`, `generated_at`, `is_baseline_heuristic:true` |
| `GET /api/v1/blocks/{id}/detail` | the above **plus** upstream breakdown (per-point rainfall + lag), arrival window, contribution split, exposure list, comparison rows, narrative, `reservoir_state_modelled:false` |
| `GET /api/v1/alerts` | flat array, severity ≥ Orange — **this is the responder feed** |
| `GET /api/v1/status` | `last_success`, `age_seconds`, `status` |

Every response carries `data_mode` and `is_baseline_heuristic`. No exceptions
(`MASTER_AGENT_BRIEF.md` §WHAT NEVER CHANGES).

**Skip Groq entirely in Phase A.** Template the narrative:

```python
if dry_sky:
    f"No rainfall over {name} at present. {up3:.0f} mm has fallen across the upstream "
    f"{river} catchment in the last 3 hours. Runoff is estimated to reach {name} "
    f"between {t1} and {t2}."
else:
    f"{severity} {hazard} risk, driven primarily by {top_feature_label} ({value})."
```
A template that says something true and specific beats a Groq call that might time out in front
of the reviewer. Groq goes back in at B4.

**VERIFY A5:**
```bash
uvicorn main:app --port 8000 &
sleep 12
curl -s localhost:8000/api/v1/status | python -m json.tool
curl -s localhost:8000/api/v1/risk/current | python -m json.tool | head -40
curl -s localhost:8000/api/v1/blocks/1/detail | python -m json.tool
curl -s localhost:8000/api/v1/alerts | python -m json.tool
```
Every response must include `data_mode`. Detail must include `upstream`, `arrival_from`,
`arrival_to`, `exposure`, `comparison`. `/status` must show `age_seconds < 300`.

---

## A6 — `scripts/hindcast.py` (25 min)

Same feature and hydro functions, historical endpoint. **One function, two call sites** — do not
fork the logic (`LOCATION_SEARCH_PIPELINE_PLAN.md` §4 discipline, applied here).

```
GET https://historical-forecast-api.open-meteo.com/v1/forecast
    ?latitude=<same 32>&longitude=<same 32>
    &start_date=2025-08-15&end_date=2025-09-05
    &hourly=cape,convective_inhibition,relative_humidity_2m,cloud_cover,
            precipitation,surface_pressure,wind_gusts_10m
    &timezone=Asia/Kolkata
```

Window rationale: the 2025 Punjab floods began around **20 August** and the crisis peaked in the
**last week of August into early September**. A window of 15 Aug – 5 Sep captures build-up, peak
and recession. (The project's earlier "Aug 20 only" framing was too narrow — see
`13_DIFFERENTIATION_AND_JUDGE_DEFENCE.md` §2.)

### Output 1 — `backend/replay_data.json`
Per hour, per block: all three hazard scores, `inflow_index`, `local_index`, `dry_sky`,
`arrival_from/to`, and the templated narrative. This is the offline demo floor. Ship it in git.

### Output 2 — `frontend/src/data/leadtime.json`
Per block, four timestamps and two derived numbers:

| Field | Definition |
|---|---|
| `peak_hour` | hour of maximum rolling **24 h local** rainfall accumulation — treat as impact onset |
| `baseline_alert_ts` | first hour where local rolling-3h precipitation ≥ 50 mm **or** any single hour ≥ 15 mm — *"what a point rainfall-threshold alert would have fired on"* |
| `imd_scale_ts` | first hour where local rolling-24h precipitation ≥ 64.5 mm — *"IMD Yellow colour scale applied to forecast rainfall"* |
| `meghdoot_alert_ts` | first hour where `flash_flood_risk ≥ 0.50` |
| `lead_baseline_h` | `peak_hour − baseline_alert_ts` |
| `lead_meghdoot_h` | `peak_hour − meghdoot_alert_ts` |
| `gain_h` | `lead_meghdoot_h − lead_baseline_h` |

**Naming discipline (from `13` §6):** the baseline is *"rainfall-threshold alert on the same
forecast data"*. It is **never** described as "what IMD said". You have no evidence of IMD's
actual bulletin timing and one sharp question would destroy everything else you claimed.

**VERIFY A6:**
```bash
python scripts/hindcast.py
python -c "
import json;d=json.load(open('frontend/src/data/leadtime.json'))
for b in d: print(b['name'], 'gain', b['gain_h'], 'h')
print('blocks with positive gain:', sum(1 for b in d if b['gain_h']>0), '/', len(d))
"
```
**Expected and desirable: some blocks show `gain_h ≤ 0`.** Ship those. A scorecard that is all
wins is not believable; one with a failure in it is. If *every* block gains, be suspicious of a
bug in `baseline_alert_ts`.

Also confirm `replay_data.json` covers ≥ 400 hourly frames × 12 blocks, and that Gurdaspur /
Ferozepur / Fazilka show a clear late-August spike. If they do not, your window or coordinates
are wrong.

---

## A7 — Dashboard (55 min)

You already have Vite + React + TS + Tailwind + React Router + react-leaflet from Sessions 4–5.

> **Token conflict to settle before you write CSS.** `01_SURE_SHOT_DASHBOARD_DESIGN.md` specifies
> `bg #0B1220 / surface #121B2E / accent #5FA8D3`. The Session-4 log records
> `bg #0A0A0A / surface #171717 / accent #F59E0B` actually configured in `tailwind.config`.
> **Use whatever is already in `tailwind.config.js`. Do not redesign anything today.** Note in
> `project_track.md` which one is live so the docs can be reconciled later.

Map: CARTO dark basemap, 12 markers coloured by the active hazard layer, three layer toggles
bottom-left, LIVE/REPLAY badge + mono timestamp + status dot top bar. Nothing else.

**The Block Detail panel is the entire demo. Build it in this exact order** — if you run out of
time, the rows you built first are the ones that matter most.

**Row A — Severity + Dry-Sky pill.** Big severity badge. When `dry_sky` is true, a prominent
`DRY-SKY FLOOD RISK` pill next to it.

**Row B — The arrival clock.** A live countdown in JetBrains Mono:
`Estimated runoff arrival — 16:10 to 17:10 (in 3h 22m)`.
Nothing else on screen reads as "operational system" the way a countdown does. Below it, in
secondary text: *"Lumped kinematic-wave routing estimate; DEM flow routing pending."*

**Row C — The contribution bar.** Horizontal stacked bar:
`Local rainfall 12% ▏ Upstream catchment 88%`. One glance explains the product.

**Row D — The comparison block.** Three rows, same place, same moment:

| | |
|---|---|
| Standard point forecast | `Rain 0.0 mm/h · Cloud 40% · no alert` |
| IMD colour scale applied to forecast rainfall | `GREEN — below 64.5 mm/24h threshold` |
| **Meghdoot block impact nowcast** | **`ORANGE — upstream inflow, arrival 16:10–17:10, 1,240 exposed`** |

**Row E — Exposure.** `Est. 1,240 people across 4 facilities in the low-lying runoff band`, the
itemised list, and the `DDMA / LGD facility registry integration pending` label.

**Row F — Upstream detail.** Per upstream point: name, distance km, 3h rainfall, individual lag.
This is the "show your working" row that survives a sceptical zoom-in.

**Row G — Narrative sentence** (templated) + `reservoir_state_modelled: false` caveat on
dam-regulated blocks.

**VERIFY A7:**
```bash
cd frontend && npm run build   # must exit 0, zero TS errors
npm run dev
```
Click every one of the 12 markers. Every panel must render all seven rows with no `undefined`,
no `NaN`, no empty string. Toggle all three hazard layers — marker colours must change. Switch
to Replay — the timeline must scrub and the countdown must recompute from the replay frame's
timestamp, not the wall clock.

---

## A8 — Evidence page (20 min)

Route `/evidence`. Reads `leadtime.json` statically — **zero network calls**.

Per block, a horizontal timeline: peak-impact marker, baseline-alert marker, Meghdoot-alert
marker, with the gap shaded and `+3h 40m lead` in large mono type. Sort descending by `gain_h` so
the wins are at the top and the honest losses are visible below the fold but present.

Header line, verbatim:
> *Hindcast over the August 2025 Punjab floods. Baseline = rainfall-threshold alert computed on
> the same forecast data. Both run on identical inputs; only the transformation differs.*

That last clause is the scientific defence: you did not get better data, you extracted more from
the same data. Which is exactly what the PS asked for.

**VERIFY A8:** load `/evidence` with wifi off. It must render fully.

---

## A9 — Rehearsal (15 min) — do not skip this

1. `npm run build` → 0 errors. `git commit`.
2. **Turn wifi off.** Load the dashboard. It should show `STARTING UP` or `cached_fallback`,
   never a fabricated LIVE. Click Replay — it must play end to end. Load `/evidence` — it must
   render. **This is the hard floor. If it holds, the demo cannot be lost.**
3. Wifi back on. Let the 5-minute loop tick once and confirm `data_mode` flips to `live` and the
   timestamp advances.
4. Read the 60-second opening script from `13_DIFFERENTIATION_AND_JUDGE_DEFENCE.md` §4 **out
   loud, twice.** Not silently. Out loud.
5. Have the follow-up answers in `13` §5 open on a second screen or printed.

---

## Phase A definition of done

- [ ] 12 blocks, 20 upstream points, 32 coords, one batched call
- [ ] Lag hours derived from real elevation via kinematic-wave celerity, not typed by hand
- [ ] `dry_sky` flag fires correctly somewhere in the replay data
- [ ] Arrival countdown renders and ticks
- [ ] Contribution split renders
- [ ] Exposure renders with its honesty label
- [ ] Three-row comparison block renders
- [ ] `leadtime.json` exists, includes at least one non-positive `gain_h`, and `/evidence` renders it
- [ ] `/api/v1/alerts` returns clean JSON for a `curl` demo
- [ ] Wifi-off replay verified
- [ ] `npm run build` green, everything committed
- [ ] `project_track.md` updated with a `[Session 7]` block
