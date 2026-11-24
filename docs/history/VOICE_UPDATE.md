# AURA v0.7.1 — operational-style narration

All five prerecorded clips now speak directly to the responder: open the incident, contact medical support, record observations, review measurements, and prepare the handover. Repeated spoken references to simulation/fictional data were removed. The persistent on-screen training label, fictional patient identification and communication limitations remain visible. This does not add clinical treatment instructions or real medical-support communication.

Example: “Request assistance from the crew medical officer through your established communication channel. Record contact attempted while awaiting a response. Select support acknowledged only after a response has been received.”

## Upload this patch

1. Export any current records before refreshing and back up /htdocs/dashboard/.
2. Extract AURA_Medical_Assist_Voice_Update.zip.
3. Upload everything INSIDE its dist folder into /htdocs/dashboard/, overwriting matching files. This patch includes index.html, app.mjs, medical-assist.mjs and the five new audio clips. Existing dashboard files, folders and WordPress plugin settings must remain in place.
4. Refresh with Ctrl+F5. Confirm v0.7.1 and start a new training incident.
5. Play each clip and verify it matches the visible transcript. The new files end in -v11.wav, so old audio should not be reused from cache.

No plugin installation or API-key change is needed. The narration uses prerecorded synthetic English speech. The same button confirmations and separate training record remain in effect. Audio ending never advances a step.

Verified: five valid PCM WAV clips (about 19–25 seconds), exact script matching, manual progression and contact gates, previous/unable/clear flows and page-reference checks. Perceptual listening and uploaded browser playback remain user acceptance checks.
