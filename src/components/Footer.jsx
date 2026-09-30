import { Link } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { CATEGORIES } from "../data/categories";
import { PAYMENT_INSTRUCTIONS } from "../data/plans";
import AppLogo from "./AppLogo";

export default function Footer() {
  const year = new Date().getFullYear();

  // Version allégée pour l'app Android (affichée uniquement sur l'accueil).
  if (Capacitor.isNativePlatform()) {
    return (
      <footer className="bg-encre-950 text-sable-100/80 mt-10">
        <div className="px-5 pt-8 pb-6">
          <p className="font-display text-2xl text-sable-50 mb-2 flex items-center gap-2">
            <AppLogo size={28} />
            <span>Mon<span className="text-ocre-400">Djassa</span></span>
          </p>
          <p className="text-sm text-sable-100/60 leading-relaxed mb-6">
            Le marché ivoirien entre particuliers — achetez et vendez directement entre voisins, sans intermédiaire.
          </p>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="stamp text-xs text-or-400 mb-3">PLATEFORME</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/annonces" className="hover:text-sable-50">Toutes les annonces</Link></li>
                <li><Link to="/publier" className="hover:text-sable-50">Publier une annonce</Link></li>
                <li><Link to="/abonnement#offres" className="hover:text-sable-50">Abonnements & Boost</Link></li>
                <li><Link to="/charte" className="hover:text-sable-50">Charte</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="stamp text-xs text-or-400 mb-3">PAIEMENT & CONTACT</h3>
              <ul className="space-y-2 text-sm text-sable-100/60">
                <li>Orange Money : <span className="text-sable-100/90">{PAYMENT_INSTRUCTIONS.orangeMoney}</span></li>
                <li>MTN Money : <span className="text-sable-100/90">{PAYMENT_INSTRUCTIONS.mtnMoney}</span></li>
                <li>Wave : <span className="text-sable-100/90">{PAYMENT_INSTRUCTIONS.wave}</span></li>
                <li className="pt-1">
                  <Link to="/messages?agence=1" className="text-ocre-400 font-medium">✉️ Écrire à l'agence</Link>
                </li>
              </ul>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-sable-100/40">
            MonDjassa met en relation des particuliers et n'intervient pas dans les transactions. Vérifiez toujours
            l'article avant de payer et privilégiez une remise en main propre.
          </p>
        </div>

        <div className="border-t border-encre-700/60 px-5 py-4 text-xs text-sable-100/40 text-center">
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="mb-3 text-sable-100/70 border border-encre-700/60 rounded-full px-4 py-1.5">↑ Haut de page</button>
          <p>© {year} MonDjassa. Tous droits réservés.</p>
          <p className="mt-1">Fait avec soin pour la Côte d'Ivoire 🇨🇮</p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-encre-950 text-sable-100/80 mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-6">
        <div className="col-span-2 sm:col-span-1">
          <p className="font-display text-2xl text-sable-50 mb-3 flex items-center gap-2">
            <AppLogo size={28} />
            <span>Mon<span className="text-ocre-400">Djassa</span></span>
          </p>
          <p className="text-sm text-sable-100/60 leading-relaxed">
            Le marché ivoirien entre particuliers — électronique, mode, meubles, véhicules et
            bien plus, achetés et vendus directement entre voisins, sans intermédiaire.
          </p>
        </div>

        <div>
          <h3 className="stamp text-xs text-or-400 mb-4">CATÉGORIES</h3>
          <ul className="space-y-2 text-sm">
            {CATEGORIES.map((c) => (
              <li key={c.id}>
                <Link to={`/annonces?categorie=${c.id}`} className="hover:text-sable-50 transition-colors">
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="stamp text-xs text-or-400 mb-4">PLATEFORME</h3>
          <ul className="space-y-2 text-sm">
            <li><Link to="/annonces" className="hover:text-sable-50 transition-colors">Toutes les annonces</Link></li>
            <li><Link to="/publier" className="hover:text-sable-50 transition-colors">Publier une annonce</Link></li>
            <li><Link to="/abonnement#offres" className="hover:text-sable-50 transition-colors">Abonnements & Boost</Link></li>
            <li><Link to="/inscription" className="hover:text-sable-50 transition-colors">Créer un compte</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="stamp text-xs text-or-400 mb-4">PAIEMENT & CONTACT</h3>
          <ul className="space-y-2 text-sm text-sable-100/60">
            <li>Orange Money : <span className="text-sable-100/90">{PAYMENT_INSTRUCTIONS.orangeMoney}</span></li>
            <li>MTN Money : <span className="text-sable-100/90">{PAYMENT_INSTRUCTIONS.mtnMoney}</span></li>
            <li>Wave : <span className="text-sable-100/90">{PAYMENT_INSTRUCTIONS.wave}</span></li>
            <li className="pt-1">
              <Link to="/messages?agence=1" className="text-ocre-400 hover:text-sable-50 transition-colors font-medium">
                ✉️ Un problème ? Écrire à l'agence
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-encre-700/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 text-xs text-sable-100/40 text-center">
          MonDjassa est une plateforme de mise en relation entre particuliers et vendeurs : nous ne sommes pas partie
          aux transactions et n'intervenons pas dans la vente des articles publiés. Vérifiez toujours l'article et
          son état avant de payer, et privilégiez une remise en main propre.
        </div>
      </div>

      <div className="border-t border-encre-700/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-sable-100/40">
          <p>© {year} MonDjassa. Tous droits réservés.</p>
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="text-sable-100/60 hover:text-sable-50">↑ Haut de page</button>
          <p>Fait avec soin pour la Côte d'Ivoire 🇨🇮</p>
        </div>
      </div>
    </footer>
  );
}
