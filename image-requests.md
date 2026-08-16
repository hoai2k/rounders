# Image Generation Requests — Rounders

Open requests only. Everything already generated — branding, rarity frames, the
24 characters, 25 arenas and the 52 card emblems — is recorded in
`image-requests-history.md` with the prompts it was made from.

The game ships with procedural fallbacks, so art can be dropped in incrementally:
any missing file is fine and simply falls back.

## Global style guide (prepend to every prompt)

> Vibrant flat 2D indie game art, thick dark outlines, soft inner gradients, bold
> saturated colors, playful and energetic, clean silhouette, no text, no watermark.
> Consistent with a colorful physics party-brawler in the spirit of ROUNDS.

## File conventions

- Drop files at the exact paths below (create folders as needed).
- **Backgrounds:** transparent is preferred where a cutout is wanted, but a flat
  backdrop is fine — drop those files in `intake/` and run `npm run intake` (or
  use `/workbench/intake.html`), which keys the backdrop out, writes the PNG to
  the right path and keeps the delivered file in `assets/images/characters/archive/`.
  Use a backdrop colour the art does not contain (magenta `#ff00ff` for cool art,
  green `#00ff00` for warm art) and keep it perfectly flat — no gradient, no
  shadow, and nothing enclosed by the art in that colour (`npm run audit-keys`
  catches backdrop trapped inside a shape, but it is cheaper not to make it).

---

## 1. Card art (52 images)

**Why:** a draft hand is four cards fanned out and a 30-second timer. Right now
every card is a wall of text, so players read instead of recognising. One
illustration per card makes the hand scannable — you learn a card's look once and
spot it from then on.

**Spec**

- Path: `assets/images/cards/art/<id>.png` — `<id>` is the filename in the table.
- **512×384** (4:3 landscape), PNG. This is the panel across the top of the card
  face, above the name and the effect list.
- **Full-bleed painted art, no transparency needed** and no frame of its own —
  the card supplies its border. Keep the important shape inside the middle 80%;
  the panel is drawn with rounded corners.
- **No text, no numbers, no UI.** The card already says what it does.
- Must read at **~120 px wide**: one clear subject, strong silhouette, high
  contrast against a simple background. If it needs squinting, it has failed.
- Show the *mechanic*, not just the name — a card that pierces should show
  something being pierced. The effect summary is listed for that reason.
- Tint the lighting toward the rarity so a hand reads at a glance: common cool
  grey `#b8c4d0`, uncommon green `#3ddc84`, rare blue `#4da6ff`, epic violet
  `#b45cff`, legendary amber `#ffb02e`, mythic magenta `#ff4d8f`.
- These are *scenes*, and are separate from the 256×256 emblems already in
  `assets/images/cards/` — keep the same idea and subject as the emblem where one
  exists (listed in `image-requests-history.md` §5), so a card's badge and its art
  agree.

Base prompt: *Compact illustrated game-card scene, single clear subject, thick
dark outlines, bold saturated colors, dramatic rim light, simple uncluttered
background, no text.*

### Common — cool grey key light

| File | Card | Does | Prompt additions |
|---|---|---|---|
| `cards/art/bubblegum-rounds.png` | Bubblegum Rounds | +2 ammo, −10% damage | A torn candy wrapper spilling fat pink gum-wrapped rounds across the frame, one round blowing a bubble mid-flight; sugary pastel palette, soft harmless glow. |
| `cards/art/cannonball.png` | Cannonball | +30% damage, slower shots | A black iron sphere with a sputtering fuse smashing through a wooden crate, splinters and a dust shockwave ring, heavy slow motion arcs trailing behind. |
| `cards/art/featherweight.png` | Featherweight | +16% speed, +20% air control, −12% health | A single luminous feather riding an updraft high above a blurred arena floor, curved speed streamers wrapping it, everything pale and airy. |
| `cards/art/stone-soup.png` | Stone Soup | +35% health, −6% speed | A dented cauldron bubbling over a campfire with a contented boulder soaking in it like a hot bath, chunky rock vegetables, cosy warm light. |
| `cards/art/hair-trigger.png` | Hair Trigger | −22% fire delay, +1 ammo | Close-up of a trigger under a fingertip, its spring coiled to breaking point and a spark leaping the gap, three ghosted repeats showing how fast it snaps back. |
| `cards/art/speed-loader.png` | Speed Loader | −32% reload time | A revolver cylinder swinging shut mid-reload with six rounds dropping in as one blurred motion, clock hands spinning off the cylinder face. |
| `cards/art/grasshopper.png` | Grasshopper | +20% jump, +8% air control | A spring-legged grasshopper launching off a platform edge, a dotted arc marking the extra height, grass blades and dust kicked up behind it. |
| `cards/art/longshot.png` | Longshot | +28% bullet speed, −15% drop | A dead-flat tracer stretched from the near edge to a tiny target ring on the far horizon across a wide canyon, no droop in the line. |
| `cards/art/brick-wall.png` | Brick Wall | +15% health, −40% knockback | A stout brick wall taking a cannonball square on and not budging an inch, smug little face on the bricks, dust puffing from the impact. |
| `cards/art/buckshot-buttons.png` | Buckshot Buttons | +2 pellets, wide spread | A wide fan of mismatched sewing buttons blasting from a shotgun muzzle, loose thread trailing from each one. |
| `cards/art/moon-shoes.png` | Moon Shoes | +1 air jump, −8% speed | Spring-loaded boots bouncing off a rooftop toward a crescent moon, a dotted double-arc marking the second jump. |
| `cards/art/sticky-soles.png` | Sticky Soles | +50% acceleration, +35% braking | A boot sole planted mid-skid with pink gum strings snapping taut behind it, grip sparks and short skid marks. |
| `cards/art/tailwind.png` | Tailwind | +50% air control | A rolling gust of wind carrying a paper plane through a tight banking turn, swirl lines and tumbling leaves. |
| `cards/art/big-bore.png` | Big Bore | +18% damage, +25% bullet size | An absurdly wide gun barrel propped on a tiny bipod, a fat slug just clearing the muzzle, the shooter comically dwarfed behind it. |

