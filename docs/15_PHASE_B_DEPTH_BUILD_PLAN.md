# 15 — Phase B: Depth Build Plan (after Phase A, ~8h then onward to the end)

> **NEW FILE, Session 7.** Sequential. Start only after every box in
> `14_PHASE_A_MVP_BUILD_PLAN.md` §Definition of done is ticked.
> Same rule as Phase A: **every step ends with a VERIFY gate, and the build must be green
> before you move on.** Commit after each green step.

Priority order is deliberate. B1 directly refutes the reviewer's literal sentence, so it goes
first even though it is the hardest. B7 (model training) is last of the substantive items
because it is the highest-risk and the project already has a documented, accepted fallback.

| Step | What | Minutes | Blocking? |
|---|---|---|---|
| B0 | Reconcile docs, commit, snapshot | 15 | yes |
| B1 | MOSDAC / INSAT-3D ingest | 90 | no |
| B2 | GloFAS river discharge | 40 | no |
| B3 | Groq narratives back in | 30 | no |
| B4 | Alert API + webhook + curl demo | 30 | no |
| B5 | Real DEM flow accumulation (pysheds) | 90 | no |
| B6 | CWC reservoir state *(optional)* | 60 | no |
| B7 | Train the GRU/MLP *(conditional)* | 120 | no |
| B8 | Neon persistence *(conditional)* | 60 | no |
| B9 | About / Methods page | 40 | **yes** |
| B10 | Deployment | 60 | final day only |
| B11 | Final rehearsal | 30 | **yes** |

**B9 and B11 are mandatory regardless of how much else gets done.** Budget backwards from the
deadline to protect them.

---

## B0 — Reconcile and snapshot (15 min)

1. `git tag phase-a-complete` — you now have a known-good state to fall back to.
2. Update `10_status_and_plan.md` and `project_track.md` with a `[Session 7]` entry.
3. Record in `project_track.md` which colour token set is actually live in `tailwind.config.js`
   (see the token conflict note in `14` §A7).
4. Copy `backend/replay_data.json` and `frontend/src/data/leadtime.json` to a `demo_backup/`
   folder **outside** the repo working tree. If a later step corrupts them, the demo survives.

---

## B1 — MOSDAC / INSAT-3D ingest (90 min) — highest priority

### Why this is first
It refutes the reviewer's exact sentence. "You're using the API everyone uses" stops being true
the moment an ISRO satellite product renders on your map. Even a single static frame does this.

### B1.1 — Verified access facts (confirmed against MOSDAC's own documentation)

| Fact | Value |
|---|---|
| Tool | `mdapi` — download `https://www.mosdac.gov.in/software/mdapi.zip`, unzip to get `mdapi.py` + `config.json` |
| Requirements | Python 3+, `requests` (`tqdm` optional, gives a progress bar) |
| Run | edit `config.json`, then `python mdapi.py` |
| **Search needs no login** | leave `user_credentials` blank to search/preview. Only *download* needs an approved account. |
| `datasetId` | mandatory. Find the exact Product Name at `https://mosdac.gov.in/catalog-app/satellite` — copy it verbatim, no typos, no spaces |
| `startTime` / `endTime` | `"YYYY-MM-DD"` |
| `count` | **max 100** per search |
| `boundingBox` | `"minLon,minLat,maxLon,maxLat"` |
| `gId` | granule ID, to pull exactly one file |
| Download settings | `download_path`, `organize_by_date`, `skip_user_prompt`, `generate_error_log`, `error_log_path` |
| Daily quota | **5,000 files per user per day** |
| **Lockout** | **three consecutive wrong passwords locks the account for 1 hour** |
| Format | HDF5, CF-1.6 conventions; L2B products carry 2-D lat/lon datasets |
| Filename convention | `SSNNN_DDMMMYYYY_HHmm_LOP_XXX.h5` — e.g. `3DIMG_26SEP2012_0730_L1B_STD.h5`. `SS`=satellite (`3D`/`3R`), `NNN`=sensor (`IMG`/`SND`), `LOP`=level, `XXX`=parameter mnemonic. **Predictable and reversible** — this closes the "URL pattern unconfirmed" blocker recorded in `03_data_sources.md`. |
| Granule search feed | `https://mosdac.gov.in/apios/datasets.atom?datasetId=<ID>` — an Atom feed, no auth |
| Support | `admin@mosdac.gov.in`, attach the error log |

