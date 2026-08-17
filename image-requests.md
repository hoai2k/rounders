# Image Generation Requests — Rounders

**Three batches outstanding:** card art for **33 cards** (§1), plus
**bullet art** (§2) and **effect art** (§3).

> Re-audited 2026-08-17 after the Lowrider / Aegis Bubble / Pocket Void
> delivery: 88 cards, **55 have emblem + scene**, 33 have neither and are
> drawing the plain tinted fallback panel. No card is half-delivered, and
> nothing is orphaned (no art without a card). The delivered prompts have
> moved to `image-requests-history.md` §9, which is where a re-generation or a
> style question goes looking.

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

## 1. Card art still outstanding (33 cards × 2 images = 66 files)

These 33 cards have no art at all yet. Two shapes each — an **emblem** (`assets/images/cards/<id>.png`, 256×256, transparent, single
centered subject) and an **art panel** (`assets/images/cards/art/<id>.png`,
512×384, full-bleed painted scene, key subject inside the middle 80%).

| Card | Files | Subject |
|---|---|---|
| **Boxing Glove** (common) | `boxing-glove.png` + `art/boxing-glove.png` | A comically oversized red boxing glove launched forward on a spring of speed lines, a small round fighter being punted clear off their feet. Red leather, white laces, big impact star. |
| **Sugar Rush** (common) | `sugar-rush.png` + `art/sugar-rush.png` | A round fighter sprinting in a blur, leaving a rainbow-sherbet speed trail of candy sparkles and lollipop swirls. Pink/teal, sugary and manic. |
| **Waste Not** (uncommon) | `waste-not.png` + `art/waste-not.png` | A spent bullet arcing neatly back into an open magazine like litter into a bin, a green recycle-style loop of motion lines behind it. Brass and mint green. |
| **Pit Stop** (uncommon) | `pit-stop.png` + `art/pit-stop.png` | A pit crew moment: a chunky revolver jacked up like a race car, fresh magazine going in, checkered-flag energy and one flying lug nut. Racing red/white. |
| **Cold Snap** (uncommon) | `cold-snap.png` + `art/cold-snap.png` | A round fighter mid-block with a ring of jagged frost exploding outward, nearby silhouettes flash-frozen in blue ice shells. Ice blue on deep navy. |
| **Panic Button** (uncommon) | `panic-button.png` + `art/panic-button.png` | A big glossy red emergency button slammed by a small round hand, a white energy dome popping up around the presser. Alarm red and warning stripes. |
| **Coffee Break** (uncommon) | `coffee-break.png` + `art/coffee-break.png` | A steaming to-go coffee cup radiating scalding shockwave rings, small silhouettes shoved back by the pulse. Espresso brown and cream, cozy but violent. |
| **Triple Tap** (uncommon) | `triple-tap.png` + `art/triple-tap.png` | Three bullets in tight single-file leaving one barrel, each with its own muzzle-flash echo, the trailing two slightly ghosted. Steel grey with amber flashes. |
| **Hot Streak** (uncommon) | `hot-streak.png` + `art/hot-streak.png` | A round fighter wreathed in a fading golden armor shimmer, hexagonal shield facets peeling off like embers behind them. Gold on charcoal. |
| **Helium Rounds** (uncommon) | `helium-rounds.png` + `art/helium-rounds.png` | Bullets drifting gently UPWARD trailing tiny party balloons and bubbles, one slipping up past a floating island's underside. Sky blue and pastel balloon colors. |
| **Springload** (uncommon) | `springload.png` + `art/springload.png` | A round fighter bouncing high off another's flattened head like a trampoline, coiled spring under their boots, big cartoon BOING arcs. Yellow/orange, pure slapstick. |
| **Underdog** (uncommon) | `underdog.png` + `art/underdog.png` | A small scuffed round fighter with a bandage and burning determined eyes, standing in the long shadow of a huge trophy that isn't theirs — yet. Warm ember glow on cold blue. |
| **Firecracker Heels** (uncommon) | `firecracker-heels.png` + `art/firecracker-heels.png` | A double-jumping fighter with a firecracker blast going off under their boots, sparks and a little smoke ring beneath. Firework red/gold on night sky. |
| **Lemonade Stand** (rare) | `lemonade-stand.png` + `art/lemonade-stand.png` | A fizzy lemon-lime zone bubbling up from a dropped lemonade jug, a round fighter soaking in it with rising sparkle-pluses. Citrus yellow/green, effervescent. |
| **Mosh Pit** (rare) | `mosh-pit.png` + `art/mosh-pit.png` | A gleaming circular sawblade orbiting a grinning round fighter on a visible circular track, sparks flying where it clips the ground. Steel and hazard orange. |
| **Bank Shot** (rare) | `bank-shot.png` + `art/bank-shot.png` | A bullet ricocheting off two walls in a neat dotted Z-path, sharpening and glowing brighter after each bounce, final leg locked onto a target silhouette. Pool-hall green felt and chalk blue. |
| **Stink Bomb** (rare) | `stink-bomb.png` + `art/stink-bomb.png` | A burst shell leaving a lingering bubbling cloud of sickly green gas with little skull wisps, a silhouette pinching its nose inside it. Toxic green on dark. |
| **Payment Plan** (rare) | `payment-plan.png` + `art/payment-plan.png` | A big incoming damage burst being split into a neat stack of small violet installment slips draining away as sand in an hourglass. Violet and parchment. |
| **Fresh Coat** (rare) | `fresh-coat.png` + `art/fresh-coat.png` | A round fighter in a gleaming just-painted white shell with a price sticker still on, one chip cracking off the pristine surface. Showroom white with cyan sheen. |
| **Blood Money** (rare) | `blood-money.png` + `art/blood-money.png` | A gun firing a torrent of coins-turned-bullets while a red life-thread drains from its wielder's arm into the chamber. Deep crimson and gold. |
| **Camera Flash** (rare) | `camera-flash.png` + `art/camera-flash.png` | An old flashbulb camera going off point-blank, the flash a white starburst, a stunned round fighter seeing little birdies. White burst on midnight blue. |
| **Gag Order** (rare) | `gag-order.png` + `art/gag-order.png` | A round fighter with a comically official red wax seal stamped over their mouth area, their block bubble fizzling out grey around them. Bureaucratic red and slate. |
| **Cold Shoulder** (rare) | `cold-shoulder.png` + `art/cold-shoulder.png` | A frosty round fighter radiating a visible ring of cold, grass and nearby silhouettes rimmed white inside the circle. Pale ice blue, quiet menace. |
| **Second Serve** (rare) | `second-serve.png` + `art/second-serve.png` | A tennis-style serve toss where the ball is a shield bubble, mid-bounce back into the server's hand the instant a shot lands elsewhere. Grass green and chalk white. |
| **Overflow** (rare) | `overflow.png` + `art/overflow.png` | A heart-shaped vessel filled past the brim, the excess pouring over and crystallizing into hexagonal cyan shield plates. Rose red into cyan. |
| **Boomerang** (rare) | `boomerang.png` + `art/boomerang.png` | A bullet arcing a huge loop around empty air and returning to an open, waiting hand, its path drawn as one elegant ribbon. Eucalyptus teal and ochre. |
| **Body Double** (rare) | `body-double.png` + `art/body-double.png` | Two identical round fighters side by side — one real, one a faint-edged shimmering copy with a dotted outline — a seeking missile curving toward the wrong one. Duotone violet. |
| **Magnet Suit** (rare) | `magnet-suit.png` + `art/magnet-suit.png` | A round fighter in a horseshoe-magnet harness, incoming bullets bending away in repelled arcs on both sides. Magnet red/silver with field lines. |
| **Return to Sender** (epic) | `return-to-sender.png` + `art/return-to-sender.png` | A golden supercharged bullet stamped like certified mail, carrying a shrunken storm of block energy (nova ring, frost, shockwave) to a distant impact point. Gold and postal red. |
| **Puppet Strings** (epic) | `puppet-strings.png` + `art/puppet-strings.png` | A bullet flying on glowing marionette strings from a puppeteer's control bar held by a round fighter, mid-turn around a wall. Theater purple and spotlight gold. |
| **Bricklayer** (epic) | `bricklayer.png` + `art/bricklayer.png` | A round fighter in a hard hat conjuring a floating stone slab out of dust and glow in front of them, trowel in hand, the slab mid-drop. Sandstone and blueprint blue. |
| **Drill Rounds** (rare) | `drill-rounds.png` + `art/drill-rounds.png` | A bullet boring clean through a brick wall, leaving a neat glowing hole with dust and chips bursting from both faces, a target silhouette visible through the gap. Sandstone and hot orange bore-glow. *(replaces the old pierce-a-player idea — this card is now the wall-driller)* |
| **Skylight** (epic) | `skylight.png` + `art/skylight.png` | A perfectly round hole blasted clean through a stone platform, daylight streaming down through it, a small round fighter dropping through the gap feet-first with rubble still falling. Dust-gold light shaft on cool stone. |
| **Encore** (epic) | `encore.png` + `art/encore.png` | A round fighter taking a stage bow while behind them a ghostly translucent copy of their last shot re-fires itself, red curtain backdrop. Stage crimson and spotlight blue-white. |

