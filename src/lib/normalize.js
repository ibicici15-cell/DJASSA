// Avec Postgres/Supabase, les colonnes "select" (role, plan, categorie...)
// sont toujours renvoyées comme de simples chaînes : plus besoin de gérer le
// cas "tableau" propre à PocketBase. Ces fonctions sont conservées telles
// quelles (mêmes noms) pour ne pas avoir à toucher tous les fichiers qui les
// importent ; elles se contentent maintenant d'appliquer une valeur par défaut.

export function scalar(value, fallback) {
  return value === undefined || value === null || value === "" ? fallback : value;
}

export function normalizeUser(u) {
  if (!u) return u;
  return {
    ...u,
    role: scalar(u.role, "user"),
    plan: scalar(u.plan, "starter"),
  };
}

export function normalizeListing(l) {
  if (!l) return l;
  return {
    ...l,
    categorie: scalar(l.categorie),
    transaction: scalar(l.transaction),
    status: scalar(l.status, "disponible"),
  };
}

export function normalizeRequest(r) {
  if (!r) return r;
  return {
    ...r,
    planId: scalar(r.planId),
    status: scalar(r.status, "en_attente"),
  };
}

// Message d'erreur lisible à partir d'une erreur Supabase/PostgREST
// (conservé sous ce nom pour éviter de modifier tous les appelants).
export function pbErrorMessage(err) {
  return err?.error_description || err?.message || "Une erreur est survenue.";
}
