"""
hydro.py — Upstream catchment coupling, dry-sky flood detection, and arrival window.

This is the differentiator. A point-forecast app has no concept of catchment, upstream,
or travel time. This module computes:
  - inflow_index: normalized upstream rainfall contribution
  - local_index: normalized local rainfall contribution
  - flash_flood_risk: weighted combination of inflow + local
  - dry_sky: True when upstream inflow is significant but local rain is negligible
  - arrival_from / arrival_to: estimated runoff arrival window
  - contribution_split: {upstream_pct, local_pct}

The existing thunderstorm and cloudburst formulas from 02_SURE_SHOT_BACKEND_DESIGN.md
are kept exactly as they are in heuristic.py. This module adds the flash-flood head.
"""

from datetime import datetime, timedelta, timezone as tz
from .blocks import BLOCKS, UPSTREAM
from .terrain import get_terrain

UPSTREAM_SCALE = 45.0   # mm / 3h over the catchment mean that maps to inflow_index = 1.0
LOCAL_SCALE = 40.0      # mm / (3h past + 3h fcst) locally that maps to local_index = 1.0
DAM_ATTEN = 0.70        # attenuation when a major storage dam sits between upstream and block


def _clip(val, lo, hi):
    return max(lo, min(val, hi))


def _safe_mean(values):
    if not values:
        return 0.0
    return sum(values) / len(values)


def _sum_slice(arr, start, end):
    """Sum a slice of an array, handling None values and bounds."""
    s = 0.0
    for i in range(max(start, 0), min(end, len(arr))):
        v = arr[i]
        if v is not None:
            s += v
    return s


def block_hydro(block, block_hourly, upstream_hourlies, now_idx, terrain_data):
    """Compute hydrology for a single block.

    Args:
        block: block dict from BLOCKS
        block_hourly: {time: [...], precipitation: [...], ...} for this block
        upstream_hourlies: list of hourly dicts for this block's upstream points
        now_idx: index of the current hour in the arrays
        terrain_data: terrain dict for this block from TERRAIN

    Returns: dict with all hydro fields
    """
    bid = block["id"]
    loc_precip = block_hourly.get("precipitation", [])

    # Local rainfall: 3h past + 3h forecast
    local_3h = _sum_slice(loc_precip, now_idx - 3, now_idx)
    local_f3h = _sum_slice(loc_precip, now_idx, now_idx + 3)

    # Upstream rainfall: mean of per-point 3h and 6h sums
    up_3h_values = []
    up_6h_values = []
    for uh in upstream_hourlies:
        up_precip = uh.get("precipitation", [])
        up_3h_values.append(_sum_slice(up_precip, now_idx - 3, now_idx))
        up_6h_values.append(_sum_slice(up_precip, now_idx - 6, now_idx))

    up3 = _safe_mean(up_3h_values)
    up6 = _safe_mean(up_6h_values)

    # Inflow index: weighted combination of 3h and 6h upstream rain
    inflow = _clip((0.6 * up3 + 0.4 * (up6 / 2.0)) / UPSTREAM_SCALE, 0, 1)
    if block["dam_regulated"]:
        inflow *= DAM_ATTEN

    local = _clip((local_3h + local_f3h) / LOCAL_SCALE, 0, 1)

    # Flash flood risk: weighted combination
    flash_flood_risk = _clip(0.65 * inflow + 0.35 * local, 0, 1)

    # Dry-sky flag: significant upstream inflow but negligible local rain
    dry_sky = (inflow > 0.45) and (local < 0.15)

    # Arrival window from terrain
    lag = terrain_data.get("lag_hours", 4.0)
    now_dt = datetime.now(tz.utc)
    early_lag = max(lag * 0.75, lag - 0.5)
    late_lag = lag * 1.25 if lag * 1.25 > lag + 0.5 else lag + 0.5
    arrive_from = now_dt + timedelta(hours=early_lag)
    arrive_to = now_dt + timedelta(hours=late_lag)

    # Contribution split (renormalized from the 0.65/0.35 weighting)
    total_weighted = 0.65 * inflow + 0.35 * local
    if total_weighted > 0.001:
        upstream_pct = round((0.65 * inflow / total_weighted) * 100)
        local_pct = 100 - upstream_pct
    else:
        upstream_pct = 50
        local_pct = 50

    # Per-upstream-point detail (for Row F of the dashboard)
    upstream_detail = []
    for i, ukey in enumerate(block["upstream"]):
        up_precip = upstream_hourlies[i].get("precipitation", []) if i < len(upstream_hourlies) else []
        up_rain_3h = _sum_slice(up_precip, now_idx - 3, now_idx)
        ut = terrain_data.get("upstream", {}).get(ukey, {})
        upstream_detail.append({
            "name": ukey,
            "distance_km": ut.get("distance_km", 0),
            "rain_3h_mm": round(up_rain_3h, 1),
            "lag_hours": ut.get("lag_hours", 0),
            "elev_m": ut.get("elev_up", 0),
        })

    # Reservoir state caveat
    reservoir_state_modelled = False  # Always False in Phase A

    return {
        "name": block["name"],
        "block_id": bid,
        "river": block["river"],
        "inflow_index": round(inflow, 3),
        "local_index": round(local, 3),
        "upstream_rain_3h": round(up3, 1),
        "local_rain_3h": round(local_3h, 1),
        "flash_flood_risk": round(flash_flood_risk, 3),
        "dry_sky": dry_sky,
        "lag_hours": round(lag, 1),
        "arrival_from": arrive_from.isoformat(),
        "arrival_to": arrive_to.isoformat(),
        "contribution_split": {
            "upstream_pct": upstream_pct,
            "local_pct": local_pct,
        },
        "upstream_detail": upstream_detail,
        "dam_regulated": block["dam_regulated"],
        "dam": block.get("dam"),
        "reservoir_state_modelled": reservoir_state_modelled,
    }


def compute_all(fetch_data):
    """Compute hydrology for all blocks from fetch_all() output.

    Args:
        fetch_data: return value of fetch_all() — {blocks, upstream, now_idx}

    Returns: list of hydro dicts, one per block
    """
    terrain = get_terrain()
    now_idx = fetch_data["now_idx"]
    results = []

    for block in BLOCKS:
        bid = block["id"]
        block_hourly = fetch_data["blocks"].get(bid, {})

        # Gather upstream hourlies for this block
        upstream_hourlies = []
        for ukey in block["upstream"]:
            uh = fetch_data["upstream"].get(ukey, {})
            upstream_hourlies.append(uh)

        terrain_data = terrain.get(bid, {"lag_hours": 4.0, "upstream": {}})
        result = block_hydro(block, block_hourly, upstream_hourlies, now_idx, terrain_data)
        results.append(result)

    return results
