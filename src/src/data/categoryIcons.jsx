import {
  Car, Smartphone, Sofa, Shirt, Baby, BookOpen, Briefcase, Wrench,
  Sprout, Store, Moon, Dumbbell, Palette, Sparkles, Package,
} from "lucide-react";
import { getCategory } from "./categories";

export const CATEGORY_ICONS = {
  vehicules: Car,
  electronique: Smartphone,
  maison: Sofa,
  mode: Shirt,
  enfants: Baby,
  livres: BookOpen,
  emploi: Briefcase,
  services: Wrench,
  agriculture: Sprout,
  commerce: Store,
  islamique: Moon,
  sport: Dumbbell,
  artisanat: Palette,
  beaute: Sparkles,
  divers: Package,
};

// Icône simple (couleur unique héritée du texte parent — utilisé dans la nav,
// le footer, les listes compactes).
export function CategoryIcon({ id, className }) {
  const Icon = CATEGORY_ICONS[id] || Package;
  return <Icon className={className} strokeWidth={1.75} />;
}

// Icône dans son pastel de catégorie (fond + couleur dédiés) — utilisé sur la
// page d'accueil, façon "vignette catégorie" d'un site de petites annonces.
export function CategoryBadge({ id, size = 56, iconSize = 24 }) {
  const Icon = CATEGORY_ICONS[id] || Package;
  const color = getCategory(id)?.color || { bg: "#EFEFEF", fg: "#6B6B6B" };
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0"
      style={{ width: size, height: size, backgroundColor: color.bg }}
    >
      <Icon style={{ width: iconSize, height: iconSize, color: color.fg }} strokeWidth={1.75} />
    </div>
  );
}
