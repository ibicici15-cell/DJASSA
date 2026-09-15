import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { normalizeUser } from "../lib/normalize";

const AuthContext = createContext(null);

async function loadProfile(authUser) {
  if (!authUser) return null;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();
    if (error || !data) return null;
    return normalizeUser({ ...data, email: authUser.email });
  } catch (err) {
    // Erreur réseau ou config Supabase invalide : on ne bloque jamais l'app
    // dessus, mais on le signale bien fort dans la console pour le déboguer.
    console.error("[auth] Impossible de charger le profil (vérifie VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) :", err);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession()
      .then(async ({ data, error }) => {
        if (error) console.error("[auth] getSession a échoué :", error);
        return loadProfile(data?.session?.user);
      })
      .catch((err) => {
        // Ne devrait plus arriver (loadProfile ne rejette plus), mais filet
        // de sécurité : sans ce .catch(), une erreur ici bloquait "loading"
        // à true pour toujours et toutes les pages protégées restaient blanches.
        console.error("[auth] Échec du chargement de la session :", err);
        return null;
      })
      .then((profile) => {
        if (!cancelled) {
          setUser(profile);
          setLoading(false);
        }
      });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const profile = await loadProfile(session?.user);
      if (!cancelled) setUser(profile);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signup(nom, telephone, email, password) {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nom, telephone } },
      });
      if (error) throw error;
      if (!data.session) {
        // La confirmation par email est activée côté Supabase : pas de session
        // immédiate. Voir SUPABASE_SETUP.md pour la désactiver si tu veux
        // reproduire exactement le comportement "connecté dès l'inscription".
        throw new Error("Compte créé. Vérifiez votre email pour confirmer votre inscription.");
      }
      const profile = await loadProfile(data.session.user);
      setUser(profile);
      return profile;
    } finally {
      setLoading(false);
    }
  }

  async function login(identifier, password) {
    setLoading(true);
    try {
      let email = identifier.trim();
      if (!email.includes("@")) {
        // L'utilisateur a saisi un téléphone plutôt qu'un email : on retrouve
        // l'email correspondant via une fonction RPC (Supabase Auth exige un
        // email pour se connecter par mot de passe).
        const { data: foundEmail } = await supabase.rpc("get_email_for_phone", { p_phone: email });
        if (!foundEmail) throw new Error("Aucun compte ne correspond à ce numéro de téléphone.");
        email = foundEmail;
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const profile = await loadProfile(data.user);
      if (profile?.deleted) {
        await supabase.auth.signOut();
        setUser(null);
        throw new Error("Compte supprimé, contactez l'agence (numéro dans le pied de page) pour plus d'informations.");
      }
      if (profile?.suspended) {
        await supabase.auth.signOut();
        setUser(null);
        throw new Error("Votre compte a été suspendu. Contactez l'agence (Écrire à l'agence) pour plus d'informations.");
      }
      setUser(profile);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  async function requestPasswordReset(email) {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
    });
  }

  async function refreshProfile() {
    const { data } = await supabase.auth.getUser();
    const profile = await loadProfile(data?.user);
    setUser(profile);
  }

  // `profile` == `user` ici, comme avec PocketBase : on fusionne la ligne
  // "profiles" et l'email de auth.users en un seul objet plat.
  const value = { user, profile: user, loading, signup, login, logout, refreshProfile, requestPasswordReset };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
