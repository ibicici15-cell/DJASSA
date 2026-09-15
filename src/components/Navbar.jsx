import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { listenUnreadCount, listenMyListings, listenFavorites } from "../lib/listings";
import { isAtLeastAdmin } from "../lib/roles";
import { CATEGORIES } from "../data/categories";
import { CategoryIcon } from "../data/categoryIcons";
import { ShoppingBag, Menu, X, Search, User, ChevronDown } from "lucide-react";

export default function Navbar() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [myListingsCount, setMyListingsCount] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [q, setQ] = useState("");
  const isAdmin = isAtLeastAdmin(profile?.role);

  useEffect(() => {
    if (!user) { setUnread(0); return; }
    return listenUnreadCount(user.id, setUnread);
  }, [user]);

  useEffect(() => {
    if (!user) { setMyListingsCount(0); setFavoritesCount(0); return; }
    const u1 = listenMyListings(user.id, (list) => setMyListingsCount(list.filter((l) => l.status !== "supprime").length));
    const u2 = listenFavorites(user.id, (list) => setFavoritesCount(list.length));
    return () => { u1(); u2(); };
  }, [user]);

  function closeMenu() { setMenuOpen(false); }
  function closeAccount() { setAccountOpen(false); }

  function handleSearch(e) {
    e.preventDefault();
    navigate(q.trim() ? `/annonces?q=${encodeURIComponent(q.trim())}` : "/annonces");
    closeMenu();
  }

  async function handleLogout() {
    await logout();
    closeAccount();
    closeMenu();
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-30 bg-sable-50/95 backdrop-blur border-b border-encre-950/10">
      {/* Ligne 1 : logo, recherche, compte — tout ce qui concerne l'utilisateur vit ici */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
        <Link to="/" className="font-display text-xl tracking-tight flex items-center gap-2 shrink-0" onClick={closeMenu}>
          <span className="w-8 h-8 rounded-lg bg-encre-950 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-4.5 h-4.5 text-ocre-400" strokeWidth={2} />
          </span>
          <span className="hidden sm:inline">Mon<span className="text-ocre-500">Djassa</span></span>
        </Link>

        <form onSubmit={handleSearch} className="flex-1 hidden sm:flex items-center bg-white border border-encre-950/15 rounded-full pl-4 pr-1 py-1 focus-within:border-ocre-500 transition-colors">
          <Search className="w-4 h-4 text-encre-700/40 shrink-0" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un article, une marque, une ville..."
            className="flex-1 bg-transparent px-2.5 py-1.5 text-sm outline-none"
          />
          <button type="submit" className="bg-ocre-500 hover:bg-ocre-600 text-sable-50 text-sm px-4 py-1.5 rounded-full transition-colors shrink-0">
            Rechercher
          </button>
        </form>

        <div className="flex items-center gap-2 sm:gap-3 ml-auto shrink-0">
          {user ? (
            <>
              <Link to="/publier" className="hidden sm:inline bg-encre-950 hover:bg-encre-800 text-sable-50 text-sm px-4 py-2 rounded-full transition-colors">
                + Déposer une annonce
              </Link>
              <Link to="/messages" className="relative hidden md:inline-flex p-2 hover:text-ocre-600 transition-colors" aria-label="Messages">
                ✉️
                {unread > 0 && (
                  <span className="absolute top-0 right-0 bg-ocre-500 text-sable-50 text-[10px] leading-none rounded-full w-4 h-4 flex items-center justify-center">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>

              {/* Menu compte, tout en haut : Mes annonces, Favoris, Mon profil, Admin, Déconnexion */}
              <div className="relative hidden md:block">
                <button onClick={() => setAccountOpen((v) => !v)}
                  className="flex items-center gap-1 text-sm text-encre-900 hover:text-ocre-600 transition-colors p-1.5 rounded-full hover:bg-encre-950/5">
                  <User className="w-5 h-5" />
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {accountOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={closeAccount} />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-encre-950/10 rounded-xl shadow-lg py-1.5 z-20 text-sm">
                      <Link to="/mes-annonces" onClick={closeAccount} className="flex items-center justify-between px-4 py-2 hover:bg-sable-100">
                        Mes annonces {myListingsCount > 0 && <span className="text-encre-700/50">{myListingsCount}</span>}
                      </Link>
                      <Link to="/favoris" onClick={closeAccount} className="flex items-center justify-between px-4 py-2 hover:bg-sable-100">
                        Favoris {favoritesCount > 0 && <span className="text-encre-700/50">{favoritesCount}</span>}
                      </Link>
                      <Link to="/abonnement#offres" onClick={closeAccount} className="block px-4 py-2 hover:bg-sable-100">
                        Mon profil
                      </Link>
                      {isAdmin && (
                        <Link to="/admin" onClick={closeAccount} className="block px-4 py-2 hover:bg-sable-100 text-indigo-600 font-medium">
                          Administration
                        </Link>
                      )}
                      <div className="border-t border-encre-950/10 mt-1 pt-1">
                        <button onClick={handleLogout} className="w-full text-left px-4 py-2 hover:bg-sable-100 text-ocre-600">
                          Déconnexion
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="hidden md:flex items-center gap-3">
              <Link to="/connexion" className="text-sm hover:text-ocre-600">Se connecter</Link>
              <Link to="/publier" className="bg-ocre-500 hover:bg-ocre-600 text-sable-50 text-sm px-4 py-2 rounded-full transition-colors">
                + Déposer une annonce
              </Link>
            </div>
          )}
          <button className="md:hidden p-2 -mr-2" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu">
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Ligne 2 : uniquement les catégories, façon site de petites annonces */}
      <div className="hidden md:block border-t border-encre-950/5 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center gap-5 h-11 text-sm overflow-x-auto">
          <Link to="/annonces" className="font-medium text-ocre-600 shrink-0 flex items-center gap-1.5">
            <Menu className="w-3.5 h-3.5" /> Toutes les catégories
          </Link>
          {CATEGORIES.map((c) => (
            <Link key={c.id} to={`/annonces?categorie=${c.id}`} className="text-encre-700/70 hover:text-ocre-600 shrink-0 flex items-center gap-1.5 whitespace-nowrap">
              <CategoryIcon id={c.id} className="w-3.5 h-3.5" /> {c.label}
            </Link>
          ))}
        </div>
      </div>

      {menuOpen && (
        <nav className="md:hidden border-t border-encre-950/10 bg-sable-50 px-4 py-3 flex flex-col gap-1 text-sm">
          <form onSubmit={handleSearch} className="flex items-center bg-white border border-encre-950/15 rounded-full pl-3 pr-1 py-1 mb-2">
            <Search className="w-4 h-4 text-encre-700/40 shrink-0" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher..."
              className="flex-1 bg-transparent px-2 py-1.5 text-sm outline-none" />
            <button type="submit" className="bg-ocre-500 text-sable-50 text-sm px-3 py-1.5 rounded-full">OK</button>
          </form>
          <Link to="/annonces" onClick={closeMenu} className="py-2.5 hover:text-ocre-600">Toutes les annonces</Link>
          {user && <Link to="/publier" onClick={closeMenu} className="py-2.5 hover:text-ocre-600">Publier</Link>}
          {user && <Link to="/mes-annonces" onClick={closeMenu} className="py-2.5 hover:text-ocre-600">Mes annonces{myListingsCount > 0 ? ` (${myListingsCount})` : ""}</Link>}
          {user && <Link to="/favoris" onClick={closeMenu} className="py-2.5 hover:text-ocre-600">Favoris{favoritesCount > 0 ? ` (${favoritesCount})` : ""}</Link>}
          {user && (
            <Link to="/messages" onClick={closeMenu} className="py-2.5 hover:text-ocre-600 flex items-center gap-2">
              Messages
              {unread > 0 && (
                <span className="bg-ocre-500 text-sable-50 text-[10px] leading-none rounded-full w-4 h-4 flex items-center justify-center">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
          )}
          {user && <Link to="/abonnement" onClick={closeMenu} className="py-2.5 hover:text-ocre-600">Mon profil</Link>}
          {isAdmin && <Link to="/admin" onClick={closeMenu} className="py-2.5 text-indigo-600">Administration</Link>}
          <div className="border-t border-encre-950/10 mt-2 pt-2">
            {user ? (
              <button onClick={handleLogout} className="py-2.5 text-encre-700/70 text-left">
                Déconnexion
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <Link to="/connexion" onClick={closeMenu} className="py-2.5">Se connecter</Link>
                <Link to="/inscription" onClick={closeMenu} className="bg-ocre-500 text-sable-50 px-4 py-2.5 rounded-full text-center">
                  Créer un compte
                </Link>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
