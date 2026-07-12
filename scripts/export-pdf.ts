import fs from "node:fs/promises";
import path from "node:path";
import { loadDeck } from "../src/lib/load.js";
import { launchChromium, waitForDeck } from "../src/lib/browser.js";
import { outputDir, resolveDeckDir } from "../src/lib/paths.js";
import { startStaticServer } from "../src/lib/server.js";

const deckDir = resolveDeckDir(process.argv[2]);
const deck = await loadDeck(deckDir);
const distDir = outputDir(deck.deck.id);
const htmlPath = path.join(distDir, "index.html");
try { await fs.access(htmlPath); } catch { throw new Error(`尚未 render：${htmlPath}`); }

const server = await startStaticServer(distDir);
const browser = await launchChromium();
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  await page.emulateMedia({ media: "print" });
  await page.goto(`${server.url}/index.html?print-pdf&theme=print`, { waitUntil: "networkidle" });
  await waitForDeck(page);
  const pdfPath = path.join(distDir, `${deck.deck.id}.pdf`);
  await page.pdf({
    path: pdfPath,
    width: "13.333333in",
    height: "7.5in",
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });
  console.log(`✓ ${pdfPath}`);
} finally {
  await browser.close();
  await server.close();
}
