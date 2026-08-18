// Rounders — arena geometry audit.
//
// Walks every level's static solids and reports gaps a fighter cannot pass but
// that LOOK passable: a platform stopping just short of a wall or another
// platform leaves a slot you try to squeeze into and bounce off. Anything from
// 12px up to a body width reads as a doorway; below that it reads as a seam.
//
// Also flags vertical squeezes — a ceiling too low to walk under — on the same
// rule, since they tease the same way.
//
//   node tools/audit-arenas.mjs            report only
//   node tools/audit-arenas.mjs --json     machine-readable
//
// No browser needed: levels.js is plain data.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
globalThis.window = {};
globalThis.Image = class { set src(v) {} set onload(v) {} set onerror(v) {} };
new Function(readFileSync(join(root, "js/levels.js"), "utf8"))();
const LEVELS = globalThis.window.ROUNDERS.LEVELS;

// A fighter is a circle: body width is the clearance any doorway must beat.
// Read it from gameplay.js so the two never drift apart.
const gp = readFileSync(join(root, "js/gameplay.js"), "utf8");
const RADIUS = Number((gp.match(/radius:\s*([\d.]+)/) || [])[1] || 27);
const BODY = RADIUS * 2;
const SEAM = 12;              // below this a gap reads as a joint, not a doorway
const json = process.argv.includes("--json");

const findings = [];
for (const lv of LEVELS) {
  const W = lv.size?.w ?? 1600;
  const H = lv.size?.h ?? 900;
  const solids = [
    ...lv.platforms.map((p, i) => ({ ...p, tag: `platforms[${i}]` })),
    ...(lv.hung || []).map((h, i) => ({ ...h, tag: `hung[${i}]` }))
  ];
  const edges = [
    { x: -1e4, y: -1e4, w: 1e4, h: H + 2e4, tag: "left screen edge" },
    { x: W, y: -1e4, w: 1e4, h: H + 2e4, tag: "right screen edge" }
  ];
  const all = [...solids, ...edges];

  for (let i = 0; i < all.length; i++) {
    for (let j = 0; j < all.length; j++) {
      if (i === j) continue;
      const A = all[i], B = all[j];
      if (A.tag.includes("edge") && B.tag.includes("edge")) continue;

      // a gap fully filled by some third solid is not a gap at all
      const occluded = (gx, gy, gw, gh) => all.some(S =>
        S !== A && S !== B && S.x <= gx && S.y <= gy &&
        S.x + S.w >= gx + gw && S.y + S.h >= gy + gh);

      // horizontal doorway: A's right face to B's left face
      const gapX = B.x - (A.x + A.w);
      const bandY = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y);
      if (gapX > 0 && gapX < BODY && bandY > 0 &&
          !occluded(A.x + A.w, Math.max(A.y, B.y), gapX, bandY)) {
        findings.push({ level: lv.id, axis: "horizontal", gap: +gapX.toFixed(1),
          span: +bandY.toFixed(1), between: [A.tag, B.tag],
          looksPassable: gapX >= SEAM });
      }
      // vertical squeeze: A's underside down to B's top face
      const gapY = B.y - (A.y + A.h);
      const bandX = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x);
      if (gapY > 0 && gapY < BODY && bandX > 0 && !A.tag.includes("edge") && !B.tag.includes("edge") &&
          !occluded(Math.max(A.x, B.x), A.y + A.h, bandX, gapY)) {
        findings.push({ level: lv.id, axis: "vertical", gap: +gapY.toFixed(1),
          span: +bandX.toFixed(1), between: [A.tag, B.tag],
          looksPassable: gapY >= SEAM });
      }
    }
  }
}

const teases = findings.filter(f => f.looksPassable);
if (json) {
  console.log(JSON.stringify({ body: BODY, findings }, null, 2));
} else {
  console.log(`Arena geometry audit — fighter body ${BODY}px (radius ${RADIUS})\n`);
  for (const f of findings) {
    const mark = f.looksPassable ? "TEASE" : "seam ";
    console.log(`  ${mark} ${f.level.padEnd(24)} ${f.axis.padEnd(10)} gap=${String(f.gap).padStart(5)}px  ${f.between.join("  ↔  ")}`);
  }
  console.log(
    teases.length
      ? `\n${teases.length} gap(s) look passable but are not. Widen past ${BODY}px, or close them so they read as solid.`
      : `\nClean: no gap between ${SEAM}px and ${BODY}px anywhere in ${LEVELS.length} arenas.`
  );
}
process.exit(teases.length ? 1 : 0);
