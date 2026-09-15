import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import PasswordInput from "../components/PasswordInput";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(identifier, password);
      navigate("/");
    } catch (err) {
      const msg = err?.message || "";
      const isSpecificMessage = msg.includes("téléphone") || msg.includes("suspendu") || msg.includes("supprimé");
      setError(isSpecificMessage ? msg : "Email/téléphone ou mot de passe incorrect.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="font-display text-3xl mb-2">Connexion</h1>
      <p className="text-encre-700/70 mb-8">Accédez à votre compte pour publier et gérer vos annonces.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Email ou téléphone</label>
          <input required value={identifier} onChange={(e) => setIdentifier(e.target.value)}
            placeholder="vous@exemple.com ou +225 07 00 00 00 00"
            className="w-full border border-encre-700/30 rounded px-3 py-2 focus-ring bg-sable-50" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm">Mot de passe</label>
            <Link to="/mot-de-passe-oublie" className="text-xs text-ocre-600 underline">Mot de passe oublié ?</Link>
          </div>
          <PasswordInput required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="text-ocre-600 text-sm">{error}</p>}
        <button disabled={loading} type="submit"
          className="w-full bg-encre-950 text-sable-50 py-3 rounded hover:bg-encre-900 transition-colors disabled:opacity-50">
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>
      <p className="text-sm text-encre-700/70 text-center mt-6">
        Pas encore de compte ? <Link to="/inscription" className="text-ocre-600 underline font-medium">Créer un compte</Link>
      </p>
    </div>
  );
}
