import path from "node:path";
import { createRequire } from "node:module";
import sharp from "sharp";
import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import { AllPackages } from "mathjax-full/js/input/tex/AllPackages.js";
import type { DeckSpec, ReferenceFile, ReferenceItem, SlideSpec, ThemeTokens, TokenFile } from "../types.js";
import { formatFullReference, formatShortReference } from "../lib/text.js";
import { pathExists } from "../lib/load.js";

type Pptx = any;
type PptxSlide = any;

const W = 13.333333;
const H = 7.5;
const SAFE_X = 0.8;
const SAFE_Y = 0.6;
const CONTENT_W = W - SAFE_X * 2;
const DISPLAY_FONT = "Noto Serif CJK TC";
const BODY_FONT = "Noto Sans CJK TC";
const MONO_FONT = "JetBrains Mono";
const mathAdaptor = liteAdaptor();
RegisterHTMLHandler(mathAdaptor);
const mathDocument = mathjax.document("", { InputJax: new TeX({ packages: AllPackages }), OutputJax: new SVG({ fontCache: "none" }) });

interface Palette {
  bg: string;
  panel: string;
  paper: string;
  inset: string;
  text: string;
  secondary: string;
  muted: string;
  accent: string;
  accent2: string;
  border: string;
  data: string[];
}

function hex(value: string): string {
  return value.replace("#", "").slice(0, 6).toUpperCase();
}

function palette(theme: ThemeTokens): Palette {
  return {
    bg: hex(theme.surface.canvas ?? "#ffffff"),
    panel: hex(theme.surface.panel ?? "#ffffff"),
    paper: hex(theme.surface.paper ?? "#f5f5f5"),
    inset: hex(theme.surface.inset ?? "#eeeeee"),
    text: hex(theme.text.primary ?? "#111111"),
    secondary: hex(theme.text.secondary ?? "#444444"),
    muted: hex(theme.text.muted ?? "#777777"),
    accent: hex(theme.accent.primary ?? "#a67c1e"),
    accent2: hex(theme.accent.secondary ?? "#185fa5"),
    border: hex(theme.border.subtle ?? "#d9d3c4"),
    data: theme.data.series.map(hex),
  };
}

function addGrid(slide: PptxSlide, pptx: Pptx, p: Palette): void {
  for (let x = 0; x <= W; x += 0.8) slide.addShape(pptx.ShapeType.line, { x, y: 0, w: 0, h: H, line: { color: p.border, transparency: 72, width: 0.35 } });
  for (let y = 0; y <= H; y += 0.8) slide.addShape(pptx.ShapeType.line, { x: 0, y, w: W, h: 0, line: { color: p.border, transparency: 72, width: 0.35 } });
}

function addBase(slide: PptxSlide, pptx: Pptx, p: Palette): void {
  slide.background = { color: p.bg };
  addGrid(slide, pptx, p);
}

function addHeader(slide: PptxSlide, slideSpec: SlideSpec, p: Palette): number {
  let y = SAFE_Y;
  if (slideSpec.eyebrow) {
    slide.addText(slideSpec.eyebrow.toUpperCase(), { x: SAFE_X, y, w: 6.6, h: 0.2, fontFace: MONO_FONT, fontSize: 10.5, bold: true, charSpacing: 2, color: p.accent, margin: 0, breakLine: false });
    y += 0.3;
  }
  if (slideSpec.title) {
    slide.addText(slideSpec.title, { x: SAFE_X, y, w: 11.4, h: 0.58, fontFace: DISPLAY_FONT, fontSize: 28.8, bold: true, color: p.text, margin: 0, breakLine: false, fit: "shrink" });
    y += 0.68;
  }
  if (slideSpec.subtitle) {
    slide.addText(slideSpec.subtitle, { x: SAFE_X, y, w: 11.4, h: 0.42, fontFace: BODY_FONT, fontSize: 19.2, color: p.secondary, margin: 0, fit: "shrink" });
    y += 0.52;
  }
  return y;
}

function addFooter(slide: PptxSlide, spec: SlideSpec, index: number, total: number, refs: Map<string, ReferenceItem>, p: Palette): void {
  const citations = (spec.citation_ids ?? []).map((id) => refs.get(id)).filter((item): item is ReferenceItem => Boolean(item)).map(formatShortReference).join(" · ");
  slide.addText(spec.section ?? "", { x: SAFE_X, y: 7.08, w: 1.45, h: 0.16, fontFace: MONO_FONT, fontSize: 8.5, bold: true, charSpacing: 1.2, color: p.muted, margin: 0 });
  slide.addText(citations, { x: 2.25, y: 7.08, w: 8.4, h: 0.16, fontFace: BODY_FONT, fontSize: 8.5, color: p.muted, margin: 0, fit: "shrink" });
  if (spec.footer) slide.addText(spec.footer, { x: 8.7, y: 7.08, w: 2.1, h: 0.16, fontFace: BODY_FONT, fontSize: 8, color: p.muted, align: "right", margin: 0, fit: "shrink" });
  slide.addText(`${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`, { x: 11.55, y: 7.03, w: 0.98, h: 0.22, fontFace: MONO_FONT, fontSize: 8.5, color: p.text, fill: { color: p.inset }, align: "center", valign: "middle", margin: 0 });
}

function addUnderline(slide: PptxSlide, pptx: Pptx, x: number, y: number, p: Palette, width = 2.2): void {
  slide.addShape(pptx.ShapeType.line, { x, y, w: width * 0.52, h: -0.025, line: { color: p.accent, width: 2.5, beginArrowType: "none", endArrowType: "none" } });
  slide.addShape(pptx.ShapeType.line, { x: x + width * 0.5, y: y - 0.025, w: width * 0.5, h: 0.035, line: { color: p.accent, width: 2.5, beginArrowType: "none", endArrowType: "none" } });
}

function addPsi(slide: PptxSlide, p: Palette): void {
  slide.addText("ψ", { x: 11.9, y: 6.83, w: 0.42, h: 0.4, fontFace: DISPLAY_FONT, fontSize: 26, color: p.accent, margin: 0, align: "center" });
}

function addBullets(slide: PptxSlide, items: string[], x: number, y: number, w: number, h: number, p: Palette, fontSize = 18): void {
  const runs = items.map((text) => ({ text, options: { bullet: { indent: fontSize * 1.15 }, breakLine: true, hanging: fontSize * 0.25 } }));
  slide.addText(runs, { x, y, w, h, fontFace: BODY_FONT, fontSize, color: p.text, breakLine: false, margin: 0.05, paraSpaceAfterPt: 10, valign: "top", fit: "shrink" });
}

