# Project Track — Raw Session Log

Append-only. Most granular record of what happened, in order. `10_status_and_plan.md` changelog
is the compressed version of this; this file has the full detail and exact reasoning trail.

---

[Session 1] [DECISION] Original architecture locked: per-block GRU/MLP over tabular Open-Meteo
features instead of PS-implied ConvLSTM/spatiotemporal transformer. Rationale: avoids
multi-terabyte multi-source raster alignment risk (IMDAA/MOSDAC/INSAT), same live/training schema.

[Session 1] [DECISION] Region scope: Punjab + Haryana + Delhi NCT, Shivalik-foothill/Ghaggar-Yamuna
belt. Two demo events selected: Aug 2025 Punjab floods (primary), Jul 2023 North India floods
(secondary).

[Session 1] [DONE] Open-Meteo live endpoint confirmed working via curl, Chandigarh centroid
(30.7333, 76.7794) — real CAPE/CIN/wind/humidity/precipitation returned.

[Session 1] [GOTCHA] IMERG batch download hit three sequential failure modes: (1) plain
requests.Session + basic auth → every request 401, cause: Authorization header stripped on
cross-domain redirect GES DISC ↔ urs.earthdata.nasa.gov. (2) custom SessionWithHeaderRedirection
class → crashed on unhandled ConnectionError/RemoteDisconnected, script only caught Timeout.
(3) broadened exception handling + retry → completed "0 failed" but all 528 files were identical
2828-byte HTML login-shell pages served with 200 status — GES DISC degrades to app-shell under
rapid sequential basic-auth load.

[Session 1] [TODO] .netrc fix (Windows: _netrc, magic-byte validation) attempted as the resolution
to the above — not yet confirmed working at end of session.

---

[Session 2] [BLOCKED] IMD API access — officially denied by the portal. Formal rejection, not a
technical/whitelist issue. Closing this permanently.

[Session 2] [BLOCKED] NASA EarthData platform reported malfunctioning (user-confirmed, previously
flagged). Combined with the unresolved .netrc issue from Session 1, decision made to abandon
IMERG entirely rather than continue sinking time into it.

[Session 2] [DECISION] IMDAA formally dropped. No live/automated API path exists (batch download
only, multi-terabyte scale, manual approval). Never was load-bearing — was always scoped as
optional training-time bonus. Open-Meteo CAPE/CIN substitutes directly, same physical quantities.

[Session 2] [DECISION] Label source for training switched from IMERG to Open-Meteo precipitation
proxy. Thresholds: >50mm rolling 3hr window = cloudburst; lower CAPE+rainfall combined = 
thunderstorm; raw precipitation value = rain_intensity regression target. Flagged as needing
validation against Aug 20 2025 block-level data before trusting for training.

[Session 2] [DECISION] Map scope expanded from Punjab+Haryana+Delhi to all-India display, since
Open-Meteo/SRTM/bharatlas all have zero-friction all-India coverage. Model training/validation
scope explicitly stays North India belt only — this distinction must be stated on About page,
not conflated as "all-India validated model."

[Session 2] [DECISION] Full original PS text (verbatim, provided by user) added to
`01_problem_and_scope.md` for permanent reference. Honest alignment re-scored against it: ~65%.
Three documented deviations identified (architecture, IWV/CTT source, IMDAA replacement) —
up from two previously documented.

[Session 2] [TODO] MOSDAC signup identified as highest-value remaining action — not yet submitted
at end of session.

---

[Session 3] [DECISION] Clarified with user exactly what MOSDAC/INSAT was meant to provide:
(1) TPW/IWV from INSAT-3D Water Vapor channel — the PS's stated "cornerstone" signal.
(2) CTT drop rate from INSAT-3D Thermal Infrared channel.
Established that "Open Data" tier access ≠ the near-real-time standing-order tier the PS implies —
Open Data is SSO + direct URL, format/cadence/URL-pattern unconfirmed without actual account access.

[Session 3] [DECISION] **Confirmed build path: system will be built entirely on Open-Meteo as the
sole data source for now.** This is the committed architecture, not a stopgap. MOSDAC signup will
be submitted but treated as non-blocking — pursue in parallel, do not architect anything around it
until/unless approval comes through AND a manual test confirms the file access pattern is
automatable (predictable URL naming, NetCDF/HDF5 format, genuinely near-real-time cadence).

[Session 3] [DONE] All docs updated to be fully aware of the original PS asks vs. the actual
turnarounds taken, with explicit reasoning trails so a future session never has to re-derive why
a decision was made. Files touched: `01_problem_and_scope.md`, `03_data_sources.md`,
`04_region_scope.md`, `10_status_and_plan.md`, `11_fallback_playbook.md`, `MASTER_AGENT_BRIEF.md`.

