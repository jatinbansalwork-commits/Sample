/**
 * Verify klear360-typography contract on the broker sample app.
 * Run: node tests/typography-contract-verify.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const tokens = read("tokens.css");
const styles = read("styles.css");
const index = read("index.html");

assert(tokens.includes("Semantic HTML baseline — klear360-typography"), "tokens.css missing semantic HTML baseline");
assert(tokens.includes("h1 {\n  font-size: var(--kn-type-heading-h1-size);"), "tokens.css missing h1 baseline");
assert(tokens.includes(".type-display-sm"), "tokens.css missing display utilities");

const hardcodedFontSizes = styles.match(/font-size:\s*0\.[0-9]+rem/g) || [];
assert(hardcodedFontSizes.length === 0, `styles.css has hardcoded rem font sizes: ${hardcodedFontSizes.join(", ")}`);

assert(!styles.includes("--kn-font-family-body"), "styles.css still references legacy --kn-font-family-body");
assert(!styles.includes("--kn-font-size-body-sm"), "styles.css still references legacy --kn-font-size-body-sm");

assert(index.includes('class="type-display-sm type-weight-medium agentic-home__greeting"'), "index.html greeting should use type-display-sm");
assert(index.includes('class="type-heading-sm type-weight-medium agentic-thread__title"'), "index.html thread title should use type-heading-sm");
assert(index.includes('class="type-body-md agentic-home__sub"'), "index.html subline should use type-body-md");

console.log("PASS: typography contract");
