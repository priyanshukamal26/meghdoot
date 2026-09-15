# Data Sources — Access, Status, Known Gotchas

> **UPDATED Session 7.** Four changes of substance:
> 1. **Correction** — the Historical Forecast API hostname in previous versions of this doc was
>    wrong. `archive-api.open-meteo.com` is the ERA5 *reanalysis* archive, a different product.
> 2. **New** — Open-Meteo Elevation API and Flood API (Copernicus GloFAS) added as active sources.
> 3. **MOSDAC promoted from PENDING to ACTIVE** — account access obtained; the access pattern is
>    now documented and verified against MOSDAC's own API manual.
> 4. **Demo event window corrected** — the August 2025 Punjab floods peaked in the *last week*
>    of August, not on the 20th alone, and hit the Sutlej/Beas/Ravi districts rather than the
>    Ghaggar-Yamuna belt the block registry previously targeted.

Status reflects current confirmed reality. See `10_status_and_plan.md` for the live tracker.

---

## ACTIVE — what the system actually runs on

### 1. Open-Meteo Forecast API — live atmospheric backbone
- `https://api.open-meteo.com/v1/forecast`, no key, no auth.
- **Multiple locations in one request** via comma-separated `latitude` / `longitude` lists;
  returns an array of results in the same order as the input. Meghdoot uses **one call for all
  32 coordinates** (12 block centroids + 20 upstream catchment points).
- Fields used: `cape`, `convective_inhibition`, `relative_humidity_2m`, `cloud_cover`,
  `precipitation`, `surface_pressure`, `wind_gusts_10m`, with `past_hours=12&forecast_hours=6`.
