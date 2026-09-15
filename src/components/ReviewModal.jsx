import { useState } from "react";
import { Star } from "lucide-react";
import { createReview, updateReview } from "../lib/reviews";
import { useToast } from "../contexts/ToastContext";
import { pbErrorMessage } from "../lib/normalize";

// Sert à la fois pour laisser un nouvel avis et pour modifier le sien
// (passer `existingReview` = { id, rating, comment } pour le mode édition).
export default function ReviewModal({ targetUserId, userId, existingReview, onClose }) {
  const { showToast } = useToast();
  const [rating, setRating] = useState(existingReview?.rating || 5);
  const [comment, setComment] = useState(existingReview?.comment || "");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const isEdit = !!existingReview;

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        await updateReview(existingReview.id, rating, comment);
      } else {
        await createReview(targetUserId, userId, rating, comment);
      }
      setSent(true);
    } catch (err) {
      showToast(pbErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-encre-950/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-sable-50 rounded p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        {sent ? (
          <div>
            <h3 className="font-display text-xl mb-2">Merci !</h3>
            <p className="text-sm mb-4">{isEdit ? "Votre avis a été mis à jour." : "Votre avis a été enregistré."}</p>
            <button onClick={onClose} className="text-sm underline">Fermer</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h3 className="font-display text-xl mb-4">{isEdit ? "Modifier mon avis" : "Laisser un avis"}</h3>
            <div className="flex gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)}>
                  <Star className={`w-7 h-7 ${n <= rating ? "text-or-500 fill-or-500" : "text-encre-700/20"}`} />
                </button>
              ))}
            </div>
            <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)}
              placeholder="Votre expérience avec ce vendeur (optionnel)..."
              className="w-full border border-encre-700/30 rounded px-3 py-2 text-sm mb-4 focus-ring bg-sable-50" />
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="flex-1 border border-encre-700/30 rounded py-2 text-sm">Annuler</button>
              <button disabled={loading} type="submit" className="flex-1 bg-ocre-500 text-sable-50 rounded py-2 text-sm disabled:opacity-50">
                {loading ? "..." : isEdit ? "Enregistrer" : "Envoyer"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
