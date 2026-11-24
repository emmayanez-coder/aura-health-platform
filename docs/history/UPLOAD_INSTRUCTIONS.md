# AURA v0.7 — voice-guided fictional medical-assist training

## Upload with FileZilla

1. Export personal records and any unfinished training records before refreshing. Back up /htdocs/dashboard/ to a separate local folder.
2. Extract AURA_Medical_Assist_Update.zip. Open the extracted dist folder on FileZilla's local/left side.
3. On the remote/right side, open /htdocs/dashboard/.
4. Upload EVERYTHING INSIDE dist, overwriting matching dashboard files. Include the new medical-assist.mjs and audio/medical-assist folder, with all five WAV files. Do not upload a nested dist folder.
5. Confirm Failed transfers is empty. Refresh the website with Ctrl+F5; purge hosting cache if needed. Confirm v0.7.
6. Your activated AURA WordPress settings plugin and saved API key need no changes. They are outside the uploaded dashboard files. This simulation does not use your API account.

Audio layout:

```
/htdocs/dashboard/audio/medical-assist/
  01-open.wav
  02-contact.wav
  03-observations.wav
  04-measurements.wav
  05-handover.wav
```

The package also retains all existing sensor, NASA research, cloud-chat and reassessment modules. Do not upload the documentation, tests, narration.json, raw research archives or WordPress-plugin source folder into dashboard.

## Test the feature — no sensor, login or five-minute assessment needed

1. Open Medical Assist · training from the header or sidebar. Click Start fictional scenario.
2. Click Play / replay narration. The first clip should read the on-screen transcript. Pause it and resume using the audio player's controls, or replay it from the beginning. Playback is user-triggered; there is no autoplay.
3. Let the clip finish: the checklist must stay on step 1 until you press Confirm step & next.
4. Click Unable to complete: the step should be marked unable and stay open. You can replay, resolve the issue and explicitly confirm, go back, or end the simulation. There is no automatic skip.
5. Confirm step 1. On step 2, trying to confirm with Not contacted must be refused. Choose Contact attempted — simulated, then confirm. No call or message is actually sent.
6. Play and confirm the scripted-observation step. Optional notes are fictional training notes, not patient triage or AI prompts.
7. On the measurement step, click Load scripted follow-up sample if desired. The invented HR changes from 96 to 94 BPM and is explicitly labeled simulated. It must not change live HR, readiness, baseline or reassessment data elsewhere.
8. Confirm the measurement review, then review the training handover preview. Play the final clip and click Confirm final step. Completion means checklist completion, not a resolved medical condition.
9. Click Export training record. The JSON should include simulation:true, scenario/version, step confirmations, timestamps, simulated communication state, notes and events. It uses a separate export from personal health records.
10. Optionally start another incident and choose End simulation to test an incomplete run. Both incidents remain in the training export. The global Clear data button clears training history too; export first.

## Narration and scope

Five prerecorded English synthetic-voice clips, rendered locally with Microsoft Zira Desktop, are bundled as 22,050 Hz, mono, 16-bit PCM WAV. They run about 23–26 seconds each. The transcript is always visible, even if audio fails. The audio requires no runtime text-to-speech service, microphone, API key or model call. Initial website/audio loading still needs website access; this release does not add offline caching.

This is an AURA-authored fictional workflow, version 1.0, not a validated or mission-approved emergency procedure. It demonstrates observation recording, simulated communication and handover. It supplies no diagnosis, medication, treatment or real escalation. For actual medical concerns, use medical support and approved procedures rather than this simulation.

The fictional patient is SIM-01. Live Kyto/Huawei readings never enter the fictional incident. Audio and checklist activity cannot change the personal baseline, readiness score, action/reassessment loop or cloud-chat context. Training notes are not sent to OpenAI. A changed scripted HR is not labeled improvement.

NASA clinical-decision-support use cases inform the general design direction: https://ntrs.nasa.gov/citations/20220017885 . They do not validate this authored script. The exact transcript is in narration.json and the module; no NASA narration or endorsement is claimed.

## Verification

Automated tests passed for explicit-only advancement, contact-status gate, unable/back flow, early exit/completion, training export summary, clearing, audio WAV format/durations, script matching and UI event handling with a test DOM. Existing sensor/scoring, radiation, bone, ECG, guidance and cloud-chat regression tests passed. Audio metadata was checked; perceptual listening and the uploaded browser's visual/audio behavior still need the acceptance steps above. No clinical validation is claimed.

Tests: node test-medical.mjs and the other included test-*.mjs scripts. The original synthesis script is in reproducibility/render_narration.ps1 and requires the installed Microsoft Zira Desktop voice and System.Speech on Windows. Regeneration is unnecessary to use the supplied clips.
