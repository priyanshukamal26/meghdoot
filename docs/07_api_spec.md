# Backend API Specification (FastAPI)

## Design principles

- Every route that depends on an external live source must degrade to cached data, never a 500.
- Every response includes a `data_mode` field (`"live"` | `"cached_fallback"` | `"replay"`) so the
  frontend can visibly label what the user is looking at — never silently substitute.
- Keep the schema frozen once the frontend team starts building against it (see
  `14_fallback_and_risk_playbook.md`, "API contract drift").

## Routes

### `GET /api/v1/blocks`
Returns all block polygons + metadata for the region. Static-ish, cache aggressively.
```json
{
  "blocks": [
    {"id": 1, "name": "Rupnagar", "district": "Rupnagar", "state": "Punjab",
     "centroid": [76.53, 30.97], "geometry": { "...geojson..." } }
  ]
}
```

### `GET /api/v1/risk/current`
Latest prediction per block, per hazard. This is what the Dashboard map polls every ~30s.
```json
{
  "data_mode": "live",
  "generated_at": "2026-09-08T14:30:00+05:30",
  "risk": [
    {"block_id": 1, "p_thunderstorm": 0.22, "p_cloudburst": 0.61,
     "flash_flood_risk": 0.48, "severity": "Orange"}
  ]
}
```

### `GET /api/v1/risk/frames?block_id={id}&hours=6`
Nowcast frames (2–6hr horizon) for a single block, used by the time-scrubber on the Block Detail
panel.

### `GET /api/v1/blocks/{id}/detail`
Full detail for one block: current risk, last 6 timesteps of raw features, active alert (if any),
XAI narrative.
```json
{
  "block": {"id": 1, "name": "Rupnagar"},
  "risk": {"p_thunderstorm": 0.22, "p_cloudburst": 0.61, "flash_flood_risk": 0.48},
  "features_history": [ {"ts": "...", "cape": 2100, "cin": -30, "...": "..."} ],
  "active_alert": {"id": 55, "severity": "Orange", "onset_estimate": "2026-09-08T17:00:00+05:30"},
  "xai": {"top_features": [{"feature": "cape", "contribution": 0.41}],
          "narrative": "Triggered primarily by rapid CAPE buildup combined with low-level convergence."}
}
```

### `GET /api/v1/alerts?state=Punjab&severity=Orange`
Active alerts feed, filterable. Used by the Alerts page.

### `GET /api/v1/alerts/{id}`
Single alert detail (for the Alert Detail modal).

### `GET /api/v1/geocode?q={query}`
Proxy over Open-Meteo's Geocoding API. Prioritizes Indian locations (`country_code == "IN"`).
Used by the Dashboard search bar to resolve place names/PIN codes to coordinates.
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
On-demand full-pipeline endpoint for a specific coordinate. Fetches live data, derives features, runs heuristic risk scoring, and generates an XAI narrative (both trigger narrative and AI overview) using Groq. Includes a `within_validated_core` honesty flag.
```json
{
  "data_mode": "live",
  "location": {"name": "Ludhiana, Punjab", "lat": 30.901, "lon": 75.8573},
  "generated_at": "2026-09-15T18:42:00+05:30",
  "within_validated_core": true,
  "risk": {
    "p_thunderstorm": 0.31, "p_cloudburst": 0.58,
    "flash_flood_risk": 0.44, "severity": "Orange",
    "is_baseline_heuristic": true
  },
  "features_snapshot": {"cape": 1980, "cin": -22, "humidity_proxy": 41.2,
    "cloud_trend": -3.1, "rainfall_recent": 6.4, "pressure_trend_3h": 14.2,
    "gusts": 6.4},
  "xai": {
    "top_features": [{"feature": "cape", "contribution": 0.38}],
    "trigger_narrative": "Elevated risk driven by rapid CAPE buildup.",
    "ai_overview": "Conditions over Ludhiana have intensified over the past two hours..."
  }
}
```

### `GET /api/v1/replay/{event_name}/frames`
e.g. `event_name = "aug_2025_punjab_floods"`. Returns the full pre-baked frame sequence from
`replay_events` — the frontend steps through this locally, no further backend calls needed once
loaded, so Replay mode survives total loss of connectivity mid-demo.

### `GET /api/v1/status`
Powers the Data Status page — last successful/failed poll per source, latency, whether each source
is currently in fallback mode.
```json
{
  "sources": [
    {"name": "open-meteo", "status": "ok", "last_success": "...", "latency_ms": 210},
    {"name": "imd", "status": "degraded", "last_success": "...", "note": "IP whitelist pending"},
    {"name": "mosdac", "status": "not_configured"}
  ]
}
```

### `POST /api/v1/internal/poll` *(internal, cron-triggered, not called by frontend)*
Triggers one poll cycle. Called by GitHub Actions or Render's own cron, not exposed publicly
without an internal auth token.

## Cron jobs

| Job | Cadence | Action |
|---|---|---|
| `poll_open_meteo` | every 15–30 min | fetch, write `weather_snapshots`, build `features` |
| `poll_imd` | every 15 min | fetch, write `weather_snapshots`; on failure, log to `api_health_log` and skip, don't block the pipeline |
| `run_model` | after each poll cycle | read latest `features`, write `predictions` |
| `run_flood_overlay` | after each `run_model` | write `flash_flood_risk` into `predictions` |
| `evaluate_alerts` | after each `run_model` | threshold check, write new `alerts`, trigger XAI generation for new alerts only |

## Fallback logic (applies to every external call)

```text
try:
    response = call_live_source()
    cache.store(source, response)
    return response, data_mode="live"
except (Timeout, HTTPError, ConnectionError):
    cached = cache.get_last_known_good(source)
    if cached and cached.age < MAX_STALE_AGE:
        return cached, data_mode="cached_fallback"
    else:
        return None, data_mode="unavailable"   # never raise to the frontend as a 500
```
