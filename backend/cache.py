import asyncio
from datetime import datetime, timezone
from .blocks import BLOCKS
from .fetch import fetch_all_blocks
from .features import extract_features
from .heuristic import compute_risk
from .narrative import generate_narrative

STATE = {"data_mode": "starting_up", "generated_at": None, "blocks": {}}

def now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

async def refresh_all():
    global STATE
    try:
        raw_data = await fetch_all_blocks()
        
        if isinstance(raw_data, list):
            responses = raw_data
        else:
            responses = [raw_data]

        new_blocks_state = {}
        
        for i, block in enumerate(BLOCKS):
            if i < len(responses):
                block_res = responses[i]
                hourly = block_res.get("hourly", {})
                
                features = extract_features(hourly)
                risk = compute_risk(block, features)
                
                narrative = await generate_narrative(block["name"], risk)
                risk["narrative"] = narrative
                
                history_keys = ["time", "precipitation", "cloud_cover"]
                # Get indices 4,5,6 (last 2 hours + now) or just a slice of the past
                history = {k: hourly.get(k, [])[4:7] for k in history_keys}
                risk["history"] = history
                
                new_blocks_state[block["id"]] = risk
        
        STATE["blocks"] = new_blocks_state
        STATE["data_mode"] = "live"
        STATE["generated_at"] = now_iso()
        print(f"[{now_iso()}] Successfully refreshed data.")
    except Exception as e:
        import traceback
        print(f"[{now_iso()}] Refresh failed: {e}")
        traceback.print_exc()
        if STATE["blocks"]:
            STATE["data_mode"] = "cached_fallback"

async def refresh_loop():
    while True:
        await asyncio.sleep(300) # 5 minutes
        await refresh_all()
