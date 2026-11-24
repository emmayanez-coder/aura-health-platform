# AURA — Personal Health Model

A NASA Space Apps hackathon prototype connecting daily physiological awareness with long-term mission health exploration.

**Live demo:** https://spacehealthaura.health/dashboard/

This repository contains the complete v0.17 public-access version. Visitors can explore the hosted demo without a login, access code, or sensor.

## Explore AURA

1. Select **Explore demo** for fictional physiological readings.
2. In **Companion**, select **Meet AURA**, or accept the data-sharing checkbox and send a question.
3. Open **Health support → Preview all 4 scenarios**.
4. Try **Medical Assist · training** and **Readiness rewards → Preview rewards**.
5. Explore **NASA sources**, **Evidence & Testing**, and the VR roadmap.

## Features and scope

- Daily readiness indicators, personal baselines, and explainable health scores.
- Kyto heart-rate/beat-interval and Huawei sensor integration modules; actual connectivity depends on device, browser, and setup. Sleep, SpO₂, and activity can be entered manually.
- Historical NASA MSL/RAD radiation observations, a NASA-grounded bone-health model, and a flight-crew ECG processing example.
- Conversational companion, voice playback, supportive routines, reassessment, and action-based rewards.
- Fictional medical training scenario; VR training remains a roadmap feature.

Scores and modeled trajectories are prototype indicators, not clinically validated diagnoses or individual bone-density measurements. Demo readings are fictional. Radiation data are historical environmental observations.

## Run the local dashboard

Install a current Node.js LTS release, then run:

```sh
node serve.mjs
```

Open http://localhost:4173. No npm dependencies or build step are required. The local server previews the static dashboard; it does not execute the PHP AI endpoints. Hosted chat and generated speech require the WordPress/PHP deployment below.

## Deploy the complete experience

1. Use HTTPS hosting with WordPress and PHP 8.1 or newer.
2. Copy the **contents** of `dist/` into a `dashboard/` folder beside WordPress's `wp-load.php`.
3. Copy `wordpress-plugin/aura-companion-setup/` into `wp-content/plugins/` and activate **AURA Companion Setup**.
4. In WordPress **Settings → AURA Companion**, save your own OpenAI API key and daily request cap. Never commit the key.
5. Open `/dashboard/` in a fresh private browser window. Test **Check AI connection**, a consented question, and voice playback.

The v0.17 endpoints permit public visitors and retain origin/nonce checks and request limits. Older judge-code settings do not gate this version. AI usage is charged to the hosting owner's API account. GitHub stores this source; GitHub Pages alone cannot execute its WordPress/PHP backend.

## Repository layout

| Path | Contents |
| --- | --- |
| `dist/` | Browser source modules, styles, assets, audio, and NASA data |
| `dist/api/` | PHP chat/speech endpoints and validation |
| `wordpress-plugin/` | Server-side API settings and request counters |
| `reproducibility/` | NASA processing scripts and reference inputs |
| `private-config/config.php.example` | Placeholder alternative configuration, not a credential |
| `test-*.mjs`, `test.mjs`, `test-*.php` | Existing automated checks |
| `docs/history/` | Earlier incremental setup notes; this README supersedes their deployment instructions |

## Tests

Run all JavaScript checks with `node run-tests.mjs`. With PHP installed, run `php test-api.php`, `php test-speech.php`, and `php test-judge.php`. The judge test covers the retained legacy helper, not public-access authorization. Mocked tests do not establish that live hosting or wearable hardware works.

## Data and attribution

NASA source links, processing details, and methodology are included in the dashboard, `reproducibility/`, `FLIGHT_CREW_TEST.md`, and `BONE_RESEARCH.md`. Preserve their provenance when reusing data. The repository includes generated visual/voice assets. No open-source license has been selected for this release.
