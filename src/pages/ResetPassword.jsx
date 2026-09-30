import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import PasswordInput from "../components/PasswordInput";

// Contrairement à PocketBase (lien avec un token dans l'URL, /reinitialiser-mot-de-passe/:token),
// Supabase établit directement une session (via le fragment #access_token de
// l'URL du lien reçu par email) dès l'arrivée sur cette page : il suffit
// ensuite d'appeler updateUser({ password }) sur cette session temporaire.
export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
      await supabase.auth.signOut();
      setTimeout(() => navigate("/connexion"), 2000);
    } catch {
      setError("Ce lien a expiré ou n'est plus valide. Refaites une demande de réinitialisation.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 data-scroll-target className="font-display text-3xl mb-2">Nouveau mot de passe</h1>
      {done ? (
        <p className="text-indigo-600 text-sm">Mot de passe changé ✓ Redirection vers la connexion...</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Nouveau mot de passe (8 caractères minimum)</label>
            <PasswordInput required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Confirmer le mot de passe</label>
            <PasswordInput required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          {error && <p className="text-ocre-600 text-sm">{error}</p>}
          <button disabled={loading} type="submit"
            className="w-full bg-encre-950 text-sable-50 py-3 rounded hover:bg-encre-900 transition-colors disabled:opacity-50">
            {loading ? "..." : "Changer le mot de passe"}
          </button>
        </form>
      )}
    </div>
  );
}
