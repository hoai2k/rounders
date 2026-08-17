# Image Requests — delivered

Everything here has been generated and is in the repo. Kept as a record of what
each file was asked for, so a re-generation or a style question has the original
prompt to work from. Live requests are in `image-requests.md`.

| Batch | Files | Where they landed |
|---|---|---|
| Branding | 2 | `assets/images/logo.png`, `menu-bg.png` |
| Rarity card frames | 6 | `assets/images/frames/` |
| Characters (rounds 1 and 2) | 24 | `assets/images/characters/canonical/`, split parts in `characters/render/` |
| Arena backdrops | 25 | `assets/images/arenas/` |
| Card emblem icons | 52 | `assets/images/cards/` |

The card emblems are 256×256 badges. They are **not drawn on the cards yet** —
the draft hand is still text only, which is what the card art request in
`image-requests.md` is for.

---

## 1. Branding (2 images)

| File | Prompt |
|---|---|
| `assets/images/logo.png` | Game logo for "ROUNDERS": chunky rounded letterforms stacked with a slight bounce, candy-gradient fill (coral pink → tangerine → gold), thick dark outline, one letter "O" drawn as a round cartoon character with tiny eyes and a pea-shooter sticking out, subtle drop shadow, transparent background. |
| `assets/images/menu-bg.png` | 1920×1080 hero background: a dusk skyline of impossible floating arenas — volcano forge, frozen observatory, candy hills, space station — connected by drifting confetti and bullet tracers, deep indigo sky with warm horizon glow, dreamy depth of field, no characters in foreground. |

## 2. Rarity card frames (6 images)

Shared prompt base: *Ornate trading-card frame, empty dark center panel, transparent
outside, 600×840, decorative corners and a gem at the top center.*

| File | Rarity | Prompt additions |
|---|---|---|
| `assets/images/frames/common.png` | Common | Brushed silver and slate frame, simple riveted border, small round gray gem, quiet and utilitarian. |
| `assets/images/frames/uncommon.png` | Uncommon | Living spring-green frame with sprouting leaf filigree in the corners, small emerald gem, fresh and organic. |
| `assets/images/frames/rare.png` | Rare | Deep sapphire frame with flowing water-current engravings and frost sparkles, glowing blue gem, cool and precise. |
| `assets/images/frames/epic.png` | Epic | Royal violet frame with arcane rune etchings and drifting purple mist, faceted amethyst gem, mysterious energy. |
| `assets/images/frames/legendary.png` | Legendary | Radiant gold frame with sunburst corners and tiny orbiting sparks, blazing amber gem, triumphant and loud. |
| `assets/images/frames/mythic.png` | Mythic | Iridescent magenta-to-cyan prismatic frame that looks like folded starlight, cracked star gem leaking light, reality-bending. |

## 3. Characters (12 images)

All characters are **roughly circular bodies with their signature weapon sticking
out to the right**, tiny expressive eyes, no limbs except small nub arms holding the
weapon. Transparent PNG 512×512. Shared base prompt: *Round ball-shaped cartoon
fighter, big glossy body sphere, tiny nub arms, expressive eyes, signature weapon
protruding to the right, thick outline, flat vibrant colors, transparent background.*

> **Split parts (preferred).** Alongside each canonical image, export the same
> render split into three transparent PNGs **on the identical 512×512 canvas** —
> nothing moved, just parts erased — into `assets/images/characters/render/`:
> `<id>_body.png` (body only, no weapon, no arms), `<id>_weapon.png` (weapon
> only, aimed right), `<id>_arm.png` (just the one or two nub arms, **also facing
> right** — the shoulder end that meets the body on the left, the hand end that
> grips the weapon on the right). The game then composes the character so the
> weapon aims wherever the player aims while the body mirrors with facing, and
> each arm keeps its shoulder on the body and its hand on the weapon as the
> weapon swings. Keeping the same canvas means every anchor — including each
> arm's shoulder and hand — is detected automatically; see
> `assets/images/characters/render/README.md` and the `/workbench` tuning UI. The
> canonical single image stays the hero/reference art (victory scenes, card
> portraits) and the fallback when parts are missing.

