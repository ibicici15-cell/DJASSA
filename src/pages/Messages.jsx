import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  listenConversations, listenMessages, sendMessage, getListing, getUserName,
  markConversationRead, contactSupport,
} from "../lib/listings";
import { useToast } from "../contexts/ToastContext";
import { isAtLeastAdmin } from "../lib/roles";

export default function Messages() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [listingTitles, setListingTitles] = useState({});
  const [participantNames, setParticipantNames] = useState({});
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [supportText, setSupportText] = useState("");
  const [sendingSupport, setSendingSupport] = useState(false);

  useEffect(() => {
    if (!user) return;
    return listenConversations(user.id, setConversations);
  }, [user]);

  // Vient d'un lien "Écrire à l'agence" (Footer, Mes annonces...) : ouvre
  // directement la conversation existante avec l'agence, ou le formulaire de
  // premier contact s'il n'y en a pas encore — sans passer par la liste.
  useEffect(() => {
    if (searchParams.get("agence") !== "1" || !conversations) return;
    const supportConv = conversations.find((c) => !c.listing);
    if (supportConv) setActive(supportConv);
    else setShowSupportForm(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, conversations]);

  useEffect(() => {
    conversations.forEach((c) => {
      if (c.listing && !listingTitles[c.listing]) {
        getListing(c.listing).then((l) => {
          if (l) setListingTitles((t) => ({ ...t, [c.listing]: l.titre }));
        });
      }
      const otherId = c.participants?.find((id) => id !== user?.id);
      if (otherId && !participantNames[otherId]) {
        getUserName(otherId).then((nom) => {
          if (nom) setParticipantNames((n) => ({ ...n, [otherId]: nom }));
        });
      }
    });
  }, [conversations]);

  useEffect(() => {
    if (!active) return;
    markConversationRead(active.id, user.id);
    return listenMessages(active.id, setMessages);
  }, [active]);

  const [sendingText, setSendingText] = useState(false);

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim() || sendingText) return;
    setSendingText(true);
    const toSend = text;
    try {
      await sendMessage(active.id, active.listing, active.participants, user.id, toSend);
      setText(""); // uniquement vidé si l'envoi a réussi — sinon le texte tapé reste pour ne pas le perdre
    } catch (err) {
      showToast(err?.message || "Message non envoyé, réessayez.", "error");
    } finally {
      setSendingText(false);
    }
  }

  async function handleSendSupport(e) {
    e.preventDefault();
    if (!supportText.trim()) return;
    setSendingSupport(true);
    try {
      await contactSupport(user.id, supportText);
      setSupportText("");
      setShowSupportForm(false);
      showToast("Message envoyé à l'agence.", "success");
    } catch (err) {
      showToast(err.message || "Impossible d'envoyer le message.", "error");
    } finally {
      setSendingSupport(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-8 gap-3 flex-wrap">
        <h1 className="font-display text-3xl">Messages</h1>
        {!isAtLeastAdmin(profile?.role) && (
          <button onClick={() => setShowSupportForm(true)}
            className="text-sm border border-ocre-500 text-ocre-600 px-4 py-2 rounded hover:bg-ocre-500 hover:text-sable-50 transition-colors">
            ✉️ Écrire à l'agence
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6 fiche rounded overflow-hidden" style={{ minHeight: "60vh" }}>
        <div className={`border-r border-encre-700/15 ${active ? "hidden md:block" : "block"}`}>
          {conversations.length === 0 && <p className="p-4 text-sm text-encre-700/60">Aucune conversation.</p>}
          {conversations.map((c) => {
            const otherId = c.participants?.find((id) => id !== user.id);
            return (
              <button key={c.id} onClick={() => setActive(c)}
                className={`w-full text-left p-4 border-b border-encre-700/10 hover:bg-sable-100 ${active?.id === c.id ? "bg-sable-100" : ""}`}>
                <p className="text-sm font-semibold truncate">
                  {c.listing ? (participantNames[otherId] || "Utilisateur") : "✉️ Assistance MonDjassa"}
                </p>
                {c.listing && (
                  <p className="text-xs text-ocre-600 truncate">{listingTitles[c.listing] || "Annonce"}</p>
                )}
                <p className="text-xs text-encre-700/60 truncate">{c.lastMessage}</p>
              </button>
            );
          })}
        </div>
        <div className={`md:col-span-2 flex-col p-4 ${active ? "flex" : "hidden md:flex"}`}>
          {active ? (
            <>
              <div className="pb-3 mb-3 border-b border-encre-700/10 flex items-center gap-2">
                <button onClick={() => setActive(null)} className="md:hidden text-encre-700/60 hover:text-ocre-600 -ml-1 p-1" aria-label="Retour à la liste">
                  ←
                </button>
                <div>
                  <p className="font-semibold text-sm">
                    {active.listing
                      ? (participantNames[active.participants?.find((id) => id !== user.id)] || "Utilisateur")
                      : "✉️ Assistance MonDjassa"}
                  </p>
                  {active.listing && <p className="text-xs text-ocre-600">{listingTitles[active.listing] || "Annonce"}</p>}
                </div>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto mb-4">
                {messages.map((m) => (
                  <div key={m.id} className={`max-w-xs sm:max-w-sm px-3 py-2 rounded text-sm whitespace-pre-line ${m.fromUser === user.id ? "bg-ocre-500 text-sable-50 ml-auto" : "bg-sable-100"}`}>
                    {m.text}
                  </div>
                ))}
              </div>
              <form onSubmit={handleSend} className="flex gap-2">
                <input value={text} onChange={(e) => setText(e.target.value)}
                  className="flex-1 border border-encre-700/30 rounded px-3 py-2 text-sm focus-ring bg-sable-50" placeholder="Votre message..." />
                <button disabled={sendingText} type="submit" className="bg-encre-950 text-sable-50 px-4 rounded text-sm disabled:opacity-50">
                  {sendingText ? "..." : "Envoyer"}
                </button>
              </form>
            </>
          ) : (
            <p className="text-sm text-encre-700/60 m-auto">Sélectionnez une conversation.</p>
          )}
        </div>
      </div>

      {showSupportForm && (
        <div className="fixed inset-0 bg-encre-950/50 flex items-center justify-center p-4 z-40" onClick={() => setShowSupportForm(false)}>
          <div className="bg-sable-50 rounded p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-xl mb-1">Écrire à l'agence</h3>
            <p className="text-xs text-encre-700/60 mb-4">
              Pour signaler un problème, une annonce suspecte, ou toute question sur votre compte.
            </p>
            <form onSubmit={handleSendSupport}>
              <textarea required rows={4} value={supportText} onChange={(e) => setSupportText(e.target.value)}
                placeholder="Décrivez votre problème ou votre question..."
                className="w-full border border-encre-700/30 rounded px-3 py-2 text-sm mb-4 focus-ring bg-sable-50" />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowSupportForm(false)} className="flex-1 border border-encre-700/30 rounded py-2 text-sm">Annuler</button>
                <button disabled={sendingSupport} type="submit" className="flex-1 bg-ocre-500 text-sable-50 rounded py-2 text-sm disabled:opacity-50">
                  {sendingSupport ? "Envoi..." : "Envoyer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
