# Status & Plan — READ THIS FIRST WHEN RESUMING

This file is the living tracker. The changelog at the bottom is append-only. Everything above
gets overwritten to reflect current reality.

> **SESSION 7 — THE PROJECT HAS A NEW NORTH STAR.**
> Plan screening returned a hostile verdict: *"You are using the OpenMeteo API that everyone
> uses. IMD sends rainfall warning alerts beforehand. I get whatever warnings I need from Google
> Maps. No newness."*
>
> **Read `13_DIFFERENTIATION_AND_JUDGE_DEFENCE.md` immediately after this file.** It contains
> the counter-thesis, the demo script and the rehearsed answers. Every build decision from here
> must be justifiable against it.
>
> Then work sequentially through `14_PHASE_A_MVP_BUILD_PLAN.md`, then
> `15_PHASE_B_DEPTH_BUILD_PLAN.md`. Do not freestyle.

---

## The one-line thesis

**Meghdoot does not forecast weather. It forecasts arrival and impact.**
A flash flood in Rupnagar is caused by rain 100 km upstream in Himachal, hours earlier. A
point-forecast app has no concept of a catchment and structurally cannot show this. That gap is
what we build, and it is exactly what the PS asks for.

---

## Where we are right now

**Phase A (Differentiation MVP) COMPLETE & VERIFIED. Phase B features partially delivered.**
Repo is Vite + React 19 + TypeScript + Tailwind CSS. Landing page, Sure-Shot backend, Dashboard with full Block Detail sliding panel, offline replay engine, Evidence scorecard page, and live Bihar river telemetry are all working.

| Item | Status | Notes |
|---|---|---|
| Open-Meteo Forecast (live) | ✅ WORKING | 32-coord batched fetch in `fetch.py` |
| Open-Meteo Historical Forecast | ✅ WORKING | Powers `generate_replay.py` / `replay_data.json` |
| Open-Meteo Elevation API | ✅ INTEGRATED | `terrain.py` computes kinematic celerity and travel lags |
| Open-Meteo Flood API (GloFAS) | ✅ ACTIVE | Corroborates river discharge ($m^3/s$) |
| Open-Meteo Geocoding | ✅ WORKING | `geocoding.py` with India result priority |
| **MOSDAC / INSAT-3D** | ✅ **ACCESS DOCUMENTED** | Access pattern in `03_data_sources.md` |
| Repo scaffolded (Vite + React + TS + Tailwind) | ✅ DONE | `npm run build` exits 0 |
| Landing page | ✅ DONE | Includes live Bihar telemetry widget + scenario console |
| Sure-Shot backend MVP | ✅ DONE | FastAPI with 7 live endpoints + in-memory poller |
| Sure-Shot dashboard MVP | ✅ DONE | Leaflet map + Block Detail panel (Rows A–G) |
| Location search (backend) | ✅ DONE | Point fetch + dual narrative |
| **Block registry (12 blocks + 20 upstream points)** | ✅ **DONE** | Full Sutlej/Beas/Ravi/Ghaggar/Yamuna set in `blocks.py` |
| Upstream catchment coupling | ✅ **DONE** | `hydro.py` calculates upstream 3h rain + dry-sky flag |
| Lead-time scorecard (`/evidence`) | ✅ **DONE** | `leadtime.json` rendered on static `/evidence` page |
| Exposure register | ✅ **DONE** | Population & facility counts in `blocks.py` |
| Live Bihar river basin telemetry | ✅ **DONE** | `bihar_flood.py` + `GET /api/v1/bihar/flood` |
| Disaster advisory engine | ✅ **DONE** | `advisory.py` integrated |
| Offline Replay Mode | ✅ **DONE** | Plays August 2025 flood reconstruction offline |
| SRTM DEM + pysheds | ⬜ Phase B depth | `terrain.py` lumped kinematic wave active for now |
| Neon schema applied | ⬜ deferred | In-memory cache ensures offline demo survival |
| Trained GRU/MLP | ⬜ deferred | Physically motivated baseline labelled with `is_baseline_heuristic: true` |

