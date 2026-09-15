# Fallback & Risk Playbook

One entry per known risk. Log every fallback actually taken in `project_track.md` with a
timestamp — don't quietly switch paths.

## 1. IMD API — OFFICIALLY DENIED (resolved, not a live risk)
- **Status**: Access formally denied. Closed.
- **Fallback taken**: Demoted to "unavailable" on Data Status page. District `Obj_id`s sourced
  from bharatlas LGD codes directly. Core predictions never depended on IMD. Alert cross-check
  skipped and labeled as such. No further action needed.

## 2. MOSDAC near-real-time access doesn't materialize / access pattern unautomatable
- **Symptom**: Signup submitted but approval doesn't come through before Phase 2 model build,
  OR approval comes through but the file access pattern (URL structure, format, cadence) can't
  be automated within reasonable effort.
- **Detect**: Submit signup now. Once approved, do a manual single-file test before writing any
  poller code — confirm URL pattern is predictable, confirm file format (NetCDF/HDF5 vs image),
  confirm cadence is actually near-real-time and not batch-delayed.
- **Fallback (current default state)**: CTT-drop-rate and IWV run permanently on Open-Meteo
  proxy. `ctt_is_proxy = true` in schema. Labeled on About page as a documented deviation from
  the PS — the PS explicitly calls INSAT WV/TIR channels the primary source for these signals.
- **If approved AND automatable**: real INSAT satellite fields replace proxy. Same code path
  supports both (`ctt_is_proxy` flag flips to false). This closes ~2 of the 3 documented PS
  deviations and meaningfully improves alignment with the "cornerstone" IWV requirement.
- **What specifically MOSDAC would provide**: TPW (=IWV) from INSAT-3D Water Vapor channel,
  CTT from INSAT-3D Thermal Infrared channel. See `03_data_sources.md` for full detail.

## 3. IMDAA — DROPPED (resolved, not a live risk)
- **Status**: Dropped. No live API path exists — batch download only, multi-terabyte scale.
- **Fallback taken**: Open-Meteo CAPE/CIN used in its place — same physical quantities,
  different source (model-derived vs radiosonde-assimilated). No further action needed.

## 4. IMERG — ABANDONED (resolved, not a live risk)
- **Status**: EarthData platform malfunctioning. Three sequential failure modes exhausted
  (auth-header-stripped-on-redirect → unhandled exception type → 200-status HTML served as data).
  Decision made to abandon IMERG entirely rather than keep sinking time into it.
- **Fallback taken**: Open-Meteo `precipitation` field from Historical Forecast API used as
  label proxy. Thresholds: >50mm rolling 3hr window = cloudburst; lower CAPE+rainfall combined
  = thunderstorm; precipitation value = rain_intensity regression target.
- **Why this is weaker, honestly**: IMERG is gauge-adjusted satellite-observed precipitation.
  Open-Meteo precipitation is model-predicted. For large-scale events (both our demo events),
  the signal should still be strong. For genuinely hyper-local extremes, model-predicted
  precipitation may smooth over or miss the peak — this is a real limitation to state honestly.
- **Validation required**: open Aug 20 2025 data in xarray, confirm model flags correct blocks
  in held-out window. If recall is poor, fall back to heuristic (see #10).
- Do not retry IMERG. Do not revisit EarthData. It's dead.

## 5. ERA5 latency (resolved architecturally)
- Raw ERA5/Copernicus CDS has ~5-day latency. Never re-add to live path. Fully replaced by
  Open-Meteo Historical Forecast API. If anyone suggests re-adding, point here.

## 6. Venue network fails or is heavily firewalled
- **Detect**: first thing at venue, before anything else.
- **Fallback**: Replay mode becomes primary demo path. Zero live calls. Non-negotiable.

## 7. Render free-tier cold start
- **Symptom**: 30–50 second first load. Looks broken to judges.
- **Fallback**: UptimeRobot ping running from 2+ hours before demo. Local uvicorn as instant
  fallback if Render still spins. Never let a judge sit on a spinner.

## 8. Timezone / unit mismatches
- Not a live fallback — a Phase 1 discipline rule. Every Open-Meteo call passes
  `&timezone=Asia/Kolkata` always. Add a test that fails the build if this param is ever missing.

## 9. Off-season live demo — nothing dramatic happening live
- September is late monsoon. Real chance no severe weather during demo slot.
- **Fallback**: expected, not a failure. Live mode proves the system polls real data (ticking
  timestamp, real values). Narrative weight carried entirely by Replay mode on Aug 2025 event.

## 10. Trained model underperforms or isn't ready
- **Fallback**: Phase 1 heuristic formula ships as `is_baseline_heuristic = true`. State this
  honestly. Do not force a weak neural net in just to claim "we trained a model."
- **Trigger for this decision**: validation precision/recall on Aug 2025 held-out window clearly
  worse than the heuristic formula.

## 11. Open-Meteo precipitation labels produce garbage precision/recall
- **Symptom**: model trained on Open-Meteo precip labels shows poor recall on Aug 2025 event
  in held-out window. Signal not strong enough for the proxy to work — see #4's honest caveat.
- **Fallback**: ship heuristic as primary (see #10). On About page, state that label quality
  was insufficient for supervised training and explain the heuristic approach — judges will
  respect honesty over a falsely confident model.

## 12. API contract drift between backend and frontend
- Schema in `07_api_spec.md` is frozen once frontend work starts. Any change: update doc first,
  notify team. No silent field renames mid-build.

## 13. DEM/flow-accumulation too noisy or slow at block resolution
- **Fallback**: slope-weighted rainfall-intensity estimate without full flow routing. Still
  PS-consistent approximation, just simpler than full pysheds watershed delineation.

## 14. All-India block count too heavy for free-tier Neon or Render
- **Symptom**: too many blocks to poll + store per cycle; DB writes too slow; API response
  payload too large for dashboard.
- **Fallback**: narrow live polling to North India belt (training region) only. Show other blocks
  on map in greyed-out "no data" state. Document this limitation on About page.