---

## 2. Bullet art (29 cards × 1 image = 29 files) — NEW

Bullets are drawn procedurally today (a tinted round plus per-effect tells).
These 29 cards change what the bullet *looks like*, so each can take a painted
round. Everything else keeps the procedural bullet, which is correct — a card
that only changes reload speed should not change the shot's appearance.

- **Path:** `assets/images/bullets/<card-id>.png`
- **Size:** 128×128, transparent, the round centred and filling ~80% of frame
- **Orientation:** pointing **RIGHT** (the game rotates it to the flight path)
- **Drawn at:** roughly 6–14px across in game, so it must read *tiny* — bold
  silhouette, one or two colors, no fine detail or text
- Check any delivered round in the card workbench: `/workbench?edit=cards` →
  Preview → the **Bullet — game size** pane shows it at true size next to a
  fighter-radius circle, with size/rotation sliders and an Export button.

| Card | File | Bullet |
|---|---|---|
| Big Bore | `big-bore.png` | A fat brass slug, blunt-nosed, comically oversized |
| Boxing Glove | `boxing-glove.png` | A tiny red boxing glove flying fist-first |
| Buckshot Buttons | `buckshot-buttons.png` | A single colourful button-pellet, shirt-button holes and all |
| Double Dutch | `double-dutch.png` | A slim twinned round, two barrels' worth fused side by side |
| Bullet Ballet | `bullet-ballet.png` | An elegant tapered dart with a ribbon trail |
| Ricochet Romance | `ricochet-romance.png` | A glossy pink rubber ball, heart-shaped highlight |
| Bank Shot | `bank-shot.png` | A polished billiard-ball round with a chalked cue-tip mark |
| Wasp Venom | `wasp-venom.png` | A yellow-and-black striped stinger dart, green venom bead at the tip |
| Cinder Shot | `cinder-shot.png` | A glowing ember lump trailing sparks, orange-hot core |
| Permafrost | `permafrost.png` | A pale blue ice shard with frost spikes |
| Magnet Fingers | `magnet-fingers.png` | A round with small horseshoe-magnet fins, faint red/blue pole tint |
| Black Mamba | `black-mamba.png` | A matte-black fanged dart dripping green |
| Popcorn Payload | `popcorn-payload.png` | A kernel mid-pop, half corn half burst |
| Cluster Bomb / Party Favor | `cluster-bomb.png` | A tiny party popper round with confetti flecks |
| Supernova | `supernova.png` | A blinding white-hot star core with a compressed corona |
| Shrapnel Burst | `shrapnel-burst.png` | A segmented casing scored to break apart |
| Comet Trail | `comet-trail.png` | A small comet head with an icy tail |
| Chain Letter | `chain-lightning.png` | A crackling ball of yellow electricity, arc stubs |
| Storm Caller | `storm-caller.png` | A frost-blue round wrapped in lightning |
| Lowrider | `lowrider.png` | A flattened disc round riding low, dust curl under it |
| Helium Rounds | `helium-rounds.png` | A pastel balloon-round with a little knot at the back |
| Drill Rounds | `drill-rounds.png` | An elongated tungsten drill bit, spiral flutes, glowing tip |
| Skylight | `skylight.png` | A ring-shaped cutter round, hollow centre, sparking edge |
| Railgun | `railgun.png` | A long dark sabot slug wrapped in blue induction rings |
| Puppet Strings | `puppet-strings.png` | A round trailing two fine glowing marionette threads |
| Boomerang | `boomerang.png` | A small curved wooden boomerang round |
| Stink Bomb | `stink-bomb.png` | A round glass flask of sloshing green muck |
| Pocket Void | `pocket-void.png` | A pure black sphere with a violet event-horizon rim |
| Golden Gun | `golden-gun.png` | A gleaming solid-gold bullet, engraved band |

