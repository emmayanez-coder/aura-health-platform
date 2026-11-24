> Historical v0.5 local-guidance instructions. For v0.6 typed cloud chat, private configuration, access control and data sharing, read SETUP_AI.md first. The local loop steps below still apply.

# AURA v0.5 — interpretation, reassessment and companion

The Interpretation & Next Action card explains existing eligible readiness inputs, baseline references, missing domains and measurement time. It uses the same prototype HR/HRV deviation logic and entered sleep target; its prompts are not validated clinical thresholds. Sensor and scoring modules are unchanged.

## Routine loop

1. Connect the sensor and complete a five-minute resting assessment. Confirm resting conditions before starting. Follow the established daily-context and baseline workflow for readiness interpretation; a raw before/after comparison can be recorded before a seven-day baseline exists.
2. Choose an action from your existing routine, optionally add a note, and click Record action. This copies the initial measurement, baseline, context and score into the loop record.
3. Carry out the chosen action and click Mark action complete. No recovery duration or treatment is prescribed.
4. When appropriate, confirm comparable resting conditions and click Start reassessment. Keep the tab visible throughout the new five-minute recording. Return to Next action and choose Compare new assessment.
5. Review the HR/RMSSD differences and export your record. Comparison requires the same sensor/device key and RR encoding; the new recording must start after the action-completion time. Missing HRV stays unavailable. A failed or interrupted capture cannot complete the loop. A change is not evidence of causal benefit or fitness for duty.

Both before/after measurements, source context, timestamps, action, optional notes and comparison are retained under reassessmentLoops in the JSON export. Completed and cancelled loops remain in that export. Data stays in memory; export before refresh or closing. Existing baseline import restores resting-observation records only, not loop history. The exported loop record can be retained for review. Chat history is not exported. Clear data clears loop history and companion messages. Demo mode can explain synthetic readings but cannot create or complete personal follow-ups.

## Conversational companion

A guided, local, rule-based companion responds to five question buttons using current eligible dashboard values. No model API, key, backend or external health-data transmission is added. Responses are timestamp-context snapshots, not live-updating diagnoses. Notes are stored verbatim and are not analyzed or monitored for symptoms. The companion cannot diagnose, prescribe medication, determine fitness for duty or provide an emergency procedure. The medical-concern response directs users to crew medical support and approved procedures without waiting for AURA.

NASA's clinical-decision-support research motivates the design direction; it does not validate these interface rules or provide the selected routine actions as treatment protocols:
https://www.nasa.gov/centers-and-facilities/ames/ames-science/ames-space-biosciences/a-clinical-decision-support-system-for-earth-independent-medical-operations/

A future free-text AI companion would need a secure server integration, explicit handling of health-data sharing, reviewed procedure retrieval and clinical evaluation. No secret should be placed in public dashboard JavaScript.

## Evidence & Testing

The sidebar now links to Evidence & Testing. The existing NASA ECG replay is inside a collapsible test panel. Personal health, research references and engineering-test results remain separate. All NASA data and previous source panels are preserved.

Run: node test-guidance.mjs, node test.mjs, node test-nasa.mjs, node test-bone.mjs, node test-flight.mjs, node test-ui.mjs.
