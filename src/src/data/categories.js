// Schéma des catégories MonDjassa. Chaque catégorie a une couleur dédiée
// (bg = fond pastel, fg = couleur de l'icône/accent) et une liste de
// sous-catégories utilisée comme champ "Sous-catégorie" dans le formulaire de
// publication et comme filtre de recherche.
//
// Périmètre : tous secteurs halal sauf l'immobilier (terrains/maisons/
// appartements — couvert par ailleurs) et l'alimentation (périssable, jugée
// trop difficile à contrôler pour rester sur cette plateforme). Voir
// CHARTE.md pour la liste complète des articles interdits.

export const TRANSACTION_TYPES = [
  { value: "vente", label: "Vente" },
  { value: "location", label: "Location" },
];

export const ETATS = [
  { value: "neuf", label: "Neuf" },
  { value: "comme_neuf", label: "Comme neuf" },
  { value: "bon_etat", label: "Bon état" },
  { value: "use", label: "Usé" },
];

export const VILLES_CI = [
  "Abidjan", "Bouaké", "Daloa", "Yamoussoukro", "San-Pédro",
  "Korhogo", "Man", "Divo", "Gagnoa", "Abengourou",
  "Grand-Bassam", "Bingerville", "Anyama", "Soubré", "Kong", "Autre",
];

export const COMMUNES_ABIDJAN = [
  "Cocody", "Plateau", "Marcory", "Treichville", "Yopougon",
  "Abobo", "Adjamé", "Koumassi", "Port-Bouët", "Attécoubé", "Bingerville", "Songon",
];

export const COMMUNES_BY_VILLE = {
  "Abidjan": COMMUNES_ABIDJAN,
  "Bouaké": ["Air France", "Belleville", "Dar-es-Salam", "Kennedy", "Koko", "N'Gattakro", "Sokoura", "Zone Industrielle"],
  "Daloa": ["Lobia", "Tazibouo", "Gbeuliville", "Commerce", "Orly", "Abattoir"],
  "Yamoussoukro": ["Habitat", "Millionnaire", "Kokrenou", "N'Zuessy", "Dioulakro"],
  "San-Pédro": ["Bardo", "Cité", "Balmer", "Séwéké", "Zimmermann", "Lac"],
  "Korhogo": ["Petit Paris", "Koko", "Haoussabougou", "Résidentiel", "Soba"],
  "Man": ["Dioulabougou", "Libreville", "Bienvenue", "Domoraud", "Grand-Gbapleu"],
  "Divo": ["Résidentiel", "Quartier Baoulé", "Belleville"],
  "Gagnoa": ["Dioulabougou", "Centre-ville", "Bassa"],
  "Abengourou": ["Zongo", "Résidentiel", "Commerce"],
  "Grand-Bassam": ["Quartier France", "Impérial", "Moossou", "N'Zima"],
  "Anyama": ["Anyama-centre", "Akromiabla", "Adjamé-Anyama"],
};

const sousCategorieField = (options) => ({ name: "sousCategorie", label: "Sous-catégorie", type: "select", options, required: true });

