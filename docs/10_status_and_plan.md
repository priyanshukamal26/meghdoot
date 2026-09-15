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

**Phase 1 complete. Phase A (differentiation MVP) starting.**
Repo is Vite + React + TypeScript + Tailwind. Landing page complete. Sure-Shot backend and
dashboard MVP complete and verified. Location-search backend groundwork complete.

| Item | Status | Next action |
|---|---|---|
| Open-Meteo Forecast (live) | ✅ WORKING | none |
| Open-Meteo Historical Forecast | ✅ WORKING | **hostname corrected** to `historical-forecast-api.open-meteo.com` — re-verify via `14` §A0.3 |
| Open-Meteo Elevation API | ✅ NEW, ACTIVE | wire into `terrain.py` (`14` §A2) |
| Open-Meteo Flood API (GloFAS) | ✅ NEW, ACTIVE | validate river points, then `15` §B2 |
| Open-Meteo Geocoding | ✅ WORKING | frontend combobox pending |
| **MOSDAC / INSAT-3D** | ✅ **ACCESS OBTAINED** | access pattern documented in `03_data_sources.md`; ingest is `15` §B1 |
| Repo scaffolded (Vite + React + TS + Tailwind) | ✅ DONE | build green |
| Landing page | ✅ DONE | **frozen — do not touch** |
| Sure-Shot backend MVP | ✅ DONE | being extended, not replaced |
| Sure-Shot dashboard MVP | ✅ DONE | detail panel being rebuilt (`14` §A7) |
| Location search (backend) | ✅ DONE | frontend deferred to post-inspection |
| **Block registry** | 🔴 **WRONG — REPLACE** | old 10-block Ghaggar-Yamuna set misses the Aug 2025 event; replace per `14` §A1 |
| Upstream catchment coupling | ⬜ **THE PRIORITY** | `14` §A1–A4 |
| Lead-time scorecard | ⬜ not done | `14` §A6 + §A8 |
| Exposure register | ⬜ not done | `14` §A1.3 |
| SRTM DEM + pysheds | ⬜ not done | `15` §B5 — **no longer blocking**, Elevation API covers Phase A |
| bharatlas boundaries | ⬜ deferred | not blocking |
| Neon schema applied | ⬜ deferred | `15` §B8, conditional |
| Trained GRU/MLP | ⬜ deferred | `15` §B7, conditional — heuristic ships as labelled baseline |
| IMD API | 🔴 DENIED | closed; we use published IMD *colour thresholds* only, labelled as such |
| NASA IMERG / EarthData | 🔴 ABANDONED | partial recovery possible via MOSDAC IMSRA / GSMap, after `15` §B1 |
| IMDAA | 🔴 DROPPED | replaced by Open-Meteo CAPE/CIN |

---

## Immediate priority order

1. **Read `13_DIFFERENTIATION_AND_JUDGE_DEFENCE.md`.** Ten minutes. Nothing else makes sense
   without it.
2. **Run the four A0 smoke-test curls** (`14` §A0). Fifteen minutes. De-risks the whole build.
3. **Work `14_PHASE_A_MVP_BUILD_PLAN.md` A1 → A9 in order.** Do not skip. Every step has a
   VERIFY gate; the build must be green before moving on.
4. **Then `15_PHASE_B_DEPTH_BUILD_PLAN.md` B0 → B11.** B9 (About page) and B11 (rehearsal) are
   mandatory regardless of what else gets cut. Budget backwards to protect them.

---

## Corrections logged this session — read before touching any data code

| Was | Is |
|---|---|
| Historical Forecast API at `archive-api.open-meteo.com` | **`historical-forecast-api.open-meteo.com`**. `archive-api` is the ERA5 reanalysis archive — different models, different resolution. |
| Demo event = "20 August 2025" | **15 Aug – 5 Sep 2025**. Crisis peaked in the last week of August. |
| Demo event blocks = Ghaggar-Yamuna belt | **Sutlej / Beas / Ravi districts** — Gurdaspur, Amritsar, Ferozepur, Fazilka, Pathankot, Hoshiarpur — plus Ghaggar/Yamuna for breadth. The old registry missed the event. |
| MOSDAC "URL pattern undocumented, format unknown" | **Resolved.** HDF5, CF-1.6, filename `SSNNN_DDMMMYYYY_HHmm_LOP_XXX.h5`, `mdapi` batch tool, Atom granule feed needs no auth. |
| `terrain_multiplier` hand-assigned | **Derived** from Elevation API + kinematic-wave celerity (`14` §A2). Replaced again by pysheds flow accumulation in `15` §B5. |
| Design tokens | **Conflict unresolved.** `01_SURE_SHOT_DASHBOARD_DESIGN.md` says `#0B1220/#121B2E/#5FA8D3`; Session-4 log says `#0A0A0A/#171717/#F59E0B` is what's actually in `tailwind.config.js`. **Use whatever is already in the config. Do not redesign today.** Record which is live in `project_track.md`. |

