/*
 * Design-Tokens als Hex-Werte für Stellen, die keine CSS-Variablen lesen können:
 * E-Mail-HTML, Diagramme, Canvas/Audio-Player, <input type="color">, Manifest.
 * Werte müssen mit src/styles/tokens.css übereinstimmen (npm run check:tokens prüft das).
 */
export const colors = {
  bgBase: "#121212",
  bgRaised: "#181818",
  bgElevated: "#1e1e1e",
  bgHover: "#26262b",
  bgFooter: "#0f0f11",
  bgSidebar: "#151517",

  line: "#2a2a2f",
  lineControl: "#6b6975",

  ink: "#f2f1f5",
  inkMuted: "#a3a1ab",
  inkFaint: "#8a8894",

  violet: "#7c4dff",
  violetHover: "#6f3ff5",
  violetBright: "#b69cff",
  onViolet: "#ffffff",

  success: "#3dd68c",
  warning: "#ffb547",
  danger: "#ff6b7a",

  gameGta: "#1d4d3a",
  gameFivem: "#6b3413",
  gameMinecraft: "#3d5a1e",
  gameEts2: "#1e3a5f",
  gameLs25: "#6b5412",

  qrBackground: "#ffffff",
} as const;

export type ColorToken = keyof typeof colors;

/** Hex-Farbe mit Deckkraft (0–1) als rgba()-String. */
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
