import {
  Award,
  BadgeCheck,
  BarChart3,
  Check,
  Coins,
  Crown,
  Flame,
  Gamepad2,
  Gem,
  Handshake,
  Heart,
  Link2,
  Medal,
  Palette,
  Rocket,
  Shield,
  ShoppingCart,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Symbole für Daten aus der Datenbank (Erfolge, Pläne, Rollen, Creator-Stufen).
 * Gespeicherte Werte sind oft Emojis – sie bleiben in der Datenbank unverändert,
 * werden hier aber als Lucide-Icon dargestellt (Design: keine Emojis).
 */
const ICONS: Record<string, LucideIcon> = {
  // Schlüssel (für neue Einträge im ACP)
  award: Award,
  medal: Medal,
  crown: Crown,
  gem: Gem,
  zap: Zap,
  star: Star,
  sparkles: Sparkles,
  shield: Shield,
  trophy: Trophy,
  flame: Flame,
  rocket: Rocket,
  heart: Heart,
  handshake: Handshake,
  coins: Coins,
  target: Target,
  link: Link2,
  check: Check,
  verified: BadgeCheck,
  chart: BarChart3,
  palette: Palette,
  cart: ShoppingCart,
  trending: TrendingUp,
  gamepad: Gamepad2,
  // Emojis aus bestehenden Daten
  "🏅": Medal,
  "👑": Crown,
  "💎": Gem,
  "⚡": Zap,
  "⭐": Star,
  "🌟": Star,
  "🛡️": Shield,
  "🛡": Shield,
  "🏆": Trophy,
  "🔥": Flame,
  "🚀": Rocket,
  "❤️": Heart,
  "❤": Heart,
  "🤝": Handshake,
  "💰": Coins,
  "🎯": Target,
  "🔗": Link2,
  "✔": Check,
  "✓": Check,
  "✔️": Check,
  "📊": BarChart3,
  "🎨": Palette,
  "🛒": ShoppingCart,
  "📈": TrendingUp,
};

export const ENTITY_ICON_KEYS = Object.keys(ICONS).filter((k) => /^[a-z]+$/.test(k));

export function resolveEntityIcon(value: string | null | undefined, fallback: LucideIcon = Award): LucideIcon {
  const key = (value ?? "").trim();
  if (!key) return fallback;
  return ICONS[key] ?? ICONS[key.toLowerCase()] ?? fallback;
}

export function EntityIcon({
  value,
  fallback,
  className,
}: {
  value: string | null | undefined;
  fallback?: LucideIcon;
  className?: string;
}) {
  const Icon = resolveEntityIcon(value, fallback);
  return <Icon className={cn("h-4 w-4 shrink-0", className)} aria-hidden />;
}
