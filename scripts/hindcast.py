"""
scripts/hindcast.py — Generate replay_data.json and leadtime.json from the Aug 2025 event.

Uses the SAME feature extraction and hydro functions as the live path (one function,
two call sites — no forked logic).

Historical Forecast API: historical-forecast-api.open-meteo.com
Window: 2025-08-15 to 2025-09-05
Timezone: Asia/Kolkata (mandatory)

Outputs:
  backend/replay_data.json  — per-hour, per-block risk for offline replay
  frontend/src/data/leadtime.json — lead-time scorecard for Evidence page
"""

import sys
import os
import json
import math
from datetime import datetime, timedelta, timezone as tz

# Add project root to path so we can import backend modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import requests
from backend.blocks import BLOCKS, UPSTREAM, EXPOSURE
from backend.terrain import get_terrain
from backend.features import extract_features
from backend.heuristic import compute_risk

# ── Constants ──
HIST_URL = "https://historical-forecast-api.open-meteo.com/v1/forecast"
HOURLY_FIELDS = "cape,convective_inhibition,relative_humidity_2m,cloud_cover,precipitation,surface_pressure,wind_gusts_10m"
START_DATE = "2025-08-15"
END_DATE = "2025-09-05"
TIMEZONE = "Asia/Kolkata"

# Hydro constants (must match hydro.py)
UPSTREAM_SCALE = 45.0
LOCAL_SCALE = 40.0
DAM_ATTEN = 0.70


def _clip(val, lo, hi):
    return max(lo, min(val, hi))


def _safe_mean(values):
    return sum(values) / len(values) if values else 0.0


def _sum_slice(arr, start, end):
    s = 0.0
    for i in range(max(start, 0), min(end, len(arr))):
        v = arr[i]
        if v is not None:
            s += v
    return s


def _severity(score):
    if score < 0.25: return "Green"
    if score < 0.50: return "Yellow"
    if score < 0.75: return "Orange"
    return "Red"


def fetch_historical():
    """Fetch historical data for all 32 coords in one batched call."""
    upstream_keys = list(UPSTREAM.keys())
    block_lats = [str(b["lat"]) for b in BLOCKS]
    block_lons = [str(b["lon"]) for b in BLOCKS]
    up_lats = [str(UPSTREAM[k][0]) for k in upstream_keys]
    up_lons = [str(UPSTREAM[k][1]) for k in upstream_keys]

    params = {
        "latitude": ",".join(block_lats + up_lats),
        "longitude": ",".join(block_lons + up_lons),
        "start_date": START_DATE,
        "end_date": END_DATE,
        "hourly": HOURLY_FIELDS,
        "timezone": TIMEZONE,
    }

    assert "timezone" in params and params["timezone"] == "Asia/Kolkata"

    print(f"Fetching historical data for {len(block_lats) + len(up_lats)} coords, "
          f"{START_DATE} to {END_DATE}...")
    r = requests.get(HIST_URL, params=params, timeout=120)
    r.raise_for_status()
    raw = r.json()

    # Normalise response
    results = raw if isinstance(raw, list) else [raw]
    expected = len(BLOCKS) + len(upstream_keys)
    assert len(results) == expected, f"Expected {expected} results, got {len(results)}"

    blocks_data = {}
    for i, block in enumerate(BLOCKS):
        blocks_data[block["id"]] = results[i].get("hourly", {})

    upstream_data = {}
    for j, key in enumerate(upstream_keys):
        upstream_data[key] = results[len(BLOCKS) + j].get("hourly", {})

    times = results[0].get("hourly", {}).get("time", [])
    print(f"Got {len(times)} hourly timesteps: {times[0]} to {times[-1]}")
    return blocks_data, upstream_data, times


