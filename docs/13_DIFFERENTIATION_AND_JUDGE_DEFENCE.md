# 13 — Differentiation & Judge Defence

> **Status: NEW FILE, Session 7. This is now the highest-priority doc after
> `10_status_and_plan.md`. Every build decision from here on must be justifiable against
> the thesis on this page.**
>
> Created in response to the screening review verdict: *"You are using the OpenMeteo API that
> everyone uses. IMD sends rainfall warning alerts beforehand. I get whatever warnings I need
> from Google Maps. No newness."*

---

## 1. WHAT THE REVIEWER ACTUALLY CLAIMED

Strip the delivery and there is exactly one claim:

> **"Your output is the same output a weather app already gives me."**

He is right **about the artefact he was shown**. A landing page plus "we colour blocks by rain
risk" is, from the outside, indistinguishable from the Google Maps weather layer. He never saw a
transformation — only a re-skin of a forecast.

He did **not** claim the problem is solved. He claimed *his own information need* is met. A person
with a phone checking whether to carry an umbrella is not the user in the PS. The PS user is a
District Disaster Management Authority officer deciding at 14:00 whether to move 400 people out
of a low-lying colony before 17:00.

**Do not argue that Meghdoot forecasts the atmosphere better than Open-Meteo, IMD or Google.**
That argument is unwinnable — they all ultimately run NWP, and his phone is free.

**Argue that forecasting the atmosphere and forecasting the impact are different problems, and no
weather app does the second one.**

This is not a rhetorical dodge invented to survive a review. It is literally the PS. See
`01_problem_and_scope.md`: the PS explicitly requires **DEM-based flash-flood translation** and a
**deployed alert API for disaster responders**. MoES/NCMRWF wrote that PS *because* the existing
district-level bulletin has a last-mile gap. The reviewer is, politely, arguing with the sponsor.
Say that gracefully, never combatively.

---

## 2. THE ONE IDEA THAT KILLS "NO NEWNESS" IN A SINGLE SCREENSHOT

### Dry-Sky Flood Risk

A flash flood in Rupnagar is not caused by rain **in** Rupnagar. It is caused by rain 60–100 km
**upstream** in the Shivaliks and Himachal, hours earlier. When that water arrives, the sky over
Rupnagar can be completely clear.

Open Google Maps in Rupnagar at that moment and it says *clear, no rain*. It is not wrong. It is
answering a different question. A point-forecast product has no concept of catchment, upstream, or
travel time. It structurally **cannot** show this.

Meghdoot shows:

```
RUPNAGAR                                                    ORANGE
Local rainfall (last 3h) ......................... 0.0 mm
Upstream Sutlej catchment (4 sample points) ...... 62 mm / 3h
Estimated runoff arrival ......................... 16:10 – 17:10  (in 3h 22m)
Exposed .......................................... ~1,240 people, 4 facilities
```

Put the reviewer's phone next to the screen, both showing Rupnagar, and let the contradiction do
the talking.

> "Sir, your app and our app are both correct. They're answering different questions. Yours
> answers *will I need an umbrella*. Ours answers *do I evacuate*."

`DRY-SKY FLOOD RISK` is a named, badged state in the UI. Two words that compress the whole pitch.

### This is not hypothetical — it is exactly what happened in August 2025

Verified from reporting on the event (see `03_data_sources.md` §Demo Event for citations):

- Most flooded areas lay along the Ravi and the lower Beas and Sutlej, which swelled due to
  catastrophic rainfall in the **upstream catchment areas of Himachal Pradesh**, which recorded
  **~46% above normal** monsoon rainfall — triggering 95 flash floods and 136 major landslides
  inside HP itself.
- This was compounded by **large-scale releases from the Bhakra, Pong and Ranjit Sagar dams**.
- Worst-hit districts were **Gurdaspur, Amritsar, Ferozepur, Fazilka, Pathankot, Kapurthala,
  Tarn Taran, Hoshiarpur** — i.e. *downstream* of the rain, not under it.
- Scale: worst in ~4 decades (since 1988); 1,400–1,650 villages; all 23 districts touched;
  350,000+ people affected; 37+ deaths; ~1.5 lakh hectares of farmland submerged.

