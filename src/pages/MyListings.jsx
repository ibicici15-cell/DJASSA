import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { deleteListing, listenMyListings, setListingStatus, getContactCountsByListing, checkPublishEligibility } from "../lib/listings";
import { listingPhotoUrl } from "../lib/supabase";
import { pbErrorMessage } from "../lib/normalize";
import { useToast } from "../contexts/ToastContext";
import BoostModal from "../components/BoostModal";
import { Eye, MessageCircle } from "lucide-react";

export default function MyListings() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [listings, setListings] = useState([]);
  const [boostTarget, setBoostTarget] = useState(null);
  const [contactCounts, setContactCounts] = useState({});
  const [eligibility, setEligibility] = useState(null);

  useEffect(() => {
    if (!user) return;
    return listenMyListings(user.id, setListings);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    checkPublishEligibility(user.id, profile).then(setEligibility).catch(() => setEligibility(null));
  }, [user, profile, listings.length]);

  useEffect(() => {
    if (!user) return;
    getContactCountsByListing(user.id).then(setContactCounts);
  }, [user, listings.length]);

  const active = listings.filter((l) => l.status !== "supprime");

  async function handleDelete(id) {
    if (!confirm("Supprimer définitivement cette annonce ?")) return;
    try {
      await deleteListing(id);
      setListings((prev) => prev.filter((l) => l.id !== id));
      showToast("Annonce supprimée.", "success");
    } catch (err) {
      showToast("Échec de la suppression : " + pbErrorMessage(err), "error");
    }
  }

  async function handleStatusChange(id, status) {
    try {
      await setListingStatus(id, status);
      setListings((prev) => prev.map((l) => l.id === id ? { ...l, status } : l));
    } catch (err) {
      showToast("Échec du changement de statut : " + pbErrorMessage(err), "error");
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl">Mes annonces</h1>
        <Link to="/publier" className="bg-ocre-500 text-sable-50 px-4 py-2 rounded text-sm hover:bg-ocre-600">
          + Publier
        </Link>
      </div>
      <p className="text-encre-700/70 mb-8">
        {eligibility === null
          ? "Vérification de votre quota..."
          : eligibility.quota === Infinity
          ? "Publication illimitée."
          : eligibility.monthly
          ? `${eligibility.used}/${eligibility.quota} annonces gratuites publiées ce mois-ci.`
          : `${eligibility.used}/${eligibility.quota} annonces actives utilisées.`}
      </p>

      <div className="space-y-3">
        {active.map((l) => {
          const boosted = l.boostedUntil && new Date(l.boostedUntil).getTime() > Date.now();
          return (
            <div key={l.id} className="fiche rounded p-4 flex items-center gap-4">
              <div className="w-20 h-20 bg-encre-800 rounded overflow-hidden shrink-0">
                {l.photos?.[0] && <img src={listingPhotoUrl(l.photos[0])} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display text-lg truncate">{l.titre}</p>
                <p className="text-sm text-encre-700/60">{l.ville} · {Number(l.prix).toLocaleString("fr-FR")} FCFA</p>
                <p className="flex items-center gap-3 text-xs text-encre-700/50 mt-0.5">
                  <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {l.views || 0} vue{(l.views || 0) > 1 ? "s" : ""}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> {contactCounts[l.id] || 0} contact{(contactCounts[l.id] || 0) > 1 ? "s" : ""}</span>
                </p>
                {boosted && (
                  <span className="stamp text-[10px] text-or-500">
                    EN AVANT jusqu'au {new Date(l.boostedUntil).toLocaleDateString("fr-FR")} à {new Date(l.boostedUntil).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
                {!boosted && l.boostedUntil && (
                  <span className="stamp text-[10px] text-encre-700/40">
                    Boost expiré le {new Date(l.boostedUntil).toLocaleDateString("fr-FR")}
                  </span>
                )}
                {l.status === "suspendu" && <span className="stamp text-[10px] text-ocre-600 block">Suspendue par l'admin</span>}
                {l.removedByAdmin && (
                  <p className="text-xs text-ocre-700 bg-ocre-500/10 border border-ocre-500/30 rounded px-2 py-1.5 mt-2">
                    ⚠️ Cette annonce a été retirée par l'administration et n'est plus visible publiquement.{" "}
                    <Link to="/messages?agence=1" className="underline font-medium">Contacter l'agence</Link> pour plus de détails.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2 shrink-0 text-sm items-center">
                <select value={l.status} disabled={l.status === "suspendu" || l.removedByAdmin}
                  onChange={(e) => handleStatusChange(l.id, e.target.value)}
                  title={l.status === "suspendu" ? "Statut géré par l'administrateur" : "Changer le statut"}
                  className="border border-encre-700/30 rounded px-2 py-1.5 bg-sable-50 text-sm disabled:opacity-50">
                  <option value="disponible">Disponible</option>
                  <option value={l.transaction === "location" ? "loue" : "vendu"}>
                    {l.transaction === "location" ? "Loué" : "Vendu"}
                  </option>
                  {l.status === "suspendu" && <option value="suspendu">Suspendue (admin)</option>}
                </select>
                <button disabled={l.removedByAdmin} onClick={() => {
                  if (l.freeBoostUsed && boosted) {
                    showToast("Cette annonce est déjà boostée gratuitement, incluse dans votre forfait.", "info");
                    return;
                  }
                  setBoostTarget(l);
                }} className="border border-or-500 text-or-500 px-3 py-1.5 rounded hover:bg-or-500 hover:text-encre-950 disabled:opacity-40 disabled:pointer-events-none">
                  {boosted ? "Prolonger" : "Booster"}
                </button>
                <Link to={`/annonces/${l.id}/modifier`} className="border border-encre-700/30 px-3 py-1.5 rounded hover:border-ocre-500">
                  Modifier
                </Link>
                <button onClick={() => handleDelete(l.id)} className="text-ocre-600 px-3 py-1.5">
                  Supprimer
                </button>
              </div>
            </div>
          );
        })}
        {active.length === 0 && <p className="text-encre-700/60">Vous n'avez pas encore publié d'annonce.</p>}
      </div>

      {boostTarget && (
        <BoostModal listing={boostTarget} userId={user.id} profile={profile} onClose={() => setBoostTarget(null)} />
      )}
    </div>
  );
}
