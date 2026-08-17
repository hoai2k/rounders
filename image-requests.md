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
> **16 of the 20 effect sheets are drawn by the engine.** `angel`, `black-hole`,
> `lemonade`, `poison-cloud` and `sawblade` were already in; `explosion`,
> `explosion-big`, `shockwave-ring`, `lightning-arc`, `storm-nova`,
> `shield-bubble`, `shield-break`, `stun-stars`, `muzzle-flash`, `chill-aura`
> and `frost-burst` were wired in on 2026-08-17.
>
> **Four are deliberately unused, and should stay that way** unless the design
> they lose to is revisited: `armor-plates` (Juggernaut wears rolled steel by
> decision, not golden hex scales), `bore-hole` (a Breakthrough gap is drawn as
> nothing at all — flying chunks sell it), `heal-field` (the only heal zone left
> is Lemonade Stand, deliberately lemon-yellow with a glass rather than generic
> green), and `dust-puff` (arena dust is tinted with each arena's own wall
> colour, which a fixed pale puff would flatten). Requesting replacements for
> these would be requesting art the game has decided against.

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
| Effects | explosions, shockwave rings, muzzle flashes, lightning, shields, stun stars, frost and the rest — sprite strips play frame by frame, single images animate by scaling and fading, and every one keeps its procedural drawing as fallback |