### Uncommon — green key light

| File | Card | Does | Prompt additions |
|---|---|---|---|
| `cards/art/ricochet-romance.png` | Ricochet Romance | +2 wall bounces | A bullet zig-zagging between two facing walls, a pink heart blooming at each impact point, dotted path linking them. |
| `cards/art/wasp-venom.png` | Wasp Venom | poison on hit | A wasp diving with a dripping green stinger, sickly vapour trailing behind it, the target already wilting. |
| `cards/art/cinder-shot.png` | Cinder Shot | burn on hit | A bullet trailing a ribbon of fire that keeps burning in the air where it passed, embers drifting off the trail. |
| `cards/art/permafrost.png` | Permafrost | chill on hit | A frost-rimed round punching into a target that is freezing into a block of blue ice, crystals creeping outward from the hit. |
| `cards/art/magnet-fingers.png` | Magnet Fingers | homing shots | A horseshoe magnet bending three dotted bullet paths into a curve that all converge on one target. |
| `cards/art/popcorn-payload.png` | Popcorn Payload | small explosion on hit | A kernel bursting on impact into a hot little explosion of popped corn and sparks. |
| `cards/art/leech-lunch.png` | Leech Lunch | 18% lifesteal | A cheerful leech with a napkin tucked in, siphoning a red droplet along a thread and visibly glowing healthier. |
| `cards/art/double-dutch.png` | Double Dutch | +1 pellet, slight spread | Two bullets fired as one, their trails crossing in an X, skipping-rope arcs sweeping around them. |
| `cards/art/rocket-skates.png` | Rocket Skates | block becomes a dash | Roller skates blasting a dash trail across the frame, a shield shape breaking apart into the exhaust behind them. |
| `cards/art/echo-chamber.png` | Echo Chamber | block repeats once | A shield ring flaring, with a fainter identical ring repeating a beat behind it, concentric sound waves between the two. |
| `cards/art/bodyguard.png` | Bodyguard | block shockwave, +15% health | A broad shield slammed into the ground, a radial shockwave throwing debris and incoming shots outward. |
| `cards/art/panic-pedals.png` | Panic Pedals | +40% speed at low HP | A frantic sweating heart sprinting on tiny legs, a nearly empty red health bar burning behind it, hard speed lines. |

### Rare — blue key light

