import katex from "katex";
import type { DeckSpec, ReferenceFile, ReferenceItem, SlideSpec } from "../types.js";
import { escapeHtml, formatFullReference, formatShortReference } from "../lib/text.js";

const underline = `<svg class="title-underline" viewBox="0 0 260 14" aria-hidden="true"><path d="M3 8 C55 2, 118 12, 174 6 S235 4, 257 7"/></svg>`;
const cerArrow = `<svg class="cer-arrow" viewBox="0 0 72 36" aria-hidden="true"><path d="M3 18 C22 15, 42 20, 63 17 M53 7 L64 17 L53 29"/></svg>`;
const editorialTypes = new Set(["title", "section", "statement", "quote", "summary", "qa-closing"]);

function artMarkup(slide: SlideSpec): string {
  if (slide.art) {
    const placement = slide.art.placement ?? "right";
    return `<figure class="art-layer art-${escapeHtml(placement)}" aria-label="${escapeHtml(slide.art.alt ?? "Editorial illustration")}"><img src="${escapeHtml(slide.art.src)}" alt="${escapeHtml(slide.art.alt ?? "")}"></figure>`;
  }
  if (editorialTypes.has(slide.type)) return `<div class="art-fallback" aria-hidden="true"><span>ψ</span><i></i><b></b></div>`;
  return "";
}

function heroStat(slide: SlideSpec): string {
  const stat = slide.hero_stat;
  if (!stat) return "";
  return `<aside class="hero-stat"><strong>${escapeHtml(stat.value)}</strong><span>${escapeHtml(stat.label)}</span>${stat.annotation ? `<em>${escapeHtml(stat.annotation)}</em>` : ""}</aside>`;
}