---

## Immediate priority order

1. **Review `13_DIFFERENTIATION_AND_JUDGE_DEFENCE.md`.** Memorize the 60-second opener and Q&A rebuttals.
2. **Offline demo test.** Verify that with wifi off, Replay Mode and `/evidence` render perfectly.
3. **Demo Script practice.** Run the 3-step walkthrough: Landing Page -> Dashboard (Live & Replay) -> Evidence scorecard.

---

## Corrections logged — read before touching any data code

| Was | Is |
|---|---|
| Historical Forecast API at `archive-api.open-meteo.com` | **`historical-forecast-api.open-meteo.com`**. `archive-api` is the ERA5 reanalysis archive — different models, different resolution. |
| Demo event = "20 August 2025" | **15 Aug – 5 Sep 2025**. Crisis peaked in the last week of August. |
| Demo event blocks = Ghaggar-Yamuna belt | **Sutlej / Beas / Ravi districts** — Gurdaspur, Amritsar, Ferozepur, Fazilka, Pathankot, Hoshiarpur — plus Ghaggar/Yamuna for breadth. |
| MOSDAC "URL pattern undocumented, format unknown" | **Resolved.** HDF5, CF-1.6, filename `SSNNN_DDMMMYYYY_HHmm_LOP_XXX.h5`, `mdapi` batch tool, Atom granule feed needs no auth. |
| `terrain_multiplier` hand-assigned | **Derived** from Elevation API + kinematic-wave celerity (`14` §A2). |
| Design tokens | Coexisting: `brand.*` for Landing Page, `radar.*` for Dashboard. |

---

## The build plan status

### Phase A — Differentiation MVP: ✅ 100% COMPLETE & COMMITTED
- A1: 12-block registry + 20 upstream points + exposure register (`blocks.py`).
- A2: Terrain elevation + kinematic-wave routing lags (`terrain.py`).
- A3: Batched 32-coordinate fetch (`fetch.py`).
- A4: Hydro upstream catchment coupling, dry-sky flag, arrival window (`hydro.py`).
- A5: Cache loop & FastAPI endpoints (`cache.py`, `main.py`).
- A6: Hindcast replay generation (`replay_data.json`, `leadtime.json`).
- A7: Dashboard map + sliding Block Detail panel (`src/pages/Dashboard.tsx`).
- A8: Evidence page scorecard (`src/pages/Evidence.tsx`).
- A9: Verification and smoke tests passed.

### Phase B — Depth Features (Progressive additions)
- ✅ Bihar River Basin telemetry (`bihar_flood.py` + endpoint + Landing Page component).
- ✅ Disaster response advisory engine (`advisory.py`).
- ⬜ MOSDAC real granule ingest (Phase B1).
- ⬜ pysheds 2D flow routing (Phase B5).

### Phase C — Freeze and present
- Integration freeze maintained.
- Rehearsals and offline validation prioritized.

---

## Compressed changelog

**[Session 7]** Strategic reset after hostile screening. Authored `13_DIFFERENTIATION_AND_JUDGE_DEFENCE.md` and `14_PHASE_A_MVP_BUILD_PLAN.md`. All 4 smoke-test API curls passed (A0).

**[Session 8]** Executed Phase A MVP (commits `aec5d4a` through `a5e4025`):
- Built `blocks.py`, `terrain.py`, `fetch.py`, `hydro.py`, `generate_replay.py`.
- Updated Dashboard with `radar-*` styling, live countdown, horizontal split bars, and 3-row comparison block.
- Built `/evidence` scorecard page with honest lead-time comparisons.
- Clean build: zero TypeScript errors, verified with live uvicorn.

**[Session 9]** Refinements and Expansion (commits `6b1514d`, `ea1a2da`):
- Added `bihar_flood.py` fetching live discharge and warning levels for major Bihar rivers.
- Added `advisory.py` for structured operational response protocols.
- Updated Landing Page with live Bihar river telemetry monitor and radar animations.
- Verified live FastAPI backend running with 7 active endpoints.