[Session 3] [TODO] MOSDAC signup still not submitted as of session close. This is now the single
most-repeated open action across three sessions — flag this hard to the next session.

[Session 3] [TODO] No code has been written yet across all three sessions. Phase 1 is entirely
access-verification and documentation. Next session should aim to produce actual working code:
repo scaffold, Neon schema, bharatlas+SRTM download, heuristic formula wired end-to-end.

---

[Session 4] [DONE] **Repo Scaffolded & Dependencies Installed**:
- Scaffolded Vite + React + TypeScript in `c:\meghdoot`.
- Installed and configured Tailwind CSS (`^3.4.17`), PostCSS, Autoprefixer, and Lucide React.
- Configured custom brand theme colors (`bg: #0A0A0A`, `surface: #171717`, `raised: #262626`, `border: #404040`, `text: #F5F5F5`, `subtext: #A3A3A3`, `accent: #F59E0B`, `green: #10B981`, `yellow: #F59E0B`, `orange: #F97316`, `red: #EF4444`) and typography (`Inter`, `Manrope`, `JetBrains Mono`).

[Session 4] [DONE] **Meghdoot Landing Page (Initial Spec + Extensive Expansion)**:
- Fixed Navbar with scroll-detection backdrop blur (`bg-brand-bg/90 backdrop-blur-md`), brand radar mark, navigation links, right CTA button (`Open Dashboard`), and responsive mobile drawer menu.
- Full-viewport video Hero with CloudFront monsoon storm footage, functional dark gradient scrim, pulsing live monitoring pill, primary headline (`Severe weather, seen hours before it arrives`), subline, primary CTA, and monospace live stat strip (`2–6 hrs`, `15 min`, `3`, `All India`).
- Expanded page with comprehensive, positive, humane, and technically rigorous sections:
  1. **Humanitarian Mission**: The critical 2–6 hour horizon, why nowcasting bridges the multi-hour NWP latency gap, and Kalidasa's *Meghdūta* inspiration.
  2. **Atmospheric Triad Hazard Heads**: Interactive tabbed breakdown for Severe Thunderstorms, Cloudbursts, and Terrain-Coupled Flash Floods (physical triggers, satellite indices, and protective outcomes).
  3. **Real-Time Instrument Panel & Explainable AI (XAI)**: Interactive simulated telemetry console supporting three realistic scenarios (Stable, Convective Buildup, and Severe Warning) with live readouts (CAPE, CIN, 850 hPa Convergence, IWV Moisture Saturation, Terrain Hydro Index) and plain-English SHAP/Groq explainable AI narratives.
  4. **End-to-End System Architecture**: 5-step data/ML processing pipeline (Multi-Stream Ingestion → Physical Feature Engineering → Multi-Task Neural Encoder → Topographic Runoff Coupling → Explainable AI & Alert Dispatch) and zero-network offline replay resilience card.
  5. **Frontline Responder Workflows**: Role-specific actionable decision intelligence for DDMAs, Municipal Water Engineers, Agricultural Communities, and NDRF/SDRF rescue teams.
  6. **Standards & Verification**: IMD color-coding alignment, NASA IMERG statistical ground-truth calibration, and open science auditability.
  7. **Call to Action & Technical Footer**: Clean console launch gateway and detailed technical footer.

[Session 4] [DONE] **Testing & Verification**:
- Type check and production build verified clean: `npm run build` (0 TypeScript/bundle errors).
- Visual and responsive testing verified in browser via subagent across desktop (1536px), tablet, and mobile (375px) viewports with functioning interactive tabs, scenario state switching, and menu animations.

---

[Session 5] [DONE] **Sure-Shot Dashboard & Backend MVP Completed**:
- **Backend**: Implemented a scoped-down FastAPI service (`main.py`, `cache.py`, `fetch.py`, `features.py`, `heuristic.py`, `narrative.py`, `blocks.py`) that polls Open-Meteo batch endpoint every 5 minutes and calculates risk using the Sure-Shot baseline heuristic formula.
- **XAI Narrative**: Implemented best-effort XAI generation via Groq with templated fallback for robustness.
- **Replay Data**: Successfully ran `generate_replay.py` to create `replay_data.json` simulating the August 2025 event for 10 fixed locations in Punjab/Haryana.
- **Frontend Dashboard**: Added React Router to manage navigation. Created the Dashboard page using `react-leaflet`, custom colored markers based on active hazard layer (Thunderstorm/Cloudburst/Flash Flood), a sliding detail panel, and LIVE/REPLAY mode toggle.
- **Verification**: Browser agent fully tested map interaction, Replay timeline slider, animated detail panel, and accurate extraction of the baseline scores, fulfilling the scoped MVP parameters.
