-- Mémorise, par utilisateur, la date jusqu'à laquelle les alertes
-- (abonnement / boost validés ou refusés) ont déjà été affichées.
-- Ainsi une alerte n'apparaît qu'une seule fois, sur le web comme sur Android.
alter table public.profiles add column if not exists "notifSeenAt" timestamptz;
