-- SETKA Mac mirror hardening: avoid global ORDER BY ctid sorts on large no-PK tables.
-- Keeps already-running clients alive even after their timeout backoff reduced page size.
create or replace function public.setka_mac_full_mirror_chunk_internal_v1(
  p_device_ref text,
  p_token_hash text,
  p_schema_name text,
  p_table_name text,
  p_cursor jsonb default null::jsonb,
  p_offset bigint default 0,
  p_limit integer default 1000,
  p_include_count boolean default false
) returns jsonb
language plpgsql
security definer
set search_path to '', 'pg_temp'
set statement_timeout to '120s'
as $function$
declare
  v_cred foundation.mac_transfer_credentials_v1%rowtype;
  v_rel oid;
  v_pk_cols text[];
  v_pk_order text;
  v_pk_left text;
  v_pk_right text;
  v_rows jsonb:='[]'::jsonb;
  v_raw_rows jsonb:='[]'::jsonb;
  v_last jsonb;
  v_next_cursor jsonb:=null;
  v_next_offset bigint:=p_offset;
  v_count bigint:=null;
  v_sql text;
  v_len integer;
  v_ctid text;
  v_page_limit integer:=p_limit;
  v_cursor_kind text;
  v_schemas text[] := array['foundation','diamond','public','setka_private','experiment_market_001','experiment_trading_001','experiment_weather_001','supabase_migrations','cron','net'];
begin
  if p_device_ref is null or p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then return jsonb_build_object('ok',false,'state','INVALID_DEVICE_CREDENTIAL'); end if;
  if not (p_schema_name=any(v_schemas)) or p_table_name is null or p_table_name !~ '^[A-Za-z_][A-Za-z0-9_]*$' then return jsonb_build_object('ok',false,'state','INVALID_MIRROR_RELATION'); end if;
  if p_limit<1 or p_limit>3000 or p_offset<0 then return jsonb_build_object('ok',false,'state','INVALID_MIRROR_PAGE'); end if;

  select * into v_cred from foundation.mac_transfer_credentials_v1
  where device_ref=p_device_ref and token_hash=p_token_hash and state='ACTIVE' and scope='READ_ACTIVE_MAC_TRANSFER'
    and coalesce((metadata->>'fullMirrorAccess')::boolean,false)=true and (expires_at is null or expires_at>clock_timestamp());
  if v_cred.device_ref is null then return jsonb_build_object('ok',false,'state','FULL_MIRROR_DEVICE_CREDENTIAL_REJECTED'); end if;

  select c.oid into v_rel from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where n.nspname=p_schema_name and c.relname=p_table_name and c.relkind in ('r','p');
  if v_rel is null then return jsonb_build_object('ok',false,'state','MIRROR_RELATION_NOT_FOUND'); end if;

  select array_agg(a.attname order by k.ord) into v_pk_cols
  from pg_catalog.pg_constraint con
  cross join lateral unnest(con.conkey) with ordinality k(attnum,ord)
  join pg_catalog.pg_attribute a on a.attrelid=con.conrelid and a.attnum=k.attnum
  where con.conrelid=v_rel and con.contype='p';

  if p_include_count then execute format('select count(*)::bigint from %I.%I',p_schema_name,p_table_name) into v_count; end if;

  if coalesce(array_length(v_pk_cols,1),0)>0 then
    v_cursor_kind:='PRIMARY_KEY';
    select string_agg(format('%I',x),',') into v_pk_order from unnest(v_pk_cols)x;
    select string_agg(format('t.%I',x),',') into v_pk_left from unnest(v_pk_cols)x;
    select string_agg(format('c.%I',x),',') into v_pk_right from unnest(v_pk_cols)x;
    if p_cursor is null or p_cursor='{}'::jsonb then
      v_sql:=format('select coalesce(jsonb_agg(to_jsonb(q)),''[]''::jsonb) from (select * from %I.%I order by %s limit $1) q',p_schema_name,p_table_name,v_pk_order);
      execute v_sql using v_page_limit into v_rows;
    else
      v_sql:=format('with c as (select * from jsonb_populate_record(null::%I.%I,$1)) select coalesce(jsonb_agg(to_jsonb(q)),''[]''::jsonb) from (select t.* from %I.%I t cross join c where (%s)>(%s) order by %s limit $2) q',p_schema_name,p_table_name,p_schema_name,p_table_name,v_pk_left,v_pk_right,v_pk_order);
      execute v_sql using p_cursor,v_page_limit into v_rows;
    end if;
    v_len:=jsonb_array_length(v_rows);
    if v_len>0 then v_last:=v_rows->(v_len-1); select jsonb_object_agg(x,v_last->x) into v_next_cursor from unnest(v_pk_cols)x; end if;
  else
    v_cursor_kind:='CTID_RANGE';
    v_page_limit:=greatest(p_limit,1000);
    v_ctid:=nullif(p_cursor->>'__ctid','');
    if v_ctid is null then
      v_sql:=format('select coalesce(jsonb_agg(to_jsonb(q)),''[]''::jsonb) from (select ctid::text as __ctid,t.* from %I.%I t where ctid >= ''(0,1)''::tid limit $1) q',p_schema_name,p_table_name);
      execute v_sql using v_page_limit into v_raw_rows;
    else
      v_sql:=format('select coalesce(jsonb_agg(to_jsonb(q)),''[]''::jsonb) from (select ctid::text as __ctid,t.* from %I.%I t where ctid > $1::tid limit $2) q',p_schema_name,p_table_name);
      execute v_sql using v_ctid,v_page_limit into v_raw_rows;
    end if;
    v_len:=jsonb_array_length(v_raw_rows);
    if v_len>0 then
      v_last:=v_raw_rows->(v_len-1);
      v_next_cursor:=jsonb_build_object('__ctid',v_last->>'__ctid');
      select coalesce(jsonb_agg(value-'__ctid'),'[]'::jsonb) into v_rows from jsonb_array_elements(v_raw_rows);
    else v_rows:='[]'::jsonb; end if;
    v_next_offset:=p_offset+v_len;
  end if;

  v_len:=jsonb_array_length(v_rows);
  return jsonb_build_object(
    'ok',true,'state','SETKA_MAC_FULL_MIRROR_CHUNK_READY','schemaName',p_schema_name,'tableName',p_table_name,
    'rows',v_rows,'rowCount',v_len,'exactTotal',v_count,'pkColumns',coalesce(to_jsonb(v_pk_cols),'[]'::jsonb),
    'cursorKind',v_cursor_kind,'requestedLimit',p_limit,'effectiveLimit',v_page_limit,
    'nextCursor',v_next_cursor,'nextOffset',v_next_offset,'done',(v_len<v_page_limit),
    'pageSha256',encode(extensions.digest(convert_to(v_rows::text,'UTF8'),'sha256'),'hex')
  );
end
$function$;
