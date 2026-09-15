import { supabase } from "./supabase";

export async function listReviewsForUser(targetUserId) {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
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

export function averageRating(reviews) {
  if (!reviews.length) return null;
  return reviews.reduce((s, r) => s + Number(r.rating), 0) / reviews.length;
}
