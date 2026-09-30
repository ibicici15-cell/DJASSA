import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

// Gère le défilement à chaque changement de page (React Router ne le fait pas) :
//  1. lien avec ancre (ex: /abonnement#offres) -> défile jusqu'à cet élément ;
//  2. page avec un bloc marqué data-scroll-target (formulaire de connexion,
//     d'inscription...) -> défile jusqu'à ce bloc ;
//  3. sinon -> retour en haut de la page.
// Retour arrière (bouton "précédent") : on ne touche à rien, pour retrouver
// la position où l'on était.
export default function ScrollManager() {
  const { pathname, hash } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    let cancelled = false;
    let tries = 0;

    function scrollToId(id) {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      // Le contenu peut arriver après un chargement : on réessaie brièvement.
      if (!cancelled && tries++ < 15) setTimeout(() => scrollToId(id), 100);
    }

    if (hash) {
      scrollToId(decodeURIComponent(hash.slice(1)));
      return () => { cancelled = true; };
    }

    if (navType === "POP") return;

    const target = document.querySelector("[data-scroll-target]");
    if (target) {
      target.scrollIntoView({ behavior: "auto", block: "start" });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
    return () => { cancelled = true; };
  }, [pathname, hash, navType]);

  return null;
}
