# Meghdoot — Start Here

**Meghdoot** (मेघदूत, "cloud messenger," after Kalidasa's poem) — an AI-driven hyper-local early
warning system for severe weather nowcasting, built for **SIH26077** (Ministry of Earth Sciences /
NCMRWF), covering Punjab + Haryana + Delhi.

**If you're resuming this project**: read `10_status_and_plan.md` first — it's the live snapshot of
what's done, what's blocked, and the exact next action. Everything else in this folder is stable
reference/spec, not a moving target.

## Document index (12 files, each single-purpose, no overlap)

| File | Contents |
|---|---|
| `01_problem_and_scope.md` | PS requirements condensed into a traceability matrix; MVP scope; non-goals; personas |
| `02_architecture_and_stack.md` | System architecture, data flow, every free-tier service used |
| `03_data_sources.md` | Every external data source — access method, verified status, known gotchas, exact fixes for issues already hit |
| `04_region_scope.md` | Punjab/Haryana/Delhi belt, district list, the two chosen historical demo events |
| `05_database_schema.md` | Neon Postgres schema (SQL DDL) |
| `06_ml_model_spec.md` | Model architecture, features, labels, training, XAI |
| `07_api_spec.md` | FastAPI routes, cron jobs, fallback logic |
| `08_frontend_and_design.md` | Pages, popups, user flows, visual design system |
| `09_dev_and_deployment.md` | Local setup (do first) + final-day-only hosting steps |
| `10_status_and_plan.md` | **Live status + the 3-phase build plan + compressed changelog.** Read this first when resuming. |
| `11_fallback_playbook.md` | Every known failure mode and its fallback |
| `12_glossary.md` | Every technical/meteorological term, explained plainly |

## The one rule that overrides all others

**Local first. Online only on the last day.** Neon is a database connection, not "hosting" —
use it from Day 1. Vercel/Render deployment stays untouched until `09_dev_and_deployment.md`'s
deployment section is explicitly triggered.

## Quick facts

| | |
|---|---|
| Project | Meghdoot, SIH26077, sponsor MoES/NCMRWF |
| Region | Punjab + Haryana + Delhi NCT |
| Hazards | Severe thunderstorms, cloudbursts, flash floods, 2–6hr lead time |
| Stack | Next.js (Vercel) + FastAPI (Render) + Neon Postgres + Groq (XAI narrative) |
| Model | Per-block GRU/MLP over tabular features (not a spatial ConvLSTM — see `02` for why) |
| Cost | Free tier only, everywhere |
