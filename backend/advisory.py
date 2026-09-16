"""
advisory.py — Deterministic Action Advisory Engine for Meghdoot.

Maps risk severity + hazard type + conditions into plain-language action levels
with specific, jargon-free bullets and facility-level instructions.

Zero LLM dependency. Fully deterministic and reliable.

Action Levels:
  ALL_CLEAR     — No precautions needed. Normal activity.
  STAY_ALERT    — Carry umbrella, check updates before outdoor plans.
  AVOID_OUTDOORS — Stay indoors. Avoid low-lying areas and flooded roads.
  EVACUATE_NOW  — Move to higher ground immediately. Life-threatening.
"""

from datetime import datetime


# ─── Action Level Definitions ────────────────────────────────────────────────

ACTION_LEVELS = {
    "ALL_CLEAR": {
        "icon": "✅",
        "color": "green",
        "headline": "No action required",
    },
    "STAY_ALERT": {
        "icon": "⚠️",
        "color": "yellow",
        "headline": "Stay alert — monitor updates",
    },
    "AVOID_OUTDOORS": {
        "icon": "🚫",
        "color": "orange",
        "headline": "Avoid going outdoors",
    },
    "EVACUATE_NOW": {
        "icon": "🚨",
        "color": "red",
        "headline": "Evacuate low-lying areas immediately",
    },
}


# ─── Facility Action Templates ──────────────────────────────────────────────

FACILITY_ACTIONS_BY_LEVEL = {
    "AVOID_OUTDOORS": {
        "settlement": "Alert residents via PA system. Identify nearest shelter.",
        "school": "Keep children indoors. Prepare to move to upper floors.",
        "health": "Secure medicine stocks. Prepare for patient surge.",
        "transit": "Divert traffic from low-lying routes. Close underpasses.",
        "commercial": "Suspend outdoor activity. Secure goods from flooding.",
    },
    "EVACUATE_NOW": {
        "settlement": "Evacuate all residents to designated relief camps NOW.",
        "school": "Suspend classes. Evacuate children to higher ground immediately.",
        "health": "Relocate patients to safe facility. Secure critical equipment.",
        "transit": "Close all bridges and low-lying crossings. Stop all transit.",
        "commercial": "Shut down operations. Evacuate all personnel immediately.",
    },
}


def _format_arrival_short(arrival_from: str) -> str:
    """Format arrival ISO string into a short human-readable time."""
    try:
        t = datetime.fromisoformat(arrival_from)
        return t.strftime("%I:%M %p").lstrip("0").lower()
    except Exception:
        return "soon"


