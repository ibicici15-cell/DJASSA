import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { isAtLeastAdmin } from "../lib/roles";

export function RequireAuth({ children }) {
  const { user, profile, loading, logout } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/connexion" replace />;
  if (profile?.suspended) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-2xl mb-3">Compte suspendu</h1>
        <p className="text-encre-700/70 mb-6">
          Votre compte a été suspendu par l'administration. Contactez l'agence pour plus d'informations.
        </p>
        <button onClick={logout} className="text-sm underline">Se déconnecter</button>
      </div>
    );
  }
  return children;
}

export function RequireAdmin({ children }) {
  const { profile, loading } = useAuth();
  if (loading) return null;
  if (!isAtLeastAdmin(profile?.role)) return <Navigate to="/" replace />;
  return children;
}