**Consequence for the build:** the current 10-block Ghaggar-Yamuna registry in
`02_SURE_SHOT_BACKEND_DESIGN.md` largely **misses the primary demo event**. The block registry is
being replaced in Phase A (see `14_PHASE_A_MVP_BUILD_PLAN.md`) with a Sutlej/Beas/Ravi +
Ghaggar/Yamuna set that includes the districts that actually flooded.

---

## 3. THE FIVE DIFFERENTIATORS, RANKED BY (JUDGE IMPACT ÷ HOURS)

| # | Differentiator | Why a weather app structurally cannot do it | Hours | PS anchor |
|---|---|---|---|---|
| 1 | **Upstream catchment coupling + arrival clock** | Point forecasts have no spatial hydrology | ~1.5 | "DEM → flash-flood translation" |
| 2 | **Exposure translation** (people & facilities at risk, not millimetres) | Apps forecast hazard; nobody forecasts impact | ~0.5 | "early warning system", "disaster responders" |
| 3 | **Lead-time scorecard on a real event** (we flagged it N hours before a rainfall-threshold alert would have) | Apps never publish their own skill against a baseline | ~0.75 | "2–6 hours before impact" |
| 4 | **INSAT-3D via MOSDAC — direct ISRO satellite ingest** | Literally refutes "the API everyone uses" | ~2.0 | "INSAT WV/TIR = cornerstone" |
| 5 | **GloFAS river discharge (m³/s) as an independent hydrological check** | A second, physically different variable — no app shows river discharge | ~0.7 | flash-flood head |

Every one of these is already inside the PS. **Nothing here is a pivot.** These are the parts of
the PS that were being deferred, now being built first. Nothing said to the reviewer will
contradict an existing project doc.

Two more that cost almost nothing and matter to an academic:

- **Machine-readable alert API + webhook.** Google has no interface a control room can subscribe
  to. Meghdoot does. *"We are not an app. We are infrastructure an app could be built on."*
  Demo it with one live `curl` in a terminal.
- **Confidence honesty** (`within_validated_core`). *"The system knows the edge of its own
  competence."* Examiners reward this; consumer apps never do it.

---

## 4. THE 60-SECOND OPENING SCRIPT

Do **not** open with the dashboard. Open with his objection, agree with it, then turn it.

> "Sir, last time you were right — we showed you a rainfall forecast, and rainfall forecasts are a
> commodity. So we went and built the part that isn't.
>
> Here is Rupnagar right now on your phone: clear, no rain. Here is Rupnagar on our screen:
> orange, runoff arriving between 16:10 and 17:10, roughly 1,240 people in the path.
>
> Both are correct. A flash flood in Rupnagar isn't caused by rain in Rupnagar — it's caused by
> rain a hundred kilometres upstream in Himachal, hours earlier. Your app forecasts the sky over
> one point. It has no concept of a catchment, so it structurally cannot show this. We are not
> forecasting weather. We are forecasting **arrival**.
>
> Second: IMD issues district-level, twice-daily, hazard-only bulletins. That is the correct
> product for what IMD does. Disasters happen at block level in ninety minutes. That gap is *why*
> MoES and NCMRWF wrote this problem statement — it names computational latency and small-scale
> events explicitly. We are not competing with IMD. We are the last-mile translation layer, and we
> cross-check against them.
>
> Third, on the data-source point specifically — we now have MOSDAC access. We are ingesting
> ISRO's INSAT-3D water-vapour and thermal-infrared products directly, which is what the PS calls
> the cornerstone signal. That is not a public model API. That is the satellite.
>
> And here is the receipt." *(open the Evidence page)* "Same input data, replayed over the August
> 2025 Punjab floods. A rainfall-threshold alert fires here. Ours fires here. Three hours forty
> earlier for Rupnagar. It's honest — for Ambala we only gained forty minutes, and we're showing
> you that too."

Only then let him click around.

---

## 5. ANTICIPATED FOLLOW-UPS — MEMORISE THESE

**"Your upstream travel times are made up."**
> "They're not hand-typed. We sample terrain elevation at every upstream point and at the block,
> compute the channel slope, get mean velocity from a Manning-type slope relation, and convert to
> flood-wave celerity using the kinematic-wave result c = 5/3 · v for a wide channel. It's a
> lumped first-order routing estimate and we label it as one. DEM-derived flow routing with
> pysheds is the next build step and it's already scoped."

