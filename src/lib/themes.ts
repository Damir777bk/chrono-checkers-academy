export type ThemeId = "classic" | "cyber" | "marble";

export interface Theme {
  id: ThemeId;
  name: string;
  tagline: string;
  premium: boolean;
  /** CSS class applied to a wrapper around the board. */
  className: string;
  /** Swatch colors for the selector. */
  swatch: [string, string];
}

export const THEMES: Theme[] = [
  {
    id: "classic",
    name: "Classic Academy",
    tagline: "Emerald & Cream",
    premium: false,
    className: "",
    swatch: ["oklch(0.95 0.015 85)", "oklch(0.28 0.06 160)"],
  },
  {
    id: "cyber",
    name: "Midnight Cyber",
    tagline: "Dark Slate · Neon Cyan",
    premium: true,
    className: "theme-cyber",
    swatch: ["oklch(0.22 0.02 250)", "oklch(0.55 0.16 210)"],
  },
  {
    id: "marble",
    name: "Royal Marble",
    tagline: "Polished Carrara · Onyx",
    premium: true,
    className: "theme-marble",
    swatch: ["oklch(0.95 0.008 85)", "oklch(0.18 0.012 280)"],
  },
];
