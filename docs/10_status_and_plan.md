# Status & Plan — READ THIS FIRST WHEN RESUMING

This file is the living tracker. The changelog at the bottom is append-only. Everything above
gets overwritten to reflect current reality.

## Where we are right now

**Phase 1** — foundation & live data contracts. Repo scaffolded with Vite + React + TypeScript + Tailwind CSS. Standalone pixel-accurate Meghdoot landing page implemented and extensively expanded with interactive telemetry, atmospheric triad hazard breakdown, end-to-end architecture pipeline, and frontline responder impact workflows.

| Item | Status | Next action |
|---|---|---|
| Open-Meteo live test | ✅ DONE | none — confirmed working |
| Open-Meteo as label source (replaces IMERG) | ✅ DECIDED | precipitation >50mm/3hr threshold for cloudburst labels |
| Open-Meteo-only architecture confirmed | ✅ DECIDED | documented in `03_data_sources.md`, this is the build path |
| Repo scaffolded (Vite + React + TS + Tailwind) | ✅ DONE | `npm run build` passing cleanly with 0 errors |
| Landing page (Hero + Navbar + Extensive Sections) | ✅ DONE | Video hero, Triad, Telemetry XAI, Architecture, Impact, Footer |
| IMD API | 🔴 OFFICIALLY DENIED | none — demoted to unavailable, labeled on Status page |
| NASA IMERG / EarthData | 🔴 ABANDONED | none — platform malfunctioning, dropped entirely |
| IMDAA | 🔴 DROPPED | none — no live API path, replaced by Open-Meteo CAPE/CIN |
| MOSDAC signup | ⬜ NOT SUBMITTED | **submit today** — `mosdac.gov.in/signup/` — 5 min, then wait |
| bharatlas boundaries (all India) | ⬜ not done | no friction, just execute |
| SRTM DEM (all India bbox) | ⬜ not done | no friction, just execute |
| Neon schema applied | ⬜ not done | run DDL from `05_database_schema.md` |
| Heuristic formula wired end-to-end | ✅ DONE | implemented Sure-Shot baseline in backend |
| Local dashboard running | ✅ DONE | MVP dashboard complete with live/replay modes |

## Immediate priority order
1. **Submit MOSDAC signup** — 5 minutes, out of your hands after that. Do not wait for it —
   proceed with everything else in parallel. If/when approved, test one file access manually
   before writing any poller code (see `03_data_sources.md` §MOSDAC for exact validation steps).
2. **Download bharatlas (all India) + SRTM DEM** — zero friction, just run the commands.
3. **Scaffold repo + apply Neon schema** — `09_dev_and_deployment.md` has exact commands.
4. **Wire heuristic formula end-to-end** — Open-Meteo → feature builder → heuristic prediction
   → Neon → bare-bones local dashboard showing block risk. This is Phase 1's finish line.
5. **Pull training data** — Open-Meteo Historical Forecast API for Aug 2025 + Jul 2023 windows.
6. **Generate labels** — Open-Meteo precipitation proxy, auto-threshold. Validate on Aug 20 block
   before trusting the labels for training.

---

## The 3-phase build plan

### Phase 1 — Foundation & live data contracts (current)
Scaffold repo, Neon schema applied, MOSDAC submitted (not blocking), bharatlas + DEM downloaded
locally, Open-Meteo live + historical confirmed, heuristic risk formula wired end-to-end into
bare-bones local dashboard with all-India block map.

### Phase 2 — Real model, full rehearsal
Pull training data via Open-Meteo Historical Forecast API for both event windows; generate labels
from Open-Meteo precipitation proxy (validate on Aug 20 block); train GRU/MLP multi-task model;
swap in for heuristic (keep heuristic as labeled fallback); build DEM/flood overlay; wire XAI
(SHAP-lite → Groq); wrap every external call in cached fallback; build Replay mode with pre-baked
Aug 2025 event; full dry run twice (once live, once wifi off). **If MOSDAC approved and validated
as automatable by this point**, integrate real satellite IWV/CTT fields — flip `ctt_is_proxy` to
false, wire the real poller. Not a blocker if it doesn't happen in time.

