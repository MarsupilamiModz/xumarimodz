// Reine Daten ohne Server-Abhängigkeiten, damit Client-Komponenten (Header, Footer) sie importieren können.

export type HeaderMenuItem = {
  id: string;
  label: string;
  href: string;
  hidden: boolean;
  order: number;
};

export type HeaderSettings = {
  menuItems: HeaderMenuItem[];
  backgroundColor: string;
  transparent: boolean;
  blur: boolean;
  sticky: boolean;
  height: number;
  mobileMenuExpanded: boolean;
};

export type FooterLink = {
  id: string;
  label: string;
  href: string;
  order: number;
};

export type FooterSection = {
  id: string;
  title: string;
  order: number;
  links: FooterLink[];
};

export type FooterSettings = {
  sections: FooterSection[];
  copyright: string;
  tagline: string;
  socialLinks: { discord?: string; twitter?: string; youtube?: string; tiktok?: string };
};

// Reihenfolge laut Design: Mods · Spiele · Sammlungen · Bestenliste · Premium · Shop · Partner · Creator.
// Tutorials und Aufträge bleiben ausgeblendet und lassen sich im ACP (Branding → Header) einschalten.
// Hinweis: Ist im ACP bereits ein eigenes Menü gespeichert, gilt dieses statt der Standardwerte.
export const DEFAULT_HEADER_MENU: HeaderMenuItem[] = [
  { id: "mods", label: "Mods", href: "/mods", hidden: false, order: 0 },
  { id: "games", label: "Games", href: "/games", hidden: false, order: 1 },
  { id: "collections", label: "Collections", href: "/collections", hidden: false, order: 2 },
  { id: "leaderboards", label: "Leaderboards", href: "/leaderboards", hidden: false, order: 3 },
  { id: "premium", label: "Premium", href: "/premium", hidden: false, order: 4 },
  { id: "shop", label: "Shop", href: "/shop", hidden: false, order: 5 },
  { id: "partners", label: "Partners", href: "/partners", hidden: false, order: 6 },
  { id: "creators", label: "Creators", href: "/creators", hidden: false, order: 7 },
  { id: "tutorials", label: "Tutorials", href: "/tutorials", hidden: true, order: 8 },
  { id: "custom-orders", label: "Custom Orders", href: "/custom-orders", hidden: true, order: 9 },
];

export const DEFAULT_HEADER: HeaderSettings = {
  menuItems: DEFAULT_HEADER_MENU,
  backgroundColor: "",
  transparent: false,
  blur: false,
  sticky: true,
  height: 68,
  mobileMenuExpanded: false,
};

// Spalten laut Design. Bekannte IDs werden im Footer übersetzt (siehe components/layout/footer.tsx).
export const DEFAULT_FOOTER: FooterSettings = {
  sections: [
    {
      id: "product",
      title: "Product",
      order: 0,
      links: [
        { id: "mods", label: "Browse Mods", href: "/mods", order: 0 },
        { id: "games", label: "Games", href: "/games", order: 1 },
        { id: "collections", label: "Collections", href: "/collections", order: 2 },
        { id: "premium", label: "Premium", href: "/premium", order: 3 },
        { id: "shop", label: "Shop", href: "/shop", order: 4 },
      ],
    },
    {
      id: "community",
      title: "Community",
      order: 1,
      links: [
        { id: "creators", label: "Creators", href: "/creators", order: 0 },
        { id: "become-creator", label: "Become a creator", href: "/become-creator", order: 1 },
        { id: "partners", label: "Partners", href: "/partners", order: 2 },
        { id: "leaderboards", label: "Leaderboards", href: "/leaderboards", order: 3 },
        { id: "tutorials", label: "Tutorials", href: "/tutorials", order: 4 },
        { id: "news", label: "News", href: "/blog", order: 5 },
        { id: "team", label: "Team", href: "/team", order: 6 },
      ],
    },
    {
      id: "help",
      title: "Help",
      order: 2,
      links: [
        { id: "faq", label: "FAQ", href: "/faq", order: 0 },
        { id: "support", label: "Support", href: "/dashboard/support", order: 1 },
        { id: "contact", label: "Contact", href: "/contact", order: 2 },
        { id: "custom-orders", label: "Custom Orders", href: "/custom-orders", order: 3 },
        { id: "developers", label: "Developers", href: "/developers", order: 4 },
      ],
    },
    {
      id: "legal",
      title: "Legal",
      order: 3,
      links: [
        { id: "imprint", label: "Legal notice", href: "/legal/imprint", order: 0 },
        { id: "privacy", label: "Privacy", href: "/legal/privacy", order: 1 },
        { id: "terms", label: "Terms", href: "/legal/terms", order: 2 },
        { id: "withdrawal", label: "Right of withdrawal", href: "/legal/withdrawal", order: 3 },
        { id: "dmca", label: "DMCA", href: "/legal/dmca", order: 4 },
      ],
    },
  ],
  copyright: "All rights reserved.",
  tagline: "Premium mods marketplace for serious gamers",
  socialLinks: {
    discord: "https://discord.gg/xumarimodz",
    twitter: "https://twitter.com/xumarimodz",
  },
};
