# MEGHDOOT — MASTER AGENT BRIEF
> Single source of truth for any AI agent working this project.
> Read this → then `13_DIFFERENTIATION_AND_JUDGE_DEFENCE.md` → then `10_status_and_plan.md` → then act.
> **Updated Session 7.**

---

## WHAT IS THIS

**Meghdoot** (मेघदूत — "cloud messenger", after Kalidasa's poem) is an AI-driven hyper-local
early warning system for severe weather nowcasting, built for **Smart India Hackathon,
Problem Statement SIH26077**, sponsored by the **Ministry of Earth Sciences / NCMRWF**.

It predicts thunderstorms, cloudbursts and flash floods **2–6 hours in advance** across India.
Model trained and validated on the North India belt; all-India map coverage displayed with that
caveat stated on the About page.

The sponsor (NCMRWF) built IMDAA themselves. They will see through a generic submission.
Everything is documented, traceable and honest about its trade-offs.

---

## THE THESIS — READ THIS BEFORE ANY DESIGN DECISION

> **Meghdoot does not forecast weather. It forecasts arrival and impact.**

A flash flood in Rupnagar is not caused by rain **in** Rupnagar. It is caused by rain 100 km
**upstream** in Himachal, hours earlier. When the water arrives, the sky overhead can be clear.
A point-forecast app has no concept of a catchment and **structurally cannot show this**.

That gap is the product. It is also exactly what the PS asks for: DEM-based flash-flood
translation and an alert API for disaster responders.

**Never argue that Meghdoot forecasts the atmosphere better than Open-Meteo, IMD or Google.**
That argument is unwinnable. Argue that forecasting the atmosphere and forecasting the impact
are different problems. Full reasoning, demo script and rehearsed answers:
`13_DIFFERENTIATION_AND_JUDGE_DEFENCE.md`.

---

## THE ONE RULE THAT OVERRIDES EVERYTHING

**Local first. Deploy only on the final day.** Neon Postgres is a DB connection, not hosting.
Vercel/Render deployment happens only when `09_dev_and_deployment.md` says "deploy now".

---

## PROJECT IDENTITY

| Field | Value |
|---|---|
| PS number | SIH26077 |
| Sponsor | MoES / NCMRWF |
| Map coverage | All India (68.0°E, 8.0°N → 97.5°E, 37.5°N) |
| Monitored blocks (Phase A) | 12, across the Sutlej / Beas / Ravi / Ghaggar / Yamuna systems |
| Upstream sampling points | 20, in the Shivalik and Himachal headwaters |
| Training / validation focus | North India belt |
| Hazards | Severe thunderstorms · Cloudbursts · Flash floods |
| Lead time | 2–6 hours |
| Model | Per-block GRU/MLP over tabular features **+ upstream catchment coupling** |
| Cost | Free tier only, no credit card anywhere |
| Stack | Vite + React + TS + Tailwind · FastAPI · (Neon, deferred) · Groq |

---

## DOCUMENT MAP

| File | Read when you need to… |
|---|---|
| `00_START_HERE.md` | 2-minute overview |
| `01_problem_and_scope.md` | PS text, traceability, MVP checklist, three deviations |
| `02_architecture_and_stack.md` | Architecture, data flow, schema-consistency rule |
| `01_SURE_SHOT_DASHBOARD_DESIGN.md` / `02_SURE_SHOT_BACKEND_DESIGN.md` | The scoped MVP built in Session 5 — still the base being extended |
| **`03_data_sources.md`** | Every source. **Rewritten Session 7.** Read before any data code. |
| `04_region_scope.md` | Region, districts, demo events |
| `05_database_schema.md` | Postgres DDL (+ Session 7 additions in `15` §B8) |
| `06_ml_model_spec.md` | Model architecture, features, labels, XAI |
| `07_api_spec.md` | Routes, cron, fallback logic |
| `08_frontend_and_design.md` | Pages, flows, design system |
| `09_dev_and_deployment.md` | Local setup + final-day deployment |
| **`10_status_and_plan.md`** | **THE LIVE TRACKER. Read every session. Update at end.** |
| `11_fallback_playbook.md` | Failure modes with detect/fallback |
| `12_glossary.md` | Meteorological and technical terms |
| **`13_DIFFERENTIATION_AND_JUDGE_DEFENCE.md`** | **The thesis, demo script, rehearsed answers.** |
| **`14_PHASE_A_MVP_BUILD_PLAN.md`** | **Sequential ~3h30 differentiation build.** |
| **`15_PHASE_B_DEPTH_BUILD_PLAN.md`** | **Sequential depth build through deployment.** |
| `16_ANTIGRAVITY_KICKOFF_PROMPT.md` | Agent kickoff prompt |
| `LOCATION_SEARCH_PIPELINE_PLAN.md` | On-demand analyse endpoint (backend done, frontend deferred) |

---

## DATA SOURCE STATUS — SESSION 7

Four independent families now, not one.

| Source | Status | Role |
|---|---|---|
| Open-Meteo Forecast | ✅ WORKING | Live atmosphere, 32 coords in one batched call |
| Open-Meteo **Historical Forecast** | ✅ WORKING | Training + hindcast. **Hostname is `historical-forecast-api.open-meteo.com`** — `archive-api` is ERA5, a different product |
| Open-Meteo **Elevation** | ✅ NEW | Terrain for kinematic-wave routing lag. 100 coords/call, no key |
| Open-Meteo **Flood (GloFAS)** | ✅ NEW | River discharge m³/s. Modelled, daily, ~5 km. **Points must sit on the channel** |
| Open-Meteo Geocoding | ✅ WORKING | Location search |
| **MOSDAC / INSAT-3D** | ✅ **ACCESS OBTAINED** | TPW (IWV) + CTT. HDF5, batch `mdapi` tool, predictable filenames. **Batch, not a stream** |
| SRTM DEM | ⬜ Phase B | pysheds flow accumulation |
| bharatlas LGD | ⬜ deferred | Block polygons |
| CWC reservoir | ⬜ optional | Reservoir headroom, the real Aug 2025 amplifier |
| IMD API | 🔴 DENIED | We use published IMD *colour thresholds* only, labelled as such |
| NASA IMERG / EarthData | 🔴 ABANDONED | Partial recovery possible via MOSDAC IMSRA / GSMap |
| IMDAA | 🔴 DROPPED | Replaced by Open-Meteo CAPE/CIN |
| Raw ERA5 direct | 🔴 REJECTED | 5-day latency |

**Why the multi-source story is now true without breaking schema consistency:** the *model input*
path is still single-source (Open-Meteo, identical schema live and historical), so there is still
zero train/inference drift. GloFAS, INSAT and terrain enter as **independent corroboration and
impact translation**, not as competing training inputs.

---

## ARCHITECTURE

### What we do
Per-block time-series GRU/MLP over tabular features **plus an upstream catchment coupling layer**
that routes upstream rainfall to each block using an elevation-derived travel time.

### Why (judge answer)
A spatial-grid ConvLSTM needs perfectly-aligned multi-source raster sequences from
IMDAA + MOSDAC + INSAT — multi-terabyte, manual, approval-gated. The per-block approach uses one
batched API call, the same schema for training and inference, and trains in hours not days.

### What's preserved
Three physical precursor categories (moisture / instability / lift) · multi-task shared encoder →
3 heads · CTT drop rate · DEM overlay · XAI (SHAP-lite → Groq).

### What changed (own it)
Satellite grids → per-block tabular features · ConvLSTM → GRU/MLP · INSAT channels → Open-Meteo
proxy **except where a real MOSDAC granule was read**.

### Three documented PS deviations (state on About page)
1. GRU/MLP instead of spatiotemporal transformer.
2. IWV/CTT from Open-Meteo proxy — **now partially closed** by real INSAT-3D ingest.
3. IMDAA replaced by Open-Meteo CAPE/CIN.

---

## THE ROUTING METHOD (new, Session 7 — memorise this)

For each (upstream point → block) pair:

```
L        = haversine_km × 1.35            # sinuosity, Himalayan foreland rivers
S        = (elev_up − elev_block) / (L × 1000)
v        = clip(1.0 + 40·√S, 0.8, 4.0)    # m/s, Manning-type
c        = (5/3)·v                        # kinematic-wave celerity, wide channel
lag_h    = L·1000 / (c·3600)
```
Block lag = mean over its four upstream points. Arrival window = lag ± 25%, floor ±0.5 h.

Labelled in the UI as **"lumped kinematic-wave routing estimate; DEM flow routing pending"**
until `15` §B5 replaces it with DEM-traced channel lengths.

---

## WHAT NEVER CHANGES

- `data_mode` on every response — `live` / `cached_fallback` / `replay` / `starting_up`
- `is_baseline_heuristic` — true until a trained model demonstrably beats the heuristic
- `ctt_is_proxy` — false **only** for timestamps where a real MOSDAC granule was read; never
  blanket-flipped
- `reservoir_state_modelled` — false until CWC data is integrated
- `routing_method` — `kinematic_estimate` | `dem_routed`
- `is_demo_data` on exposure records
- `within_validated_core` on any ad-hoc point query
- `&timezone=Asia/Kolkata` on every Open-Meteo call — build-failing test required
- Replay mode survives zero internet — the demo floor, never regress
- The scorecard baseline is **"rainfall-threshold alert on the same forecast data"**, never
  "what IMD would have said"
- The IMD row is **"IMD colour scale applied to forecast rainfall"**, never "IMD's warning"
- The lead-time scorecard **includes at least one block where we did poorly**
- Three PS deviations stated on the About page

---

## FALLBACK HIERARCHY

1. MOSDAC granule unreadable → `3DIMG_L1B_STD` TIR-1 brightness temperature as direct CTT proxy
2. Historical Forecast API down → `archive-api` ERA5, **labelled as reanalysis-derived**
3. GloFAS point returns null → the point is off-channel; nudge onto the river, or drop the row
4. pysheds too slow/noisy → slope-weighted intensity, no full flow routing (`11` #13)
5. Trained model weak → heuristic ships with `is_baseline_heuristic=true`, stated honestly
6. Groq down/slow → template narrative, always
7. Venue network dead → Replay mode, zero internet
8. Render cold start → UptimeRobot + local uvicorn
9. Nothing dramatic happening live in September → expected, not a failure; Replay carries the
   narrative (`11` #9)

---

## AGENT RULES

1. Read `13_DIFFERENTIATION_AND_JUDGE_DEFENCE.md` and `10_status_and_plan.md` before every session
2. Work `14` then `15` **sequentially**. Do not skip steps. Every step has a VERIFY gate.
3. **Run the build after every change.** `npm run build` exits 0 and the backend imports clean,
   or the step is not done. Commit only green states.
4. Update `10_status_and_plan.md` and `project_track.md` at end of every session
5. One fact lives in one file — no duplication
6. Test before building on top of anything
7. **Never substitute silently — label every fallback**
8. Deployment is final-day only
9. Own the trade-offs — never apologise for them
10. **Never let a model-generated narrative emit a number that is not in its input payload**
