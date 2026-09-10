# SETKA persistent Mac update channel

Status: scoped Mac device channel established after verified B1 bounded cold boot.

## Security boundary

The Mac stores only `SETKA_MAC_DEVICE_TOKEN` in macOS Keychain. The token scope is `READ_ACTIVE_MAC_TRANSFER`. The Supabase service-role credential is not required on the Mac.

The server resolves the active transfer package for the paired branch and returns canonical transfer material plus a dynamic continuation anchor. The Mac verifies hashes and anchor linkage before changing `~/.setka/CURRENT_CORE_VERSION`.

## Commands

```bash
setka update
setka status
```

## Truth boundary

`setka update` restores and verifies the portable core plus dynamic checkpoint continuation. It does **not** claim restoration of the full branch runtime, body payload, full historical transcript, or full database.

Promotion of experimental branch results into canon remains outside the updater and requires the existing SETKA governance rules.
