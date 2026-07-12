export type ThemeName = "board-dark" | "bright-minimal" | "print";

export interface Author {
  name: string;
  handle?: string;
  affiliation?: string;
  email?: string;
}

export interface FigureSpec {
  src: string;
  alt: string;
  caption?: string;
  source: string;
  crop?: "contain" | "cover" | "top" | "center";
}

export interface ChartSpec {
  kind: string;
  data?: string;
  spec?: string;
  alt: string;
  takeaway: string;
  unit?: string;
  sample_size?: string;
  source: string;
}

export interface TableSpec {
  caption?: string;
  columns: string[];
  rows: Array<Array<string | number>>;
  highlight?: number[];
  note?: string;
  source?: string;
}

export interface SlideSpec {
  id: string;
  type: string;
  section?: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  claim?: string;
  body?: string;
  bullets?: string[];
  panels?: Array<{ heading: string; body?: string; bullets?: string[]; figure?: FigureSpec }>;
  steps?: Array<{ label: string; detail?: string; marker?: string }>;
  figure?: FigureSpec;
  chart?: ChartSpec;
  table?: TableSpec;
  equation?: {
    latex: string;
    label?: string;
    variables?: Array<{ symbol: string; meaning: string; unit?: string }>;
  };
  quote?: { text: string; attribution: string; context?: string };
  themes?: Array<{ theme: string; code_count?: number; example?: string; participants?: string }>;
  cer?: { claim: string; evidence: string[]; reasoning: string };
  framework?: {
    nodes: Array<{ id: string; label: string; role?: string }>;
    edges?: Array<{ from: string; to: string; label?: string; style?: string }>;
    figure?: FigureSpec;
  };
  literature?: Array<{ cluster: string; works?: string[]; gap?: boolean }>;
  design?: {
    approach?: string;
    participants?: string;
    instruments?: string[];
    procedure?: string[];
    analysis?: string;
  };
  stats?: Array<{ label: string; value: string; note?: string }>;
  media?: { poster: string; src?: string; duration?: string; source: string; fallback_url?: string };
  citation_ids?: string[];
  notes?: string;
  footer?: string;
  build?: "none" | "fade" | "fragment";
  custom_html?: string;
  meta?: string[];
}

export interface DeckSpec {
  schema_version: string;
  deck: {
    id: string;
    title: string;
    subtitle?: string;
    author: Author;
    event?: string;
    date?: string;
    language: "zh-Hant" | "en";
    secondary_language?: "zh-Hant" | "en";
    preset: "seminar" | "workshop" | "defense";
    theme: ThemeName;
    aspect_ratio?: "16:9";
    outputs?: Array<"html" | "pdf" | "pptx">;
    bibliography?: string;
    template_version?: string;
  };
  slides: SlideSpec[];
}

export interface ReferenceItem {
  id: string;
  authors: string[];
  year: string | number;
  title: string;
  container?: string;
  volume?: string;
  pages?: string;
  doi?: string;
  url?: string;
  type?: string;
}

export interface ReferenceFile {
  references: ReferenceItem[];
}

export interface ThemeTokens {
  surface: Record<string, string>;
  text: Record<string, string>;
  accent: Record<string, string>;
  border: Record<string, string>;
  status: Record<string, string>;
  data: { series: string[]; axis: string; grid: string };
  texture: { grid_paper: string; chalk_noise_opacity: number };
}

export interface TokenFile {
  version: string;
  canvas: { aspect_ratio: string; logical_width: number; logical_height: number };
  themes: Record<string, ThemeTokens & { extends?: string }>;
  type: {
    family: Record<string, string>;
    scale: Record<string, number>;
    line_height: Record<string, number>;
    min_projected_body_px: number;
  };
  space: Record<string, number>;
  stroke: Record<string, number>;
  radius: Record<string, number>;
  signature: {
    psi_mark: string;
    cer_chain_labels: { claim: string; evidence: string; reasoning: string };
  };
}
