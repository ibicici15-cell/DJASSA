-- ============================================================================
-- MonDjassa — 0003 : remplace les 3 triggers cassés (créés via l'interface
-- Database Webhooks, ou modifiés depuis) par un appel direct et correct à
-- pg_net. Le trigger existant appelait supabase_functions.http_request(...)
-- avec un argument "method" — incompatible avec la version de pg_net installée
-- ici (0.20.4), dont http_post n'a pas ce paramètre (il n'envoie que du POST).
--
-- ⚠️ Avant d'exécuter : remplace TA_SERVICE_ROLE_KEY ci-dessous par ta vraie
-- clé (Project Settings → API → service_role). Ne la recolle jamais dans le
-- chat ensuite.
-- ============================================================================

drop trigger if exists hook_subscriptions on public."subscriptionRequests";
drop trigger if exists hook_boost on public."boostRequests";
drop trigger if exists messages_hook on public.messages;

create or replace function public.call_push_notify()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := 'https://iazfnihpelneynwalfgd.supabase.co/functions/v1/push-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer TA_SERVICE_ROLE_KEY'
    ),
    body := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', to_jsonb(NEW),
      'old_record', case when TG_OP = 'UPDATE' then to_jsonb(OLD) else null end
    ),
    timeout_milliseconds := 5000
  );
  return NEW;
end;
$$;

create trigger messages_push_notify
  after insert on public.messages
  for each row execute function public.call_push_notify();

create trigger subscription_requests_push_notify
  after update on public."subscriptionRequests"
  for each row execute function public.call_push_notify();

create trigger boost_requests_push_notify
  after update on public."boostRequests"
  for each row execute function public.call_push_notify();
