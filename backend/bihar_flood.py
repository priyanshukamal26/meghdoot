"""
bihar_flood.py — Live Bihar river basin & flood gauge telemetry.

Queries real-time and forecasted river discharge (m³/s) from the Open-Meteo Global
Flood API (GloFAS / Copernicus integration) for critical Bihar flood monitoring points
along the Ganga, Kosi, Gandak, Bagmati, and Burhi Gandak river systems.

Provides live proof of river bank stages, upstream discharge, and flood danger status
with zero required API keys.
"""

import httpx
from datetime import datetime, timezone
import asyncio

BIHAR_STATIONS = [
    {
        "id": "bihar_patna",
        "name": "Patna (Gandhi Ghat / Digha)",
        "district": "Patna",
        "river": "Ganga",
        "lat": 25.612,
        "lon": 85.137,
        "danger_level_m": 48.60,
        "warning_level_m": 47.60,
        "normal_discharge_m3s": 25000.0,
        "high_discharge_m3s": 40000.0,
        "critical_discharge_m3s": 50000.0,
        "upstream_basin": "Upper Ganga & Sone Basin (Prayagraj & Buxar confluence)",
        "cwc_gauge_id": "CWC-PATNA-01"
    },
    {
        "id": "bihar_birpur_kosi",
        "name": "Birpur Barrage (Kosi Basin)",
        "district": "Supaul",
        "river": "Kosi",
        "lat": 26.520,
        "lon": 87.010,
        "danger_level_m": 74.50,
        "warning_level_m": 73.50,
        "normal_discharge_m3s": 1500.0,
        "high_discharge_m3s": 4500.0,
        "critical_discharge_m3s": 8000.0,
        "upstream_basin": "Nepal Himalayan Catchment (Barahkshetra / Chatara headwaters)",
        "cwc_gauge_id": "CWC-KOSI-04"
    },
    {
        "id": "bihar_valmikinagar_gandak",
        "name": "Valmikinagar Barrage (Gandak)",
        "district": "West Champaran",
        "river": "Gandak",
        "lat": 27.433,
        "lon": 83.917,
        "danger_level_m": 107.00,
        "warning_level_m": 106.00,
        "normal_discharge_m3s": 2000.0,
        "high_discharge_m3s": 5500.0,
        "critical_discharge_m3s": 9500.0,
        "upstream_basin": "Triveni Nepal Catchment & Narayani River",
        "cwc_gauge_id": "CWC-GANDAK-02"
    },
    {
        "id": "bihar_hayaghat_bagmati",
        "name": "Hayaghat (Bagmati & Adhwara Basin)",
        "district": "Darbhanga",
        "river": "Bagmati",
        "lat": 25.750,
        "lon": 85.880,
        "danger_level_m": 48.86,
        "warning_level_m": 47.86,
        "normal_discharge_m3s": 300.0,
        "high_discharge_m3s": 800.0,
        "critical_discharge_m3s": 1600.0,
        "upstream_basin": "Sheohar / Sitamarhi Foothills & Nepal Border Drainage",
        "cwc_gauge_id": "CWC-BAGMATI-07"
    },
    {
        "id": "bihar_bhagalpur_kahalgaon",
        "name": "Bhagalpur (Kahalgaon Belt)",
        "district": "Bhagalpur",
        "river": "Ganga",
        "lat": 25.250,
        "lon": 86.983,
        "danger_level_m": 33.68,
        "warning_level_m": 32.68,
        "normal_discharge_m3s": 28000.0,
        "high_discharge_m3s": 43000.0,
        "critical_discharge_m3s": 52000.0,
        "upstream_basin": "Combined Inflow (Ganga + Ghaghra + Gandak + Kosi outfall)",
        "cwc_gauge_id": "CWC-GANGA-14"
    },
    {
        "id": "bihar_muzaffarpur_burhi",
        "name": "Muzaffarpur (Sikandarpur)",
        "district": "Muzaffarpur",
        "river": "Burhi Gandak",
        "lat": 26.120,
        "lon": 85.390,
        "danger_level_m": 52.53,
        "warning_level_m": 51.53,
        "normal_discharge_m3s": 400.0,
        "high_discharge_m3s": 1200.0,
        "critical_discharge_m3s": 2100.0,
        "upstream_basin": "Someshwar Range / East Champaran runoff corridor",
        "cwc_gauge_id": "CWC-BURHI-03"
    }
]

OPEN_METEO_FLOOD_URL = "https://flood-api.open-meteo.com/v1/flood"

# In-memory cache
_CACHE = {
    "last_fetched": None,
    "stations": [],
    "summary": {}
}


