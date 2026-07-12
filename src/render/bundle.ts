import fs from "node:fs/promises";
import path from "node:path";
import { pathExists } from "../lib/load.js";
import { repoRoot } from "../lib/paths.js";

async function copyFontPackage(packageName: string, destination: string): Promise<void> {
  const source = path.join(repoRoot, "node_modules", "@fontsource", packageName);
  await fs.mkdir(destination, { recursive: true });
  await fs.cp(path.join(source, "files"), path.join(destination, "files"), { recursive: true });
  for (const weight of ["400.css", "500.css", "700.css"]) {
    const sourceCss = path.join(source, weight);
    if (await pathExists(sourceCss)) await fs.copyFile(sourceCss, path.join(destination, weight));
  }
}

export async function bundleRuntime(deckDir: string, distDir: string): Promise<void> {
  const vendorReveal = path.join(distDir, "vendor", "reveal");
  const themeDir = path.join(distDir, "theme");
  await fs.mkdir(vendorReveal, { recursive: true });
  await fs.mkdir(themeDir, { recursive: true });
  await fs.copyFile(path.join(repoRoot, "node_modules", "reveal.js", "dist", "reveal.css"), path.join(vendorReveal, "reveal.css"));
  await fs.copyFile(path.join(repoRoot, "node_modules", "reveal.js", "dist", "reveal.esm.js"), path.join(vendorReveal, "reveal.esm.js"));
  await fs.mkdir(path.join(vendorReveal, "plugin", "notes"), { recursive: true });
  await fs.copyFile(path.join(repoRoot, "node_modules", "reveal.js", "plugin", "notes", "notes.esm.js"), path.join(vendorReveal, "plugin", "notes", "notes.esm.js"));
  await fs.copyFile(path.join(repoRoot, "theme", "tokens.css"), path.join(themeDir, "tokens.css"));
  await fs.copyFile(path.join(repoRoot, "src", "styles", "deck.css"), path.join(themeDir, "deck.css"));
  await fs.cp(path.join(repoRoot, "node_modules", "katex", "dist"), path.join(themeDir, "katex"), { recursive: true });
  await copyFontPackage("noto-serif-tc", path.join(themeDir, "fonts", "noto-serif-tc"));
  await copyFontPackage("noto-sans-tc", path.join(themeDir, "fonts", "noto-sans-tc"));
  await copyFontPackage("jetbrains-mono", path.join(themeDir, "fonts", "jetbrains-mono"));
  for (const item of ["assets", "data"]) {
    const source = path.join(deckDir, item);
    if (await pathExists(source)) await fs.cp(source, path.join(distDir, item), { recursive: true });
  }
}
