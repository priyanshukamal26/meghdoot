# Meghdoot — Sure-Shot Dashboard: Design & Data Sourcing

## SCOPE NOTE — READ FIRST

This is the guaranteed-to-work version of the Dashboard, scoped for the hours remaining, not
the full production vision in `08_frontend_and_design.md`. Every design decision below optimizes
for "definitely works when a judge is watching" over "matches the eventual full spec." The
upgrade path back to the full spec is noted at the end of each section — nothing here contradicts
the original docs, it's a smaller, safer slice of the same plan.

**In scope**: ~10 fixed North-India-belt locations, live Open-Meteo-derived risk, a flash-flood
layer using a placeholder terrain factor, one-sentence XAI, a live/replay mode badge, a pre-baked
replay event, a status indicator.

**Explicitly out of scope for this pass** (all still valid future work): all-India map coverage,
real bharatlas polygon boundaries, real pysheds DEM flow-accumulation, a trained GRU/MLP model,
Neon Postgres persistence, MOSDAC, the location-search feature (separate plan, build after this
works).

---

## DESIGN TOKENS (reused as-is from `08_frontend_and_design.md` — do not redesign)

- Backgrounds: bg `#0B1220`, surface `#121B2E`, raised `#1A2740`, border `#25314A`
- Text: `#E8EDF7` primary, `#8B9BB8` secondary
- Accent: `#5FA8D3`
- Severity: Green `#3DBA6D` · Yellow `#E8C547` · Orange `#E8873D` · Red `#D4483D`
- Fonts: Inter/Manrope for UI text, JetBrains Mono for every numeric readout (CAPE values,
  coordinates, timestamps, discharge numbers — anything that looks like a measurement)
- Map: dark basemap (CARTO dark-matter or similar), so risk markers/polygons stand out

## PAGE COMPOSITION (trimmed site map)

```
/dashboard
 ├─ Top bar: Meghdoot wordmark · LIVE/REPLAY mode badge · last-updated timestamp (mono)
 ├─ Map area (full-bleed): 10 fixed location markers, colored by highest-severity hazard
 ├─ Layer toggle (bottom-left, persistent): Thunderstorm / Cloudburst / Flash Flood
 ├─ Click a marker → slide-in Block Detail panel
 ├─ Alerts strip (top of panel or a thin persistent strip): any block currently Orange/Red
 ├─ Replay toggle: switches the whole page to the pre-baked Aug 2025 event, zero live calls
 └─ Status dot (small, corner): Open-Meteo health — green/red, hover for last-success time
```

No onboarding tour, no full landing-page sections repeated here, no Alerts page as a separate
route for this pass — fold "active alerts" into a strip on the Dashboard itself. Simpler surface,
same substance.

---

## COMPONENT-BY-COMPONENT: WHERE THE DATA COMES FROM

This table is the actual point of this document — for every visible thing on the page, exactly
what produces it, so nothing on screen is ever a mystery or a silent guess.

