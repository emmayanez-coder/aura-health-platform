> For this Porkbun installation, start with WORDPRESS_SETUP.md. PHP cannot see the SFTP private folder, so use the WordPress settings plugin instead. The file-based setup below is retained for other hosting layouts.

# AURA v0.6 — OpenAI companion setup

This package adds typed, contextual conversation to the existing dashboard. It is ready to configure; it is not connected to your OpenAI account yet. Do not paste your API key into a chat, HTML, JavaScript, or a screenshot.

## Requirements

- Your existing WordPress hosting with PHP 8.1 or newer and PHP cURL enabled.
- WordPress installed at /htdocs/wp-load.php, with AURA at /htdocs/dashboard/.
- A WordPress administrator login in the same browser and on the same domain as AURA.
- An OpenAI API project with access to the configured model and available billing/credits. A ChatGPT sign-in alone does not configure this API connection.
- A writable private folder beside htdocs. If SFTP does not allow creating it, ask hosting support to create it; do not move the secret into dashboard as a workaround.

Cloud chat is restricted to accounts with the WordPress manage_options capability (normally administrators). Visitors retain all previous local features but cannot make paid API calls. For a hackathon demonstration, use your own signed-in browser; do not share your administrator password. Public visitor chat would require a separate access and spending-control design.

## 1. Create and configure your API key privately

1. Visit https://platform.openai.com/api-keys in your browser. Create a key in the project you intend to use for AURA. Review billing/credits and usage controls for that project.
2. Extract AURA_AI_Companion_Update.zip into a new local folder.
3. In private-config, copy config.php.example to a file named exactly config.php, not config.php.txt.
4. Open your copy in a plain-text editor. Replace PASTE_YOUR_OPENAI_API_KEY_HERE with your key, leaving the surrounding single quotes intact. Do not change other lines initially.
5. The default model is gpt-5.6-terra, with low reasoning effort and a 2,000-token output cap. The configured model must be available to your API project and support the Responses API and low reasoning effort. Access is checked by the first real question, not the connection button.

## 2. Upload with FileZilla

1. Export any current AURA personal records before refreshing. Back up the remote /htdocs/dashboard/ folder to a separate local folder.
2. Connect to your existing Porkbun SFTP site.
3. On the remote side, go to the parent folder that contains htdocs. Create a folder called aura-private alongside it.
4. Upload ONLY your edited config.php into /aura-private/. It must remain outside /htdocs/.
5. Open /htdocs/dashboard/ on the remote side. On the local side, open dist. Upload everything INSIDE dist, including the new api folder and cloud-chat.mjs, plus the existing data and sensors folders. Overwrite matching dashboard files. Do not upload a nested dist folder.
6. Wait for all transfers to finish and check Failed transfers is empty. Do not upload test files, documentation, private-config or raw research archives into the website.

Expected layout:

```
/aura-private/
  config.php                 <-- secret, outside public website
  request-counts.json         <-- created by PHP; counts and timestamps only
/htdocs/
  wp-load.php                <-- existing WordPress, leave intact
  wp-login.php               <-- existing WordPress
  dashboard/
    index.html
    app.mjs
    guidance.mjs
    cloud-chat.mjs
    styles.css
    ...existing modules...
    api/
      chat.php
      chat-core.php
    data/
    sensors/
```

The private directory must be readable/writable by the hosting PHP process. Never set it world-writable (777) to resolve an error; ask hosting support for the correct ownership if necessary.

## 3. Sign in and test with synthetic data first

1. Open https://spacehealthaura.health/wp-login.php and sign in as your WordPress administrator. Porkbun account credentials and SFTP credentials are different from WordPress credentials. Your hosting panel may provide a WordPress admin sign-in link.
2. In that same browser, open https://spacehealthaura.health/dashboard/. Press Ctrl+F5 and confirm v0.6. Purge hosting cache if needed. If your WordPress site redirects to www or another canonical hostname, use that same hostname for AURA.
3. Open Companion and click Check AI connection. This checks local server configuration and your administrator session; it does not send health data, test the API key with OpenAI or incur an OpenAI call.
4. Click Explore demo, then Review data in the companion. Expand the health snapshot. Confirm mode is demo.
5. Tick the sharing checkbox. Type “How does my resting HR compare with my baseline?” and click Send to AURA AI. The response should identify the data as synthetic and can compare 72 BPM with the 66 BPM demo reference.
6. Ask a follow-up such as “What information is still missing?” The last three exchanges are carried with your new question.
7. Switch back to real mode using Clear data. Demo chat and consent must clear. With no real assessment, a question about HR should say the measurement is unavailable, not reuse the demo value.