| File | Character | Prompt additions |
|---|---|---|
| `assets/images/characters/canonical/pip.png` | **Pip** — the cheerful rookie | Tangerine-orange ball with a single green sprout-leaf antenna on top, wide optimistic eyes, holding a simple wooden pea-shooter with a cork in the barrel. |
| `assets/images/characters/canonical/bolt.png` | **Bolt** — the livewire | Electric-blue ball with a yellow lightning-bolt fin on its head, one eye squinting with excitement, crackling tesla blaster with a glowing coil. |
| `assets/images/characters/canonical/mochi.png` | **Mochi** — the soft menace | Pastel-pink squishy ball with cat ears and a tiny fang, sleepy smug eyes, bubble gun with a soap-bubble half-emerged from the barrel. |
| `assets/images/characters/canonical/gruff.png` | **Gruff** — the old guard | Moss-green ball with curling ram horns and bushy grey eyebrows, unimpressed stare, antique brass blunderbuss with a flared bell muzzle. |
| `assets/images/characters/canonical/nova.png` | **Nova** — the star child | Deep-violet ball speckled with constellation freckles, wearing a translucent star-shaped visor, serene glowing eyes, sleek chrome ray gun with rings. |
| `assets/images/characters/canonical/fizz.png` | **Fizz** — the shaken soda | Lime-green translucent ball with rising bubbles inside and a bottle-cap hat, giddy cross-eyed grin, soda-spray cannon with a pump handle. |
| `assets/images/characters/canonical/ember.png` | **Ember** — the hothead | Crimson ball with a living flame crest for hair, fierce eager eyes, snub flare pistol with a lit fuse and smoke wisp. |
| `assets/images/characters/canonical/glacia.png` | **Glacia** — the cold shoulder | Ice-white ball with a jagged icicle crown and frosty blue cheeks, calm half-lidded eyes, crystalline frost rifle with icy vapor. |
| `assets/images/characters/canonical/shade.png` | **Shade** — the silent bet | Slate-grey ball wearing a tattered dark ninja headband, two narrow glowing violet slit eyes, compact kunai launcher with a blade half-ejected. |
| `assets/images/characters/canonical/duke.png` | **Duke** — the aristocrat | Cream-and-gold ball with a monocle, thin mustache and tiny top hat, haughty raised brow, engraved ivory dueling long-rifle. |
| `assets/images/characters/canonical/sprocket.png` | **Sprocket** — the wind-up wonder | Copper clockwork ball with visible gears through a porthole, a wind-up key on top, cheerful LED eyes, chunky riveted rivet-gun. |
| `assets/images/characters/canonical/luna.png` | **Luna** — the moth queen | Teal ball with feathery antennae and small glowing moth wings, gentle luminous eyes, compact prism blaster with a diamond crystal muzzle refracting a rainbow glint. |

## 4. Arena backdrops (25 images)

1600×900 painterly backgrounds. Base prompt: *Wide 2D game arena background,
painterly flat-color style, layered parallax silhouettes, atmospheric depth, calm
central area, no platforms, no characters, no text.*

