import fs from "node:fs/promises";
import path from "node:path";
import * as AjvModule from "ajv";
import type { ErrorObject } from "ajv";
import * as addFormatsModule from "ajv-formats";
import sharp from "sharp";
import type { DeckSpec, ReferenceFile, SlideSpec } from "./types.js";
import { countCjkAware } from "./lib/text.js";
import { pathExists } from "./lib/load.js";
import { repoRoot } from "./lib/paths.js";

export type Severity = "error" | "warning" | "info";
export interface Finding { severity: Severity; code: string; location: string; message: string }

const PPT_SAFE_TYPES = new Set([
  "title", "section", "agenda", "statement", "content", "two-column", "comparison",
  "timeline-process", "quote", "figure-insight", "big-number", "research-question",
  "theory-framework", "literature-map", "method-design", "data-result", "stats-table",
  "coding-themes", "evidence-chain", "equation-focus", "summary", "limitations-future",
  "references", "qa-closing", "appendix",
]);
const EDITORIAL_ART_TYPES = new Set(["title", "section", "statement", "quote", "summary", "qa-closing"]);

function schemaFindings(errors: ErrorObject[] | null | undefined, prefix: string): Finding[] {
  return (errors ?? []).map((error) => ({
    severity: "error",
    code: "schema",
    location: `${prefix}${error.instancePath || "/"}`,
    message: error.message ?? "schema validation failed",
  }));
}

function localAsset(value?: string): boolean {
  return Boolean(value && !/^(https?:|data:)/.test(value));
}

async function assetFinding(deckDir: string, relative: string, location: string): Promise<Finding[]> {
  const resolved = path.resolve(deckDir, relative);
  if (!resolved.startsWith(`${deckDir}${path.sep}`) && resolved !== deckDir) {
    return [{ severity: "error", code: "asset-path", location, message: "資產路徑不可離開 deck 目錄" }];
  }
  if (!(await pathExists(resolved))) {
    return [{ severity: "error", code: "asset-missing", location, message: `找不到資產：${relative}` }];
  }
  return [];
}

async function validateSlideAssets(deckDir: string, slide: SlideSpec, index: number): Promise<Finding[]> {
  const findings: Finding[] = [];
  const base = `slides[${index}](${slide.id})`;
  const figures = [slide.figure, slide.framework?.figure, ...(slide.panels ?? []).map((panel) => panel.figure)].filter(Boolean);
  for (const [figureIndex, figure] of figures.entries()) {
    if (!figure || !localAsset(figure.src)) continue;
    findings.push(...await assetFinding(deckDir, figure.src, `${base}.figure[${figureIndex}].src`));
    if (figure.src.startsWith("assets/illustrations/")) {
      if (!/^AI 生成（.+）$/.test(figure.source)) {
        findings.push({ severity: "error", code: "ai-source", location: `${base}.figure[${figureIndex}].source`, message: "AI 插圖來源須寫成「AI 生成（模型名）」" });
      }
      const absolute = path.resolve(deckDir, figure.src);
      if (await pathExists(absolute)) {
        try {
          const metadata = await sharp(absolute).metadata();
          if ((metadata.width ?? 0) < 1600) findings.push({ severity: "error", code: "image-resolution", location: `${base}.figure[${figureIndex}].src`, message: `AI 插圖寬度 ${metadata.width ?? 0}px，至少需 1600px` });
        } catch {
          findings.push({ severity: "warning", code: "image-metadata", location: `${base}.figure[${figureIndex}].src`, message: "無法讀取插圖尺寸，請人工確認" });
        }
      }
    }
  }
  if (slide.art) {
    const location = `${base}.art`;
    for (const [field, source] of [["src", slide.art.src], ["src_light", slide.art.src_light]] as const) {
      if (!source || !localAsset(source)) continue;
      findings.push(...await assetFinding(deckDir, source, `${location}.${field}`));
      const absolute = path.resolve(deckDir, source);
      if (await pathExists(absolute) && source.startsWith("assets/illustrations/")) {
        try {
          const metadata = await sharp(absolute).metadata();
          if ((metadata.width ?? 0) < 1600) findings.push({ severity: "error", code: "image-resolution", location: `${location}.${field}`, message: `AI 插圖寬度 ${metadata.width ?? 0}px，至少需 1600px` });
        } catch {
          findings.push({ severity: "warning", code: "image-metadata", location: `${location}.${field}`, message: "無法讀取插圖尺寸，請人工確認" });
        }
      }
    }
    if (!slide.art.prompt?.trim()) findings.push({ severity: "error", code: "art-prompt", location: `${location}.prompt`, message: "AI art 必須保留完整生成 prompt" });
    if (!slide.art.model?.trim()) findings.push({ severity: "error", code: "art-model", location: `${location}.model`, message: "AI art 必須記錄生成模型" });
  } else if (EDITORIAL_ART_TYPES.has(slide.type)) {
    findings.push({ severity: "info", code: "editorial-art", location: `${base}.art`, message: "此版型建議使用 art；缺圖時 renderer 將使用 ψ 幾何 fallback" });
  }
  if (slide.media) {
    if (localAsset(slide.media.poster)) findings.push(...await assetFinding(deckDir, slide.media.poster, `${base}.media.poster`));
    if (slide.media.src && localAsset(slide.media.src)) findings.push(...await assetFinding(deckDir, slide.media.src, `${base}.media.src`));
    if (!slide.media.fallback_url) findings.push({ severity: "warning", code: "media-fallback", location: `${base}.media`, message: "影片應提供 fallback_url" });
  }
  if (slide.chart) {
    if (slide.chart.data && localAsset(slide.chart.data)) findings.push(...await assetFinding(deckDir, slide.chart.data, `${base}.chart.data`));
    if (slide.chart.spec && localAsset(slide.chart.spec)) findings.push(...await assetFinding(deckDir, slide.chart.spec, `${base}.chart.spec`));
    if (!slide.chart.data || !slide.chart.spec) findings.push({ severity: "warning", code: "chart-canonical", location: `${base}.chart`, message: "圖表建議同時提供 CSV data 與 YAML spec，才能重現並輸出 SVG" });
  }
  return findings;
}

