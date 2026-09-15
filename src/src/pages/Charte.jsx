export default function Charte() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="font-display text-3xl mb-6">Charte MonDjassa</h1>

      <p className="text-encre-700/80 mb-6 leading-relaxed">
        MonDjassa est une plateforme de petites annonces entre particuliers en Côte d'Ivoire,
        pensée pour rester conforme aux valeurs halal. Elle ne couvre pas l'immobilier (terrains,
        maisons, appartements) ni l'alimentation (produits périssables). Le mobilier et les
        accessoires de maison (tables, chaises, décoration...) restent en revanche autorisés.
      </p>

      <h2 className="font-display text-xl mb-3">Articles et activités strictement interdits</h2>
      <ul className="list-disc pl-5 space-y-1.5 text-encre-700/80 mb-6">
        <li>Alcool et tout produit dérivé</li>
        <li>Porc et tout produit dérivé</li>
        <li>Drogues et stupéfiants</li>
        <li>Matériel de jeux d'argent, paris sportifs, loterie</li>
        <li>Contenu ou matériel à caractère explicite/pornographique</li>
        <li>Prostitution et services sexuels</li>
        <li>Voyance, sorcellerie et pratiques occultes</li>
        <li>Produits contrefaits (répliques de marques)</li>
        <li>Armes à feu, armes de guerre, munitions, explosifs</li>
        <li>Faux documents (diplômes, papiers falsifiés...)</li>
        <li>Produits ou objets volés</li>
        <li>Tout service de crédit ou prêt à intérêt (riba)</li>
        <li>Animaux ou espèces dont la vente est interdite par la loi ivoirienne</li>
      </ul>

      <h2 className="font-display text-xl mb-3">Sanctions</h2>
      <p className="text-encre-700/80 mb-2 leading-relaxed">
        Toute annonce non conforme à cette charte est retirée. Le compte concerné reçoit un
        <b> premier avertissement</b> détaillant le motif. En cas de <b>récidive</b>, le compte est
        <b> bloqué</b>.
      </p>
      <p className="text-encre-700/80 mb-6 leading-relaxed">
        Un signalement fondé par un autre utilisateur (fausse annonce, tentative d'arnaque, propos
        abusifs...) suit la même règle : avertissement, puis blocage en cas de récidive.
      </p>

      <h2 className="font-display text-xl mb-3">Ce que MonDjassa n'est pas</h2>
      <p className="text-encre-700/80 leading-relaxed">
        MonDjassa met en relation acheteurs et vendeurs ; la plateforme n'est pas partie aux
        transactions et n'intervient pas dans la vente des articles publiés. Inspectez toujours
        l'article et son état avant de payer, et privilégiez une remise en main propre dans un lieu
        public.
      </p>
    </div>
  );
}