def compute_hydro_at(block, block_hourly, upstream_hourlies, now_idx, terrain_data, time_str):
    """Compute hydro for one block at one timestep (mirrors hydro.py logic exactly)."""
    loc_precip = block_hourly.get("precipitation", [])
    local_3h = _sum_slice(loc_precip, now_idx - 3, now_idx)
    local_f3h = _sum_slice(loc_precip, now_idx, now_idx + 3)

    up_3h_values = []
    up_6h_values = []
    for uh in upstream_hourlies:
        up_precip = uh.get("precipitation", [])
        up_3h_values.append(_sum_slice(up_precip, now_idx - 3, now_idx))
        up_6h_values.append(_sum_slice(up_precip, now_idx - 6, now_idx))

    up3 = _safe_mean(up_3h_values)
    up6 = _safe_mean(up_6h_values)

    inflow = _clip((0.6 * up3 + 0.4 * (up6 / 2.0)) / UPSTREAM_SCALE, 0, 1)
    if block["dam_regulated"]:
        inflow *= DAM_ATTEN

    local = _clip((local_3h + local_f3h) / LOCAL_SCALE, 0, 1)
    flash_flood_risk = _clip(0.65 * inflow + 0.35 * local, 0, 1)
    dry_sky = (inflow > 0.45) and (local < 0.15)

    lag = terrain_data.get("lag_hours", 4.0)

    # Parse the timestamp for arrival window
    try:
        now_dt = datetime.fromisoformat(time_str)
    except Exception:
        now_dt = datetime.now(tz.utc)

    early_lag = max(lag * 0.75, lag - 0.5)
    late_lag = lag * 1.25 if lag * 1.25 > lag + 0.5 else lag + 0.5
    arrive_from = now_dt + timedelta(hours=early_lag)
    arrive_to = now_dt + timedelta(hours=late_lag)

    # Contribution split
    total_w = 0.65 * inflow + 0.35 * local
    if total_w > 0.001:
        upstream_pct = round((0.65 * inflow / total_w) * 100)
        local_pct = 100 - upstream_pct
    else:
        upstream_pct = 50
        local_pct = 50

    return {
        "inflow_index": round(inflow, 3),
        "local_index": round(local, 3),
        "upstream_rain_3h": round(up3, 1),
        "local_rain_3h": round(local_3h, 1),
        "flash_flood_risk": round(flash_flood_risk, 3),
        "dry_sky": dry_sky,
        "lag_hours": round(lag, 1),
        "arrival_from": arrive_from.isoformat(),
        "arrival_to": arrive_to.isoformat(),
        "contribution_split": {"upstream_pct": upstream_pct, "local_pct": local_pct},
        "dam_regulated": block["dam_regulated"],
        "reservoir_state_modelled": False,
    }


def build_narrative(block_name, hydro, risk, river):
    """Template narrative matching cache.py."""
    if hydro["dry_sky"]:
        try:
            t1 = datetime.fromisoformat(hydro["arrival_from"]).strftime("%H:%M")
            t2 = datetime.fromisoformat(hydro["arrival_to"]).strftime("%H:%M")
        except Exception:
            t1, t2 = "—", "—"
        return (
            f"No rainfall over {block_name} at present. {hydro['upstream_rain_3h']:.0f} mm "
            f"has fallen across the upstream {river} catchment in the last 3 hours. "
            f"Runoff is estimated to reach {block_name} between {t1} and {t2}."
        )
    severity = risk.get("top_hazard_severity", "Safe")
    top_hazard = risk.get("top_hazard", "risk")
    top_feature = risk.get("top_feature", "conditions")
    top_val = risk.get("top_feature_value", "elevated")
    if isinstance(top_val, float):
        top_val = f"{top_val:.1f}"
    return f"{severity} {top_hazard} risk, driven primarily by {top_feature} ({top_val})."


