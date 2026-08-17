# Image Generation Requests — Rounders

**Six files outstanding: `fx/angel.png` and `fx/lemonade.png` (§1), the two
Second Defence files (§2) and the two Sawblade files (§3).** Everything else the game asks for
has been generated and is in the repo — all 84 cards have an emblem and a
scene, all 29 painted bullets are in, and 17 of the 18 effect sheets. The
prompts everything was made from live in `image-requests-history.md`, which is where a re-generation or a style
question goes looking.

> Audited 2026-08-17 after the 115-file delivery: **0 cards missing art** (84
> cards, each with an emblem and a scene). Art for four cut cards is unused but
> kept in case they return — `big-bore` (a strictly worse Cannonball) and
> `gag-order` / `cold-shoulder` / `overflow` (effects that were not pulling
> their weight), and now `chain-lightning` / `underdog` / `coffee-break` /
> `cold-snap` / `panic-pedals` / `rocket-skates` / `echo-chamber` on the same
> terms. 77 cards ship.
>
> **Renamed cards keep their files, but not always their subject.** Skylight →
> **Breakthrough** kept its painting, which already showed a fighter smashing
> out through a stone wall and reads better under the new name than the old
> one. Second Serve → **Second Defence** did not: both its files are a tennis
> serve, and the card is now about your block snapping back, so §2 re-requests
> them. Mosh Pit → **Sawblade** is the same story for a different reason: the
> art shows a small blade on an orbital track, and the blade no longer orbits,
> so §3 re-requests it.

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

## 1. Effect art still outstanding (2 files)

- **Path:** `assets/images/fx/<name>.png`

| File | Size | Subject |
|---|---|---|
| `angel.png` | 256×256 (drawn ~52×60) | A tiny cartoon guardian angel seen head-on — round head, simple robe, two spread feathered wings, its own little halo above. Warm cream-gold on transparent; it rises and fades when Guardian Halo saves you, so keep it a clean readable silhouette |
| `lemonade.png` | 256×256 (drawn ~106×106) | A tall glass of cloudy lemonade seen head-on — ice cubes, a pink-and-white striped straw, a lemon wedge on the rim, a couple of bubbles. Bright lemon yellow on transparent. It sits faded into the middle of Lemonade Stand's heal zone, so it must read at low opacity: strong shapes, dark outline, no fine detail |

---

## 2. Second Defence — re-art after the rename (2 files)

The card used to be **Second Serve** and both files are a tennis player mid
serve. It is now **Second Defence**: *"Dealing bullet damage instantly returns
your block."* Land a hit, your shield is back — nothing to do with tennis. Both
files below **replace** what is already at those paths.

**Card:** Second Defence · Rare · *"Advantage: you."*
**Effect:** hits refresh your block (1s lockout)

- **Emblem** — `assets/images/cards/second-defence.png`, 256×256, transparent
  background, drawn small in the HUD so it needs a clean silhouette:

  > A round cartoon brawler mid-punch, and the instant their fist lands a
  > hexagonal energy shield snaps back into place around them — the shield
  > re-forming in a burst of cyan-white hex panels flying together. Motion
  > lines from the punch, a bright impact spark at the fist. Cyan and white
  > over deep blue. Confident, not defensive.

- **Scene** — `assets/images/cards/art/second-defence.png`, 512×384, opaque
  full-bleed painting:

  > A round cartoon brawler in an arena, fist buried in an enemy, and in the
  > same instant a hexagonal energy barrier is snapping shut around the
  > attacker — shield panels rushing inward and locking together, cyan-white,
  > with the impact flash still bright at the point of contact. The enemy is
  > recoiling. Read: hitting them is what put your guard back up.

---

## 3. Sawblade — re-art after the rename (2 files)

The card used to be **Mosh Pit** and both files show a small blade riding a
visible circular *track* around the fighter. The blade no longer orbits: it is
now one huge disc centred on you, spinning on its own axis and filling the
whole area it damages. Both files below **replace** what is already at those
paths (already renamed `mosh-pit.png` → `sawblade.png`).

**Card:** Sawblade · Rare · *"Mind the blade."*
**Effect:** block = spinning saw (2s)

- **Emblem** — `assets/images/cards/sawblade.png`, 256×256, transparent
  background:

  > A round cartoon brawler at the centre of one enormous circular sawblade
  > that is much wider than they are — the blade behind them, teeth all round
  > the outside, motion-blurred as it spins. Bright steel with a heavy dark
  > outline so it reads against any background. Sparks where the teeth bite.
  > The fighter looks delighted about it. No orbit, no track, no second blade.

- **Scene** — `assets/images/cards/art/sawblade.png`, 512×384, opaque
  full-bleed painting:

  > A round cartoon brawler standing inside a colossal spinning sawblade — the
  > disc is centred on them and several times their width, filling the frame
  > behind them, teeth throwing sparks off the arena floor. An enemy is
  > flinching back from the edge of it. Steel and hazard orange against a
  > darker arena. Read: they ARE the blade, it is not circling them.

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
