import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";
import { fontFamily } from "tailwindcss/defaultTheme";

// Alle Farben kommen aus src/styles/tokens.css.
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    // Nur Token-Farben: die Tailwind-Standardpalette (red-500, white …) ist bewusst nicht verfügbar.
    colors: {
      transparent: "transparent",
      current: "currentColor",
      inherit: "inherit",

      // Design-Tokens
      canvas: token("bg-base"),
      raised: token("bg-raised"),
      elevated: token("bg-elevated"),
      hover: token("bg-hover"),
      "row-hover": token("bg-row-hover"),
      footer: token("bg-footer"),
      sidebar: token("bg-sidebar"),
      line: { DEFAULT: token("line"), control: token("line-control") },
      ink: { DEFAULT: token("ink"), muted: token("ink-muted"), faint: token("ink-faint") },
      violet: {
        DEFAULT: token("violet"),
        hover: token("violet-hover"),
        bright: token("violet-bright"),
        soft: "rgb(var(--violet) / var(--violet-soft-alpha))",
        on: token("on-violet"),
      },
      success: { DEFAULT: token("success"), soft: "rgb(var(--success) / var(--status-bg-alpha))" },
      warning: { DEFAULT: token("warning"), soft: "rgb(var(--warning) / var(--status-bg-alpha))" },
      danger: { DEFAULT: token("danger"), soft: "rgb(var(--danger) / var(--status-bg-alpha))" },
      "qr-background": token("qr-background"),
      game: {
        gta: token("game-gta"),
        fivem: token("game-fivem"),
        minecraft: token("game-minecraft"),
        ets2: token("game-ets2"),
        ls25: token("game-ls25"),
      },

      // shadcn/ui-Namen, auf die Tokens abgebildet
      background: token("bg-base"),
      foreground: token("ink"),
      card: { DEFAULT: token("bg-raised"), foreground: token("ink") },
      popover: { DEFAULT: token("bg-raised"), foreground: token("ink") },
      primary: { DEFAULT: token("violet"), foreground: token("on-violet") },
      secondary: { DEFAULT: token("bg-elevated"), foreground: token("ink") },
      muted: { DEFAULT: token("bg-elevated"), foreground: token("ink-muted") },
      accent: { DEFAULT: token("bg-hover"), foreground: token("ink") },
      destructive: { DEFAULT: token("danger"), foreground: token("bg-base") },
      border: token("line"),
      input: token("line-control"),
      ring: token("violet-bright"),

    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", ...fontFamily.sans],
        mono: ["var(--font-mono)", ...fontFamily.mono],
      },
      borderRadius: {
        sm: "var(--radius-badge)",
        md: "var(--radius-control)",
        lg: "var(--radius-card)",
        xl: "var(--radius-dialog)",
      },
      spacing: {
        header: "var(--header-height)",
        gutter: "var(--page-gutter)",
        "acp-sidebar": "var(--acp-sidebar-width)",
      },
      transitionDuration: {
        DEFAULT: "200ms",
        fast: "var(--duration-fast)",
        base: "var(--duration-base)",
        slow: "var(--duration-slow)",
      },
      letterSpacing: { display: "-0.02em" },
      keyframes: {
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
      },
      animation: { shimmer: "shimmer 2s linear infinite" },
    },
  },
  plugins: [animate],
};

export default config;
