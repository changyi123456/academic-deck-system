import type { ReferenceItem } from "../types.js";

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function formatShortReference(ref: ReferenceItem): string {
  const first = ref.authors[0] ?? "Unknown";
  const family = first.includes(",") ? first.split(",")[0] : first.split(" ").at(-1);
  return `${family}${ref.authors.length > 1 ? " et al." : ""}, ${ref.year}`;
}

export function formatFullReference(ref: ReferenceItem): string {
  const parts = [
    `${ref.authors.join(", ")} (${ref.year}). ${ref.title}.`,
    ref.container,
    ref.volume,
    ref.pages,
    ref.doi ? `https://doi.org/${ref.doi}` : ref.url,
  ].filter(Boolean);
  return parts.join(" ");
}

export function countCjkAware(value = ""): number {
  return Array.from(value.trim()).filter((char) => !/\s/.test(char)).length;
}