| File | Arena | Prompt additions |
|---|---|---|
| `assets/images/arenas/neon-skyline.png` | **Neon Skyline** | Rain-slick cyberpunk rooftops at night, glowing holographic billboards in pink and cyan, distant mega-towers, hovering traffic light-trails. |
| `assets/images/arenas/ember-foundry.png` | **Ember Foundry** | Cavernous volcano forge, rivers of lava below, giant chains and cooling magma pillars, floating embers, deep red-orange glow fading to soot black above. |
| `assets/images/arenas/frostbite-observatory.png` | **Frostbite Observatory** | Mountaintop astronomy dome cracked open to a teal twilight, falling snow, brass telescope silhouette, aurora hints, pale blue and white palette. |
| `assets/images/arenas/verdant-overgrowth.png` | **Verdant Overgrowth** | Ruined jungle temple swallowed by giant leaves and vines, god-rays through the canopy, drifting pollen, emerald and gold palette. |
| `assets/images/arenas/orbital-drift.png` | **Orbital Drift** | Interior ring of a space station with a huge window showing Earth and starfield, floating cargo crates, soft blue instrument glow. |
| `assets/images/arenas/sirocco-canyon.png` | **Sirocco Canyon** | Sun-bleached desert canyon at golden hour, striped sandstone walls, dust devils, bleached animal skull half-buried, amber and terracotta palette. |
| `assets/images/arenas/saltwind-boardwalk.png` | **Saltwind Boardwalk** | Seaside pier at sunset, ferris wheel silhouette, string lights, gulls, peach-and-lavender sky over glittering water. |
| `assets/images/arenas/glimmer-hollow.png` | **Glimmer Hollow** | Underground cavern of giant bioluminescent mushrooms, glowing spores drifting like fireflies, teal and purple darkness with pink fungal light. |
| `assets/images/arenas/cogwork-spire.png` | **Cogwork Spire** | Inside a colossal brass clock tower, interlocking gears of all sizes, swinging pendulum, warm lamplight through dusty air, bronze palette. |
| `assets/images/arenas/prism-caverns.png` | **Prism Caverns** | Crystal cave where giant gem clusters split white light into rainbow beams, refracted sparkles, cool violet shadows. |
| `assets/images/arenas/sugar-rush.png` | **Sugar Rush** | Candy landscape with gumdrop hills, chocolate river, candy-cane trees, cotton-candy clouds, saturated pastel palette. |
| `assets/images/arenas/thunderhead-perch.png` | **Thunderhead Perch** | High above a storm: anvil clouds lit from within by lightning, rain curtains in the distance, slate blues with electric white flashes. |
| `assets/images/arenas/midnight-library.png` | **Midnight Library** | Endless towering bookshelves by candlelight, ladders, drifting dust motes, an enormous open tome, cozy amber and mahogany palette. |
| `assets/images/arenas/koi-temple.png` | **Koi Temple** | Serene pagoda garden at dawn, koi pond with lily pads, cherry blossom petals on the breeze, vermilion torii gates, soft pink and jade palette. |
| `assets/images/arenas/neon-grid.png` | **Neon Grid** | Synthwave void: infinite magenta wireframe grid to the horizon, low chrome sun with scanlines, purple-black sky, retro glow. |
| `assets/images/arenas/bonepit-arena.png` | **Bonepit Arena** | Desert colosseum built from colossal ribs and skulls, tattered banners, roaring (implied) empty stands, ochre dust haze. |
| `assets/images/arenas/aurora-summit.png` | **Aurora Summit** | Knife-edge snowy peak under a full aurora borealis of green and violet ribbons, star field, tiny prayer flags whipping in wind. |
| `assets/images/arenas/rustyard.png` | **Rustyard** | Scrap-metal junkyard at dusk, crane with an electromagnet, towers of crushed cars, welding sparks, rust orange against steel blue. |
| `assets/images/arenas/hexwood-glade.png` | **Hexwood Glade** | Crooked witch-forest clearing, gnarled trees with lantern eyes, drifting will-o-wisps, a cauldron's green glow, deep plum and toxic green. |
| `assets/images/arenas/tidal-wreck.png` | **Tidal Wreck** | Broken galleon on a reef, tide pools, treasure spilling from a cracked hull, storm light breaking through clouds, teal and driftwood grey. |
| `assets/images/arenas/lantern-festival.png` | **Lantern Festival** | Night festival over a river, hundreds of floating paper lanterns rising, fireworks blooming far away, warm crimson and gold on indigo. |
| `assets/images/arenas/magma-lift.png` | **Ion Lift** | Vertical obsidian mineshaft with industrial elevator rails, cold blue plasma glow rising from below, crackling ion arcs, warning stripes, steam vents, black rock and electric cyan. |
| `assets/images/arenas/cloud-nine.png` | **Cloud Nine** | Heavenly daytime skyscape of fluffy cumulus terraces, marble column fragments, doves, rainbows, white and sky-blue with gold trim. |
| `assets/images/arenas/static-circus.png` | **Static Circus** | Inside a big-top circus tent at night, striped canvas, trapeze and rings, spotlight beams crossing, popcorn confetti, red and cream palette. |
| `assets/images/arenas/voidfall.png` | **Voidfall** | Shattered islands of obsidian drifting in a star-swallowing violet void, a distant black hole with an accretion ring, unreal purples and cyans. |

## 5. Card icons (52 images, optional but recommended)

Transparent PNG 256×256, single centered emblem. Base prompt: *Flat vibrant game
ability icon, single bold emblem, thick outline, slight 3D pop, transparent
background, no text.* Files go in `assets/images/cards/<id>.png`.

