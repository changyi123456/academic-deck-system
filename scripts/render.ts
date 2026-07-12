import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import { loadDeck, loadReferences } from "../src/lib/load.js";
import { outputDir, repoRoot, resolveDeckDir } from "../src/lib/paths.js";
import { renderDeckHtml } from "../src/render/html.js";
import { bundleRuntime } from "../src/render/bundle.js";

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: repoRoot, stdio: "inherit" });
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)));
  });
}

const deckDir = resolveDeckDir(process.argv[2]);
const deck = await loadDeck(deckDir);
const references = await loadReferences(deckDir, deck.deck.bibliography);
await run(process.execPath, [pathToTsx(), "scripts/validate.ts", deckDir]);
await run(process.execPath, [pathToTsx(), "scripts/build-tokens.ts"]);
const distDir = outputDir(deck.deck.id);
await fs.rm(distDir, { recursive: true, force: true });
await fs.mkdir(distDir, { recursive: true });
await bundleRuntime(deckDir, distDir);
await fs.writeFile(`${distDir}/index.html`, renderDeckHtml(deck, references));
console.log(`✓ ${distDir}/index.html (${deck.slides.length} slides)`);

function pathToTsx(): string {
  return new URL("../node_modules/tsx/dist/cli.mjs", import.meta.url).pathname;
}
