import { supabase, watchTable } from "./supabase";
import { getBoostPlan, getSubscriptionPlan } from "../data/plans";
import { normalizeListing, normalizeRequest, normalizeUser } from "./normalize";
import { sendMessage } from "./listings";

// ---------- Statistiques & listes globales (lecture admin) ----------
// Nécessite que la table autorise la lecture aux admins (voir les policies RLS
// dans supabase/migrations/0001_init.sql).

function watch(table, cb, normalize, onError) {
  let cancelled = false;
  async function refresh() {
    try {
      const { data, error } = await supabase.from(table).select("*").order("created", { ascending: false });
      if (error) throw error;
      if (!cancelled) cb(normalize ? data.map(normalize) : data);
    } catch (err) {
      console.error(`[admin] échec du chargement de "${table}" :`, err);
      if (!cancelled && onError) onError(err);
    }
  }
  refresh();
  const unwatch = watchTable(`admin-${table}`, { table }, refresh);
  return () => { cancelled = true; unwatch(); };
}

export function listenAllUsers(cb, onError) {
  let cancelled = false;
  async function refresh() {
    try {
      const { data, error } = await supabase.rpc("admin_list_users");
      if (error) throw error;
      if (!cancelled) cb((data || []).map(normalizeUser));
    } catch (err) {
      console.error("[admin] échec du chargement des comptes :", err);
      if (!cancelled && onError) onError(err);
    }
  }
  refresh();
  const unwatch = watchTable("admin-profiles", { table: "profiles" }, refresh);
  return () => { cancelled = true; unwatch(); };
}
export function listenAllListings(cb, onError) {
  return watch("listings", cb, normalizeListing, onError);
}
export function listenAllSubscriptionRequests(cb, onError) {
  return watch("subscriptionRequests", cb, normalizeRequest, onError);
}
export function listenAllBoostRequests(cb, onError) {
  return watch("boostRequests", cb, normalizeRequest, onError);
}

// ---------- Validation des demandes (activation manuelle après paiement Mobile Money) ----------

export async function approveSubscriptionRequest(request) {
  const plan = getSubscriptionPlan(request.planId);
  const expires = await computeSubscriptionExpiry(request.user);
  const { error: e1 } = await supabase.from("profiles").update({
    plan: plan.id,
    planActive: true,
    planExpiresAt: expires.toISOString(),
    boostCredits: plan.boostCredits || 0,
    boostCreditDays: plan.boostCreditDays ?? null,
  }).eq("id", request.user);
  if (e1) throw e1;
  const { error: e2 } = await supabase.from("subscriptionRequests").update({
    status: "validee",
    validatedAt: new Date().toISOString(),
  }).eq("id", request.id);
  if (e2) throw e2;
  return expires.toISOString();
}

// Si l'abonnement en cours n'a pas encore expiré, on ajoute le nouveau mois au
// temps restant (cumul) plutôt que de repartir de "maintenant" — même logique
// que pour les boosts.
async function computeSubscriptionExpiry(userId) {
  const { data: u } = await supabase.from("profiles").select("planActive, planExpiresAt").eq("id", userId).maybeSingle();
  const now = Date.now();
  const currentExpiry = u?.planExpiresAt ? new Date(u.planExpiresAt).getTime() : 0;
  const base = u?.planActive && currentExpiry > now ? currentExpiry : now;
  const expires = new Date(base);
  expires.setMonth(expires.getMonth() + 1);
  return expires;
}

export async function rejectSubscriptionRequest(request) {
  const { error } = await supabase.from("subscriptionRequests").update({
    status: "refusee",
    validatedAt: new Date().toISOString(),
  }).eq("id", request.id);
  if (error) throw error;
}

export async function approveBoostRequest(request) {
  const plan = getBoostPlan(request.planId);
  const until = await computeBoostUntil(request.listing, plan);
  const { error: e1 } = await supabase.from("listings").update({ boostedUntil: until.toISOString() }).eq("id", request.listing);
  if (e1) throw e1;
  const { error: e2 } = await supabase.from("boostRequests").update({
    status: "validee",
    validatedAt: new Date().toISOString(),
  }).eq("id", request.id);
  if (e2) throw e2;
  return until.toISOString();
}

// Calcule la nouvelle date de fin de boost : si l'annonce est déjà boostée et
// que ce boost n'est pas encore terminé, on AJOUTE la nouvelle durée au temps
// restant (cumul) plutôt que de repartir de "maintenant" — sinon un
// renouvellement fait avant expiration ferait perdre le temps restant.
// On ajoute aussi un petit bonus (en heures) selon la formule choisie.
async function computeBoostUntil(listingId, plan) {
  const { data: listing } = await supabase.from("listings").select("boostedUntil").eq("id", listingId).maybeSingle();
  const now = Date.now();
  const currentExpiry = listing?.boostedUntil ? new Date(listing.boostedUntil).getTime() : 0;
  const base = currentExpiry > now ? currentExpiry : now;
  const durationMs = (plan.days * 24 + (plan.bonusHours || 0)) * 3600 * 1000;
  return new Date(base + durationMs);
}