---

## The build plan (revised)

### Phase A — Differentiation MVP *(current, ~3h30)*
Upstream catchment coupling; elevation-derived routing lag and arrival clock; dry-sky flood
flag; exposure translation; three-row comparison block; lead-time scorecard hindcast over the
real August 2025 event; offline replay. Detailed in `14_PHASE_A_MVP_BUILD_PLAN.md`.

### Phase B — Depth *(~8h, then onward)*
MOSDAC INSAT-3D ingest; GloFAS river discharge; Groq narratives; alert API and webhook; pysheds
DEM flow accumulation; optionally CWC reservoir state, trained GRU/MLP, Neon persistence;
mandatory About/Methods page; deployment; final rehearsal. Detailed in
`15_PHASE_B_DEPTH_BUILD_PLAN.md`.

### Phase C — Freeze and present
No new features. Integration freeze. Q&A drill on all documented deviations. Hard floor: replay
mode with the network physically off.

---

## Compressed changelog

**Architecture**: PySteps → rejected → ConvLSTM → replaced by per-block GRU/MLP over tabular
Open-Meteo features. **Session 7: extended with an upstream-catchment hydrological coupling
layer** — the model's inputs now include upstream rainfall and a derived routing lag, not just
local atmospheric fields. Rationale in `13_DIFFERENTIATION_AND_JUDGE_DEFENCE.md`.

**Data sources**: Raw ERA5 dropped → Open-Meteo Historical Forecast API. GADM → bharatlas LGD
2024. Captum → SHAP-lite. **Session 7: +Open-Meteo Elevation API, +Open-Meteo Flood API
(Copernicus GloFAS), +MOSDAC/INSAT-3D promoted to active.**

**Region**: Punjab+Haryana+Delhi → all-India map display, North India training focus.
**Session 7: block registry moved from the Ghaggar-Yamuna belt to the Sutlej/Beas/Ravi
districts that actually flooded in August 2025.**

**Access failures resolved**: IMD denied; IMERG/EarthData abandoned; IMDAA dropped.

**[Session 3]** Confirmed build path: Open-Meteo as sole source, MOSDAC non-blocking upside.

**[Session 4]** Frontend repo scaffold + extensive landing page. Build green.

**[Session 5]** Sure-Shot backend MVP + dashboard: FastAPI in-memory poller, heuristic scoring,
Groq XAI with template fallback, replay data, react-leaflet map with detail panel and LIVE/REPLAY
toggle. Browser-verified end to end.

**[Session 6]** Location search backend groundwork: `geocoding.py`, point-based fetch with a
12-hour history window, dual-generation Groq narrative.

**[Session 7] Strategic reset after hostile plan screening.**
- Reviewer verdict: *"no newness — Google Maps already tells me this."* Diagnosed as correct
  about the artefact shown and wrong about the problem. Counter-thesis written:
  **impact nowcasting, not weather forecasting.**
- New doc `13_DIFFERENTIATION_AND_JUDGE_DEFENCE.md` — thesis, five ranked differentiators,
  60-second script, six rehearsed follow-up answers, seven new non-negotiable honesty rules.
- New doc `14_PHASE_A_MVP_BUILD_PLAN.md` — sequential ~3h30 build with VERIFY gates.
- New doc `15_PHASE_B_DEPTH_BUILD_PLAN.md` — sequential depth build through to deployment.
- New doc `16_ANTIGRAVITY_KICKOFF_PROMPT.md` — agent kickoff prompt with build-integrity rules.
- `03_data_sources.md` rewritten against verified online sources. Four corrections, three new
  active sources, MOSDAC promoted to active with a fully documented access pattern.
- **Central technical insight:** the August 2025 Punjab floods were caused by ~46% above-normal
  rainfall in the *upstream Himachal catchments* plus dam releases, hitting *downstream* Punjab
  districts. This is the real-world proof of the upstream-coupling thesis, and it revealed that
  the existing block registry missed the primary demo event entirely.
- **No code written this session.** Next session must execute `14` A0→A9 before anything else.
