"""
cache.py — In-memory polling cache with upstream hydro integration.

Calls fetch_all() on startup, then every 5 minutes. Computes risk (thunderstorm/cloudburst
from heuristic.py, flash-flood from hydro.py) for all blocks.

data_mode ∈ {starting_up, live, cached_fallback}.
Every response carries data_mode and is_baseline_heuristic.
"""

import asyncio
from datetime import datetime, timezone
from .blocks import BLOCKS, EXPOSURE
from .fetch import fetch_all
from .features import extract_features
from .heuristic import compute_risk
from .hydro import compute_all as compute_hydro

STATE = {"data_mode": "starting_up", "generated_at": None, "blocks": {}, "hydro": {}}


def now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _severity_from_score(score):
    if score < 0.25:
        return "Green"
    if score < 0.50:
        return "Yellow"
    if score < 0.75:
        return "Orange"
    return "Red"


def _template_narrative(block_name, hydro_data, risk_data):
    """Template narrative — no Groq in Phase A. A template that says something true
    and specific beats a Groq call that might time out in front of the reviewer."""
    dry_sky = hydro_data.get("dry_sky", False)
    river = hydro_data.get("river", "river")
    up3 = hydro_data.get("upstream_rain_3h", 0)
    local_3h = hydro_data.get("local_rain_3h", 0)
    arrival_from = hydro_data.get("arrival_from", "")
    arrival_to = hydro_data.get("arrival_to", "")

    # Format arrival times for display
    try:
        t1 = datetime.fromisoformat(arrival_from).strftime("%H:%M")
        t2 = datetime.fromisoformat(arrival_to).strftime("%H:%M")
    except Exception:
        t1, t2 = "—", "—"

    if dry_sky:
        return (
            f"No rainfall over {block_name} at present. {up3:.0f} mm has fallen across the "
            f"upstream {river} catchment in the last 3 hours. Runoff is estimated to reach "
            f"{block_name} between {t1} and {t2}."
        )

    severity = risk_data.get("top_hazard_severity", "Safe")
    top_hazard = risk_data.get("top_hazard", "risk")
    top_feature = risk_data.get("top_feature", "conditions")
    top_val = risk_data.get("top_feature_value", "elevated")
    if isinstance(top_val, float):
        top_val = f"{top_val:.1f}"

    return f"{severity} {top_hazard} risk, driven primarily by {top_feature} ({top_val})."


async def refresh_all():
    global STATE
    try:
        data = await fetch_all()
        now_idx = data["now_idx"]

        # Compute hydro for all blocks
        hydro_results = compute_hydro(data)
        hydro_by_id = {h["block_id"]: h for h in hydro_results}

        new_blocks_state = {}

        for block in BLOCKS:
            bid = block["id"]
            block_hourly = data["blocks"].get(bid, {})

            # Existing thunderstorm + cloudburst heuristic
            features = extract_features(block_hourly, now_idx=now_idx)
            risk = compute_risk(block, features)

            # Overlay flash flood from hydro
            hydro = hydro_by_id.get(bid, {})
            risk["flash_flood_score"] = hydro.get("flash_flood_risk", risk["flash_flood_score"])
            risk["flash_flood_severity"] = _severity_from_score(risk["flash_flood_score"])

            # Add hydro fields to risk
            risk["inflow_index"] = hydro.get("inflow_index", 0)
            risk["local_index"] = hydro.get("local_index", 0)
            risk["upstream_rain_3h"] = hydro.get("upstream_rain_3h", 0)
            risk["local_rain_3h"] = hydro.get("local_rain_3h", 0)
            risk["dry_sky"] = hydro.get("dry_sky", False)
            risk["lag_hours"] = hydro.get("lag_hours", 0)
            risk["arrival_from"] = hydro.get("arrival_from", "")
            risk["arrival_to"] = hydro.get("arrival_to", "")
            risk["contribution_split"] = hydro.get("contribution_split", {"upstream_pct": 50, "local_pct": 50})
            risk["upstream_detail"] = hydro.get("upstream_detail", [])
            risk["dam_regulated"] = hydro.get("dam_regulated", False)
            risk["dam"] = hydro.get("dam")
            risk["reservoir_state_modelled"] = hydro.get("reservoir_state_modelled", False)
            risk["river"] = hydro.get("river", "")

            # Re-evaluate top hazard to include flash flood from hydro
            hazards = [
                ("Thunderstorm", risk["thunderstorm_score"]),
                ("Cloudburst", risk["cloudburst_score"]),
                ("Flash Flood", risk["flash_flood_score"]),
            ]
            top_hazard, top_score = max(hazards, key=lambda x: x[1])
            risk["top_hazard"] = top_hazard
            risk["top_hazard_score"] = top_score
            risk["top_hazard_severity"] = _severity_from_score(top_score)

            # Template narrative (no Groq in Phase A)
            risk["narrative"] = _template_narrative(block["name"], hydro, risk)

            # Exposure
            risk["exposure"] = EXPOSURE.get(bid, [])
            risk["exposure_total"] = sum(f["pop"] for f in risk["exposure"])

            # Comparison rows (for the three-row comparison block)
            local_rain_1h = 0.0
            precip_arr = block_hourly.get("precipitation", [])
            if now_idx < len(precip_arr) and precip_arr[now_idx] is not None:
                local_rain_1h = precip_arr[now_idx]
            cloud_now = 0.0
            cloud_arr = block_hourly.get("cloud_cover", [])
            if now_idx < len(cloud_arr) and cloud_arr[now_idx] is not None:
                cloud_now = cloud_arr[now_idx]

            # Rolling 24h precipitation for IMD colour scale
            start_24h = max(now_idx - 23, 0)
            rolling_24h = sum(
                (precip_arr[i] or 0) for i in range(start_24h, min(now_idx + 1, len(precip_arr)))
            )
            if rolling_24h < 64.5:
                imd_colour = "GREEN"
                imd_desc = f"below 64.5 mm/24h threshold ({rolling_24h:.1f} mm)"
            elif rolling_24h < 115.5:
                imd_colour = "YELLOW"
                imd_desc = f"{rolling_24h:.1f} mm/24h (64.5–115.5 threshold)"
            elif rolling_24h < 204.4:
                imd_colour = "ORANGE"
                imd_desc = f"{rolling_24h:.1f} mm/24h (115.6–204.4 threshold)"
            else:
                imd_colour = "RED"
                imd_desc = f"{rolling_24h:.1f} mm/24h (>204.4 threshold)"

            risk["comparison"] = {
                "point_forecast": {
                    "label": "Standard point forecast",
                    "value": f"Rain {local_rain_1h:.1f} mm/h · Cloud {cloud_now:.0f}% · {'alert' if local_rain_1h > 15 else 'no alert'}",
                },
                "imd_scale": {
                    "label": "IMD colour scale applied to forecast rainfall",
                    "colour": imd_colour,
                    "value": imd_desc,
                },
                "meghdoot": {
                    "label": "Meghdoot block impact nowcast",
                    "severity": risk["top_hazard_severity"],
                    "value": f"{risk['top_hazard_severity'].upper()} — "
                             + (f"upstream inflow, arrival {risk['arrival_from'][-8:-3]}–{risk['arrival_to'][-8:-3]}"
                                if risk["dry_sky"] else f"{risk['top_hazard']} risk")
                             + f", {risk['exposure_total']:,} exposed",
                },
            }

            # Recent history for sparklines
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
