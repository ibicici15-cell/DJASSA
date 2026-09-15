// Articles et activités interdits sur MonDjassa (plateforme sans alcool, porc,
// jeux d'argent, contenu explicite, contrefaçon ni armes). Vérification simple
// par mots-clés sur le titre et la description — un premier filtre, pas une
// garantie absolue : la modération humaine (signalements, admin) reste le
// dernier rempart pour tout ce qui passe entre les mailles du filet.
const FORBIDDEN_KEYWORDS = [
  // Alcool
  "bar", "bars", "alcool", "alcoolisé", "alcoolisée", "boisson alcoolisée",
  "brasserie", "cabaret", "buvette", "cave à vin", "cave a vin",
  "débit de boisson", "debit de boisson", "vente d'alcool", "vente d alcool",
  "whisky", "spiritueux", "bière", "biere", "vin rouge", "vin blanc", "champagne",

  // Vie nocturne (souvent associée à l'alcool)
  "night-club", "nightclub", "night club", "boîte de nuit", "boite de nuit",
  "discothèque", "discotheque",

  // Porc
  "porc", "porcs", "porcherie", "charcuterie de porc", "élevage porcin",
  "elevage porcin", "vente de porc", "viande de porc", "jambon", "lard", "bacon",

  // Jeux d'argent
  "casino", "loterie", "pari sportif", "paris sportifs", "jeux d'argent",
  "jeux d argent", "machine à sous", "machine a sous", "pmu", "parions sport",

  // Contenu explicite / adulte
  "pornographique", "contenu adulte", "sex-shop", "sex shop",

  // Contrefaçon
  "contrefaçon", "contrefacon", "réplique", "replique de marque", "faux de marque",

  // Armes
  "arme à feu", "arme a feu", "arme de guerre", "munitions", "explosif",

  // Crédit à intérêt
  "prêt à intérêt", "pret a interet", "crédit à intérêt", "credit a interet", "usure",

  // Drogues et stupéfiants
  "drogue", "stupéfiant", "stupefiant", "cannabis", "cocaïne", "cocaine", "héroïne", "heroine",

  // Prostitution / services sexuels
  "prostitution", "escort", "service sexuel", "services sexuels", "call-girl", "call girl",

  // Occultisme (contraire aux valeurs de la plateforme)
  "voyance", "voyant", "sorcellerie", "marabout", "envoûtement", "envoutement",

  // Documents falsifiés / produits volés
  "faux document", "faux documents", "faux papiers", "diplôme falsifié", "diplome falsifie",
  "produit volé", "produit vole", "objet volé", "objet vole", "marchandise volée", "marchandise volee",
];

export function findForbiddenActivity(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  return FORBIDDEN_KEYWORDS.find((kw) => lower.includes(kw)) || null;
}

export const FORBIDDEN_ACTIVITY_MESSAGE =
  "Cet article ou cette activité n'est pas autorisé(e) sur MonDjassa (alcool, porc, jeux d'argent, drogue, contenu explicite, prostitution, occultisme, contrefaçon, armes, faux documents, produits volés, crédit à intérêt). Voir la charte de la plateforme.";
