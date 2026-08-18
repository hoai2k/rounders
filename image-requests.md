# Image Generation Requests — Rounders

**One optional request outstanding** (below). Everything else the game asks for
has been generated and is in the repo. The prompts everything was made from live
in `image-requests-history.md`, which is where a re-generation or a style
question goes looking.

## Outstanding

### `cards/half-round-win.png` — Photo Finish emblem (256x256, transparent) — *optional*

Photo Finish is the special card offered to the round's runner-up in a 3+ player
free-for-all: it banks half a round win instead of granting a power. It is not
in the card list, so it is never rolled into an ordinary hand.

**Its card face needs no art.** The panel is painted at draft time from the
drafting fighter's own canonical character with a `+1/2` badge stamped beside
them, which is the point — the card is about *them*, not about a new power. That
is a deliberate design, not a fallback, so no `cards/art/half-round-win.png`
scene is wanted.

What it *would* use is the small square emblem, for the two places a card is
shown as a chip rather than a face: the locked-in tray on the card screen, and
the fighter's card list in the arena HUD. Missing, those chips simply show the
name with no icon, which is why this is optional.

> Prompt: a golden photo-finish line at a racetrack, a chunky white "1/2"
> medallion breaking the tape, tiny motion streaks behind it, gold and warm
> amber palette to match a Legendary card. Centred square emblem on a
> transparent background, no scene, no text beyond the 1/2.

> Audited 2026-08-18, after the six health cards from the anti-one-shot balance
> pass landed (`second-wind`, `padded-vest`, `iron-rations`, `sandbags`,
> `bulwark`, `second-skin` — emblem and scene each):
>
> | | |
> |---|---|
> | Cards shipping | 83 — **0 missing art**, each with an emblem and a scene |
> | Emblems / scenes on disk | 94 each: the extra 11 belong to cut cards, kept in case they come back |
> | Painted bullets | 29 |
> | Effect sheets | 20 |
> | Characters | 24, every one with body / weapon / arm |
> | Arena backdrops | 25 |
>
> Checked by loading every file the running game asks for, not by listing the
> directory: 83 emblems, 83 scenes, 25 arenas, 24 rigs and 20 effect sheets all
> resolve. The one name in `js/bullet-art.js` with no PNG behind it is
> **Cannonball**, which is deliberate — the entry is there to draw the
> procedural round 1.4x bigger, and the card has never had painted art. If you
> want one, it is the only bullet worth asking for.
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
> and `frost-burst` were wired in on 2026-08-17. Since 2026-08-18 the card
> workbench paints them too, from the same table (`js/fx.js`).
>
> **Strips are cut by detection, not by arithmetic.** The frames in
> `explosion.png`, `explosion-big.png` and `shield-break.png` are drawn by eye
> rather than on an exact grid — up to 168px off their nominal cell — so the
> engine finds each frame in the artwork instead of slicing at `width / frames`.
> A new strip does not have to be pixel-aligned; it does need visible gutters
> between frames, or `centres: [...]` in `js/fx-art.js` to say where they are.
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

## Global style guide (prepend to every prompt)

> Vibrant flat 2D indie game art, thick dark outlines, soft inner gradients, bold
> saturated colors, playful and energetic, clean silhouette, no text, no watermark.
> Consistent with a colorful physics party-brawler in the spirit of ROUNDS.

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
