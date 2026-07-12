import { spawn } from "node:child_process";
import { repoRoot } from "../src/lib/paths.js";

const deckPathArg = process.argv[2];
if (!deckPathArg) throw new Error("缺少 deck 路徑，例如：npm run export -- examples/seminar");
const deckPath: string = deckPathArg;
const tsxCli = new URL("../node_modules/tsx/dist/cli.mjs", import.meta.url).pathname;

function run(script: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [tsxCli, script, deckPath], { cwd: repoRoot, stdio: "inherit" });
    child.once("exit", (code: number | null) => code === 0 ? resolve() : reject(new Error(`${script} exited ${code}`)));
  });
}

await run("scripts/render.ts");
await run("scripts/screenshot.ts");
await run("scripts/export-pdf.ts");
await run("scripts/export-pptx.ts");
console.log("✓ export complete");
