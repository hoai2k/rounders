# Image Generation Requests — Rounders

**One batch outstanding: 6 arena backdrop refreshes** (below). Everything else
the game asks for has been generated and is in the repo; the prompts they were
made from are in `image-requests-history.md`, which is where a re-generation or
a style question goes looking.

The game ships with procedural fallbacks, so art can be dropped in incrementally:
any missing file is fine and simply falls back.

## Global style guide (prepend to every prompt)

> Vibrant flat 2D indie game art, thick dark outlines, soft inner gradients, bold
> saturated colors, playful and energetic, clean silhouette, no text, no watermark.
> Consistent with a colorful physics party-brawler in the spirit of ROUNDS.

## File conventions

- Drop files at the exact paths listed (create folders as needed).
- **Backgrounds:** transparent is preferred where a cutout is wanted, but a flat
  backdrop is fine — drop those files in `intake/` and run `npm run intake` (or
  use `/workbench/intake.html`), which keys the backdrop out, writes the PNG to
  the right path and keeps the delivered file in `assets/images/characters/archive/`.
  Use a backdrop colour the art does not contain (magenta `#ff00ff` for cool art,
  green `#00ff00` for warm art) and keep it perfectly flat — no gradient, no
  shadow, and nothing enclosed by the art in that colour (`npm run audit-keys`
  catches backdrop trapped inside a shape, but it is cheaper not to make it).

---

## 1. Arena backdrop refreshes (6 images)

**Why:** the level-design pass (AUDIT.md §5) gave every arena real structure —
climbable towers, a torii gate, a beached wreck, a central bookcase — drawn as
procedural rectangles *on top of* the existing backdrops. Six arenas changed
shape enough that a repainted backdrop can make the new structure feel painted
into the world instead of laid over it. The other 19 arenas' existing backdrops
still read fine and are **not** requested.

**Spec** — same as the original arena batch (`image-requests-history.md` §4):
1600×900 painterly full-bleed, replacing the file at the same path. Base
prompt: *Wide 2D game arena background, painterly, soft depth layers, no
characters, no UI, no text.* Important: keep the listed regions visually
quiet/backgroundy — solid platforms and props are still drawn by the engine on
top, at the positions noted (fractions of the 1600×900 frame).

| File | Arena | Prompt additions & geometry notes |
|---|---|---|
| `arenas/neon-skyline.png` | Neon Skyline | Rain-slick cyberpunk rooftops at night, pink/cyan holo-billboards, mega-towers behind. NEW: the arena is now two rooftops with a neon-lit alley chasm at center-bottom (x 44–56%, below y 92%) — paint a vertiginous drop with traffic light-trails far below; faint rooftop water-tower silhouettes near both edges where climbing towers stand (x 4–12% and 88–96%, y 55–92%). |
| `arenas/koi-temple.png` | Koi Temple | Cherry-blossom temple over a koi pond, gold detailing, warm pink sky. NEW: a grand red torii gate now spans the pond — echo it with distant smaller torii reflected in the water; keep the center span (x 28–72%, y 50–60%) atmospherically clear for the painted beam the engine draws. |
| `arenas/tidal-wreck.png` | Tidal Wreck | Storm-grey shipwreck cove, rain, teal water. NEW: the fight happens ON a beached wreck mid-channel — paint the hull's dark timber mass rising from the water at center (x 35–65%, y 78–95%) and a broken mast line going up-center, ropes and torn sails in the sky; shorelines at both bottom corners. |
| `arenas/midnight-library.png` | Midnight Library | Candle-lit infinite library, warm amber dust. NEW: a monumental central bookcase divides the room (x 46–54%, y 52–92%) — paint towering shelf mass behind that band with a ladder leaning nearby, and a heavy ceiling beam at top-center where a chandelier hangs on chains (x 42–58%, y 0–33%). |
| `arenas/lantern-festival.png` | Lantern Festival | Night festival river, floating paper lanterns, warm reds and golds. NEW: a two-tier pagoda now rises from the river at center (x 43–57%, y 46–92%) — paint its reflection and lantern strings converging toward it; keep both shores warm and busy with festival stalls at the bottom corners. |
| `arenas/aurora-summit.png` | Aurora Summit | Green-teal aurora over dark peaks. NEW: the summit is now asymmetric — a staircase ridge climbing to a peak on the LEFT (rising from x 0–35%, y 85%→30%) with a sheer ice cliff face at x 31–36%, and a lower wind-scoured shelf on the right; let the aurora crown the left peak. |

---

## Where the art is used

| Batch | Drawn by |
|---|---|
| Branding | title screen, menu backdrop |
| Rarity frames | *(not wired — the card face is drawn in CSS)* |
| Characters | the composed rig (`js/rig.js`), portraits, the lobby, victory |
| Arenas | arena backdrops, behind the procedural platforms |
| Card emblems | the draft hand, the HUD card chips, and the card a bot is shown taking |

If a card is ever added to `js/cards.js`, it wants an emblem at
`assets/images/cards/<id>.png` — 256×256, transparent, single centered subject —
or it simply draws with an empty art panel.
