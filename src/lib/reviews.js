import { supabase } from "./supabase";

export async function listReviewsForUser(targetUserId) {
  // Récupère le nom de l'auteur en même temps (jointure via la relation
  // fromUser -> profiles), pour que chaque avis affiche qui l'a laissé.
  const { data, error } = await supabase
    .from("reviews")
    .select("*, author:profiles!fromUser(nom, avatar)")
    .eq("targetUser", targetUserId)
    .order("created", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createReview(targetUserId, fromUserId, rating, comment) {
  if (targetUserId === fromUserId) throw new Error("Vous ne pouvez pas vous noter vous-même.");
  const { data, error } = await supabase
    .from("reviews")
    .insert({ targetUser: targetUserId, fromUser: fromUserId, rating, comment })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateReview(reviewId, rating, comment) {
  const { error } = await supabase.from("reviews").update({ rating, comment }).eq("id", reviewId);
  if (error) throw error;
}

export async function deleteReview(reviewId) {
  const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
  if (error) throw error;
}

export function averageRating(reviews) {
  if (!reviews.length) return null;
  return reviews.reduce((s, r) => s + Number(r.rating), 0) / reviews.length;
}
