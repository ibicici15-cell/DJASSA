import { useState } from "react";
import { BOOST_PLANS, getBoostPrice } from "../data/plans";
import PaymentInstructions from "./PaymentInstructions";
import { requestBoost, useIncludedBoost } from "../lib/listings";
import { useToast } from "../contexts/ToastContext";
import { pbErrorMessage } from "../lib/normalize";
import { TrendingUp, Star, Eye, Sparkles } from "lucide-react";

const BENEFITS = [
  { icon: TrendingUp, text: "Remonte en tête des résultats" },
  { icon: Star, text: "Badge \"EN AVANT\" visible" },
  { icon: Eye, text: "Plus de vues et de contacts" },
];

// `profile` optionnel : si fourni et boostCredits > 0, propose l'option
// "boost inclus" (déjà payé via l'abonnement Pro/Premium), en plus des
// options payantes à l'unité.
export default function BoostModal({ listing, onClose, userId, profile }) {
  const { showToast } = useToast();
  const [boostPlan, setBoostPlan] = useState(BOOST_PLANS[0].id);
  const [transactionRef, setTransactionRef] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [useCredit, setUseCredit] = useState(false);

  // Une annonce ne peut consommer qu'un seul boost inclus dans sa vie, même
  // après expiration — au-delà, seul le boost payant reste disponible dessus.
  const creditAlreadyUsedOnThisListing = !!listing.freeBoostUsed;
  const credits = creditAlreadyUsedOnThisListing ? 0 : (profile?.boostCredits || 0);
  const creditDays = profile?.boostCreditDays;
  const eligiblePlans = creditDays ? BOOST_PLANS.filter((p) => p.days === creditDays) : BOOST_PLANS;

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (useCredit) {
        const plan = BOOST_PLANS.find((p) => p.id === boostPlan);
        await useIncludedBoost(userId, listing.id, plan.days);
        showToast("Boost inclus appliqué ✓", "success");
        onClose();
        return;
      }
      await requestBoost(userId, listing.id, boostPlan, transactionRef);
      setSent(true);
    } catch (err) {
      showToast("Échec : " + pbErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-encre-950/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-sable-50 rounded p-5 sm:p-6 max-w-sm sm:max-w-md w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {sent ? (
          <div>
            <h3 className="font-display text-xl mb-2">Demande envoyée</h3>
            <p className="text-sm mb-4">Votre boost sera activé après vérification du paiement. Merci !</p>
            <button onClick={onClose} className="text-sm underline">Fermer</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h3 className="font-display text-xl mb-1">Booster "{listing.titre}"</h3>
            <p className="text-xs text-encre-700/60 mb-4">Faites remonter votre annonce et gagnez en visibilité.</p>

            <div className="flex flex-wrap gap-x-3 gap-y-1 mb-4 text-xs text-encre-700/70">
              {BENEFITS.map((b, i) => (
                <span key={i} className="flex items-center gap-1">
                  <b.icon className="w-3.5 h-3.5 text-or-500 shrink-0" />
                  {b.text}
                </span>
              ))}
            </div>

            {credits > 0 && (
              <label className="flex items-center gap-2 mb-3 fiche border-or-400 rounded px-3 py-2 text-sm cursor-pointer">
                <input type="checkbox" checked={useCredit} onChange={(e) => {
                  setUseCredit(e.target.checked);
                  if (e.target.checked) setBoostPlan(eligiblePlans[0].id);
                }} />
                <Sparkles className="w-4 h-4 text-or-500 shrink-0" />
                Utiliser un boost inclus dans mon abonnement ({credits} restant{credits > 1 ? "s" : ""} ce mois-ci)
              </label>
            )}

            <div className="space-y-2 mb-4">
              {(useCredit ? eligiblePlans : BOOST_PLANS).map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="boost" checked={boostPlan === p.id} onChange={() => setBoostPlan(p.id)} />
                  {p.label}{!useCredit && ` — ${getBoostPrice(p.id, listing.prix).toLocaleString("fr-FR")} FCFA`}
                </label>
              ))}
            </div>

            {!useCredit && (
              <>
                <PaymentInstructions amount={getBoostPrice(boostPlan, listing.prix)} />
                <label className="block text-sm mb-1">Référence de la transaction</label>
                <input required value={transactionRef} onChange={(e) => setTransactionRef(e.target.value)}
                  className="w-full border border-encre-700/30 rounded px-3 py-2 text-sm mb-4 focus-ring bg-sable-50" />
              </>
            )}

            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="flex-1 border border-encre-700/30 rounded py-2 text-sm">Annuler</button>
              <button disabled={loading} type="submit" className="flex-1 bg-or-500 text-encre-950 rounded py-2 text-sm disabled:opacity-50">
                {loading ? "..." : useCredit ? "Utiliser ce boost inclus" : "Confirmer"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
