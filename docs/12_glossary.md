# Glossary

Written plainly enough for a teammate (or Antigravity) with no meteorology background to build
correctly without misinterpreting a variable.

| Term | Meaning |
|---|---|
| **Nowcasting** | Very-short-range weather forecasting, roughly 0–6 hours ahead, as opposed to multi-day forecasting. |
| **CAPE** (Convective Available Potential Energy) | A measure of how much energy is available to fuel an updraft if air is lifted — higher CAPE means more potential for a violent thunderstorm, given a trigger. Units: J/kg. |
| **CIN** (Convective Inhibition) | The energy barrier holding a storm back from forming even if CAPE is high — a "lid" on the atmosphere. Storms often break out when CIN erodes (drops toward zero) while CAPE stays high. |
| **IWV** (Integrated Water Vapor) | The total water vapor in a vertical column of atmosphere — the "fuel supply" for heavy rain. Rapid local increases signal a moisture pool building up. |
| **CTT** (Cloud Top Temperature) | How cold the top of a cloud is, from satellite infrared imagery. A rapidly *dropping* CTT means the cloud is growing explosively upward — a sign of a strengthening storm. |
| **Convergence** | Wind vectors flowing toward each other at a point, forcing air upward — one of the main physical triggers that initiates a storm cell. |
| **Wind shear** | Change in wind speed/direction with altitude. Affects whether a storm stays stationary (higher flood risk in one place) or moves along quickly. |
| **QPE** (Quantitative Precipitation Estimation) | A satellite- or radar-derived estimate of how much rain is falling/has fallen, used here as an open alternative to ground radar. |
| **DEM** (Digital Elevation Model) | A raster of ground elevation values — used to compute slope and drainage direction, i.e. where water will actually flow. |
| **Flow accumulation** | For each point on a DEM, how much upstream area drains through it — high flow-accumulation cells are natural channels/valleys, where flash-flood risk concentrates. |
| **IMDAA** | India Meteorological Data Assimilation and Analysis — India's own atmospheric reanalysis dataset, built by NCMRWF, UK Met Office, and IMD. |
| **MOSDAC** | Meteorological & Oceanographic Satellite Data Archival Centre — ISRO's portal for INSAT satellite data and derived products. |
| **INSAT-3D / 3DR** | India's geostationary weather satellites, providing continuous imagery over India, including the water-vapor and thermal-infrared channels used here. |
| **GRU** (Gated Recurrent Unit) | A type of recurrent neural network layer good at learning patterns over a short sequence of timesteps — used here instead of a heavier spatial model. |
| **ConvLSTM** | A neural network layer combining convolution (spatial patterns) and LSTM (temporal patterns) — the PS's implied architecture for a full spatial-grid model; Meghdoot uses a lighter per-block GRU/MLP instead, see `08_ml_model_spec.md`. |
| **Multi-task learning** | Training one model with a shared "backbone" that branches into several separate output "heads" (here: thunderstorm / cloudburst / flash-flood), rather than training three separate models. |
| **XAI** (Explainable AI) | Techniques for showing *why* a model produced a given prediction — here, which input features (CAPE, IWV, etc.) contributed most, turned into plain English. |
| **SHAP** | A method for attributing a model's prediction to its individual input features, based on game-theoretic principles — used here as the numeric basis for the XAI narrative. |
| **LGD** (Local Government Directory) | India's official administrative-boundary codebook (district/block/village hierarchy) — the source behind the bharatlas.com boundary data used for block polygons. |
| **GeoJSON** | A standard JSON-based format for representing geographic features (points, polygons) — used throughout for block boundaries and map data. |
| **Fallback / cached mode** | When a live external call fails, serving the last successfully-fetched response instead of erroring out, clearly labeled as such rather than presented as live. |
| **Replay mode** | A pre-baked playback of a real historical weather event, requiring zero live network calls — Meghdoot's guaranteed-to-work demo floor. |
