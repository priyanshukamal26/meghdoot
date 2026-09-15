# ML Model Specification

## Architecture decision — read this before writing any model code

The PS asks for a "spatiotemporal deep learning" multi-task architecture over satellite/reanalysis
grids (effectively pointing at a ConvLSTM or spatiotemporal transformer). Meghdoot instead uses a
**per-block time-series model (GRU or MLP) over tabular features**. This is a deliberate,
documented trade-off, not a shortcut taken quietly:

- A full spatial-grid model needs perfectly-aligned multi-source raster sequences — exactly the
  slow, manual, terabyte-scale IMDAA/MOSDAC/INSAT alignment work flagged as the main risk across
  every prior feasibility pass.
- A per-block model needs one row per block per timestep, sourced entirely from Open-Meteo's
  identical live/historical schema (see `03_architecture.md`) — an order of magnitude less
  engineering risk, trainable in minutes to low hours instead of a multi-hour GPU job.
- The three physical input categories the PS asks for (moisture / instability / lift) and the
  multi-task, shared-backbone-plus-heads structure are preserved exactly — only the spatial
  representation changed, not the science.

State this trade-off plainly to judges; it is defensible and it is the reason this project ships
in a week instead of not shipping at all.

## Inputs — per block, per timestep

| Feature | Source | Derivation |
|---|---|---|
| `cape` | Open-Meteo | direct field |
| `cin` | Open-Meteo | direct field (`convective_inhibition`) |
| `iwv_proxy` | Open-Meteo | derived from humidity + cloud fields (or MOSDAC TPW if confirmed live) |
| `ctt_drop_rate` | MOSDAC CTT (if live) else Open-Meteo cloud-cover trend proxy | rate of change over last 2 timesteps |
| `convergence_850` | Open-Meteo U/V at 850hPa | `-metpy.calc.divergence(u, v)` |
| `wind_shear` | Open-Meteo U/V at 850hPa and 500hPa | vector difference magnitude |
| `rainfall_recent` | Open-Meteo precipitation | rolling sum, last 3 timesteps |

Sequence length: **last 6 timesteps** per block (matches the PS's own framing of using recent
history to anticipate the next 2–6 hours).

## Labels

Built from **IMERG auto-thresholding**: any block-timestep with >50mm accumulated over a rolling
3-hour window is labeled a positive `cloudburst` event. `thunderstorm` label derived from a lower
CAPE+rainfall combined threshold; `heavy_rain_intensity` is a continuous regression target (mm/hr)
rather than binary, since it directly feeds the DEM flood overlay.

Training windows: the two historical demo events from `06_region_scope.md` (Aug 2025 primary,
July 2023 secondary), pulled via Open-Meteo's Historical Forecast API for the exact same
15-district region.

## Model

```text
Input: [batch, 6, n_features] per block
    |
GRU (or a small MLP over the flattened window if GRU underperforms on this little data — try both,
     keep whichever validates better; note the choice in project_track.md)
    |
Shared dense encoder
    |
    +--> Head 1: thunderstorm probability (sigmoid)
    +--> Head 2: cloudburst probability (sigmoid)
    +--> Head 3: rain intensity (regression, mm/hr) --> feeds DEM overlay
```

Loss: weighted sum of binary cross-entropy (heads 1–2) + MSE (head 3). Class imbalance is expected
(positive events are rare) — use class weighting or focal loss rather than upsampling, given the
small dataset.

## DEM flood overlay

```text
rain_intensity_head (per block)
        x
flow_accumulation_weight (precomputed once from SRTM via pysheds, per block)
        =
flash_flood_risk (per block)
```

Precompute the flow-accumulation raster once (Phase 2), cache it — this is a static layer, never
recomputed at inference time.

## XAI — explainability

Given the smaller, tabular architecture, a lightweight attribution method fits better than the
spatial-attribution approach (e.g. Captum's Integrated Gradients) that would suit a grid model:

1. Compute per-feature contribution via SHAP (on the trained GRU/MLP; `shap.DeepExplainer` or a
   simpler gradient×input saliency if SHAP proves too slow for a live path) — top 3 features per
   prediction.
2. Send `{feature, contribution, current_value}` for the top 3 to **Groq**, prompted to produce one
   or two plain-English sentences: *"This alert was triggered primarily by rapid CAPE buildup
   (2,450 J/kg, rising) combined with low-level wind convergence over the last two hours."*
3. Cache the result in `xai_explanations` — generate once per alert, never regenerate for the same
   alert (keeps Groq free-tier usage minimal and keeps the explanation stable if a judge re-reads it).

## Baseline / fallback mode

The Phase-1 heuristic formula (weighted combination of normalized CAPE, IWV-proxy, convergence,
shear, recent rainfall) is never deleted. It stays wired into the same `predictions` table
(`is_baseline_heuristic = true`) as a documented, honestly-labeled fallback if the trained model
underperforms or isn't ready in time — see `14_fallback_and_risk_playbook.md`.

## Evaluation

Report precision/recall per head on a held-out slice of the training window (e.g. last 20% of
timesteps by time, not random split, to avoid leakage across the sequence). Keep one concrete
example ready to show: predicted risk vs. what actually happened at a specific block during the
August 2025 event.
