import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ListingCard from "../components/ListingCard";
import { CATEGORIES, TRANSACTION_TYPES, VILLES_CI, ETATS } from "../data/categories";
import { CategoryIcon } from "../data/categoryIcons";
import { searchListings, toggleFavorite, listenFavorites } from "../lib/listings";
import { useAuth } from "../contexts/AuthContext";

const SORT_OPTIONS = [
  { value: "recent", label: "Plus récentes" },
  { value: "prixAsc", label: "Prix croissant" },
  { value: "prixDesc", label: "Prix décroissant" },
];

export default function BrowseListings() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    categorie: searchParams.get("categorie") || "",
    transaction: "", ville: searchParams.get("ville") || "",
    prixMin: "", prixMax: "", etat: "", q: searchParams.get("q") || "",
    dateMin: "", dateMax: "",
    sort: "recent",
  });
  const [listings, setListings] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  // Se resynchronise à chaque changement d'URL (recherche, clic sur un lien de
  // catégorie ou de ville depuis l'accueil/la nav), même si on est déjà sur la
  // page Annonces — sinon un second clic/une nouvelle recherche ne changeait rien à l'écran.
  useEffect(() => {
    const cat = searchParams.get("categorie") || "";
    const ville = searchParams.get("ville") || "";
    const q = searchParams.get("q") || "";
    setFilters((f) => (f.categorie === cat && f.ville === ville && f.q === q ? f : { ...f, categorie: cat, ville, q }));
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    return listenFavorites(user.id, setFavorites);
  }, [user]);

  useEffect(() => {
    setLoading(true);
    searchListings(filters).then((r) => { setListings(r); setLoading(false); });
  }, [filters]);

  async function handleToggleFavorite(listingId, isFav) {
    if (!user) return;
    // Mise à jour immédiate de l'affichage, sans attendre l'aller-retour temps
    // réel (qui pouvait prendre quelques secondes et donnait l'impression que
    // le clic n'avait rien fait).
    setFavorites((prev) => (isFav ? prev.filter((id) => id !== listingId) : [...prev, listingId]));
    try {
      await toggleFavorite(user.id, listingId, isFav);
    } catch (err) {
      // En cas d'échec, on annule le changement optimiste.
      setFavorites((prev) => (isFav ? [...prev, listingId] : prev.filter((id) => id !== listingId)));
    }
  }

  const hasActiveFilters = Object.entries(filters).some(([k, v]) => k !== "sort" && v);

  function resetFilters() {
    setFilters({
      categorie: "", transaction: "", ville: "",
      prixMin: "", prixMax: "", etat: "", q: "",
      dateMin: "", dateMax: "", sort: "recent",
    });
    setSearchParams({});
  }

  function update(patch) {
    setFilters((f) => ({ ...f, ...patch }));
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="font-display text-2xl sm:text-3xl mb-1">
        {filters.q ? `Résultats pour "${filters.q}"` : "Annonces"}
      </h1>
      {filters.q && (
        <button onClick={() => update({ q: "" })} className="text-sm text-ocre-600 hover:underline mb-5">
          ✕ Effacer la recherche
        </button>
      )}
      {!filters.q && <div className="mb-6" />}

      {/* Catégories en icônes, scrollables sur mobile */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        <button onClick={() => update({ categorie: "" })}
          className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-full text-sm border ${!filters.categorie ? "bg-encre-950 text-sable-50 border-encre-950" : "border-encre-700/30"}`}>
          Toutes
        </button>
        {CATEGORIES.map((c) => (
          <button key={c.id} onClick={() => update({ categorie: c.id })}
            className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-full text-sm border ${filters.categorie === c.id ? "bg-ocre-500 text-sable-50 border-ocre-500" : "border-encre-700/30"}`}>
            <CategoryIcon id={c.id} className="w-4 h-4" />
            {c.label}
          </button>
        ))}
        {hasActiveFilters && (
          <button onClick={resetFilters}
            className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-full text-sm border border-ocre-500 text-ocre-600 hover:bg-ocre-500/10">
            ✕ Réinitialiser les filtres
          </button>
        )}
      </div>

      <div className="fiche rounded p-4 mb-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <select value={filters.transaction} onChange={(e) => update({ transaction: e.target.value })}
            className="border border-encre-700/30 rounded px-3 py-2 bg-sable-50 text-sm focus-ring">
            <option value="">Vente ou location</option>
            {TRANSACTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={filters.ville} onChange={(e) => update({ ville: e.target.value })}
            className="border border-encre-700/30 rounded px-3 py-2 bg-sable-50 text-sm focus-ring">
            <option value="">Toutes les villes</option>
            {VILLES_CI.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={filters.sort} onChange={(e) => update({ sort: e.target.value })}
            className="border border-encre-700/30 rounded px-3 py-2 bg-sable-50 text-sm focus-ring col-span-2 sm:col-span-1">
            {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button onClick={() => setShowMoreFilters((v) => !v)}
            className="border border-encre-700/30 rounded px-3 py-2 text-sm hover:border-ocre-500">
            {showMoreFilters ? "Moins de filtres" : "Prix / état"}
          </button>
        </div>

        {showMoreFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-encre-700/15">
            <input type="number" placeholder="Prix min (FCFA)" value={filters.prixMin}
              onChange={(e) => update({ prixMin: e.target.value })}
              className="border border-encre-700/30 rounded px-3 py-2 bg-sable-50 text-sm focus-ring" />
            <input type="number" placeholder="Prix max (FCFA)" value={filters.prixMax}
              onChange={(e) => update({ prixMax: e.target.value })}
              className="border border-encre-700/30 rounded px-3 py-2 bg-sable-50 text-sm focus-ring" />
            <select value={filters.etat} onChange={(e) => update({ etat: e.target.value })}
              className="border border-encre-700/30 rounded px-3 py-2 bg-sable-50 text-sm focus-ring">
              <option value="">Tout état</option>
              {ETATS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
            <div>
              <label className="block text-[11px] text-encre-700/50 mb-1">Publiée après le</label>
              <input type="date" value={filters.dateMin}
                onChange={(e) => update({ dateMin: e.target.value })}
                className="w-full border border-encre-700/30 rounded px-3 py-2 bg-sable-50 text-sm focus-ring" />
            </div>
            <div>
              <label className="block text-[11px] text-encre-700/50 mb-1">Publiée avant le</label>
              <input type="date" value={filters.dateMax}
                onChange={(e) => update({ dateMax: e.target.value })}
                className="w-full border border-encre-700/30 rounded px-3 py-2 bg-sable-50 text-sm focus-ring" />
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-encre-700/60">Chargement...</p>
      ) : listings.length === 0 ? (
        <p className="text-encre-700/60">Aucune annonce ne correspond à ces critères pour l'instant.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} isFavorite={favorites.includes(l.id)} onToggleFavorite={handleToggleFavorite} />
          ))}
        </div>
      )}
    </div>
  );
}
