"""
main.py — FastAPI backend for Meghdoot Sure-Shot + Upstream MVP.

Five endpoints:
  GET /api/v1/blocks           — static registry
  GET /api/v1/risk/current     — all 12 blocks risk summary
  GET /api/v1/blocks/{id}/detail — full detail panel data
  GET /api/v1/alerts           — severity ≥ Orange (the responder feed)
  GET /api/v1/status           — health + age

Every response carries data_mode and is_baseline_heuristic.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from datetime import datetime, timezone
import json
import os
from dotenv import load_dotenv

# Load .env file if present
load_dotenv()

from .blocks import BLOCKS
from .cache import STATE, refresh_all, refresh_loop
from .bihar_flood import fetch_bihar_flood_telemetry

app = FastAPI(title="Meghdoot Sure-Shot Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    print("Starting up Meghdoot backend...")
    await refresh_all()
    asyncio.create_task(refresh_loop())


@app.get("/api/v1/blocks")
def get_blocks():
    """Static registry: id, name, district, state, lat, lon, river."""
    return [
        {
            "id": b["id"],
            "name": b["name"],
            "district": b["district"],
            "state": b["state"],
            "lat": b["lat"],
            "lon": b["lon"],
            "river": b["river"],
        }
        for b in BLOCKS
    ]


@app.get("/api/v1/risk/current")
def get_current_risk():
    """All 12 blocks: 3 hazard scores, severity, dry_sky, data_mode, generated_at,
    is_baseline_heuristic:true."""
    summary = {}
    for bid, risk in STATE["blocks"].items():
        summary[bid] = {
            "thunderstorm_score": risk.get("thunderstorm_score", 0),
            "thunderstorm_severity": risk.get("thunderstorm_severity", "Green"),
            "cloudburst_score": risk.get("cloudburst_score", 0),
            "cloudburst_severity": risk.get("cloudburst_severity", "Green"),
            "flash_flood_score": risk.get("flash_flood_score", 0),
            "flash_flood_severity": risk.get("flash_flood_severity", "Green"),
            "top_hazard": risk.get("top_hazard", ""),
            "top_hazard_severity": risk.get("top_hazard_severity", "Green"),
            "dry_sky": risk.get("dry_sky", False),
            "is_baseline_heuristic": True,
        }
    return {
        "data_mode": STATE["data_mode"],
        "generated_at": STATE["generated_at"],
        "is_baseline_heuristic": True,
        "blocks": summary,
    }


@app.get("/api/v1/blocks/{block_id}/detail")
def get_block_detail(block_id: int):
    """Full detail: risk + upstream breakdown + arrival window + contribution split +
    exposure + comparison rows + narrative + reservoir_state_modelled."""
    block = next((b for b in BLOCKS if b["id"] == block_id), None)
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")

    risk_data = STATE["blocks"].get(block_id)
    if not risk_data:
        raise HTTPException(status_code=503, detail="Risk data not yet available")

    return {
        "block": {
            "id": block["id"],
            "name": block["name"],
            "district": block["district"],
            "state": block["state"],
            "lat": block["lat"],
            "lon": block["lon"],
            "river": block["river"],
        },
        "data_mode": STATE["data_mode"],
        "generated_at": STATE["generated_at"],
        "is_baseline_heuristic": True,
        "risk": risk_data,
    }


@app.get("/api/v1/alerts")
def get_alerts():
    """Flat array, severity ≥ Orange — the responder feed.
    This is the endpoint you demo with a single curl in a terminal."""
    alerts = []
    for block in BLOCKS:
        bid = block["id"]
        risk = STATE["blocks"].get(bid)
        if not risk:
            continue
        sev = risk.get("top_hazard_severity", "Green")
        if sev in ("Orange", "Red"):
            alerts.append({
                "block_id": bid,
                "name": block["name"],
                "district": block["district"],
                "state": block["state"],
                "river": block["river"],
                "severity": sev,
                "hazard": risk.get("top_hazard", ""),
                "dry_sky": risk.get("dry_sky", False),
                "flash_flood_risk": risk.get("flash_flood_score", 0),
                "arrival_from": risk.get("arrival_from", ""),
                "arrival_to": risk.get("arrival_to", ""),
                "exposure_total": risk.get("exposure_total", 0),
                "narrative": risk.get("narrative", ""),
                "data_mode": STATE["data_mode"],
                "is_baseline_heuristic": True,
            })
    return {
        "data_mode": STATE["data_mode"],
        "generated_at": STATE["generated_at"],
        "is_baseline_heuristic": True,
        "alerts": alerts,
    }


@app.get("/api/v1/replay/aug_2025_punjab_floods/frames")
def get_replay_frames():
    """Replay data for the August 2025 Punjab floods hindcast."""
    try:
        replay_path = os.path.join(os.path.dirname(__file__), "replay_data.json")
        with open(replay_path, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"error": "Replay data not generated yet.", "data_mode": "replay", "is_baseline_heuristic": True}


@app.get("/api/v1/status")
def get_status():
    """Health check: last_success, age_seconds, status."""
    age_seconds = None
    if STATE["generated_at"]:
        try:
            gen_time = datetime.fromisoformat(STATE["generated_at"].replace("Z", "+00:00"))
            age_seconds = (datetime.now(timezone.utc) - gen_time).total_seconds()
        except Exception:
            pass

    return {
        "status": "ok" if STATE["data_mode"] == "live" else (
            "degraded" if STATE["data_mode"] == "cached_fallback" else "starting_up"
        ),
        "data_mode": STATE["data_mode"],
        "last_success": STATE["generated_at"],
        "age_seconds": age_seconds,
        "is_baseline_heuristic": True,
    }


@app.get("/api/v1/bihar/flood")
async def get_bihar_flood(force_refresh: bool = False):
    """Live Bihar river basin and flood telemetry: discharge (m³/s), gauge danger margins, and trend."""
    try:
        return await fetch_bihar_flood_telemetry(force_refresh=force_refresh)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch Bihar flood telemetry: {str(e)}")



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