| File | Card | Does | Prompt additions |
|---|---|---|---|
| `cards/art/drill-rounds.png` | Drill Rounds | pierce 1 player | A spiral drill-tipped round boring clean through a steel plate, curls of metal peeling away from the hole. |
| `cards/art/chain-lightning.png` | Chain Letter | arcs to a 2nd enemy | A bolt forking from one target to the next, sealed envelopes crackling and burning along the arc. |
| `cards/art/thorn-jacket.png` | Thorn Jacket | reflect 35% damage | A studded jacket bristling with rose thorns, an incoming bullet bouncing straight back off it in a red spark. |
| `cards/art/phoenix-feather.png` | Phoenix Feather | revive once per round | A golden feather igniting, a small silhouette rising out of the ember cloud beneath it, warm updraft of sparks. |
| `cards/art/glass-cannon.png` | Glass Cannon | +75% damage, −30% health | A cannon made of clear glass, hairline cracks spidering across it, lit from inside by an enormous charge about to go off. |
| `cards/art/comet-trail.png` | Comet Trail | damage grows with distance | A comet getting visibly larger and brighter the further along its own tail it travels, faint distance markers in its wake. |
| `cards/art/shrapnel-burst.png` | Shrapnel Burst | bullets split into 3 shards | A shell cracking open mid-flight into three glowing shards fanning out on diverging paths. |
| `cards/art/field-medic.png` | Field Medic | +5 HP/s regeneration | A field pouch spilling green healing vines that stitch a gash closed, gentle pulse rings radiating from the seam. |
| `cards/art/berserkers-blood.png` | Berserker's Blood | up to +60% damage at low HP | A cracked heart burning furious red, the cracks glowing brighter as the health bar behind it drains. |
| `cards/art/hummingbird.png` | Hummingbird | −40% fire delay, −20% damage | A hummingbird holding still on blurred wings while firing a rapid burst of tiny needle shots. |

### Epic — violet key light

| File | Card | Does | Prompt additions |
|---|---|---|---|
| `cards/art/cluster-bomb.png` | Party Favor | explosion + 2 shards | A party popper detonating into confetti-wrapped bomblets, streamers and sparks, festive and clearly lethal. |
| `cards/art/black-mamba.png` | Black Mamba | strong poison, homing | A sleek black snake coiled around a homing dart, eyes locked forward, green venom haze curling off the tip. |
| `cards/art/juggernaut.png` | Juggernaut | +110% health, +14% size | An enormous armoured sphere landing hard enough to crack the ground into a crater, tiny figures scattering from the rim. |
| `cards/art/warp-block.png` | French Exit | block becomes a teleport | A shield dissolving into a swirling portal with the figure already gone, only a hat left tumbling in the empty air. |
| `cards/art/railgun.png` | Railgun | pierce 2, +25% damage | Twin electromagnetic rails discharging a slug that leaves a straight ionized corridor punched through two silhouettes. |
| `cards/art/storm-caller.png` | Storm Caller | chain lightning + chill | A storm cloud shaped like a fist hurling forked lightning that leaps between targets and leaves frost where it lands. |
| `cards/art/guardian-halo.png` | Guardian Halo | survive 1 lethal hit | A golden halo catching a falling heart an inch above the ground, shielding light flaring at the moment of the catch. |
| `cards/art/bullet-ballet.png` | Bullet Ballet | +3 pellets, tight spread | A ribbon of bullets sweeping through a tight pirouette formation, motion arcs curving like a dancer's line. |

### Legendary — amber key light

| File | Card | Does | Prompt additions |
|---|---|---|---|
| `cards/art/supernova.png` | Supernova | big explosion, +30% damage | A star detonating into concentric gold and white rings, the arena silhouetted flat black against the blast. |
| `cards/art/golden-gun.png` | Golden Gun | 1st shot per magazine ×3 | An ornate golden pistol with the first round in the chamber glowing three times brighter than the rest of the magazine. |
| `cards/art/dragons-hoard.png` | Dragon's Hoard | +4 ammo, −25% reload | A treasure chest overflowing with ammunition belts and shells instead of coins, a scaled claw resting possessively on the lid. |
| `cards/art/grim-harvest.png` | Grim Harvest | 45% lifesteal, kills heal | An elegant scythe sweeping through glowing life-wisps that stream back up the handle toward the reaper's grip. |
| `cards/art/crown-of-storms.png` | Crown of Storms | block becomes a lightning nova | A crown crackling with lightning, a nova of bolts bursting outward from the ring in every direction. |

### Mythic — magenta key light

| File | Card | Does | Prompt additions |
|---|---|---|---|
| `cards/art/starfall-protocol.png` | Starfall Protocol | ACTIVE: meteor volley | A targeting reticle burning in the sky calling down a volley of meteors onto a marked patch of ground below. |
| `cards/art/event-horizon.png` | Event Horizon | ACTIVE: black hole | A black hole dragging bullets, debris and light itself into a bent spiral, the frame's edges warping inward with it. |
| `cards/art/chronoshift.png` | Chronoshift | ACTIVE: rewind 2s + heal | An hourglass shattering while its sand pours upward, a ghost of a figure stepping backward out of its own afterimages. |

**Total: 52 images.** Priority order if generating in batches: mythic and
legendary first (rarest and most memorable), then epic, rare, uncommon, common.

---

## Notes

- The 52 emblem icons in `assets/images/cards/` are drawn and in the repo, but
  nothing displays them yet — the draft hand is still text only. Wiring the card
  face to show art (emblem now, these scenes when they land) is a code change,
  not an art one.
