import { supabase } from "./supabase";
import { getBoostPlan, getSubscriptionPlan } from "../data/plans";

// Système de notification simple, sans dépendance à un champ dédié : on
// retient dans le navigateur (localStorage) la date de la dernière vérification
// pour cet utilisateur, et on affiche un toast pour chaque demande résolue depuis.
function storageKey(userId) {
  return `mondjassa_notif_seen_${userId}`;
}

export async function checkForNotifications(userId, showToast) {
  if (!userId || !showToast) return;
  const lastSeen = localStorage.getItem(storageKey(userId));
  const lastSeenTime = lastSeen ? new Date(lastSeen).getTime() : 0;
  let newest = lastSeenTime;

  try {
    const { data: subs } = await supabase
      .from("subscriptionRequests")
      .select("*")
      .eq("user", userId)
      .neq("status", "en_attente");
    for (const r of subs || []) {
      const t = new Date(r.validatedAt || r.updated).getTime();
      if (t > lastSeenTime) {
        const plan = getSubscriptionPlan(r.planId);
        showToast(
          r.status === "validee"
            ? `Votre abonnement "${plan.label}" a été activé ✓`
            : `Votre demande d'abonnement "${plan.label}" a été refusée.`,
          r.status === "validee" ? "success" : "error"
        );
      }
      if (t > newest) newest = t;
    }
  } catch {
    // silencieux : les notifications ne doivent jamais bloquer l'app
  }

  try {
    const { data: boosts } = await supabase
      .from("boostRequests")
      .select("*")
      .eq("user", userId)
      .neq("status", "en_attente");
    for (const r of boosts || []) {
      const t = new Date(r.validatedAt || r.updated).getTime();
      if (t > lastSeenTime) {
        const plan = getBoostPlan(r.planId);
        showToast(
          r.status === "validee"
            ? `Votre demande de boost (${plan?.label || "boost"}) a été activée ✓`
            : `Votre demande de boost a été refusée.`,
          r.status === "validee" ? "success" : "error"
        );
      }
      if (t > newest) newest = t;
    }
  } catch {
    // silencieux
  }

  if (newest > lastSeenTime) {
    localStorage.setItem(storageKey(userId), new Date(newest).toISOString());
  }
}

// ---------- Rappels d'expiration (abonnement / boost) ----------
// Un seul rappel, affiché quand il reste peu de temps avant l'expiration.
// La fenêtre de rappel s'adapte à la durée totale du plan : ~8% du temps
// total, entre 2h minimum et 48h (2 jours) maximum. Concrètement :
//   boost 3 jours   -> rappel à ~6h de la fin
//   boost 10 jours  -> rappel à ~1 jour de la fin
//   boost/abonnement 30 jours -> rappel à ~2 jours de la fin
function reminderWindowHours(totalDays) {
  const totalHours = totalDays * 24;
  return Math.min(48, Math.max(2, totalHours * 0.08));
}

function expiryStorageKey(type, id) {
  return `mondjassa_expiry_reminded_${type}_${id}`;
}

export async function checkExpiryReminders(userId, showToast) {
  if (!userId || !showToast) return;
  const now = Date.now();

  // Abonnement (durée fixe : 1 mois = 30 jours)
  try {
    const { data: me } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (me?.plan && me.plan !== "starter" && me.planActive && me.planExpiresAt) {
      const expiresAt = new Date(me.planExpiresAt).getTime();
      const hoursLeft = (expiresAt - now) / 3600000;
      const windowH = reminderWindowHours(30);
      const key = expiryStorageKey("sub", userId);
      const alreadyKey = localStorage.getItem(key);
      if (hoursLeft > 0 && hoursLeft <= windowH && alreadyKey !== me.planExpiresAt) {
        const label = hoursLeft >= 24 ? `${Math.round(hoursLeft / 24)} jour(s)` : `${Math.round(hoursLeft)}h`;
        showToast(`Votre abonnement expire dans environ ${label}. Pensez à le renouveler pour ne pas perdre vos annonces actives.`, "info");
        localStorage.setItem(key, me.planExpiresAt);
      }
    }
  } catch {
    // silencieux
  }

  // Boosts sur les annonces de l'utilisateur
  try {
    const { data: myListings } = await supabase.from("listings").select("*").eq("owner", userId);
    for (const l of myListings || []) {
      if (!l.boostedUntil) continue;
      const expiresAt = new Date(l.boostedUntil).getTime();
      const hoursLeft = (expiresAt - now) / 3600000;
      if (hoursLeft <= 0) continue;

      // Retrouve la durée totale du boost via la dernière demande validée pour cette annonce.
      let totalDays = 3;
      try {
        const { data: req } = await supabase
          .from("boostRequests")
          .select("planId")
          .eq("listing", l.id)
          .eq("status", "validee")
          .order("created", { ascending: false })
          .limit(1)
          .maybeSingle();
        const boostPlan = req && getBoostPlanDays(req.planId);
        if (boostPlan) totalDays = boostPlan;
      } catch {
        // pas de demande retrouvée (ex: boost manuel admin) -> valeur par défaut
      }

      const windowH = reminderWindowHours(totalDays);
      const key = expiryStorageKey("boost", l.id);
      const alreadyKey = localStorage.getItem(key);
      if (hoursLeft <= windowH && alreadyKey !== l.boostedUntil) {
        const label = hoursLeft >= 24 ? `${Math.round(hoursLeft / 24)} jour(s)` : `${Math.round(hoursLeft)}h`;
        showToast(`Le boost de "${l.titre}" expire dans environ ${label}.`, "info");
        localStorage.setItem(key, l.boostedUntil);
      }
    }
  } catch {
    // silencieux
  }
}

function getBoostPlanDays(planId) {
  const map = { boost3: 3, boost10: 10, boost30: 30 };
  return map[planId];
}