| UI element | Data source | Origin | Refresh | If it fails |
|---|---|---|---|---|
| **Mode badge** (LIVE / REPLAY) | `data_mode` field on `/api/v1/risk/current` response | Backend sets this per-request based on whether the last Open-Meteo call succeeded | Every fetch | If backend can't reach Open-Meteo AND has no in-memory snapshot yet, badge shows "STARTING UP" — never shows LIVE with stale/fake data |
| **Last-updated timestamp** | `generated_at` on the same response | Backend timestamp of the last successful poll cycle | Same as above | Frozen timestamp visibly ages — frontend can grey it out past ~20 min old as a passive honesty signal |
| **10 location markers** | `/api/v1/blocks` | Hardcoded static list in the backend (see backend doc) — name, lat, lon | Fetched once on page load, doesn't change during a session | If this call fails, show a full-page "map data unavailable" state, not a blank map |
| **Marker color** | `/api/v1/risk/current` → `severity` per block, per the currently-toggled hazard layer | Computed live by the backend heuristic from that block's latest Open-Meteo pull | Every ~5 min (matches backend refresh loop) | Grey/outline marker with a small "!" if that specific block's data is stale/missing — never silently reuse a different block's color |
| **Layer toggle (3 hazards)** | Same `/api/v1/risk/current` payload, just re-reads a different field (`p_thunderstorm` / `p_cloudburst` / `flash_flood_risk`) client-side | No new fetch needed — one response carries all three | N/A (client-side toggle) | N/A |
| **Block Detail panel — risk numbers** | `/api/v1/blocks/{id}/detail` | Backend's per-block feature snapshot + risk scores | On click | If the specific block's live pull failed, show its last good in-memory snapshot with a visible "cached Xmin ago" label |
| **Block Detail — feature sparkline** | Same detail response, `features_history` array | Last 3–6 hourly points from the single Open-Meteo call (`past_hours` param), not a separate DB query | Same call as above | If history is thin (just started), show fewer points honestly rather than padding with fake ones |
| **Block Detail — XAI "why" sentence** | Same detail response, `xai.narrative` | Backend: simple rule picks the top-weighted feature from the heuristic formula, phrased via one Groq call; if Groq fails, a plain templated sentence is used instead (see backend doc) | Generated once per block per refresh cycle, not per click | If both Groq and the template path somehow fail, show the raw top feature name/value plainly — never leave this field blank |
| **Flash-flood badge on the panel** | Same detail response, `flash_flood_risk` + `terrain_note` | `rain_intensity proxy × static terrain multiplier` (hand-assigned placeholder per block — see backend doc) | Same refresh cycle | The panel visibly labels this as "terrain factor: preset, live DEM sampling in progress" — this is the one honesty label that must never be dropped, it's the difference between an honest placeholder and an overclaim |
| **Alerts strip** | Derived client-side (or a tiny backend helper) by filtering the same `/api/v1/risk/current` payload for severity ≥ Orange | No separate alerts pipeline needed for this pass — one source of truth | Same refresh cycle | Empty strip if nothing crosses threshold — this is a valid, expected state, not an error |
| **Replay toggle** | `/api/v1/replay/aug_2025_punjab_floods/frames` | A static bundled JSON file, ideally built from a real Open-Meteo Historical Forecast API pull for Aug 20 2025 for these same 10 blocks (see backend doc for the 20-minute script to make this real instead of hand-authored) | Loaded once, stepped through client-side, zero further calls | This must never fail live — it's a static file shipped with the app, not a network dependency at demo time |
| **Status dot** | `/api/v1/status` | Backend's last poll success/failure + timestamp, held in memory | Every ~5 min | If backend itself is unreachable, the frontend's own fetch failure IS the status signal — show "backend unreachable" rather than a stuck dot |

---

## SEVERITY THRESHOLDS (shared across all three hazard heads for this pass)

| Score range | Label | Color |
|---|---|---|
| 0.00–0.25 | Green | `#3DBA6D` |
| 0.25–0.50 | Yellow | `#E8C547` |
| 0.50–0.75 | Orange | `#E8873D` |
| 0.75–1.00 | Red | `#D4483D` |

Keep one shared table for thunderstorm/cloudburst/flash-flood in this pass rather than
hazard-specific thresholds — simpler to reason about and to explain live if asked. Tune later.

---

## WHAT TO SAY OUT LOUD ABOUT EVERY PLACEHOLDER (own it, don't hide it)

Consistent with the rest of this project's culture: every simplification above should be a
sentence you can say to a judge without flinching.
- "Ten fixed locations, not all-India yet — this proves the pipeline end to end on the belt that
  actually floods."
- "Flash-flood terrain factor is a hand-assigned placeholder right now, positioned correctly
  relative to which of these towns sit in the floodplain versus the foothills — full DEM sampling
  is the very next step, already scoped."
- "No Postgres yet — state lives in memory, refreshed every five minutes, because that removes a
  failure mode for tonight without changing the architecture story."

## UPGRADE PATH (unchanged targets, just deferred)

Real bharatlas polygons → real pysheds flow-accumulation → Neon persistence + real cron →
trained GRU/MLP replacing the heuristic → all-India marker set → location-search feature layered
on top (separate plan, already written).
