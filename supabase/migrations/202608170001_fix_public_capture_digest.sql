-- Fix pgcrypto resolution for the public lead capture function on Supabase.
-- Supabase installs pgcrypto functions in the extensions schema.
begin;

alter function public.capture_external_lead(
  text, text, text, text, text, text, text, text, text, text, text, text
) set search_path = public, extensions, pg_temp;

commit;