### Common
| File | Card | Emblem prompt |
|---|---|---|
| `cards/bubblegum-rounds.png` | Bubblegum Rounds | Pink bubblegum bullets bursting from a candy wrapper. |
| `cards/cannonball.png` | Cannonball | Huge iron sphere with a lit fuse and motion lines. |
| `cards/featherweight.png` | Featherweight | Single glowing feather with speed streaks. |
| `cards/stone-soup.png` | Stone Soup | Steaming pot with a smiling boulder inside. |
| `cards/hair-trigger.png` | Hair Trigger | Stylized trigger with a coiled spring and spark. |
| `cards/speed-loader.png` | Speed Loader | Revolver cylinder with clock hands spinning fast. |
| `cards/grasshopper.png` | Grasshopper | Green spring-legged grasshopper mid-leap. |
| `cards/longshot.png` | Longshot | Arrow-straight tracer line across a distant target. |
| `cards/brick-wall.png` | Brick Wall | Sturdy brick wall with a proud little face. |
| `cards/buckshot-buttons.png` | Buckshot Buttons | Fan of colorful buttons spraying outward. |
| `cards/moon-shoes.png` | Moon Shoes | Bouncy spring shoes leaving a dotted arc to a crescent moon. |
| `cards/sticky-soles.png` | Sticky Soles | Boot sole with pink gum strings stretching. |
| `cards/tailwind.png` | Tailwind | Swirling wind gust pushing a small paper plane. |
| `cards/big-bore.png` | Big Bore | Comically oversized gun barrel with a tiny stand. |

### Uncommon
| File | Card | Emblem prompt |
|---|---|---|
| `cards/ricochet-romance.png` | Ricochet Romance | Bullet path bouncing between two hearts. |
| `cards/wasp-venom.png` | Wasp Venom | Angry wasp with a dripping green stinger. |
| `cards/cinder-shot.png` | Cinder Shot | Bullet trailing a ribbon of flame. |
| `cards/permafrost.png` | Permafrost | Snowflake locked in a cube of blue ice. |
| `cards/magnet-fingers.png` | Magnet Fingers | Horseshoe magnet bending a bullet's dotted path. |
| `cards/popcorn-payload.png` | Popcorn Payload | Popcorn kernel exploding into a starburst. |
| `cards/leech-lunch.png` | Leech Lunch | Cute leech with a bib and a red droplet. |
| `cards/double-dutch.png` | Double Dutch | Two crossed bullet trails forming an X. |
| `cards/rocket-skates.png` | Rocket Skates | Roller skate with rocket flames. |
| `cards/echo-chamber.png` | Echo Chamber | Concentric shield rings with a repeat symbol. |
| `cards/bodyguard.png` | Bodyguard | Shield emitting a radial shockwave. |
| `cards/panic-pedals.png` | Panic Pedals | Sweating heart sprinting on tiny legs. |

### Rare
| File | Card | Emblem prompt |
|---|---|---|
| `cards/drill-rounds.png` | Drill Rounds | Spiral drill-tipped bullet punching through a plate. |
| `cards/chain-lightning.png` | Chain Lightning | Lightning bolt forking between three orbs. |
| `cards/thorn-jacket.png` | Thorn Jacket | Spiked vest with rose thorns. |
| `cards/phoenix-feather.png` | Phoenix Feather | Burning golden feather rising from a spark. |
| `cards/glass-cannon.png` | Glass Cannon | Translucent glass cannon with a crack of light. |
| `cards/comet-trail.png` | Comet Trail | Comet growing larger along its own tail. |
| `cards/shrapnel-burst.png` | Shrapnel Burst | Shell splitting into glowing fragments. |
| `cards/field-medic.png` | Field Medic | First-aid pouch sprouting a healing vine. |
| `cards/berserkers-blood.png` | Berserker's Blood | Cracked heart glowing furious red. |
| `cards/hummingbird.png` | Hummingbird | Hummingbird with blurred wings and needle beak. |

