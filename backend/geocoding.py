import httpx

async def search_location(query: str):
    """
    Proxy to Open-Meteo Geocoding API.
    """
    url = "https://geocoding-api.open-meteo.com/v1/search"
    params = {
        "name": query,
        "count": 8,
        "language": "en"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
    results = data.get("results", [])
    
    # Prioritize India results
    india_results = [r for r in results if r.get("country_code") == "IN"]
    other_results = [r for r in results if r.get("country_code") != "IN"]
    
    sorted_results = india_results + other_results
    
    # Format response
    formatted = []
    for r in sorted_results:
        formatted.append({
            "name": r.get("name"),
            "admin1": r.get("admin1", ""),
            "country": r.get("country", ""),
            "latitude": r.get("latitude"),
            "longitude": r.get("longitude"),
            "postal_code": r.get("postcode", "") # Note Open-Meteo often uses 'postcode' or none
        })
        
    return formatted
