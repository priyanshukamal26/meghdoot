# Data Sources — Access, Status, Known Gotchas

Status reflects current confirmed reality. See `10_status_and_plan.md` for moment-to-moment tracker.

---

## ACTIVE — what the system actually runs on

### Open-Meteo — live + historical + labels. The entire backbone.
- **Live inference**: `api.open-meteo.com/v1/forecast`, no key, no rate limit concerns at our scale.
- **Training data**: `archive-api.open-meteo.com` Historical Forecast API — same models, params,
  units, format as live. Coverage from 2021+. One parsing code path handles both. This is the
  schema-consistency guarantee that makes the whole approach work.
- **Fields used**:
  - `cape` — direct, no derivation
  - `convective_inhibition` — direct
  - `relative_humidity_2m` + `cloud_cover` — combined to derive `iwv_proxy`
  - `cloud_cover` rate of change over 2 timesteps → `ctt_drop_rate` proxy
  - U/V wind at 850hPa + 500hPa → `convergence_850` and `wind_shear` via MetPy
  - `precipitation` — rolling sum for `rainfall_recent` feature AND for label generation
- **Label generation** (replaces IMERG):
  - `cloudburst`: `precipitation` > 50mm in rolling 3hr window
  - `thunderstorm`: lower combined CAPE + precipitation threshold
  - `rain_intensity`: raw precipitation value (mm/hr) as regression target
  - **Validation required before trusting labels**: open Aug 20 2025 data in xarray,
    confirm model flags correct blocks in held-out window. If recall is poor → heuristic fallback.
- **Coverage**: all of India. No access changes needed for all-India expansion.
- **CRITICAL**: Always pass `&timezone=Asia/Kolkata` on every call. This caused a real bug risk
  and must never regress. Add a test that fails if this param is missing.
- **STATUS: ✅ CONFIRMED LIVE AND WORKING.**

---

## PENDING — submit and wait, do not block on

### MOSDAC — `mosdac.gov.in`
- **What we actually need from MOSDAC**: two specific derived products from INSAT-3D/3DR:
  1. **TPW (Total Precipitable Water)** = IWV. Derived from INSAT-3D Water Vapor channel.
     The PS calls this the "cornerstone" of storm nowcasting. We need gridded field values
     extractable per block centroid, at ~30min cadence.
  2. **CTT (Cloud Top Temperature)**. Derived from INSAT-3D Thermal Infrared channel. We need
     rate of change over 2 timesteps per block — the drop rate signals explosive vertical growth.

- **Why we can't depend on it right now**:
  - Account approval is by email, not instant — timeline unknown.
  - Even with Open Data access (SSO + direct URL), the URL naming convention for files is
    not documented cleanly. INSAT products embed date/time in filenames — probably reversible,
    but untested. Until we can confirm a predictable URL pattern, we can't automate 30-min polling.
  - File format unknown without access — if they serve JPEG/PNG images, per-block value extraction
    needs rasterization (extra complexity). If NetCDF/HDF5, it's straightforward.
  - The "standing order" near-real-time stream tier (automated push) is restricted to privileged
    operational agency users. We will not get that tier.

- **What MOSDAC approval would actually unlock**:
  - Replace `iwv_proxy` (Open-Meteo humidity/cloud derived) with real TPW satellite field.
  - Replace `ctt_drop_rate` proxy (cloud cover trend) with actual TIR-derived CTT drop rate.
  - Closes the two largest PS alignment gaps from ~65% to ~85%+ alignment.
  - The schema already supports this — `ctt_is_proxy` boolean in `features` table is false only
    when real MOSDAC CTT is used. Code path supports both; proxy is the default.

- **If MOSDAC access comes through**: test URL pattern manually first. Confirm NetCDF/HDF5.
  Confirm 30-min cadence is automatable. Only then wire it into the poller. Do not architect
  anything around MOSDAC until you've done that test.