### Epic
| File | Card | Emblem prompt |
|---|---|---|
| `cards/cluster-bomb.png` | Cluster Bomb | Bomb bursting into a ring of smaller bomblets. |
| `cards/black-mamba.png` | Black Mamba | Sleek black snake coiled around a dart. |
| `cards/juggernaut.png` | Juggernaut | Massive armored sphere cracking the ground. |
| `cards/warp-block.png` | Warp Block | Shield dissolving into a teleport portal. |
| `cards/railgun.png` | Railgun | Electromagnetic rail with a hyper-velocity slug. |
| `cards/storm-caller.png` | Storm Caller | Storm cloud hand hurling forked lightning. |
| `cards/guardian-halo.png` | Guardian Halo | Golden halo catching a falling heart. |
| `cards/bullet-ballet.png` | Bullet Ballet | Bullets in a pirouette spiral formation. |

### Legendary
| File | Card | Emblem prompt |
|---|---|---|
| `cards/supernova.png` | Supernova | Star detonating in gold and white rings. |
| `cards/golden-gun.png` | Golden Gun | Ornate golden pistol with a gleaming spark. |
| `cards/dragons-hoard.png` | Dragon's Hoard | Ammo belt overflowing from a treasure chest. |
| `cards/grim-harvest.png` | Grim Harvest | Elegant scythe reaping glowing life-wisps. |
| `cards/crown-of-storms.png` | Crown of Storms | Royal crown crackling with lightning arcs. |

### Mythic
| File | Card | Emblem prompt |
|---|---|---|
| `cards/starfall-protocol.png` | Starfall Protocol | Meteor volley streaking down from a targeting reticle. |
| `cards/event-horizon.png` | Event Horizon | Black hole bending light and small objects inward. |
| `cards/chronoshift.png` | Chronoshift | Shattered hourglass with time flowing backward. |

---

**Total: 109 images** (2 branding + 6 frames + 24 characters across two rounds + 25 arenas + 52 card icons).
Priority order if generating in batches: characters → rarity frames → arenas → logo → card icons.

---

## 6. Round 2 — Characters (12 images, indie-badass roster)

A second wave of fighters that leads the roster: sharper, moodier, more dangerous —
neon-noir and wasteland grit in the spirit of indie brawlers, while keeping the
exact same format as Round 1 (**round ball body, tiny nub arms, signature weapon
protruding to the right, thick outline, transparent PNG 512×512, body sphere
centered at ~80% of frame height, weapon extends into the right margin**).

Round 2 base prompt: *Round ball-shaped cartoon fighter with an indie-badass
attitude — moody, cool, battle-worn — big glossy body sphere, tiny nub arms,
expressive eyes, signature weapon protruding to the right, thick outline, flat
saturated colors with one neon accent, subtle scuffs and scratches, transparent
background.*

Same split-parts request as §3: also export `<id>_body.png`, `<id>_weapon.png`
and `<id>_arm.png` on the identical canvas into
`assets/images/characters/render/` — arms facing right, shoulder end left, hand
end right, so they attach to the body and ride the weapon.

