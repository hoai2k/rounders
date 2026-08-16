# Image Generation Requests — Rounders Redesign

Every image the redesigned game can use. The game ships with procedural fallbacks,
so images can be generated and dropped in incrementally — any missing file is fine.

## Global style guide (prepend to every prompt)

> Vibrant flat 2D indie game art, thick dark outlines, soft inner gradients, bold
> saturated colors, playful and energetic, clean silhouette, no text, no watermark.
> Consistent with a colorful physics party-brawler in the spirit of ROUNDS.

## File conventions

- Drop files at the exact paths below (create folders as needed).
- **Backgrounds:** transparent is preferred, but a flat backdrop is fine — drop
  those files in `intake/` and run `npm run intake` (or use
  `/workbench/intake.html`), which keys the backdrop out, writes a transparent
  PNG to the right path, and keeps the delivered file in `art-source/`. Use a
  backdrop color the art does not contain (magenta `#ff00ff` for cool art, green
  `#00ff00` for warm art) and keep it perfectly flat — no gradient, no shadow.
- **Characters:** transparent PNG, 512×512. The **body sphere** must be centered with its diameter ~80% of frame height; the weapon extends into the right margin (the game centers the frame on the body's physics center).
- **Arena backdrops:** PNG or JPG, 1600×900, painterly background only (no platforms,
  no characters) — the game draws platforms/hazards on top, so keep the middle third
  relatively calm and keep contrast low enough that bright players read against it.
- **Card frames:** transparent PNG, 600×840, ornate border with empty center.
- **Logo:** transparent PNG, 1200×400.

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
