> Historical v0.5 local-guidance instructions. For v0.6 typed cloud chat, private configuration, access control and data sharing, read SETUP_AI.md first. The local loop steps below still apply.

# AURA v0.5 — FileZilla and testing

## Upload

1. Export any personal records from the current AURA tab before refreshing.
2. Extract AURA_Guidance_Update.zip into a new local folder.
3. Open FileZilla > File > Site Manager and connect using your existing Porkbun SFTP connection.
4. On the remote/right side, open /htdocs/dashboard/. Download a backup to a separate local folder.
5. On the local/left side, open the extracted dist folder. Select everything INSIDE it, including data and sensors, and upload into /htdocs/dashboard/. Choose Overwrite for matching dashboard files. Do not create a nested dist folder or change WordPress files outside dashboard.
6. Wait for the queue to finish; Failed transfers must be empty. Confirm guidance.mjs is beside app.mjs and index.html.
7. Open https://spacehealthaura.health/dashboard/ and press Ctrl+F5. Purge the hosting cache if an old version persists.
8. Confirm v0.5 and sidebar links Next action, Companion and Evidence & Testing.

Only dist contents go on the website. Documentation, tests and reproduction scripts are for local use.

## Companion: no sensor required

1. Choose Clear data only after exporting anything you want to keep.
2. Open Companion > Explain my readings. Without measurements, expect missing-data guidance, not an invented readiness result.
3. Click Explore demo, then Explain my readings again. The new response must say DEMO and explain synthetic HR, RMSSD and sleep. Prior messages remain snapshots.
4. Test What should I do next?, How do I reassess?, What does NASA evidence mean?, and I have a medical concern. The medical-concern response directs you to medical support and approved procedures, not medication or diagnosis.
5. Record action remains disabled in demo mode. The companion uses question buttons and predefined responses with current values; it is not free-text AI chat and needs no API key.
6. Clear data to leave demo before testing the real loop.

## Reassessment: two real measurements

1. Connect Kyto or Huawei under Data & sensors. Confirm the resting checkbox and start a five-minute assessment. Keep the tab visible. A valid completed assessment enables Record action. A seven-day baseline is needed for readiness, but not for the raw before/after loop.
2. Open Next action, choose an action from your existing routine, optionally enter a note, and click 1 · Record action. Expect step 1/3.
3. Carry out the action according to your existing plan, then click 2 · Mark action complete. Expect step 2/3. AURA prescribes no recovery duration.
4. Guard test: click Compare new assessment now. AURA must refuse the old measurement and request a new one after action completion.
5. When appropriate, use the same sensor, RR format and comparable resting conditions. Confirm the resting checkbox and click 3 · Start reassessment. This scrolls to acquisition and starts the normal five-minute recording if connected and ready. Follow any message about resting confirmation or fresh signal and retry if necessary.
6. Keep AURA visible for the full recording. Return to Next action, optionally enter an after-note and click Compare new assessment.
7. Expect step 3/3 and before/after HR. RMSSD appears only with sufficient interval coverage in both recordings; Huawei normally shows not comparable. A change is not automatically labeled improvement or treatment success.
8. Export record. In the JSON, reassessmentLoops should contain before, after, action, completedAt, notes and comparison. Export before refresh: data stays in session memory. Baseline import does not restore loop history; retain the exported file for review.

Disconnected sensors, hidden tabs and insufficient coverage require a new full assessment. Different sensors or RR encodings cannot be compared. Cancel loop preserves a cancelled entry in the export. Clear data clears the loop history and companion messages.

## Evidence and existing features

Open Evidence & Testing > Open NASA ECG processing test > Run NASA pipeline test. Expect 248 candidate beats, 39.6% HR coverage, 37.0% RR coverage and unavailable HR/RMSSD. This remains separate from personal health data.

Check NASA radiation remains about 1.142 mGy for the full bundled interval, and the bone reference is 88.0–94.0 at day 180.

Automated guidance, sensor/scoring, radiation, bone, ECG and page-reference checks passed. Local preview was unreachable; visual and physical-device checks remain to be performed on the uploaded site.