async function addImageContain(slide: PptxSlide, absolutePath: string, x: number, y: number, w: number, h: number): Promise<void> {
  const metadata = await sharp(absolutePath).metadata();
  const ratio = (metadata.width ?? 1) / (metadata.height ?? 1);
  const boxRatio = w / h;
  const fitW = ratio > boxRatio ? w : h * ratio;
  const fitH = ratio > boxRatio ? w / ratio : h;
  slide.addImage({ path: absolutePath, x: x + (w - fitW) / 2, y: y + (h - fitH) / 2, w: fitW, h: fitH });
}

async function addArtLayer(slide: PptxSlide, spec: SlideSpec, deckDir: string, themeName: string): Promise<void> {
  if (!spec.art) return;
  const lightTheme = themeName === "bright-minimal" || themeName === "print";
  if (lightTheme && spec.art.placement === "background" && !spec.art.src_light) return;
  const sourcePath = lightTheme && spec.art.src_light ? spec.art.src_light : spec.art.src;
  const absolute = path.resolve(deckDir, sourcePath);
  if (!(await pathExists(absolute))) return;
  const placement = spec.art.placement ?? "right";
  const source = sharp(absolute);
  const metadata = await source.metadata();
  const width = metadata.width ?? 1;
  const height = metadata.height ?? 1;
  if (placement === "right" || placement === "left") {
    const cropWidth = Math.max(1, Math.round(width * 0.46));
    const left = placement === "right" ? width - cropWidth : 0;
    const buffer = await source.extract({ left, top: 0, width: cropWidth, height }).png().toBuffer();
    slide.addImage({ data: `data:image/png;base64,${buffer.toString("base64")}`, x: placement === "right" ? 7.2 : 0, y: 0, w: 6.133333, h: H });
  } else {
    slide.addImage({ path: absolute, x: 0, y: 0, w: W, h: H });
  }
}

function addTitleSlide(slide: PptxSlide, deck: DeckSpec, spec: SlideSpec, pptx: Pptx, p: Palette): void {
  const textW = spec.art ? 5.95 : 9.7;
  slide.addText(deck.deck.preset.toUpperCase(), { x: SAFE_X, y: 0.65, w: 3, h: 0.2, fontFace: MONO_FONT, fontSize: 10, bold: true, charSpacing: 2, color: p.accent, margin: 0 });
  slide.addText(spec.title ?? deck.deck.title, { x: SAFE_X, y: 1.15, w: textW, h: 2.18, fontFace: DISPLAY_FONT, fontSize: spec.art ? 38 : 43.2, bold: true, color: p.text, margin: 0, breakLine: false, fit: "shrink", valign: "middle" });
  addUnderline(slide, pptx, SAFE_X, 3.5, p, 2.7);
  if (spec.subtitle ?? deck.deck.subtitle) slide.addText(spec.subtitle ?? deck.deck.subtitle ?? "", { x: SAFE_X, y: 3.78, w: textW, h: 0.86, fontFace: BODY_FONT, fontSize: 16.5, color: p.secondary, margin: 0, fit: "shrink" });
  const meta = spec.meta ?? [deck.deck.event, deck.deck.date].filter((item): item is string => Boolean(item));
  slide.addText(meta.join("   ·   "), { x: SAFE_X, y: 5.0, w: textW, h: 0.3, fontFace: BODY_FONT, fontSize: 11.5, color: p.secondary, margin: 0, fit: "shrink" });
  slide.addText(`${deck.deck.author.name}${deck.deck.author.affiliation ? `  ·  ${deck.deck.author.affiliation}` : ""}`, { x: SAFE_X, y: 5.62, w: textW, h: 0.3, fontFace: BODY_FONT, fontSize: 13, color: p.text, margin: 0 });
  if (!spec.art) addPsi(slide, p);
}

function addAgenda(slide: PptxSlide, spec: SlideSpec, p: Palette): void {
  let y = addHeader(slide, spec, p) + 0.05;
  (spec.bullets ?? []).forEach((item, index) => {
    slide.addText(String(index + 1).padStart(2, "0"), { x: SAFE_X, y, w: 0.42, h: 0.35, fontFace: MONO_FONT, fontSize: 10, bold: true, color: p.accent, margin: 0, valign: "middle" });
    slide.addText(item, { x: SAFE_X + 0.55, y, w: CONTENT_W - 0.55, h: 0.35, fontFace: BODY_FONT, fontSize: 17, color: p.text, margin: 0, valign: "middle", fit: "shrink", line: { color: p.border, width: 0.5 } });
    y += 0.62;
  });
}

function addContent(slide: PptxSlide, spec: SlideSpec, p: Palette): void {
  let y = addHeader(slide, spec, p);
  if (spec.claim) {
    slide.addText(spec.claim, { x: SAFE_X, y, w: 11.4, h: 0.82, fontFace: DISPLAY_FONT, fontSize: 28, bold: true, color: p.text, margin: 0, fit: "shrink", breakLine: false });
    y += 0.95;
  }
  if (spec.body) {
    slide.addText(spec.body, { x: SAFE_X, y, w: 10.8, h: 1.25, fontFace: BODY_FONT, fontSize: 18, color: p.secondary, margin: 0, fit: "shrink", breakLine: false, valign: "top" });
    y += 1.38;
  }
  if (spec.bullets) addBullets(slide, spec.bullets, SAFE_X, y + 0.08, 11.2, Math.max(1, 6.65 - y), p, 17);
  if (spec.panels?.length) {
    const gap = 0.24;
    const panelW = (CONTENT_W - gap * (spec.panels.length - 1)) / spec.panels.length;
    spec.panels.forEach((panel, index) => {
      const x = SAFE_X + index * (panelW + gap);
      slide.addShape((slide as any)._parent?.ShapeType?.rect ?? "rect", { x, y, w: panelW, h: Math.max(1.8, 6.65 - y), fill: { color: p.panel, transparency: 8 }, line: { color: p.border, width: 1 } });
      slide.addShape((slide as any)._parent?.ShapeType?.line ?? "line", { x, y, w: panelW, h: 0, line: { color: p.accent, width: 3 } });
      slide.addText(panel.heading, { x: x + 0.28, y: y + 0.28, w: panelW - 0.56, h: 0.48, fontFace: DISPLAY_FONT, fontSize: 18, bold: true, color: p.text, margin: 0, fit: "shrink" });
      if (panel.body) slide.addText(panel.body, { x: x + 0.28, y: y + 0.92, w: panelW - 0.56, h: 1.3, fontFace: BODY_FONT, fontSize: 15.2, color: p.secondary, margin: 0, fit: "shrink", valign: "top" });
      if (panel.bullets) addBullets(slide, panel.bullets, x + 0.22, y + 0.88, panelW - 0.44, Math.max(1, 5.55 - y), p, 14.5);
    });
  }
}

