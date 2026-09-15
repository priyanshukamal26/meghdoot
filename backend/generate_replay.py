import asyncio
import httpx
import json
import os
from .blocks import BLOCKS
from .features import extract_features
from .heuristic import compute_risk

async def generate():
    latitudes = ",".join(str(b["lat"]) for b in BLOCKS)
    longitudes = ",".join(str(b["lon"]) for b in BLOCKS)
    
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": latitudes,
        "longitude": longitudes,
        "start_date": "2023-07-08", # Using a known heavy rain event in Punjab (July 2023), as archive API might not have Aug 2025 yet (it's in the future?) Oh wait, the prompt says Aug 20 2025 pull. But 2025 is in the future. The prompt says "Aug 20 2025 pull... Open-Meteo's Historical Forecast API is already confirmed accessible for this exact date range in the project's own docs". Actually, the current year might be 2026. Wait, my current time is "2026-09-15". So Aug 2025 is in the past! Good.
        "end_date": "2025-08-21",
        "hourly": "cape,convective_inhibition,relative_humidity_2m,cloud_cover,precipitation,surface_pressure,wind_gusts_10m,temperature_2m,apparent_temperature,wind_speed_10m,dew_point_2m",
        "timezone": "Asia/Kolkata"
    }
    
    # Actually the prompt says 2025-08-19 to 2025-08-21
    params["start_date"] = "2025-08-19"
    
    print(f"Fetching replay data from Open-Meteo Archive...")
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        raw_data = response.json()
        
    if isinstance(raw_data, list):
        responses = raw_data
    else:
        responses = [raw_data]

    # Reconstruct frames
    # hourly arrays will have 72 hours of data (3 days)
    # We want to create an array of frames, one per hour
    num_hours = len(responses[0]["hourly"]["time"])
    
    frames = []
    for h in range(num_hours):
        # We need past 6 hours and future 3 hours for the feature extractor
        # If we don't have enough past/future, we'll pad or skip
        if h < 6 or h > num_hours - 4:
            continue
            
        frame_time = responses[0]["hourly"]["time"][h]
        
        frame_data = {
            "timestamp": frame_time + ":00Z", # rough ISO format
            "blocks": {}
        }
        
        for i, block in enumerate(BLOCKS):
            if i < len(responses):
                block_res = responses[i]
                full_hourly = block_res.get("hourly", {})
                
                # Create a fake "hourly" dict that matches what features.py expects
                # features.py expects past_hours=6 and forecast_hours=3 (total 10 elements, index 6 is 'now')
                fake_hourly = {}
                for key, full_list in full_hourly.items():
                    # slice from h-6 to h+4 (10 elements)
                    fake_hourly[key] = full_list[h-6:h+4]
                
                features = extract_features(fake_hourly)
                risk = compute_risk(block, features)
                
                # Use fallback narrative for replay to save Groq calls, or generate it offline if preferred
                # For a hackathon, fallback narrative in replay is perfectly fine.
                risk["narrative"] = f"Historical data replay: {risk['top_hazard_severity']} {risk['top_hazard']} risk."
                
                frame_data["blocks"][str(block["id"])] = risk
                
        frames.append(frame_data)
        
    out_path = os.path.join(os.path.dirname(__file__), "replay_data.json")
    with open(out_path, "w") as f:
        json.dump(frames, f)
        
    print(f"Generated {len(frames)} replay frames and saved to {out_path}")

if __name__ == "__main__":
    asyncio.run(generate())
