# Meghdoot — Location Search & On-Demand Analysis Pipeline
> New capability: a user types their address, city, or PIN code, and gets a full risk analysis
> for that exact point — live data, model prediction, flash-flood overlay, and an AI-generated
> plain-English overview — without needing to click through the block map first.

---

## 1. VERIFICATION — what we already have vs. what's new

| Requirement | Status |
|---|---|
| Live weather data API | ✅ Already confirmed working — Open-Meteo Forecast API, tested end-to-end |
| Historical data for training | ✅ Already confirmed — Open-Meteo Historical Forecast API, same schema |
| **Geocoding (address/PIN → lat/lon)** | ✅ **No new dependency needed.** Verified: Open-Meteo runs its own free Geocoding API at `https://geocoding-api.open-meteo.com/v1/search`. Its `name` parameter explicitly accepts **"Location name or postal code"** — confirmed directly from Open-Meteo's own API documentation. Same vendor, same no-key/free-tier posture as everything else in the stack. This closes the one open question in this plan before writing any code. |
| Feature derivation (CAPE/CIN/convergence/shear) | ✅ Already specified in `06_ml_model_spec.md` — reused as-is, just triggered on-demand instead of only by the poller |
| Model (GRU/MLP multi-task) | ⬜ Depends on Phase 2 training completing — this plan's endpoint calls whichever is ready (trained model, or the heuristic fallback) via the same `is_baseline_heuristic` pattern already designed |
| DEM flow-accumulation overlay | ⬜ Depends on the static raster being precomputed (Phase 2) — this plan reads from that same precomputed layer, doesn't reintroduce a new DEM pipeline |
| Groq for narrative text | ✅ Already in the stack for per-alert XAI — this plan adds a second, broader use of the same API key/client |

**Conclusion: nothing here requires a new external service, a new API key, or a new access
approval. It's new orchestration on top of infrastructure we've already verified.**

---

## 2. THE NEW USER FLOW

```
User types "141001" or "Sector 17, Chandigarh" or "Rupnagar, Punjab"
        │
        ▼
Frontend calls our backend geocode proxy → shows matching places in a searchable dropdown
        │
User picks one match (lat, lon, resolved display name)
        │
        ▼
Frontend calls our backend analysis endpoint with that lat/lon
        │
        ▼
Backend runs the FULL pipeline fresh, for that exact point, right now:
  1. Pull live conditions (+ recent hours of history in the same call) from Open-Meteo
  2. Derive the same 7 features used everywhere else in the system
  3. Run the model (trained GRU/MLP, or heuristic if that's what's live)
  4. Sample the precomputed DEM flow-accumulation raster at that point → flash-flood risk
  5. Compute top-3 feature attribution (same SHAP-lite method as alerts)
  6. Call Groq once for BOTH a short trigger narrative AND a longer plain-English overview
  7. Flag whether this point falls inside the validated North-India training core or not
        │
        ▼
Frontend renders a full result card: risk gauges, flash-flood badge, AI overview, honesty flag
```

This is a *second, complementary* way into the same system — the block-polygon Dashboard map
stays exactly as designed. This is the "type your own city and see it work right now" path,
which is also a very strong judge-facing demo moment: a judge can search their own hometown.

---

## 3. NEW BACKEND ENDPOINTS

Add these to the existing FastAPI route set (`07_api_spec.md`'s conventions apply — every one
of these gets a `data_mode` field and a cached fallback, no exceptions).

### `GET /api/v1/geocode?q={query}`
Thin proxy over Open-Meteo's Geocoding API. Why proxy instead of calling it client-side:
consistent caching, India-biasing, and keeping the "every external call goes through the backend"
discipline that the rest of this project already follows.