function addComparison(slide: PptxSlide, spec: SlideSpec, pptx: Pptx, p: Palette): void {
  const y = addHeader(slide, spec, p) + 0.06;
  const panels = spec.panels ?? [];
  const count = Math.max(2, panels.length);
  const gap = 0.55;
  const w = (CONTENT_W - gap * (count - 1)) / count;
  panels.forEach((panel, index) => {
    const x = SAFE_X + index * (w + gap);
    if (index > 0) slide.addShape(pptx.ShapeType.line, { x: x - gap / 2, y, w: 0, h: 4.9, line: { color: p.border, width: 1 } });
    slide.addText(panel.heading, { x, y, w, h: 0.72, fontFace: DISPLAY_FONT, fontSize: 22, bold: true, color: p.text, margin: 0, fit: "shrink" });
    if (panel.body) slide.addText(panel.body, { x, y: y + 0.85, w, h: 1, fontFace: BODY_FONT, fontSize: 16, color: p.secondary, margin: 0, fit: "shrink" });
    if (panel.bullets) addBullets(slide, panel.bullets, x, y + 0.95, w, 3.9, p, 15.5);
  });
}

function addMethod(slide: PptxSlide, spec: SlideSpec, pptx: Pptx, p: Palette): void {
  const y = addHeader(slide, spec, p) + 0.18;
  const d = spec.design ?? {};
  const items: Array<[string, string | string[] | undefined]> = [
    ["APPROACH", d.approach], ["SAMPLE", d.participants], ["INSTRUMENTS", d.instruments], ["ANALYSIS", d.analysis],
  ];
  items.forEach(([label, value], index) => {
    if (!value) return;
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = SAFE_X + column * 6.25;
    const yy = y + row * 1.78;
    slide.addText(label, { x, y: yy, w: 1.25, h: 0.26, fontFace: MONO_FONT, fontSize: 10.5, bold: true, charSpacing: 1.2, color: p.accent, margin: 0 });
    const text = Array.isArray(value) ? value.map((item) => `• ${item}`).join("\n") : value;
    slide.addText(text, { x: x + 1.45, y: yy - 0.02, w: 4.55, h: 1.28, fontFace: BODY_FONT, fontSize: 15.5, color: p.text, margin: 0, fit: "shrink", valign: "top" });
    slide.addShape(pptx.ShapeType.line, { x, y: yy + 1.38, w: 5.95, h: 0, line: { color: p.border, width: 0.8 } });
  });
  if (d.procedure?.length) {
    slide.addText("PROCEDURE", { x: SAFE_X, y: y + 3.62, w: 1.25, h: 0.26, fontFace: MONO_FONT, fontSize: 10.5, bold: true, color: p.accent, margin: 0 });
    addBullets(slide, d.procedure, SAFE_X + 1.45, y + 3.55, 10.3, 1.55, p, 14.5);
  }
}

function addLiterature(slide: PptxSlide, spec: SlideSpec, pptx: Pptx, p: Palette): void {
  const y = addHeader(slide, spec, p) + 0.08;
  const clusters = spec.literature ?? [];
  const columns = 2;
  const rows = Math.max(1, Math.ceil(clusters.length / columns));
  const gapX = 0.42;
  const gapY = 0.18;
  const w = (CONTENT_W - gapX) / columns;
  const h = Math.min(1.22, (5.15 - gapY * (rows - 1)) / rows);
  clusters.forEach((cluster, index) => {
    const x = SAFE_X + (index % columns) * (w + gapX);
    const yy = y + Math.floor(index / columns) * (h + gapY);
    const accent = cluster.gap ? p.accent : p.accent2;
    slide.addShape(pptx.ShapeType.rect, { x, y: yy, w, h, fill: { color: p.panel, transparency: 8 }, line: { color: p.border, transparency: 45, width: 0.6 } });
    slide.addShape(pptx.ShapeType.line, { x, y: yy, w: 0, h, line: { color: accent, width: 3.2 } });
    slide.addText(cluster.cluster, { x: x + 0.28, y: yy + 0.16, w: w - 1.45, h: 0.34, fontFace: DISPLAY_FONT, fontSize: 16.5, bold: true, color: p.text, margin: 0, fit: "shrink" });
    if (cluster.gap) slide.addText("RESEARCH GAP", { x: x + w - 1.22, y: yy + 0.17, w: 0.98, h: 0.18, fontFace: MONO_FONT, fontSize: 7.5, bold: true, color: p.accent, align: "right", margin: 0, fit: "shrink" });
    slide.addText((cluster.works ?? []).join("  ·  ") || "尚缺整合證據", { x: x + 0.28, y: yy + 0.62, w: w - 0.55, h: h - 0.76, fontFace: BODY_FONT, fontSize: 11.5, color: p.secondary, margin: 0, fit: "shrink", valign: "top" });
  });
}

