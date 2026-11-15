# SETKA Web personal offline backup — demo safeguard

## What it does
- Local SETKA Web data already persists in scoped \`localStorage\` with a durable IndexedDB fallback (\`standalone-storage-v1.js\`, \`standalone-core-v34.js\`).
- Users can now choose **Я → Зашифрованный резерв** (or **Аккаунт → Зашифрованная копия моей истории**) to export a password-protected \`.setkabak\` file.
- Encryption is entirely in the browser: AES-256-GCM, random 96-bit nonce, PBKDF2-SHA256 with 240,000 iterations and random salt. Neither the password nor the plaintext is uploaded to GitHub, Supabase, a CDN, or SETKA.
- The file includes ONLY the currently loaded, identity-scoped local history and favorites: sessions, notes, states, events, physiological samples, settings, and replay-related metadata.
- A user can restore with the password in the **same account scope**; guest restoration additionally requires the original local device ID. Restoring MERGES records; it never clears the current archive or claims a successful server sync.
- The browser must retain its local owner session to distinguish Tester IDs. New registration, password verification, invitation creation and cross-device online sync still require working APIs.

## What it does NOT do
- This is NOT a backup of all Supabase users, server-side research history, Auth credentials, or private data not already present on the device.
- It does NOT upload private user data into the public SETKA GitHub repository.
- It does NOT enable a new user to sign in to an unavailable server.
- It does NOT encrypt the browser's everyday localStorage/IndexedDB at rest. Encrypting the downloadable export is a separate protection.
- Browser and OS storage can still be cleared without warning; the user must separately preserve the exported file and password.
- A local-only file is not an automatic secondary cloud backend. A future secure server-side replication system needs user-scoped authentication, encryption, ownership checks and verified restore tests.

## Original music inventory
- 27 of 28 public soundtrack originals are now SHA/size-verified in GitHub Releases and in the fallback catalog, including "Мур".
- "Монахи" is not in that GitHub Release: expected SHA-256 \`8893480d85154840053d0d6b5c64478af58d017f43a07c1e5cd5d062d106f7d7\`, size \`53,210,026\` bytes.
- The Yandex original is repeatedly HTTP 500 from GitHub Actions, while the alternate Supabase route is HTTP 402. No invented substitute or unsafe mismatched filename is allowed.
- Once the actual original becomes available, upload it to GitHub Releases, verify SHA/size, then update \`standalone-music-public-snapshot-v1.json\` with a new release-verified entry.

## Tests and rollback
Run:
\`\`\`sh
node --check standalone-personal-offline-vault-v1.mjs
node --test tests/setka-personal-offline-vault.test.mjs
\`\`\`
The existing public failover CI runs these independently of the unavailable Supabase API. Feature consists of a standalone module, one script include and one menu link in each of the existing local "Me" and account views. Undoing these additions does not alter stored cloud or local archives.
