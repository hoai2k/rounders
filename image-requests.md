# Image Generation Requests — Rounders

**Nothing is outstanding.** Every image the game asks for has been generated and
is in the repo; the prompts they were made from are in
`image-requests-history.md`, which is where a re-generation or a style question
goes looking.

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
