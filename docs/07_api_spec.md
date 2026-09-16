# Backend API Specification (FastAPI)

## Design principles

- Every route that depends on an external live source must degrade to cached data, never a 500.
- Every response includes a `data_mode` field (`"live"` | `"cached_fallback"` | `"replay"`) so the
  frontend can visibly label what the user is looking at — never silently substitute.
- Keep the schema frozen once the frontend team starts building against it (see
  `14_fallback_and_risk_playbook.md`, "API contract drift").

# Backend API Specification (FastAPI)

## Design principles

- Every route that depends on an external live source degrades to cached data or local fallback, never an unhandled 500.
- Every response includes `data_mode` (`"live"` | `"cached_fallback"` | `"replay"`) and `is_baseline_heuristic: true` for scientific honesty.
- All 12 blocks and 20 upstream catchment points are registered and monitored.

---

## Operational Routes (Verified Live)

### 1. `GET /api/v1/blocks`
Returns the static registry of all 12 monitored blocks with river basins and coordinates.
```json
[
  {
    "id": 1,
    "name": "Rupnagar",
    "district": "Rupnagar",
    "state": "Punjab",
    "lat": 30.9686,
    "lon": 76.5262,
    "river": "Sutlej"
  }
]
```

### 2. `GET /api/v1/risk/current`
Summary of all 12 blocks polled by the Dashboard map. Contains all three hazard scores, top hazard severity, and the dry-sky flood flag.
```json
{
  "data_mode": "live",
  "generated_at": "2026-09-16T06:01:30.369620Z",
  "is_baseline_heuristic": true,
  "blocks": {
    "1": {
      "thunderstorm_score": 0.22,
      "thunderstorm_severity": "Green",
      "cloudburst_score": 0.15,
      "cloudburst_severity": "Green",
      "flash_flood_score": 0.58,
      "flash_flood_severity": "Orange",
      "top_hazard": "Flash Flood",
      "top_hazard_severity": "Orange",
      "dry_sky": true,
      "is_baseline_heuristic": true
    }
  }
}
```

### 3. `GET /api/v1/blocks/{block_id}/detail`
Full detail for the slide-in Block Detail Panel (Rows A–G):
- Risk breakdown across thunderstorm, cloudburst, flash flood
- Upstream catchment telemetry and rainfall ($mm/3h$)
- Lumped kinematic-wave arrival window (`arrival_from`, `arrival_to`)
- Contribution split (`local_rain_contrib`, `upstream_inflow_contrib`)
- Exposure counts (`population`, `health_centers`, `schools`)
- 3-row comparison block (forecast rain, threshold alert, Meghdoot lead-time)
- Plain-English XAI meteorological narrative (Groq LLM or template fallback)
```json
{
  "block": {
    "id": 1,
    "name": "Rupnagar",
    "district": "Rupnagar",
    "state": "Punjab",
    "lat": 30.9686,
    "lon": 76.5262,
    "river": "Sutlej"
  },
  "data_mode": "live",
  "generated_at": "2026-09-16T06:01:30.369620Z",
  "is_baseline_heuristic": true,
  "risk": {
    "top_hazard": "Flash Flood",
    "top_hazard_severity": "Orange",
    "dry_sky": true,
    "local_rain_3h": 0.0,
    "upstream_rain_3h": 64.2,
    "arrival_from": "16:10",
    "arrival_to": "17:10",
    "exposure_total": 1240,
    "narrative": "Severe dry-sky flash flood threat: heavy upstream rainfall in Himachal...",
    "comparison": {
      "forecast_rain_24h": "12.4 mm",
      "imd_color_scale": "Green (<64.5 mm)",
      "threshold_alert": "None",
      "meghdoot_alert": "Orange (Arrival 16:10–17:10)"
    }
  }
}
```

### 4. `GET /api/v1/alerts`
Flat array of active alerts for emergency responders (severity $\ge$ Orange).
```json
{
  "data_mode": "live",
  "generated_at": "2026-09-16T06:01:30.369620Z",
  "is_baseline_heuristic": true,
  "alerts": [
    {
      "block_id": 1,
      "name": "Rupnagar",
      "district": "Rupnagar",
      "state": "Punjab",
      "river": "Sutlej",
      "severity": "Orange",
      "hazard": "Flash Flood",
      "dry_sky": true,
      "flash_flood_risk": 0.65,
      "arrival_from": "16:10",
      "arrival_to": "17:10",
      "exposure_total": 1240,
      "narrative": "Runoff from Shivalik catchments arriving in ~3h 20m.",
      "data_mode": "live",
      "is_baseline_heuristic": true
    }
  ]
}
```

### 5. `GET /api/v1/status`
Health check and data currency monitor:
```json
{
  "status": "ok",
  "data_mode": "live",
  "last_success": "2026-09-16T06:01:30.369620Z",
  "age_seconds": 16.6,
  "is_baseline_heuristic": true
}
```

### 6. `GET /api/v1/replay/aug_2025_punjab_floods/frames`
Serves pre-computed historical frames from `replay_data.json` for the August 2025 disaster reconstruction. Feeds the timeline scrubber with zero network latency.

### 7. `GET /api/v1/bihar/flood`
Real-time river basin telemetry across Bihar (Kosi, Gandak, Bagmati, Burhi Gandak, etc.):
- Discharge ($m^3/s$)
- Water level vs danger level margins
- Hydro-trend and danger category
```json
{
  "data_mode": "live",
  "generated_at": "2026-09-16T09:15:00Z",
  "basins": [
    {
      "river": "Kosi",
      "station": "Birpur / Baltara",
      "discharge_cumec": 4250.0,
      "status": "Warning",
      "trend": "Rising"
    }
  ]
}
```

---

## Background Caching & Poller Logic

```python
# cache.py background loop
async def refresh_loop():
    while True:
        try:
            await refresh_all()
        except Exception as e:
            print(f"Poller error: {e}")
            STATE["data_mode"] = "cached_fallback"
        await asyncio.sleep(300) # 5-minute cadence
```

