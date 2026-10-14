// The account/source unique index is partial. PostgREST's onConflict column
// list cannot name its predicate. Keep that existing constraint and write only
// a row belonging to the authenticated account; never fall back to device owner.
export async function savePendingNote(db, {testerId, source, row, readExisting, initial}) {
  let current = initial;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (current?.moderation_status === 'pending' ||
        (current?.moderation_status === 'published' && current.is_public)) {
      return {record: current, already: true};
    }
    let query;
    if (current) {
      query = db.from('prototype_v36_public_notes').update(row)
        .eq('id', current.id).eq('author_tester_id', testerId)
        .eq('source_note_key', source);
      query = current.moderation_status == null
        ? query.is('moderation_status', null)
        : query.eq('moderation_status', current.moderation_status);
    } else {
      query = db.from('prototype_v36_public_notes').insert(row);
    }
    const result = await query.select('id,visual_capsule_key,moderation_status,is_public,submitted_at,published_at').maybeSingle();
    if (result.error && result.error.code !== '23505') throw result.error;
    if (!result.error && result.data) return {record: result.data, already: false};
    // A concurrent submission or moderation may have won. Read by account
    // identity, then observe its status instead of resetting it to pending.
    current = await readExisting(testerId, source);
    if (!current && result.error) throw result.error;
  }
  throw new Error('note_changed_during_submission');
}