function bullets(items: string[] = [], build?: string): string {
  const fragment = build === "fragment" ? " fragment fade" : "";
  return `<ul class="bullet-list">${items.map((item) => `<li class="${fragment.trim()}">${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function header(slide: SlideSpec): string {
  if (!slide.title && !slide.eyebrow) return "";
  return `<header class="slide-header">
    ${slide.eyebrow ? `<p class="eyebrow">${escapeHtml(slide.eyebrow)}</p>` : ""}
    ${slide.title ? `<h2 class="slide-title">${escapeHtml(slide.title)}</h2>` : ""}
    ${slide.subtitle ? `<p class="slide-subtitle">${escapeHtml(slide.subtitle)}</p>` : ""}
  </header>`;
}

function citationText(ids: string[] = [], refs: Map<string, ReferenceItem>): string {
  return ids.map((id) => refs.get(id)).filter((ref): ref is ReferenceItem => Boolean(ref)).map(formatShortReference).join(" · ");
}

function footer(slide: SlideSpec, index: number, total: number, refs: Map<string, ReferenceItem>): string {
  return `<footer class="slide-footer">
    <span class="section-name">${escapeHtml(slide.section ?? "")}</span>
    <span class="slide-citations">${escapeHtml(citationText(slide.citation_ids, refs))}</span>
    ${slide.footer ? `<span>${escapeHtml(slide.footer)}</span>` : ""}
    <span class="slide-number">${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}</span>
  </footer>`;
}

function titleSlide(deck: DeckSpec, slide: SlideSpec): string {
  const meta = slide.meta ?? [deck.deck.event, deck.deck.date].filter((item): item is string => Boolean(item));
  return `<div class="slide-content">
    <p class="eyebrow">${escapeHtml(deck.deck.preset)}</p>
    <h1 class="title-display">${escapeHtml(slide.title ?? deck.deck.title)}</h1>
    ${underline}
    ${slide.subtitle || deck.deck.subtitle ? `<p class="slide-subtitle">${escapeHtml(slide.subtitle ?? deck.deck.subtitle)}</p>` : ""}
    <div class="title-meta">${meta.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
    <p class="author-line">${escapeHtml(deck.deck.author.name)}${deck.deck.author.affiliation ? `<small>${escapeHtml(deck.deck.author.affiliation)}</small>` : ""}</p>
  </div><span class="psi-mark">ψ</span>`;
}

function agendaSlide(slide: SlideSpec): string {
  return `${header(slide)}<ol class="agenda-list">${(slide.bullets ?? []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>`;
}

function contentSlide(slide: SlideSpec): string {
  const body = slide.body ? `<p class="body-copy">${escapeHtml(slide.body)}</p>` : "";
  const panelHtml = slide.panels?.length ? `<div class="panels" style="--panel-count:${slide.panels.length}">${slide.panels.map((panel) => `<article class="panel"><h3>${escapeHtml(panel.heading)}</h3>${panel.body ? `<p>${escapeHtml(panel.body)}</p>` : ""}${panel.bullets ? `<ul>${panel.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}</article>`).join("")}</div>` : "";
  return `${header(slide)}${slide.claim ? `<p class="claim">${escapeHtml(slide.claim)}</p>` : ""}${body}${slide.bullets ? bullets(slide.bullets, slide.build) : ""}${panelHtml}`;
}

function twoColumnSlide(slide: SlideSpec): string {
  const panels = slide.panels ?? [];
  return `${header(slide)}<div class="two-column">${[0, 1].map((index) => {
    const panel = panels[index];
    if (!panel) return `<div></div>`;
    return `<div><h3 class="claim">${escapeHtml(panel.heading)}</h3>${panel.body ? `<p class="body-copy">${escapeHtml(panel.body)}</p>` : ""}${panel.bullets ? bullets(panel.bullets, slide.build) : ""}</div>`;
  }).join("")}</div>`;
}

function literatureSlide(slide: SlideSpec): string {
  return `${header(slide)}<div class="literature-map">${(slide.literature ?? []).map((cluster) => `<article class="literature-cluster${cluster.gap ? " gap" : ""}">${cluster.gap ? `<span class="gap-label">RESEARCH GAP</span>` : ""}<h3>${escapeHtml(cluster.cluster)}</h3><ul>${(cluster.works ?? []).map((work) => `<li>${escapeHtml(work)}</li>`).join("") || `<li>尚缺整合證據</li>`}</ul></article>`).join("")}</div>`;
}

function methodSlide(slide: SlideSpec): string {
  const d = slide.design ?? {};
  const row = (label: string, value: string, wide = false) => `<div class="design-row${wide ? " wide" : ""}"><div class="design-label">${label}</div><div class="design-value">${value}</div></div>`;
  return `${header(slide)}<div class="research-design">
    ${d.approach ? row("APPROACH", escapeHtml(d.approach)) : ""}
    ${d.participants ? row("SAMPLE", escapeHtml(d.participants)) : ""}
    ${d.instruments ? row("INSTRUMENTS", `<ul>${d.instruments.map((v) => `<li>${escapeHtml(v)}</li>`).join("")}</ul>`) : ""}
    ${d.analysis ? row("ANALYSIS", escapeHtml(d.analysis)) : ""}
    ${d.procedure ? row("PROCEDURE", `<ol>${d.procedure.map((v) => `<li>${escapeHtml(v)}</li>`).join("")}</ol>`, true) : ""}
  </div>`;
}

function tableSlide(slide: SlideSpec): string {
  const table = slide.table;
  if (!table) return contentSlide(slide);
  const highlights = new Set(table.highlight ?? []);
  const tableHtml = `<div class="stats-wrap"><table class="stats-table">${table.caption ? `<caption>${escapeHtml(table.caption)}</caption>` : ""}<thead><tr>${table.columns.map((col) => `<th>${escapeHtml(col)}</th>`).join("")}</tr></thead><tbody>${table.rows.map((row, index) => `<tr class="${highlights.has(index) ? "highlight" : ""}">${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>${table.note ? `<p class="table-note">${escapeHtml(table.note)}</p>` : ""}</div>`;
  return `${header(slide)}${slide.claim ? `<p class="claim">${escapeHtml(slide.claim)}</p>` : ""}${slide.hero_stat ? `<div class="hero-table-layout">${heroStat(slide)}${tableHtml}</div>` : tableHtml}`;
}

function codingSlide(slide: SlideSpec): string {
  return `${header(slide)}<div class="themes-list">${(slide.themes ?? []).map((theme) => `<article class="theme-row"><h3>${escapeHtml(theme.theme)}</h3><span class="count">${escapeHtml(theme.code_count ?? "")}</span><span class="example">${escapeHtml(theme.example ?? "")}</span><span class="participants">${escapeHtml(theme.participants ?? "")}</span></article>`).join("")}</div>`;
}

function quoteSlide(slide: SlideSpec): string {
  const quote = slide.quote;
  if (!quote) return contentSlide(slide);
  return `${header(slide)}<div class="quote-wrap"><div class="quote-mark">“</div><blockquote class="quote-text">${escapeHtml(quote.text)}</blockquote><p class="quote-attribution">${escapeHtml(quote.attribution)}${quote.context ? `<span class="quote-context">${escapeHtml(quote.context)}</span>` : ""}</p></div>`;
}

function evidenceSlide(slide: SlideSpec): string {
  const cer = slide.cer;
  if (!cer) return contentSlide(slide);
  return `${header(slide)}<div class="cer-chain"><article class="cer-block"><h3>主張 CLAIM</h3><p>${escapeHtml(cer.claim)}</p></article>${cerArrow}<article class="cer-block"><h3>證據 EVIDENCE</h3><ul>${cer.evidence.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></article>${cerArrow}<article class="cer-block"><h3>推理 REASONING</h3><p>${escapeHtml(cer.reasoning)}</p></article></div>`;
}

function frameworkSlide(slide: SlideSpec): string {
  const framework = slide.framework;
  if (!framework) return contentSlide(slide);
  const markerId = `framework-arrow-${slide.id}`;
  return `${header(slide)}<div class="framework" data-edges="${escapeHtml(JSON.stringify(framework.edges ?? []))}" data-marker="${markerId}"><svg class="framework-lines" aria-hidden="true"><defs><marker id="${markerId}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z"/></marker></defs></svg><div class="framework-nodes">${framework.nodes.map((node) => `<div class="framework-node" data-node-id="${escapeHtml(node.id)}" data-role="${escapeHtml(node.role)}">${escapeHtml(node.label)}${node.role ? `<span class="framework-role">${escapeHtml(node.role.toUpperCase())}</span>` : ""}</div>`).join("")}</div></div>`;
}

function timelineSlide(slide: SlideSpec): string {
  const steps = slide.steps ?? [];
  return `${header(slide)}<div class="timeline" style="--step-count:${Math.max(steps.length, 1)}">${steps.map((step, index) => `<article class="step"><span class="step-marker">${escapeHtml(step.marker ?? String(index + 1).padStart(2, "0"))}</span><h3>${escapeHtml(step.label)}</h3>${step.detail ? `<p>${escapeHtml(step.detail)}</p>` : ""}</article>`).join("")}</div>`;
}

function bigNumberSlide(slide: SlideSpec): string {
  if (slide.hero_stat) return `${header(slide)}<div class="hero-stat-solo">${heroStat(slide)}${slide.claim ? `<p>${escapeHtml(slide.claim)}</p>` : ""}</div>`;
  const stats = slide.stats ?? [];
  return `${header(slide)}<div class="metric-row" style="--metric-count:${Math.max(stats.length, 1)}">${stats.map((stat) => `<article class="metric"><strong>${escapeHtml(stat.value)}</strong><h3>${escapeHtml(stat.label)}</h3>${stat.note ? `<p>${escapeHtml(stat.note)}</p>` : ""}</article>`).join("")}</div>`;
}

function summarySlide(slide: SlideSpec): string {
  return `${header(slide)}<div class="summary-editorial"><div class="summary-kicker">SO WHAT?</div>${slide.claim ? `<p class="claim">${escapeHtml(slide.claim)}</p>` : ""}${slide.bullets ? bullets(slide.bullets, slide.build) : ""}</div>`;
}

function figureSlide(slide: SlideSpec): string {
  const figure = slide.figure;
  if (!figure) return contentSlide(slide);
  return `${header(slide)}<div class="figure-layout"><figure class="figure-frame ${escapeHtml(figure.crop ?? "contain")}"><img src="${escapeHtml(figure.src)}" alt="${escapeHtml(figure.alt)}">${figure.caption || figure.source ? `<figcaption class="figure-caption">${escapeHtml(figure.caption ?? "")} ${escapeHtml(figure.source)}</figcaption>` : ""}</figure><div class="figure-insight"><p>${escapeHtml(slide.claim ?? figure.alt)}</p></div></div>`;
}

function equationSlide(slide: SlideSpec): string {
  const equation = slide.equation;
  if (!equation) return contentSlide(slide);
  let formula: string;
  try { formula = katex.renderToString(equation.latex, { displayMode: true, throwOnError: false }); }
  catch { formula = `<code>${escapeHtml(equation.latex)}</code>`; }
  const longClass = equation.latex.length > 90 ? " long" : "";
  const variables = (equation.variables ?? []).map((variable) => {
    let symbol: string;
    try { symbol = katex.renderToString(variable.symbol, { displayMode: false, throwOnError: false }); }
    catch { symbol = `<code>${escapeHtml(variable.symbol)}</code>`; }
    return `<div class="variable-row"><span class="symbol">${symbol}</span><span>${escapeHtml(variable.meaning)}${variable.unit ? `（${escapeHtml(variable.unit)}）` : ""}</span></div>`;
  }).join("");
  return `${header(slide)}<div class="equation-wrap"><div class="equation-display${longClass}">${formula}</div><div class="variable-list">${variables}</div></div>`;
}

function referencesSlide(slide: SlideSpec, references: ReferenceItem[]): string {
  return `${header(slide)}<ol class="references-list">${references.map((ref) => `<li>${escapeHtml(formatFullReference(ref))}</li>`).join("")}</ol>`;
}

function mainContent(deck: DeckSpec, slide: SlideSpec, references: ReferenceItem[]): string {
  switch (slide.type) {
    case "title": return titleSlide(deck, slide);
    case "section": return `<div class="slide-content"><span class="section-index">${escapeHtml(slide.eyebrow ?? slide.section ?? "SECTION")}</span><h2 class="section-title">${escapeHtml(slide.title)}</h2>${underline}</div>`;
    case "agenda": return agendaSlide(slide);
    case "statement": return `<div class="slide-content">${slide.eyebrow ? `<p class="eyebrow">${escapeHtml(slide.eyebrow)}</p>` : ""}<p class="claim">${escapeHtml(slide.claim)}</p>${slide.body ? `<p class="body-copy">${escapeHtml(slide.body)}</p>` : ""}</div>`;
    case "two-column":
    case "comparison": return twoColumnSlide(slide);
    case "literature-map": return literatureSlide(slide);
    case "method-design": return methodSlide(slide);
    case "stats-table": return tableSlide(slide);
    case "coding-themes": return codingSlide(slide);
    case "quote": return quoteSlide(slide);
    case "evidence-chain": return evidenceSlide(slide);
    case "theory-framework": return frameworkSlide(slide);
    case "timeline-process": return timelineSlide(slide);
    case "big-number": return bigNumberSlide(slide);
    case "figure-insight": return figureSlide(slide);
    case "equation-focus": return equationSlide(slide);
    case "references": return referencesSlide(slide, references);
    case "summary": return summarySlide(slide);
    case "qa-closing": return `<div class="slide-content"><div class="qa-center"><p class="eyebrow">OPEN FOR DISCUSSION</p><h2>${escapeHtml(slide.title ?? "敬請指教")}</h2>${slide.body ? `<p>${escapeHtml(slide.body)}</p>` : ""}${slide.footer ? `<small>${escapeHtml(slide.footer)}</small>` : ""}</div></div>`;
    case "data-result": return slide.table ? tableSlide(slide) : slide.figure ? figureSlide(slide) : contentSlide(slide);
    default: return contentSlide(slide);
  }
}

function layoutClass(type: string): string {
  if (type === "title") return "layout-title";
  if (type === "section") return "layout-section";
  if (type === "statement") return "layout-statement";
  return `layout-${type}`;
}

export function renderDeckHtml(deck: DeckSpec, bibliography: ReferenceFile): string {
  const refs = new Map(bibliography.references.map((ref) => [ref.id, ref]));
  const sections = deck.slides.map((slide, index) => {
    const raw = mainContent(deck, slide, bibliography.references);
    const isFullBleed = ["title", "section", "statement", "qa-closing"].includes(slide.type);
    const content = isFullBleed ? raw : `<div class="slide-content"><main class="slide-main">${raw}</main>${footer(slide, index, deck.slides.length, refs)}</div>`;
    const notes = slide.notes ? `<aside class="notes">${escapeHtml(slide.notes)}</aside>` : "";
    const art = artMarkup(slide);
    const artClass = slide.art ? ` has-art art-${slide.art.placement ?? "right"}` : editorialTypes.has(slide.type) ? " has-art-fallback" : "";
    return `<section class="deck-slide ${layoutClass(slide.type)}${artClass}" data-slide-id="${escapeHtml(slide.id)}">${art}${content}${notes}</section>`;
  }).join("\n");

  return `<!doctype html>
<html lang="${escapeHtml(deck.deck.language)}" data-theme="${escapeHtml(deck.deck.theme)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(deck.deck.title)}</title>
  <link rel="stylesheet" href="vendor/reveal/reveal.css">
  <link rel="stylesheet" href="theme/tokens.css">
  <link rel="stylesheet" href="theme/deck.css">
</head>
<body>
  <div class="reveal"><div class="slides">${sections}</div></div>
  <script type="module">
    import Reveal from './vendor/reveal/reveal.esm.js';
    import RevealNotes from './vendor/reveal/plugin/notes/notes.esm.js';
    const params = new URLSearchParams(location.search);
    const requestedTheme = params.get('theme');
    if (requestedTheme) document.documentElement.dataset.theme = requestedTheme;
    window.Reveal = new Reveal({
      width: 1600,
      height: 900,
      margin: 0,
      hash: true,
      history: true,
      center: false,
      controls: true,
      progress: true,
      transition: 'fade',
      backgroundTransition: 'none',
      pdfSeparateFragments: false,
      pdfMaxPagesPerSlide: 1,
      view: params.get('view') === 'scroll' ? 'scroll' : undefined,
      plugins: [RevealNotes]
    });
    await window.Reveal.initialize();
    await document.fonts.ready;
    const drawFrameworkEdges = () => {
      document.querySelectorAll('.framework').forEach((framework) => {
        const svg = framework.querySelector('.framework-lines');
        if (!svg) return;
        svg.querySelectorAll('.framework-edge,.framework-edge-label').forEach((node) => node.remove());
        const bounds = framework.getBoundingClientRect();
        svg.setAttribute('viewBox', '0 0 ' + bounds.width + ' ' + bounds.height);
        const nodes = new Map(Array.from(framework.querySelectorAll('[data-node-id]')).map((node, index) => [node.dataset.nodeId, { node, index, rect: node.getBoundingClientRect() }]));
        const edges = JSON.parse(framework.dataset.edges || '[]');
        const marker = framework.dataset.marker;
        edges.forEach((edge) => {
          const from = nodes.get(edge.from);
          const to = nodes.get(edge.to);
          if (!from || !to) return;
          const fr = from.rect;
          const tr = to.rect;
          const sameRow = Math.abs((fr.top + fr.height / 2) - (tr.top + tr.height / 2)) < 24;
          const skipsNode = sameRow && Math.abs(to.index - from.index) > 1;
          let d;
          let labelX = 0;
          let labelY = 0;
          if (skipsNode) {
            const x1 = fr.left - bounds.left + fr.width / 2;
            const x2 = tr.left - bounds.left + tr.width / 2;
            const y1 = fr.top - bounds.top;
            const y2 = tr.top - bounds.top;
            const routeY = Math.max(8, Math.min(y1, y2) - 28);
            d = 'M ' + x1 + ' ' + y1 + ' L ' + x1 + ' ' + routeY + ' L ' + x2 + ' ' + routeY + ' L ' + x2 + ' ' + y2;
            labelX = (x1 + x2) / 2;
            labelY = routeY - 7;
          } else if (sameRow) {
            const leftToRight = fr.left < tr.left;
            const x1 = (leftToRight ? fr.right : fr.left) - bounds.left;
            const x2 = (leftToRight ? tr.left : tr.right) - bounds.left;
            const y = fr.top - bounds.top + fr.height / 2;
            d = 'M ' + x1 + ' ' + y + ' L ' + x2 + ' ' + y;
            labelX = (x1 + x2) / 2;
            labelY = y - 10;
          } else {
            const x1 = fr.left - bounds.left + fr.width / 2;
            const y1 = fr.bottom - bounds.top;
            const x2 = tr.left - bounds.left + tr.width / 2;
            const y2 = tr.top - bounds.top;
            d = 'M ' + x1 + ' ' + y1 + ' C ' + x1 + ' ' + ((y1+y2)/2) + ', ' + x2 + ' ' + ((y1+y2)/2) + ', ' + x2 + ' ' + y2;
            labelX = (x1 + x2) / 2;
            labelY = (y1 + y2) / 2 - 8;
          }
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('class', 'framework-edge');
          path.setAttribute('d', d);
          path.setAttribute('marker-end', 'url(#' + marker + ')');
          if (edge.style === 'dashed') path.setAttribute('stroke-dasharray', '12 9');
          svg.append(path);
          if (edge.label) {
            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('class', 'framework-edge-label');
            label.setAttribute('x', String(labelX));
            label.setAttribute('y', String(labelY));
            label.setAttribute('text-anchor', 'middle');
            label.textContent = edge.label;
            svg.append(label);
          }
        });
      });
    };
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    drawFrameworkEdges();
    window.Reveal.on('slidechanged', () => requestAnimationFrame(() => requestAnimationFrame(drawFrameworkEdges)));
    addEventListener('resize', drawFrameworkEdges, { passive: true });
    document.documentElement.dataset.renderComplete = 'true';
  </script>
</body>
</html>`;
}
