import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CATEGORIES } from "../data/categories";
import { getBoostPlan, getBoostPrice, getSubscriptionPlan, SUBSCRIPTION_PLANS } from "../data/plans";
import { useAuth } from "../contexts/AuthContext";
import {
  adminBoostListing, adminDeleteListing, adminRestoreListing, adminSetListingStatus, approveBoostRequest, approveSubscriptionRequest,
  deleteUserAccount, grantSubscription, restoreUserAccount,
  listenAllBoostRequests, listenAllListings, listenAllSubscriptionRequests, listenAllUsers,
  rejectBoostRequest, rejectSubscriptionRequest, setUserRole, suspendUser, warnUser,
} from "../lib/admin";
import { pbErrorMessage } from "../lib/normalize";
import { assignableRoles, isAtLeastAdmin, isSuperadmin, roleLevel } from "../lib/roles";
import { useToast } from "../contexts/ToastContext";
import { BOOST_PLANS } from "../data/plans";
import { sendMessage } from "../lib/listings";

const TABS = ["Statistiques", "Demandes en attente", "Utilisateurs", "Annonces"];

export default function AdminDashboard() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const myLevel = roleLevel(profile?.role);
  const iAmAdmin = isAtLeastAdmin(profile?.role);
  const iAmSuperadmin = isSuperadmin(profile?.role);
  // Un admin simple (non superadmin) n'a accès qu'à la validation des demandes.
  const visibleTabs = iAmSuperadmin ? TABS : ["Demandes en attente"];

  const [tab, setTab] = useState(iAmSuperadmin ? TABS[0] : "Demandes en attente");
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [subRequests, setSubRequests] = useState([]);
  const [boostRequests, setBoostRequests] = useState([]);
  const [errors, setErrors] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [listingFilters, setListingFilters] = useState({ categorie: "", owner: "", status: "", dateMin: "", dateMax: "" });
  const [contactTarget, setContactTarget] = useState(null);
  const [contactText, setContactText] = useState("");
  const [sendingContact, setSendingContact] = useState(false);

  async function handleSendContact(e) {
    e.preventDefault();
    if (!contactText.trim()) return;
    setSendingContact(true);
    try {
      await sendMessage(null, null, [profile.id, contactTarget.id], profile.id, contactText);
      showToast("Message envoyé.", "success");
      setContactTarget(null);
      setContactText("");
    } catch (err) {
      showToast("Échec de l'envoi : " + pbErrorMessage(err), "error");
    } finally {
      setSendingContact(false);
    }
  }

  const filteredListings = listings.filter((l) =>
    (!listingFilters.categorie || l.categorie === listingFilters.categorie) &&
    (!listingFilters.owner || l.owner === listingFilters.owner) &&
    (!listingFilters.status || l.status === listingFilters.status) &&
    (!listingFilters.dateMin || new Date(l.created) >= new Date(listingFilters.dateMin)) &&
    (!listingFilters.dateMax || new Date(l.created) <= new Date(listingFilters.dateMax + "T23:59:59"))
  );

  function setCollectionError(key) {
    return (err) => setErrors((e) => ({ ...e, [key]: pbErrorMessage(err) }));
  }

  useEffect(() => {
    const u1 = listenAllUsers(setUsers, setCollectionError("users"));
    const u2 = listenAllListings(setListings, setCollectionError("listings"));
    const u3 = listenAllSubscriptionRequests(setSubRequests, setCollectionError("subscriptionRequests"));
    const u4 = listenAllBoostRequests(setBoostRequests, setCollectionError("boostRequests"));
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  // Exécute une action admin avec gestion d'erreur visible + mise à jour immédiate
  // de l'écran (ne dépend pas du temps réel, qui peut être indisponible selon l'hébergement).
  async function run(id, action, onSuccess) {
    setBusyId(id);
    setErrors((e) => ({ ...e, action: null }));
    try {
      const result = await action();
      onSuccess?.(result);
      showToast("Action effectuée avec succès.", "success");
    } catch (err) {
      showToast("Échec de l'action : " + pbErrorMessage(err), "error");
    } finally {
      setBusyId(null);
    }
  }

  const pendingSub = subRequests.filter((r) => r.status === "en_attente");
  const pendingBoost = boostRequests.filter((r) => r.status === "en_attente");

  const stats = useMemo(() => {
    const byCategory = CATEGORIES.map((c) => ({
      label: c.label,
      count: listings.filter((l) => l.categorie === c.id).length,
    }));
    const revenueEstime =
      subRequests.filter((r) => r.status === "validee").reduce((s, r) => s + (getSubscriptionPlan(r.planId).price || 0), 0) +
      boostRequests.filter((r) => r.status === "validee").reduce((s, r) => {
        const l = listings.find((x) => x.id === r.listing);
        return s + (l ? getBoostPrice(r.planId, l.prix) : 0);
      }, 0);
    const regularUsers = users.filter((u) => (u.role || "user") === "user");
    return {
      totalUsers: regularUsers.length,
      totalListings: listings.length,
      activeListings: listings.filter((l) => l.status === "disponible").length,
      boosted: listings.filter((l) => l.boostedUntil && new Date(l.boostedUntil).getTime() > Date.now()).length,
      abonnesPayants: users.filter((u) => u.plan && u.plan !== "starter" && u.planActive).length,
      revenueEstime,
      byCategory,
    };
  }, [users, listings, subRequests, boostRequests]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display text-3xl mb-1">Administration</h1>
      <p className="text-encre-700/70 mb-2">
        Connecté en tant que <b>{profile?.role}</b>
        {!iAmSuperadmin && " — accès limité à la validation des demandes d'abonnement et de boost."}
      </p>

      {Object.values(errors).filter(Boolean).length > 0 && (
        <div className="fiche border-ocre-500 rounded p-4 mb-6 text-sm text-ocre-700">
          <p className="font-medium mb-1">⚠ Certaines données n'ont pas pu être chargées :</p>
          <ul className="list-disc pl-5 space-y-0.5">
            {Object.entries(errors).filter(([, v]) => v).map(([k, v]) => (
              <li key={k}><b>{k}</b> : {v}</li>
            ))}
          </ul>
          <p className="mt-2 text-encre-700/70">
            C'est presque toujours une règle d'accès (API Rule) manquante ou trop restrictive sur cette
            collection dans PocketBase — vérifie qu'elle autorise <code>@request.auth.role = "admin" || @request.auth.role = "superadmin"</code>.
          </p>
        </div>
      )}

      <div className="flex gap-1 mb-8 border-b border-encre-700/15 overflow-x-auto">
        {visibleTabs.map((t) => {
          let count = 0;
          if (t === "Demandes en attente") count = pendingSub.length + pendingBoost.length;
          if (t === "Utilisateurs") count = users.filter((u) => u.id !== profile.id).length;
          if (t === "Annonces") count = listings.length;
          return (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm stamp shrink-0 ${tab === t ? "border-b-2 border-ocre-500 text-ocre-600" : "text-encre-700/60"}`}>
              {t.toUpperCase()}
              {count > 0 && (
                <span className="ml-1.5 bg-ocre-500 text-sable-50 rounded-full px-1.5 text-[10px]">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {tab === "Statistiques" && iAmSuperadmin && (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
            <StatCard label="Utilisateurs" value={stats.totalUsers} />
            <StatCard label="Annonces totales" value={stats.totalListings} />
            <StatCard label="Annonces actives" value={stats.activeListings} />
            <StatCard label="Annonces boostées" value={stats.boosted} />
            <StatCard label="Abonnés payants" value={stats.abonnesPayants} />
            <StatCard label="Revenu validé (estimé)" value={`${stats.revenueEstime.toLocaleString("fr-FR")} FCFA`} />
          </div>
          <h2 className="font-display text-xl mb-3">Annonces par catégorie</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {stats.byCategory.map((c) => (
              <div key={c.label} className="fiche rounded p-3 flex justify-between text-sm">
                <span>{c.label}</span><span className="font-display text-ocre-600">{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "Demandes en attente" && (
        <div className="space-y-8">
          <div>
            <h2 className="font-display text-xl mb-3">Abonnements ({pendingSub.length})</h2>
            {pendingSub.length === 0 && <p className="text-sm text-encre-700/60">Aucune demande en attente.</p>}
            <div className="space-y-2">
              {pendingSub.map((r) => {
                const u = users.find((x) => x.id === r.user);
                const plan = getSubscriptionPlan(r.planId);
                return (
                  <div key={r.id} className="fiche rounded p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm">
                      <p><b>{u?.nom || r.user}</b> — {plan.label} ({plan.price.toLocaleString("fr-FR")} FCFA)</p>
                      <p className="text-encre-700/60">Réf. transaction : {r.transactionRef}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button disabled={busyId === r.id}
                        onClick={() => run(r.id, () => approveSubscriptionRequest(r), () => {
                          setSubRequests((prev) => prev.map((x) => x.id === r.id ? { ...x, status: "validee" } : x));
                          setUsers((prev) => prev.map((u2) => u2.id === r.user ? { ...u2, plan: r.planId, planActive: true } : u2));
                        })}
                        className="bg-indigo-500 text-sable-50 px-3 py-1.5 rounded text-sm disabled:opacity-50">
                        {busyId === r.id ? "..." : "Activer"}
                      </button>
                      <button disabled={busyId === r.id}
                        onClick={() => run(r.id, () => rejectSubscriptionRequest(r), () => {
                          setSubRequests((prev) => prev.map((x) => x.id === r.id ? { ...x, status: "refusee" } : x));
                        })}
                        className="border border-encre-700/30 px-3 py-1.5 rounded text-sm disabled:opacity-50">
                        Refuser
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="font-display text-xl mb-3">Boosts ({pendingBoost.length})</h2>
            {pendingBoost.length === 0 && <p className="text-sm text-encre-700/60">Aucune demande en attente.</p>}
            <div className="space-y-2">
              {pendingBoost.map((r) => {
                const u = users.find((x) => x.id === r.user);
                const l = listings.find((x) => x.id === r.listing);
                const plan = getBoostPlan(r.planId);
                const price = l ? getBoostPrice(r.planId, l.prix) : null;
                return (
                  <div key={r.id} className="fiche rounded p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm">
                      <p><b>{u?.nom || r.user}</b> — "{l?.titre || r.listing}" — {plan?.label}{price !== null ? ` (${price.toLocaleString("fr-FR")} FCFA)` : ""}</p>
                      <p className="text-encre-700/60">Réf. transaction : {r.transactionRef}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button disabled={busyId === r.id}
                        onClick={() => run(r.id, () => approveBoostRequest(r), (until) => {
                          setBoostRequests((prev) => prev.map((x) => x.id === r.id ? { ...x, status: "validee" } : x));
                          setListings((prev) => prev.map((x) => x.id === r.listing ? { ...x, boostedUntil: until } : x));
                        })}
                        className="bg-or-500 text-encre-950 px-3 py-1.5 rounded text-sm disabled:opacity-50">
                        {busyId === r.id ? "..." : "Activer"}
                      </button>
                      <button disabled={busyId === r.id}
                        onClick={() => run(r.id, () => rejectBoostRequest(r), () => {
                          setBoostRequests((prev) => prev.map((x) => x.id === r.id ? { ...x, status: "refusee" } : x));
                        })}
                        className="border border-encre-700/30 px-3 py-1.5 rounded text-sm disabled:opacity-50">
                        Refuser
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === "Utilisateurs" && iAmSuperadmin && (
        <div className="space-y-2">
          {users.filter((u) => u.id !== profile.id).length === 0 && (
            <p className="text-sm text-encre-700/60">Aucun autre compte pour l'instant.</p>
          )}
          {users.filter((u) => u.id !== profile.id).map((u) => {
            const roleOptions = assignableRoles(profile?.role);
            return (
              <div key={u.id} className="fiche rounded p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm">
                  <p>
                    <b>{u.nom}</b>{" "}
                    {u.role !== "user" && <span className="stamp text-[10px] text-or-500 ml-1">{u.role.toUpperCase()}</span>}
                    {u.suspended && !u.deleted && <span className="stamp text-[10px] text-ocre-600 ml-1">SUSPENDU</span>}
                    {u.deleted && <span className="stamp text-[10px] text-ocre-600 ml-1">SUPPRIMÉ</span>}
                    {u.warningsCount > 0 && <span className="stamp text-[10px] text-indigo-600 ml-1">{u.warningsCount} AVERTISSEMENT{u.warningsCount > 1 ? "S" : ""}</span>}
                  </p>
                  <p className="text-encre-700/60">{u.email} · {u.telephone} · plan: {u.plan || "starter"} · {listings.filter((l) => l.owner === u.id).length} annonce(s)</p>
                </div>

                <div className="flex flex-wrap gap-2 shrink-0 items-center">
                  <select defaultValue="" onChange={(e) => {
                    if (!e.target.value) return;
                    run(u.id, () => grantSubscription(u.id, e.target.value), () => {
                      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, plan: e.target.value, planActive: true } : x));
                    });
                    e.target.value = "";
                  }}
                    className="border border-indigo-500 text-indigo-600 rounded text-sm px-2 py-1.5 bg-sable-50">
                    <option value="">Attribuer un abonnement...</option>
                    {SUBSCRIPTION_PLANS.filter((p) => p.id !== "starter").map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>

                  <select value={u.role} onChange={(e) => {
                    const newRole = e.target.value;
                    run(u.id, () => setUserRole(u.id, newRole), () => {
                      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, role: newRole } : x));
                    });
                  }}
                    className="border border-encre-700/30 rounded text-sm px-2 py-1.5 bg-sable-50">
                    {roleOptions.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>

                  <button onClick={() => setContactTarget(u)}
                    className="border border-encre-700/30 px-3 py-1.5 rounded text-sm hover:border-ocre-500">
                    Contacter
                  </button>

                  <button disabled={busyId === u.id}
                    onClick={() => {
                      const reason = prompt(`Motif de l'avertissement pour ${u.nom} (visible par l'utilisateur) :`);
                      if (!reason) return;
                      run(u.id, () => warnUser(u.id, reason), ({ newCount, willBeBanned }) => {
                        setUsers((prev) => prev.map((x) => x.id === u.id
                          ? { ...x, warningsCount: newCount, suspended: willBeBanned ? true : x.suspended }
                          : x));
                      });
                    }}
                    className="border border-indigo-500 text-indigo-600 px-3 py-1.5 rounded text-sm disabled:opacity-50">
                    Avertir
                  </button>

                  <button disabled={busyId === u.id}
                    onClick={() => run(u.id, () => suspendUser(u.id, !u.suspended), () => {
                      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, suspended: !u.suspended } : x));
                    })}
                    className="border border-ocre-500 text-ocre-600 px-3 py-1.5 rounded text-sm disabled:opacity-50">
                    {u.suspended ? "Réactiver" : "Suspendre"}
                  </button>

                  <button disabled={busyId === u.id}
                    onClick={() => {
                      if (u.deleted) {
                        run(u.id, () => restoreUserAccount(u.id), () => {
                          setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, deleted: false, suspended: false } : x));
                        });
                        return;
                      }
                      if (!confirm(`Désactiver le compte de ${u.nom} ? Il ne pourra plus se connecter, mais son compte et ses données restent conservés (réactivable).`)) return;
                      run(u.id, () => deleteUserAccount(u.id), () => {
                        setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, deleted: true, suspended: true } : x));
                      });
                    }}
                    className={`px-3 py-1.5 text-sm disabled:opacity-50 ${u.deleted ? "border border-indigo-500 text-indigo-600 rounded" : "text-ocre-600"}`}>
                    {u.deleted ? "Réactiver" : "Supprimer"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "Annonces" && iAmSuperadmin && (
        <div>
          <div className="flex flex-wrap gap-3 mb-6">
            <select value={listingFilters.categorie} onChange={(e) => setListingFilters((f) => ({ ...f, categorie: e.target.value }))}
              className="border border-encre-700/30 rounded px-3 py-2 text-sm bg-sable-50">
              <option value="">Toutes catégories</option>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <select value={listingFilters.owner} onChange={(e) => setListingFilters((f) => ({ ...f, owner: e.target.value }))}
              className="border border-encre-700/30 rounded px-3 py-2 text-sm bg-sable-50">
              <option value="">Tous les utilisateurs</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.nom}</option>)}
            </select>
            <select value={listingFilters.status} onChange={(e) => setListingFilters((f) => ({ ...f, status: e.target.value }))}
              className="border border-encre-700/30 rounded px-3 py-2 text-sm bg-sable-50">
              <option value="">Tous les statuts</option>
              <option value="disponible">Disponible</option>
              <option value="vendu">Vendu</option>
              <option value="loue">Loué</option>
              <option value="suspendu">Suspendu</option>
            </select>
            <input type="date" value={listingFilters.dateMin} title="Publiée après le"
              onChange={(e) => setListingFilters((f) => ({ ...f, dateMin: e.target.value }))}
              className="border border-encre-700/30 rounded px-3 py-2 text-sm bg-sable-50" />
            <input type="date" value={listingFilters.dateMax} title="Publiée avant le"
              onChange={(e) => setListingFilters((f) => ({ ...f, dateMax: e.target.value }))}
              className="border border-encre-700/30 rounded px-3 py-2 text-sm bg-sable-50" />
            {(listingFilters.categorie || listingFilters.owner || listingFilters.status || listingFilters.dateMin || listingFilters.dateMax) && (
              <button onClick={() => setListingFilters({ categorie: "", owner: "", status: "", dateMin: "", dateMax: "" })}
                className="text-sm text-ocre-600 px-2">Réinitialiser</button>
            )}
          </div>

          {CATEGORIES
            .filter((c) => !listingFilters.categorie || listingFilters.categorie === c.id)
            .map((c) => {
              const items = filteredListings.filter((l) => l.categorie === c.id);
              if (items.length === 0) return null;
              return (
                <div key={c.id} className="mb-8">
                  <h2 className="font-display text-xl mb-3">{c.label} <span className="text-sm text-encre-700/50 font-body">({items.length})</span></h2>
                  <div className="space-y-2">
                    {items.map((l) => {
                      const owner = users.find((u) => u.id === l.owner);
                      const boosted = l.boostedUntil && new Date(l.boostedUntil).getTime() > Date.now();
                      return (
                        <div key={l.id} className={`fiche rounded p-4 flex flex-wrap items-center justify-between gap-3 ${l.removedByAdmin ? "opacity-60" : ""}`}>
                          <Link to={`/annonces/${l.id}`} className="text-sm hover:text-ocre-600">
                            <p><b className="underline decoration-dotted">{l.titre}</b> — {l.ville} — {Number(l.prix).toLocaleString("fr-FR")} FCFA</p>
                            <p className="text-encre-700/60">
                              Statut : {l.status} · Propriétaire : {owner?.nom || "—"} ·{" "}
                              {boosted
                                ? <span className="text-or-600">Boosté jusqu'au {new Date(l.boostedUntil).toLocaleDateString("fr-FR")}</span>
                                : l.boostedUntil
                                ? <span>Boost expiré le {new Date(l.boostedUntil).toLocaleDateString("fr-FR")}</span>
                                : <span>Jamais boostée</span>}
                              {l.removedByAdmin && <span className="text-ocre-600"> · RETIRÉE PAR L'ADMIN</span>}
                            </p>
                          </Link>
                          <div className="flex flex-wrap gap-2 shrink-0">
                            <select value={l.status} disabled={busyId === l.id} onChange={(e) => {
                              const status = e.target.value;
                              run(l.id, () => adminSetListingStatus(l.id, status), () => {
                                setListings((prev) => prev.map((x) => x.id === l.id ? { ...x, status } : x));
                              });
                            }}
                              className="border border-encre-700/30 rounded px-2 py-1.5 text-sm bg-sable-50 disabled:opacity-50">
                              <option value="disponible">Disponible</option>
                              <option value="vendu">Vendu</option>
                              <option value="loue">Loué</option>
                              <option value="suspendu">Suspendu (modération)</option>
                            </select>
                            <select defaultValue="" disabled={busyId === l.id} onChange={(e) => {
                              if (!e.target.value) return;
                              const days = Number(e.target.value);
                              run(l.id, () => adminBoostListing(l.id, days), (until) => {
                                setListings((prev) => prev.map((x) => x.id === l.id ? { ...x, boostedUntil: until } : x));
                              });
                              e.target.value = "";
                            }}
                              className="border border-or-500 text-or-500 rounded px-2 py-1.5 text-sm bg-sable-50 disabled:opacity-50">
                              <option value="">Booster manuellement...</option>
                              {BOOST_PLANS.map((p) => <option key={p.id} value={p.days}>{p.label}</option>)}
                            </select>
                            {l.removedByAdmin ? (
                              <button disabled={busyId === l.id}
                                onClick={() => run(l.id, () => adminRestoreListing(l.id), () => {
                                  setListings((prev) => prev.map((x) => x.id === l.id ? { ...x, removedByAdmin: false } : x));
                                })}
                                className="border border-indigo-500 text-indigo-600 px-3 py-1.5 rounded text-sm disabled:opacity-50">
                                Restaurer
                              </button>
                            ) : (
                              <button disabled={busyId === l.id}
                                onClick={() => {
                                  if (!confirm("Retirer cette annonce ? Elle disparaîtra des résultats publics mais le propriétaire la reverra dans \"Mes annonces\" avec un message expliquant le retrait.")) return;
                                  run(l.id, () => adminDeleteListing(l.id), () => {
                                    setListings((prev) => prev.map((x) => x.id === l.id ? { ...x, removedByAdmin: true } : x));
                                  });
                                }}
                                className="text-ocre-600 px-3 py-1.5 text-sm disabled:opacity-50">
                                Supprimer
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          {filteredListings.length === 0 && <p className="text-sm text-encre-700/60">Aucune annonce ne correspond à ces filtres.</p>}
        </div>
      )}

      {contactTarget && (
        <div className="fixed inset-0 bg-encre-950/50 flex items-center justify-center p-4 z-50" onClick={() => setContactTarget(null)}>
          <div className="bg-sable-50 rounded p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-xl mb-4">Contacter {contactTarget.nom}</h3>
            <form onSubmit={handleSendContact}>
              <textarea required rows={4} value={contactText} onChange={(e) => setContactText(e.target.value)}
                placeholder="Votre message..."
                className="w-full border border-encre-700/30 rounded px-3 py-2 text-sm mb-4 focus-ring bg-sable-50" />
              <div className="flex gap-2">
                <button type="button" onClick={() => setContactTarget(null)} className="flex-1 border border-encre-700/30 rounded py-2 text-sm">Annuler</button>
                <button disabled={sendingContact} type="submit" className="flex-1 bg-encre-950 text-sable-50 rounded py-2 text-sm disabled:opacity-50">
                  {sendingContact ? "..." : "Envoyer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="fiche rounded p-4">
      <p className="font-display text-2xl text-ocre-600">{value}</p>
      <p className="text-xs text-encre-700/60 mt-1">{label}</p>
    </div>
  );
}
