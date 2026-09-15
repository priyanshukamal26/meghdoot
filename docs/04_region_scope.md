# Region Scope

**Displayed map**: Punjab + Haryana + Delhi NCT, one bounding box (73.8, 27.5, 77.5, 32.6).
**Dense training/demo focus** (~25–35 blocks): the Shivalik-foothill/Ghaggar-Yamuna floodplain
belt — the belt that has actually flooded, not an arbitrary pick.

## District list (resolve IMD `Obj_id` for each — blocked until IMD API access confirmed)

Punjab: Rupnagar, SAS Nagar (Mohali), Hoshiarpur, Pathankot, Patiala, Sangrur, Gurdaspur,
Fatehgarh Sahib. Haryana: Ambala, Panchkula, Yamunanagar, Kurukshetra, Fatehabad, Sirsa.
Delhi: NCT, all districts bordering the Yamuna.

Action once IMD access works: call `districtwarning` with no `id` param (returns all districts),
filter for the names above, save resolved IDs to a static config file — one-time lookup.

## Block boundaries
Source: bharatlas.com LGD 2024, filtered to the districts above. If too many polygons for
performance, narrow further to blocks actually intersecting the Ghaggar/Yamuna floodplains and
Shivalik foothills specifically.

## Historical demo events

**Primary — 20 August 2025 Punjab floods**: cloudbursts explicitly cited as cause, 13+ districts,
worst in ~4 decades. Recent, home-state, directly matches PS's cloudburst framing.

**Secondary — 8–15 July 2023 North India floods**: genuinely tri-state (Patiala, Sangrur,
Ludhiana, Mohali, Jalandhar, Rupnagar, Hoshiarpur, Fatehgarh Sahib, Fazilka in Punjab; Ambala,
Panchkula, Yamunanagar, Kurukshetra, Fatehabad, Sirsa in Haryana; Yamuna peaked ~208.66m in Delhi).
Use if a judge asks "does this generalize beyond one event."

Both events fall inside Open-Meteo Historical Forecast API's 2021+ coverage and IMERG V07's
1998–2025-09-30 coverage — no access issues for either.
