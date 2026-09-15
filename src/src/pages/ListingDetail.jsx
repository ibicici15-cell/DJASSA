import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getCategory, ETATS } from "../data/categories";
import { conversationId, getListing, incrementViews, sendMessage } from "../lib/listings";
import { listingPhotoUrl } from "../lib/supabase";
import BoostModal from "../components/BoostModal";
import ReviewModal from "../components/ReviewModal";
import { TrendingUp, Sparkles } from "lucide-react";

function formatPrix(prix, transaction) {
  const n = Number(prix).toLocaleString("fr-FR");
  return transaction === "location" ? `${n} FCFA / mois` : `${n} FCFA`;
}

export default function ListingDetail() {
  const { id } = useParams();
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [listing, setListing] = useState(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [showBoost, setShowBoost] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const viewCountedFor = useRef(null); // id de l'annonce déjà comptée, pour ne jamais compter deux fois la même visite

  useEffect(() => {
    getListing(id).then(setListing);
  }, [id]);

  useEffect(() => {
    // On attend que l'état de connexion soit stabilisé (authLoading === false)
    // avant de décider si le visiteur est le propriétaire — sinon, pendant
    // l'instant où la session n'est pas encore chargée, le propriétaire
    // pouvait être compté à tort comme un visiteur normal.
    if (!listing || authLoading) return;
    if (listing.owner === user?.id) return; // jamais compter le propriétaire
    if (viewCountedFor.current === id) return; // déjà compté pour cette visite
    viewCountedFor.current = id;
    incrementViews(id);
  }, [listing, user?.id, authLoading, id]);

  if (!listing) return <div className="max-w-4xl mx-auto px-4 py-16">Chargement...</div>;

  const isOwnerOrAdmin = user?.id === listing.owner || profile?.role === "admin" || profile?.role === "superadmin";
  if (listing.removedByAdmin && !isOwnerOrAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-2xl mb-2">Annonce indisponible</h1>
        <p className="text-encre-700/70">Cette annonce a été retirée par l'administration et n'est plus consultable.</p>
      </div>
    );
  }

  const cat = getCategory(listing.categorie);
  const isOwner = user?.id === listing.owner;
  const justPublished = location.state?.justPublished;
  const photosFailed = location.state?.photosFailed;

  async function handleSendMessage(e) {
    e.preventDefault();
    if (!user) { navigate("/connexion"); return; }
    const convId = conversationId(user.id, listing.owner, listing.id);
    await sendMessage(convId, listing.id, [user.id, listing.owner], user.id, message);
    setMessage("");
    setSent(true);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      {justPublished && photosFailed && isOwner && (
        <div className="fiche rounded-lg p-4 mb-6 text-sm border-ocre-500 text-ocre-700 bg-ocre-500/10">
          ⚠️ L'annonce a bien été publiée, mais l'envoi des photos a échoué. <Link to={`/publier/${listing.id}`} className="underline">Modifiez l'annonce</Link> pour réessayer de les ajouter.
        </div>
      )}
      {justPublished && isOwner && (
        location.state?.autoBoost ? (
          <div className="fiche rounded-lg p-4 mb-6 flex items-center gap-3 border-or-400">
            <span className="w-10 h-10 rounded-full bg-or-500/15 text-or-500 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <p className="font-display text-lg">Annonce publiée ✓ — boostée automatiquement</p>
              <p className="text-sm text-encre-700/70">
                Boost de {location.state.autoBoost.days} jours offert par votre forfait. Il vous reste{" "}
                {location.state.autoBoost.creditsLeft} boost{location.state.autoBoost.creditsLeft > 1 ? "s" : ""} gratuit{location.state.autoBoost.creditsLeft > 1 ? "s" : ""} ce mois-ci.
              </p>
              <Link to="/publier" className="inline-block mt-2 text-sm text-ocre-600 underline">Publier une autre annonce</Link>
            </div>
          </div>
        ) : (
          <div className="fiche rounded-lg p-4 mb-6 flex items-center justify-between gap-4 flex-wrap border-or-400">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-or-500/15 text-or-500 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </span>
              <div>
                <p className="font-display text-lg">Annonce publiée ✓</p>
                <p className="text-sm text-encre-700/70">
                  {profile?.plan === "pro"
                    ? "Boosts inclus épuisés ce mois. Passez à Premium pour plus de boosts, ou boostez maintenant."
                    : "Boostez-la pour remonter en tête des résultats et gagner plus de vues."}
                </p>
                <Link to="/publier" className="inline-block mt-1 text-sm text-ocre-600 underline">Publier une autre annonce</Link>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {profile?.plan === "pro" && (
                <Link to="/abonnement#offres" className="border border-or-500 text-or-600 px-4 py-2 rounded text-sm">Voir Premium</Link>
              )}
              <button onClick={() => setShowBoost(true)} className="bg-or-500 text-encre-950 px-4 py-2 rounded text-sm">
                Booster maintenant
              </button>
            </div>
          </div>
        )
      )}
      <div className="grid md:grid-cols-5 gap-8">
        <div className="md:col-span-3">
          <div className="aspect-[4/3] bg-encre-800 rounded overflow-hidden mb-3">
            {listing.photos?.length ? (
              <img src={listingPhotoUrl(listing.photos[activePhoto])} className="w-full h-full object-cover" alt={listing.titre} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sable-100/40 stamp text-xs">PAS DE PHOTO</div>
            )}
          </div>
          {listing.photos?.length > 1 && (
            <div className="flex gap-2 mb-6">
              {listing.photos.map((p, i) => (
                <button key={p} onClick={() => setActivePhoto(i)} className={`w-16 h-16 rounded overflow-hidden border-2 ${i === activePhoto ? "border-ocre-500" : "border-transparent"}`}>
                  <img src={listingPhotoUrl(p)} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="text-xs stamp text-indigo-600 mb-2">
            {cat?.label?.toUpperCase()} · {listing.transaction === "location" ? "LOCATION" : "VENTE"} · {listing.commune ? `${listing.commune}, ` : ""}{listing.ville}
          </div>
          <h1 className="font-display text-3xl mb-1">{listing.titre}</h1>
          {listing.complement && (
            <p className="text-sm text-encre-700/60 mb-2">📍 {listing.complement}</p>
          )}
          <p className="font-display text-2xl text-ocre-600 mb-6">{formatPrix(listing.prix, listing.transaction)}</p>

          <p className="text-encre-800 whitespace-pre-line mb-8">{listing.description}</p>

          <h2 className="font-display text-xl mb-3">Caractéristiques</h2>
          <div className="grid grid-cols-2 gap-3 mb-8">
            {listing.etat && (
              <div className="fiche rounded px-3 py-2 text-sm">
                <span className="text-encre-700/60">État: </span>
                <span className="font-medium">{ETATS.find((e) => e.value === listing.etat)?.label || listing.etat}</span>
              </div>
            )}
            {cat?.fields.map((f) => {
              const v = listing.specific?.[f.name];
              if (v === undefined || v === "") return null;
              return (
                <div key={f.name} className="fiche rounded px-3 py-2 text-sm">
                  <span className="text-encre-700/60">{f.label}: </span>
                  <span className="font-medium">{f.type === "boolean" ? (v ? "Oui" : "Non") : v}</span>
                </div>
              );
            })}
          </div>

          {isOwner && (
            <Link to={`/annonces/${id}/modifier`} className="inline-block border border-encre-700/30 rounded px-4 py-2 text-sm hover:border-ocre-500">
              Modifier cette annonce
            </Link>
          )}
        </div>

        <div className="md:col-span-2">
          <div className="fiche rounded p-5 sticky top-24">
            <h3 className="font-display text-lg mb-1">Contact</h3>
            <p className="text-sm mb-3">
              {listing.contactNom || listing.contactTelephone
                ? `${listing.contactNom || ""}${listing.contactNom && listing.contactTelephone ? " — " : ""}${listing.contactTelephone || ""}`
                : "Contactez le propriétaire via le message ci-dessous."}
            </p>

            {!isOwner && (
              <Link to={`/vendeur/${listing.owner}`} className="inline-block text-xs text-ocre-600 underline mb-4">
                Voir le profil du vendeur
              </Link>
            )}

            {!isOwner && (
              sent ? (
                <p className="text-indigo-600 text-sm">Message envoyé ✓</p>
              ) : (
                <form onSubmit={handleSendMessage} className="space-y-2">
                  <textarea required rows={3} value={message} onChange={(e) => setMessage(e.target.value)}
                    placeholder="Bonjour, je suis intéressé(e) par ce bien..."
                    className="w-full border border-encre-700/30 rounded px-3 py-2 text-sm focus-ring bg-sable-50" />
                  <button type="submit" className="w-full bg-encre-950 text-sable-50 py-2 rounded text-sm hover:bg-encre-900">
                    Envoyer un message
                  </button>
                </form>
              )
            )}

            {!isOwner && user && (
              <button onClick={() => setShowReview(true)} className="w-full mt-3 text-xs text-encre-700/60 underline">
                Laisser un avis sur ce vendeur
              </button>
            )}
          </div>
        </div>
      </div>

      {showReview && (
        <ReviewModal targetUserId={listing.owner} userId={user.id} onClose={() => setShowReview(false)} />
      )}

      {showBoost && (
        <BoostModal listing={listing} userId={user.id} profile={profile} onClose={() => setShowBoost(false)} />
      )}
    </div>
  );
}
