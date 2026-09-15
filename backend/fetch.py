"""
fetch.py — One batched Open-Meteo call for all 32 coordinates (12 blocks + 20 upstream).

The URL MUST include timezone=Asia/Kolkata. A build-failing test asserts this.
"""

import httpx
from .blocks import BLOCKS, UPSTREAM

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
HOURLY_FIELDS = "cape,convective_inhibition,relative_humidity_2m,cloud_cover,precipitation,surface_pressure,wind_gusts_10m"
PAST_HOURS = 12
FORECAST_HOURS = 6
TIMEZONE = "Asia/Kolkata"

# Fixed ordering: blocks first (by list order), then upstream (by insertion order of UPSTREAM dict)
UPSTREAM_KEYS = list(UPSTREAM.keys())


def _build_url_params():
    """Build the query params for the batched forecast call."""
    block_lats = [str(b["lat"]) for b in BLOCKS]
    block_lons = [str(b["lon"]) for b in BLOCKS]
    up_lats = [str(UPSTREAM[k][0]) for k in UPSTREAM_KEYS]
    up_lons = [str(UPSTREAM[k][1]) for k in UPSTREAM_KEYS]

    return {
        "latitude": ",".join(block_lats + up_lats),
        "longitude": ",".join(block_lons + up_lons),
        "hourly": HOURLY_FIELDS,
        "past_hours": str(PAST_HOURS),
        "forecast_hours": str(FORECAST_HOURS),
        "timezone": TIMEZONE,
    }


def normalise_response(data):
    """Open-Meteo returns a bare object for a single coordinate and an array for many.
    Always return a list."""
    if isinstance(data, list):
        return data
    return [data]


async def fetch_all():
    """Fetch all 32 coordinates in one batched call.

    Returns: {
        "blocks": {block_id: hourly_dict, ...},
        "upstream": {upstream_key: hourly_dict, ...},
        "now_idx": int  (index of the current hour in the hourly arrays)
    }
    """
    params = _build_url_params()
    assert "timezone=Asia" in f"timezone={params['timezone']}", "timezone param missing!"

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.get(OPEN_METEO_URL, params=params)
        response.raise_for_status()
        raw = response.json()

    results = normalise_response(raw)
    assert len(results) == len(BLOCKS) + len(UPSTREAM_KEYS), (
        f"Expected {len(BLOCKS) + len(UPSTREAM_KEYS)} results, got {len(results)}"
    )

    # Split into blocks and upstream
    blocks_data = {}
    for i, block in enumerate(BLOCKS):
        hourly = results[i].get("hourly", {})
        blocks_data[block["id"]] = hourly

    upstream_data = {}
    for j, key in enumerate(UPSTREAM_KEYS):
        hourly = results[len(BLOCKS) + j].get("hourly", {})
        upstream_data[key] = hourly

    # Determine now_idx: the array runs [t-PAST_HOURS ... t-1, t, t+1 ... t+FORECAST_HOURS]
    # so now_idx = PAST_HOURS (0-indexed position of the current hour)
    now_idx = PAST_HOURS

    return {
        "blocks": blocks_data,
        "upstream": upstream_data,
        "now_idx": now_idx,
    }


# --- Legacy function kept for backward compatibility (location search pipeline) ---
async def fetch_point_weather_data(lat: float, lon: float):
    """Fetch weather data for a single arbitrary point (used by location search)."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": HOURLY_FIELDS,
        "past_hours": "12",
        "forecast_hours": "3",
        "timezone": TIMEZONE,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.get(OPEN_METEO_URL, params=params)
        response.raise_for_status()
        return response.json()


# --- Build-failing test: timezone param must be present ---
def _test_timezone_in_url():
    """This test MUST pass. If it fails, the build is broken.
    Called at module import time to catch the bug immediately."""
    params = _build_url_params()
    url_string = "&".join(f"{k}={v}" for k, v in params.items())
    assert "timezone=Asia/Kolkata" in url_string, (
        f"CRITICAL: timezone=Asia/Kolkata is missing from the constructed URL! "
        f"This has caused a real bug before. URL params: {url_string}"
    )


# Run the test at import time — if this fails, the module won't load
_test_timezone_in_url()
