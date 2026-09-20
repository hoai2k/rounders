// Rounders — regenerate CARDS.md from js/cards.js.
//
// The card set is the game's design document, and it already lives in code:
// every card carries its own name, tagline, plain-English description, effect
// list and tags. This writes that out as a readable reference so the whole set
// can be read (or linked, or diffed) without opening the engine — and because
// it is GENERATED, it cannot drift from what the game actually does.
//
//   node tools/cards-doc.mjs            write CARDS.md
//   node tools/cards-doc.mjs --check    fail if CARDS.md is out of date (CI)
//
// No browser needed: cards.js is plain data behind an IIFE.
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");

// the two files a card needs to exist: the control map (for its button badge)
// and the set itself
globalThis.window = {};
globalThis.Image = class { set src(v) {} set onload(v) {} set onerror(v) {} };
for (const f of ["js/gameplay.js", "js/cards.js"]) {
  new Function(await readFile(join(root, f), "utf8"))();
}
const R = globalThis.window.ROUNDERS;
const { CARDS, RARITIES, RARITY_ORDER, HALF_WIN_CARD } = R;

const esc = s => String(s).replace(/\|/g, "\\|");
const list = xs => xs.map(esc).join(" · ");

// How likely each rarity is in a default draft, from its own weight
const totalWeight = RARITY_ORDER.reduce((n, r) => n + RARITIES[r].weight, 0);

const lines = [];
lines.push("# Rounders — the card set");
lines.push("");
lines.push(`Every one of the **${CARDS.length} power cards**, what it does, and what it costs you.`);
lines.push("Lose a round and you draft one; they stack, so a second copy compounds.");
lines.push("");
lines.push("> Generated from [`js/cards.js`](js/cards.js) by `npm run cards-doc` — edit the cards there, not here.");
lines.push("");
lines.push("A **button badge** in the *Asks you to* column means the card only pays off when you press");
lines.push("something; cards without one are passive and just change your numbers.");
lines.push("");
lines.push("## Rarities");
lines.push("");
lines.push("| Rarity | Cards | Draft weight | Chance per slot |");
lines.push("|---|---|---|---|");
for (const r of RARITY_ORDER) {
  const n = CARDS.filter(c => c.rarity === r).length;
  const pct = (RARITIES[r].weight / totalWeight * 100).toFixed(1);
  lines.push(`| **${RARITIES[r].name}** | ${n} | ${RARITIES[r].weight} | ${pct}% |`);
}
lines.push("");
lines.push("Draft chances are for the default pool; **Settings → Choose Cards** can level them");
lines.push("out (*Equalize*) or cut the set down to a list you build yourself.");
lines.push("");

const row = c => {
  const asks = (c.actions || []).map(a => `**${R.padBadge(a.action)}** ${a.why}`).join(", ");
  return `| **${esc(c.name)}**<br>*${esc(c.tagline)}* | ${esc(c.description)} | ` +
    `${list(c.effects)} | ${asks || "—"} | ${list(c.tags)} |`;
};

for (const r of RARITY_ORDER) {
  const group = CARDS.filter(c => c.rarity === r);
  if (!group.length) continue;
  lines.push(`## ${RARITIES[r].name} (${group.length})`);
  lines.push("");
  lines.push("| Card | What it does | Effects | Asks you to | Tags |");
  lines.push("|---|---|---|---|---|");
  for (const c of group) lines.push(row(c));
  lines.push("");
}

lines.push("## Special drafts");
lines.push("");
lines.push("Never rolled into an ordinary hand, never listed in Choose Cards:");
lines.push("");
lines.push("| Card | What it does | Effects | When |");
lines.push("|---|---|---|---|");
lines.push(`| **${esc(HALF_WIN_CARD.name)}** | ${esc(HALF_WIN_CARD.description)} | ${list(HALF_WIN_CARD.effects)} | ` +
  "Swapped into the *runner-up's* hand in a 3+ player free-for-all |");
lines.push("");
lines.push("## Where else to look");
lines.push("");
lines.push("- **In game** — *Settings → Choose Cards* shows the whole set as a grid, and every card face");
lines.push("  states its own effects.");
lines.push("- **Card workbench** — [`workbench/cards.html`](workbench/cards.html) (`npm start`, then");
lines.push("  `/workbench/cards.html`) browses every card at full size and runs a live preview of what it does.");
lines.push("- **The source** — [`js/cards.js`](js/cards.js) is the card set; [`js/gameplay.js`](js/gameplay.js)");
lines.push("  holds the baselines the cards modify.");
lines.push("");

const out = lines.join("\n");
const path = join(root, "CARDS.md");
if (check) {
  const have = await readFile(path, "utf8").catch(() => "");
  if (have !== out) {
    console.error("CARDS.md is out of date — run `npm run cards-doc`");
    process.exit(1);
  }
  console.log(`CARDS.md is up to date (${CARDS.length} cards)`);
} else {
  await writeFile(path, out);
  console.log(`CARDS.md written — ${CARDS.length} cards`);
}