- Calls `https://geocoding-api.open-meteo.com/v1/search?name={query}&count=8&language=en`
- Filters/sorts results with `country_code == "IN"` first, other countries after (don't hard-block
  non-India results — a team member testing from abroad shouldn't hit a dead end)
- Caches identical queries for a short TTL (a few minutes) — place names don't change
- Response:
```json
{
  "data_mode": "live",
  "results": [
    {"name": "Ludhiana", "admin1": "Punjab", "country": "India",
     "latitude": 30.901, "longitude": 75.8573, "postal_code": "141001"}
  ]
}
```

### `GET /api/v1/analyze?lat={lat}&lon={lon}&name={optional display name}`
The on-demand full-pipeline endpoint. This is the new piece of work.

- Pull live Open-Meteo data for the exact point, using `past_hours=12` in the same request so the
  6-timestep feature sequence and the CTT/rainfall trend features don't need a second call
- Derive features exactly per `06_ml_model_spec.md` (no new feature logic — literally the same
  function the poller uses, just invoked synchronously for one point instead of for every block)
- Run inference: trained model if `model_version` is set and healthy, else the heuristic —
  identical branch logic to the existing prediction pipeline, `is_baseline_heuristic` flag included
- Sample the precomputed flow-accumulation raster at `(lat, lon)` — nearest-cell or bilinear —
  combine with the rain-intensity head exactly as the DEM overlay spec already describes
- Compute top-3 feature attribution
- One Groq call, structured JSON response requesting both fields at once (see §5)
- Determine `within_validated_core`: true if `(lat, lon)` falls inside the North India
  training belt bounding region from `04_region_scope.md`, false otherwise
- Cache the full result keyed by a rounded coordinate (~5km grid) + a 15-minute time bucket —
  same cadence as the live poller, so repeat queries near the same spot don't reprocess or
  re-call Groq unnecessarily
- Response:
```json
{
  "data_mode": "live",
  "location": {"name": "Ludhiana, Punjab", "lat": 30.901, "lon": 75.8573},
  "generated_at": "2026-09-15T18:42:00+05:30",
  "within_validated_core": true,
  "risk": {
    "p_thunderstorm": 0.31, "p_cloudburst": 0.58,
    "flash_flood_risk": 0.44, "severity": "Orange",
    "is_baseline_heuristic": false
  },
  "features_snapshot": {"cape": 1980, "cin": -22, "iwv_proxy": 41.2,
    "ctt_drop_rate": -3.1, "convergence_850": 0.0021, "wind_shear": 14.2,
    "rainfall_recent": 6.4},
  "xai": {
    "top_features": [{"feature": "cape", "contribution": 0.38},
                      {"feature": "convergence_850", "contribution": 0.24},
                      {"feature": "rainfall_recent", "contribution": 0.19}],
    "trigger_narrative": "Elevated risk driven by rapid CAPE buildup and low-level convergence.",
    "ai_overview": "Conditions over Ludhiana have intensified over the past two hours, with
      rising instability and increasing low-level wind convergence. Rainfall in the area has
      picked up in the last hour and current signals point to a growing chance of a cloudburst
      developing in the next few hours. Flash-flood risk is moderate given the surrounding
      terrain's drainage profile."
  }
}
```
If `within_validated_core` is false, the frontend surfaces this plainly — never hide it.

---

## 4. FEATURE / MODEL REUSE — no new ML logic

This is the important discipline point: **the analyze endpoint must call the exact same feature
builder and inference function the poller calls**, parameterized by a single point instead of a
loop over stored blocks. Do not fork the logic into a second implementation — that's exactly the
kind of train/inference (or in this case, batch/on-demand) drift this project has explicitly
designed against everywhere else. One function, two call sites: the cron poller (loops over all
monitored blocks) and this endpoint (one ad-hoc point).

---

## 5. THE GROQ "AI OVERVIEW" — new, distinct from the existing per-alert XAI narrative

The system already has one Groq use case: a short 1–2 sentence trigger narrative per alert,
cached once, never regenerated (`06_ml_model_spec.md`). This plan adds a second, complementary
use of Groq, specific to the on-demand search flow:

- **Trigger narrative** (existing pattern, reused): short, factual, "what triggered this."
- **AI overview** (new): a slightly longer paragraph synthesizing the *trend*, not just the
  current snapshot — pulls in the recent-hours trend data already fetched via `past_hours`,
  and speaks in plain language a non-technical person could act on.

Both are requested in **one Groq call** with a structured-JSON system prompt (`{"trigger_narrative":
"...", "ai_overview": "..."}`) — not two separate calls. This keeps free-tier Groq usage minimal
and keeps the two pieces of text consistent with each other (generated from the same context in
the same pass, not two independent completions that could disagree).

**Labeling discipline**: the frontend always shows a small "AI-generated" or "Powered by Groq"
label directly on this text block. Never present model-generated prose as if it were a neutral
system readout — this matches the project's existing "never silently substitute" honesty rule,
just applied to generated text instead of data sources.

**Not cached forever** (unlike the per-alert narrative): this text is regenerated whenever the
underlying data bucket changes (the 15-minute cache window above), because unlike a fixed alert,
an ad-hoc location query reflects "right now," and stale AI commentary reading like it's current
would be a real honesty problem.

---

## 6. VALIDATION-SCOPE HONESTY — reused pattern, new trigger point

`04_region_scope.md` already draws a hard line: all-India map, North-India-only training/validation.
This endpoint is the first place that line becomes a *per-query* fact instead of a static caveat
on the About page. When `within_validated_core` is false, the frontend must show a visible,
un-missable note — something like: *"This location is outside the region Meghdoot's model has
been validated against. Shown for reference; treat with caution."* This is not a hedge to bury in
small print — it's core to the product's credibility, and it's also a genuinely interesting thing
to show a judge: the system knows the edges of its own confidence.

---

## 7. CACHING & RATE-LIMIT DISCIPLINE

| Call | Cache key | TTL | Why |
|---|---|---|---|
| Geocoding | exact query string | ~10 min | Place names are static; avoids hammering the geocoder on every keystroke |
| Open-Meteo live pull (on-demand) | rounded lat/lon (~5km grid) | 15 min | Matches the poller's own cadence — no reason to fetch fresher data than the rest of the system does |
| Groq call | same rounded coordinate + 15-min bucket | 15 min | Keeps free-tier Groq usage bounded even if many people search near the same city |

Debounce the frontend search input (e.g. 300ms) before calling the geocode endpoint at all —
standard practice, keeps the geocoder call count sane during typing.

---

## 8. FRONTEND — shadcn/ui COMPONENT MAP

Use the shadcn CLI to pull these directly (`npx shadcn@latest add <name>`) rather than
hand-rolling any of them:

| Component | Where it's used |
|---|---|
| `Combobox` | The location search box itself — type-ahead over the geocode results |
| `Command` | Powers the Combobox's internal filtered list |
| `Card` | The result panel container |
| `Tabs` | Switching between "Thunderstorm / Cloudburst / Flash Flood" views on the result card |
| `Badge` | Severity color badge (Green/Yellow/Orange/Red), "AI-generated" label, "Outside validated core" flag |
| `Skeleton` | Loading state while the analyze pipeline runs (geocode is instant; the full analysis can take a couple seconds) |
| `Alert` | The validation-scope honesty callout when a point is outside the training core |
| `Progress` or `Chart` | Radial/gauge rendering of the three risk probabilities |
| `Separator` | Dividing the features snapshot from the AI overview section |
| `Tooltip` | Hover explanations on each raw feature value (CAPE, CIN, etc. — tie into the glossary) |
| `Spinner` | Inline loading indicator inside the search box while geocoding |

Every one of these gets Meghdoot's own dark radar-console tokens (`#0B1220` / `#121B2E` /
`#5FA8D3` etc. from `08_frontend_and_design.md`) via the shadcn theming layer — shadcn is a
styling *system*, not a fixed look, so this doesn't fight the existing design language.

**Where this lives in the UI**: a prominent search bar at the top of the Dashboard page, above
the map — not a separate page. Selecting a result can optionally also pan/zoom the map to that
point if it falls within a monitored block, but the result card itself renders regardless of
whether the point has a precomputed block or not — that's the whole point of this endpoint.

---

## 9. WHAT THIS PLAN DELIBERATELY DOES NOT DO

- Does not require pre-computing or storing every possible point in India — that would be
  wasteful and pointless. The analyze endpoint is stateless and on-demand.
- Does not introduce a second feature-derivation implementation — see §4.
- Does not cache AI overview text indefinitely — see §5.
- Does not hide the validated-core boundary — see §6.
- Does not require any new API key, service, or access approval — see §1.
