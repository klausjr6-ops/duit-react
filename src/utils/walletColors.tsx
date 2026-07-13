/**
 * Wallet color system using inline styles (Tailwind dynamic classes don't work).
 * The `color` field in Wallet stores a key like "emerald", "blue", etc.
 */

export const WALLET_COLORS = [
  { key: "emerald", label: "Emerald", hex: "#10b981" },
  { key: "blue",    label: "Biru",    hex: "#3b82f6" },
  { key: "amber",   label: "Amber",   hex: "#f59e0b" },
  { key: "rose",    label: "Rose",    hex: "#f43f5e" },
  { key: "violet",  label: "Violet",  hex: "#8b5cf6" },
  { key: "teal",    label: "Teal",    hex: "#14b8a6" },
  { key: "cyan",    label: "Cyan",    hex: "#06b6d4" },
  { key: "orange",  label: "Oranye",  hex: "#f97316" },
] as const;

export type WalletColorKey = (typeof WALLET_COLORS)[number]["key"];

/** Resolve any stored color value to a valid key. */
export function resolveColorKey(raw: string): WalletColorKey {
  if (WALLET_COLORS.some((c) => c.key === raw)) return raw as WalletColorKey;
  return "emerald";
}

/** Get hex color for a wallet color key. */
export function getWalletHex(colorKey: string): string {
  const found = WALLET_COLORS.find((c) => c.key === resolveColorKey(colorKey));
  return found ? found.hex : "#10b981";
}

/** Inline styles for wallet card (used in KeuanganView). */
export function walletCardStyle(colorKey: string, isDark: boolean): React.CSSProperties {
  const hex = getWalletHex(colorKey);
  return {
    background: isDark
      ? `linear-gradient(135deg, ${hex}18, ${hex}0a)`
      : `linear-gradient(135deg, ${hex}14, ${hex}08)`,
    borderColor: `${hex}4D`,
    borderWidth: 1,
    borderStyle: "solid",
  };
}

/** Inline styles for wallet card hover border (applied via onMouseEnter/Leave). */
export function walletCardHoverBorder(colorKey: string): React.CSSProperties {
  const hex = getWalletHex(colorKey);
  return { borderColor: `${hex}99` };
}