- **STATUS: ⬜ SIGNUP NOT YET SUBMITTED. Submit at `mosdac.gov.in/signup/`. Takes 5 minutes.
  Start the email approval clock regardless of everything else.**

---

## DEAD — do not retry, do not revisit

### IMD API — `api.imd.gov.in`
- **STATUS: 🔴 OFFICIALLY DENIED.** Access formally rejected.
- **Was going to provide**: alert cross-check/validation only. Was never load-bearing for
  core predictions. District `Obj_id`s sourced from bharatlas LGD codes directly.
- **Replacement**: none needed. System fully functional without it. Labeled "unavailable"
  on Data Status page. Alert cross-check skipped and labeled as such.

### NASA IMERG — `disc.gsfc.nasa.gov`
- **STATUS: 🔴 ABANDONED.** EarthData platform malfunctioning.
- **Was going to provide**: gauge-adjusted satellite precipitation labels for training.
  The ground-truth rainfall values that IMERG produces are more accurate than model-predicted
  precipitation — it's the difference between "what the satellite observed" vs "what the
  Open-Meteo model calculated." For localized extreme events (cloudbursts), this matters.
- **Why we're not waiting**: three sequential failure modes exhausted (auth stripping on redirect,
  unhandled exceptions, 200-status HTML served as data). Platform itself malfunctioning, not
  just an auth issue. Sunk cost at this point.
- **Replacement**: Open-Meteo precipitation proxy. Weaker for localized extremes. Sufficient
  for the two large-scale demo events (Aug 2025, Jul 2023) where signal is strong. Validate before trusting.

### IMDAA Reanalysis — `rds.ncmrwf.gov.in`
- **STATUS: 🔴 DROPPED.** No live API path — batch download only, manual, multi-terabyte scale.
- **Was going to provide**: the PS's stated thermodynamic baseline — multi-level temperature,
  specific humidity, geopotential height, U/V wind for CAPE/CIN derivation. NCMRWF built this
  themselves; it's the most scientifically rigorous source for these quantities.
- **Why we dropped it**: no live/automated access path. Batch downloads are too slow for
  real-time inference. And the physical quantities (CAPE, CIN, convergence, shear) are available
  directly from Open-Meteo with identical units — different model, same science.
- **Replacement**: Open-Meteo CAPE/CIN/wind fields. Same quantities, different source. Judges
  from NCMRWF will notice. Own it as a documented deviation.

### NASA Earthdata / AppEEARS
- **STATUS: 🔴 PLATFORM MALFUNCTIONING.** Account active, platform non-functional.
  AppEEARS confirmed dead end for IMERG regardless. Dropped entirely.

### Raw ERA5 / Copernicus CDS
- **STATUS: 🔴 REJECTED (architectural).** ~5-day latency even on fast release. Unusable for
  anything live. Replaced by Open-Meteo Historical Forecast API for training data.

---

## WHY OPEN-METEO ONLY IS STILL A DEFENSIBLE STORY

The original plan had 4 data sources (Open-Meteo + IMERG + IMD + MOSDAC/IMDAA). Three are dead.
Here is why the single-source approach is not just a fallback but arguably stronger:

1. **Zero train/inference drift.** Same API, same model, same schema — live and historical.
   There is no gap between what the model trained on and what it sees at inference time.
   Multi-source pipelines introduce this risk constantly.
2. **No external dependencies to break at demo time.** One API call fails, you have a cache.
   Four API calls fail, you have four failure modes during the demo.
3. **Reproducible.** Any judge can replicate the pipeline with zero data access approvals.

The honest weakness: IWV from model output is not the same as IWV from satellite observation.
CAPE/CIN from Open-Meteo is not the same as CAPE/CIN derived from IMDAA radiosonde assimilation.
These are proxy signals, not the primary observational data the PS describes. State this on the
About page. Judges respect honesty far more than silence about substitutions.
