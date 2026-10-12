// Typen und Konstanten ohne Serverzugriff – auch in Client-Komponenten importierbar.
export const MEDIA_SETTINGS_KEY = "media_settings";

export type MediaSettings = {
  minScreenshots: number;
  maxScreenshots: number;
  allowedTypes: string[];
  maxFileSizeMb: number;
  imageQuality: number;
};

export const DEFAULT_MEDIA_SETTINGS: MediaSettings = {
  minScreenshots: 0,
  maxScreenshots: 100,
  allowedTypes: ["image/jpeg", "image/png", "image/webp"],
  maxFileSizeMb: 5,
  imageQuality: 0.85,
};

