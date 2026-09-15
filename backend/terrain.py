"""
terrain.py — Elevation-derived kinematic-wave routing lags.

Fetches block + upstream elevations from the Open-Meteo Elevation API (one batched call,
max 100 coords), then computes a lumped kinematic-wave routing estimate for each
upstream→block pair. Caches results to terrain_cache.json so the API is called at most once.

Method:
  1. Straight-line distance (haversine) × sinuosity factor → channel length
  2. Channel slope from elevation drop / channel length
  3. Mean velocity from Manning-type slope relation: v = 1.0 + 40·√S, clipped to [V_MIN, V_MAX]
  4. Flood-wave celerity: c = (5/3)·v  (kinematic-wave result for a wide channel)
  5. Lag = channel_length / celerity → hours

Label: "Lumped kinematic-wave routing estimate; DEM flow routing pending."
"""

import json
import math
import os
import requests

from .blocks import BLOCKS, UPSTREAM

SINUOSITY = 1.35       # channel length / straight-line, Himalayan foreland rivers
V_MIN, V_MAX = 0.8, 4.0  # m/s bounds on mean channel velocity
CELERITY_FACTOR = 5.0 / 3.0  # kinematic wave celerity / mean velocity, wide channel (Manning)

CACHE_PATH = os.path.join(os.path.dirname(__file__), "terrain_cache.json")


def haversine_km(a: tuple, b: tuple) -> float:
    """Great-circle distance between two (lat, lon) points in km."""
    R = 6371.0
    p1, p2 = math.radians(a[0]), math.radians(b[0])
    dp = p2 - p1
    dl = math.radians(b[1] - a[1])
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


def fetch_elevations(points: list) -> list:
    """Fetch elevations for a list of (lat, lon) tuples. One batched call, max 100."""
    lats = ",".join(f"{p[0]:.4f}" for p in points)
    lons = ",".join(f"{p[1]:.4f}" for p in points)
    r = requests.get(
        "https://api.open-meteo.com/v1/elevation",
        params={"latitude": lats, "longitude": lons},
        timeout=60,
    )
    r.raise_for_status()
    return r.json()["elevation"]


def routing_estimate(elev_up: float, elev_block: float, straight_km: float):
    """Lumped kinematic-wave routing estimate.
    Returns (lag_hours, velocity_ms, slope).
    """
    L_km = straight_km * SINUOSITY
    drop = max(elev_up - elev_block, 1.0)  # metres, floored to avoid zero slope
    S = drop / (L_km * 1000.0)  # dimensionless
    v = min(max(1.0 + 40.0 * math.sqrt(S), V_MIN), V_MAX)  # m/s, Manning-type
    c = CELERITY_FACTOR * v  # flood-wave celerity, m/s
    lag = (L_km * 1000.0) / (c * 3600.0)  # hours
    return lag, v, S


def build_terrain(force_refresh: bool = False) -> dict:
    """Build the TERRAIN dict. Loads from cache if present, else fetches from API.

    Returns: {block_id: {
        "upstream": {key: {distance_km, elev_up, elev_block, slope, velocity_ms, lag_hours}},
        "lag_hours": float (mean of upstream lags),
        "arrival_window": (early_hours, late_hours),
    }}
    """
    if not force_refresh and os.path.exists(CACHE_PATH):
        with open(CACHE_PATH, "r") as f:
            cached = json.load(f)
        # Convert string keys back to int
        return {int(k): v for k, v in cached.items()}

    # Build ordered coordinate list: blocks first, then upstream
    block_points = [(b["lat"], b["lon"]) for b in BLOCKS]
    upstream_keys = list(UPSTREAM.keys())
    upstream_points = [UPSTREAM[k] for k in upstream_keys]
    all_points = block_points + upstream_points

    assert len(all_points) <= 100, f"Too many points for one Elevation API call: {len(all_points)}"

    elevations = fetch_elevations(all_points)

    block_elevs = {b["id"]: elevations[i] for i, b in enumerate(BLOCKS)}
    upstream_elevs = {upstream_keys[j]: elevations[len(BLOCKS) + j] for j in range(len(upstream_keys))}

    terrain = {}
    for block in BLOCKS:
        bid = block["id"]
        elev_block = block_elevs[bid]
        upstream_detail = {}
        lags = []

        for ukey in block["upstream"]:
            elev_up = upstream_elevs[ukey]
            dist_km = haversine_km(UPSTREAM[ukey], (block["lat"], block["lon"]))
            lag_h, vel, slope = routing_estimate(elev_up, elev_block, dist_km)

            upstream_detail[ukey] = {
                "distance_km": round(dist_km, 1),
                "elev_up": elev_up,
                "elev_block": elev_block,
                "slope": round(slope, 6),
                "velocity_ms": round(vel, 2),
                "lag_hours": round(lag_h, 2),
            }
            lags.append(lag_h)

        mean_lag = sum(lags) / len(lags) if lags else 0
        # Arrival window: ±25% with a floor of ±0.5h
        early = max(mean_lag * 0.75, mean_lag - 0.5)
        late = mean_lag * 1.25 if mean_lag * 1.25 > mean_lag + 0.5 else mean_lag + 0.5

        terrain[bid] = {
            "upstream": upstream_detail,
            "lag_hours": round(mean_lag, 2),
            "arrival_window": [round(early, 2), round(late, 2)],
        }

    # Write cache
    with open(CACHE_PATH, "w") as f:
        json.dump(terrain, f, indent=2)

    return terrain


# Module-level singleton, built on first import
TERRAIN: dict = {}


def get_terrain() -> dict:
    """Get the terrain data, building it on first access."""
    global TERRAIN
    if not TERRAIN:
        TERRAIN = build_terrain()
    return TERRAIN