- **CRITICAL, unchanged:** always pass `&timezone=Asia/Kolkata`. A build-failing test must assert
  this (`11_fallback_playbook.md` #8).
- **Gotcha:** the response may be a bare object for a single coordinate and an array for many.
  Normalise to a list unconditionally.
- **STATUS: ✅ CONFIRMED WORKING.**

### 2. Open-Meteo Historical Forecast API — training + hindcast
- `https://historical-forecast-api.open-meteo.com/v1/forecast`
- **This is the correction.** It is a continuous hourly series built by stitching the first hours
  of each successive model run, so it closely tracks real conditions and uses the **same models,
  parameters, units and format as the live Forecast API**. Coverage from ~2021. That identity is
  the schema-consistency guarantee the whole architecture rests on.
- `https://archive-api.open-meteo.com/v1/archive` is the **ERA5 / ERA5-Land reanalysis** archive
  (1940+, 0.25°/0.1°). Different models, different resolution. Use only as a labelled fallback.
- Two sibling endpoints exist and are worth knowing about for the lead-time work:
  **Previous Runs API** (variables at a fixed 1–7 day lead offset, from Jan 2024) and
  **Single Runs API** (`single-runs-api.open-meteo.com`, full forecast horizon of one specific
  run, selectable by `run=` init time). The Single Runs API is the rigorous way to backtest
  without look-ahead bias — a Phase-C upgrade, not needed for the current hindcast.
- **STATUS: ✅ CONFIRMED — verify with the A0.3 smoke test before each build session.**

### 3. Open-Meteo Elevation API — terrain, no download required
- `https://api.open-meteo.com/v1/elevation?latitude=...&longitude=...`
- 90 m DEM, **up to 100 coordinate pairs per request**, no key.
- **Role:** samples elevation at every block and upstream point, which is what lets the routing
  lag be *derived* rather than hand-assigned. See `14_PHASE_A_MVP_BUILD_PLAN.md` §A2.
- **This removes the need to download any DEM file for Phase A.** A full SRTM raster is still
  required for pysheds flow accumulation in Phase B, but nothing blocks on it now.
- **STATUS: ✅ NEW, ACTIVE.**

### 4. Open-Meteo Flood API (Copernicus GloFAS) — river discharge
- `https://flood-api.open-meteo.com/v1/flood`
- Daily `river_discharge` in m³/s from the **Global Flood Awareness System**, the modelling
  family European flood agencies use operationally. GloFAS v4, seamless from 1984, forecast out
  to 210 days. Variables: `river_discharge`, `_mean`, `_median`, `_max`, `_min`, `_p25`, `_p75`.
- **Critical gotcha:** GloFAS is a **river-routing model on ~5 km river cells**. A coordinate in
  a field or a town centre away from the channel returns near-zero or null. Put the point **on
  the blue line**. Each block therefore needs a `river_point` distinct from its centroid.
- **Honest limitations to state:** modelled not gauged; daily not hourly; ~5 km resolution so the
  nearest river may be mis-selected. It **corroborates** the flash-flood head; it must never
  drive the 2–6 hour nowcast.
- **Role:** an independent hydrological variable that no consumer weather app surfaces, and a
  very strong Evidence-page artefact (the Ravi/Sutlej discharge spike in late August 2025).
- **Licence/attribution:** Copernicus Emergency Management Service, CC BY 4.0.
- **STATUS: ✅ NEW, ACTIVE.**

### 5. Open-Meteo Geocoding API — location search
- `https://geocoding-api.open-meteo.com/v1/search`, `name` accepts a place name **or a postal
  code**. India-prioritised server-side (`country_code == "IN"` first).
- **STATUS: ✅ CONFIRMED (Session 6 groundwork complete).**

### 6. MOSDAC / INSAT-3D & 3DR — **PROMOTED FROM PENDING TO ACTIVE**

Account access is now held. The access pattern below is verified against MOSDAC's own
*User Manual for MOSDAC Data Download API*.

**How access actually works**
- Tool: `mdapi` — `https://www.mosdac.gov.in/software/mdapi.zip`, containing `mdapi.py` and
  `config.json`. Requires Python 3+ and `requests` (`tqdm` optional). Run `python mdapi.py`.
- **Search requires no login.** Leave `user_credentials` blank to search or preview. Only
  *download* needs an approved account.
- `config.json` schema: `user_credentials{username,password}`;
  `search_parameters{datasetId, startTime "YYYY-MM-DD", endTime, count (max 100),
  boundingBox "minLon,minLat,maxLon,maxLat", gId}`;
  `download_settings{download_path, organize_by_date, skip_user_prompt, generate_error_log,
  error_log_path}`. The file **must** stay named `config.json`.
- `datasetId` is the exact Product Name from `https://mosdac.gov.in/catalog-app/satellite`
  (e.g. `3SIMG_L1B_STD`, `3DIMG_L2B_CMK`). Copy verbatim — no typos, no spaces.
- Granule search feed, no auth: `https://mosdac.gov.in/apios/datasets.atom?datasetId=<ID>`
- **Daily quota: 5,000 files per user per day.**
- **⚠️ Three consecutive wrong passwords locks the account for one hour.** Copy-paste; never
  type from memory. `config.json` goes in `.gitignore` before it is created — it holds a
  plaintext password.

**Format — the previously-unknown blocker, now resolved**
- All INSAT-3D/3DR products are **HDF5**, CF-1.6 conventions. L2B products carry 2-D lat/lon
  datasets, so per-block extraction is straightforward nearest-neighbour sampling.
- **Filename convention is predictable and reversible:** `SSNNN_DDMMMYYYY_HHmm_LOP_XXX.h5`
  — `SS` satellite (`3D`/`3R`), `NNN` sensor (`IMG`/`SND`), `LOP` level (`L1B`/`L1C`/`L2B`/
  `L2G`/`L2P`/`L3B`/`L3G`), `XXX` parameter mnemonic or `STD`.
  Example: `3DIMG_26SEP2012_0730_L1B_STD.h5`.
- **Always apply the CF `scale_factor` / `add_offset` / `_FillValue` attributes.** Raw stored
  integers are not physical values.
- **Validate magic bytes** (`\x89HDF`) before parsing. A few-KB "success" is an HTML error page —
  the exact failure mode that killed the IMERG effort (see DEAD §NASA IMERG).

**What to pull** (confirm exact Product Names in the catalog; do not guess mnemonics):
1. Total Precipitable Water (Imager L2B) = IWV, the PS's "cornerstone".
2. Cloud Top Temperature / Pressure (Imager L2B/L2C) → CTT drop rate.
3. IMSRA rainfall (INSAT Multispectral Rainfall Algorithm) — satellite-observed QPE, a partial
   replacement for the abandoned IMERG labels.
4. Cloud Mask — `3DIMG_L2B_CMK` (confirmed to exist).
5. **Guaranteed fallback: `3DIMG_L1B_STD`** contains raw WV / TIR-1 / TIR-2 brightness
   temperatures. TIR-1 BT is a legitimate direct CTT proxy and its two-slot rate of change is a
   real drop rate. This path always exists — take it rather than hunting for a product ID.

**Sanity bands for extracted values:** TPW ≈ 10–70 mm over monsoon North India;
CTT / TIR-1 brightness temperature ≈ 190–300 K, deep convective tops below ~220 K.
Anything outside these bands means a missing scale factor.

**The honest limitation, to state plainly:** the open tier is a **batch download interface with a
daily quota, not a push stream**. The near-real-time standing-order tier is restricted to
privileged operational agency users and we will not get it. Meghdoot therefore ingests granules
on a schedule and **labels the age of every satellite frame on screen**. Do not claim 30-minute
real-time satellite polling.

**Also available on MOSDAC Open Data** (no INSAT account needed, worth a look if time allows):
GPS-derived Integrated Water Vapour (ground-truth IWV for validating the proxy), GSMap ISRO Rain,
Bayesian MT-SAPHIR rainfall, Inland Water Height, River Discharge, Soil Moisture.

- **STATUS: ✅ ACTIVE — access held, pattern verified, ingest scoped in
  `15_PHASE_B_DEPTH_BUILD_PLAN.md` §B1.**

### 7. SRTM DEM — flow accumulation (Phase B only)
- Options: OpenTopography REST API (SRTM GL1 30 m, free API key required; `bmi-topography`
  wraps it), the `elevation` pip package, or `srtm.py` with local tile caching.
- Needed only for pysheds flow accumulation and DEM-traced channel lengths (`15` §B5). Phase A's
  Elevation-API-derived routing does not depend on it.
- **STATUS: ⬜ not downloaded — no longer blocking anything.**

### 8. bharatlas LGD 2024 — block polygons
- Still desirable, still deferred. Points on a map are visually near-identical to a judge and
  carry none of the CRS/size/render risk (`02_SURE_SHOT_BACKEND_DESIGN.md`).
- **STATUS: ⬜ deferred, not blocking.**

---

## OPTIONAL / STRETCH

### CWC reservoir storage — the variable that explains August 2025
- `data.gov.in` "Daily data of reservoir level of Central Water Commission (CWC)" (Open
  Government Licence); India-WRIS reservoir module (daily level and storage); CWC's weekly
  Reservoir Level & Storage Bulletin, published Thursdays.
- **Why it matters:** the dam-attenuation factor in the hydrology model assumes reservoir
  headroom. In August 2025 Bhakra, Pong and Ranjit Sagar were at capacity and their releases
  *amplified* the flood. Without reservoir state, the model understates risk in exactly the
  scenario that matters most.
- **Realistic scope:** one static CSV covering Aug–Sep 2025 for the three dams, shown on the
  Evidence page. **Do not attempt live polling** — daily-to-weekly government products with no
  stable API guarantee; a live scrape failing on stage is worse than not having the feature.
- **STATUS: ⬜ optional (`15` §B6).**

---

## DEAD — do not retry, do not revisit

### IMD API — `api.imd.gov.in`
- **STATUS: 🔴 OFFICIALLY DENIED.** Formal rejection, not a whitelist issue.
- Was alert cross-check only; never load-bearing. Labelled "unavailable" on the Status page.
- **Session 7 note:** we still use IMD's *published colour-code thresholds* as a comparison row
  — Green <64.5 mm/24h, Yellow 64.5–115.5, Orange 115.6–204.4, Red >204.4. This row must always
  be labelled **"IMD colour scale applied to forecast rainfall"**, never "IMD's warning". We are
  applying a published public standard, not quoting a bulletin we cannot access.

### NASA IMERG — `disc.gsfc.nasa.gov`
- **STATUS: 🔴 ABANDONED.** Three sequential failure modes exhausted: Authorization header
  stripped on cross-domain redirect; unhandled `ConnectionError`/`RemoteDisconnected`; and 528
  identical 2,828-byte HTML login shells served with 200 status. Platform malfunctioning.
- Replaced by Open-Meteo precipitation for labels. **Session 7 partial recovery:** MOSDAC's
  IMSRA and GSMap ISRO Rain are satellite-*observed* QPE and can serve some of the role IMERG
  was meant to fill. Investigate only after `15` §B1 is complete.
- Do not retry IMERG. Do not revisit EarthData.

### IMDAA Reanalysis — `rds.ncmrwf.gov.in`
- **STATUS: 🔴 DROPPED.** No live API path — manual, multi-terabyte batch download only.
- Replaced by Open-Meteo CAPE/CIN. Same physical quantities, different source. NCMRWF judges
  will notice; own it as documented deviation #3.

### NASA Earthdata / AppEEARS
- **STATUS: 🔴 PLATFORM MALFUNCTIONING.** Dropped entirely.

### Raw ERA5 / Copernicus CDS (direct)
- **STATUS: 🔴 REJECTED (architectural).** ~5-day latency, unusable live. Note that ERA5
  *via* Open-Meteo's `archive-api` remains available as a labelled fallback for the hindcast if
  the Historical Forecast API is unavailable.

---

## DEMO EVENT — corrected scope

### Primary: August 2025 Punjab floods
**Window to pull: 15 August – 5 September 2025.** The earlier "20 August only" framing was too
narrow. The crisis began around 20 August and peaked in the **last week of August into early
September**.

Verified characteristics:
- Worst flooding in roughly **four decades** (since the 1988 event).
- **1,400–1,650 villages**, all 23 districts touched; **350,000+ people affected**; **37+ deaths**;
  roughly **1.5 lakh hectares** of farmland submerged.
- **Cause — this is the thesis, verbatim from the record:** most flooded areas lay along the Ravi
  and the lower Beas and Sutlej, which swelled due to catastrophic rainfall in the **upstream
  catchment areas of Himachal Pradesh**, which recorded **~46% above normal** monsoon rainfall,
  triggering 95 flash floods and 136 major landslides inside HP itself. Compounded by **55% above
  normal** rainfall in the lower Punjab catchments and by **large-scale releases from the Bhakra,
  Pong and Ranjit Sagar dams**, which were already near capacity.
- **Worst-hit districts: Gurdaspur, Amritsar, Ferozepur, Fazilka, Pathankot, Kapurthala,
  Tarn Taran, Hoshiarpur.**

**Consequence:** the previous 10-block Ghaggar-Yamuna registry largely *missed this event*. The
block registry is replaced in `14_PHASE_A_MVP_BUILD_PLAN.md` §A1 with a Sutlej/Beas/Ravi set plus
Ghaggar/Yamuna for breadth.

This event is the single best evidence for the upstream-coupling thesis that exists, because the
causal chain — rain in Himachal, disaster in Punjab, dams in between — is exactly what the
product models and exactly what a point weather app cannot see.

### Secondary: 8–15 July 2023 North India floods
Genuinely tri-state, useful for the "does it generalise" question. Yamuna peaked ~208.66 m in
Delhi. Within Historical Forecast API coverage.

---

## WHY THE DATA STORY IS NOW STRONGER THAN "OPEN-METEO ONLY"

As of Session 7 the system runs on **four independent data families**:

| Family | Source | What it contributes |
|---|---|---|
| Atmosphere | Open-Meteo (Forecast + Historical Forecast) | CAPE/CIN, humidity, cloud, precipitation, pressure, gusts — live and historical, identical schema |
| Hydrology | Copernicus GloFAS via Open-Meteo Flood API | River discharge, m³/s — an independent physical variable |
| Satellite | ISRO INSAT-3D/3DR via MOSDAC | TPW (IWV) and CTT — the PS's stated cornerstone observations |
| Terrain | Open-Meteo Elevation API now, SRTM + pysheds in Phase B | Routing lag and flow accumulation |

The schema-consistency argument survives intact, because the *model input* path is still
single-source (Open-Meteo, same schema live and historical). The other three families enter as
**independent corroboration and impact translation**, not as competing training inputs. That is
the best of both: zero train/inference drift, and a multi-source story that is true.

**The honest weaknesses, to state on the About page and never bury:**
- IWV from model output is not IWV from satellite observation. Where a real INSAT granule was
  read, `ctt_is_proxy` is false; everywhere else it is true, per timestamp.
- Open-Meteo CAPE/CIN is not IMDAA-radiosonde-assimilated CAPE/CIN.
- GloFAS discharge is modelled and daily, not gauged and hourly.
- MOSDAC ingest is batch-scheduled, not a 30-minute real-time stream.
- Reservoir storage state is not modelled unless `15` §B6 is completed.

Judges respect honesty far more than silence about substitutions.