def _hours_until(arrival_from: str) -> str:
    """Calculate a rough 'in Xh Ym' string from now to arrival."""
    try:
        t = datetime.fromisoformat(arrival_from)
        now = datetime.now(t.tzinfo)
        diff = (t - now).total_seconds()
        if diff <= 0:
            return "imminently"
        h = int(diff // 3600)
        m = int((diff % 3600) // 60)
        if h > 0:
            return f"in ~{h}h {m}m"
        return f"in ~{m} minutes"
    except Exception:
        return "soon"


def _determine_action_level(severity: str, hazard: str, dry_sky: bool,
                            flash_flood_score: float) -> str:
    """Map severity + context to an action level string."""
    sev = severity.lower()

    # Red / Warning → always EVACUATE
    if sev in ("red", "warning"):
        return "EVACUATE_NOW"

    # Orange / Alert → AVOID_OUTDOORS
    if sev in ("orange", "alert"):
        return "AVOID_OUTDOORS"

    # Yellow / Watch → STAY_ALERT
    if sev in ("yellow", "watch"):
        return "STAY_ALERT"

    # Green / Safe — but check for non-trivial flash flood from upstream
    if flash_flood_score >= 0.20 or dry_sky:
        return "STAY_ALERT"

    return "ALL_CLEAR"


def _build_bullets(action_level: str, hazard: str, risk: dict) -> list:
    """Build 2–4 specific, jargon-free action bullets."""
    bullets = []
    dry_sky = risk.get("dry_sky", False)
    dam = risk.get("dam")
    dam_regulated = risk.get("dam_regulated", False)
    arrival_from = risk.get("arrival_from", "")
    upstream_rain = risk.get("upstream_rain_3h", 0)
    local_rain = risk.get("local_rain_3h", 0)
    exposure_total = risk.get("exposure_total", 0)
    arrival_str = _format_arrival_short(arrival_from)
    eta_str = _hours_until(arrival_from)

    hazard_lower = hazard.lower()

    if action_level == "ALL_CLEAR":
        if "thunderstorm" in hazard_lower:
            bullets.append("Normal outdoor activity is safe.")
            bullets.append("Atmospheric instability is elevated but no rainfall is expected in the next few hours.")
        elif "cloudburst" in hazard_lower:
            bullets.append("Normal outdoor activity is safe.")
            bullets.append("Cloud conditions are being monitored but no heavy rain is expected.")
        else:
            bullets.append("Normal outdoor activity is safe.")
            bullets.append("No significant rainfall or upstream inflow detected.")
        if dam_regulated and dam:
            bullets.append(f"{dam} dam regulates upstream flow — additional buffer in place.")

    elif action_level == "STAY_ALERT":
        if dry_sky and upstream_rain > 0:
            bullets.append(f"Skies are clear overhead, but {upstream_rain:.0f} mm of rain has fallen upstream.")
            bullets.append(f"Upstream runoff may reach this area by ~{arrival_str} ({eta_str}).")
            bullets.append("Carry an umbrella and avoid low-lying roads near the river.")
        elif "thunderstorm" in hazard_lower:
            bullets.append("Thunderstorm conditions are building. Carry an umbrella if going out.")
            bullets.append("Avoid open fields and stay away from tall isolated trees.")
            if risk.get("gusts", 0) > 40:
                bullets.append("Strong wind gusts possible — secure loose outdoor objects.")
        elif "cloudburst" in hazard_lower:
            bullets.append("Heavy rainfall is possible in the next few hours.")
            bullets.append("Carry rain protection. Avoid basement-level areas and underpasses.")
        else:
            bullets.append("Monitor weather updates. Carry rain protection if going outdoors.")
            if upstream_rain > 0:
                bullets.append(f"Upstream rainfall ({upstream_rain:.0f} mm) may cause water levels to rise {eta_str}.")
        if dam_regulated and dam:
            bullets.append(f"Note: {dam} dam intercepts upstream runoff — some attenuation expected.")

    elif action_level == "AVOID_OUTDOORS":
        if dry_sky:
            bullets.append("DO NOT be misled by clear skies overhead — upstream flooding is approaching.")
            bullets.append(f"Heavy upstream rainfall ({upstream_rain:.0f} mm) is generating runoff arriving ~{arrival_str}.")
        elif "flash flood" in hazard_lower:
            bullets.append("Flash flood risk is elevated. Stay indoors and away from riverbanks.")
            bullets.append(f"Runoff expected to arrive by ~{arrival_str} ({eta_str}).")
        elif "thunderstorm" in hazard_lower:
            bullets.append("Severe thunderstorm conditions. Stay indoors.")
            bullets.append("Avoid open areas, metal structures, and water bodies.")
        elif "cloudburst" in hazard_lower:
            bullets.append("Intense rainfall expected. Stay indoors if possible.")
            bullets.append("Avoid low-lying roads and underpasses — they can flood within minutes.")
        else:
            bullets.append("Stay indoors. Avoid low-lying areas and riverbanks.")

        bullets.append("Do NOT cross any flooded road, bridge, or culvert.")
        if exposure_total > 0:
            bullets.append(f"~{exposure_total:,} people across nearby facilities are in the impact zone.")

    elif action_level == "EVACUATE_NOW":
        bullets.append("Move to higher ground IMMEDIATELY. Do not wait for visible flooding.")
        if dry_sky:
            bullets.append(f"Skies may be clear but massive upstream inflow ({upstream_rain:.0f} mm) is arriving {eta_str}.")
        elif "flash flood" in hazard_lower:
            bullets.append("Severe flash flood conditions. Water levels can rise metres within minutes.")
        elif "thunderstorm" in hazard_lower:
            bullets.append("Extreme thunderstorm with life-threatening conditions.")
        elif "cloudburst" in hazard_lower:
            bullets.append("Cloudburst-intensity rainfall — catastrophic flooding possible.")

        bullets.append("Follow DDMA / district authority evacuation instructions.")
        bullets.append("Do NOT attempt to drive through floodwater. Abandon vehicles if trapped.")
        if exposure_total > 0:
            bullets.append(f"~{exposure_total:,} people must be moved to safety NOW.")

    return bullets


def _build_facility_actions(action_level: str, exposure: list) -> list:
    """Annotate each exposure facility with a specific action instruction.
    Only generated at Orange (AVOID_OUTDOORS) and Red (EVACUATE_NOW)."""
    if action_level not in FACILITY_ACTIONS_BY_LEVEL:
        return []

    templates = FACILITY_ACTIONS_BY_LEVEL[action_level]
    result = []
    for facility in exposure:
        ftype = facility.get("type", "settlement")
        action_text = templates.get(ftype, templates.get("settlement", "Follow local authority instructions."))
        result.append({
            "name": facility["name"],
            "type": ftype,
            "pop": facility.get("pop", 0),
            "action": action_text,
        })
    return result


def compute_advisory(block: dict, risk: dict) -> dict:
    """Compute the full advisory payload for a block.

    Args:
        block: block dict from BLOCKS
        risk: combined risk dict (heuristic + hydro + exposure, already merged in cache.py)

    Returns:
        dict with action_level, icon, color, headline, bullets, facility_actions
    """
    severity = risk.get("top_hazard_severity", "Green")
    hazard = risk.get("top_hazard", "")
    dry_sky = risk.get("dry_sky", False)
    flash_flood_score = risk.get("flash_flood_score", 0)

    action_level = _determine_action_level(severity, hazard, dry_sky, flash_flood_score)
    level_meta = ACTION_LEVELS[action_level]

    bullets = _build_bullets(action_level, hazard, risk)
    facility_actions = _build_facility_actions(action_level, risk.get("exposure", []))

    return {
        "action_level": action_level,
        "action_icon": level_meta["icon"],
        "action_color": level_meta["color"],
        "headline": level_meta["headline"],
        "bullets": bullets,
        "facility_actions": facility_actions,
    }
