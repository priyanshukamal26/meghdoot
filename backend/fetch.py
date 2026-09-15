import httpx
from .blocks import BLOCKS

# https://api.open-meteo.com/v1/forecast
#     ?latitude={lat1},{lat2},...,{lat10}
#     &longitude={lon1},{lon2},...,{lon10}
#     &hourly=cape,convective_inhibition,relative_humidity_2m,cloud_cover,precipitation,surface_pressure,wind_gusts_10m
#     &past_hours=6
#     &forecast_hours=3
#     &timezone=Asia/Kolkata

async def fetch_all_blocks():
    latitudes = ",".join(str(b["lat"]) for b in BLOCKS)
    longitudes = ",".join(str(b["lon"]) for b in BLOCKS)
    
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": latitudes,
        "longitude": longitudes,
        "hourly": "cape,convective_inhibition,relative_humidity_2m,cloud_cover,precipitation,surface_pressure,wind_gusts_10m",
        "past_hours": "6",
        "forecast_hours": "3",
        "timezone": "Asia/Kolkata"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        return response.json()
