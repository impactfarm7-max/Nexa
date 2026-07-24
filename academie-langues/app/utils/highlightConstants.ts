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

export function themeMapByKey(
  themes: Array<{ color_key: string; hex_color: string; label: string }>
) {
  return Object.fromEntries(themes.map((t) => [t.color_key, t]));
}