| File | Character | Prompt additions |
|---|---|---|
| `assets/images/characters/canonical/vex.png` | **Vex** — the neon reaper | Deep-magenta ball with a blazing neon-pink mohawk, one eye replaced by a pale X scar, deadpan stare, wicked scythe-gun with a curved glowing blade. |
| `assets/images/characters/canonical/rook.png` | **Rook** — the wasteland warden | Gunmetal-grey ball with a riveted rust-orange armor plate bolted over its crown, black eyepatch over one eye, weary glare, brutal double-barrel sawn-off shotgun. |
| `assets/images/characters/canonical/jinx.png` | **Jinx** — the glitch witch | Near-black navy ball flickering with cyan-and-magenta glitch shards at its edges, square pixelated cyan eyes, mischievous static grin, corrupted pixel-cannon leaking datamosh artifacts. |
| `assets/images/characters/canonical/diesel.png` | **Diesel** — the road king | Oxblood-leather ball with a chrome spiked collar-band, scuffed aviator goggles pushed up, oil smudge on one cheek, roaring twin-exhaust flame-thrower with heat shimmer. |
| `assets/images/characters/canonical/nyx.png` | **Nyx** — the void dancer | Dark-indigo ball wrapped in a star-speckled hood casting its face in shadow, two pale violet eye-slits glowing from the dark, sleek twin-dagger launcher with one blade mid-eject. |
| `assets/images/characters/canonical/saber.png` | **Saber** — the last ronin | Deep-crimson ball with a tight black topknot and a pale scar across one stern eye, unshakable calm, elegant katana held blade-forward with a bone-white wrapped hilt. |
| `assets/images/characters/canonical/havoc.png` | **Havoc** — the demolition artist | Khaki ball wrapped in black-and-yellow hazard tape with a lit fuse sprouting from the top, one wide manic eye and one squinting, too-happy grin, chunky drum grenade launcher. |
| `assets/images/characters/canonical/wraith.png` | **Wraith** — the static ghost | Pale sage-grey semi-translucent ball with tattered wisps trailing off its crown, two hollow black eyes, faint spectral drip, long ethereal rifle glowing mint-green at the seams. |
| `assets/images/characters/canonical/blitz.png` | **Blitz** — the arc runner | Electric-yellow ball with two swept-back blue lightning horns, fierce race-day eyes, speed-scuffed outline, humming coilgun with charged blue rings along the barrel. |
| `assets/images/characters/canonical/fang.png` | **Fang** — the stray | Steel-blue ball with sharp battle-notched wolf ears, narrow feral red eyes, one visible fang, chain-blade launcher with a length of chain whipping behind it. |
| `assets/images/characters/canonical/onyx.png` | **Onyx** — the magma golem | Obsidian-black stone ball cracked with glowing magma seams, jagged rock shards for a crown, slow-burning ember eyes, massive rock-knuckled gauntlet cannon. |
| `assets/images/characters/canonical/riot.png` | **Riot** — the paint prophet | Dark-teal ball wearing a backwards cap and a paint-splattered bandana over its mouth, defiant eyes, neon-pink paint drips, rapid-fire spray-paint gatling with a rainbow mist. |

## 7. Card art panels (52 images) — delivered

512×384 full-bleed painted scene per card at `assets/images/cards/art/<id>.png`,
one per card in `js/cards.js`, so a draft hand is recognised instead of read.
Base prompt: the global style guide plus each card's name, tagline, and effect
as the scene. Delivered 2026-08-16 straight to the canonical path (opaque
full-bleed panels — no keying needed). Display wiring is tracked in
PROJECT-STATE.md.

## 8. Arena backdrop refreshes (6 images) — delivered

1600×900 repaints for the arenas whose silhouette changed most in the
level-design pass (AUDIT.md §5): Neon Skyline, Koi Temple, Tidal Wreck,
Midnight Library, Lantern Festival, Aurora Summit. Each prompt carried
geometry notes (alley chasm, torii span, hull mass, central bookcase, pagoda,
left-peak ridge) so the painting agrees with the play space. Delivered
2026-08-16, replacing the originals at `assets/images/arenas/<id>.png`.

## 9. Audit card art — Lowrider, Aegis Bubble, Pocket Void (delivered 2026-08-17)

The three cards the power-card audit added (AUDIT.md §6). Both shapes each:
emblem `assets/images/cards/<id>.png` 256×256 transparent, art panel
`assets/images/cards/art/<id>.png` 512×384 full-bleed. Verified on intake:
emblems are RGBA with fully transparent corners (no keying needed), scenes are
512×384 opaque as intended.

| Card | Files | Subject |
|---|---|---|
| **Lowrider** (uncommon) | `lowrider.png` + `art/lowrider.png` | A bullet skimming along the ground hugging the terrain — a glowing round tracer hovering just above a rolling floor line, kicking up a little dust trail behind it, dipping over the lip of a ledge. Cool teal/green energy. |
| **Aegis Bubble** (rare) | `aegis-bubble.png` + `art/aegis-bubble.png` | A translucent cyan energy bubble wrapped around a small round fighter silhouette, a bullet splashing harmlessly against its rim in a hard ring of light. Cyan/ice-blue glow on dark. |
| **Pocket Void** (epic) | `pocket-void.png` + `art/pocket-void.png` | A tiny black hole torn open in mid-air at a bullet's point of impact — swirling violet accretion arc, debris and sparks bending into it, space warping at the edges. Deep purple/magenta. |


## 10. The big card/bullet/effect delivery (delivered 2026-08-17)

115 files landed in one drop and were filed with the new `npm run intake-art`:
**34 card emblems + 34 card scenes** (completing the set — every one of the 87
cards now has both shapes), **29 painted bullets**, and **18 effect sheets**.
16 of them arrived on a white or black backdrop and were keyed to transparency
on intake; the delivered originals are kept in `assets/images/archive/`.
Card scenes are exempt from keying — they are full-bleed paintings and are
meant to be opaque.

