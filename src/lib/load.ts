import fs from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import type { DeckSpec, ReferenceFile, TokenFile } from "../types.js";
import { repoRoot } from "./paths.js";

async function loadYaml<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf8");
  // JSON_SCHEMA deliberately disables YAML timestamp coercion. Dates remain
  // canonical ISO strings and therefore validate consistently across agents.
  return yaml.load(raw, { schema: yaml.JSON_SCHEMA }) as T;
}

export async function loadDeck(deckDir: string): Promise<DeckSpec> {
  return loadYaml<DeckSpec>(path.join(deckDir, "deck.yaml"));
}

export async function loadReferences(deckDir: string, relativePath?: string): Promise<ReferenceFile> {
  const filePath = path.join(deckDir, relativePath ?? "references.yaml");
  try {
    return await loadYaml<ReferenceFile>(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { references: [] };
    throw error;
  }
}

export async function loadTokens(): Promise<TokenFile> {
  return JSON.parse(await fs.readFile(path.join(repoRoot, "theme", "tokens.json"), "utf8")) as TokenFile;
}

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
