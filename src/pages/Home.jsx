import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Search, ShieldCheck } from "lucide-react";
import { CATEGORIES } from "../data/categories";
import { CategoryBadge } from "../data/categoryIcons";
import { getPlatformStats, searchListings, toggleFavorite, listenFavorites } from "../lib/listings";
import { useAuth } from "../contexts/AuthContext";
import ListingCard from "../components/ListingCard";

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [aLaUne, setALaUne] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    getPlatformStats().then(setStats).catch(() => {});
    searchListings({ sort: "recent", take: 8 })
      .then((all) => setALaUne(all.slice(0, 8)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) { setFavorites([]); return; }
    return listenFavorites(user.id, setFavorites);
  }, [user]);

  async function handleToggleFavorite(listingId, isFav) {
    if (!user) { navigate("/connexion"); return; }
    setFavorites((prev) => (isFav ? prev.filter((id) => id !== listingId) : [...prev, listingId]));
    try {
      await toggleFavorite(user.id, listingId, isFav);
    } catch {
      setFavorites((prev) => (isFav ? [...prev, listingId] : prev.filter((id) => id !== listingId)));
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    navigate(q.trim() ? `/annonces?q=${encodeURIComponent(q.trim())}` : "/annonces");
  }

  return (
    <div>
      <section className="relative overflow-hidden" style={{ backgroundColor: "#1D3E5C" }}>
        <img src="/hero-objects.svg" alt="" aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none" />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 55% 75% at 50% 40%, rgba(29,62,92,0.68) 0%, rgba(29,62,92,0.22) 60%, rgba(29,62,92,0) 100%)" }} />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-14 sm:py-20 text-center">
          <h1 className="font-display font-bold text-2xl sm:text-4xl md:text-5xl leading-[1.15] text-sable-50 mb-3">
            Achetez, vendez, échangez —<br className="hidden sm:block" /> partout en Côte d'Ivoire
          </h1>
          <p className="text-sable-50/80 text-sm sm:text-base mb-8">
            Électronique, mode, meubles, véhicules et plus — entre particuliers, sans intermédiaire.
          </p>

          <form onSubmit={handleSearch} className="flex items-center bg-white rounded-full p-1.5 sm:p-2 shadow-lg max-w-xl mx-auto">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-encre-700/40 ml-2.5 sm:ml-3 shrink-0" />
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Que recherchez-vous ?"
              className="flex-1 bg-transparent px-2 sm:px-3 py-2 text-sm sm:text-base outline-none min-w-0"
            />
            <button type="submit" className="bg-encre-950 hover:bg-encre-800 text-sable-50 text-sm sm:text-base px-4 sm:px-6 py-2.5 rounded-full transition-colors shrink-0">
              Rechercher
            </button>
          </form>

          {stats && stats.totalListings > 0 && (
            <p className="text-sable-50/70 text-xs sm:text-sm mt-5">
              +{Math.max(0, stats.totalListings - 1)} articles déjà disponibles sur MonDjassa
            </p>
          )}
        </div>
      </section>

      {/* Précaution, pleine largeur, sous le hero — message complet, pas raccourci. */}
      <section className="bg-ocre-500/10 border-b border-ocre-500/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex gap-3 sm:gap-4 items-start">
          <div className="w-9 h-9 rounded-full bg-white text-ocre-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-sm sm:text-base mb-1">Prudence dans vos démarches</h2>
            <p className="text-xs sm:text-sm text-encre-700/80 leading-relaxed">
              Inspectez toujours l'article avant de payer, privilégiez une remise en main propre dans un lieu
              public et fréquenté, et méfiez-vous de toute demande d'argent avant livraison ou par un canal
              inhabituel. En cas de doute, <Link to="/messages?agence=1" className="text-ocre-600 underline font-medium">contactez-nous directement via la messagerie</Link>.
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-4 sm:gap-5">
          {CATEGORIES.map((c) => (
            <Link key={c.id} to={`/annonces?categorie=${c.id}`} className="flex flex-col items-center text-center gap-2 group">
              <div className="group-hover:-translate-y-0.5 transition-transform">
                <CategoryBadge id={c.id} size={64} iconSize={26} />
              </div>
              <span className="text-xs sm:text-sm leading-tight text-encre-900">{c.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {aLaUne.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 border-t border-encre-950/5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-semibold text-lg sm:text-xl">Annonces en vedette</h2>
            <Link to="/annonces" className="text-sm text-ocre-600 hover:text-ocre-500">Voir tout →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {aLaUne.map((l) => (
              <ListingCard key={l.id} listing={l} isFavorite={favorites.includes(l.id)} onToggleFavorite={handleToggleFavorite} />
            ))}
          </div>
        </section>
      )}

      <section className="bg-white border-t border-encre-950/5 py-10 sm:py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="font-display font-semibold text-lg sm:text-xl mb-8 text-center">Comment ça marche</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { n: "1", title: "Publiez ou parcourez", text: "Créez un compte gratuit et publiez votre article en quelques minutes, ou parcourez les annonces disponibles." },
              { n: "2", title: "Échangez en toute confiance", text: "Contactez directement le vendeur par message ou téléphone, et consultez son profil et ses avis." },
              { n: "3", title: "Concluez", text: "Retrouvez-vous, vérifiez l'article et finalisez l'échange directement avec l'autre partie — sans intermédiaire ni commission cachée." },
            ].map((step) => (
              <div key={step.n} className="text-center">
                <div className="w-9 h-9 rounded-full bg-indigo-500 text-sable-50 font-display font-semibold text-base flex items-center justify-center mx-auto mb-3">
                  {step.n}
                </div>
                <h3 className="font-display font-semibold text-base mb-1">{step.title}</h3>
                <p className="text-sm text-encre-700/70">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