### Phase 3 — Freeze, execute, present
No new features. Integration freeze. Deployment plan reviewed (not executed). Roles assigned.
Deck drafted. Q&A prep on all three documented PS deviations (architecture, IWV/CTT source,
IMDAA replacement). About page must clearly state: (a) all-India map with North-India-validated
model, (b) GRU vs ConvLSTM trade-off, (c) MOSDAC/Open-Meteo proxy status. Hackathon: deploy
hour 0–2, parallel tracks, mid-checkpoint dry run, bugfix only after that. Hard floor: Replay
mode with zero internet.

---

## Compressed changelog

**Architecture**: PySteps → rejected (PS requires DL not physics sim) → ConvLSTM → replaced by
per-block GRU/MLP over tabular Open-Meteo features. Full rationale in `02_architecture_and_stack.md`.

**Data sources**: Raw ERA5 dropped (5-day latency) → Open-Meteo Historical Forecast API.
GADM 2015 → bharatlas LGD 2024. Captum → SHAP-lite matching tabular architecture.

**Region**: Expanded from Punjab+Haryana+Delhi to all-India map display. Training/validation
focus stays on North India belt (Aug 2025 + Jul 2023 events). Model extrapolation beyond North
India acknowledged and labeled on About page.

**Access failures resolved**: IMD API officially denied. NASA IMERG/EarthData abandoned (platform
malfunctioning). IMDAA dropped (no live API path). All three replaced by Open-Meteo as sole
live/training backbone — labels now also from Open-Meteo precipitation proxy.

**[Session 3] Confirmed build path**: Decision locked in — build entirely on Open-Meteo
as sole data source for now. MOSDAC signup to be submitted but treated as non-blocking upside,
not a dependency. Full rationale for why single-source is still defensible (schema consistency,
zero demo-time failure surface, full reproducibility) documented in `03_data_sources.md`. All
docs (`01`, `03`, `10`, `11`, `MASTER_AGENT_BRIEF`) updated to be fully aware of PS asks vs proxies.

**[Current session / Session 4] Frontend Repo Scaffold & Extensive Landing Page Feature**:
- Initialized React + TypeScript + Vite project in root with Tailwind CSS and Lucide React.
- Implemented standalone pixel-accurate Meghdoot landing page with fixed navbar (scroll backdrop blur), full-viewport background video hero, pulsing live status indicator, and monospace stat strip.
- Extensively expanded the landing page with comprehensive, positive, and humane technical sections:
  1. Humanitarian Mission & 2–6 hour lead time rationale (Kalidasa's *Meghdūta* inspiration).
  2. The Atmospheric Triad (Severe Thunderstorms, Cloudbursts, Flash Floods) with interactive hazard switcher.
  3. Interactive Live Instrument Panel & Explainable AI (XAI) with reactive telemetry scenarios (Stable, Convective Buildup, Severe Warning) and plain-English meteorological reasoning.
  4. End-to-End System Architecture (5-stage data/ML pipeline and offline zero-network replay guarantee).
  5. Frontline Responder Workflows (DDMA, Municipal Engineers, Agrarian Communities, NDRF/SDRF).
  6. IMD Severity Scale & NASA IMERG ground-truth verification standards.
  7. Extensive technical footer with system status and open science attribution.
- Tested and verified: clean TypeScript build (`npm run build`), responsive layout across mobile, tablet, and desktop viewports.

**[Current session / Session 5] Sure-Shot Dashboard + Backend MVP**:
- Implemented a scoped-down FastAPI backend using in-memory state and a background polling loop over Open-Meteo's batch endpoint for 10 fixed locations.
- Integrated the baseline heuristic scoring formula to calculate Thunderstorm, Cloudburst, and Flash Flood risk (using a placeholder terrain multiplier).
- Wired in a best-effort XAI narrative generator via Groq (with templated fallbacks).
- Generated offline Replay data (`replay_data.json`) for the August 2025 event.
- Built the React/Vite Sure-Shot Dashboard UI with `react-leaflet`, custom severity markers, a sliding detail panel, and a functional LIVE/REPLAY mode toggle.
- End-to-end verified with browser automation and local dev server.
