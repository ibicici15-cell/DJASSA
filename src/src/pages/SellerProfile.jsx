import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { listReviewsForUser, averageRating } from "../lib/reviews";
import { searchListings } from "../lib/listings";
import { useAuth } from "../contexts/AuthContext";
import AvatarCircle from "../components/AvatarCircle";
import ListingCard from "../components/ListingCard";
import ReviewModal from "../components/ReviewModal";
import { Star } from "lucide-react";

export default function SellerProfile() {
  const { userId } = useParams();
  const { user } = useAuth();
  const [seller, setSeller] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    setLoading(true);
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle()
      .then(({ data }) => setSeller(data))
      .catch(() => setSeller(null))
      .finally(() => setLoading(false));
    refreshReviews();
  }, [userId]);

  function refreshReviews() {
    listReviewsForUser(userId).then(setReviews).catch(() => {});
  }

  useEffect(() => {
    if (!seller) return;
    // On récupère toutes les annonces disponibles puis on filtre par propriétaire
    // (searchListings ne prend pas de filtre "owner" public pour l'instant).
    searchListings({ take: 200 }).then((all) => setListings(all.filter((l) => l.owner === userId)));
  }, [seller, userId]);

  const avg = averageRating(reviews);
  const canReview = user && user.id !== userId;

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-16">Chargement...</div>;
  if (!seller) return <div className="max-w-4xl mx-auto px-4 py-16">Ce profil n'existe pas ou n'est plus disponible.</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="fiche rounded-lg p-6 mb-8 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <AvatarCircle record={seller} size={16} />
          <div>
            <h1 className="font-display text-3xl mb-1">{seller.nom}</h1>
            <p className="flex items-center gap-1 text-sm">
              <Star className="w-4 h-4 text-or-500 fill-or-500" />
              {avg !== null ? (<><b>{avg.toFixed(1)}</b> / 5 <span className="text-encre-700/50">({reviews.length} avis)</span></>) : (
                <span className="text-encre-700/50">Aucun avis pour l'instant</span>
              )}
            </p>
          </div>
        </div>
        {canReview && (
          <button onClick={() => setShowReview(true)} className="text-sm border border-ocre-500 text-ocre-600 px-4 py-2 rounded hover:bg-ocre-500 hover:text-sable-50 transition-colors shrink-0">
            ⭐ Laisser un avis
          </button>
        )}
      </div>

      <div className="mb-10">
        {reviews.length === 0 ? (
          <p className="text-sm text-encre-700/60">Aucun avis pour l'instant.</p>
        ) : (
          <>
            <button onClick={() => setShowDetails((v) => !v)}
              className="flex items-center gap-2 text-sm font-medium hover:text-ocre-600 transition-colors">
              <span className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < Math.round(avg) ? "text-or-500 fill-or-500" : "text-encre-700/20"}`} />
                ))}
              </span>
              {reviews.length} avis
              <span className="text-encre-700/50 underline">{showDetails ? "masquer" : "voir les avis"}</span>
            </button>

            {showDetails && (
              <div className="space-y-2 mt-3">
                {reviews.slice(0, 8).map((r) => (
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

      <h2 className="font-display text-xl mb-3">Annonces de {seller.nom}</h2>
      {listings.length === 0 ? (
        <p className="text-sm text-encre-700/60">Aucune annonce active pour l'instant.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
        </div>
      )}

      <div className="mt-10">
        <Link to="/annonces" className="text-sm text-ocre-600 underline">← Retour aux annonces</Link>
      </div>

      {showReview && (
        <ReviewModal
          targetUserId={userId}
          userId={user.id}
          onClose={() => { setShowReview(false); refreshReviews(); }}
        />
      )}
    </div>
  );
}
