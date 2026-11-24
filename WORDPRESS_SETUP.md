# Fix the private-path problem with WordPress settings

The diagnostic showed PHP running under /srv/htdocs with no visible config file in the checked SFTP/private locations. This method uses WordPress storage and needs no filesystem-path mapping.

## 1. Install the configuration plugin

Download AURA_WordPress_Settings_Plugin.zip. Keep this ZIP compressed.

In WordPress, open Plugins > Add New Plugin > Upload Plugin. Choose the ZIP, click Install Now, then Activate Plugin. The plugin is named AURA Companion Setup.

Open Settings > AURA Companion. Paste your OpenAI API key into the password field, without quotes or PHP code. Keep the daily limit at 100 initially. Click Save settings. The saved key will not be displayed again; a blank field afterward is intentional.

If Upload Plugin is not available, use FileZilla to upload the extracted aura-companion-setup folder into /htdocs/wp-content/plugins/, then activate AURA Companion Setup in WordPress > Plugins. Do not put the plugin in dashboard/api. If the hosting account disallows custom plugins, ask hosting support to enable custom-plugin installation.

## 2. Update the AURA endpoint

Download AURA_WordPress_Settings_API.zip and extract it. Upload all three files inside its api folder into /htdocs/dashboard/api/, overwriting matching files. They are chat.php, chat-core.php and private-paths.php. The dashboard HTML and JavaScript need no change for this fix.

## 3. Test

Stay signed in as a WordPress administrator, refresh AURA, and click Check AI connection. This checks local settings and login, not the OpenAI account itself.

Then select Explore demo. Review the health snapshot and sharing consent; send: "How does my resting heart rate compare with my baseline?" The result should identify synthetic/demo values. The first send verifies actual API credentials, model access, billing/credits and hosting outbound HTTPS.

## What changed

The key is encrypted in a non-autoloaded WordPress option using AES-256-GCM with a key derived from the WordPress authentication salt. Keep WordPress, its database and backups protected; this does not protect against a compromised site. Changing WordPress salts requires saving the API key again.

Request limits are atomic database increments: 6 per UTC calendar minute and the configured daily cap. No questions or health snapshots are stored in these counters. Rejected provider calls still count as attempts. Old counters are periodically removed during subsequent requests. These caps are not a fixed dollar budget.

With the plugin active, WordPress settings take precedence over config.php. Removing the key from the settings page disables cloud chat and does not fall back to an old file. After successful setup, delete the obsolete /homedir/aura-private/config.php through FileZilla to remove the unused extra copy of your key. Do not delete WordPress's wp-config.php.

Deactivation retains the encrypted setting. Use Remove stored key on the settings page before deactivating/uninstalling if you want it erased.

## Verification and limits

PHP syntax, encryption round trip, tamper/salt-change rejection, settings-page non-disclosure, configuration precedence and minute/day counter logic were tested using mocked WordPress/database interfaces. The endpoint's validation tests passed. Actual plugin installation, database queries on Porkbun and live API answers must be verified on your website. No API key or health data was sent during development tests.
