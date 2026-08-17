# Image Generation Requests — Rounders

**Nothing outstanding.** Every image the game asks for has been generated and is
in the repo. The prompts everything was made from live in
`image-requests-history.md`, which is where a re-generation or a style question
goes looking.

> Audited 2026-08-17, after the last six files landed (`fx/angel.png`,
> `fx/lemonade.png` and re-arts for Second Defence and Sawblade):
>
> | | |
> |---|---|
> | Cards shipping | 77 — **0 missing art**, each with an emblem and a scene |
> | Emblems / scenes on disk | 88 each: the extra 11 belong to cut cards, kept in case they come back |
> | Painted bullets | 29 |
> | Effect sheets | 20 |
>
> Art for the cut cards is unused but kept — `big-bore` (a strictly worse
> Cannonball) and `gag-order` / `cold-shoulder` / `overflow` (effects that were
> not pulling their weight), plus `chain-lightning` / `underdog` /
> `coffee-break` / `cold-snap` / `panic-pedals` / `rocket-skates` /
> `echo-chamber` on the same terms.
>
> **Renamed cards keep their files, but not always their subject.** Skylight →
> **Breakthrough** kept its painting, which already showed a fighter smashing
> out through a stone wall and reads better under the new name than the old
> one. Second Serve → **Second Defence** and Mosh Pit → **Sawblade** did not —
> a tennis serve and a blade on an orbital track, neither of which the card does
> any more — so all four files were re-requested and have now been replaced.
>
> **Not everything delivered is wired up yet.** Five of the 20 effect sheets are
> drawn by the engine (`angel`, `black-hole`, `lemonade`, `poison-cloud`,
> `sawblade`); the other 15 — `armor-plates`, `bore-hole`, `chill-aura`,
> `dust-puff`, `explosion`, `explosion-big`, `frost-burst`, `heal-field`,
> `lightning-arc`, `muzzle-flash`, `shield-break`, `shield-bubble`,
> `shockwave-ring`, `storm-nova`, `stun-stars` — are on disk with no call site,
> waiting on engine work rather than on art. That is a code gap, not an art one.

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