Skylight was renamed **Breakthrough** at the same time, so its three files were
renamed to match (`cards/breakthrough.png`, `cards/art/breakthrough.png`,
`bullets/breakthrough.png`).

The prompts these were made from:

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
| **Breakthrough** (epic) | `breakthrough.png` + `art/breakthrough.png` | A perfectly round hole blasted clean through a stone platform, daylight streaming down through it, a small round fighter dropping through the gap feet-first with rubble still falling. Dust-gold light shaft on cool stone. |
| **Encore** (epic) | `encore.png` + `art/encore.png` | A round fighter taking a stage bow while behind them a ghostly translucent copy of their last shot re-fires itself, red curtain backdrop. Stage crimson and spotlight blue-white. |

---


## 2. Bullet art (28 cards × 1 image = 28 files) — NEW

Bullets are drawn procedurally today (a tinted round plus per-effect tells).
These 28 cards change what the bullet *looks like*, so each can take a painted
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
| Black Mamba | `black-mamba.png` | A coiled black snake striking head-first — flat viper head, bared fangs, venom bead at the tip, body tapering into a short curved tail. Matte black scales with green underbelly glow |
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
| Breakthrough | `breakthrough.png` | A ring-shaped cutter round, hollow centre, sparking edge |
| Railgun | `railgun.png` | A long dark sabot slug wrapped in blue induction rings |
| Puppet Strings | `puppet-strings.png` | A round trailing two fine glowing marionette threads |
| Boomerang | `boomerang.png` | A small curved wooden boomerang round |
| Stink Bomb | `stink-bomb.png` | A round glass flask of sloshing green muck |
| Pocket Void | `pocket-void.png` | A pure black sphere with a violet event-horizon rim |
| Golden Gun | `golden-gun.png` | A gleaming solid-gold bullet, engraved band |


## 3. Effect art (19 files) — NEW

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
| `bore-hole.png` | 128×128 | A scorched round hole decal: dark ring, cracked stone lip, embers — laid over terrain where Breakthrough punches through |
| `dust-puff.png` | 128×128 | A pale drifting dust/rubble puff for impacts and bore-through |
| `stun-stars.png` | 192×96 | Three cartoon stars circling, for a dazzled fighter |
| `muzzle-flash.png` | 128×128 | A short bright star-burst flash, drawn pointing right |
| `angel.png` | 256×256 (52×60 drawn) | A tiny cartoon guardian angel seen head-on — round head, simple robe, two spread feathered wings, its own little halo above. Warm cream-gold on transparent; it rises and fades when Guardian Halo saves you, so keep it a clean readable silhouette |



## 11. Effect finishers and two re-arts (delivered 2026-08-17)

The six files that closed the list. Two of them completed the effect sheets —
Guardian Halo's rising angel and Lemonade Stand's glass had been drawing
procedurally since those cards shipped. The other four **replaced** art that had
gone stale under a rename: the card formerly called Second Serve was still a
tennis serve, and the one formerly called Mosh Pit still showed a small blade on
an orbital track after the blade stopped orbiting.

All six arrived already transparent (scenes excepted, which are meant to be
opaque), so `npm run intake-art` filed them with nothing to key and nothing to
archive.

The prompts these were made from:

### The last two effect sheets

- **Path:** `assets/images/fx/<name>.png`

| File | Size | Subject |
|---|---|---|
| `angel.png` | 256×256 (drawn ~52×60) | A tiny cartoon guardian angel seen head-on — round head, simple robe, two spread feathered wings, its own little halo above. Warm cream-gold on transparent; it rises and fades when Guardian Halo saves you, so keep it a clean readable silhouette |
| `lemonade.png` | 256×256 (drawn ~106×106) | A tall glass of cloudy lemonade seen head-on — ice cubes, a pink-and-white striped straw, a lemon wedge on the rim, a couple of bubbles. Bright lemon yellow on transparent. It sits faded into the middle of Lemonade Stand's heal zone, so it must read at low opacity: strong shapes, dark outline, no fine detail |

---

### Second Defence — re-art after the rename

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

### Sawblade — re-art after the rename

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