**"Google could add this tomorrow."**
> "They could. They haven't, in fifteen years, because their user wants an umbrella answer, not an
> evacuation answer. And to do it for Punjab they'd need Indian block boundaries, DDMA facility
> registries and INSAT ingest. The moat isn't the algorithm, it's the local integration."

**"Why not just use IMD's warnings?"**
> "We do, as a cross-check. IMD's warning tells a District Collector that Gurdaspur district is
> orange. It doesn't tell him which four facilities in which block to move first. That's the
> decision our output is shaped for."

**"Is your model trained?"**
> "Not yet — what you're seeing is a physically-motivated baseline, and every single API response
> carries `is_baseline_heuristic: true` so nobody can mistake it. The GRU multi-task model is
> Phase 2. I'd rather ship an honest baseline than an unvalidated network."

**"Where's the AI?"**
> Point at the three heads, the SHAP-based attribution spec, the Groq XAI narrative. Be honest
> that tonight's numbers come from the baseline. Then pivot: "The AI matters less than the
> framing. A perfectly trained model that outputs millimetres is still just a weather app."

**"You're still using Open-Meteo."**
> "For the atmospheric fields, yes — and deliberately, because the same API serves live and
> historical data with an identical schema, which eliminates train/inference drift. But we're now
> running four independent sources: Open-Meteo for atmosphere, Copernicus GloFAS for river
> discharge, ISRO INSAT-3D via MOSDAC for satellite moisture and cloud-top temperature, and a
> terrain model for routing. The novelty was never the source. It's the transformation."

**"Show me it works without internet."**
> Turn wifi off. Hit Replay. This must never fail — see §7.

---

## 6. HONESTY RULES THAT ARE NON-NEGOTIABLE (extends `MASTER_AGENT_BRIEF.md` §WHAT NEVER CHANGES)

New rules added this session:

| Rule | Why |
|---|---|
| The baseline comparison row is labelled **"rainfall-threshold alert on the same forecast data"**, never "what IMD would have said" | We have no evidence of IMD's actual bulletin timing. One sharp question destroys everything else if we overclaim. The threshold-baseline claim is bulletproof and sufficient. |
| The IMD colour row is labelled **"IMD colour scale applied to forecast rainfall"** | We are applying IMD's published thresholds (Green <64.5mm/24h, Yellow 64.5–115.5, Orange 115.6–204.4, Red >204.4), not quoting their bulletin. |
| Exposure figures are labelled **"demo exposure register — DDMA/LGD facility registry integration pending"** | Numbers are illustrative clusters, not audited counts. Never name a real named institution with a specific flood claim. |
| Routing lag labelled **"lumped kinematic-wave estimate; DEM flow routing pending"** | It is derived, not measured. |
| The lead-time scorecard **must include at least one block where we did poorly** | A scorecard that is all wins is not believable. A scorecard with a failure in it is. |
| GloFAS discharge labelled **"Copernicus GloFAS, modelled, ~5 km grid, daily"** | It is modelled, not gauged, and daily — it corroborates, it does not nowcast. |
| MOSDAC-derived fields flip `ctt_is_proxy` to **false only for the exact timestamps where a real HDF5 granule was read** | Never blanket-flip the flag. |

---

## 7. THE HARD FLOOR

If everything else fails, this must still be true at demo time:

1. `npm run build` passes and `npm run dev` serves the dashboard from localhost.
2. Wifi off → Replay mode plays the August 2025 reconstruction end to end.
3. The Evidence page renders from a static JSON file with zero network calls.

If those three hold, the demo cannot be lost. Rehearse them, in that order, with the network
physically disabled, before the inspection.

---

## 8. WHAT NOT TO DO BEFORE THE NEXT INSPECTION

- **Do not scrape IMD.** Access was formally denied, the page is unstable, and a live scrape
  failing on stage is a self-inflicted wound.
- **Do not stand up Neon.** In-memory is already blessed in `02_SURE_SHOT_BACKEND_DESIGN.md`.
- **Do not train a model.** Highest-risk item on the list; the honest baseline is the documented
  accepted path (`11_fallback_playbook.md` #10).
- **Do not deploy.** Localhost is a documented, acceptable demo surface (`09` §Rollback).
- **Do not add landing-page sections.** The landing page is done. The reviewer does not care about
  it. It will eat an hour.
- **Do not claim a lead-time advantage over IMD's actual operational bulletin.** See §6.
