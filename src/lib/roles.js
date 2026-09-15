// "admin" (créé par le superadmin) n'a accès QU'à la validation/refus des
// demandes d'abonnement et de boost — rien d'autre : ni utilisateurs, ni
// annonces, ni statistiques, ni gestion des rôles.
// "superadmin" a les pleins pouvoirs sur tout le panneau d'administration.
export const ROLE_LEVEL = { user: 0, admin: 1, superadmin: 2 };

export function roleLevel(role) {
  return ROLE_LEVEL[role] ?? 0;
}

export function isAtLeastAdmin(role) {
  return roleLevel(role) >= ROLE_LEVEL.admin;
}

export function isSuperadmin(role) {
  return role === "superadmin";
}

// Seul le superadmin peut attribuer des rôles à d'autres comptes.
export function assignableRoles(actingRole) {
  if (isSuperadmin(actingRole)) return ["user", "admin", "superadmin"];
  return [];
}
