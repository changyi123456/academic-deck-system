import { loadDeck, loadReferences, loadTokens } from "../src/lib/load.js";
import { outputDir, resolveDeckDir } from "../src/lib/paths.js";
import { renderPptx } from "../src/render/pptx.js";

const deckDir = resolveDeckDir(process.argv[2]);
const deck = await loadDeck(deckDir);
const references = await loadReferences(deckDir, deck.deck.bibliography);
const tokens = await loadTokens();
const output = await renderPptx(deck, references, tokens, deckDir, outputDir(deck.deck.id));
console.log(`✓ ${output}`);
