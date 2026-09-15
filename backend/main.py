from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from datetime import datetime, timezone
import json
import os

from .blocks import BLOCKS
from .cache import STATE, refresh_all, refresh_loop

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
    # Return without terrain_multiplier for the frontend
    return [{"id": b["id"], "name": b["name"], "lat": b["lat"], "lon": b["lon"]} for b in BLOCKS]

@app.get("/api/v1/risk/current")
def get_current_risk():
    return {
        "data_mode": STATE["data_mode"],
        "generated_at": STATE["generated_at"],
        "blocks": {k: v for k, v in STATE["blocks"].items()}
    }

@app.get("/api/v1/blocks/{block_id}/detail")
def get_block_detail(block_id: int):
    block = next((b for b in BLOCKS if b["id"] == block_id), None)
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
        
    risk_data = STATE["blocks"].get(block_id)
    if not risk_data:
        raise HTTPException(status_code=503, detail="Risk data not yet available")
        
    return {
        "block": {"id": block["id"], "name": block["name"], "lat": block["lat"], "lon": block["lon"]},
        "data_mode": STATE["data_mode"],
        "generated_at": STATE["generated_at"],
        "risk": risk_data
    }

@app.get("/api/v1/replay/aug_2025_punjab_floods/frames")
def get_replay_frames():
    try:
        # Load from static file
        replay_path = os.path.join(os.path.dirname(__file__), "replay_data.json")
        with open(replay_path, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"error": "Replay data not generated yet."}

@app.get("/api/v1/status")
def get_status():
    age_seconds = None
    if STATE["generated_at"]:
        try:
            gen_time = datetime.fromisoformat(STATE["generated_at"].replace("Z", "+00:00"))
            age_seconds = (datetime.now(timezone.utc) - gen_time).total_seconds()
        except Exception:
            pass
            
    return {
        "status": "ok" if STATE["data_mode"] == "live" else ("degraded" if STATE["data_mode"] == "cached_fallback" else "starting_up"),
        "data_mode": STATE["data_mode"],
        "last_success": STATE["generated_at"],
        "age_seconds": age_seconds
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