## 3. Effect art (18 files) — NEW

Every combat effect is procedural canvas today. These are the ones that would
gain most from painted art. All are **transparent PNGs**, drawn as a single
centred element on nothing, so the engine can tint, scale, rotate and fade
them. Sprite sheets are welcome where noted (left-to-right frames, equal
cells) — otherwise a single image the engine animates by scaling/fading.

- **Path:** `assets/images/fx/<name>.png`

| File | Size | Subject |
|---|---|---|
| `explosion.png` | 256×256, 6-frame sheet 1536×256 | Orange-white fireball bloom with smoke edge, cartoon-chunky |
| `explosion-big.png` | 384×384, 6-frame sheet | Supernova-scale detonation, white core, shockwave ring |
| `shockwave-ring.png` | 256×256 | A thin expanding white pressure ring, slight lens warp |
| `poison-cloud.png` | 256×256 | Bubbling sickly-green gas puff, soft edges |
| `frost-burst.png` | 256×256 | Radial ice crystals blooming outward, pale blue |
| `chill-aura.png` | 256×256 | Soft ring of cold vapour with frost flecks |
| `lightning-arc.png` | 512×128 | A horizontal jagged bolt, bright core + glow, so it can stretch between two points |
| `storm-nova.png` | 384×384 | A crown of lightning bursting outward from a centre |
| `black-hole.png` | 320×320 | Violet accretion swirl around a black core, warped starlight |
| `heal-field.png` | 256×256 | Soft citrus-green dome of light with rising plus signs |
| `sawblade.png` | 128×128 | A circular saw seen face-on, steel teeth, worn centre boss |
| `shield-bubble.png` | 256×256 | A translucent cyan hex-faceted sphere, bright rim |
| `shield-break.png` | 256×256, 5-frame sheet | That bubble shattering into glassy shards |
| `armor-plates.png` | 192×192 | Golden hexagonal armour scales curving around nothing |
| `bore-hole.png` | 128×128 | A scorched round hole decal: dark ring, cracked stone lip, embers — laid over terrain where Skylight punches through |
| `dust-puff.png` | 128×128 | A pale drifting dust/rubble puff for impacts and bore-through |
| `stun-stars.png` | 192×96 | Three cartoon stars circling, for a dazzled fighter |
| `muzzle-flash.png` | 128×128 | A short bright star-burst flash, drawn pointing right |

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
