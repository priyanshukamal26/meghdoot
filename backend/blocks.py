# Upstream catchment sampling points. Chosen by walking each river upstream into the
# Shivalik / Himachal headwaters, spaced roughly 20-40 km apart.
UPSTREAM = {
    # --- Sutlej system ---
    "bhakra":    (31.4104, 76.4336),
    "bilaspur":  (31.3350, 76.7600),
    "sunni":     (31.2450, 77.1100),
    "rampur":    (31.4500, 77.6300),
    "karcham":   (31.5000, 78.1800),
    # --- Beas system ---
    "pong":      (31.9500, 76.0700),
    "mandi":     (31.7080, 76.9320),
    "pandoh":    (31.6700, 77.0600),
    "kullu":     (31.9580, 77.1090),
    # --- Ravi system ---
    "thein":     (32.4200, 75.7400),
    "basohli":   (32.5000, 75.8200),
    "chamba":    (32.5550, 76.1260),
    "bharmour":  (32.4400, 76.5300),
    # --- Ghaggar / Shivalik system ---
    "morni":     (30.6800, 77.1000),
    "kalka":     (30.8400, 76.9400),
    "nahan":     (30.5600, 77.3000),
    "panchkula": (30.6942, 76.8606),
    # --- Yamuna / Markanda system ---
    "paonta":    (30.4400, 77.6200),
    "dakpathar": (30.5000, 77.8500),
    "renuka":    (30.6100, 77.4500),
}

BLOCKS = [
    {"id": 1, "name": "Rupnagar",    "district": "Rupnagar",    "state": "Punjab",
     "lat": 30.9686, "lon": 76.5262, "river": "Sutlej",
     "upstream": ["bhakra", "bilaspur", "sunni", "rampur"],
     "dam_regulated": True, "dam": "Bhakra"},

    {"id": 2, "name": "Ludhiana",    "district": "Ludhiana",    "state": "Punjab",
     "lat": 30.9010, "lon": 75.8573, "river": "Sutlej",
     "upstream": ["bilaspur", "sunni", "rampur", "karcham"],
     "dam_regulated": True, "dam": "Bhakra"},

    {"id": 3, "name": "Ferozepur",   "district": "Ferozepur",   "state": "Punjab",
     "lat": 30.9331, "lon": 74.6225, "river": "Sutlej",
     "upstream": ["bilaspur", "rampur", "mandi", "pandoh"],
     "dam_regulated": True, "dam": "Bhakra/Pong"},

    {"id": 4, "name": "Fazilka",     "district": "Fazilka",     "state": "Punjab",
     "lat": 30.4028, "lon": 74.0286, "river": "Sutlej",
     "upstream": ["bilaspur", "rampur", "mandi", "pong"],
     "dam_regulated": True, "dam": "Bhakra/Pong"},

    {"id": 5, "name": "Hoshiarpur",  "district": "Hoshiarpur",  "state": "Punjab",
     "lat": 31.5320, "lon": 75.9119, "river": "Beas",
     "upstream": ["pong", "mandi", "pandoh", "kullu"],
     "dam_regulated": True, "dam": "Pong"},

    {"id": 6, "name": "Pathankot",   "district": "Pathankot",   "state": "Punjab",
     "lat": 32.2746, "lon": 75.6522, "river": "Ravi",
     "upstream": ["thein", "basohli", "chamba", "bharmour"],
     "dam_regulated": True, "dam": "Ranjit Sagar"},

    {"id": 7, "name": "Gurdaspur",   "district": "Gurdaspur",   "state": "Punjab",
     "lat": 32.0419, "lon": 75.4053, "river": "Ravi",
     "upstream": ["thein", "basohli", "chamba", "bharmour"],
     "dam_regulated": True, "dam": "Ranjit Sagar"},

    {"id": 8, "name": "Amritsar",    "district": "Amritsar",    "state": "Punjab",
     "lat": 31.6340, "lon": 74.8723, "river": "Ravi",
     "upstream": ["thein", "chamba", "bharmour", "pong"],
     "dam_regulated": True, "dam": "Ranjit Sagar"},

    {"id": 9, "name": "Patiala",     "district": "Patiala",     "state": "Punjab",
     "lat": 30.3398, "lon": 76.3869, "river": "Ghaggar",
     "upstream": ["morni", "kalka", "nahan", "panchkula"],
     "dam_regulated": False, "dam": None},

    {"id": 10, "name": "Sangrur",     "district": "Sangrur",     "state": "Punjab",
     "lat": 30.2458, "lon": 75.8421, "river": "Ghaggar",
     "upstream": ["morni", "kalka", "nahan", "panchkula"],
     "dam_regulated": False, "dam": None},

    {"id": 11, "name": "Ambala",      "district": "Ambala",      "state": "Haryana",
     "lat": 30.3752, "lon": 76.7821, "river": "Tangri/Markanda",
     "upstream": ["morni", "kalka", "nahan", "panchkula"],
     "dam_regulated": False, "dam": None},

    {"id": 12, "name": "Yamunanagar", "district": "Yamunanagar", "state": "Haryana",
     "lat": 30.1290, "lon": 77.2674, "river": "Yamuna",
     "upstream": ["paonta", "dakpathar", "nahan", "renuka"],
     "dam_regulated": False, "dam": "Hathnikund barrage"},
]

