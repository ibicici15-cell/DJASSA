import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { CATEGORIES, TRANSACTION_TYPES, ETATS, VILLES_CI, COMMUNES_BY_VILLE, getCategory } from "../data/categories";
import { findForbiddenActivity, FORBIDDEN_ACTIVITY_MESSAGE } from "../data/moderation";
import { CategoryIcon } from "../data/categoryIcons";
import { createListing, checkPublishEligibility, getListing, updateListing, useIncludedBoost } from "../lib/listings";
import { listingPhotoUrl } from "../lib/supabase";
import { compressPhotos } from "../lib/imageCompression";

const emptyCommon = { titre: "", description: "", prix: "", etat: "", ville: "", commune: "", complement: "", contactNom: "", contactTelephone: "" };

export default function PublishListing({ editMode = false }) {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  const [step, setStep] = useState(editMode ? 2 : 1);
  const [categorie, setCategorie] = useState("");
  const [transaction, setTransaction] = useState("");
  const [common, setCommon] = useState(emptyCommon);
  const [specific, setSpecific] = useState({});
  const [files, setFiles] = useState([]); // File[] compressés, en attente d'upload
  const [filePreviews, setFilePreviews] = useState([]); // object URLs correspondants, pour l'aperçu
  const [removedExisting, setRemovedExisting] = useState([]); // chemins des photos déjà en ligne à retirer (mode édition)
  const [existingRecord, setExistingRecord] = useState(null); // record complet, pour construire les URLs des photos déjà en ligne
  const [eligibility, setEligibility] = useState(null); // { canPublish, used, quota, monthly } — null = en cours de calcul
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);

  useEffect(() => {
    if (!user || editMode) return;
    let cancelled = false;
    checkPublishEligibility(user.id, profile)
      .then((r) => { if (!cancelled) setEligibility(r); })
      .catch((err) => {
        console.error("[publier] Échec du calcul du quota :", err);
        // En cas d'erreur, on ne bloque pas la publication dessus.
        if (!cancelled) setEligibility({ canPublish: true, used: 0, quota: Infinity, monthly: false });
      });
    return () => { cancelled = true; };
  }, [user, profile, editMode]);

  // Génère un aperçu (object URL) pour chaque fichier sélectionné, et libère
  // proprement les anciens à chaque changement pour éviter les fuites mémoire.
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setFilePreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  function removeNewFile(index) {
    setFiles((f) => f.filter((_, i) => i !== index));
  }

  function toggleRemoveExisting(path) {
    setRemovedExisting((r) => (r.includes(path) ? r.filter((p) => p !== path) : [...r, path]));
  }
  useEffect(() => {
    if (editMode || !profile) return;
    setCommon((c) => ({
      ...c,
      contactNom: c.contactNom || profile.nom || "",
      contactTelephone: c.contactTelephone || profile.telephone || "",
    }));
  }, [profile, editMode]);

  useEffect(() => {
    if (editMode && id) {
      getListing(id).then((l) => {
        if (!l) return;
        setCategorie(l.categorie);
        setTransaction(l.transaction);
        setCommon({
          titre: l.titre, description: l.description, prix: l.prix, etat: l.etat || "",
          ville: l.ville, commune: l.commune || "", complement: l.complement || "",
          contactNom: l.contactNom, contactTelephone: l.contactTelephone,
        });
        setSpecific(l.specific || {});
        setExistingRecord(l);
      });
    }
  }, [editMode, id]);

  const cat = getCategory(categorie);
  const quotaReached = !editMode && eligibility !== null && !eligibility.canPublish;

  function updateSpecific(name, value) {
    setSpecific((s) => ({ ...s, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (quotaReached) {
      setError(
        eligibility.monthly
          ? `Vous avez publié ${eligibility.quota} annonces gratuites ce mois-ci. Souscrivez un abonnement pour continuer, ou attendez le mois prochain.`
          : `Vous avez atteint votre quota de ${eligibility.quota} annonces actives. Souscrivez un abonnement supérieur pour publier plus.`
      );
      return;
    }
    const forbidden = findForbiddenActivity(common.titre) || findForbiddenActivity(common.description);
    if (forbidden) {
      setError(FORBIDDEN_ACTIVITY_MESSAGE);
      return;
    }
    setLoading(true);
    try {
      const payload = {
        categorie, transaction, ...common, specific,
        ville: common.ville === "Autre" ? (common.villeAutre || "Autre") : common.ville,
        commune: common.commune === "Autre" ? (common.communeAutre || "") : common.commune,
      };
      if (editMode) {
        await updateListing(id, payload, files, removedExisting);
        navigate(`/annonces/${id}`);
      } else {
        const { id: newId, photosFailed } = await createListing(user.id, payload, files);

        // Boost automatique inclus dans l'abonnement (Pro/Premium), sans
        // demander confirmation — l'utilisateur en est juste informé sur la
        // fiche de l'annonce.
        let autoBoost = null;
        if (profile?.boostCredits > 0) {
          try {
            await useIncludedBoost(user.id, newId, profile.boostCreditDays);
            await refreshProfile();
            autoBoost = { days: profile.boostCreditDays, creditsLeft: profile.boostCredits - 1 };
          } catch {
            // silencieux : la publication reste réussie même si le boost auto échoue
          }
        }

        navigate(`/annonces/${newId}`, { state: { justPublished: true, autoBoost, photosFailed } });
      }
    } catch (err) {
      setError("Une erreur est survenue, réessayez.");
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p>Connectez-vous pour publier une annonce.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="font-display text-3xl mb-2">{editMode ? "Modifier l'annonce" : "Publier une annonce"}</h1>
      <p className="text-encre-700/70 mb-6">
        {eligibility === null
          ? "Vérification de votre quota..."
          : eligibility.quota === Infinity
          ? "Publication illimitée."
          : eligibility.monthly
          ? `${eligibility.used}/${eligibility.quota} annonces gratuites publiées ce mois-ci.`
          : `${eligibility.used}/${eligibility.quota} annonces actives utilisées.`}
      </p>

      {quotaReached && (
        <div className="fiche rounded p-4 mb-6 text-sm">
          Quota atteint. <Link to="/abonnement#offres" className="text-ocre-600 underline">Voir les abonnements</Link> pour publier davantage{eligibility.monthly ? ", ou attendez le mois prochain" : ""}.
        </div>
      )}

      {step === 1 && (
        <div>
          <h2 className="font-display text-xl mb-4">1. Catégorie du bien</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {CATEGORIES.map((c) => (
              <button key={c.id} type="button"
                onClick={() => { setCategorie(c.id); setSpecific({}); }}
                className={`fiche rounded p-4 flex items-center gap-3 hover:border-ocre-500 transition-colors ${categorie === c.id ? "border-ocre-500 ring-1 ring-ocre-500 bg-ocre-500/5" : ""}`}>
                <div className="w-9 h-9 shrink-0 rounded-full bg-ocre-500/10 text-ocre-600 flex items-center justify-center">
                  <CategoryIcon id={c.id} className="w-5 h-5" />
                </div>
                <span className="font-display block">{c.label}</span>
              </button>
            ))}
          </div>

          <h2 className="font-display text-xl mb-4">Vente ou location ?</h2>
          <div className="flex gap-3 mb-8">
            {TRANSACTION_TYPES.map((t) => (
              <button key={t.value} type="button" onClick={() => setTransaction(t.value)}
                className={`px-5 py-2 rounded border ${transaction === t.value ? "bg-encre-950 text-sable-50 border-encre-950" : "border-encre-700/30"}`}>
                {t.label}
              </button>
            ))}
          </div>

          <button type="button" disabled={!categorie || !transaction || quotaReached}
            onClick={() => setStep(2)}
            className="bg-ocre-500 text-sable-50 px-6 py-3 rounded disabled:opacity-40 hover:bg-ocre-600 transition-colors">
            Continuer
          </button>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="text-xs stamp text-indigo-600">{cat?.label?.toUpperCase()} · {transaction === "location" ? "LOCATION" : "VENTE"}</div>

          <div>
            <label className="block text-sm mb-1">Titre de l'annonce</label>
            <input required value={common.titre} onChange={(e) => setCommon({ ...common, titre: e.target.value })}
              placeholder="Ex: Villa 4 pièces avec piscine à Cocody"
              className="w-full border border-encre-700/30 rounded px-3 py-2 focus-ring bg-sable-50" />
          </div>

          <div>
            <label className="block text-sm mb-1">Description</label>
            <textarea required rows={4} value={common.description} onChange={(e) => setCommon({ ...common, description: e.target.value })}
              className="w-full border border-encre-700/30 rounded px-3 py-2 focus-ring bg-sable-50" />
            <p className="text-xs text-ocre-700 bg-ocre-500/10 border border-ocre-500/30 rounded px-2.5 py-2 mt-2 leading-relaxed">
              🚫 Articles interdits : alcool, porc, jeux d'argent, contenu explicite, contrefaçon, armes, crédit à intérêt. Voir la charte.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Prix (FCFA{transaction === "location" ? " / mois" : ""})</label>
              <input type="number" required value={common.prix} onChange={(e) => setCommon({ ...common, prix: e.target.value })}
                className="w-full border border-encre-700/30 rounded px-3 py-2 focus-ring bg-sable-50" />
            </div>
            <div>
              <label className="block text-sm mb-1">État</label>
              <select required value={common.etat} onChange={(e) => setCommon({ ...common, etat: e.target.value })}
                className="w-full border border-encre-700/30 rounded px-3 py-2 focus-ring bg-sable-50">
                <option value="">Choisir...</option>
                {ETATS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Ville</label>
              <select required value={common.ville} onChange={(e) => setCommon({ ...common, ville: e.target.value, commune: "" })}
                className="w-full border border-encre-700/30 rounded px-3 py-2 focus-ring bg-sable-50">
                <option value="">Choisir...</option>
                {VILLES_CI.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              {common.ville === "Autre" && (
                <input required value={common.villeAutre || ""} onChange={(e) => setCommon({ ...common, villeAutre: e.target.value })}
                  placeholder="Précisez la ville"
                  className="w-full border border-encre-700/30 rounded px-3 py-2 focus-ring bg-sable-50 mt-2" />
              )}
            </div>
          </div>

          {COMMUNES_BY_VILLE[common.ville]?.length > 0 && (
            <div>
              <label className="block text-sm mb-1">Commune / Quartier</label>
              <select value={common.commune} onChange={(e) => setCommon({ ...common, commune: e.target.value })}
                className="w-full border border-encre-700/30 rounded px-3 py-2 focus-ring bg-sable-50">
                <option value="">Choisir...</option>
                {COMMUNES_BY_VILLE[common.ville].map((c) => <option key={c} value={c}>{c}</option>)}
                <option value="Autre">Autre</option>
              </select>
              {common.commune === "Autre" && (
                <input value={common.communeAutre || ""} onChange={(e) => setCommon({ ...common, communeAutre: e.target.value })}
                  placeholder="Précisez la commune / le quartier"
                  className="w-full border border-encre-700/30 rounded px-3 py-2 focus-ring bg-sable-50 mt-2" />
              )}
            </div>
          )}

          <div>
            <label className="block text-sm mb-1">
              Complément d'adresse <span className="text-encre-700/50 font-normal">(optionnel)</span>
            </label>
            <input value={common.complement} onChange={(e) => setCommon({ ...common, complement: e.target.value })}
              placeholder="Ex: non loin de la pharmacie, lot 245, derrière l'église..."
              className="w-full border border-encre-700/30 rounded px-3 py-2 focus-ring bg-sable-50" />
            <p className="text-xs text-encre-700/50 mt-1">
              Utile surtout si la ville n'a pas de commune/quartier dans la liste, ou pour préciser un repère.
            </p>
          </div>

          <div className="border-t border-encre-700/15 pt-5">
            <h3 className="font-display text-lg mb-3">Caractéristiques — {cat?.label}</h3>
            <div className="grid grid-cols-2 gap-4">
              {cat?.fields.map((f) => (
                <div key={f.name} className={f.type === "boolean" ? "flex items-center gap-2 pt-6" : ""}>
                  {f.type === "boolean" ? (
                    <>
                      <input type="checkbox" id={f.name} checked={!!specific[f.name]}
                        onChange={(e) => updateSpecific(f.name, e.target.checked)} className="focus-ring" />
                      <label htmlFor={f.name} className="text-sm">{f.label}</label>
                    </>
                  ) : f.type === "select" ? (
                    <>
                      <label className="block text-sm mb-1">{f.label}</label>
                      <select required={f.required} value={specific[f.name] || ""} onChange={(e) => updateSpecific(f.name, e.target.value)}
                        className="w-full border border-encre-700/30 rounded px-3 py-2 focus-ring bg-sable-50">
                        <option value="">Choisir...</option>
                        {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </>
                  ) : (
                    <>
                      <label className="block text-sm mb-1">{f.label}</label>
                      <input type={f.type} required={f.required} value={specific[f.name] || ""}
                        onChange={(e) => updateSpecific(f.name, e.target.value)}
                        className="w-full border border-encre-700/30 rounded px-3 py-2 focus-ring bg-sable-50" />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-encre-700/15 pt-5">
            <h3 className="font-display text-lg mb-1">Contact</h3>
            <p className="text-xs text-encre-700/50 mb-3">
              Ce numéro est affiché publiquement sur l'annonce pour que les intéressés puissent vous appeler
              directement, en plus de la messagerie interne du site.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Nom du contact <span className="text-encre-700/50 font-normal">(optionnel)</span></label>
                <input value={common.contactNom} onChange={(e) => setCommon({ ...common, contactNom: e.target.value })}
                  className="w-full border border-encre-700/30 rounded px-3 py-2 focus-ring bg-sable-50" />
              </div>
              <div>
                <label className="block text-sm mb-1">Téléphone <span className="text-encre-700/50 font-normal">(optionnel)</span></label>
                <input value={common.contactTelephone} onChange={(e) => setCommon({ ...common, contactTelephone: e.target.value })}
                  className="w-full border border-encre-700/30 rounded px-3 py-2 focus-ring bg-sable-50" />
              </div>
            </div>
          </div>

          <div className="border-t border-encre-700/15 pt-5">
            <h3 className="font-display text-lg mb-3">Photos <span className="text-encre-700/50 font-normal text-sm">(5 maximum)</span></h3>

            {(existingRecord?.photos?.length > 0 || filePreviews.length > 0) && (
              <div className="flex gap-2 mb-3 flex-wrap">
                {existingRecord?.photos?.filter((p) => !removedExisting.includes(p)).map((filename) => (
                  <div key={filename} className="relative w-20 h-20">
                    <img src={listingPhotoUrl(filename)} className="w-20 h-20 object-cover rounded" />
                    <button type="button" onClick={() => toggleRemoveExisting(filename)}
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-encre-950 text-sable-50 text-xs flex items-center justify-center">
                      ×
                    </button>
                  </div>
                ))}
                {filePreviews.map((url, i) => (
                  <div key={url} className="relative w-20 h-20">
                    <img src={url} className="w-20 h-20 object-cover rounded" />
                    <button type="button" onClick={() => removeNewFile(i)}
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-encre-950 text-sable-50 text-xs flex items-center justify-center">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input type="file" multiple accept="image/*" onChange={async (e) => {
              const remainingExisting = (existingRecord?.photos?.length || 0) - removedExisting.length;
              const selected = Array.from(e.target.files);
              const room = Math.max(0, 5 - remainingExisting - files.length);
              const capped = selected.length > room ? selected.slice(0, room) : selected;
              if (selected.length > room) {
                setError(`Maximum 5 photos par annonce (il vous reste ${room} emplacement${room > 1 ? "s" : ""}).`);
              } else {
                setError("");
              }
              e.target.value = ""; // permet de resélectionner le même fichier plus tard si besoin
              if (!capped.length) return;
              setCompressing(true);
              const compressed = await compressPhotos(capped);
              setFiles((f) => [...f, ...compressed]); // s'ajoute aux photos déjà sélectionnées, ne les remplace pas
              setCompressing(false);
            }} />
            {compressing && <p className="text-xs text-encre-700/50 mt-1">Compression des photos en cours...</p>}
          </div>

          {error && <p className="text-ocre-600 text-sm">{error}</p>}

          <div className="fiche border-ocre-500 rounded p-3 text-sm text-ocre-700 flex items-start gap-2">
            <span className="shrink-0">⚠️</span>
            <span>Toute fausse annonce ou tentative de tromperie entraîne un <b>bannissement automatique</b> de la plateforme.</span>
          </div>

          <div className="flex gap-3">
            {!editMode && <button type="button" onClick={() => setStep(1)} className="px-6 py-3 rounded border border-encre-700/30">Retour</button>}
            <button disabled={loading || compressing} type="submit" className="bg-encre-950 text-sable-50 px-6 py-3 rounded hover:bg-encre-900 transition-colors disabled:opacity-50">
              {loading ? "Publication..." : editMode ? "Enregistrer" : "Publier l'annonce"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