export async function rejectBoostRequest(request) {
  const { error } = await supabase.from("boostRequests").update({
    status: "refusee",
    validatedAt: new Date().toISOString(),
  }).eq("id", request.id);
  if (error) throw error;
}

// ---------- Gestion des utilisateurs ----------

export async function setUserRole(userId, role) {
  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) throw error;
}

export async function suspendUser(userId, suspended) {
  const { error } = await supabase.from("profiles").update({ suspended }).eq("id", userId);
  if (error) throw error;
}

// Avertit un utilisateur pour non-respect de la charte (article interdit, faux
// signalement fondé...). Envoie un message explicatif, et bloque
// automatiquement le compte dès le 2e avertissement (règle "avertissement
// puis blocage en cas de récidive" annoncée dès l'inscription).
export async function warnUser(userId, reason) {
  const { data: profile, error: readError } = await supabase
    .from("profiles").select('nom, "warningsCount"').eq("id", userId).maybeSingle();
  if (readError) throw readError;

  const newCount = (profile?.["warningsCount"] || 0) + 1;
  const willBeBanned = newCount >= 2;

  const { error: updateError } = await supabase.from("profiles")
    .update({ warningsCount: newCount, ...(willBeBanned ? { suspended: true } : {}) })
    .eq("id", userId);
  if (updateError) throw updateError;

  const { data: me } = await supabase.auth.getUser();
  const adminId = me?.user?.id;
  if (adminId) {
    const text = willBeBanned
      ? `⚠️ Compte bloqué\n\nMotif : ${reason}\n\nCeci est votre 2e avertissement pour non-respect des règles de la plateforme. Conformément à la charte acceptée à l'inscription, votre compte est désormais bloqué. Contactez l'agence via ce message si vous souhaitez des explications.`
      : `⚠️ Avertissement\n\nMotif : ${reason}\n\nCeci est un premier avertissement pour non-respect des règles de la plateforme (voir la charte). En cas de récidive, votre compte sera bloqué. Nous comptons sur votre compréhension.`;
    await sendMessage(null, null, [adminId, userId], adminId, text);
  }

  return { newCount, willBeBanned };
}

export async function deleteUserAccount(userId) {
  // On ne supprime plus vraiment le compte d'authentification : ça permet
  // d'afficher un message clair ("compte désactivé, contactez l'agence") à la
  // connexion au lieu du message générique "identifiants incorrects" que
  // Supabase Auth renvoie pour un compte qui n'existe plus (voir AuthContext.login).
  const { error } = await supabase.from("profiles").update({ deleted: true, suspended: true }).eq("id", userId);
  if (error) throw error;
}

export async function restoreUserAccount(userId) {
  const { error } = await supabase.from("profiles").update({ deleted: false, suspended: false }).eq("id", userId);
  if (error) throw error;
}

// Activation directe d'un abonnement par l'admin, sans passer par une demande
// en attente (utile si le paiement a été confirmé par téléphone par exemple).
export async function grantSubscription(userId, planId) {
  const plan = getSubscriptionPlan(planId);
  const expires = await computeSubscriptionExpiry(userId);
  const { error } = await supabase.from("profiles").update({
    plan: plan.id,
    planActive: true,
    planExpiresAt: expires.toISOString(),
    boostCredits: plan.boostCredits || 0,
    boostCreditDays: plan.boostCreditDays ?? null,
  }).eq("id", userId);
  if (error) throw error;
  return expires.toISOString();
}

// ---------- Gestion des annonces (modération) ----------

// Retire l'annonce des résultats publics SANS la supprimer : le propriétaire
// continue de la voir dans "Mes annonces", avec un message expliquant qu'elle
// a été retirée par l'administration (voir MyListings.jsx).
export async function adminDeleteListing(listingId) {
  const { error } = await supabase.from("listings").update({ removedByAdmin: true }).eq("id", listingId);
  if (error) throw error;
}

export async function adminRestoreListing(listingId) {
  const { error } = await supabase.from("listings").update({ removedByAdmin: false }).eq("id", listingId);
  if (error) throw error;
}

export async function adminSetListingStatus(listingId, status) {
  const { error } = await supabase.from("listings").update({ status }).eq("id", listingId);
  if (error) throw error;
}

// Boost manuel par l'admin, sans passer par une demande (ex: geste commercial,
// paiement confirmé par un autre canal). Cumule aussi avec le temps restant.
export async function adminBoostListing(listingId, days) {
  const plan = { days, bonusHours: 0 };
  const until = await computeBoostUntil(listingId, plan);
  const { error } = await supabase.from("listings").update({ boostedUntil: until.toISOString() }).eq("id", listingId);
  if (error) throw error;
  return until.toISOString();
}
