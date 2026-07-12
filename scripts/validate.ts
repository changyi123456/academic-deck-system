import { loadDeck, loadReferences } from "../src/lib/load.js";
import { resolveDeckDir } from "../src/lib/paths.js";
import { printFindings, validateDeck } from "../src/validate.js";

const deckDir = resolveDeckDir(process.argv[2]);
const deck = await loadDeck(deckDir);
const references = await loadReferences(deckDir, deck.deck.bibliography);
const findings = await validateDeck(deckDir, deck, references);
printFindings(findings);
if (findings.some((finding) => finding.severity === "error")) process.exit(1);
