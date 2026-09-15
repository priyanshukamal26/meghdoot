"""
cache.py — In-memory polling cache.

Calls fetch_all() on startup, then every 5 minutes. Computes risk for all blocks.
data_mode ∈ {starting_up, live, cached_fallback}.
"""

import asyncio
from datetime import datetime, timezone
from .blocks import BLOCKS
from .fetch import fetch_all
from .features import extract_features
from .heuristic import compute_risk
from .narrative import generate_narrative

STATE = {"data_mode": "starting_up", "generated_at": None, "blocks": {}}


def now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


async def refresh_all():
    global STATE
    try:
        data = await fetch_all()
        new_blocks_state = {}

        for block in BLOCKS:
            bid = block["id"]
            block_hourly = data["blocks"].get(bid, {})
            now_idx = data["now_idx"]

            features = extract_features(block_hourly, now_idx=now_idx)
            risk = compute_risk(block, features)

            narrative = await generate_narrative(block["name"], risk)
            risk["narrative"] = narrative

            # Recent history slice for sparklines
            history_keys = ["time", "precipitation", "cloud_cover"]
            start_h = max(now_idx - 2, 0)
            history = {k: block_hourly.get(k, [])[start_h:now_idx + 1] for k in history_keys}
            risk["history"] = history

            new_blocks_state[bid] = risk

        STATE["blocks"] = new_blocks_state
        STATE["data_mode"] = "live"
        STATE["generated_at"] = now_iso()
        print(f"[{now_iso()}] Successfully refreshed data for {len(new_blocks_state)} blocks.")
    except Exception as e:
        import traceback
        print(f"[{now_iso()}] Refresh failed: {e}")
        traceback.print_exc()
        if STATE["blocks"]:
            STATE["data_mode"] = "cached_fallback"


async def refresh_loop():
    while True:
        await asyncio.sleep(300)  # 5 minutes
        await refresh_all()
