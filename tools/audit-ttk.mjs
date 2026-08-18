// Rounders — time-to-kill sweep: how long a fight actually lasts, and how
// often one is over in a single volley.
//
// Builds a random attacker and a random defender out of the real cards and
// asks how many trigger pulls it takes. Reports the shots-to-kill spread, the
// share of matchups that are outright one-shots, and which cards move health
// and volley at all — the supply side, which is what the tail depends on.
//
//   node tools/audit-ttk.mjs [builds] [cardsPerBuild]      default 6000 12
//
// Needs the static server up (npm start).
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
const N = Number(process.argv[2] || 6000), SIZE = Number(process.argv[3] || 12);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage();
await page.goto("http://127.0.0.1:4173/workbench/cards.html");
await page.waitForTimeout(1500);
console.log(await page.evaluate(({ N, SIZE }) => {
  const { CARDS, CARD_SIM } = window.ROUNDERS;
  const base = CARD_SIM.baseStats();
  let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const build = n => { const b = []; while (b.length < n) b.push(CARDS[Math.floor(rnd() * CARDS.length)]); return b; };
  const statsOf = b => { const st = CARD_SIM.baseStats(); for (const c of b) c.apply({ stats: st }); return st; };
  // what each card does to hp / damage, one copy on the baseline
  const perCard = CARDS.map(c => {
    const st = CARD_SIM.baseStats(); c.apply({ stats: st });
    return { id: c.id, rarity: c.rarity,
      hp: Math.round(st.maxHp - base.maxHp),
      vol: Math.round(st.damage * st.pellets - base.damage * base.pellets),
      shield: st.shield - base.shield };
  });
  const hpCards = perCard.filter(c => c.hp > 0).sort((a, b) => b.hp - a.hp);
  const hpLoss = perCard.filter(c => c.hp < 0).sort((a, b) => a.hp - b.hp);
  const dmgCards = perCard.filter(c => c.vol > 0).sort((a, b) => b.vol - a.vol);
  // shots to kill, attacker build vs defender build
  const stk = [];
  const oneShot = { n: 0, ex: null };
  for (let i = 0; i < N; i += 1) {
    const A = statsOf(build(SIZE)), D = statsOf(build(SIZE));
    const volley = A.damage * A.pellets;
    const ehp = D.maxHp;
    const shots = Math.ceil(ehp / volley);
    stk.push(shots);
    if (shots <= 1) { oneShot.n += 1; }
  }
  stk.sort((a, b) => a - b);
  const q = p => stk[Math.floor(stk.length * p)];
  const byRarity = {};
  for (const c of perCard) {
    byRarity[c.rarity] = byRarity[c.rarity] || { n: 0, hpCards: 0, hpSum: 0, dmgCards: 0, dmgSum: 0 };
    const r = byRarity[c.rarity];
    r.n += 1;
    if (c.hp > 0) { r.hpCards += 1; r.hpSum += c.hp; }
    if (c.vol > 0) { r.dmgCards += 1; r.dmgSum += c.vol; }
  }
  return JSON.stringify({
    baseline: { hp: base.maxHp, volley: base.damage * base.pellets, shotsToKill: Math.ceil(base.maxHp / (base.damage * base.pellets)) },
    shotsToKill: { p10: q(0.1), p25: q(0.25), p50: q(0.5), p75: q(0.75), p90: q(0.9), oneShotPct: +(100 * oneShot.n / N).toFixed(1) },
    hpCards: hpCards.map(c => `${c.id} (${c.rarity}) +${c.hp}`),
    hpLoss: hpLoss.map(c => `${c.id} (${c.rarity}) ${c.hp}`),
    topDamage: dmgCards.slice(0, 12).map(c => `${c.id} (${c.rarity}) +${c.vol}`),
    byRarity
  }, null, 1);
}, { N, SIZE }));
await browser.close();
