-- Targeted service-only read of the existing product RAW archive.
-- Existing public view is security-invoker; never add SECURITY DEFINER.
-- No grants to anon/authenticated, no RLS changes, no data writes.
grant execute on function foundation.prototype_v34_lossless_archive_unfold_v2(text) to service_role;
grant select on foundation.prototype_v34_lossless_archive_blocks_v2 to service_role;
-- USAGE on foundation is already held by service_role (verified before applying).
-- Rollback, after disabling Research v1 archived reads:
-- revoke execute on function foundation.prototype_v34_lossless_archive_unfold_v2(text) from service_role;
-- revoke select on foundation.prototype_v34_lossless_archive_blocks_v2 from service_role;