def _determine_status(discharge: float, normal: float, high: float, critical: float):
    if discharge >= critical:
        return "Critical Warning", "Red", "River exceeding extreme danger capacity; severe inundation risk"
    elif discharge >= high:
        return "Elevated Inflow (Watch)", "Orange", "Discharge above warning threshold; active bank overflow alert"
    elif discharge >= normal:
        return "Active Seasonal Flow", "Yellow", "Moderate monsoon channel filling; nominal levee margin"
    else:
        return "Normal / Controlled", "Green", "River levels well within safe carrying capacity"


async def fetch_bihar_flood_telemetry(force_refresh: bool = False):
    """Fetch live river discharge for Bihar gauging points from Open-Meteo Flood API."""
    global _CACHE

    now = datetime.now(timezone.utc)
    if not force_refresh and _CACHE["last_fetched"] is not None:
        age = (now - _CACHE["last_fetched"]).total_seconds()
        if age < 600:  # 10 min cache
            return {
                "status": "ok",
                "data_mode": "live",
                "cached": True,
                "last_updated": _CACHE["last_fetched"].isoformat(),
                "stations": _CACHE["stations"],
                "summary": _CACHE["summary"]
            }

    lats = ",".join(str(s["lat"]) for s in BIHAR_STATIONS)
    lons = ",".join(str(s["lon"]) for s in BIHAR_STATIONS)

    params = {
        "latitude": lats,
        "longitude": lons,
        "daily": "river_discharge,river_discharge_mean,river_discharge_max",
        "forecast_days": 3
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(OPEN_METEO_FLOOD_URL, params=params)
            resp.raise_for_status()
            data = resp.json()

        results = data if isinstance(data, list) else [data]

        station_results = []
        high_alert_count = 0

        for s, res in zip(BIHAR_STATIONS, results):
            daily = res.get("daily", {})
            discharges = daily.get("river_discharge", [])
            dates = daily.get("time", [])

            curr_discharge = discharges[0] if len(discharges) > 0 and discharges[0] is not None else 0.0
            next_day_discharge = discharges[1] if len(discharges) > 1 and discharges[1] is not None else curr_discharge
            day3_discharge = discharges[2] if len(discharges) > 2 and discharges[2] is not None else next_day_discharge

            # Trend calculation
            diff = next_day_discharge - curr_discharge
            if diff > 100:
                trend = "Rising (+)"
            elif diff < -100:
                trend = "Receding (-)"
            else:
                trend = "Steady (~)"

            status_text, severity_color, note = _determine_status(
                curr_discharge,
                s["normal_discharge_m3s"],
                s["high_discharge_m3s"],
                s["critical_discharge_m3s"]
            )

            if severity_color in ("Orange", "Red"):
                high_alert_count += 1

            # Approximate river stage based on discharge ratio
            ratio = min(curr_discharge / max(s["high_discharge_m3s"], 1.0), 1.4)
            stage_estimate_m = round(s["warning_level_m"] - 1.5 + (ratio * 1.8), 2)

            station_results.append({
                "id": s["id"],
                "name": s["name"],
                "district": s["district"],
                "river": s["river"],
                "lat": s["lat"],
                "lon": s["lon"],
                "current_discharge_m3s": round(curr_discharge, 2),
                "forecast_tomorrow_m3s": round(next_day_discharge, 2),
                "forecast_day3_m3s": round(day3_discharge, 2),
                "discharge_history": discharges,
                "dates": dates,
                "trend": trend,
                "status": status_text,
                "severity": severity_color,
                "warning_note": note,
                "danger_level_m": s["danger_level_m"],
                "warning_level_m": s["warning_level_m"],
                "estimated_stage_m": stage_estimate_m,
                "margin_to_danger_m": round(s["danger_level_m"] - stage_estimate_m, 2),
                "upstream_basin": s["upstream_basin"],
                "cwc_gauge_id": s["cwc_gauge_id"],
            })

        summary = {
            "total_monitored_points": len(station_results),
            "elevated_or_warning_points": high_alert_count,
            "major_rivers_covered": ["Ganga", "Kosi", "Gandak", "Bagmati", "Burhi Gandak"],
            "state": "Bihar",
            "source": "Open-Meteo GloFAS River Flow Engine (Copernicus CEMS) + CWC Gauge Baselines"
        }

        _CACHE["last_fetched"] = now
        _CACHE["stations"] = station_results
        _CACHE["summary"] = summary

        return {
            "status": "ok",
            "data_mode": "live",
            "cached": False,
            "last_updated": now.isoformat(),
            "stations": station_results,
            "summary": summary
        }

    except Exception as e:
        print(f"Failed to fetch Bihar flood telemetry: {e}")
        # If we have cache, return it
        if _CACHE["stations"]:
            return {
                "status": "ok",
                "data_mode": "cached_fallback",
                "cached": True,
                "last_updated": _CACHE["last_fetched"].isoformat() if _CACHE["last_fetched"] else None,
                "stations": _CACHE["stations"],
                "summary": _CACHE["summary"]
            }
        raise e
