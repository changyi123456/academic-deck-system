import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { loadDeck } from "../src/lib/load.js";
import { launchChromium, waitForDeck } from "../src/lib/browser.js";
import { outputDir, resolveDeckDir } from "../src/lib/paths.js";
import { startStaticServer } from "../src/lib/server.js";

interface OverflowFinding { theme: string; slide: string; element: string; overflow: { left: number; top: number; right: number; bottom: number } }

async function contactSheet(files: string[], outPath: string, labels: string[]): Promise<void> {
  const thumbW = 400;
  const thumbH = 225;
  const labelH = 32;
  const columns = 4;
  const rows = Math.ceil(files.length / columns);
  const composites: sharp.OverlayOptions[] = [];
  for (const [index, file] of files.entries()) {
    const x = (index % columns) * thumbW;
    const y = Math.floor(index / columns) * (thumbH + labelH);
    const image = await sharp(file).resize(thumbW, thumbH).png().toBuffer();
    const label = Buffer.from(`<svg width="${thumbW}" height="${labelH}"><rect width="100%" height="100%" fill="#101512"/><text x="12" y="22" font-family="sans-serif" font-size="16" fill="#f2ede2">${labels[index] ?? ""}</text></svg>`);
    composites.push({ input: image, left: x, top: y }, { input: label, left: x, top: y + thumbH });
  }
  await sharp({ create: { width: columns * thumbW, height: Math.max(1, rows) * (thumbH + labelH), channels: 4, background: "#101512" } }).composite(composites).png().toFile(outPath);
}

const deckDir = resolveDeckDir(process.argv[2]);
const deck = await loadDeck(deckDir);
const distDir = outputDir(deck.deck.id);
const qaDir = path.join(distDir, "qa");
await fs.mkdir(qaDir, { recursive: true });
const server = await startStaticServer(distDir);
const browser = await launchChromium();
const overflow: OverflowFinding[] = [];

try {
  for (const theme of ["board-dark", "bright-minimal"]) {
    const themeDir = path.join(qaDir, theme);
    await fs.rm(themeDir, { recursive: true, force: true });
    await fs.mkdir(themeDir, { recursive: true });
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
    await page.goto(`${server.url}/index.html?theme=${theme}`, { waitUntil: "networkidle" });
    await waitForDeck(page);
    await page.evaluate(() => (window as unknown as { Reveal: { configure: (options: Record<string, unknown>) => void } }).Reveal.configure({ transition: "none", backgroundTransition: "none" }));
    await page.addStyleTag({ content: ".reveal .controls,.reveal .progress{display:none!important}.reveal .slides section.deck-slide:not(.present){display:none!important}" });
    const files: string[] = [];
    const labels: string[] = [];
    for (const [index, slide] of deck.slides.entries()) {
      await page.evaluate((slideIndex) => (window as unknown as { Reveal: { slide: (index: number) => void } }).Reveal.slide(slideIndex), index);
      await page.waitForTimeout(20);
      const file = path.join(themeDir, `${String(index + 1).padStart(2, "0")}-${slide.id}.png`);
      await page.screenshot({ path: file });
      files.push(file);
      labels.push(`${String(index + 1).padStart(2, "0")} · ${slide.id} · ${slide.type}`);
      const slideOverflow = await page.evaluate(() => {
        const slide = document.querySelector("section.present .slide-content") as HTMLElement | null;
        if (!slide) return [];
        const bounds = slide.getBoundingClientRect();
        return Array.from(slide.querySelectorAll<HTMLElement>("h1,h2,h3,p,li,table,figure,img,.panel,.cer-block,.theme-row,.framework-node,.equation-wrap,.equation-display,.variable-list,.variable-row,.quote-wrap,.quote-text,.design-row"))
          .filter((element) => {
            const style = getComputedStyle(element);
            return style.display !== "none" && style.visibility !== "hidden";
          })
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              element: `${element.tagName.toLowerCase()}.${Array.from(element.classList).join(".")}`,
              overflow: {
                left: Math.max(0, bounds.left - rect.left),
                top: Math.max(0, bounds.top - rect.top),
                right: Math.max(0, rect.right - bounds.right, element.scrollWidth - element.clientWidth - 12),
                bottom: Math.max(0, rect.bottom - bounds.bottom, element.scrollHeight - element.clientHeight - 12),
              },
            };
          }).filter((item) => Object.values(item.overflow).some((value) => value > 2));
      });
      overflow.push(...slideOverflow.map((item) => ({ theme, slide: slide.id, ...item })));
    }
    await contactSheet(files, path.join(qaDir, `contact-sheet-${theme}.png`), labels);
    await page.close();
  }
  await fs.writeFile(path.join(qaDir, "qa-report.json"), JSON.stringify({ generated_at: new Date().toISOString(), overflow }, null, 2));
  console.log(`✓ ${qaDir} (${overflow.length} overflow finding(s))`);
  if (overflow.length) process.exitCode = 2;
} finally {
  await browser.close();
  await server.close();
}
