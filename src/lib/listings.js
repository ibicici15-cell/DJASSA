import { supabase, watchTable } from "./supabase";
import { normalizeListing, pbErrorMessage } from "./normalize";
import { FREE_LISTING_QUOTA, getTotalQuota, isPlanActive } from "../data/plans";

// ---------- Photos (Supabase Storage, bucket "listings-photos") ----------

async function uploadPhotos(listingId, files) {
  const paths = [];
  for (const file of files || []) {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${listingId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("listings-photos").upload(path, file, { upsert: false });
    if (error) throw error;
    paths.push(path);
  }
  return paths;
}

// ---------- Annonces ----------

export async function createListing(userId, data, files) {
  const id = crypto.randomUUID();
  const { error } = await supabase.from("listings").insert({
    id,
    owner: userId,
    categorie: data.categorie,
    transaction: data.transaction,
    titre: data.titre,
    description: data.description,
    prix: data.prix,
    ville: data.ville,
    commune: data.commune || "",
    contactNom: data.contactNom,
    contactTelephone: data.contactTelephone,
    etat: data.etat,
    specific: data.specific || {},
    status: "disponible",
    views: 0,
    photos: [],
  });
  if (error) throw error;

  // Les photos ne peuvent être envoyées qu'UNE FOIS l'annonce créée : la règle
  // de sécurité du bucket vérifie que l'annonce (et son propriétaire) existe
  // déjà avant d'autoriser l'upload dans son dossier. Un échec ici ne fait pas
  // échouer toute la publication — l'annonce reste créée, juste sans photo —
  // mais on le signale à l'appelant pour qu'il prévienne l'utilisateur.
  let photosFailed = false;
  if (files?.length) {
    try {
      const photos = await uploadPhotos(id, files);
      const { error: photosError } = await supabase.from("listings").update({ photos }).eq("id", id);
      if (photosError) throw photosError;
    } catch (err) {
      console.error("[listings] Échec de l'upload des photos (annonce publiée sans photo) :", err);
      photosFailed = true;
    }
  }

  // Trace la publication de façon permanente (jamais supprimée même si
  // l'annonce l'est ensuite) : c'est ce qui empêche de contourner le quota
  // gratuit mensuel en supprimant/revendant puis republiant. Un échec ici ne
  // doit jamais empêcher la publication, qui est déjà réussie à ce stade.
  try {
    await supabase.from("listingPublishes").insert({ owner: userId, listing: id });
  } catch (err) {
    console.error("[listings] Échec de l'enregistrement dans listingPublishes :", err);
  }

  return { id, photosFailed };
}

// Détermine si l'utilisateur peut publier une nouvelle annonce, selon deux
// régimes distincts :
//  - Compte ABONNÉ (Pro/Premium actif) : quota CONCURRENT — nombre d'annonces
//    actuellement actives (hors vendu/loué, qui libèrent de la place) par
//    rapport au quota du plan.
//  - Compte GRATUIT : quota MENSUEL — nombre de publications déjà faites ce
//    mois-ci (compteur permanent, jamais réduit par une suppression/vente).
export async function checkPublishEligibility(userId, profile) {
  if (profile?.role === "admin" || profile?.role === "superadmin") {
    return { canPublish: true, used: 0, quota: Infinity, monthly: false };
  }

  if (isPlanActive(profile)) {
    const quota = getTotalQuota(profile);
    const { count, error } = await supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("owner", userId)
      .in("status", ["disponible", "suspendu"]); // vendu/loué ne comptent plus (place libérée)
    if (error) throw error;
    const used = count || 0;
    return { canPublish: quota === Infinity || used < quota, used, quota, monthly: false };
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const { count, error } = await supabase
    .from("listingPublishes")
    .select("id", { count: "exact", head: true })
    .eq("owner", userId)
    .gte("created", startOfMonth.toISOString());
  if (error) throw error;
  const used = count || 0;
  return { canPublish: used < FREE_LISTING_QUOTA, used, quota: FREE_LISTING_QUOTA, monthly: true };
}

export async function updateListing(listingId, data, newFiles = [], removedPhotoPaths = []) {
  const update = {
    categorie: data.categorie,
    transaction: data.transaction,
    titre: data.titre,
    description: data.description,
    prix: data.prix,
    ville: data.ville,
    commune: data.commune || "",
    contactNom: data.contactNom,
    contactTelephone: data.contactTelephone,
    etat: data.etat,
    specific: data.specific || {},
  };
  if (newFiles?.length || removedPhotoPaths?.length) {
    const { data: current } = await supabase.from("listings").select("photos").eq("id", listingId).maybeSingle();
    let photos = current?.photos || [];
    if (removedPhotoPaths?.length) {
      photos = photos.filter((p) => !removedPhotoPaths.includes(p));
      try {
        await supabase.storage.from("listings-photos").remove(removedPhotoPaths);
      } catch (err) {
        console.error("[listings] Échec de la suppression de photos dans le stockage :", err);
      }
    }
    if (newFiles?.length) {
      const newPaths = await uploadPhotos(listingId, newFiles);
      photos = [...photos, ...newPaths];
    }
    update.photos = photos;
  }
  const { error } = await supabase.from("listings").update(update).eq("id", listingId);
  if (error) throw error;
}

export async function deleteListing(listingId) {
  const { error } = await supabase.from("listings").delete().eq("id", listingId);
  if (error) throw error;
}

export async function getListing(listingId) {
  const { data } = await supabase.from("listings").select("*").eq("id", listingId).maybeSingle();
  return data ? normalizeListing(data) : null;
}

export function listenMyListings(userId, cb) {
  let cancelled = false;
  async function refresh() {
    try {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("owner", userId)
        .order("created", { ascending: false });
      if (error) throw error;
      if (!cancelled) cb((data || []).map(normalizeListing));
    } catch (err) {
      console.error("[listings] listenMyListings a échoué :", err);
      if (!cancelled) cb([]);
    }
  }
  refresh();
  const unwatch = watchTable(`listings-owner-${userId}`, { table: "listings", filter: `owner=eq.${userId}` }, refresh);
  return () => { cancelled = true; unwatch(); };
}

export async function searchListings({
  categorie, transaction, ville, prixMin, prixMax, etat, q,
  dateMin, dateMax, sort = "recent", take = 120,
}) {
  let query = supabase.from("listings").select("*").eq("status", "disponible").eq("removedByAdmin", false);
  if (categorie) query = query.eq("categorie", categorie);
  if (transaction) query = query.eq("transaction", transaction);
  if (ville) query = query.eq("ville", ville);
  if (etat) query = query.eq("etat", etat);
  if (q) {
    const safeQ = q.replace(/[,()%]/g, " ").trim();
    if (safeQ) query = query.or(`titre.ilike.%${safeQ}%,description.ilike.%${safeQ}%`);
  }
  if (prixMin) query = query.gte("prix", Number(prixMin));
  if (prixMax) query = query.lte("prix", Number(prixMax));
  if (dateMin) query = query.gte("created", `${dateMin} 00:00:00`);
  if (dateMax) query = query.lte("created", `${dateMax} 23:59:59`);
  query = query.order("created", { ascending: false }).limit(take);

  const { data, error } = await query;
  if (error) throw error;

  let results = (data || []).map(normalizeListing);

  const now = Date.now();
  results.sort((a, b) => {
    const aBoost = a.boostedUntil && new Date(a.boostedUntil).getTime() > now ? 1 : 0;
    const bBoost = b.boostedUntil && new Date(b.boostedUntil).getTime() > now ? 1 : 0;
    if (aBoost !== bBoost) return bBoost - aBoost;
    if (sort === "prixAsc") return Number(a.prix) - Number(b.prix);
    if (sort === "prixDesc") return Number(b.prix) - Number(a.prix);
    return new Date(b.created) - new Date(a.created); // "recent" par défaut
  });
  return results;
}

// ---------- Statistiques publiques (page d'accueil) ----------

export async function getPlatformStats() {
  const { count } = await supabase
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("status", "disponible").eq("removedByAdmin", false);
  let villesCount = 0;
  try {
    const { data } = await supabase.from("listings").select("ville").eq("status", "disponible").eq("removedByAdmin", false);
    villesCount = new Set((data || []).map((l) => l.ville)).size;
  } catch {
    // silencieux
  }
  return { totalListings: count || 0, totalVilles: villesCount };
}

export async function incrementViews(listingId) {
  try {
    // Passe par une fonction RPC (privilèges élevés côté serveur) plutôt que
    // par un simple update : ça marche pour N'IMPORTE QUEL visiteur, même
    // anonyme ou non-propriétaire, sans avoir à ouvrir une policy RLS
    // "update" dangereuse sur toute la table "listings". C'est aussi
    // atomique (pas de lecture-puis-écriture qui perdrait des vues en cas de
    // visites simultanées).
    const { error } = await supabase.rpc("increment_listing_views", { p_listing_id: listingId });
    if (error) throw error;
  } catch (err) {
    console.error("[listings] Échec de l'incrément des vues :", err);
  }
}

// Le propriétaire peut lui-même marquer son bien vendu/loué/disponible.
// Le statut "suspendu" (modération) reste réservé à l'admin, voir lib/admin.js.
export async function setListingStatus(listingId, status) {
  const { error } = await supabase.from("listings").update({ status }).eq("id", listingId);
  if (error) throw error;
}

// ---------- Favoris ----------

export async function toggleFavorite(userId, listingId, isFavorite) {
  if (isFavorite) {
    await supabase.from("favorites").delete().eq("user", userId).eq("listing", listingId);
  } else {
    await supabase.from("favorites").insert({ user: userId, listing: listingId });
  }
}

export function listenFavorites(userId, cb) {
  let cancelled = false;
  async function refresh() {
    try {
      const { data, error } = await supabase.from("favorites").select("listing").eq("user", userId);
      if (error) throw error;
      if (!cancelled) cb((data || []).map((f) => f.listing));
    } catch (err) {
      console.error("[listings] listenFavorites a échoué :", err);
      if (!cancelled) cb([]);
    }
  }
  refresh();
  const unwatch = watchTable(`favorites-${userId}`, { table: "favorites", filter: `user=eq.${userId}` }, refresh);
  return () => { cancelled = true; unwatch(); };
}

// ---------- Demandes d'abonnement / boost (activation manuelle) ----------

export async function requestSubscription(userId, planId, transactionRef) {
  const { error } = await supabase.from("subscriptionRequests").insert({
    user: userId, planId, transactionRef, status: "en_attente",
  });
  if (error) throw error;
}

export async function requestBoost(userId, listingId, planId, transactionRef) {
  const { error } = await supabase.from("boostRequests").insert({
    user: userId, listing: listingId, planId, transactionRef, status: "en_attente",
  });
  if (error) throw error;
}

// Utilise un boost déjà inclus dans l'abonnement (Pro/Premium) — aucune
// validation admin nécessaire, c'est déjà payé via l'abonnement mensuel.
// S'additionne au temps de boost restant, comme les boosts payés à l'unité.
export async function useIncludedBoost(userId, listingId, days) {
  const { data: user } = await supabase.from("profiles").select("boostCredits").eq("id", userId).maybeSingle();
  const remaining = user?.boostCredits || 0;
  if (remaining <= 0) throw new Error("Aucun boost inclus restant ce mois-ci.");

  const { data: listing } = await supabase.from("listings").select("boostedUntil").eq("id", listingId).maybeSingle();
  const now = Date.now();
  const currentExpiry = listing?.boostedUntil ? new Date(listing.boostedUntil).getTime() : 0;
  const base = currentExpiry > now ? currentExpiry : now;
  const until = new Date(base + days * 24 * 3600 * 1000);

  const { error: e1 } = await supabase
    .from("listings")
    .update({ boostedUntil: until.toISOString(), freeBoostUsed: true })
    .eq("id", listingId);
  if (e1) throw e1;
  const { error: e2 } = await supabase
    .from("profiles")
    .update({ boostCredits: remaining - 1 })
    .eq("id", userId);
  if (e2) throw e2;
  return until.toISOString();
}

// ---------- Messagerie ----------

export function conversationId(uidA, uidB, listingId) {
  return [uidA, uidB].sort().join("_") + "_" + (listingId || "support");
}

// Trouve un compte admin/superadmin à qui adresser un message général (hors annonce).
export async function getSupportUserId() {
  const { data } = await supabase.from("profiles").select("id, role").in("role", ["admin", "superadmin"]).limit(1);
  const admin = data?.[0];
  if (!admin) throw new Error("Aucun compte administrateur n'existe pour le moment.");
  return admin.id;
}

export async function contactSupport(userId, text) {
  let supportId;
  try {
    supportId = await getSupportUserId();
  } catch (err) {
    throw new Error("Aucun compte administrateur trouvé (" + pbErrorMessage(err) + ").");
  }
  if (supportId === userId) throw new Error("Vous êtes déjà administrateur.");
  return sendMessage(null, null, [userId, supportId], userId, text);
}

export async function sendMessage(_convKey, listingId, participants, fromUserId, text) {
  const recipientId = participants.find((p) => p !== fromUserId);

  // On retrouve ou crée la conversation via son couple (listing, participants).
  // listingId peut être null/undefined pour un message "support" hors annonce.
  let convQuery = supabase.from("conversations").select("*").contains("participants", participants);
  convQuery = listingId ? convQuery.eq("listing", listingId) : convQuery.is("listing", null);
  const { data: existing } = await convQuery.maybeSingle();

  let conv = existing;
  if (!conv) {
    const { data: created, error } = await supabase
      .from("conversations")
      .insert({
        listing: listingId || null, participants, lastMessage: text, lastMessageAt: new Date().toISOString(),
        unreadFor: [recipientId],
      })
      .select()
      .single();
    if (error) throw error;
    conv = created;
  } else {
    await supabase
      .from("conversations")
      .update({ lastMessage: text, lastMessageAt: new Date().toISOString(), unreadFor: [recipientId] })
      .eq("id", conv.id);
  }

  const { error } = await supabase.from("messages").insert({
    conversation: conv.id, fromUser: fromUserId, text,
  });
  if (error) throw error;
  return conv.id;
}

export async function markConversationRead(convId, userId) {
  try {
    const { data: conv } = await supabase.from("conversations").select("unreadFor").eq("id", convId).maybeSingle();
    const remaining = (conv?.unreadFor || []).filter((id) => id !== userId);
    if (remaining.length !== (conv?.unreadFor || []).length) {
      await supabase.from("conversations").update({ unreadFor: remaining }).eq("id", convId);
    }
  } catch {
    // silencieux
  }
}

export function listenUnreadCount(userId, cb) {
  let cancelled = false;
  async function refresh() {
    try {
      const { data } = await supabase.from("conversations").select("id").contains("participants", [userId]).contains("unreadFor", [userId]);
      if (!cancelled) cb((data || []).length);
    } catch {
      if (!cancelled) cb(0);
    }
  }
  refresh();
  const unwatch = watchTable(`unread-${userId}`, { table: "conversations" }, refresh);
  return () => { cancelled = true; unwatch(); };
}

export function listenMessages(convId, cb) {
  let cancelled = false;
  async function refresh() {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation", convId)
        .order("created", { ascending: true });
      if (error) throw error;
      if (!cancelled) cb(data || []);
    } catch (err) {
      console.error("[listings] listenMessages a échoué :", err);
      if (!cancelled) cb([]);
    }
  }
  refresh();
  const unwatch = watchTable(`messages-${convId}`, { table: "messages", filter: `conversation=eq.${convId}` }, refresh);
  return () => { cancelled = true; unwatch(); };
}

// Nombre de conversations (contacts) reçues par annonce, pour un propriétaire.
// Retourne un objet { [listingId]: nombre }. Visible uniquement par le
// propriétaire — jamais exposé sur les pages publiques d'annonce.
export async function getContactCountsByListing(userId) {
  try {
    const { data, error } = await supabase
      .from("conversations")
      .select("listing:listings!inner(id, owner)")
      .eq("listing.owner", userId);
    if (error) throw error;
    const counts = {};
    for (const c of data || []) {
      const lid = c.listing?.id;
      if (!lid) continue;
      counts[lid] = (counts[lid] || 0) + 1;
    }
    return counts;
  } catch {
    return {};
  }
}

export function listenConversations(userId, cb) {
  let cancelled = false;
  async function refresh() {
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .contains("participants", [userId])
        .order("lastMessageAt", { ascending: false });
      if (error) throw error;
      if (!cancelled) cb(data || []);
    } catch (err) {
      console.error("[listings] listenConversations a échoué :", err);
      if (!cancelled) cb([]);
    }
  }
  refresh();
  const unwatch = watchTable(`conversations-${userId}`, { table: "conversations" }, refresh);
  return () => { cancelled = true; unwatch(); };
}
