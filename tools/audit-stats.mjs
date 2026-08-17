// Rounders — stat-space sweep over thousands of random builds.
//
// No rendering, so it can afford far more builds than the live audit. Applies
// real cards to the real baseline and reports where the damage tail goes, plus
// which cards show up in the hottest 1% of builds. Duplicates are allowed,
// because that is how drafting works and the stacking rule depends on it.
//
//   node tools/audit-stats.mjs [builds] [cardsPerBuild]      default 4000 12
//
// Needs the static server up (npm start).
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
const N = Number(process.argv[2] || 4000);
const SIZE = Number(process.argv[3] || 12);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage();
page.on("pageerror", e => console.log("ERR", e.message));
await page.goto("http://127.0.0.1:4173/workbench/cards.html");
await page.waitForTimeout(1600);
const out = await page.evaluate(({ N, SIZE }) => {
  const { CARDS, CARD_SIM } = window.ROUNDERS;
  const base = CARD_SIM.baseStats();
  const worst = { volley: null, dps: null, hp: null, ehp: null };
  const blame = {};            // card -> how often it appears in a top-1% build
  const volleys = [];
  let seed = 987654321;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < N; i += 1) {
    // duplicates ALLOWED — that is how real drafts work, and the stacking rule
    // exists precisely so a second copy compounds
    const build = [];
    while (build.length < SIZE) build.push(CARDS[Math.floor(rnd() * CARDS.length)]);
    const st = CARD_SIM.baseStats();
    for (const c of build) { try { c.apply({ stats: st }); } catch (e) { return "APPLY THREW: " + c.id + " " + e.message; } }
    const volley = st.damage * st.pellets;
    const dps = volley / Math.max(st.fireDelay, 0.01);
    const ehp = st.maxHp * (1 + (st.shield || 0) / 100);
    volleys.push(volley);
    const rec = { build: build.map(c => c.id), volley: Math.round(volley), dps: Math.round(dps), hp: Math.round(st.maxHp), pellets: st.pellets, fireDelay: +st.fireDelay.toFixed(3) };
    if (!worst.volley || volley > worst.volley.volley) worst.volley = rec;
    if (!worst.dps || dps > worst.dps.dps) worst.dps = { ...rec };
    if (!worst.hp || st.maxHp > worst.hp.hp) worst.hp = { ...rec };
    if (!Number.isFinite(volley) || !Number.isFinite(st.maxHp)) return "NON-FINITE from " + build.map(c => c.id).join("+");
    if (st.fireDelay < 0.02) worst.fastest = { ...rec };
  }
  volleys.sort((a, b) => a - b);
  const q = p => Math.round(volleys[Math.floor(volleys.length * p)]);
  // which cards show up in the top 1% of volleys
  const cut = volleys[Math.floor(volleys.length * 0.99)];
  seed = 987654321;
  let hot = 0;
  for (let i = 0; i < N; i += 1) {
    const build = [];
    while (build.length < SIZE) build.push(CARDS[Math.floor(rnd() * CARDS.length)]);
    const st = CARD_SIM.baseStats();
    for (const c of build) c.apply({ stats: st });
    if (st.damage * st.pellets >= cut) { hot += 1; for (const c of build) blame[c.id] = (blame[c.id] || 0) + 1; }
  }
  const top = Object.entries(blame).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([id, n]) => `${id} ${(n / hot * 100).toFixed(0)}%`);
  return {
    baselineVolley: Math.round(base.damage * base.pellets), baselineHp: base.maxHp,
    volleyPercentiles: { p50: q(0.5), p90: q(0.9), p99: q(0.99), max: Math.round(volleys[volleys.length - 1]) },
    worst, topInHottest: top, hotCount: hot
  };
}, { N, SIZE });
console.log(JSON.stringify(out, null, 1));
await browser.close();
