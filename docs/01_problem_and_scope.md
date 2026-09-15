# Problem Statement & Scope

## Original Problem Statement — SIH26077 (verbatim)

**Organization**: Ministry of Earth Sciences (MoES)
**Department**: National Centre for Medium Range Weather Forecasting (NCMRWF)

> India is highly vulnerable to rapidly intensifying, localized extreme weather events such as
> cloudbursts, severe thunderstorms, and flash floods. Traditional physics-based NWP models often
> suffer from computational latency and struggle to capture the rapid, small-scale atmospheric
> changes that preceded these events. There is a critical need for a real-time, hyper-local early
> warning system capable of nowcasting severe weather 2–6 hours before impact.
>
> The proposed solution uses a spatiotemporal deep learning architecture fusing:
> - **IMDAA Reanalysis** (multi-level temp, humidity, CAPE/CIN, U/V wind)
> - **INSAT-3D/3DR via MOSDAC** — Water Vapor channels for IWV (described as "cornerstone"),
>   Thermal Infrared for CTT drop rate
> - **DEM** (CartoDEM or SRTM) for flash-flood translation
>
> A **multi-modal spatiotemporal transformer with cross-attention** serves as the backbone,
> branching into 3 MTL heads (thunderstorm / cloudburst / flash flood). XAI module required.
> Output: deployed web dashboard + alert API for disaster responders.

---

## PS Alignment — Honest Assessment

| PS requirement | Meghdoot implementation | Alignment |
|---|---|---|
| 2–6hr lead time, not NWP-latency-bound | Per-block GRU/MLP on live feature streams | ✅ Full |
| Spatiotemporal deep learning, MTL, 3 heads | GRU/MLP shared encoder → 3 heads | ⚠️ Architecture lighter than PS implies (documented) |
| IWV from satellite (INSAT WV channels) | Open-Meteo humidity/cloud fields proxy; MOSDAC TPW if signup approved | ⚠️ Proxy only unless MOSDAC comes through |
| CAPE/CIN (instability) | Open-Meteo `cape`/`convective_inhibition` direct fields | ✅ Full |
| Convergence + wind shear (lift) | Derived via MetPy from Open-Meteo U/V at 850/500hPa | ✅ Full |
| CTT drop rate from INSAT TIR | Open-Meteo cloud-cover-trend proxy (labeled); MOSDAC CTT if approved | ⚠️ Proxy only unless MOSDAC comes through |
| IMDAA as thermodynamic baseline | DROPPED — Open-Meteo CAPE/CIN used instead (same quantities, different source) | ⚠️ Documented deviation |
| DEM → flash-flood translation | SRTM + `pysheds` flow accumulation × rain-intensity head | ✅ Full |
| Multi-modal spatiotemporal transformer | Per-block GRU/MLP — documented trade-off (see `02_architecture_and_stack.md`) | ⚠️ Documented deviation |
| XAI, meteorological triggers shown | SHAP-lite/gradient×input → Groq plain English | ✅ Full |
| Real-time dashboard + alert API | Next.js/Leaflet + FastAPI endpoints | ✅ Full |
| Alerts to responders | Web Push; SMS/WhatsApp out of scope (paid gateway) | ✅ Partial |

**Overall PS alignment: ~65%.** The science is right. Data sourcing and architecture are the
documented gaps. Own them. Never hide them.

---

## Three documented PS deviations — state these plainly to judges

1. **Architecture**: Per-block GRU/MLP instead of spatial ConvLSTM/transformer over satellite
   grids. Rationale: removes multi-terabyte raster alignment risk, allows identical live/training
   schema. Full reasoning in `02_architecture_and_stack.md`.

2. **IWV/CTT source**: Open-Meteo derived proxy instead of raw INSAT satellite channels.
   Dashboard visibly labels which mode is active. If MOSDAC signup is approved, real satellite
   fields replace the proxy automatically — the code path supports both.

3. **IMDAA dropped**: Open-Meteo CAPE/CIN used in its place. Same physical quantities, different
   source. IMDAA had no accessible free-tier live path — Open-Meteo does, with identical schema
   for training and inference.

**Priority action**: MOSDAC signup at `mosdac.gov.in/signup/` — submit immediately regardless
of everything else. Approval email is out of your hands; every day delayed is a day lost. If
MOSDAC comes through and the access pattern proves automatable, deviation #2 closes substantially.
Full detail on what MOSDAC provides, why it's not load-bearing yet, and the exact validation
steps to take if/when access is approved: see `03_data_sources.md`.

---

## MVP definition — "done" means all of:
1. Deployed dashboard, block-level Leaflet map (all India), 3 switchable risk layers.
2. Risk from a trained model, not just the placeholder heuristic (heuristic stays as labeled fallback).
3. Clicking a block shows plain-English top-3 triggers (XAI).
4. DEM-derived flash-flood layer visibly distinct from raw rainfall.
5. Replay mode plays back Aug 2025 Punjab floods (or Jul 2023 backup) with **zero internet needed**.
6. Live mode genuinely polls and updates without reload.
7. Every external call has a cached fallback — no blank screens.

---

## Non-goals (explicitly out of scope)
SMS/WhatsApp alerts · user accounts/auth · full ConvLSTM/transformer model · native mobile app ·
multi-language UI · full IMDAA/INSAT archives · hydrodynamic flood simulation.

*(All-India map coverage is now IN scope. Model training/validation focus remains North India
belt — Aug 2025 + Jul 2023 events. See `04_region_scope.md`.)*

---

## Personas
**Disaster management officer** — needs at-a-glance block risk + plain-language reasoning, drives
Dashboard/Alerts/Block-Detail. **Hackathon judge** — needs proof of realness (live ticking data),
proof of rigor (XAI, methodology page), proof of robustness (replay works offline) within ~60 seconds.
