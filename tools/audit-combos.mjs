// Rounders — random card-combination audit, in a LIVE match.
//
// Builds random hands, grants them through the real draft path, sets both
// fighters to bots so the game's own input drives them, fires the Mythics on a
// timer, and watches for the things that actually break: page errors, NaN
// stats or positions, runaway entity counts, frame stutter and absurd damage.
//
//   node tools/audit-combos.mjs [builds] [cardsPerBuild]     default 120 6
//
// Needs the static server up (npm start).
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";

const ROUNDS = Number(process.argv[2] || 120);
const CARDS_PER_BUILD = Number(process.argv[3] || 6);

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const errs = [];
page.on("pageerror", e => errs.push("pageerror: " + e.message));
page.on("console", m => { if (m.type() === "error" && !/404|Failed to load resource/.test(m.text())) errs.push("console: " + m.text()); });

await page.goto("http://127.0.0.1:4173/");
await page.waitForTimeout(1400);
await page.keyboard.press("Enter"); await page.waitForTimeout(600);
await page.keyboard.press("a"); await page.waitForTimeout(200);
await page.keyboard.press("ArrowLeft"); await page.waitForTimeout(250);
await page.evaluate(() => document.getElementById("startBtn")?.click());
await page.waitForTimeout(1500);

const report = await page.evaluate(async ({ ROUNDS, CARDS_PER_BUILD }) => {
  const d = window.ROUNDERS.debug;
  const ALL = window.ROUNDERS.CARDS;
  const [A, B] = d.players();
  const findings = [];
  const note = (kind, build, detail) => findings.push({ kind, build: build.join("+"), detail });
  const seenPeak = { bullets: 0, particles: 0, fields: 0 };
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // a deterministic-ish shuffle so a failing seed can be re-run
  let seed = 1234567;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const pick = n => {
    const out = [];
    const pool = ALL.slice();
    while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
    return out;
  };

  const NUMERIC = ["maxHp","damage","speed","jump","fireDelay","reload","maxAmmo","bulletSpeed",
                   "radius","pellets","blockCooldown","bulletSize","accel","airAccel"];

  for (let round = 0; round < ROUNDS; round += 1) {
    const build = pick(CARDS_PER_BUILD);
    const ids = build.map(c => c.id);
    // fresh fighters each time, through the game's own reset
    d.stripCards(0); d.stripCards(1);
    // grant through the real path so per-round counters sync too
    for (const c of build) d.grant(0, c.id);
    for (const c of pick(CARDS_PER_BUILD)) d.grant(1, c.id);
    A.hp = A.stats.maxHp; B.hp = B.stats.maxHp;
    A.x = 300; B.x = 700; A.y = B.y = 600; A.spawnGrace = 0; B.spawnGrace = 0;

    // sanity on the resulting stat block
    for (const k of NUMERIC) {
      const v = A.stats[k];
      if (!Number.isFinite(v)) { note("non-finite stat", ids, `${k} = ${v}`); continue; }
      if (v < 0) note("negative stat", ids, `${k} = ${v.toFixed(3)}`);
    }
    if (A.stats.maxHp > 3000) note("runaway health", ids, `maxHp ${Math.round(A.stats.maxHp)}`);
    if (A.stats.damage > 1200) note("runaway damage", ids, `damage ${Math.round(A.stats.damage)}`);
    if (A.stats.fireDelay < 0.01) note("fire delay ~0", ids, `fireDelay ${A.stats.fireDelay.toFixed(4)}`);
    if (A.stats.reload < 0.05) note("reload ~0", ids, `reload ${A.stats.reload.toFixed(4)}`);
    if (A.stats.pellets > 24) note("pellet storm", ids, `pellets ${A.stats.pellets}`);
    if (A.stats.radius < 6 || A.stats.radius > 90) note("odd body size", ids, `radius ${A.stats.radius.toFixed(1)}`);
    if (A.stats.speed > 3000) note("runaway speed", ids, `speed ${Math.round(A.stats.speed)}`);
    // burst damage a full magazine delivers, vs what it takes to kill
    const volley = A.stats.damage * A.stats.pellets;
    const clip = volley * A.stats.maxAmmo;
    const dps = volley / Math.max(A.stats.fireDelay, 0.01);
    if (volley >= B.stats.maxHp) note("one-shot volley", ids, `${Math.round(volley)} dmg per trigger pull vs ${Math.round(B.stats.maxHp)} HP`);
    else if (clip >= B.stats.maxHp * 4) note("clip overkill", ids, `one clip = ${Math.round(clip)} dmg vs ${Math.round(B.stats.maxHp)} HP`);
    if (dps > 2500) note("extreme dps", ids, `${Math.round(dps)} dmg/s sustained`);

    // let them actually fight — as BOTS, so the game's own input path drives
    // them; assigning to p.input is pointless, applyInputs rebuilds it each frame
    A.bot = true; B.bot = true;
    const t0 = performance.now();
    let worstDt = 0, dmgDealt = 0, prevHpB = B.hp;
    for (let step = 0; step < 30; step += 1) {
      if (step % 9 === 4) { d.fireActive(0); d.fireActive(1); }
      if (!A.alive) { A.alive = true; A.hp = A.stats.maxHp; }
      if (!B.alive) { B.alive = true; B.hp = B.stats.maxHp; }
      await sleep(16);
      // the game's OWN frame delta — wall time around an await says more about
      // the harness than the engine
      worstDt = Math.max(worstDt, d.world.dt || 0);
      const nb = d.bullets().length, np = d.particles().total, nf = d.fields().length;
      dmgDealt += Math.max(0, prevHpB - B.hp); prevHpB = B.hp;
      seenPeak.bullets = Math.max(seenPeak.bullets, nb);
      seenPeak.particles = Math.max(seenPeak.particles, np);
      seenPeak.fields = Math.max(seenPeak.fields, nf);
      if (nb > 400) { note("bullet flood", ids, `${nb} rounds in the air`); break; }
      if (np > 4000) { note("particle flood", ids, `${np} particles`); break; }
      if (nf > 60) { note("field pile-up", ids, `${nf} fields`); break; }
      if (!Number.isFinite(A.x) || !Number.isFinite(A.y)) { note("NaN position", ids, `x=${A.x} y=${A.y}`); break; }
      if (!Number.isFinite(A.hp)) { note("NaN health", ids, `hp=${A.hp}`); break; }
    }
    // 1/45s is the engine's own step clamp; well past that is a real stutter
    if (worstDt > 0.12) note("frame stutter", ids, `worst frame ${Math.round(worstDt * 1000)}ms`);
    // NOTE: no "dealt no damage" check here. The fight window is well under a
    // second, which is not long enough for bots to close and connect, so it
    // fired on most builds and meant nothing. Damage balance is what
    // tools/audit-stats.mjs is for.
  }
  return { findings, seenPeak };
}, { ROUNDS, CARDS_PER_BUILD });

console.log(`ran ${ROUNDS} builds of ${CARDS_PER_BUILD} cards`);
console.log("peaks:", JSON.stringify(report.seenPeak));
const byKind = {};
for (const f of report.findings) (byKind[f.kind] ||= []).push(f);
if (!report.findings.length) console.log("no findings");
for (const [kind, list] of Object.entries(byKind)) {
  console.log(`\n== ${kind} (${list.length})`);
  for (const f of list.slice(0, 6)) console.log(`   ${f.detail}\n      ${f.build}`);
  if (list.length > 6) console.log(`   ...and ${list.length - 6} more`);
}
console.log(errs.length ? "\nPAGE ERRORS (" + errs.length + "):\n" + [...new Set(errs)].slice(0, 10).join("\n") : "\nno page errors");
await browser.close();
