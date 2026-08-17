-- One WhatsApp phone number must never route events to two organizations.
-- Embedded Signup stores the Meta Phone Number ID in external_account_id.

begin;

create unique index if not exists integration_connections_whatsapp_phone_uk
  on public.integration_connections (external_account_id)
  where provider = 'whatsapp' and external_account_id is not null;

comment on index public.integration_connections_whatsapp_phone_uk is
  'Prevents a WhatsApp Phone Number ID from being connected to multiple tenants.';

commit;

