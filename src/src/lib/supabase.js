import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants — voir SUPABASE_SETUP.md"
  );
}

// persistSession: false reproduit le comportement de l'ancien BaseAuthStore
// PocketBase en mémoire : l'utilisateur est déconnecté à chaque rechargement
// complet de la page (F5). Mettre à true pour une session qui survit au reload.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: true },
});

// Équivalent de pb.files.getURL(record, filename, { thumb }) : renvoie l'URL
// publique d'un fichier stocké dans un bucket Supabase Storage. Le paramètre
// `thumb` n'est pas utilisé (le plan gratuit Supabase ne génère pas de
// vignettes à la volée) : les photos sont déjà compressées côté client avant
// l'envoi (voir lib/imageCompression.js), donc l'image "pleine taille" reste légère.
export function fileUrl(bucket, path) {
  if (!path) return null;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || null;
}

// Photo de couverture / galerie d'une annonce : `photos` contient des chemins
// de stockage "listingId/nom-fichier.jpg" dans le bucket "listings-photos".
export function listingPhotoUrl(path) {
  return fileUrl("listings-photos", path);
}

// Avatar utilisateur : chemin "userId/nom-fichier.jpg" dans "avatars".
export function avatarUrl(path) {
  return fileUrl("avatars", path);
}

// Message d'erreur lisible à partir d'une erreur Supabase/PostgREST.
export function dbErrorMessage(err) {
  return err?.error_description || err?.message || "Une erreur est survenue.";
}

// Écoute les changements d'une table en temps réel, avec un rechargement complet
// à chaque changement (pas de mise à jour incrémentale — plus simple et fiable).
// `topic` doit être unique par table/filtre logique (ex: "favorites-<userId>") ;
// un suffixe aléatoire est systématiquement ajouté pour éviter la collision de
// canal qui plantait toute la page en React StrictMode (deux montages successifs
// en dev réutilisaient le même nom de canal déjà abonné). La création du canal
// est elle-même protégée : une erreur ici ne casse plus jamais le rendu de la
// page, elle prive juste cette page de mise à jour en direct (rechargement
// manuel nécessaire), ce qui est un compromis largement acceptable.
export function watchTable(topic, filterConfig, onChange) {
  try {
    const channel = supabase
      .channel(`${topic}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", ...filterConfig }, onChange)
      .subscribe();
    return () => supabase.removeChannel(channel);
  } catch (err) {
    console.error(`[supabase] Impossible de s'abonner en temps réel à "${topic}" :`, err);
    return () => {};
  }
}
