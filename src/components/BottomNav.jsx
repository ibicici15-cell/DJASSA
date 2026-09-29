import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Home, Search, PlusCircle, MessageCircle, User } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { listenUnreadCount } from "../lib/listings";
import { isAtLeastAdmin } from "../lib/roles";

// Barre de navigation basse, uniquement affichée dans l'app Android (voir
// Navbar.jsx / App.jsx qui la rendent conditionnellement via
// Capacitor.isNativePlatform()) — remplace le menu burger et le Footer web,
// pour une vraie sensation d'application plutôt que de site consulté au mobile.
export default function BottomNav() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const isAdmin = isAtLeastAdmin(profile?.role);

  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }
    return listenUnreadCount(user.id, setUnreadCount);
  }, [user]);

  const isActive = (path) => location.pathname === path;

  async function handleLogout() {
    await logout();
    setSheetOpen(false);
    navigate("/");
  }

  return (
    <>
      {sheetOpen && (
        <div className="fixed inset-0 bg-encre-950/40 z-40" onClick={() => setSheetOpen(false)}>
          <div className="absolute bottom-16 left-0 right-0 bg-white rounded-t-2xl shadow-xl py-2 text-sm" onClick={(e) => e.stopPropagation()}>
            {user ? (
              <>
                <Link to="/mes-annonces" onClick={() => setSheetOpen(false)} className="block px-5 py-3 hover:bg-sable-100">Mes annonces</Link>
                <Link to="/favoris" onClick={() => setSheetOpen(false)} className="block px-5 py-3 hover:bg-sable-100">Favoris</Link>
                <Link to="/abonnement#offres" onClick={() => setSheetOpen(false)} className="block px-5 py-3 hover:bg-sable-100">Mon profil</Link>
                {isAdmin && (
                  <Link to="/admin" onClick={() => setSheetOpen(false)} className="block px-5 py-3 hover:bg-sable-100 text-indigo-600 font-medium">Administration</Link>
                )}
                <button onClick={handleLogout} className="w-full text-left px-5 py-3 hover:bg-sable-100 text-ocre-600 border-t border-encre-950/10 mt-1">
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link to="/connexion" onClick={() => setSheetOpen(false)} className="block px-5 py-3 hover:bg-sable-100">Se connecter</Link>
                <Link to="/inscription" onClick={() => setSheetOpen(false)} className="block px-5 py-3 hover:bg-sable-100 text-ocre-600 font-medium">Créer un compte</Link>
              </>
            )}
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-encre-950/10 flex items-stretch h-16"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <Link to="/" className={`flex-1 flex flex-col items-center justify-center gap-0.5 ${isActive("/") ? "text-ocre-600" : "text-encre-700/60"}`}>
          <Home className="w-5 h-5" strokeWidth={2} />
          <span className="text-[10px]">Accueil</span>
        </Link>
        <Link to="/annonces" className={`flex-1 flex flex-col items-center justify-center gap-0.5 ${isActive("/annonces") ? "text-ocre-600" : "text-encre-700/60"}`}>
          <Search className="w-5 h-5" strokeWidth={2} />
          <span className="text-[10px]">Annonces</span>
        </Link>
        <Link to="/publier" className="flex-1 flex flex-col items-center justify-center">
          <span className="w-11 h-11 rounded-full bg-ocre-500 text-white flex items-center justify-center -mt-5 shadow-lg">
            <PlusCircle className="w-6 h-6" strokeWidth={2} />
          </span>
        </Link>
        <Link to="/messages" className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative ${isActive("/messages") ? "text-ocre-600" : "text-encre-700/60"}`}>
          <MessageCircle className="w-5 h-5" strokeWidth={2} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-[28%] bg-ocre-500 text-white text-[9px] leading-none rounded-full w-4 h-4 flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          <span className="text-[10px]">Messages</span>
        </Link>
        <button onClick={() => setSheetOpen(true)} className="flex-1 flex flex-col items-center justify-center gap-0.5 text-encre-700/60">
          <User className="w-5 h-5" strokeWidth={2} />
          <span className="text-[10px]">Compte</span>
        </button>
      </nav>
    </>
  );
}
