import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function ForgotPassword() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch {
      // Par sécurité, PocketBase répond souvent "succès" même si l'email
      // n'existe pas ; on affiche quand même le message de confirmation.
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 data-scroll-target className="font-display text-3xl mb-2">Mot de passe oublié</h1>
      <p className="text-encre-700/70 mb-8">
        Entrez l'email de votre compte, vous recevrez un lien pour réinitialiser votre mot de passe.
      </p>

      {sent ? (
        <div className="fiche rounded p-4 text-sm">
          Si un compte existe avec cet email, un lien de réinitialisation vient d'être envoyé. Vérifiez votre boîte de réception (et vos spams).
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-encre-700/30 rounded px-3 py-2 focus-ring bg-sable-50" />
          </div>
          {error && <p className="text-ocre-600 text-sm">{error}</p>}
          <button disabled={loading} type="submit"
            className="w-full bg-encre-950 text-sable-50 py-3 rounded hover:bg-encre-900 transition-colors disabled:opacity-50">
            {loading ? "Envoi..." : "Envoyer le lien"}
          </button>
        </form>
      )}
    </div>
  );
}
