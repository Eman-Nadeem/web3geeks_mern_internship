/**
 * Curated high-contrast, accessible color palette for real-time collaborator
 * presence indicators and live cursor carets.
 */
export const COLLABORATOR_PALETTE = [
  "#2563EB", // Blue
  "#7C3AED", // Violet
  "#DB2777", // Pink
  "#EA580C", // Orange
  "#059669", // Emerald
  "#0891B2", // Cyan
  "#D97706", // Amber
  "#4F46E5", // Indigo
  "#DC2626", // Red
  "#0D9488", // Teal
  "#9333EA", // Purple
  "#16A34A", // Green
] as const;

/**
 * Deterministically assigns a stable color to a user ID.
 * This guarantees consistent visual identity across multiple tabs, reconnects,
 * and peer client views without mid-session color drift.
 */
export function getUserColor(userId: string): string {
  if (!userId) return COLLABORATOR_PALETTE[0];

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }

  const index = Math.abs(hash) % COLLABORATOR_PALETTE.length;
  return COLLABORATOR_PALETTE[index];
}
