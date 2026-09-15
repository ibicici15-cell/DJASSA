// Modèle économique : freemium + abonnements + boost à la carte.
//
// Compte GRATUIT : 3 publications par MOIS CALENDAIRE (10 pendant la promo de
// lancement), pas un quota d'annonces "actives en même temps" — supprimer ou
// vendre une annonce ne libère PAS de nouvelle publication ce mois-ci (sinon
// on pourrait publier→vendre→supprimer→republier en boucle pour contourner la
// limite). Le compteur se réinitialise automatiquement le 1er de chaque mois.
// Une fois le quota du mois atteint, il faut soit attendre le mois suivant,
// soit s'abonner (l'abonnement lève cette limite mensuelle, voir plus bas).
//
// Compte ABONNÉ (Pro/Premium) : plus de limite mensuelle — à la place, un
// quota CONCURRENT FIXE (annonces actives en même temps, ex. Pro => 25),
// indépendant du quota gratuit ou d'une éventuelle promo de lancement en
// cours. "Actives" exclut les annonces vendues/louées : les marquer comme
// telles libère bien de la place pour en publier une nouvelle.
//
// Aucun paiement ne transite par la plateforme (Orange/MTN Money, Wave,
// directement sur le numéro de la plateforme) donc l'activation est manuelle,
// faite par un admin après vérification de la réception du paiement.

// Quota gratuit — ajustable automatiquement pour une promo de lancement.
// Change UNIQUEMENT ces deux lignes le jour où tu veux démarrer/arrêter la
// promo : aucune autre modification, aucun rebuild à refaire ensuite, ça
// bascule tout seul à la date indiquée à chaque fois que l'app se recharge.
const LAUNCH_PROMO_QUOTA = 20; // quota pendant la promo de lancement
const LAUNCH_PROMO_END = new Date("2026-09-30T00:00:00"); // fin de la promo (ajuste cette date)
const NORMAL_QUOTA = 8; // quota habituel une fois la promo terminée — plus élevé qu'en immobilier, un même vendeur publie souvent plusieurs objets à la fois

export const FREE_LISTING_QUOTA = Date.now() < LAUNCH_PROMO_END.getTime() ? LAUNCH_PROMO_QUOTA : NORMAL_QUOTA;

// Tarifs volontairement plus bas qu'un site immobilier : les articles vendus
// ici ont des tickets moyens bien plus faibles, l'abonnement/boost doit rester
// rentable pour un vendeur qui écoule des objets à quelques milliers de FCFA.
export const SUBSCRIPTION_PLANS = [
  {
    id: "starter",
    label: "Gratuit",
    totalQuota: null, // utilise FREE_LISTING_QUOTA (quota mensuel, voir plus haut)
    price: 0,
    description: "Pour découvrir la plateforme.",
  },
  {
    id: "pro",
    label: "Pro",
    totalQuota: 25,
    price: 5000,
    duration: "1 mois",
    boostCredits: 5,
    boostCreditDays: 15,
    description: "25 annonces actives. 5 boosts de 15 jours inclus chaque mois.",
  },
  {
    id: "premium",
    label: "Premium",
    totalQuota: 50,
    price: 9000,
    duration: "1 mois",
    boostCredits: 10,
    boostCreditDays: 30,
    description: "50 annonces actives. 10 boosts de 30 jours inclus chaque mois.",
  },
];

// Boosts à prix DYNAMIQUE : un pourcentage du prix de l'annonce boostée,
// borné par un plancher (jamais dérisoire) et un plafond (jamais excessif sur
// les articles chers). Ajustable ici en un seul endroit si besoin après
// quelques semaines d'usage réel.
export const BOOST_PLANS = [
  { id: "boost1", label: "Boost 24 heures", days: 1, percent: 0.01, floor: 50, cap: 1500, bonusHours: 0 },
  { id: "boost3", label: "Boost 3 jours", days: 3, percent: 0.02, floor: 50, cap: 3500, bonusHours: 1 },
  { id: "boost7", label: "Boost 7 jours", days: 7, percent: 0.035, floor: 100, cap: 6000, bonusHours: 3 },
  { id: "boost30", label: "Boost 30 jours", days: 30, percent: 0.06, floor: 150, cap: 15000, bonusHours: 24 },
];

// Calcule le prix réel d'un boost pour une annonce donnée. Arrondi à la
// dizaine de FCFA la plus proche pour un montant qui reste simple à annoncer.
export function getBoostPrice(planId, listingPrix) {
  const plan = getBoostPlan(planId);
  if (!plan) return 0;
  const raw = Number(listingPrix || 0) * plan.percent;
  const bounded = Math.min(plan.cap, Math.max(plan.floor, raw));
  return Math.round(bounded / 10) * 10;
}

export const PAYMENT_INSTRUCTIONS = {
  orangeMoney: "+225 07 77 33 65 94",
  mtnMoney: "+225 05 06 86 17 82",
  wave: "+225 05 85 99 93 13",
  note: "Indiquez la référence du paiement ci-dessous. Activation sous peu après vérification.",
};

export function getSubscriptionPlan(id) {
  return SUBSCRIPTION_PLANS.find((p) => p.id === id) || SUBSCRIPTION_PLANS[0];
}
export function getBoostPlan(id) {
  return BOOST_PLANS.find((p) => p.id === id);
}

// Un abonnement payant actif et non expiré (indépendamment du rôle admin,
// géré à part). Utilisé à la fois pour le quota d'annonces concurrentes et
// pour savoir si le compteur mensuel gratuit s'applique ou non.
export function isPlanActive(profile) {
  return !!(
    profile?.plan &&
    profile.plan !== "starter" &&
    profile.planActive &&
    (!profile.planExpiresAt || new Date(profile.planExpiresAt).getTime() > Date.now())
  );
}

// Quota CONCURRENT (annonces actives en même temps) — ne s'applique qu'aux
// comptes avec un abonnement payant actif : quota FIXE du plan (25 pour Pro,
// 50 pour Premium), indépendant du quota gratuit ou d'une promo en cours.
// Les comptes gratuits ne sont PAS limités par ce quota concurrent : ils sont
// limités par le compteur MENSUEL (voir checkPublishEligibility dans lib/listings.js),
// qui ne se contourne pas en supprimant/revendant une annonce.
export function getTotalQuota(profile) {
  if (!profile) return FREE_LISTING_QUOTA;
  if (profile.role === "admin" || profile.role === "superadmin") return Infinity;
  if (!isPlanActive(profile)) return FREE_LISTING_QUOTA;
  const plan = getSubscriptionPlan(profile.plan);
  return plan.totalQuota ?? FREE_LISTING_QUOTA;
}
