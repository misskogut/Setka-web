-- Empty disposable PostgreSQL CI service only, after pattern-defaults-v2.sql.
\set ON_ERROR_STOP on
create table public.prototype_v34_tester_codes(tester_id text primary key,claim_hash text unique not null,active boolean default true,updated_at timestamptz default now());
create table public.prototype_v40_tester_accounts(tester_id text primary key references public.prototype_v34_tester_codes,active boolean default true,password_set_at timestamptz,updated_at timestamptz default now());
create table public.prototype_v40_tester_sessions(id uuid primary key default gen_random_uuid(),tester_id text references public.prototype_v40_tester_accounts,token_hash text unique,expires_at timestamptz,revoked_at timestamptz);
create table public.prototype_v41_account_favorites(tester_id text references public.prototype_v40_tester_accounts,config_key text,pattern_id text,config jsonb default '{}',saved_at timestamptz default now(),updated_at timestamptz default now(),primary key(tester_id,config_key));
create table public.prototype_v41_account_sessions(tester_id text references public.prototype_v40_tester_accounts,session_id text,started_at timestamptz,ended_at timestamptz,updated_at timestamptz default now(),primary key(tester_id,session_id));
create table public.prototype_v41_account_exposures(tester_id text references public.prototype_v40_tester_accounts,exposure_id text,session_id text,pattern_id text,config_key text,duration_ms bigint default 0,started_at timestamptz,ended_at timestamptz,updated_at timestamptz default now(),primary key(tester_id,exposure_id));
create table public.prototype_v36_public_notes(id uuid primary key,author_tester_id text references public.prototype_v40_tester_accounts);
create table public.prototype_v41_note_saves(note_id uuid references public.prototype_v36_public_notes,saver_tester_id text references public.prototype_v40_tester_accounts,primary key(note_id,saver_tester_id));
\ir ../research-v1/sql/account-cohorts.sql
\ir account-cohorts-db.sql
