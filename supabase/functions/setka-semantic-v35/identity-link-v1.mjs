// Verified guest-to-account association for V2 analytics.
// This is NOT an authentication flow. Call only after the existing
// session-token + device-hash authentication succeeded in index.ts.
// It never rewrites guest events or reads private notes, states, passwords.
const valid=x=>typeof x==="string"&&x.length>0&&x.length<=180&&/^[A-Za-z0-9_:.\-]+$/.test(x);

export async function linkVerifiedGuestDevice(db,{deviceId,testerId}){
 if(!valid(deviceId)||!valid(testerId))return "invalid_identity";
 // Require an authenticated, consented account with immutable ownership
 // of this exact device; merely claiming a tester ID is insufficient.
 const [account,ownership,guest,links]=await Promise.all([
  db.from("prototype_v40_tester_accounts").select("tester_id,active,consent_at").eq("tester_id",testerId).maybeSingle(),
  db.from("prototype_v34_devices").select("subject_key").eq("device_id",deviceId).maybeSingle(),
  db.from("setka_research_events_v2").select("event_id").eq("device_id",deviceId).eq("actor_type","guest").limit(1),
  db.from("setka_research_identity_links_v1").select("account_id").eq("device_id",deviceId).limit(2)
 ]);
 for(const r of [account,ownership,guest,links])if(r.error)throw r.error;
 if(account.data?.tester_id!==testerId||account.data?.active!==true||!account.data?.consent_at)return "consent_required";
 if(ownership.data?.subject_key!==testerId)return "device_not_verified";
 if((guest.data||[]).length===0)return "no_guest_events";
 // Never merge an observed device into a different registered identity.
 if((links.data||[]).some(l=>l.account_id!==testerId))return "identity_conflict";
 if((links.data||[]).some(l=>l.account_id===testerId))return "already_linked";
 const result=await db.from("setka_research_identity_links_v1").upsert(
  {device_id:deviceId,account_id:testerId,linked_at:new Date().toISOString(),link_source:"verified_v41_account_sync"},
  {onConflict:"device_id,account_id",ignoreDuplicates:true}
 );
 if(result.error)throw result.error;
 return "linked";
}
