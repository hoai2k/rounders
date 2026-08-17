# Image Generation Requests — Rounders

**One file outstanding: `fx/angel.png`** (§1). Everything else the game asks
for has been generated and is in the repo — all 84 cards have an emblem and a
scene, all 29 painted bullets are in, and 17 of the 18 effect sheets. The
prompts everything was made from live in `image-requests-history.md`, which is
where a re-generation or a style question goes looking.

> Audited 2026-08-17 after the 115-file delivery: **0 cards missing art** (84
> cards, each with an emblem and a scene). Art for four cut cards is unused but
> kept in case they return — `big-bore` (a strictly worse Cannonball) and
> `gag-order` / `cold-shoulder` / `overflow` (effects that were not pulling
> their weight). Second Serve was renamed **Second Defence**, so its two files
> were renamed to match.

The game ships with procedural fallbacks, so art can be dropped in
incrementally: any missing file is fine and simply falls back.

## Global style guide (prepend to every prompt)

> Vibrant flat 2D indie game art, thick dark outlines, soft inner gradients, bold
> saturated colors, playful and energetic, clean silhouette, no text, no watermark.
> Consistent with a colorful physics party-brawler in the spirit of ROUNDS.

## File conventions

- Drop delivered art under `intake/` in the shape it is used —
  `intake/cards/<id>.png`, `intake/cards/art/<id>.png`,
  `intake/bullets/<id>.png`, `intake/fx/<name>.png` — then run:

  ```bash
  npm run intake-art -- --dry-run   # see what it would do
  npm run intake-art                # key, file and archive
  ```

  Anything on a solid backdrop is keyed to transparency automatically and the
  delivered original is kept in `assets/images/archive/`. Card **scenes** are
  exempt (they are meant to be opaque). `npm run intake` is the separate,
  older pipeline for character art.

---

## 1. Effect art still outstanding (1 file)

- **Path:** `assets/images/fx/<name>.png`

| File | Size | Subject |
|---|---|---|
| `angel.png` | 256×256 (drawn ~52×60) | A tiny cartoon guardian angel seen head-on — round head, simple robe, two spread feathered wings, its own little halo above. Warm cream-gold on transparent; it rises and fades when Guardian Halo saves you, so keep it a clean readable silhouette |

---

## Where the art is used

| Batch | Drawn by |
|---|---|
| Branding | title screen, menu backdrop |
| Characters | the composed rig (`js/rig.js`), portraits, the lobby, victory |
| Arenas | arena backdrops, behind the procedural platforms |
| Card emblems | the HUD card chips, and a stand-in wherever a scene is missing |
| Card art panels | the panel across the top of a full card face — the draft hand, the card workbench, and the card a bot is shown taking |
| Bullets | the round a fighter fires, picked from the newest card they hold that changes the bullet; also shown at true size in the workbench's bullet pane |
| Effects | explosions, black holes, poison clouds, sawblades and the rest, with the procedural drawing as fallback |