# DEMO EXPOSURE REGISTER — illustrative facility clusters, not an audited count.
# Labelled in the UI as "demo exposure register — DDMA / LGD facility registry integration pending".
# Describe by cluster and type. Do NOT name a specific real institution.
EXPOSURE = {
    1: [{"name": "Low-lying settlement cluster, Sutlej Bela belt", "type": "settlement", "pop": 620},
        {"name": "Government school complex (2)", "type": "school", "pop": 410},
        {"name": "Sub-divisional hospital", "type": "health", "pop": 120},
        {"name": "Bus stand / transit hub", "type": "transit", "pop": 90}],

    2: [{"name": "Riverside settlement cluster, Sutlej floodplain", "type": "settlement", "pop": 850},
        {"name": "Industrial area low-lying zone", "type": "commercial", "pop": 420},
        {"name": "Primary health centre", "type": "health", "pop": 80},
        {"name": "Railway halt / crossing", "type": "transit", "pop": 150}],

    3: [{"name": "Flood-prone settlement belt, confluence zone", "type": "settlement", "pop": 1100},
        {"name": "Government school complex (3)", "type": "school", "pop": 560},
        {"name": "Community health centre", "type": "health", "pop": 140},
        {"name": "Agricultural mandi cluster", "type": "commercial", "pop": 200}],

    4: [{"name": "Low-lying border settlement cluster", "type": "settlement", "pop": 780},
        {"name": "Primary school (2)", "type": "school", "pop": 320},
        {"name": "Sub-centre / dispensary", "type": "health", "pop": 60}],

    5: [{"name": "Beas floodplain settlement cluster", "type": "settlement", "pop": 540},
        {"name": "Government high school", "type": "school", "pop": 280},
        {"name": "Primary health centre", "type": "health", "pop": 90},
        {"name": "Weekly market ground", "type": "commercial", "pop": 130}],

    6: [{"name": "Ravi riverside settlement cluster", "type": "settlement", "pop": 700},
        {"name": "Government school complex (2)", "type": "school", "pop": 350},
        {"name": "Sub-divisional hospital", "type": "health", "pop": 110},
        {"name": "Bus terminal", "type": "transit", "pop": 140}],

    7: [{"name": "Ravi floodplain settlement belt", "type": "settlement", "pop": 1250},
        {"name": "Government school complex (4)", "type": "school", "pop": 620},
        {"name": "Community health centre", "type": "health", "pop": 160},
        {"name": "Livestock market cluster", "type": "commercial", "pop": 180},
        {"name": "Bridge approach settlement", "type": "transit", "pop": 90}],

    8: [{"name": "Low-lying peri-urban settlement cluster", "type": "settlement", "pop": 580},
        {"name": "Government school (2)", "type": "school", "pop": 310},
        {"name": "Primary health centre", "type": "health", "pop": 75}],

    9: [{"name": "Ghaggar floodplain settlement cluster", "type": "settlement", "pop": 480},
        {"name": "Government middle school", "type": "school", "pop": 220},
        {"name": "Sub-centre / dispensary", "type": "health", "pop": 50}],

    10: [{"name": "Ghaggar belt low-lying settlement cluster", "type": "settlement", "pop": 520},
         {"name": "Government school (2)", "type": "school", "pop": 260},
         {"name": "Primary health centre", "type": "health", "pop": 70},
         {"name": "Railway crossing settlement", "type": "transit", "pop": 100}],

    11: [{"name": "Tangri drainage depression settlement", "type": "settlement", "pop": 380},
         {"name": "Government school", "type": "school", "pop": 190},
         {"name": "Sub-centre / dispensary", "type": "health", "pop": 45}],

    12: [{"name": "Yamuna bank settlement cluster", "type": "settlement", "pop": 660},
         {"name": "Government school complex (2)", "type": "school", "pop": 340},
         {"name": "Community health centre", "type": "health", "pop": 100},
         {"name": "Hathnikund barrage downstream zone", "type": "settlement", "pop": 250}],
}
