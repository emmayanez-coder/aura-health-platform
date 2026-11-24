# AURA v0.4 — actual NASA flight-crew replay

## Scope and source

Downloaded https://data.nasa.gov/docs/datasets/public/csm/5.zip from the NASA catalog, with the companion description.txt, on 14 November 2026. The first 310 seconds of 5/5_CA.csv were selected before inspecting signal quality. This is one pilot's channelized-attention ground benchmark, not a flight in space or the LOFT simulator recording. It contains 79,360 ECG samples at 256 Hz, timestamped 0.18359375–310.1796875 seconds. Only TimeSecs and ECG are bundled; event counts are retained as metadata. No resampling, smoothing or interpolation occurs in the excerpt.

Credit: NASA Langley Research Center; dataset maintainer Angela Harrivel. Catalog: https://data.nasa.gov/dataset/flight-crew-physiological-data-for-crew-state-monitoring

## Processing and actual result

An experimental detector removes a centered 200 ms moving mean, takes absolute amplitude, finds candidates above median + 6 median absolute deviations and applies a 300 ms refractory period. These fixed engineering choices are not a validated NASA detector. Derived beat intervals are replayed into the existing SignalWindow class with HR = 60000/RR_ms, one packet per interval, contact unknown. These are adapter packets, not recorded Bluetooth packets. Event labels are not used to infer health or attention.

Actual frozen-excerpt result:

- 248 candidate beats; 247 intervals.
- Final five-minute HR coverage: 39.6445%.
- Final five-minute RR coverage: 37.0365%.
- 105 rejected items across the full excerpt (packets or intervals, not necessarily unique beats).
- HR and RMSSD: unavailable, because coverage is below 80%.

This is a useful negative test: the detector does not yield sufficient coverage on this excerpt and the quality gate withholds summaries. Do not present it as successful ECG accuracy validation. No annotated R peaks are supplied, so sensitivity, timing error and true HRV accuracy are unmeasured. Missed/spurious beats, physiological changes and artifacts can all contribute. Further detector development needs independent annotated ECG benchmarks and broader subject/task coverage.

The test is isolated from live sensors, stored personal baselines, Daily Readiness, radiation and bone calculations. It does not test BLE transport or wearable accuracy. The NASA catalog does not specify a license; source attribution and provenance are included.

## Reproduce

1. Download the archive from the NASA URL above (about 115 MB). The full archive is not bundled in the website ZIP.
2. Run `python reproducibility/prepare_flight_crew.py path/to/5.zip dist/data/flight-crew-ecg.json` with Python 3; only the standard library is required.
3. Run `node test-flight.mjs`. It verifies known-rate synthetic signals, flatline handling, invalid/gapped input, excerpt integrity and deterministic real-data replay against the frozen report. A frozen report is a regression reference, not physiological ground truth.
4. Run the other test scripts for sensor/scoring, radiation, bone and page-reference regression checks.
5. In the dashboard, click Run NASA pipeline test. Download test report exports the computed result, derived intervals, methods and source hashes.

The archive and full CSV SHA-256 hashes appear in the excerpt provenance. The frozen report additionally includes the excerpt's SHA-256. Original NASA description.txt is in reproducibility/flight-crew-description.txt.

Local browser preview could not connect to the local server in this environment; automated tests passed. Verify the panel after FileZilla upload.
