import fs from "node:fs/promises";
import path from "node:path";
import type { ThemeTokens, TokenFile } from "../src/types.js";
import { loadTokens } from "../src/lib/load.js";
import { repoRoot } from "../src/lib/paths.js";

function camelToKebab(value: string): string {
  return value.replaceAll("_", "-").replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

function mergeTheme(tokens: TokenFile, name: string): ThemeTokens {
  const current = tokens.themes[name];
  if (!current) throw new Error(`未知 theme：${name}`);
  if (!current.extends) return current;
  const base = mergeTheme(tokens, current.extends);
  return {
    ...base,
    ...current,
    surface: { ...base.surface, ...current.surface },
    text: { ...base.text, ...current.text },
    accent: { ...base.accent, ...current.accent },
    border: { ...base.border, ...current.border },
    status: { ...base.status, ...current.status },
    data: { ...base.data, ...current.data },
    texture: { ...base.texture, ...current.texture },
  };
}

function variableBlock(selector: string, values: Record<string, string | number>): string {
  const rows = Object.entries(values).map(([key, value]) => `  --${camelToKebab(key)}: ${value};`);
  return `${selector} {\n${rows.join("\n")}\n}`;
}

function themeVariables(theme: ThemeTokens): Record<string, string | number> {
  const result: Record<string, string | number> = {};
  for (const [group, values] of Object.entries(theme)) {
    if (group === "extends") continue;
    if (group === "data") {
      const data = theme.data;
      data.series.forEach((color, index) => (result[`data-${index + 1}`] = color));
      result["chart-axis"] = data.axis;
      result["chart-grid"] = data.grid;
      continue;
    }
    if (group === "texture") {
      result["texture-grid"] = theme.texture.grid_paper;
      result["texture-chalk-noise-opacity"] = theme.texture.chalk_noise_opacity;
      continue;
    }
    if (typeof values === "object") {
      for (const [key, value] of Object.entries(values)) {
        if (typeof value === "string" || typeof value === "number") result[`${group}-${key}`] = value;
      }
    }
  }
  return result;
}

async function main(): Promise<void> {
  const tokens = await loadTokens();
  const root: Record<string, string | number> = {
    "canvas-w": tokens.canvas.logical_width,
    "canvas-h": tokens.canvas.logical_height,
    "font-display": tokens.type.family.display ?? "serif",
    "font-body": tokens.type.family.body ?? "sans-serif",
    "font-mono": tokens.type.family.mono ?? "monospace",
  };
  for (const [key, value] of Object.entries(tokens.type.scale)) root[`fs-${key}`] = `${value}px`;
  for (const [key, value] of Object.entries(tokens.type.line_height)) root[`lh-${key}`] = value;
  for (const [key, value] of Object.entries(tokens.space)) root[`space-${key}`] = `${value}px`;
  for (const [key, value] of Object.entries(tokens.stroke)) root[`stroke-${key}`] = `${value}px`;
  for (const [key, value] of Object.entries(tokens.radius)) root[`radius-${key}`] = `${value}px`;

  const sections = [
    "/* AUTO-GENERATED from theme/tokens.json. Run npm run build:tokens; do not edit. */",
    variableBlock(":root", root),
  ];
  for (const name of Object.keys(tokens.themes)) {
    sections.push(variableBlock(`[data-theme=\"${name}\"]`, themeVariables(mergeTheme(tokens, name))));
  }
  const output = `${sections.join("\n\n")}\n`;
  await fs.writeFile(path.join(repoRoot, "theme", "tokens.css"), output);
  console.log(`✓ theme/tokens.css (${Object.keys(tokens.themes).length} themes)`);
}

await main();
