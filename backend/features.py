def extract_features(hourly_data):
    """
    Extracts features for a single location from the Open-Meteo hourly arrays.
    With past_hours=6 and forecast_hours=3, the arrays have 10 elements.
    Index 6 is 'now'.
    """
    # Helper to safely get value or 0
    def get_val(key, idx):
        try:
            return hourly_data.get(key, [])[idx] or 0.0
        except IndexError:
            return 0.0

    now_idx = 6
    
    cape = get_val("cape", now_idx)
    cin = get_val("convective_inhibition", now_idx)
    humidity_proxy = get_val("relative_humidity_2m", now_idx)
    
    cloud_now = get_val("cloud_cover", now_idx)
    cloud_2h_ago = get_val("cloud_cover", now_idx - 2)
    cloud_trend = cloud_now - cloud_2h_ago
    
    # Rainfall over last 3 hours (including now)
    rainfall_recent = sum(get_val("precipitation", i) for i in range(now_idx - 2, now_idx + 1))
    
    # Rainfall forecast next 3 hours
    rainfall_forecast_3h = sum(get_val("precipitation", i) for i in range(now_idx + 1, now_idx + 4))
    
    pressure_now = get_val("surface_pressure", now_idx)
    pressure_3h_ago = get_val("surface_pressure", now_idx - 3)
    pressure_trend_3h = pressure_3h_ago - pressure_now  # positive means pressure is falling
    
    gusts = get_val("wind_gusts_10m", now_idx)
    
    return {
        "cape": cape,
        "cin": cin,
        "humidity_proxy": humidity_proxy,
        "cloud_trend": cloud_trend,
        "rainfall_recent": rainfall_recent,
        "rainfall_forecast_3h": rainfall_forecast_3h,
        "pressure_trend_3h": pressure_trend_3h,
        "gusts": gusts
    }