function addBigNumber(slide: PptxSlide, spec: SlideSpec, pptx: Pptx, p: Palette): void {
  const y = addHeader(slide, spec, p) + 0.3;
  if (spec.hero_stat) {
    slide.addText(spec.hero_stat.value, { x: SAFE_X, y: y + 0.05, w: 6.9, h: 2.2, fontFace: MONO_FONT, fontSize: 172, bold: true, color: p.accent, margin: 0, fit: "shrink", breakLine: false, valign: "middle" });
    slide.addText(spec.hero_stat.label, { x: SAFE_X + 0.15, y: y + 2.4, w: 5.4, h: 0.72, fontFace: DISPLAY_FONT, fontSize: 23, bold: true, color: p.text, margin: 0, fit: "shrink" });
    if (spec.hero_stat.annotation) {
      slide.addText(`↗  ${spec.hero_stat.annotation}`, { x: 6.15, y: y + 1.82, w: 2.15, h: 0.36, fontFace: MONO_FONT, fontSize: 10.5, italic: true, color: p.accent2, rotate: 354, margin: 0, fit: "shrink" });
    }
    if (spec.claim) slide.addText(spec.claim, { x: 8.15, y: y + 0.55, w: 4.0, h: 2.25, fontFace: DISPLAY_FONT, fontSize: 27, bold: true, color: p.text, margin: 0, fit: "shrink", valign: "middle", line: { color: p.accent, width: 2 } });
    return;
  }
  const stats = spec.stats ?? [];
  const gap = 0.3;
  const w = (CONTENT_W - gap * Math.max(0, stats.length - 1)) / Math.max(1, stats.length);
  stats.forEach((stat, index) => {
    const x = SAFE_X + index * (w + gap);
    slide.addShape(pptx.ShapeType.line, { x, y, w, h: 0, line: { color: p.accent, width: 2.7 } });
    slide.addText(stat.value, { x, y: y + 0.55, w, h: 1.25, fontFace: MONO_FONT, fontSize: 42, bold: true, color: p.accent, align: "center", margin: 0, fit: "shrink" });
    slide.addText(stat.label, { x, y: y + 2, w, h: 0.55, fontFace: DISPLAY_FONT, fontSize: 18, bold: true, color: p.text, align: "center", margin: 0, fit: "shrink" });
    if (stat.note) slide.addText(stat.note, { x, y: y + 2.7, w, h: 0.35, fontFace: BODY_FONT, fontSize: 11, color: p.secondary, align: "center", margin: 0, fit: "shrink" });
  });
}

function addTable(slide: PptxSlide, spec: SlideSpec, p: Palette): void {
  const y = addHeader(slide, spec, p);
  const table = spec.table;
  if (!table) return addContent(slide, spec, p);
  if (spec.hero_stat) {
    slide.addText(spec.hero_stat.value, { x: SAFE_X, y: y + 0.2, w: 4.7, h: 1.65, fontFace: MONO_FONT, fontSize: 112, bold: true, color: p.accent, margin: 0, fit: "shrink", breakLine: false });
    slide.addText(spec.hero_stat.label, { x: SAFE_X + 0.08, y: y + 1.95, w: 3.6, h: 0.55, fontFace: DISPLAY_FONT, fontSize: 19, bold: true, color: p.text, margin: 0, fit: "shrink" });
    if (spec.hero_stat.annotation) slide.addText(`↗  ${spec.hero_stat.annotation}`, { x: 1.75, y: y + 2.65, w: 2.45, h: 0.34, fontFace: MONO_FONT, fontSize: 10.5, italic: true, color: p.accent2, rotate: 354, margin: 0, fit: "shrink" });
    const tableX = 5.05;
    let tableY = y + 0.08;
    if (spec.claim) {
      slide.addText(spec.claim, { x: tableX, y: tableY, w: 7.45, h: 0.72, fontFace: DISPLAY_FONT, fontSize: 23, bold: true, color: p.text, margin: 0, fit: "shrink" });
      tableY += 0.84;
    }
    if (table.caption) {
      slide.addText(table.caption, { x: tableX, y: tableY, w: 6.2, h: 0.24, fontFace: BODY_FONT, fontSize: 10.5, color: p.secondary, margin: 0 });
      tableY += 0.3;
    }
    const highlights = new Set(table.highlight ?? []);
    const header = table.columns.map((text) => ({ text, options: { bold: true, color: p.text, fill: { color: p.bg }, border: { type: "solid", color: p.accent, pt: 0.8 } } }));
    const rows = table.rows.map((row, rowIndex) => row.map((cell) => ({ text: String(cell), options: { bold: highlights.has(rowIndex), color: p.text, fill: { color: highlights.has(rowIndex) ? p.paper : p.bg }, border: { type: "solid", color: p.border, pt: 0.45 } } })));
    slide.addTable([header, ...rows], { x: tableX, y: tableY, w: 7.45, h: Math.min(3.7, 6.55 - tableY), fontFace: BODY_FONT, fontSize: 12.2, color: p.text, fill: { color: p.bg }, border: { type: "solid", color: p.border, pt: 0.45 }, margin: 0.08, valign: "middle", autoFit: false, rowH: 0.38 });
    if (table.note) slide.addText(table.note, { x: tableX, y: 6.62, w: 7.45, h: 0.2, fontFace: BODY_FONT, fontSize: 9, color: p.secondary, margin: 0, fit: "shrink" });
    return;
  }
  let tableY = y;
  if (spec.claim) {
    slide.addText(spec.claim, { x: SAFE_X, y, w: 11.4, h: 0.62, fontFace: DISPLAY_FONT, fontSize: 23.5, bold: true, color: p.text, margin: 0, fit: "shrink" });
    tableY += 0.76;
  }
  if (table.caption) {
    slide.addText(table.caption, { x: SAFE_X, y: tableY, w: 6.5, h: 0.25, fontFace: BODY_FONT, fontSize: 11, color: p.secondary, margin: 0 });
    tableY += 0.32;
  }
  const highlights = new Set(table.highlight ?? []);
  const header = table.columns.map((text) => ({ text, options: { bold: true, color: p.text, fill: { color: p.bg }, border: { type: "solid", color: p.accent, pt: 0.8 } } }));
  const rows = table.rows.map((row, rowIndex) => row.map((cell) => ({ text: String(cell), options: { bold: highlights.has(rowIndex), color: p.text, fill: { color: highlights.has(rowIndex) ? p.paper : p.bg }, border: { type: "solid", color: p.border, pt: 0.45 } } })));
  slide.addTable([header, ...rows], { x: SAFE_X, y: tableY, w: CONTENT_W, h: Math.min(4.35, 6.55 - tableY), fontFace: BODY_FONT, fontSize: 12.5, color: p.text, fill: { color: p.bg }, border: { type: "solid", color: p.border, pt: 0.45 }, margin: 0.08, valign: "middle", autoFit: false, rowH: 0.36 });
  if (table.note) slide.addText(table.note, { x: SAFE_X, y: 6.62, w: 8.8, h: 0.2, fontFace: BODY_FONT, fontSize: 9, color: p.secondary, margin: 0, fit: "shrink" });
}

