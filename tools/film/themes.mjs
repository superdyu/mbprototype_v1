// Read the APP's four palettes out of css/variables.css.
//
// The films are rendered per theme, so each one has to be painted in that
// theme's own tokens. Retyping the hex values here would let the film and the
// app drift apart silently — the film would still render, just in last month's
// colours. So we parse the stylesheet the app actually ships.
//
// Two things make this more than a regex:
//   · tokens reference each other (`--screen: var(--cream)`), so var() chains
//     have to be resolved, and
//   · a theme scope OVERRIDES :root rather than replacing it, so each palette is
//     :root with that scope layered on top.

import fs from "node:fs";

/** Every `--token: value;` inside one CSS block. */
function declarations(body) {
  const out = {};
  for (const [, k, v] of body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    out[k] = v.trim();
  }
  return out;
}

/**
 * `:root` blocks and `.theme-*` blocks, in file order.
 *
 * The `(?![^{]*\[)` guard skips `:root[data-theme=...]` style scopes — this
 * stylesheet only uses plain `:root` and class scopes today, but a bare :root
 * match would happily swallow an attribute-scoped one and silently mix palettes.
 */
function scopes(css) {
  const found = [];
  const re = /(^:root(?![^{]*\[)|^\.theme-[a-z-]+)\s*\{(.*?)^\}/gms;
  for (const m of css.matchAll(re)) {
    found.push({ selector: m[1].trim(), vars: declarations(m[2]) });
  }
  return found;
}

/** Follow `var(--a)` chains to a literal. Depth-capped so a cycle cannot hang. */
function resolve(value, table, depth = 0) {
  if (depth > 12) return value;
  const m = /^var\(\s*(--[a-z0-9-]+)\s*(?:,\s*([^)]+))?\)$/i.exec(String(value).trim());
  if (!m) return value;
  const next = table[m[1]];
  if (next == null) return (m[2] || value).trim();
  return resolve(next, table, depth + 1);
}

// Theme id → the selector that carries it. Natural Light is the default and
// lives on bare `:root`, which is why it has no class of its own (see
// js/theme.js: THEME_DEFAULT = "naturalLight").
const THEME_SELECTOR = {
  naturalLight: null,                  // :root only
  naturalDark:  ".theme-natural-dark",
  light:        ".theme-light",
  dark:         ".theme-dark"
};

export const THEME_IDS = Object.keys(THEME_SELECTOR);

/**
 * One theme's resolved palette: every token the film template can ask for,
 * flattened to literal values.
 */
export function palette(cssPath, themeId) {
  if (!(themeId in THEME_SELECTOR)) {
    throw new Error(`unknown theme "${themeId}" — expected one of ${THEME_IDS.join(", ")}`);
  }
  const css = fs.readFileSync(cssPath, "utf8");
  const blocks = scopes(css);

  // :root first (all of them — the file splits its defaults across several),
  // then the theme's own block on top.
  const table = {};
  for (const b of blocks) {
    if (b.selector === ":root") Object.assign(table, b.vars);
  }
  const sel = THEME_SELECTOR[themeId];
  if (sel) {
    const hit = blocks.find(b => b.selector === sel);
    if (!hit) throw new Error(`variables.css has no "${sel}" block — theme map is stale`);
    Object.assign(table, hit.vars);
  }

  const flat = {};
  for (const k of Object.keys(table)) flat[k] = resolve(table[k], table);

  const need = ["--accent", "--card", "--text", "--muted", "--line", "--cream"];
  const missing = need.filter(k => !flat[k]);
  if (missing.length) throw new Error(`${themeId}: variables.css is missing ${missing.join(", ")}`);

  return {
    id:       themeId,
    accent:   flat["--accent"],
    accentSoft: flat["--accent-soft"] || flat["--card"],
    ground:   flat["--cream"],          // the screen behind the film
    card:     flat["--card"],
    text:     flat["--text"],
    muted:    flat["--muted"],
    line:     flat["--line"],
    onAccent: flat["--on-accent"] || flat["--cream"],
    isDark:   themeId === "dark" || themeId === "naturalDark"
  };
}
