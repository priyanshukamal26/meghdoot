def clip(val, min_val, max_val):
    return max(min_val, min(val, max_val))

def norm(val, min_range, max_range):
    if max_range == min_range:
        return 0.0
    normalized = (val - min_range) / (max_range - min_range)
    return clip(normalized, 0, 1)

def compute_risk(block, features):
    # Normalize features to 0-1
    cape_norm = norm(features["cape"], 0, 4000)
    cin_norm = norm(-features["cin"], 0, 200) # less negative CIN -> higher score
    gusts_norm = norm(features["gusts"], 0, 100) # km/h
    pressure_trend_norm = norm(features["pressure_trend_3h"], 0, 5) # hPa fall in 3h
    humidity_norm = norm(features["humidity_proxy"], 30, 100)
    cloud_trend_norm = norm(features["cloud_trend"], 0, 100)
    rain_recent_norm = norm(features["rainfall_recent"], 0, 50) # mm in 3h
    rain_forecast_norm = norm(features["rainfall_forecast_3h"], 0, 50) # mm in next 3h
    
    # Calculate raw scores
    p_thunderstorm_raw = (
        0.40 * cape_norm +
        0.25 * cin_norm +
        0.20 * gusts_norm +
        0.15 * pressure_trend_norm
    )
    
    p_cloudburst_raw = (
        0.35 * humidity_norm +
        0.25 * cloud_trend_norm +
        0.25 * rain_recent_norm +
        0.15 * pressure_trend_norm
    )
    
    rain_intensity_proxy = norm(features["rainfall_recent"] + features["rainfall_forecast_3h"], 0, 100)
    flash_flood_risk = clip(rain_intensity_proxy * block.get("terrain_multiplier", 1.0), 0, 1)
    
    def get_severity(score):
        if score < 0.25: return "Safe"
        if score < 0.50: return "Watch"
        if score < 0.75: return "Alert"
        return "Warning"

    # Identify top hazard
    hazards = [
        ("Thunderstorm", p_thunderstorm_raw),
        ("Cloudburst", p_cloudburst_raw),
        ("Flash Flood", flash_flood_risk)
    ]
    top_hazard, top_score = max(hazards, key=lambda x: x[1])

    # Identify top features (simple heuristic mapping based on which hazard is top)
    # Just sort all normalized features and take the top ones that make sense
    top_feature = "humidity"
    second_feature = "cape"
    if top_hazard == "Thunderstorm":
        feats = {"CAPE": cape_norm, "CIN (inverted)": cin_norm, "Gusts": gusts_norm, "Pressure Drop": pressure_trend_norm}
        sorted_feats = sorted(feats.items(), key=lambda x: x[1], reverse=True)
        top_feature, second_feature = sorted_feats[0][0], sorted_feats[1][0]
    elif top_hazard == "Cloudburst":
        feats = {"Humidity": humidity_norm, "Cloud Growth": cloud_trend_norm, "Recent Rain": rain_recent_norm, "Pressure Drop": pressure_trend_norm}
        sorted_feats = sorted(feats.items(), key=lambda x: x[1], reverse=True)
        top_feature, second_feature = sorted_feats[0][0], sorted_feats[1][0]
    else:
        feats = {"Rain Intensity": rain_intensity_proxy, "Terrain Factor": block.get("terrain_multiplier", 1.0) / 2.0} # scaled down for sorting
        sorted_feats = sorted(feats.items(), key=lambda x: x[1], reverse=True)
        top_feature, second_feature = sorted_feats[0][0], sorted_feats[1][0]

    return {
        "thunderstorm_score": p_thunderstorm_raw,
        "thunderstorm_severity": get_severity(p_thunderstorm_raw),
        "cloudburst_score": p_cloudburst_raw,
        "cloudburst_severity": get_severity(p_cloudburst_raw),
        "flash_flood_score": flash_flood_risk,
        "flash_flood_severity": get_severity(flash_flood_risk),
        "is_baseline_heuristic": True,
        
        # Meta info for narrative
        "top_hazard": top_hazard,
        "top_hazard_score": top_score,
        "top_hazard_severity": get_severity(top_score),
        "top_feature": top_feature,
        "top_feature_value": features.get(top_feature.lower().replace(" ", "_"), "High"),
        "second_feature": second_feature,
        "second_feature_value": features.get(second_feature.lower().replace(" ", "_"), "Elevated"),
    }
