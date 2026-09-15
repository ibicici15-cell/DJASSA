import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { SUBSCRIPTION_PLANS, getTotalQuota, getSubscriptionPlan, FREE_LISTING_QUOTA } from "../data/plans";
import PaymentInstructions from "../components/PaymentInstructions";
import { requestSubscription, listenMyListings, listenConversations, getContactCountsByListing } from "../lib/listings";
import { listReviewsForUser, averageRating } from "../lib/reviews";
import { supabase } from "../lib/supabase";
import { useToast } from "../contexts/ToastContext";
import { pbErrorMessage } from "../lib/normalize";
import { Star, Pencil, Eye, MessageCircle } from "lucide-react";
import AvatarCircle from "../components/AvatarCircle";

export default function Subscription() {
  const { user, profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const [selected, setSelected] = useState(null);
  const [transactionRef, setTransactionRef] = useState("");
  const [sent, setSent] = useState(false);

  const [listings, setListings] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [contactCounts, setContactCounts] = useState({});

  useEffect(() => {
    if (location.hash === "#offres") {
      // Petit délai pour laisser le temps au contenu de se rendre avant de défiler.
      const t = setTimeout(() => {
        document.getElementById("offres")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      return () => clearTimeout(t);
    }
  }, [location.hash]);

  const [editing, setEditing] = useState(false);
  const [nom, setNom] = useState(profile?.nom || "");
  const [telephone, setTelephone] = useState(profile?.telephone || "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [showReviewDetails, setShowReviewDetails] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Aperçu de la nouvelle photo choisie, avant enregistrement — avec
  // possibilité de l'annuler (×) et revenir à la photo actuelle.
  useEffect(() => {
    if (!avatarFile) { setAvatarPreview(null); return; }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  useEffect(() => {
    if (!user) return;
    const u1 = listenMyListings(user.id, setListings);
    const u2 = listenConversations(user.id, setConversations);
    listReviewsForUser(user.id).then(setReviews).catch(() => {});
    getContactCountsByListing(user.id).then(setContactCounts);
    return () => { u1(); u2(); };
  }, [user]);

  useEffect(() => {
    setNom(profile?.nom || "");
    setTelephone(profile?.telephone || "");
  }, [profile]);

  const quota = getTotalQuota(profile);
  const isAdmin = profile?.role === "admin" || profile?.role === "superadmin";
  const active = listings.filter((l) => l.status !== "supprime");
  const avg = averageRating(reviews);

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const update = { nom, telephone };
      if (avatarFile) {
        const ext = (avatarFile.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${user.id}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        update.avatar = path;
      }
      const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      setEditing(false);
      setAvatarFile(null);
      showToast("Profil mis à jour.", "success");
    } catch (err) {
      showToast("Échec : " + pbErrorMessage(err), "error");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await requestSubscription(user.id, selected.id, transactionRef);
      setSent(true);
    } catch (err) {
      showToast("Échec de la demande : " + pbErrorMessage(err), "error");
    }
  }

  if (!user) return <div className="max-w-2xl mx-auto px-4 py-16">Connectez-vous pour accéder à votre compte.</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      {/* En-tête profil */}
      <div className="fiche rounded-lg p-6 mb-8">
        {editing ? (
          <form onSubmit={handleSaveProfile} className="space-y-3">
            <div className="flex items-center gap-4">
              {avatarPreview ? (
                <div className="relative w-16 h-16 shrink-0">
                  <img src={avatarPreview} className="w-16 h-16 rounded-full object-cover" />
                  <button type="button" onClick={() => setAvatarFile(null)}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-encre-950 text-sable-50 text-xs flex items-center justify-center">
                    ×
                  </button>
                </div>
              ) : (
                <AvatarCircle record={profile} size={16} />
              )}
              <div>
                <label className="block text-sm mb-1">Photo de profil</label>
                <input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files[0] || null)} />
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1">Nom</label>
              <input value={nom} onChange={(e) => setNom(e.target.value)}
                className="w-full border border-encre-700/30 rounded px-3 py-2 text-sm focus-ring bg-sable-50" />
            </div>
            <div>
              <label className="block text-sm mb-1">Téléphone</label>
              <input value={telephone} onChange={(e) => setTelephone(e.target.value)}
                className="w-full border border-encre-700/30 rounded px-3 py-2 text-sm focus-ring bg-sable-50" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setEditing(false); setAvatarFile(null); }} className="border border-encre-700/30 rounded px-4 py-2 text-sm">Annuler</button>
              <button disabled={savingProfile} type="submit" className="bg-encre-950 text-sable-50 rounded px-4 py-2 text-sm disabled:opacity-50">
                {savingProfile ? "..." : "Enregistrer"}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <AvatarCircle record={profile} size={16} />
              <div>
                <h1 className="font-display text-3xl mb-1">{profile?.nom || "—"}</h1>
                <p className="text-sm text-encre-700/60">{profile?.email}{profile?.telephone ? ` · ${profile.telephone}` : ""}</p>
                <p className="flex items-center gap-1 mt-2 text-sm">
                  <Star className="w-4 h-4 text-or-500 fill-or-500" />
                  {avg !== null ? (<><b>{avg.toFixed(1)}</b> / 5 <span className="text-encre-700/50">({reviews.length} avis)</span></>) : (
                    <span className="text-encre-700/50">Aucun avis pour l'instant</span>
                  )}
                </p>
              </div>
            </div>
            <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-sm border border-encre-700/30 rounded px-3 py-1.5 hover:border-ocre-500">
              <Pencil className="w-3.5 h-3.5" /> Modifier
            </button>
          </div>
        )}
      </div>

      {/* Statistiques */}
      <h2 className="font-display text-xl mb-3">Visibilité</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        <StatCard label="Annonces actives" value={`${active.length}${quota === Infinity ? "" : `/${quota}`}`} />
        <StatCard icon={Eye} label="Vues totales" value={listings.reduce((s, l) => s + (l.views || 0), 0)} />
        <StatCard icon={MessageCircle} label="Contacts reçus" value={Object.values(contactCounts).reduce((s, n) => s + n, 0)} />
        <StatCard label="Annonces publiées" value={listings.length} />
      </div>

      {/* Avis reçus */}
      <div className="mb-10">
        <h2 className="font-display text-xl mb-3">Avis reçus</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-encre-700/60">Aucun avis pour l'instant.</p>
        ) : (
          <>
            <button onClick={() => setShowReviewDetails((v) => !v)}
              className="flex items-center gap-2 text-sm font-medium hover:text-ocre-600 transition-colors">
              <span className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < Math.round(avg) ? "text-or-500 fill-or-500" : "text-encre-700/20"}`} />
                ))}
              </span>
              {reviews.length} avis
              <span className="text-encre-700/50 underline">{showReviewDetails ? "masquer" : "voir les avis"}</span>
            </button>

            {showReviewDetails && (
              <div className="space-y-2 mt-3">
                {reviews.slice(0, 5).map((r) => (
                  <div key={r.id} className="fiche rounded p-3 text-sm">
                    <div className="flex items-center gap-1 mb-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? "text-or-500 fill-or-500" : "text-encre-700/20"}`} />
                      ))}
                    </div>
                    {r.comment && <p className="text-encre-700/80">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Abonnement */}
      <div id="offres" className="scroll-mt-24">
      {isAdmin ? (
        <div className="fiche rounded p-5 text-sm">
          En tant qu'administrateur, vous publiez sans limite — aucun abonnement n'est nécessaire pour votre compte.
        </div>
      ) : (
        <>
          <h2 className="font-display text-xl mb-1">Abonnement</h2>
          <p className="text-encre-700/70 mb-6 text-sm">
            Plan actuel : <b>{getSubscriptionPlan(profile?.plan).label}</b> — {quota === Infinity ? "annonces illimitées" : `${quota} annonces actives possibles`}.
            {profile?.plan && profile.plan !== "starter" && profile.planExpiresAt && (
              new Date(profile.planExpiresAt).getTime() > Date.now() ? (
                <> Valable jusqu'au <b>{new Date(profile.planExpiresAt).toLocaleDateString("fr-FR")}</b>.</>
              ) : (
                <> <span className="text-ocre-600">Expiré le {new Date(profile.planExpiresAt).toLocaleDateString("fr-FR")}.</span></>
              )
            )}
          </p>

          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            {SUBSCRIPTION_PLANS.filter((p) => p.id !== "starter").map((p) => (
              <div key={p.id} className="fiche rounded p-5 flex flex-col">
                <h3 className="font-display text-xl mb-1">{p.label}</h3>
                <p className="text-2xl font-display text-ocre-600 mb-1">{p.price.toLocaleString("fr-FR")} FCFA</p>
                <p className="text-xs text-encre-700/60 mb-3">/ {p.duration}</p>
                <ul className="text-sm space-y-1 mb-4">
                  <li>✓ Jusqu'à {p.totalQuota} annonces actives</li>
                  {p.boostCredits && (
                    <li>✓ {p.boostCredits} boost{p.boostCredits > 1 ? "s" : ""} inclus / mois{p.boostCreditDays ? ` (${p.boostCreditDays}j chacun)` : " (durée au choix)"}</li>
                  )}
                </ul>
                <p className="text-xs text-encre-700/60 mb-4 flex-1">{p.description}</p>
                {profile?.plan === p.id && profile?.planActive && (
                  <p className="text-xs text-indigo-600 mb-2">
                    Plan actuel · {profile.boostCredits || 0} boost{(profile.boostCredits || 0) > 1 ? "s" : ""} inclus restant{(profile.boostCredits || 0) > 1 ? "s" : ""} ce mois
                  </p>
                )}
                <button onClick={() => { setSelected(p); setSent(false); }}
                  className="bg-ocre-500 text-sable-50 py-2 rounded text-sm hover:bg-ocre-600">
                  Souscrire
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-encre-950/50 flex items-center justify-center p-4 z-50" onClick={() => setSelected(null)}>
          <div className="bg-sable-50 rounded p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            {sent ? (
              <div>
                <h3 className="font-display text-xl mb-2">Demande envoyée</h3>
                <p className="text-sm mb-4">Votre abonnement "{selected.label}" sera activé après vérification du paiement.</p>
                <button onClick={() => setSelected(null)} className="text-sm underline">Fermer</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h3 className="font-display text-xl mb-4">Souscrire — {selected.label}</h3>
                <PaymentInstructions amount={selected.price} />
                <label className="block text-sm mb-1">Référence de la transaction</label>
                <input required value={transactionRef} onChange={(e) => setTransactionRef(e.target.value)}
                  className="w-full border border-encre-700/30 rounded px-3 py-2 text-sm mb-4 focus-ring bg-sable-50" />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setSelected(null)} className="flex-1 border border-encre-700/30 rounded py-2 text-sm">Annuler</button>
                  <button type="submit" className="flex-1 bg-ocre-500 text-sable-50 rounded py-2 text-sm">Confirmer</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="fiche rounded p-4 text-center">
      {Icon && <Icon className="w-4 h-4 text-ocre-500 mx-auto mb-1" />}
      <p className="font-display text-2xl text-ocre-600">{value}</p>
      <p className="text-xs text-encre-700/60 mt-1">{label}</p>
    </div>
  );
}
