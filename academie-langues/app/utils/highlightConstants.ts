export type HighlightColorKey = "yellow" | "green" | "blue" | "pink" | "orange";

export type HighlightSourceType = "nexa_module" | "center_lesson";

export const DEFAULT_HIGHLIGHT_THEMES: Array<{
  color_key: HighlightColorKey;
  hex_color: string;
  label: string;
}> = [
  { color_key: "yellow", hex_color: "#FEF08A", label: "Important" },
  { color_key: "green", hex_color: "#BBF7D0", label: "À retenir" },
  { color_key: "blue", hex_color: "#BFDBFE", label: "Définition" },
  { color_key: "pink", hex_color: "#FBCFE8", label: "Exemple" },
  { color_key: "orange", hex_color: "#FED7AA", label: "Piège" },
];

export const HIGHLIGHT_THEME_I18N_KEYS: Record<HighlightColorKey, string> = {
  yellow: "highlightThemeImportant",
  green: "highlightThemeRemember",
  blue: "highlightThemeDefinition",
  pink: "highlightThemeExample",
  orange: "highlightThemeTrap",
};

export function themeMapByKey(
  themes: Array<{ color_key: string; hex_color: string; label: string }>
) {
  return Object.fromEntries(themes.map((t) => [t.color_key, t]));
}

/** Affiche le label i18n tant que le thème n'a pas été renommé par l'étudiant. */
export function displayHighlightThemeLabel(
  theme: { color_key: string; label: string },
  t: (ns: "dashboard", key: string) => string,
): string {
  const key = theme.color_key as HighlightColorKey;
  const i18nKey = HIGHLIGHT_THEME_I18N_KEYS[key];
  const def = DEFAULT_HIGHLIGHT_THEMES.find((d) => d.color_key === key);
  if (i18nKey && def && (!theme.label.trim() || theme.label === def.label)) {
    return t("dashboard", i18nKey);
  }
  return theme.label || (i18nKey ? t("dashboard", i18nKey) : theme.color_key);
}