> **⚠️ DO THIS FIRST, BEFORE ANY CODE:** type the password into a scratch file and copy-paste it
> into `config.json`. **Do not type it from memory three times.** A one-hour lockout inside a
> 12-hour window would be catastrophic and is entirely self-inflicted.

> **Add `config.json` to `.gitignore` immediately.** It contains a plaintext password. Commit the
> `.gitignore` change *before* you create `config.json`.

### B1.2 — Pick the dataset (15 min)

Go to `https://mosdac.gov.in/catalog-app/satellite`, filter by satellite INSAT-3D / INSAT-3DR,
and find the exact Product Names. **Do not guess the mnemonic from this document — read it off
the catalog.** Products to look for, in priority order:

1. **Total Precipitable Water / TPW** (Imager L2B) — this is IWV, the PS's stated "cornerstone".
2. **Cloud Top Temperature / Cloud Top Pressure** (Imager L2B/L2C) — for CTT drop rate.
3. **IMSRA rainfall** (INSAT Multispectral Rainfall Algorithm) — satellite-observed QPE. This is
   a partial substitute for the abandoned IMERG labels (`11_fallback_playbook.md` #4) and is a
   genuinely valuable find if available.
4. **Cloud Mask** — `3DIMG_L2B_CMK` (confirmed to exist).
5. **`3DIMG_L1B_STD`** — the raw Imager Level-1B standard product.

> **Guaranteed fallback:** `3DIMG_L1B_STD` contains the raw brightness temperatures for the
> WV, TIR-1 and TIR-2 channels. If no derived L2 product is retrievable in time, **TIR-1
> brightness temperature is a legitimate direct proxy for cloud-top temperature** and its rate of
> change over two half-hourly slots is a real CTT drop rate. This path always exists. Take it
> rather than spending an hour hunting for a product ID.

Verify availability *before* downloading:
```bash
curl -s "https://mosdac.gov.in/apios/datasets.atom?datasetId=3DIMG_L2B_CMK" | head -60
```
**VERIFY:** an Atom feed with entries. Repeat for each candidate ID. An empty feed or an error
means the ID is wrong — go back to the catalog.

### B1.3 — Pull two granules, not two hundred (20 min)

Set `"count": "2"` for the first run. Two files. Not a bulk pull.

**Granule 1 — the hindcast frame.** Over the peak of the flood:
```json
"search_parameters": {
  "datasetId": "<your verified ID>",
  "startTime": "2025-08-26",
  "endTime":   "2025-08-27",
  "count": "2",
  "boundingBox": "73.0,29.0,79.0,33.0",
  "gId": ""
}
```
(bbox covers Punjab + Haryana + the Himachal headwaters.)

**Granule 2 — a recent frame**, to prove the live path exists. Use yesterday's date.

**VERIFY B1.3:**
```bash
python mdapi.py                      # answer Y at the prompt
ls -lh <download_path>               # files present, non-trivial size (MB, not KB)
python -c "
import h5py,sys
f=h5py.File(sys.argv[1],'r')
f.visit(print)                       # dump the dataset tree
print(dict(f.attrs))
" <your_file>.h5
```
A few-KB file is an HTML error page, not data — exactly the failure mode that killed the IMERG
attempt (`project_track.md` Session 1). **Check the magic bytes**: `head -c 8 file.h5 | xxd`
should start `89 48 44 46` (`\x89HDF`). If it does not, stop and read the error log.

### B1.4 — Extract per-block values (25 min)

Write `backend/insat.py`:
- open the HDF5 with `h5py`
- read the 2-D lat/lon datasets and the parameter dataset
- **apply the CF scale_factor / add_offset / _FillValue attributes** — raw integers are not
  physical values. Read the attrs, do not assume.
- nearest-neighbour sample at each of the 12 block centroids (and optionally the 20 upstream
  points)
- return `{block_id: value}` plus the granule's acquisition timestamp parsed from the filename

**VERIFY B1.4:** printed values must be physically sane.
- TPW: roughly **10–70 mm** over monsoon North India. A value of 3000 means you skipped the
  scale factor.
- Cloud-top / TIR-1 brightness temperature: roughly **190–300 K**. Deep convective tops go below
  220 K. If you get Celsius-looking numbers, check the attrs.
- Reject and debug anything outside those bands. Do not ship a number you cannot sanity-check.

### B1.5 — Wire it in (20 min)

Three deliverables, in increasing ambition. **Ship #1 even if #2 and #3 don't happen.**

1. **Image overlay.** Render the granule as a PNG, place it on the Leaflet map as an
   `ImageOverlay` with the correct bounds, stamped
   `INSAT-3D · <channel> · ISRO / MOSDAC · <timestamp IST>`.
   An actual ISRO satellite image on your map ends the "public API" criticism permanently, and it
   costs almost nothing.
2. **Per-block values in the detail panel** as `insat_tpw_mm` / `insat_ctt_k`, each with the
   granule timestamp beside it.
3. **Flip `ctt_is_proxy` to `false` for exactly the timestamps where a real granule was read** —
   never blanket-flip it (`13` §6).

**Live polling is explicitly out of scope.** `mdapi` is a batch downloader, not a streaming API,
and the near-real-time standing-order tier is restricted to operational agencies
(`03_data_sources.md` §MOSDAC). Say this plainly:

> "MOSDAC's open tier is a batch download interface with a daily quota, not a push stream. We
> ingest granules on a schedule rather than on a 30-minute poll, and we label the age of every
> satellite frame on screen. The near-real-time standing-order tier is restricted to operational
> agencies — we're not pretending to have it."

**VERIFY B1:** overlay visible on the map, timestamp label correct, per-block values in range,
`ctt_is_proxy` false only where a granule exists, `npm run build` green.

---

## B2 — GloFAS river discharge (40 min)

A second, physically independent variable. No phone weather app shows river discharge in m³/s.
This is cheap and high-impact.

```
GET https://flood-api.open-meteo.com/v1/flood
    ?latitude=<12 river points>&longitude=<12 river points>
    &daily=river_discharge,river_discharge_mean,river_discharge_max
    &past_days=30&forecast_days=14
```

Implementation notes:
- **Coordinates must sit on the river channel.** GloFAS is a river-routing model on ~5 km cells;
  a point in a field returns near-zero or null. Use the `river_point` coordinates you validated
  in `14` §A0.4 — these are separate from the block centroid.
- Daily resolution. This **corroborates**; it does not nowcast. Never let it drive the 2–6 h head.
- Cache aggressively — a 6-hour TTL is plenty for a daily product.
- Add to the detail panel as a small sparkline: 30 days back, 14 days forward, with a
  "danger-ish" reference line drawn at the 90th percentile of the past-year record for that point
  (compute once from a historical pull; **label it as a statistical reference, not an official
  danger level** — official danger levels are CWC's and you do not have them).

Label verbatim: `Copernicus GloFAS · modelled river discharge · ~5 km grid · daily`.

**VERIFY B2:** pull Aug–Sep 2025 for the Ravi and Sutlej points and confirm a clear discharge
spike in late August. If there is no spike, the coordinate is off-channel. **This is also a
strong standalone demo artefact** — a discharge curve that visibly blows up during the real event
is very hard to dismiss as "just a weather app".

---

## B3 — Groq narratives (30 min)

Reuse `narrative.py` from Sessions 5–6. Two changes only:

1. **Model IDs have churned.** `llama-3.1-8b-instant` and `llama-3.3-70b-versatile` were
   scheduled for decommissioning in August 2026. Do not hardcode from memory — enumerate first:
   ```bash
   curl -s https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY" \
     | python -m json.tool | grep '"id"'
   ```
   Pick a currently-served production model (the `openai/gpt-oss-20b` class is the safe default)
   and put the ID in `.env`, not in code.
2. **Rewrite the prompt for the new thesis.** The old prompt explains a weather score. The new
   one must explain *arrival*:
   > "In two sentences, for a non-technical district disaster officer: {block} has had
   > {local_rain} mm of local rain in 3 hours, but {upstream_rain} mm has fallen across its
   > upstream {river} catchment. Estimated runoff arrival {t1}–{t2}. Approximately {pop} people
   > are in the exposed low-lying band. Explain what is happening and what it means. Do not
   > invent numbers."

Keep: 3-second timeout, template fallback, one call per block per refresh cycle, "AI-generated"
label on the text block in the UI (`LOCATION_SEARCH_PIPELINE_PLAN.md` §5).

**VERIFY B3:** kill your network mid-request and confirm the template fallback renders cleanly
with no error state visible to the user. Then confirm the live narrative never contains a number
that is not in the input payload — **hallucinated figures on a disaster dashboard would be the
single worst thing that could happen in front of this reviewer.** Add an assertion that strips
the response if it contains a digit sequence not present in the prompt context.

---

## B4 — Alert API + webhook (30 min)

*"We are not an app. We are infrastructure an app could be built on."*

- `GET /api/v1/alerts` — flat JSON array, filterable by `?state=` and `?severity=`. Already
  scaffolded in `14` §A5; polish the schema.
- `GET /api/v1/alerts/{id}` — single alert.
- `POST /api/v1/subscriptions` — register a webhook URL. On a new threshold crossing, POST the
  alert JSON to it. Keep subscriptions in memory; persistence is B8.
- A one-page `/docs` note (FastAPI's auto Swagger at `/docs` is free — just make sure the route
  descriptions read well, because you are going to show it).

**The demo moment:** open a terminal in front of the reviewer and run
```bash
curl -s http://localhost:8000/api/v1/alerts | python -m json.tool
```
Then open `/docs` in a browser tab. "This is what a state control room integrates against.
There is no equivalent interface on a consumer weather app."

**VERIFY B4:** `curl` returns valid JSON. Register `https://webhook.site/<your-id>` as a
subscription, force a threshold crossing (temporarily lower the Orange threshold), and confirm
the POST lands. Reset the threshold afterwards.

---

## B5 — Real DEM flow accumulation (90 min)

Removes the last hand-waved element. Do this **after** B1–B4, because Phase A's elevation-derived
routing is already defensible; this makes it better, not possible.

1. **Get a DEM for the bbox `73.0,29.0,79.0,33.0`.** Options in order of friction:
   - OpenTopography REST API (SRTM GL1 30 m) — free, but needs a free API key; the
     `bmi-topography` Python package wraps it.
   - The `elevation` pip package (SRTM tiles, no key).
   - `srtm.py`, which caches tiles locally.
   Whichever you use, **check file size and magic bytes** before trusting the download.
2. **`pysheds`**: fill depressions → resolve flats → flow direction (D8) → flow accumulation.
3. Sample accumulation at each block centroid; normalise across the 12 blocks to a
   `flow_accum_weight` in roughly `[0.7, 1.6]`.
4. **Replace `terrain_multiplier`** with this weight. Keep the old hand-assigned values in the
   code as a commented fallback constant.
5. **Replace the `SINUOSITY = 1.35` constant** with a real channel length traced along the flow
   path from each upstream point to its block. This turns the routing estimate from "lumped" into
   "DEM-routed" and lets you delete the caveat from Row B of the detail panel.

**VERIFY B5:**
- Foothill/elevated blocks (Pathankot) must score **lower** than floodplain blocks (Ferozepur,
  Fazilka, Gurdaspur). If the ordering is inverted, your flow direction or CRS is wrong.
- DEM-traced channel length must exceed straight-line distance for every pair, by roughly
  1.2–1.8×. A ratio below 1.0 is a bug.
- Re-run the A6 hindcast after swapping the weights and **check the lead-time gains did not
  collapse**. If they did, keep the Phase A weights and note why. Never let an "improvement"
  silently make the demo worse.

**Fallback (already documented, `11_fallback_playbook.md` #13):** if pysheds is slow or noisy,
ship a slope-weighted rainfall-intensity estimate without full flow routing. Still PS-consistent.

---

## B6 — CWC reservoir state *(optional, 60 min)*

Only if B1–B5 are done and stable. This closes the honesty gap flagged in `14` §A4 — that
`DAM_ATTEN` is invalid when a reservoir is full, which is precisely what happened in August 2025.

Sources, in order of accessibility:
- `data.gov.in` — "Daily data of reservoir level of Central Water Commission (CWC)", Open
  Government Licence.
- India-WRIS (`indiawris.gov.in`) — reservoir module with daily level and storage.
- CWC's weekly Reservoir Level & Storage Bulletin (published Thursdays) — PDF/HTML.

**Realistic scope:** download a static CSV once, for Bhakra / Pong / Ranjit Sagar, covering
August–September 2025. Show the storage-percentage curve next to the discharge curve on the
Evidence page. **Do not attempt live polling** — these are daily-to-weekly products on
government portals with no stable API guarantee, and a scrape failing live is a worse outcome
than not having the feature.

Say it as: *"Reservoir headroom is the variable that turned heavy rain into a disaster in August
2025. We show it as a static overlay for the hindcast; live integration depends on a CWC data
path we don't control."*

**VERIFY B6:** the storage curve must show the reservoirs near capacity through late August 2025.
If it does not, you have the wrong reservoir or the wrong units.

---

## B7 — Train the GRU/MLP *(conditional, 120 min)*

**Do not start this unless B1–B5 are done and you have ≥ 3 clear hours left.** The project already
has a documented, accepted fallback (`11_fallback_playbook.md` #10, `06_ml_model_spec.md`
§Baseline). Shipping an honest baseline beats shipping a weak network.

If you do proceed, follow `06_ml_model_spec.md` unchanged, with these Session-7 amendments:

- **Feature vector gains the new hydrology features**: `inflow_index`, `upstream_rain_3h`,
  `upstream_rain_6h`, `lag_hours`, `flow_accum_weight`. These are the whole point — a model
  trained only on local atmospheric fields reproduces exactly the commodity forecast the reviewer
  dismissed.
- **Training data**: Historical Forecast API, all 32 coordinates, **both** event windows —
  15 Aug–5 Sep 2025 and 1–20 Jul 2023 — plus at least 60 days of non-event monsoon data for
  negatives.
- **Split by time, not randomly** (leakage across a sequence is the classic mistake here).
  Train on 2023, validate on 2025, or hold out the last 20% by time.
- **Class imbalance**: class weighting or focal loss, not upsampling.
- **The gate**: the model ships **only if** its precision/recall on the held-out 2025 window
  beats the heuristic. Otherwise `is_baseline_heuristic` stays `true` and you say so. Write the
  comparison numbers into `project_track.md` either way — the comparison itself is a good thing
  to show.
- **XAI**: gradient×input is fine; SHAP only if it is fast enough for the live path.

**VERIFY B7:** print precision/recall per head for both the model and the heuristic on the same
held-out window, side by side. Ship whichever wins. Show the table to the reviewer regardless —
"we tested our own model against our own baseline and here's the honest result" plays extremely
well.

---

## B8 — Neon persistence *(conditional, 60 min)*

Only if everything above is done. Apply the DDL from `05_database_schema.md`, with additions:

```sql
ALTER TABLE features ADD COLUMN inflow_index      DOUBLE PRECISION;
ALTER TABLE features ADD COLUMN upstream_rain_3h  DOUBLE PRECISION;
ALTER TABLE features ADD COLUMN upstream_rain_6h  DOUBLE PRECISION;
ALTER TABLE predictions ADD COLUMN dry_sky        BOOLEAN DEFAULT false;
ALTER TABLE predictions ADD COLUMN arrival_from   TIMESTAMPTZ;
ALTER TABLE predictions ADD COLUMN arrival_to     TIMESTAMPTZ;
ALTER TABLE predictions ADD COLUMN lag_hours      DOUBLE PRECISION;

CREATE TABLE upstream_points (
    key          TEXT PRIMARY KEY,
    lat          DOUBLE PRECISION NOT NULL,
    lon          DOUBLE PRECISION NOT NULL,
    elevation_m  DOUBLE PRECISION,
    river        TEXT
);

CREATE TABLE block_upstream_link (
    block_id     INTEGER REFERENCES blocks(id),
    upstream_key TEXT REFERENCES upstream_points(key),
    distance_km  DOUBLE PRECISION,
    lag_hours    DOUBLE PRECISION,
    routing_method TEXT NOT NULL,   -- 'kinematic_estimate' | 'dem_routed'
    PRIMARY KEY (block_id, upstream_key)
);

CREATE TABLE exposure_sites (
    id           SERIAL PRIMARY KEY,
    block_id     INTEGER REFERENCES blocks(id),
    name         TEXT NOT NULL,
    site_type    TEXT NOT NULL,
    population   INTEGER,
    is_demo_data BOOLEAN DEFAULT true    -- honesty flag, mirrors ctt_is_proxy
);
```

`routing_method` and `is_demo_data` are new honesty flags in the same family as `ctt_is_proxy` and
`is_baseline_heuristic`. They belong in `MASTER_AGENT_BRIEF.md` §WHAT NEVER CHANGES.

**VERIFY B8:** the in-memory path must still work with `DATABASE_URL` unset. Persistence is
additive; it must never become a hard dependency before the demo.

---

## B9 — About / Methods page (40 min) — **MANDATORY**

Route `/about`. One page a judge can read alone and come away convinced you were straight with
them. Sections, in order:

1. **What this is and is not.** "Not a weather forecast. An impact nowcast." The umbrella-vs-
   evacuation framing from `13` §2.
2. **PS traceability matrix** — lift from `01_problem_and_scope.md`, updated for Session 7
   (upstream coupling and INSAT ingest both move toward ✅).
3. **The three documented PS deviations** — architecture, IWV/CTT source, IMDAA replacement. State
   them plainly (`MASTER_AGENT_BRIEF.md`).
4. **Data provenance table** — every source, its role, its licence, its honest limitation:
   Open-Meteo (atmosphere, CC BY 4.0), Copernicus GloFAS (discharge, modelled, daily, ~5 km),
   ISRO INSAT-3D via MOSDAC (satellite, batch not streaming), SRTM (terrain), IMD colour scale
   (published thresholds applied by us, not IMD's bulletin).
5. **Method note on routing** — the kinematic-wave derivation, spelled out, with the constants.
   A reader should be able to reproduce your lag numbers by hand.
6. **Known limitations, in our own words** — reservoir state not modelled; exposure register is
   demo data; model validated on the North India belt only; GloFAS is daily; INSAT is batch-
   ingested, not streamed; the baseline in the scorecard is a rainfall threshold, not IMD's
   operational bulletin.
7. **Reproducibility** — every API used is free and keyless except MOSDAC and Groq. Anyone can
   rerun the hindcast.

Section 6 is the most valuable thing on the page. A reviewer who has decided you are overclaiming
changes his mind when he finds you already wrote down everything he was about to say.

---

## B10 — Deployment (final day only, 60 min)

Follow `09_dev_and_deployment.md` unchanged. Additions for Session 7:

- Ship `replay_data.json`, `leadtime.json` and any INSAT PNG overlays **in the repo**, not on a CDN.
- Render free tier sleeps after 15 minutes — UptimeRobot 5-minute ping running from ≥ 2 hours
  before the slot (`11_fallback_playbook.md` #7).
- `terrain_cache.json` must be committed so a cold start does not depend on the Elevation API.
- **Keep `npm run dev` + `uvicorn` runnable on the laptop at all times.** Localhost is a
  documented acceptable fallback (`09` §Rollback).

---

## B11 — Final rehearsal (30 min) — **MANDATORY**

1. `npm run build` → 0 errors. Backend imports clean. Commit and tag.
2. **Wifi off.** Dashboard loads with an honest `cached_fallback` or `starting_up` state.
   Replay plays end to end. `/evidence` renders. `/about` renders.
3. Wifi on. Loop ticks. `data_mode` → `live`. Timestamp advances. INSAT overlay renders.
4. `curl /api/v1/alerts` in a terminal — works.
5. Read the 60-second script (`13` §4) **out loud, twice.**
6. Rehearse all six follow-up answers (`13` §5) **out loud, once each.**
7. Print or open on a second screen: `13` §4 and §5.

---

## Definition of done — whole project

- [ ] Upstream coupling live, arrival clock ticking, dry-sky flag firing
- [ ] Lead-time scorecard on the real August 2025 event, including at least one honest loss
- [ ] Exposure translation rendering with its honesty label
- [ ] ISRO INSAT-3D product visibly on the map with an ISRO/MOSDAC attribution stamp
- [ ] GloFAS discharge curve showing the real late-August spike
- [ ] Alert API demonstrable via `curl`, webhook delivering
- [ ] DEM flow accumulation replacing hand-assigned multipliers (or the documented fallback taken)
- [ ] Groq narratives with template fallback and no hallucinated numbers
- [ ] `/about` page complete, including the limitations section
- [ ] Replay works with the network physically off
- [ ] Every honesty flag present on every response: `data_mode`, `is_baseline_heuristic`,
      `ctt_is_proxy`, `reservoir_state_modelled`, `routing_method`, `within_validated_core`
- [ ] `10_status_and_plan.md` and `project_track.md` current
