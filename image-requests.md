# Image Generation Requests — Rounders

**One batch outstanding: art for the 3 new cards** (below). Everything else
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

## 1. New card art (3 cards × 2 images = 6 files)

The power-card audit (AUDIT.md §6) added three cards. Each wants both shapes —
an **emblem** (`assets/images/cards/<id>.png`, 256×256, transparent, single
centered subject) and an **art panel** (`assets/images/cards/art/<id>.png`,
512×384, full-bleed painted scene, key subject inside the middle 80%).

| Card | Files | Subject |
|---|---|---|
| **Lowrider** (uncommon) | `lowrider.png` + `art/lowrider.png` | A bullet skimming along the ground hugging the terrain — a glowing round tracer hovering just above a rolling floor line, kicking up a little dust trail behind it, dipping over the lip of a ledge. Cool teal/green energy. |
| **Aegis Bubble** (rare) | `aegis-bubble.png` + `art/aegis-bubble.png` | A translucent cyan energy bubble wrapped around a small round fighter silhouette, a bullet splashing harmlessly against its rim in a hard ring of light. Cyan/ice-blue glow on dark. |
| **Pocket Void** (epic) | `pocket-void.png` + `art/pocket-void.png` | A tiny black hole torn open in mid-air at a bullet's point of impact — swirling violet accretion arc, debris and sparks bending into it, space warping at the edges. Deep purple/magenta. |

---

## Where the art is used

| Batch | Drawn by |
|---|---|
| Branding | title screen, menu backdrop |
| Rarity frames | *(not wired — the card face is drawn in CSS)* |
| Characters | the composed rig (`js/rig.js`), portraits, the lobby, victory |
| Arenas | arena backdrops, behind the procedural platforms |
| Card emblems | the HUD card chips, and a stand-in wherever a scene is missing |
| Card art panels | the panel across the top of a full card face — the draft hand, and the card a bot is shown taking |

A card can have two images, and the card uses whichever fits the space:

- **Emblem** — `assets/images/cards/<id>.png`, 256×256, transparent, single
  centered subject. Reads at any size, so it drives the tiny HUD chips.
- **Art panel** — `assets/images/cards/art/<id>.png`, 512×384, full-bleed
  painted scene, no frame of its own (the card supplies the border). Drawn
  across the top of a full card face, centre-cropped, so keep the important
  shape inside the middle 80%.

If a card is ever added to `js/cards.js` it wants both; with only an emblem the
card face falls back to it, and with neither it simply draws a tinted panel.