## 4. Use your sensor data

Connect Kyto or Huawei, confirm resting conditions and click Start 5-minute resting assessment. Connection time alone does not count. Keep AURA visible through a successful recording. A valid resting summary can be discussed immediately; baseline comparisons require seven prior comparable days.

Ask, for example:
- “What do my available measurements tell me, and what can't you determine?”
- “Why is my readiness score unavailable?”
- “What changed after my reassessment?”
- “Is the NASA ECG test my own ECG?”

The AI receives a freshly captured snapshot on every send: valid resting HR/HRV, measurement time and signal coverage, baseline summaries, eligible manually entered sleep/activity, readiness score/coverage and latest loop state/differences. It does NOT receive raw ECG, live beat-by-beat readings, device IDs, notes, full records, SpO2, or the radiation/bone selections. Anything you type is shared, as are up to three recent successful exchanges. Review data previews values; the send captures fresh values, which replace the preview. The AI cannot start measurements or change records.

The original action/reassessment sequence is unchanged. See UPLOAD_AND_TEST.md for the five-minute before/after test. Local quick-guidance buttons still work without a key or administrator login.

## Privacy, cost and limits

Questions and snapshots pass through your WordPress host to OpenAI. The server requests store:false and does not intentionally log chat content or health snapshots. OpenAI safety/abuse logs and hosting logging policies may still retain information; store:false is not a guarantee of zero retention. Review https://developers.openai.com/api/docs/guides/your-data before using real health data. Clear cloud chat removes the in-browser conversation and aborts local waiting; it cannot recall data already sent. Chat is not included in record exports.

The endpoint allows at most 6 attempts per minute and, by default, 100 per UTC day across the site. Attempts count even if OpenAI fails. A daily request cap is not a fixed dollar budget. Review project usage controls and billing. Each request limits input size, history and output tokens. The API key remains server-side. No cloud question is sent automatically when a sensor connects or a measurement changes.

This is an unvalidated health-information prototype. Prompt instructions constrain the AI to explaining data and routine workflow, but they do not guarantee medical safety or factual accuracy. No diagnostic, treatment, emergency or fitness-for-duty capability has been validated. Use medical support and approved procedures for concerns; do not wait for chat.

## Troubleshooting

- Sign-in required: log into WordPress as an administrator on the same hostname and browser, then Check AI connection. SFTP/Porkbun login alone is insufficient.
- Not configured: verify config.php is in /aura-private/ beside /htdocs/, not inside dashboard.
- WordPress not found: the expected wp-load.php location does not match your host; confirm the layout before adapting the endpoint.
- PHP cURL missing/outbound HTTPS failure: ask Porkbun hosting support to enable cURL and outbound TLS access to api.openai.com with normal certificate verification.
- Quota/model/credentials rejected: check your API project's key, available credits, model access and usage. Do not send the secret key to troubleshoot.
- HTML or downloaded PHP instead of JSON: PHP execution or upload layout is wrong. Do not activate the companion until hosting executes the endpoint as PHP.
- Session/origin errors: sign in again and use the exact WordPress canonical HTTPS hostname.
- Server setup error: check PHP version and private-file syntax/ownership. Avoid enabling public display of errors.
- Provider timeout: there is no automatic retry. A request already sent may still be processed/billed; choose whether to retry.

## Verification performed

Passed JavaScript regression tests for sensors/scoring, NASA radiation, bone, ECG replay, guidance and cloud chat. Cloud tests cover consent, limited snapshots, stale/low-quality exclusion, form submission, history and mode reset. PHP syntax and pure validation tests passed. Local HTTP tests with mock WordPress/OpenAI passed administrator access, nonce, origin, consent, response handling, request caps and content-free counters. No real key or health data was sent in testing. Actual Porkbun login behavior, browser layout and live OpenAI answers require the acceptance steps above.

Official implementation references, checked 14 November 2026:
- https://developers.openai.com/api/docs/quickstart
- https://developers.openai.com/api/reference/resources/responses/methods/create
- https://developers.openai.com/api/docs/models/gpt-5.6-terra
- https://developer.wordpress.org/reference/functions/wp_verify_nonce/
- https://developer.wordpress.org/reference/functions/current_user_can/