function addCoding(slide: PptxSlide, spec: SlideSpec, pptx: Pptx, p: Palette): void {
  const y = addHeader(slide, spec, p) + 0.05;
  const themes = spec.themes ?? [];
  const rowH = Math.min(0.84, 4.85 / Math.max(themes.length, 1));
  themes.forEach((theme, index) => {
    const yy = y + index * (rowH + 0.08);
    slide.addShape(pptx.ShapeType.line, { x: SAFE_X, y: yy, w: 0, h: rowH, line: { color: p.accent, width: 3 } });
    slide.addShape(pptx.ShapeType.line, { x: SAFE_X, y: yy + rowH, w: CONTENT_W, h: 0, line: { color: p.border, width: 0.55 } });
    slide.addText(theme.theme, { x: SAFE_X + 0.2, y: yy + 0.1, w: 2.65, h: rowH - 0.18, fontFace: DISPLAY_FONT, fontSize: 16, bold: true, color: p.text, margin: 0, fit: "shrink", valign: "middle" });
    slide.addText(theme.code_count === undefined ? "" : String(theme.code_count), { x: 3.55, y: yy + 0.1, w: 0.8, h: rowH - 0.18, fontFace: MONO_FONT, fontSize: 14, bold: true, color: p.accent, margin: 0, align: "center", valign: "middle" });
    slide.addText(theme.example ?? "", { x: 4.55, y: yy + 0.08, w: 6.25, h: rowH - 0.16, fontFace: BODY_FONT, fontSize: 13.3, color: p.secondary, margin: 0, fit: "shrink", valign: "middle" });
    slide.addText(theme.participants ?? "", { x: 11.15, y: yy + 0.1, w: 1.25, h: rowH - 0.18, fontFace: MONO_FONT, fontSize: 11, color: p.muted, margin: 0, align: "right", valign: "middle" });
  });
}

function addQuote(slide: PptxSlide, spec: SlideSpec, p: Palette): void {
  const y = addHeader(slide, spec, p);
  const quote = spec.quote;
  if (!quote) return addContent(slide, spec, p);
  slide.addText("“", { x: 1.1, y: y + 0.35, w: 0.8, h: 0.8, fontFace: DISPLAY_FONT, fontSize: 64, bold: true, color: p.accent, margin: 0 });
  const textW = spec.art ? 5.35 : 10.2;
  slide.addText(quote.text, { x: 1.6, y: y + 0.62, w: textW, h: 2.85, fontFace: DISPLAY_FONT, fontSize: 28, bold: true, color: p.text, margin: 0, fit: "shrink", valign: "middle", breakLine: false });
  slide.addText(`${quote.attribution}${quote.context ? `  ·  ${quote.context}` : ""}`, { x: 1.6, y: y + 3.62, w: textW, h: 0.35, fontFace: BODY_FONT, fontSize: 13, color: p.secondary, margin: 0, fit: "shrink" });
}

function addEvidence(slide: PptxSlide, spec: SlideSpec, pptx: Pptx, p: Palette): void {
  const y = addHeader(slide, spec, p) + 0.08;
  const cer = spec.cer;
  if (!cer) return addContent(slide, spec, p);
  const gap = 0.52;
  const widths = [3.2, 3.7, 3.75];
  const xs = [SAFE_X, SAFE_X + widths[0]! + gap, SAFE_X + widths[0]! + widths[1]! + gap * 2];
  // Connectors first so they remain behind the CER blocks.
  for (let i = 0; i < 2; i += 1) slide.addShape(pptx.ShapeType.line, { x: xs[i]! + widths[i]!, y: y + 2.5, w: gap, h: 0, line: { color: p.accent, width: 2.5, endArrowType: "triangle" } });
  const blocks = [
    ["主張  CLAIM", cer.claim],
    ["證據  EVIDENCE", cer.evidence.map((item) => `• ${item}`).join("\n")],
    ["推理  REASONING", cer.reasoning],
  ];
  blocks.forEach(([label, text], index) => {
    slide.addShape(pptx.ShapeType.rect, { x: xs[index]!, y, w: widths[index]!, h: 5.15, fill: { color: p.panel, transparency: 8 }, line: { color: p.border, width: 1.4 } });
    slide.addText(label!, { x: xs[index]! + 0.3, y: y + 0.48, w: widths[index]! - 0.6, h: 0.28, fontFace: MONO_FONT, fontSize: 10.5, bold: true, charSpacing: 1.2, color: p.accent, margin: 0 });
    slide.addText(text!, { x: xs[index]! + 0.3, y: y + 1.15, w: widths[index]! - 0.6, h: 3.35, fontFace: BODY_FONT, fontSize: index === 1 ? 14.7 : 16.2, color: p.text, margin: 0, fit: "shrink", valign: "middle" });
  });
}

function nodeLayout(nodes: NonNullable<SlideSpec["framework"]>["nodes"]): Map<string, { x: number; y: number; w: number; h: number }> {
  const columns = nodes.length <= 4 ? nodes.length : 4;
  const rows = Math.ceil(nodes.length / columns);
  const gapX = 0.32;
  const gapY = 0.48;
  const nodeW = (CONTENT_W - gapX * (columns - 1)) / columns;
  const nodeH = rows === 1 ? 1.05 : 0.92;
  const totalH = rows * nodeH + (rows - 1) * gapY;
  const startY = 3.05 - totalH / 2;
  return new Map(nodes.map((node, index) => [node.id, {
    x: SAFE_X + (index % columns) * (nodeW + gapX),
    y: startY + Math.floor(index / columns) * (nodeH + gapY),
    w: nodeW,
    h: nodeH,
  }]));
}

function addDirectedConnector(slide: PptxSlide, pptx: Pptx, from: { x: number; y: number }, to: { x: number; y: number }, color: string, dashed: boolean): void {
  const x = Math.min(from.x, to.x);
  const y = Math.min(from.y, to.y);
  const w = Math.max(0.01, Math.abs(to.x - from.x));
  const h = Math.max(0.01, Math.abs(to.y - from.y));
  const inverse = (to.x - from.x) * (to.y - from.y) < 0;
  const first = inverse ? { x: x + w, y } : { x, y };
  const sourceIsFirst = Math.abs(from.x - first.x) < 0.02 && Math.abs(from.y - first.y) < 0.02;
  slide.addShape(inverse ? pptx.ShapeType.lineInv : pptx.ShapeType.line, {
    x, y, w, h,
    line: {
      color,
      width: 1.8,
      dash: dashed ? "dash" : "solid",
      beginArrowType: sourceIsFirst ? "none" : "triangle",
      endArrowType: sourceIsFirst ? "triangle" : "none",
    },
  });
}

