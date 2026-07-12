import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function resolveDeckDir(input?: string): string {
  if (!input) throw new Error("缺少 deck 路徑，例如：npm run render -- examples/seminar");
  return path.resolve(repoRoot, input);
}

export function outputDir(deckId: string): string {
  return path.join(repoRoot, "dist", deckId);
}
