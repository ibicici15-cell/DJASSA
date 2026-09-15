import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { getCategory, ETATS } from "../data/categories";
import { listingPhotoUrl } from "../lib/supabase";

function formatPrix(prix, transaction) {
  const n = Number(prix).toLocaleString("fr-FR");
  return transaction === "location" ? `${n} FCFA/mois` : `${n} FCFA`;
}

function etatLabel(etat) {
  return ETATS.find((e) => e.value === etat)?.label || null;
}

function timeAgo(dateStr) {
  const diffH = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 3600000));
  if (diffH < 1) return "à l'instant";
  if (diffH < 24) return `il y a ${diffH}h`;
  const days = Math.floor(diffH / 24);
  return days === 1 ? "hier" : `il y a ${days}j`;
}

export default function ListingCard({ listing, isFavorite, onToggleFavorite }) {
  const cat = getCategory(listing.categorie);
  const isBoosted = listing.boostedUntil && new Date(listing.boostedUntil).getTime() > Date.now();
  const cover = listing.photos?.[0] ? listingPhotoUrl(listing.photos[0]) : null;

  return (
    <Link to={`/annonces/${listing.id}`} className="block bg-white rounded-xl border border-encre-950/10 hover:border-ocre-400 hover:shadow-md transition-all overflow-hidden group">
      <div className="relative aspect-square bg-sable-100 overflow-hidden">
        {cover ? (
          <img src={cover} alt={listing.titre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-encre-700/30 text-xs">Pas de photo</div>
        )}
        {isBoosted && (
          <span className="absolute top-2 left-2 stamp text-[9px] bg-or-500 text-encre-950 px-1.5 py-0.5 rounded">
            EN AVANT
          </span>
        )}
        {onToggleFavorite && (
          <button
            onClick={(e) => { e.preventDefault(); onToggleFavorite(listing.id, isFavorite); }}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow-sm"
            aria-label="Ajouter aux favoris"
          >
            <Heart className={`w-3.5 h-3.5 ${isFavorite ? "fill-ocre-500 text-ocre-500" : "text-encre-700/50"}`} />
          </button>
        )}
      </div>
      <div className="p-3">
        <p className="font-display font-semibold text-ocre-600 text-base leading-tight mb-1">{formatPrix(listing.prix, listing.transaction)}</p>
        <h3 className="text-sm text-encre-900 leading-snug line-clamp-2 mb-1.5">{listing.titre}</h3>
        <div className="flex items-center justify-between text-[11px] text-encre-700/55">
          <span className="truncate">{listing.commune ? `${listing.commune}, ` : ""}{listing.ville}</span>
          <span className="shrink-0 ml-1">{timeAgo(listing.created)}</span>
        </div>
        {etatLabel(listing.etat) && (
          <span className="inline-block mt-1.5 text-[10px] stamp text-indigo-600 bg-indigo-500/10 px-1.5 py-0.5 rounded">
            {etatLabel(listing.etat)}
          </span>
        )}
      </div>
    </Link>
  );
}