function addFramework(slide: PptxSlide, spec: SlideSpec, pptx: Pptx, p: Palette): void {
  addHeader(slide, spec, p);
  const framework = spec.framework;
  if (!framework) return addContent(slide, spec, p);
  const positions = nodeLayout(framework.nodes);
  const nodeIndices = new Map(framework.nodes.map((node, index) => [node.id, index]));
  // Connectors before nodes per PowerPoint z-order best practice.
  (framework.edges ?? []).forEach((edge) => {
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);
    if (!from || !to) return;
    const sameRow = Math.abs(from.y - to.y) < 0.1;
    const skipsNode = sameRow && Math.abs((nodeIndices.get(edge.to) ?? 0) - (nodeIndices.get(edge.from) ?? 0)) > 1;
    if (skipsNode) {
      const fromCenter = from.x + from.w / 2;
      const toCenter = to.x + to.w / 2;
      const routeY = Math.min(from.y, to.y) - 0.34;
      slide.addShape(pptx.ShapeType.line, { x: fromCenter, y: from.y, w: 0, h: routeY - from.y, line: { color: p.accent, width: 1.8, dash: edge.style === "dashed" ? "dash" : "solid" } });
      slide.addShape(pptx.ShapeType.line, { x: fromCenter, y: routeY, w: toCenter - fromCenter, h: 0, line: { color: p.accent, width: 1.8, dash: edge.style === "dashed" ? "dash" : "solid" } });
      slide.addShape(pptx.ShapeType.line, { x: toCenter, y: routeY, w: 0, h: to.y - routeY, line: { color: p.accent, width: 1.8, dash: edge.style === "dashed" ? "dash" : "solid", endArrowType: "triangle" } });
      if (edge.label) slide.addText(edge.label, { x: (fromCenter + toCenter) / 2 - 0.45, y: routeY - 0.22, w: 0.9, h: 0.18, fontFace: MONO_FONT, fontSize: 8, color: p.accent, align: "center", margin: 0 });
    } else if (sameRow) {
      slide.addShape(pptx.ShapeType.line, { x: from.x + from.w, y: from.y + from.h / 2, w: Math.max(0.1, to.x - (from.x + from.w)), h: 0, line: { color: p.accent, width: 2.2, dash: edge.style === "dashed" ? "dash" : "solid", endArrowType: "triangle" } });
    } else {
      const sourceBelow = from.y > to.y;
      const start = { x: from.x + from.w / 2, y: sourceBelow ? from.y : from.y + from.h };
      const end = { x: to.x + to.w / 2, y: sourceBelow ? to.y + to.h : to.y };
      addDirectedConnector(slide, pptx, start, end, p.accent, edge.style === "dashed");
    }
  });
  framework.nodes.forEach((node) => {
    const pos = positions.get(node.id)!;
    const border = node.role === "independent" ? p.accent2 : node.role === "dependent" ? p.accent : p.border;
    slide.addShape(pptx.ShapeType.rect, { ...pos, fill: { color: p.panel, transparency: 8 }, line: { color: border, width: 1.7 } });
    slide.addText(node.label, { x: pos.x + 0.16, y: pos.y + 0.18, w: pos.w - 0.32, h: 0.34, fontFace: DISPLAY_FONT, fontSize: 18, bold: true, color: p.text, align: "center", margin: 0, fit: "shrink" });
    if (node.role) slide.addText(node.role.toUpperCase(), { x: pos.x + 0.16, y: pos.y + 0.58, w: pos.w - 0.32, h: 0.18, fontFace: MONO_FONT, fontSize: 8, bold: true, color: p.muted, align: "center", margin: 0, fit: "shrink" });
  });
}

function addTimeline(slide: PptxSlide, spec: SlideSpec, pptx: Pptx, p: Palette): void {
  const y = addHeader(slide, spec, p) + 0.4;
  const steps = spec.steps ?? [];
  const gap = 0.2;
  const w = (CONTENT_W - gap * Math.max(0, steps.length - 1)) / Math.max(1, steps.length);
  steps.forEach((step, index) => {
    const x = SAFE_X + index * (w + gap);
    if (index < steps.length - 1) slide.addShape(pptx.ShapeType.line, { x: x + w, y: y + 0.05, w: gap, h: 0, line: { color: p.accent, width: 2, endArrowType: "triangle" } });
    slide.addShape(pptx.ShapeType.line, { x, y: y + 0.05, w, h: 0, line: { color: p.accent, width: 2.4 } });
    slide.addText(step.marker ?? String(index + 1).padStart(2, "0"), { x, y: y + 0.35, w, h: 0.28, fontFace: MONO_FONT, fontSize: 11, bold: true, color: p.accent, margin: 0 });
    slide.addText(step.label, { x, y: y + 0.86, w, h: 0.62, fontFace: DISPLAY_FONT, fontSize: 18, bold: true, color: p.text, margin: 0, fit: "shrink" });
    if (step.detail) slide.addText(step.detail, { x, y: y + 1.65, w, h: 1.2, fontFace: BODY_FONT, fontSize: 14.5, color: p.secondary, margin: 0, fit: "shrink" });
  });
}

async function latexPngData(latex: string, color: string): Promise<string> {
  const node = mathDocument.convert(latex, { display: true });
  const svg = mathAdaptor.innerHTML(node).replaceAll("currentColor", `#${color}`);
  const png = await sharp(Buffer.from(svg), { density: 300 }).resize({ width: 2200, withoutEnlargement: false }).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

function latexToPlain(latex: string): string {
  const subscript: Record<string, string> = { a: "ₐ", b: "ᵦ", c: "꜀", i: "ᵢ", n: "ₙ", x: "ₓ", indirect: "indirect" };
  return latex
    .replaceAll("\\beta", "β")
    .replaceAll("\\sigma", "σ")
    .replace(/\\hat\{([^}]+)\}/g, "$1̂")
    .replace(/_\{([^}]+)\}/g, (_, key: string) => subscript[key] ?? `_${key}`)
    .replace(/_([a-zA-Z])/g, (_, key: string) => subscript[key] ?? `_${key}`)
    .replaceAll("\\bar", "")
    .replaceAll("\\", "");
}