export async function validateDeck(deckDir: string, deck: DeckSpec, refs: ReferenceFile): Promise<Finding[]> {
  const AjvConstructor = ((AjvModule as unknown as { default?: unknown }).default ?? AjvModule) as new (options: Record<string, unknown>) => import("ajv").default;
  const addFormats = ((addFormatsModule as unknown as { default?: unknown }).default ?? addFormatsModule) as (ajv: import("ajv").default) => void;
  const ajv = new AjvConstructor({ allErrors: true, strict: false, allowUnionTypes: true });
  addFormats(ajv);
  const deckSchema = JSON.parse(await fs.readFile(path.join(repoRoot, "schemas", "deck.schema.json"), "utf8"));
  const refSchema = JSON.parse(await fs.readFile(path.join(repoRoot, "schemas", "references.schema.json"), "utf8"));
  const findings: Finding[] = [];

  const deckValid = ajv.compile(deckSchema);
  deckValid(deck);
  findings.push(...schemaFindings(deckValid.errors, "deck"));
  const refsValid = ajv.compile(refSchema);
  refsValid(refs);
  findings.push(...schemaFindings(refsValid.errors, "references"));

  const refIds = new Set(refs.references.map((ref) => ref.id));
  const slideIds = new Set<string>();
  let evidenceChains = 0;
  for (const [index, slide] of deck.slides.entries()) {
    const base = `slides[${index}](${slide.id})`;
    if (slideIds.has(slide.id)) findings.push({ severity: "error", code: "duplicate-slide-id", location: base, message: `重複 slide id：${slide.id}` });
    slideIds.add(slide.id);
    if (!slide.notes?.trim()) findings.push({ severity: "warning", code: "speaker-notes", location: `${base}.notes`, message: "每張 slide 應填講者稿" });
    if (slide.body) {
      const length = countCjkAware(slide.body);
      if (length > 120) findings.push({ severity: length > 240 ? "error" : "warning", code: "body-density", location: `${base}.body`, message: `正文 ${length} 字；>120 字應刪減或拆頁` });
    }
    if (slide.title && slide.title.includes("\n")) findings.push({ severity: "warning", code: "title-wrap", location: `${base}.title`, message: "標題不得手動換行" });
    if ((slide.panels?.length ?? 0) > 3) findings.push({ severity: "error", code: "panel-count", location: `${base}.panels`, message: "panels 最多 3 欄" });
    if (slide.table) {
      const columns = slide.table.columns.length;
      slide.table.rows.forEach((row, rowIndex) => {
        if (row.length !== columns) findings.push({ severity: "error", code: "table-shape", location: `${base}.table.rows[${rowIndex}]`, message: `此列 ${row.length} 格，但 columns 有 ${columns} 欄` });
      });
      if (!slide.table.source) findings.push({ severity: "warning", code: "table-source", location: `${base}.table.source`, message: "研究表格應提供資料來源" });
    }
    for (const citationId of slide.citation_ids ?? []) {
      if (!refIds.has(citationId)) findings.push({ severity: "error", code: "citation-missing", location: `${base}.citation_ids`, message: `找不到引用：${citationId}` });
    }
    if (slide.type === "evidence-chain") evidenceChains += 1;
    if (!PPT_SAFE_TYPES.has(slide.type)) findings.push({ severity: "warning", code: "ppt-unsupported-type", location: `${base}.type`, message: `PPTX renderer 尚未支援 ${slide.type}，將降級為圖片` });
    if (slide.custom_html) findings.push({ severity: "warning", code: "ppt-raster-fallback", location: `${base}.custom_html`, message: "custom_html 在 PPTX 中會降級為整頁圖片" });
    if (slide.chart && !slide.figure && !slide.table) findings.push({ severity: "error", code: "chart-renderer-contract", location: `${base}.chart`, message: "chart-only 頁目前缺少已定稿的 chart spec renderer；請同時提供 SVG/PNG figure fallback，避免 HTML/PPTX 靜默遺漏圖表" });
    findings.push(...await validateSlideAssets(deckDir, slide, index));
  }
  if (evidenceChains === 0) findings.push({ severity: "warning", code: "signature-cer", location: "slides", message: "每份 deck 的核心結論至少應有一張 evidence-chain 簽名頁" });
  if (!deck.deck.template_version) findings.push({ severity: "info", code: "template-version", location: "deck.template_version", message: "建議記錄 template_version 以利未來 migration" });
  return findings;
}

export function printFindings(findings: Finding[]): void {
  const icon: Record<Severity, string> = { error: "✗", warning: "⚠", info: "·" };
  for (const finding of findings) console.log(`${icon[finding.severity]} ${finding.severity.toUpperCase()} [${finding.code}] ${finding.location}: ${finding.message}`);
  const errors = findings.filter((finding) => finding.severity === "error").length;
  const warnings = findings.filter((finding) => finding.severity === "warning").length;
  console.log(`\n${errors} error(s), ${warnings} warning(s), ${findings.length - errors - warnings} info`);
}