def run_hindcast():
    blocks_data, upstream_data, times = fetch_historical()
    terrain = get_terrain()
    n_times = len(times)

    # ── Output 1: replay_data.json ──
    replay_frames = []
    # Per-block accumulators for leadtime analysis
    block_series = {b["id"]: {"precip": [], "flash_flood_risk": []} for b in BLOCKS}

    print(f"Processing {n_times} timesteps × {len(BLOCKS)} blocks...")

    for t_idx in range(n_times):
        frame = {
            "time": times[t_idx],
            "data_mode": "replay",
            "is_baseline_heuristic": True,
            "blocks": {},
        }

        for block in BLOCKS:
            bid = block["id"]
            block_hourly = blocks_data.get(bid, {})

            # Gather upstream hourlies
            upstream_hourlies = [upstream_data.get(uk, {}) for uk in block["upstream"]]
            terrain_data = terrain.get(bid, {"lag_hours": 4.0})

            # Features + heuristic risk (thunderstorm / cloudburst)
            features = extract_features(block_hourly, now_idx=t_idx)
            risk = compute_risk(block, features)

            # Hydro (flash flood with upstream coupling)
            hydro = compute_hydro_at(block, block_hourly, upstream_hourlies,
                                     t_idx, terrain_data, times[t_idx])

            # Overlay flash flood score from hydro
            risk["flash_flood_score"] = hydro["flash_flood_risk"]
            risk["flash_flood_severity"] = _severity(risk["flash_flood_score"])

            # Re-evaluate top hazard
            hazards = [
                ("Thunderstorm", risk["thunderstorm_score"]),
                ("Cloudburst", risk["cloudburst_score"]),
                ("Flash Flood", risk["flash_flood_score"]),
            ]
            top_hazard, top_score = max(hazards, key=lambda x: x[1])
            risk["top_hazard"] = top_hazard
            risk["top_hazard_score"] = top_score
            risk["top_hazard_severity"] = _severity(top_score)

            # Add hydro fields
            for k, v in hydro.items():
                risk[k] = v

            risk["river"] = block["river"]
            risk["narrative"] = build_narrative(block["name"], hydro, risk, block["river"])
            risk["exposure"] = EXPOSURE.get(bid, [])
            risk["exposure_total"] = sum(f["pop"] for f in risk["exposure"])

            frame["blocks"][str(bid)] = risk

            # Accumulate for leadtime
            precip_val = block_hourly.get("precipitation", [])
            p = precip_val[t_idx] if t_idx < len(precip_val) and precip_val[t_idx] is not None else 0.0
            block_series[bid]["precip"].append(p)
            block_series[bid]["flash_flood_risk"].append(hydro["flash_flood_risk"])

        replay_frames.append(frame)

    replay_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                               "backend", "replay_data.json")
    with open(replay_path, "w") as f:
        json.dump(replay_frames, f, separators=(",", ":"))
    print(f"Wrote {len(replay_frames)} frames to {replay_path}")
    print(f"  File size: {os.path.getsize(replay_path) / 1024:.0f} KB")

    # ── Output 2: leadtime.json ──
    leadtime = []
    for block in BLOCKS:
        bid = block["id"]
        precip = block_series[bid]["precip"]
        ffr = block_series[bid]["flash_flood_risk"]

        # peak_hour: hour of max rolling 24h local rainfall
        best_24h = -1
        peak_idx = 0
        for i in range(len(precip)):
            start = max(i - 23, 0)
            rolling = sum(precip[start:i + 1])
            if rolling > best_24h:
                best_24h = rolling
                peak_idx = i

        # baseline_alert_ts: first hour where rolling-3h ≥ 50 or single hour ≥ 15
        baseline_idx = None
        for i in range(len(precip)):
            single = precip[i]
            roll3 = sum(precip[max(i - 2, 0):i + 1])
            if roll3 >= 50.0 or single >= 15.0:
                baseline_idx = i
                break

        # imd_scale_ts: first hour where rolling-24h ≥ 64.5
        imd_idx = None
        for i in range(len(precip)):
            start = max(i - 23, 0)
            roll24 = sum(precip[start:i + 1])
            if roll24 >= 64.5:
                imd_idx = i
                break

        # meghdoot_alert_ts: first hour where flash_flood_risk ≥ 0.50
        meghdoot_idx = None
        for i in range(len(ffr)):
            if ffr[i] >= 0.50:
                meghdoot_idx = i
                break

        # Compute lead times (in hours, relative to peak)
        lead_baseline = (peak_idx - baseline_idx) if baseline_idx is not None else None
        lead_meghdoot = (peak_idx - meghdoot_idx) if meghdoot_idx is not None else None

        if lead_baseline is not None and lead_meghdoot is not None:
            gain = lead_meghdoot - lead_baseline
        else:
            gain = 0

        entry = {
            "block_id": bid,
            "name": block["name"],
            "district": block["district"],
            "river": block["river"],
            "peak_hour": times[peak_idx] if peak_idx < len(times) else None,
            "peak_24h_mm": round(best_24h, 1),
            "baseline_alert_ts": times[baseline_idx] if baseline_idx is not None and baseline_idx < len(times) else None,
            "imd_scale_ts": times[imd_idx] if imd_idx is not None and imd_idx < len(times) else None,
            "meghdoot_alert_ts": times[meghdoot_idx] if meghdoot_idx is not None and meghdoot_idx < len(times) else None,
            "lead_baseline_h": lead_baseline,
            "lead_meghdoot_h": lead_meghdoot,
            "gain_h": gain,
        }
        leadtime.append(entry)

    leadtime_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                                  "src", "data", "leadtime.json")
    with open(leadtime_path, "w") as f:
        json.dump(leadtime, f, indent=2)
    print(f"\nWrote leadtime.json to {leadtime_path}")

    # Print summary
    for b in leadtime:
        print(f"  {b['name']:12s}  gain {b['gain_h']:+4d} h  "
              f"(baseline={b['lead_baseline_h']}, meghdoot={b['lead_meghdoot_h']}, "
              f"peak_24h={b['peak_24h_mm']} mm)")

    pos = sum(1 for b in leadtime if b["gain_h"] > 0)
    print(f"\nBlocks with positive gain: {pos} / {len(leadtime)}")


if __name__ == "__main__":
    run_hindcast()