async function addFigure(slide: PptxSlide, spec: SlideSpec, deckDir: string, pptx: Pptx, p: Palette): Promise<void> {
  const y = addHeader(slide, spec, p) + 0.06;
  const figure = spec.figure;
  if (!figure) return addContent(slide, spec, p);
  const absolute = path.resolve(deckDir, figure.src);
  if (await pathExists(absolute)) await addImageContain(slide, absolute, SAFE_X, y, 7.9, 4.6);
  slide.addShape(pptx.ShapeType.line, { x: 9.08, y: y + 0.25, w: 0, h: 3.75, line: { color: p.accent, width: 3 } });
  slide.addText(spec.claim ?? figure.alt, { x: 9.35, y: y + 0.75, w: 3.15, h: 2.35, fontFace: DISPLAY_FONT, fontSize: 22, bold: true, color: p.text, margin: 0, fit: "shrink", valign: "middle" });
  slide.addText(`${figure.caption ?? ""}${figure.source ? `  ${figure.source}` : ""}`, { x: SAFE_X, y: y + 4.75, w: 7.9, h: 0.28, fontFace: BODY_FONT, fontSize: 9.5, color: p.muted, margin: 0, fit: "shrink" });
}

async function addEquation(slide: PptxSlide, spec: SlideSpec, pptx: Pptx, p: Palette): Promise<void> {
  const y = addHeader(slide, spec, p) + 0.2;
  const equation = spec.equation;
  if (!equation) return addContent(slide, spec, p);
  slide.addShape(pptx.ShapeType.line, { x: SAFE_X, y: y + 0.15, w: 7.1, h: 0, line: { color: p.accent, width: 1.8 } });
  slide.addShape(pptx.ShapeType.line, { x: SAFE_X, y: y + 2.2, w: 7.1, h: 0, line: { color: p.accent, width: 1.8 } });
  slide.addImage({ data: await latexPngData(equation.latex, p.text), x: SAFE_X + 0.18, y: y + 0.42, w: 6.72, h: 1.52 });
  (equation.variables ?? []).forEach((variable, index) => {
    const yy = y + index * 0.62;
    slide.addText(latexToPlain(variable.symbol), { x: 8.35, y: yy, w: 1.15, h: 0.3, fontFace: MONO_FONT, fontSize: 13.5, bold: true, color: p.accent, margin: 0, fit: "shrink" });
    slide.addText(`${variable.meaning}${variable.unit ? ` (${variable.unit})` : ""}`, { x: 9.58, y: yy, w: 2.85, h: 0.36, fontFace: BODY_FONT, fontSize: 14, color: p.text, margin: 0, fit: "shrink" });
  });
}

function addReferences(slide: PptxSlide, spec: SlideSpec, references: ReferenceItem[], p: Palette): void {
  const y = addHeader(slide, spec, p);
  const midpoint = Math.ceil(references.length / 2);
  [references.slice(0, midpoint), references.slice(midpoint)].forEach((column, index) => {
    slide.addText(column.map((ref, refIndex) => `${refIndex + 1 + index * midpoint}. ${formatFullReference(ref)}`).join("\n\n"), { x: SAFE_X + index * 6.05, y, w: 5.75, h: 5.1, fontFace: BODY_FONT, fontSize: 11, color: p.secondary, margin: 0, fit: "shrink", valign: "top" });
  });
}

function addResearchQuestion(slide: PptxSlide, spec: SlideSpec, p: Palette): void {
  let y = SAFE_Y;
  if (spec.eyebrow) {
    slide.addText(spec.eyebrow, { x: SAFE_X, y, w: 5.7, h: 0.22, fontFace: MONO_FONT, fontSize: 10.5, bold: true, charSpacing: 1.8, color: p.accent, margin: 0 });
    y += 0.52;
  }
  if (spec.claim) {
    slide.addText(spec.claim, { x: SAFE_X, y, w: 5.85, h: 1.75, fontFace: DISPLAY_FONT, fontSize: 33, bold: true, color: p.text, margin: 0, fit: "shrink", breakLine: false, valign: "middle" });
    y += 1.98;
  }
  if (spec.bullets) {
    addBullets(slide, spec.bullets, SAFE_X, y, 5.7, 1.35, p, 14.8);
    y += 1.55;
  }
  if (spec.body) {
    slide.addShape("line", { x: SAFE_X, y, w: 0.8, h: 0, line: { color: p.accent, width: 2.4 } });
    slide.addText(spec.body, { x: SAFE_X, y: y + 0.2, w: 5.65, h: 1.18, fontFace: BODY_FONT, fontSize: 14.5, color: p.secondary, margin: 0, fit: "shrink", valign: "top" });
  }
}

function addSummary(slide: PptxSlide, spec: SlideSpec, pptx: Pptx, p: Palette): void {
  slide.addText("SO WHAT?", { x: SAFE_X, y: 0.72, w: 1.4, h: 0.2, fontFace: MONO_FONT, fontSize: 9.5, bold: true, charSpacing: 1.5, color: p.accent, margin: 0, rotate: 270 });
  slide.addText(spec.title ?? "Summary", { x: 1.48, y: 0.66, w: 7.1, h: 0.98, fontFace: DISPLAY_FONT, fontSize: 39, bold: true, color: p.text, margin: 0, fit: "shrink" });
  addUnderline(slide, pptx, 1.48, 1.78, p, 2.35);
  (spec.bullets ?? []).forEach((item, index) => {
    const x = 1.48 + (index % 2 === 1 ? 0.5 : 0);
    const y = 2.14 + index * 0.9;
    slide.addText(String(index + 1).padStart(2, "0"), { x, y, w: 0.42, h: 0.26, fontFace: MONO_FONT, fontSize: 9.5, bold: true, color: p.accent, margin: 0 });
    slide.addText(item, { x: x + 0.55, y: y - 0.06, w: 7.35, h: 0.55, fontFace: BODY_FONT, fontSize: 17, color: p.text, margin: 0, fit: "shrink", line: { color: p.border, width: 0.6 } });
  });
  if (!spec.art) {
    slide.addText("ψ", { x: 9.45, y: 1.7, w: 2.0, h: 2.2, fontFace: DISPLAY_FONT, fontSize: 122, bold: true, color: p.accent, transparency: 80, margin: 0, align: "center" });
    slide.addShape(pptx.ShapeType.arc, { x: 8.65, y: 1.35, w: 3.6, h: 3.6, adjustPoint: 0.3, rotate: 28, line: { color: p.accent, transparency: 78, width: 2 }, fill: { color: p.bg, transparency: 100 } });
  }
}

