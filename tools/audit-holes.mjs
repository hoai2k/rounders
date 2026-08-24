// Rounders — Breakthrough passage audit, in a LIVE match.
//
// A hole bored clean through a slab is a doorway: a fighter should be able to
// walk through a tunnel in a wall and drop down a shaft in a floor, while a
// half-finished niche stays solid and the material either side of the opening
// still holds you up. This walks every arena that has the geometry for it and
// checks all four.
//
//   node tools/audit-holes.mjs            report only
//   node tools/audit-holes.mjs --json     machine-readable
//
// Needs the static server up (npm start).
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";

const json = process.argv.includes("--json");
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

const report = await page.evaluate(async () => {
  const d = window.ROUNDERS.debug;
  const LEVELS = window.ROUNDERS.LEVELS;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const findings = [];
  const checked = [];

  for (let li = 0; li < LEVELS.length; li += 1) {
    d.settings.levelChoice = li;
    d.startMatch();
    // let the round intro finish placing everyone: a reset mid-test would move
    // the fighter out from under the check
    await sleep(2600);
    // hand-drive fighter 0 and take every AI off the field, so what moves a
    // body in this audit is the physics and nothing else
    const [A] = d.players();
    if (!A) continue;
    for (const p of d.players()) p.bot = false;
    const r = A.stats.radius;
    const grav = d.world.gravity;
    const name = LEVELS[li].name;
    const note = (test, detail) => findings.push({ level: name, test, detail });
    // Pick the slab to bore from the level DATA, not the live list: what a
    // test needs is a static wall or deck with clear air around it, and a
    // mover or a hung slab wanders into the answer.
    const lv = LEVELS[li];
    // Arenas that move bodies for reasons of their own — teleporters, water you
    // float in — cannot tell a physics answer from a plumbing one, so they sit
    // this audit out.
    if ((lv.teleporters || []).length || lv.tide || (lv.hazards || []).some(h => h.kind === "water")) {
      checked.push(`${name}: skipped (teleporters or water)`);
      continue;
    }
    const solids = lv.platforms.filter(p => !p.phase && !p.breakable);
    // everything that could wander into a test: movers over their whole travel,
    // hung slabs over their drop, blinking and breakable decks, hazards
    const clutter = [
      ...lv.platforms,
      ...(lv.movers || []).map(m => ({
        x: Math.min(m.x, m.x + (m.dx || 0)), y: Math.min(m.y, m.y + (m.dy || 0)),
        w: m.w + Math.abs(m.dx || 0), h: m.h + Math.abs(m.dy || 0)
      })),
      ...(lv.hung || []).map(h => ({ x: h.x, y: h.y, w: h.w, h: h.h + 500 })),
      ...(lv.hazards || [])
    ];
    // is the box clear of everything except the slab under test?
    const lonely = (slab, x, y, w, h) => !clutter.some(c =>
      c !== slab && c.x < x + w && c.x + c.w > x && c.y < y + h && c.y + c.h > y);
    // hold a heading for a while, with gravity off, so the run is about the
    // geometry and not about a jump arc
    const drive = async (frames, vx) => { for (let f = 0; f < frames; f++) { A.vx = vx; A.vy = 0; await sleep(16); } };

    // ---------------------------------------------------------------- walls
    const wall = solids.filter(p => p.h > p.w * 1.5 && p.h > 170 && p.w > 70)
      // a clear run-up and landing either side, and nothing to stand on but the
      // wall itself once you are in the tunnel
      .filter(p => lonely(p, p.x - 220, p.y + p.h / 2 - 40, 220, 200) &&
                   lonely(p, p.x + p.w, p.y + p.h / 2 - 40, 220, 200))
      .sort((a, b) => b.h - a.h)[0];
    if (wall) {
      checked.push(`${name}: wall ${wall.w}×${wall.h}`);
      const cy = wall.y + wall.h / 2;
      d.world.gravity = 0;

      // one bite is a niche, not a door
      d.punch(wall.x + 6, cy, 80);
      await sleep(60);
      A.x = wall.x - r - 40; A.y = cy; A.vy = 0;
      await drive(70, 420);
      if (A.x > wall.x + wall.w) note("niche must not be passable", `walked to x=${Math.round(A.x)} past wall at ${wall.x}..${wall.x + wall.w}`);

      // keep biting until it is holed clean through
      for (let x = wall.x + 6; x <= wall.x + wall.w; x += 60) d.punch(x, cy, 80);
      d.punch(wall.x + wall.w - 6, cy, 80);
      await sleep(60);
      const rec = d.holes().find(h => h.box.x === wall.x && h.box.y === wall.y);
      const gap = rec && rec.holes.find((h, i) => rec.spans[i]);
      if (!gap) note("wall would not hole through", `${wall.w}px thick, ${rec ? rec.holes.length : 0} bites`);
      else {
        A.x = wall.x - r - 40; A.y = cy; A.vy = 0;
        await drive(100, 420);
        if (A.x < wall.x + wall.w + r) note("tunnel must be passable", `stopped at x=${Math.round(A.x)}, wall ends at ${wall.x + wall.w}`);

        // and the material below the tunnel is still floor
        d.world.gravity = grav;
        A.x = wall.x + wall.w / 2; A.y = cy; A.vx = 0; A.vy = 0;
        for (let f = 0; f < 40; f++) { A.vx = 0; await sleep(16); }
        const lip = wall.y + gap.ly + gap.h;
        if (!A.grounded || Math.abs(A.y + r - lip) > 8) note("tunnel floor must hold", `feet at ${Math.round(A.y + r)}, lip at ${Math.round(lip)}, grounded=${A.grounded}`);
      }
      d.world.gravity = grav;
    }

    // --------------------------------------------------------------- floors
    const floor = solids.filter(p => p.w > p.h * 4 && p.h < 60 && p.w > 300 && p.y < d.world.height - 200)
      // clear air above to be dropped from, and below to fall into
      .filter(p => lonely(p, p.x, p.y + p.h + 1, p.w, 160) && lonely(p, p.x, p.y - 80, p.w, 79))
      .sort((a, b) => b.w - a.w)[0];
    if (floor) {
      checked.push(`${name}: floor ${floor.w}×${floor.h}`);
      const cx = floor.x + floor.w - 90;
      d.punch(cx, floor.y + floor.h / 2, 90);
      await sleep(60);
      A.x = cx; A.y = floor.y - r - 30; A.vx = 0; A.vy = 0;
      for (let f = 0; f < 40; f++) { A.vx = 0; await sleep(16); }
      if (A.y < floor.y + floor.h) note("shaft must drop you", `held at y=${Math.round(A.y)}, floor ends at ${floor.y + floor.h}`);

      // well clear of both the shaft and the deck's own edge, where a fighter
      // slides off whether or not anything has been bored
      A.x = floor.x + 90; A.y = floor.y - r - 30; A.vx = 0; A.vy = 0;
      for (let f = 0; f < 40; f++) { A.vx = 0; await sleep(16); }
      if (!A.grounded || Math.abs(A.y + r - floor.y) > 6) note("deck beside a shaft must hold", `feet at ${Math.round(A.y + r)}, deck at ${floor.y}, grounded=${A.grounded}, vy=${Math.round(A.vy)}, g=${d.world.gravity}, hover=${A.hovering}, x=${Math.round(A.x)}`);
    }
  }
  d.settings.levelChoice = -1;
  return { findings, checked };
});

await browser.close();

if (json) console.log(JSON.stringify({ ...report, pageErrors: errs }, null, 2));
else {
  console.log(`checked ${report.checked.length} slabs across the arena list`);
  if (!report.findings.length) console.log("no findings");
  for (const f of report.findings) console.log(`  ${f.level}: ${f.test} — ${f.detail}`);
  if (errs.length) { console.log("\npage errors:"); for (const e of errs) console.log("  " + e); }
  else console.log("\nno page errors");
}
process.exit(report.findings.length || errs.length ? 1 : 0);