export const CATEGORIES = [
  {
    id: "vehicules",
    label: "Véhicules",
    icon: "vehicules",
    color: { bg: "#E3F0FC", fg: "#2C5A96" },
    subcategories: ["Voitures", "SUV / 4x4", "Utilitaires", "Camions", "Bus / minibus", "Motos", "Scooters", "Vélos", "Tricycles", "Engins agricoles", "Engins de chantier", "Pièces automobiles", "Pneus", "Jantes", "Accessoires automobiles"],
    fields: [
      sousCategorieField(["Voitures", "SUV / 4x4", "Utilitaires", "Camions", "Bus / minibus", "Motos", "Scooters", "Vélos", "Tricycles", "Engins agricoles", "Engins de chantier", "Pièces automobiles", "Pneus", "Jantes", "Accessoires automobiles"]),
      { name: "marque", label: "Marque", type: "text" },
      { name: "annee", label: "Année", type: "number" },
      { name: "kilometrage", label: "Kilométrage (km)", type: "number" },
      { name: "carburant", label: "Carburant", type: "select", options: ["Essence", "Diesel", "Électrique", "Hybride", "Non applicable"] },
    ],
  },
  {
    id: "electronique",
    label: "Électronique & Informatique",
    icon: "electronique",
    color: { bg: "#EDE9FB", fg: "#6B4FC7" },
    subcategories: ["Smartphones", "Tablettes", "Ordinateurs portables", "Ordinateurs de bureau", "Écrans", "Imprimantes", "Télévisions", "Appareils photo", "Caméras", "Consoles", "Accessoires informatiques", "Disques durs / stockage", "Routeurs / équipements réseau", "Accessoires téléphones"],
    fields: [
      sousCategorieField(["Smartphones", "Tablettes", "Ordinateurs portables", "Ordinateurs de bureau", "Écrans", "Imprimantes", "Télévisions", "Appareils photo", "Caméras", "Consoles", "Accessoires informatiques", "Disques durs / stockage", "Routeurs / équipements réseau", "Accessoires téléphones"]),
      { name: "marque", label: "Marque", type: "text" },
      { name: "modele", label: "Modèle", type: "text" },
      { name: "garantie", label: "Sous garantie", type: "boolean" },
    ],
  },
  {
    id: "maison",
    label: "Maison & Ameublement",
    icon: "maison",
    color: { bg: "#E1F8EC", fg: "#2F8F5B" },
    subcategories: ["Canapés", "Fauteuils", "Tables", "Chaises", "Lits", "Matelas", "Armoires", "Commodes", "Bibliothèques", "Meubles TV", "Meubles de cuisine", "Meubles de salle de bain", "Bureaux", "Étagères", "Meubles de rangement", "Luminaires", "Lampes", "Rideaux", "Tapis", "Décoration", "Miroirs", "Vaisselle", "Ustensiles de cuisine", "Articles ménagers", "Électroménager", "Réfrigérateurs", "Congélateurs", "Cuisinières", "Machines à laver", "Ventilateurs", "Climatiseurs", "Matériel de bricolage"],
    fields: [
      sousCategorieField(["Canapés", "Fauteuils", "Tables", "Chaises", "Lits", "Matelas", "Armoires", "Commodes", "Bibliothèques", "Meubles TV", "Meubles de cuisine", "Meubles de salle de bain", "Bureaux", "Étagères", "Meubles de rangement", "Luminaires", "Lampes", "Rideaux", "Tapis", "Décoration", "Miroirs", "Vaisselle", "Ustensiles de cuisine", "Articles ménagers", "Électroménager", "Réfrigérateurs", "Congélateurs", "Cuisinières", "Machines à laver", "Ventilateurs", "Climatiseurs", "Matériel de bricolage"]),
      { name: "matiere", label: "Matière", type: "text" },
      { name: "dimensions", label: "Dimensions", type: "text" },
    ],
  },
  {
    id: "mode",
    label: "Mode & Habillement",
    icon: "mode",
    color: { bg: "#FCE4EE", fg: "#C23E7D" },
    subcategories: ["Vêtements homme", "Vêtements femme", "Vêtements enfant", "Vêtements bébé", "Chaussures", "Sacs", "Accessoires", "Tissus", "Boubous", "Tenues traditionnelles", "Vêtements professionnels"],
    fields: [
      sousCategorieField(["Vêtements homme", "Vêtements femme", "Vêtements enfant", "Vêtements bébé", "Chaussures", "Sacs", "Accessoires", "Tissus", "Boubous", "Tenues traditionnelles", "Vêtements professionnels"]),
      { name: "taille", label: "Taille", type: "text" },
      { name: "marque", label: "Marque", type: "text" },
    ],
  },
  {
    id: "enfants",
    label: "Enfants & Famille",
    icon: "enfants",
    color: { bg: "#FFF3D6", fg: "#C9901A" },
    subcategories: ["Poussettes", "Lits bébé", "Jouets", "Jeux éducatifs", "Livres enfants", "Articles de puériculture", "Mobilier enfant", "Fournitures scolaires"],
    fields: [
      sousCategorieField(["Poussettes", "Lits bébé", "Jouets", "Jeux éducatifs", "Livres enfants", "Articles de puériculture", "Mobilier enfant", "Fournitures scolaires"]),
      { name: "ageRecommande", label: "Âge recommandé", type: "text" },
    ],
  },
  {
    id: "livres",
    label: "Livres & Éducation",
    icon: "livres",
    color: { bg: "#DFF6F5", fg: "#1D8A82" },
    subcategories: ["Livres", "Livres scolaires", "Manuels", "Livres universitaires", "Dictionnaires", "Fournitures scolaires", "Matériel pédagogique", "Cours particuliers", "Tutorat", "Formations"],
    fields: [
      sousCategorieField(["Livres", "Livres scolaires", "Manuels", "Livres universitaires", "Dictionnaires", "Fournitures scolaires", "Matériel pédagogique", "Cours particuliers", "Tutorat", "Formations"]),
      { name: "niveau", label: "Niveau / Classe concernée", type: "text" },
    ],
  },
  {
    id: "emploi",
    label: "Emploi & Services professionnels",
    icon: "emploi",
    color: { bg: "#E7ECF7", fg: "#35507D" },
    subcategories: ["Emploi", "Freelance", "Informatique", "Développement web/mobile", "Design", "Architecture", "Ingénierie", "Data / IA", "Comptabilité", "Traduction", "Marketing", "Communication", "Formation", "Conseil"],
    fields: [
      sousCategorieField(["Emploi", "Freelance", "Informatique", "Développement web/mobile", "Design", "Architecture", "Ingénierie", "Data / IA", "Comptabilité", "Traduction", "Marketing", "Communication", "Formation", "Conseil"]),
      { name: "typeContrat", label: "Type", type: "select", options: ["CDI", "CDD", "Temps partiel", "Freelance / Mission", "Service ponctuel"] },
    ],
  },
  {
    id: "services",
    label: "Services à la personne",
    icon: "services",
    color: { bg: "#FBE4DE", fg: "#C0472B" },
    subcategories: ["Plomberie", "Électricité", "Menuiserie", "Maçonnerie", "Peinture", "Soudure", "Climatisation", "Réparation", "Nettoyage", "Jardinage", "Déménagement", "Couture", "Coiffure", "Réparation téléphone", "Réparation informatique", "Maintenance"],
    fields: [
      sousCategorieField(["Plomberie", "Électricité", "Menuiserie", "Maçonnerie", "Peinture", "Soudure", "Climatisation", "Réparation", "Nettoyage", "Jardinage", "Déménagement", "Couture", "Coiffure", "Réparation téléphone", "Réparation informatique", "Maintenance"]),
    ],
  },
  {
    id: "agriculture",
    label: "Agriculture & Élevage",
    icon: "agriculture",
    color: { bg: "#F0F5D9", fg: "#6B7F1E" },
    // Volontairement sans les récoltes/produits comestibles (céréales, fruits,
    // légumes...) : c'est de la nourriture, hors périmètre de la plateforme.
    subcategories: ["Matériel agricole", "Tracteurs", "Motopompes", "Machines agricoles", "Outils", "Semences", "Plants", "Bovins", "Ovins", "Caprins", "Volaille", "Poissons", "Matériel d'élevage"],
    fields: [
      sousCategorieField(["Matériel agricole", "Tracteurs", "Motopompes", "Machines agricoles", "Outils", "Semences", "Plants", "Bovins", "Ovins", "Caprins", "Volaille", "Poissons", "Matériel d'élevage"]),
    ],
  },
  {
    id: "commerce",
    label: "Commerce & Professionnel",
    icon: "commerce",
    color: { bg: "#E9EDF2", fg: "#526075" },
    subcategories: ["Matériel de magasin", "Matériel de bureau", "Machines professionnelles", "Machines industrielles", "Stocks / déstockage", "Fournitures professionnelles", "Emballages", "Matériel de restauration", "Matériel événementiel", "Équipements de chantier"],
    fields: [
      sousCategorieField(["Matériel de magasin", "Matériel de bureau", "Machines professionnelles", "Machines industrielles", "Stocks / déstockage", "Fournitures professionnelles", "Emballages", "Matériel de restauration", "Matériel événementiel", "Équipements de chantier"]),
    ],
  },
  {
    id: "islamique",
    label: "Produits islamiques",
    icon: "islamique",
    color: { bg: "#DFF4EC", fg: "#1F7A5C" },
    subcategories: ["Corans", "Livres islamiques", "Tapis de prière", "Hijabs", "Abayas", "Vêtements islamiques", "Chapelets", "Articles pour mosquées", "Accessoires religieux"],
    fields: [
      sousCategorieField(["Corans", "Livres islamiques", "Tapis de prière", "Hijabs", "Abayas", "Vêtements islamiques", "Chapelets", "Articles pour mosquées", "Accessoires religieux"]),
    ],
  },
  {
    id: "sport",
    label: "Sport & Loisirs",
    icon: "sport",
    color: { bg: "#DFF2FA", fg: "#1E7FB0" },
    subcategories: ["Vélos", "Matériel de fitness", "Équipements sportifs", "Football", "Basketball", "Camping", "Randonnée", "Pêche", "Jeux de société", "Matériel de loisirs"],
    fields: [
      sousCategorieField(["Vélos", "Matériel de fitness", "Équipements sportifs", "Football", "Basketball", "Camping", "Randonnée", "Pêche", "Jeux de société", "Matériel de loisirs"]),
    ],
  },
  {
    id: "artisanat",
    label: "Art & Artisanat",
    icon: "artisanat",
    color: { bg: "#F5E7D9", fg: "#9C5A2E" },
    subcategories: ["Poterie", "Vannerie", "Peinture", "Décoration", "Bijoux", "Produits artisanaux ivoiriens", "Objets traditionnels", "Matériel artistique"],
    fields: [
      sousCategorieField(["Poterie", "Vannerie", "Peinture", "Décoration", "Bijoux", "Produits artisanaux ivoiriens", "Objets traditionnels", "Matériel artistique"]),
    ],
  },
  {
    id: "beaute",
    label: "Beauté & Bien-être",
    icon: "beaute",
    color: { bg: "#FCE7F0", fg: "#C24F87" },
    subcategories: ["Cosmétiques", "Soins de la peau", "Parfums (non alcoolisés)", "Appareils de soin", "Accessoires beauté"],
    fields: [
      sousCategorieField(["Cosmétiques", "Soins de la peau", "Parfums (non alcoolisés)", "Appareils de soin", "Accessoires beauté"]),
      { name: "marque", label: "Marque", type: "text" },
    ],
  },
  {
    id: "divers",
    label: "Autres",
    icon: "divers",
    color: { bg: "#EFEFEF", fg: "#6B6B6B" },
    subcategories: ["Collections", "Antiquités", "Objets d'occasion", "Cadeaux", "Articles de voyage", "Articles de bureau", "Objets divers"],
    fields: [
      sousCategorieField(["Collections", "Antiquités", "Objets d'occasion", "Cadeaux", "Articles de voyage", "Articles de bureau", "Objets divers"]),
    ],
  },
];

export function getCategory(id) {
  return CATEGORIES.find((c) => c.id === id);
}