function addClosing(slide: PptxSlide, spec: SlideSpec, p: Palette): void {
  const w = spec.art ? 5.9 : 8.9;
  slide.addText("OPEN FOR DISCUSSION", { x: SAFE_X, y: 1.55, w, h: 0.22, fontFace: MONO_FONT, fontSize: 10, bold: true, charSpacing: 1.8, color: p.accent, margin: 0 });
  slide.addText(spec.title ?? "敬請指教", { x: SAFE_X, y: 2.03, w, h: 1.05, fontFace: DISPLAY_FONT, fontSize: 54, bold: true, color: p.text, margin: 0, fit: "shrink" });
  if (spec.body) slide.addText(spec.body, { x: SAFE_X, y: 3.35, w, h: 0.52, fontFace: BODY_FONT, fontSize: 18, color: p.secondary, margin: 0 });
  if (spec.footer) slide.addText(spec.footer, { x: SAFE_X, y: 5.5, w, h: 0.25, fontFace: MONO_FONT, fontSize: 10, color: p.muted, margin: 0 });
  if (!spec.art) addPsi(slide, p);
}

function addStatement(slide: PptxSlide, spec: SlideSpec, p: Palette): void {
  const w = spec.art ? 5.85 : 10.8;
  slide.addText("“", { x: SAFE_X, y: 1.15, w: 0.8, h: 0.72, fontFace: DISPLAY_FONT, fontSize: 62, bold: true, color: p.accent, margin: 0 });
  if (spec.eyebrow) slide.addText(spec.eyebrow, { x: 1.65, y: 1.28, w: 3.2, h: 0.22, fontFace: MONO_FONT, fontSize: 10, bold: true, charSpacing: 1.5, color: p.accent, margin: 0 });
  slide.addText(spec.claim ?? spec.title ?? "", { x: SAFE_X, y: 2.0, w, h: 2.45, fontFace: DISPLAY_FONT, fontSize: 39, bold: true, color: p.text, margin: 0, fit: "shrink", valign: "middle" });
  if (spec.body) slide.addText(spec.body, { x: SAFE_X, y: 4.82, w, h: 0.82, fontFace: BODY_FONT, fontSize: 16, color: p.secondary, margin: 0, fit: "shrink" });
}

function addSection(slide: PptxSlide, spec: SlideSpec, pptx: Pptx, p: Palette): void {
  slide.addText((spec.eyebrow ?? spec.section ?? "SECTION").toUpperCase(), { x: SAFE_X, y: 2.15, w: 5, h: 0.25, fontFace: MONO_FONT, fontSize: 12, bold: true, charSpacing: 2, color: p.accent, margin: 0 });
  slide.addText(spec.title ?? "", { x: SAFE_X, y: 2.72, w: spec.art ? 5.85 : 9.8, h: 1.25, fontFace: DISPLAY_FONT, fontSize: 48, bold: true, color: p.text, margin: 0, fit: "shrink" });
  addUnderline(slide, pptx, SAFE_X, 4.05, p, 3.1);
}

async function rasterFallback(slide: PptxSlide, screenshotPath: string): Promise<void> {
  if (!(await pathExists(screenshotPath))) throw new Error(`PPTX raster fallback 缺少 screenshot：${screenshotPath}；請先執行 npm run screenshot`);
  slide.addImage({ path: screenshotPath, x: 0, y: 0, w: W, h: H });
}

export async function renderPptx(deck: DeckSpec, references: ReferenceFile, tokens: TokenFile, deckDir: string, distDir: string): Promise<string> {
  const require = createRequire(import.meta.url);
  const PptxGenJS = require("pptxgenjs") as new () => Pptx;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = deck.deck.author.name;
  pptx.company = deck.deck.author.affiliation ?? "AI Physics Classroom";
  pptx.subject = deck.deck.event ?? deck.deck.preset;
  pptx.title = deck.deck.title;
  pptx.lang = deck.deck.language === "zh-Hant" ? "zh-TW" : "en-US";
  pptx.theme = { headFontFace: DISPLAY_FONT, bodyFontFace: BODY_FONT, lang: pptx.lang };
  const theme = tokens.themes[deck.deck.theme];
  if (!theme) throw new Error(`未知 theme：${deck.deck.theme}`);
  const p = palette(theme);
  const refs = new Map(references.references.map((ref) => [ref.id, ref]));

  for (const [index, spec] of deck.slides.entries()) {
    const slide = pptx.addSlide();
    if (spec.custom_html) {
      await rasterFallback(slide, path.join(distDir, "qa", deck.deck.theme, `${String(index + 1).padStart(2, "0")}-${spec.id}.png`));
      continue;
    }
    addBase(slide, pptx, p);
    await addArtLayer(slide, spec, deckDir, deck.deck.theme);
    switch (spec.type) {
      case "title": addTitleSlide(slide, deck, spec, pptx, p); break;
      case "section": addSection(slide, spec, pptx, p); break;
      case "agenda": addAgenda(slide, spec, p); break;
      case "statement": addStatement(slide, spec, p); break;
      case "research-question": addResearchQuestion(slide, spec, p); break;
      case "comparison":
      case "two-column": addComparison(slide, spec, pptx, p); break;
      case "literature-map": addLiterature(slide, spec, pptx, p); break;
      case "method-design": addMethod(slide, spec, pptx, p); break;
      case "stats-table": addTable(slide, spec, p); break;
      case "data-result": spec.table ? addTable(slide, spec, p) : spec.figure ? await addFigure(slide, spec, deckDir, pptx, p) : addContent(slide, spec, p); break;
      case "coding-themes": addCoding(slide, spec, pptx, p); break;
      case "quote": addQuote(slide, spec, p); break;
      case "evidence-chain": addEvidence(slide, spec, pptx, p); break;
      case "theory-framework": addFramework(slide, spec, pptx, p); break;
      case "timeline-process": addTimeline(slide, spec, pptx, p); break;
      case "figure-insight": await addFigure(slide, spec, deckDir, pptx, p); break;
      case "equation-focus": await addEquation(slide, spec, pptx, p); break;
      case "big-number": addBigNumber(slide, spec, pptx, p); break;
      case "summary": addSummary(slide, spec, pptx, p); break;
      case "references": addReferences(slide, spec, references.references, p); break;
      case "qa-closing": addClosing(slide, spec, p); break;
      default: addContent(slide, spec, p); break;
    }
    if (!["title", "section", "qa-closing"].includes(spec.type)) addFooter(slide, spec, index, deck.slides.length, refs, p);
    if (spec.notes) slide.addNotes(spec.notes);
  }

  const output = path.join(distDir, `${deck.deck.id}.pptx`);
  await pptx.writeFile({ fileName: output, compression: true });
  return output;
}
