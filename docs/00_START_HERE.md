# Meghdoot — Start Here

**Meghdoot** (मेघदूत, "cloud messenger," after Kalidasa's poem) — an AI-driven hyper-local early
warning system for severe weather nowcasting, built for **SIH26077** (Ministry of Earth Sciences /
NCMRWF), covering Punjab + Haryana + Delhi.

**If you're resuming this project**: read `10_status_and_plan.md` first — it's the live snapshot of
what's done, what's blocked, and the exact next action. Everything else in this folder is stable
reference/spec, not a moving target.

## Document index

| File | Contents |
|---|---|
| `00_START_HERE.md` | This file — orientation and document map |
| `01_problem_and_scope.md` | PS requirements condensed into a traceability matrix; MVP scope; non-goals; personas |
| `01_SURE_SHOT_DASHBOARD_DESIGN.md` | Sure-Shot Dashboard UI specification (Leaflet, rows A–G) |
| `02_architecture_and_stack.md` | System architecture, data flow, free-tier services |
| `02_SURE_SHOT_BACKEND_DESIGN.md` | Sure-Shot backend endpoints and in-memory design |
| `03_data_sources.md` | External data sources (Open-Meteo, GloFAS, MOSDAC/INSAT, Elevation) |
| `04_region_scope.md` | Region scope, district lists, historical demo events |
| `05_database_schema.md` | Database schema reference (Neon Postgres DDL, deferred) |
| `06_ml_model_spec.md` | Model architecture, features, labels, training, XAI |
| `07_api_spec.md` | FastAPI routes, parameters, verified response shapes |
| `08_frontend_and_design.md` | Pages, flows, visual design system (Tailwind brand + radar tokens) |
| `09_dev_and_deployment.md` | Local setup + deployment procedures |
| `10_status_and_plan.md` | **Live status + Phase progress + compressed changelog.** Read first when resuming. |
| `11_fallback_playbook.md` | Every known failure mode and its verified fallback |
| `12_glossary.md` | Technical and meteorological terminology dictionary |
| `13_DIFFERENTIATION_AND_JUDGE_DEFENCE.md` | **Highest-priority judge defense**: thesis, dry-sky flood risk, scripts, Q&A |
| `14_PHASE_A_MVP_BUILD_PLAN.md` | Phase A Upstream MVP build specification (A0–A9, completed) |
| `15_PHASE_B_DEPTH_BUILD_PLAN.md` | Phase B Depth build plan (B0–B11) |
| `16_ANTIGRAVITY_KICKOFF_PROMPT.md` | Agent kickoff prompt with build-integrity rules |
| `LOCATION_SEARCH_PIPELINE_PLAN.md` | Geocoding and arbitrary location search design |
| `MASTER_AGENT_BRIEF.md` | Master agent brief: core principles, non-negotiable rules |
| `project_track.md` | Raw append-only session log |

## The one rule that overrides all others

**Local first. Offline resilient.** The demo must survive with wifi physically off. Replay mode runs from local pre-computed datasets with zero external network requests.

## Quick facts

| | |
|---|---|
| Project | Meghdoot, SIH26077, sponsor MoES/NCMRWF |
| Region | Punjab + Haryana + Himachal Catchments + Bihar River Basins |
| Hazards | Severe thunderstorms, cloudbursts, terrain-coupled flash floods (2–6hr lead time) |
| Stack | Vite + React 19 + TypeScript + Tailwind CSS (Frontend) + FastAPI + Uvicorn (Backend) |
| Data & Cache | Open-Meteo (NWP, Elevation, GloFAS) + MOSDAC INSAT-3D + In-Memory Poller + Local JSON Fallback |
| AI / XAI | Groq LLM (`llama3-8b-8192`) + physical template fallback |
| Cost | Free tier only, everywhere |

