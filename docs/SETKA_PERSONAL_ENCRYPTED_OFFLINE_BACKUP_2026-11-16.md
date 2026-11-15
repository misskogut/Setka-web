# SETKA Web — encrypted on-device personal fallback

During Supabase HTTP 402, the existing SETKA Web local personal history remains usable on the **same browser/device**, if the browser preserves its storage. This is not equivalent to working Auth or a live server and cannot enable sign-in on a new device.

## User-controlled recovery file

- Open **Я → Зашифрованный резерв**, select a strong password (minimum 12 characters), and save an encrypted JSON file in the device Files app.
- The file includes a whitelisted copy of sessions, notes, states/symptoms, checkins, events, exposures, intervals, opened patterns, physiology, invitations, settings, and favorites. It **does not include account passwords, login tokens, Supabase credentials or service-role keys**.
- Encryption is performed entirely in the browser using PBKDF2-SHA256 (250,000 iterations, fresh random salt) and AES-256-GCM (fresh nonce). Neither passwords nor source records are uploaded.
- To restore, choose the saved file in the same screen and enter the password. It merges entries with current local state using the existing tested SETKA private-corpus merge routine, not by destructive replacement.
- An archive exported while signed in to Tester ID X cannot be imported while signed in to Tester ID Y or as a guest.
- Keep the password separately. **Losing it makes the backup unreadable**. A browser can delete its own local storage. Verify the downloaded file before clearing or replacing the device.
- This is a **manual user-owned backup**, NOT an automated cross-device sync, GitHub user-data server, complete PostgreSQL backup, or substitute for Supabase Auth.
- Never commit user history, plain JSON, credentials or unencrypted database records to the public SETKA Web repository. If an owner later puts the encrypted JSON in a private GitHub repository, that is an explicit separate action and does not change the app backend.

## Restore and testing

- This feature loads after the local personal corpus engine, and requires a secure HTTPS context for WebCrypto.
- Before releasing, run `node --test tests/setka-personal-encrypted-backup.test.mjs`; verify export/import and download behavior in mobile Safari / iOS webview manually.
- Do not change Supabase schemas, account identities, guest ID bindings, or active sync/retention policies without a separate reviewed migration.
- This utility does not automatically archive server-only records that were never downloaded to the current device. Server-side encrypted backups require a separately protected destination, audited access control and a tested recovery key workflow.

## Missing published audio

`Мур` is already mirrored as the SHA-256 verified Release asset `setka-original-37986ae9035f1d4bb8863a6d.wav` and was restored to the 27-track static music catalogue.

`Монахи` has SHA-256 `8893480d85154840053d0d6b5c64478af58d017f43a07c1e5cd5d062d106f7d7` and expected length 53,210,026 bytes. It is absent from GitHub Release and current Supabase Storage. The last original importer exhausted five Yandex download attempts, each HTTP 500; the alternate Supabase streaming route is currently 402. Do not claim the asset is mirrored without byte-for-byte SHA-256 verification.
