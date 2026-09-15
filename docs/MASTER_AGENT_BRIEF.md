# MEGHDOOT — MASTER AGENT BRIEF
> Single source of truth for any AI agent working this project.
> Read this first. Then read `10_status_and_plan.md`. Then act.

---

## WHAT IS THIS

**Meghdoot** (मेघदूत — "cloud messenger", after Kalidasa's poem) is an AI-driven hyper-local
early warning system for severe weather nowcasting built for **Smart India Hackathon 2024,
Problem Statement SIH26077**, sponsored by the **Ministry of Earth Sciences / NCMRWF**.

It predicts thunderstorms, cloudbursts, and flash floods **2–6 hours in advance** across
**all of India** using spatiotemporal deep learning — not physics simulation. Model is trained
and validated on North India belt events; all-India map coverage is displayed with that caveat
clearly stated on the About page.

The sponsor (NCMRWF) built IMDAA themselves. They will see through a generic submission.
Everything is documented, traceable, and honest about its trade-offs.

---

## THE ONE RULE THAT OVERRIDES EVERYTHING

**Local first. Deploy only on the final day.**
Neon Postgres is a DB connection — live from Day 1. Vercel/Render deployment happens only
when `09_dev_and_deployment.md` explicitly says "deploy now."

---

## PROJECT IDENTITY

| Field | Value |
|---|---|
| PS number | SIH26077 |
| Sponsor | MoES / NCMRWF |
| Map coverage | All India (68.0°E, 8.0°N → 97.5°E, 37.5°N) |
| Training/validation focus | Punjab + Haryana + Delhi NCT (North India belt) |
| Hazards | Severe thunderstorms · Cloudbursts · Flash floods |
| Lead time | 2–6 hours |
| Model | Per-block GRU/MLP over tabular features (not ConvLSTM — see §ARCHITECTURE) |
| Cost | Free tier only, no credit card anywhere |
| Stack | Next.js (Vercel) + FastAPI (Render) + Neon Postgres + Groq (XAI) |

---

## DOCUMENT MAP

| File | Read when you need to… |
|---|---|
| **`00_START_HERE.md`** | Get a 2-minute overview |
| **`01_problem_and_scope.md`** | PS requirements, PS→implementation traceability, MVP checklist, three documented deviations |
| **`02_architecture_and_stack.md`** | System architecture, data flow, schema-consistency rule, all services |
| **`03_data_sources.md`** | Every data source: confirmed, dead, or pending. Read before any data pipeline code. |
| **`04_region_scope.md`** | All-India map vs North India training focus, district list, demo events |
| **`05_database_schema.md`** | Full Postgres DDL. Read before any DB code. |
| **`06_ml_model_spec.md`** | Model architecture, features, label strategy, XAI approach |
| **`07_api_spec.md`** | Every FastAPI route, cron cadences, fallback logic |
| **`08_frontend_and_design.md`** | Every page, popup, user flow, design system |
| **`09_dev_and_deployment.md`** | Local setup (do first every session) + final-day deployment |
| **`10_status_and_plan.md`** | **THE LIVE TRACKER. Read every session. Update at end of session.** |
| **`11_fallback_playbook.md`** | 14 failure modes with detect/fallback/escalation |
| **`12_glossary.md`** | Meteorological and technical terms |

---

## DATA SOURCE STATUS — CURRENT

**Confirmed build decision: the system is built entirely on Open-Meteo for now.** This is not a
temporary patch — it's the committed architecture until/unless MOSDAC access is approved AND
proven automatable. Full detailed rationale for every source below lives in `03_data_sources.md` —
read it before touching any data pipeline code, especially before reconsidering any "dead" source.

| Source | Status | Role |
|---|---|---|
| Open-Meteo (live + historical) | ✅ CONFIRMED WORKING | Sole backbone: live features, training data, AND labels |
| SRTM DEM | ⬜ not downloaded | Flash-flood overlay |
| bharatlas LGD 2024 | ⬜ not downloaded | Block boundaries (all India) |
| MOSDAC | ⬜ SIGNUP NOT SUBMITTED — submit, don't wait on it | Would provide real TPW(IWV)/CTT from INSAT — see below |
| IMD API | 🔴 OFFICIALLY DENIED | Was alert cross-check only. System works without it. |
| NASA IMERG / EarthData | 🔴 ABANDONED | Platform malfunctioning. Replaced by Open-Meteo labels. |
| IMDAA | 🔴 DROPPED | No live API path. Replaced by Open-Meteo CAPE/CIN. |
| Raw ERA5 | 🔴 REJECTED | 5-day latency. Architecturally dead. |

**What MOSDAC would specifically provide, if it comes through:**
- TPW (Total Precipitable Water = IWV) from INSAT-3D Water Vapor channel — the PS's "cornerstone"
- CTT (Cloud Top Temperature) drop rate from INSAT-3D Thermal Infrared channel
- Why it's not wired in yet: account approval pending (email, not instant), and even once
  approved the URL pattern/file format/actual cadence for automation is unconfirmed. Do not build
  a poller around it until a manual single-file test confirms it's automatable.
- If it comes through and is automatable: `ctt_is_proxy` flips to false, real fields replace the
  Open-Meteo proxy through the same code path. This closes most of PS deviation #2.

**Why single-source is still defensible, not just a fallback**: zero train/inference schema
drift, one external dependency to fail at demo time instead of four, full reproducibility for
judges with no data-access approvals needed. The honest cost: IWV/CTT from Open-Meteo model
output is not the same fidelity as satellite-observed INSAT data, and Open-Meteo CAPE/CIN is not
IMDAA-radiosonde-derived. State this plainly on the About page — do not let a judge discover it.

---

## ARCHITECTURE — THE DECISION THAT MATTERS MOST

### What we do
**Per-block time-series GRU/MLP over tabular features** from Open-Meteo.

### Why (judge answer)
A spatial-grid ConvLSTM needs perfectly-aligned multi-source raster sequences from
IMDAA + MOSDAC + INSAT. That's multi-terabyte, manual, approval-gated. The per-block approach
uses one Open-Meteo call per block per timestep, same schema for training and inference,
trainable in hours not days.

### What's preserved (the science)
- ✅ Three physical precursor categories: moisture (IWV proxy) + instability (CAPE/CIN) + lift (convergence/shear)
- ✅ Multi-task: shared GRU encoder → 3 heads (thunderstorm / cloudburst / rain intensity)
- ✅ CTT drop rate as validation signal (Open-Meteo cloud-cover proxy; MOSDAC if approved)
- ✅ DEM overlay (SRTM + pysheds)
- ✅ XAI (SHAP-lite → Groq)

### What changed (own it)
- ❌ Satellite grids → ✅ Per-block tabular features
- ❌ ConvLSTM/transformer → ✅ GRU/MLP
- ❌ INSAT WV/TIR channels → ✅ Open-Meteo humidity/cloud proxy (unless MOSDAC approved)

### Three documented PS deviations (state on About page, never hide)
1. GRU/MLP instead of spatiotemporal transformer
2. IWV/CTT from Open-Meteo proxy instead of INSAT satellite (unless MOSDAC approved)
3. IMDAA replaced by Open-Meteo CAPE/CIN

---

## MODEL PIPELINE

```
Input: [batch, 6 timesteps, 7 features] per block
  cape | cin | iwv_proxy | ctt_drop_rate | convergence_850 | wind_shear | rainfall_recent
          ↓
    GRU shared encoder (try MLP too; keep whichever validates better)
          ↓
    Shared dense layer
     ↙           ↓            ↘
Head 1         Head 2         Head 3
thunderstorm   cloudburst     rain intensity
probability    probability    (mm/hr, regression)
(sigmoid)      (sigmoid)           ↓
                         × flow_accumulation_weight (static SRTM)
                                   ↓
                           flash_flood_risk (per block)
```

**Labels (from Open-Meteo precipitation proxy):**
- `cloudburst`: >50mm in rolling 3hr window
- `thunderstorm`: lower CAPE + rainfall combined threshold
- `rain_intensity`: continuous mm/hr value

**Validate labels on Aug 20 2025 (flood onset date) before trusting them.**

---

## DATABASE — TABLE SUMMARY

| Table | Role |
|---|---|
| `districts` | Districts in scope |
| `blocks` | All-India LGD polygons |
| `weather_snapshots` | Raw poller output per API call |
| `features` | Derived feature row per block per timestep |
| `predictions` | Model output: 3 heads + flash_flood_risk |
| `alerts` | Written only on threshold crossing |
| `xai_explanations` | Groq narrative per alert, generated once, cached forever |
| `replay_events` | Pre-baked historical frames. Zero live calls at demo. |
| `api_health_log` | Poll health per source — powers /status page |

---

## FRONTEND — PAGES

| Page | Purpose |
|---|---|
| `/` | Landing: full video hero, live stat strip, Mission, Triad heads, Live XAI Telemetry, Pipeline, Impact, Footer |
| `/dashboard` | Full-bleed all-India Leaflet map. Block polygons by risk. LIVE/REPLAY badge always visible. |
| Block detail panel | Risk + 6-timestep sparkline + XAI narrative + alert badge |
| `/alerts` | Severity-sorted filterable list |
| `/about` | PS traceability, honest data labels, three documented deviations, training region caveat |
| `/status` | Live health per source. Judge transparency + team debug. |

---

## CURRENT PHASE STATUS

**Phase 1 — Foundation & Live Data Contracts**
Access situation is resolved. Frontend repository initialized with landing page feature complete.

| Item | Status |
|---|---|
| Open-Meteo confirmed working | ✅ |
| IMD / IMERG / IMDAA | 🔴 all dead, decisions made |
| Repo scaffolded (Vite + React + TS + Tailwind) | ✅ |
| Landing page (Hero + Extensive Sections) | ✅ |
| MOSDAC signup | ⬜ **submit today** |
| bharatlas + SRTM download | ⬜ no friction, just execute |
| Neon schema applied | ⬜ |
| Heuristic formula wired end-to-end | ⬜ Phase 1 finish line |

---

## FALLBACK HIERARCHY

Full detail in `11_fallback_playbook.md`. Short version:

1. MOSDAC not approved → IWV/CTT stay on Open-Meteo proxy, labeled
2. Open-Meteo labels give poor validation → ship heuristic as primary
3. Venue network dead → Replay mode, zero internet required
4. Render cold start → UptimeRobot + local uvicorn fallback
5. Trained model weak → heuristic as `is_baseline_heuristic=true`, stated honestly
6. All-India too heavy → narrow live polling to North India belt, greyed blocks elsewhere

---

## WHAT NEVER CHANGES

- `data_mode` on every API response — frontend always knows what it's seeing
- `ctt_is_proxy` flag — data honesty, visible to judges
- `is_baseline_heuristic` flag — same
- `&timezone=Asia/Kolkata` on every Open-Meteo call — tested bug risk, non-negotiable
- Replay mode survives zero internet — demo floor, never regress
- Three PS deviations stated on About page — judges respect honesty

---

## AGENT RULES

1. Read `10_status_and_plan.md` before every session
2. Update `10_status_and_plan.md` at end of every session
3. One fact lives in one file — no duplication
4. Test before building on top of anything
5. Never substitute silently — label every fallback
6. Deployment is final-day only
7. Own the trade-offs — never apologize for them
