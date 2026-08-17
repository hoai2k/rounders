# Rounders — Redesign Audit

Four independent audit passes (cards/balance, arenas/variety, characters/personality,
engine+UI correctness) were run by review agents against the redesigned game.
This document records the findings and what was done about each.

Legend: ✅ fixed · 📝 accepted with rationale · 🔭 deferred (noted for future work)

---

## 1. Card set (balance · variety · clarity · personality)

Baseline math used throughout: base kit is 44 damage, 100 HP, 3-round magazine,
0.26s fire delay, 1.12s reload → **80.5 sustained DPS**.

| # | Finding | Resolution |
|---|---|---|
| C1 | **CRITICAL** — Explosive bullets double-dipped: the direct-hit victim also took the full splash, making Popcorn Payload (~+50% effective damage for a −10% "cost") stronger than rare damage cards. | ✅ `explodeBullet` now skips players the bullet already hit; splash is purely area denial. |
| C2 | **CRITICAL** — Multiplicative damage stacking: Cannonball (×1.45, common) + Glass Cannon (×1.75) one-shot 100 HP; Golden Gun × Bullet Ballet = 6.6× point-blank volleys. | ✅ Cannonball reduced to ×1.3; Golden Gun capped at ×2 when firing multiple pellets. Some big stacking remains **by design** — ROUNDS-style games want scary late-game builds. 📝 |
| C3 | **CRITICAL** — Fire-rate cards were traps: with a 3-round magazine, reload dominates the DPS cycle, so Hair Trigger gave +7.5% DPS vs Speed Loader's +28%, and rare Hummingbird was a net −8% DPS. | ✅ Hair Trigger now also gives +1 ammo (≈+24% DPS); Hummingbird gives +2 ammo (≈+25% DPS plus the speed). |
| C4 | Rarity inversion: Phoenix Feather (rare, revive at 50%) clearly outclassed Guardian Halo (epic, survive at 1 HP). | ✅ Guardian Halo now leaves you at 25% HP. |
| C5 | Lifesteal descriptions overclaimed — healing only procs on direct bullet damage, not explosions/DoTs/chains. | ✅ Leech Lunch and Grim Harvest reworded to "bullet damage". |
| C6 | Cannonball overtuned for common (2-hit kill + 102 DPS). | ✅ Folded into C2 (×1.3). |
| C7 | Buckshot Buttons (common, 2.1× total payload) ≈ Bullet Ballet (epic, 2.2×). | ✅ Buckshot now −40%/pellet (1.8×) with wider spread. |
| C8 | Chain Lightning and pierce cards were dead picks in 2-player lobbies. | ✅ Duel fallback added: with no third player, the arc doubles back on the victim for 25%. Card text updated. Pierce still shines with bounces/shards. 📝 |
| C9 | Wasp Venom poke value too high (one hit ≈ 79 total damage for −8%). | ✅ Now −15% damage, and the no-stacking rule is stated on the card. |
| C10 | Echo Chamber description promised more than the engine does (only the parry window repeats, not dash/warp/nova). | ✅ Reworded to "your parry window re-opens". |
| C11 | Stone Soup and Brick Wall were the same card twice. | ✅ Brick Wall reworked into the set's missing mechanic: **−40% knockback taken** (new `kbResist` stat in the engine). |
| C12 | Sticky Soles / Tailwind imperceptible (+30% accel inside a clamp is barely visible). | ✅ Buffed to +50% accel/+35% brake and +50% air control. A rare+ movement card is a good future add. 🔭 |
| C13 | Featherweight text implied air-only speed; the stat is global. | ✅ Reworded. |
| C14 | DoTs/thorns bypass blocking silently. | ✅ Thorn Jacket now says "Thorns ignore blocks". DoT-through-block kept as a deliberate counter to turtling. 📝 |
| C15 | Four literal names in a pun-rich set. | ✅ Renamed: Chain Lightning → **Chain Letter**, Cluster Bomb → **Party Favor**, Warp Block → **French Exit**; Stone Soup tagline now "Mostly rocks. Somehow filling." Glass Cannon kept — the trope name *is* the joke. 📝 |

## 2. Characters (distinctiveness · rendering · personality · pipeline)

| # | Finding | Resolution |
|---|---|---|
| P1 | **CRITICAL** — Pip and Sprocket shared hue 28° with matching brown weapons — indistinguishable at 27px. | ✅ Sprocket recolored to dark rust copper `#b5642c` with a steel-grey rivet gun. |
| P2 | **CRITICAL** — All UI portraits (lobby/HUD/draft) clipped the weapon off the right edge. | ✅ Portrait origins shifted left and radii reduced; longest weapon (Duke's rifle) now fits all three canvases. |
| P3 | Shade's accent-on-accent face: eyes vanished into the headband when aiming up. | ✅ Headband now uses Shade's dark tone; violet eyes pop against it. |
| P4 | Weapons rotated but never mirrored — asymmetric details rendered upside-down when aiming left, unlike image mode. | ✅ `drawWeapon` now flips its local Y when aiming left, matching image-mode semantics. |
| P5 | Gruff/Fizz hue collision (~90°). | ✅ Gruff darkened to mossy olive `#647d3f`. |
| P6 | Glacia/Shade/Luna weapons shared one silhouette (rod + triangle). | ✅ Frost rifle now ends in a 3-spike crystal cluster; prism got a diamond crystal muzzle; kunai keeps the lone triangle. |
| P7 | Duplicate character picks allowed; `freeCharIndex` could still collide. | ✅ Lobby cycling now skips taken characters; random assignment picks from the free pool. |
| P8/P9/P10 | Image prompts drifted from procedural identity (Shade's eye count/body color, Luna's bow vs gun) and the art spec centered the wrong thing. | ✅ `image-requests.md` updated: Shade = slate-grey with two slit eyes, Luna = prism blaster with diamond muzzle, spec now centers the *body sphere* at 80% height with the weapon in the right margin. |
| P11 | Luna's blurb simile was inverted ("like a lamp"). | ✅ "Drawn to victory like it's the last lit lamp." |
| P12 | Duke's title restated his name. | ✅ Now "the dueling dandy". |

## 3. Arenas (playability · variety · mechanics · personality)

Geometry was verified numerically: max jump rise is 184px (880²/2·2100), riders
need 54px of headroom above a moving platform, bounce apex = power²/4200.

| # | Finding | Resolution |
|---|---|---|
| A1 | **CRITICAL** — Rustyard's crane mover swept *through* the top platform and scraped riders off for half its path. | ✅ Crane now sweeps left, fully clear of static geometry. |
| A2 | **CRITICAL** — Voidfall's teleporters were 2px out of jump reach at 0.8 gravity, and exited over the void. | ✅ Moved to (260,560)/(1340,560), directly above the side platforms. |
| A3 | **CRITICAL** — Five arenas had 190px first-tier jumps that miss max jump height by 6px (the worst kind of "looks jumpable"). | ✅ All first tiers at y=640 moved to y=655 (Glimmer Hollow, Koi Temple, Lantern Festival, Static Circus, Midnight Library bookcases); dependent spawns adjusted. |
| A4 | Bounce pads placed under platform overhangs head-bonked instead of launching (Glimmer's marquee pad capped at 35% of its height). | ✅ Pads relocated to overhang-free floor edges in Glimmer Hollow, Verdant Overgrowth, Sugar Rush, and Static Circus (where they now read as wall-cannons). |
| A5 | Saltwind's gondola scraped riders off under the 500-tier platforms (18px squeeze). | ✅ Gondola lowered to y=585 — riders clear both undersides. |
| A6 | Ion Lift's elevators carried riders inside the 430 center platform above a full-floor kill pit. | ✅ Travel shortened to ±180; riders keep 10px of headroom. |
| A7 | Neon Grid spawned all four players on conveyor belts (idle players slid off in <1s); Neon Skyline's upper spawns too. | ✅ Neon Grid: static floor spawns, belts stay on the tiers. Neon Skyline: 420-tier made static. |
| A8 | Eight arenas shared essentially one layout (floor + 2 sides + center + 2 mids + top, within ±40px). | ✅ The three emptiest redesigned: Prism Caverns → asymmetric crystal staircase with a tall column; Hexwood Glade → split floor over a void gap with a portal escape route; Sugar Rush → staggered candy hills. Others differentiated by features. Remaining similarity accepted as "classic arena" variants. 📝 |
| A9 | Ember Foundry and Magma Lift were visually the same arena (same backdrop, weather, near-identical palette). | ✅ Magma Lift rethemed as **Ion Lift** — obsidian/cold-plasma palette, cyan accents, sparkle weather; image prompt updated. |
| A10 | Feature usage lopsided; Thunderhead Perch lost its identity with hazards off. | ✅ Thunderhead now also has storm wind gusts. Syrup/tide/lightning stay single-arena signatures by design. 📝 |
| A11 | Face-to-face spawns 160–200px apart on shared platforms (Voidfall, Bonepit). | ✅ Spread to separate platforms / floor positions. |
| A12 | Floor teleporters couldn't be walked into (portal center 43–53px from a grounded player's center vs a 40px trigger). | ✅ Portals raised to y=775 (walk-in range); Hexwood's vertical pair now exits above the action. |
| A13 | Cogwork Spire's side tiers were entirely mover-gated (elevator-camping). | ✅ Static stepping stones added at both sides. |

## 4. Engine & UI (correctness · performance · polish)

| # | Finding | Resolution |
|---|---|---|
| E1 | **CRITICAL** — Lightning strikes were scheduled with wall-clock `setTimeout`: they leaked into the *next round on a different arena* (with an unconditional knockback), were silently eaten by pausing, and could fire into a fresh match. | ✅ The warn field now doubles as the strike timer, resolved in `updateFields` on game time — pauses hold it, `resetRound` cancels it, and the knockback respects spawn grace. |
| E2 | **CRITICAL** — Starting or rematching with a controller's Start button instantly paused the new match (held button edge-triggered pause on frame one). | ✅ Inputs are primed and edges cleared right after match start. |
| E3 | **CRITICAL** — The winner screen was a soft-lock: no path back to the menu, and a controller disconnect could make rematch permanently impossible. | ✅ Back/Escape now exits to the menu from the winner screen; rematch rebuilds the lobby from the match lineup when disconnects shrank it. Dead `restoreLobbyFromPlayers` removed. |
| E4 | Starfall Protocol fired only 3 of its 5 meteors — the top-of-world cull deleted the high spawners the same frame. | ✅ Meteors exempted from the −160 cull line (−420 for meteors). |
| E5 | Frame-rate-dependent physics: per-frame drag, mover carry hard-coded to 1/60s, toast timer per-RAF. | ✅ Drag is now `pow(drag, dt·60)`; mover deltas use the real step; toasts use real dt. |
| E6 | `echoBlock` used a wall-clock `setTimeout` (same leak class as E1). | ✅ Converted to a game-time `echoTimer` ticked in `updatePlayers`. |
| E7 | `activePlatforms` rebuilt (cloning every platform) up to 5×/frame with bots. | ✅ Memoized per game-time tick; all callers share one list. |
| E8 | 4-player draft could clip player 1's hand off-screen unreachably (flex centering + overflow). | ✅ Draft column now top-aligns with auto margins; hands scroll horizontally on narrow screens. |
| E9 | Teleporter ping-pong: standing on a destination pad re-teleported every 0.9s forever. | ✅ Pads re-arm only after the player leaves them. |
| E10 | The opaque HUD covered the bottom 80px of the arena — exactly where floors, tide, and grounded fights are. | ✅ The world now letterboxes above a reserved HUD strip during gameplay. |
| E11 | A disconnected controller bricked its player permanently. | ✅ Reconnecting a pad re-attaches it to the orphaned player mid-match. |
| E12 | Bounce pad × gravity `sqrt` scaling made bounce height identical on every arena, cancelling the low-gravity theme. | ✅ Scaling removed — low-gravity arenas now launch dramatically higher. |
| E13 | Keys latched forever on window blur (alt-tab while running). | ✅ `blur` clears all key state. |
| E14 | `color-mix()`/`backdrop-filter` had no fallbacks for older engines (couch-gaming TVs/consoles). | ✅ Solid rgba fallback declarations added before every `color-mix` use; `-webkit-backdrop-filter` added. |
| E15 | UX bundle: no bot removal, no draft timeout for AFK humans, pad-only lobbies couldn't pause with Escape, `W` didn't navigate menus up, no `:focus-visible`. | ✅ All fixed: ✕ remove button on bot slots, 30s draft auto-pick with visible countdown, global Escape/P pause, `W` navigates up, focus-visible outlines added. |

---

## 5. Level design vs ROUNDS (terrain language · destructibility · verticality)

A dedicated pass comparing the 25 arenas against how ROUNDS maps actually play.
ROUNDS levels are small but *dense with interactions*: walls you climb and
wall-kick between, physics boxes you shove and stack, objects hanging on ropes
you can shoot down, destructible chunks, perches with sightline advantages, and
strongly varied / asymmetric silhouettes. Our arenas had personality in palette
and hazards, but the **terrain vocabulary was a single word: the floating
platform**. Every level was "floor + 5–8 thin horizontal ledges", horizontally
mirrored, with nothing to shoot except the other player.

### Systemic findings

| # | Finding | Resolution |
|---|---|---|
| L1 | **CRITICAL** — The engine gained ROUNDS-style wall jumping, but no arena offered a wall. The mechanic was only reachable at the two screen edges. | ✅ Every arena now has climbable vertical structure where it fits the theme: towers, pillars, monoliths, bookcases, masts, tree trunks, mesa faces, poles (see per-arena list). |
| L2 | **CRITICAL** — Zero destructible or physics-reactive terrain; bullets only ever hit players or dead geometry. | ✅ Three new engine systems, all per-round: **breakable platforms** (`breakable: hp` — crack visibly, shatter, telegraphed with a stitched accent outline), **chain-hung platforms** (`hung[]` — cut every chain with bullets and the platform drops, then settles where it lands), and **crates** (`crates[]` — pushable, climbable, stackable, shootable; knocked around by hits and explosions; float on tides). |
| L3 | Layouts were almost all left-right mirrors of the same stack; no perches, no overhangs, no high-ground worth fighting over. | ✅ Redesigns favor asymmetry (Aurora Summit's staircase ridge, Prism's offset monoliths, Rustyard's uneven junk piles) and true perches (tower caps, crow's nest, torii beam, lightning-rod plate). |
| L4 | Explosions ignored the arena entirely. | ✅ Explosive splash now damages crates and breakable platforms in radius. |
| L5b | **CRITICAL (follow-up)** — The first draft of the rebuild capped almost every tower with a *wider* plate ("narrow column + cap"), used in 20 of 25 arenas. That overhang is a ceiling, not a perch: a wall-climber rises up the column face and bonks the cap's underside, so the towers added for wall-jumping were mostly unclimbable — 36 walls blocked on both faces. | ✅ Design rule adopted and written into `js/levels.js`: **no lips.** A tower is one rectangle whose own top is the perch (widened where a roomier perch is wanted), or it steps like a pyramid with each tier no wider than the one below. Koi Temple's torii beam and Cloud Nine's propped ledges keep a deliberate overhang on the inner face only, with the outer face flush so there is always one clean way up. Lantern Festival's pagoda became a stepped pyramid; Ion Lift's under-platform pylon became two flush service pylons; Rustyard's junk piles and four incidental ledges were shifted clear. |
| L5 | Nothing in a round ever changed the map (movers/phase loops aside), so long rounds played identically to their first ten seconds. | ✅ Dropped chain platforms, shattered floors, and shoved/broken crates persist for the rest of the round and reset for the next — rounds now develop. |

### Per-arena changes

Every arena keeps its id, palette, backdrop art, and signature mechanic; the
geometry got a second draft. Jump math from §3 still holds (max rise 184px);
anything taller than that is deliberately gated behind a wall-kick, a crate
step, a bounce pad, or an elevator.

| Arena | What's new |
|---|---|
| Neon Skyline | Split rooftops with a deadly alley between them; climbable towers with cap perches at both ends; hung neon sign over the gap; AC-unit crates. |
| Ember Foundry | Furnace towers to scale; crane platform on two chains that drops onto the catwalks to bridge the lava; ingot crates. |
| Frostbite Observatory | Observatory tower with a dome perch; breakable icicle shelf; ice-block crates that skate on the ice floor. |
| Verdant Overgrowth | Two ruined columns of uneven height; vine-hung top platform; stone crates between the bounce pads. |
| Orbital Drift | Central solar mast for slow-motion wall-kicks; two single-chain cargo pods; floating supply crates. Low-g cuts feel deliberate. |
| Sirocco Canyon | Mesa-edge walls; the ravine is now crossed by a **breakable plank bridge**; wind-side crates. |
| Saltwind Boardwalk | Pier posts rising out of the water with perch caps; string-light rig hung on chains; stacked cargo crates on the docks. |
| Glimmer Hollow | Stalagmite towers; two stalactite platforms hanging from the dark on chains; spore-pod crate. |
| Cogwork Spire | A spire climbable straight out of the gear pit; breakable service panels; gear crates. |
| Prism Caverns | Second offset monolith (wall-kick alley between the two); breakable crystal panes that ricochet bullets chew through; crystal crate. |
| Sugar Rush | Gingerbread towers (two heights); licorice-hung platform; breakable cookie shelf; gumdrop crates. |
| Thunderhead Perch | Lightning-rod tower — the best perch on the map is the one the storm targets. |
| Midnight Library | Central bookcase wall dividing the room; chandelier on two chains; book crates; right-side shelf step. |
| Koi Temple | Full torii gate spanning the pond — climbable pillars, duel-able beam — plus a temple bell hung beneath it that drops onto the bridge. |
| Neon Grid | Central data pillar; two vertical **breakable firewall panels** as destructible cover; data-cube crates. |
| Bonepit Arena | Colosseum walls with spectator perches; hanging cage; bone crates. |
| Aurora Summit | Fully asymmetric now: staircase ridge to a peak on the left, sheer ice wall at the cliff, low route right; ice crates. |
| Rustyard | Climbable junk piles (uneven); wrecked chassis hanging from the crane on chains; a rusted-through breakable platform; four crates including a stack. |
| Hexwood Glade | Two tree trunks with canopy perches; wisp-hung platform; pumpkin crates. |
| Tidal Wreck | A whole wreck mid-channel: hull block, climbable mast, crow's-nest perch, breakable rigging plank — and crates that **float on the tide**. |
| Lantern Festival | Two-tier pagoda mid-river (base wall, two roofs); firework crates on the shores. |
| Ion Lift | Service pylon under the center platform for wall-kicks; two single-chain maintenance steps you can cut out from under someone. |
| Cloud Nine | Marble columns propping the islands; harp platform hung mid-sky. |
| Static Circus | High-wire poles with tiny top plates; **two single-chain trapezes**; prop crates. |
| Voidfall | Obelisks with cap perches on both islands; shard platform hung over the void (cut it and the void keeps it); breakable rune plates. |

### Follow-up pass: scale, ballistics, lob arenas

A second comparison round against ROUNDS, focused on proportions rather than
terrain vocabulary.

| # | Finding | Resolution |
|---|---|---|
| L6 | ROUNDS varies map scale — tight pillar boxes up to wide fields where the ball reads small (roughly 30–45 character-diameters of width). Every one of our arenas was exactly 1600×900 (~30 diameters at radius 27): the small end of the range, with zero variety. | ✅ Per-level playfield size (`size:{w,h}`, whole level always framed). Two tight arenas at 1460×820 (Glimmer Hollow, Sugar Rush — fighters ~10% bigger), fifteen standard, and eight grand from 1760×990 to 2000×1000 (fighters up to ~20% smaller): Neon Skyline, Orbital Drift, Sirocco Canyon, Thunderhead Perch, Bonepit Arena, Aurora Summit, Rustyard, Tidal Wreck. |
| L7 | **CRITICAL** — Lobbing didn't exist as a tactic. Default bullets (speed 980, gravity 1300) have a *maximum* ballistic range of v²/g ≈ 740px — under half an arena — so every duel collapsed to close range; bullet life (2.7s vs drag) also capped travel below a grand arena's width. ROUNDS defaults are faster with flatter drop, and arcing over cover is core play. | ✅ Speed 980→1180, gravity 1300→1050 (max arc ≈ 1330px — clears mid-map cover and reaches across, while flat shots still drop visibly), life 2.7→3.2s, bullet radius trimmed (7.8→7.1 at base damage). Bot lead and parry speed follow the stat automatically. |
| L8 | No arena offered ROUNDS' "open top" duel: empty sky above low cover, where the fight is arcs lobbed over the middle while both sides shuffle behind something. Most tops were capped by a high platform. | ✅ Seven explicit **lob arenas**, marked in `js/levels.js`: Sirocco Canyon (mesa tops + crates, wind), Thunderhead Perch (islands under a storm that punishes the one high perch), Bonepit Arena (floor duel over the hanging cage), Aurora Summit (peak rains arcs down onto the crated lowland), Orbital Drift (slow-motion low-g artillery), Tidal Wreck (shore-to-shore over the mast), Rustyard (over the crane); plus Koi Temple's sky opened above the gate beam. Their upper tiers were removed on purpose — the file says not to fill the sky back in. |
| L9 | Ammo pips arced perpendicular around the body, away from where the eye tracks the shot. | ✅ Pips now sit in a straight row just above the weapon barrel, on the screen-up side, running along the aim. |
| L10 | A freed hung platform fell straight down and froze flat on first touch — landing on one edge just parked it mid-air, and once down it was inert scenery. | ✅ Cut platforms are now **loose slabs**: real rigid bodies with rotation and a corner-contact solver, so they teeter off edges, tumble, and slap down. They stay live for the whole round — bullets kick and spin them (shoot under one to pop it up), explosions toss them, walking into one shoves it, they crush whoever they land on, carry whoever rides them, wall-kick off their leaning faces, knock crates around, and float as rafts in water and tide. They sleep when genuinely still and wake on any impulse. |

### Verified

- Static validator over all 25 arenas: spawns above ground and outside solids,
  chains inside their platform span and not passing through geometry, crates
  non-intersecting with ground below (or a tide to float on), mover sweeps
  clear of hung platforms and crates, and a **lip check** — every wall ≥100px
  tall must have at least one face with no overhang roofing its top, so the
  climb always ends on a perch. Both-faces-blocked is a hard failure; a single
  lipped face is reported as a note so it stays a deliberate choice (4 remain:
  the two torii pillars and the two Cloud Nine columns).
- Headless playthroughs (Playwright/Chromium) across sampled arenas: no JS
  errors. A purpose-built test arena confirmed the full loop live: chain shot →
  platform drops and settles; crates shoved across the floor by gunfire;
  breakable telegraph rendering.

## 6. Power-card audit (effectiveness · ROUNDS variety · stacking · salience)

A pass over all cards against three questions: does the effect *noticeably*
change gameplay, does the set cover ROUNDS' card vocabulary, and does drafting
a card twice compound it?

| # | Finding | Resolution |
|---|---|---|
| K1 | **CRITICAL** — Homing was imperceptible (the report that started this audit). It added ~500 px/s² of side pull to an ~1100 px/s bullet: over a typical 0.4s flight that bends the path ~25px, and the 650px acquisition range often meant no target at all. | ✅ Homing is now *steering*: the whole velocity vector rotates toward the target at a rate set by the stat (Magnet Fingers ≈ 90°/s — a visible curve; stacked with Black Mamba ≈ 3.5 rad/s — a heat-seeker), speed preserved, acquisition range 900px, and homing shots shrug off 60% of bullet drop so the curve isn't fighting gravity. Seeker ring + fins on the bullet. |
| K2 | No shield card — ROUNDS' Shield/Defender archetype was missing entirely. | ✅ **Aegis Bubble** (rare): +30 regenerating shield that absorbs before health and recharges 3.5s after the last hit. Fully additive per copy. Cyan bubble around the fighter, hard flash on absorb, break-burst when it pops, charge sliver above the health bar. |
| K3 | No ground-follow card. | ✅ **Lowrider** (uncommon): bullets drop to the nearest floor and skim it, following terrain over ledges and catching the next floor down — with a dust trail so the skim reads. |
| K4 | Black holes existed only as the Mythic active (Event Horizon), so the archetype was a lottery ticket. | ✅ **Pocket Void** (epic): every bullet break tears a brief vortex that drags players toward it; stacks grow the radius, pull, and duration. Reuses the black-hole field rendering. |
| K5 | ROUNDS-vocabulary coverage check for the user's list: more ammo (Bubblegum/Hair Trigger/Hummingbird/Dragon's Hoard ✓), more HP (Stone Soup/Brick Wall/Juggernaut ✓), faster shots (Longshot/Railgun ✓), multi-shot (Double Dutch/Buckshot/Bullet Ballet ✓), big bullets (Big Bore ✓, stacks multiplicatively), shields ✗, ground-follow ✗, black holes (mythic-only). | ✅ The three gaps became K2–K4. Set is now **55 cards** (14C/13U/11R/9E/5L/3M). |
| K6 | Stacking audit: every numeric effect verified to compound on a second copy (scripted apply-twice test over all 55 — no NaN, no non-stacking numerics). Golden Gun, kill-heal, and the three actives are deliberate booleans/replacements. | ✅ Rule written into the `js/cards.js` header; apply-twice check is part of the verification suite. 📝 |
| K7 | Salience: every bullet rendered as an identical circle regardless of build (golden glow and a faint homing ring aside), so a loaded build didn't look loaded. Note: the bar is *noticeable in gameplay*, not necessarily on the bullet — faster bullets should simply be visibly faster. | ✅ Effects that benefit from readability got bullet-level tells: pierce = elongated drill slug, poison = green ring, chill = rotating frost picks, chain = crackling tail, explosive = pulsing warm glow, void = swirling arc, grow = the bullet visibly swells with distance, homing = ring + fins. Status tells on fighters: chill/burn tints (existing), shield bubble + charge sliver (new). Speed/damage/ammo/reload cards need no dressing — their numbers are felt directly. |
| K8 | Slab crush damage was flat (14–44 from any slab past a fixed speed) — a thin shelf dropping a short way hit like a falling building. | ✅ Crush now scales with slab mass (area vs a standard 220×24 platform, 0.35×–2.4×) and starts at a real falling speed (500 px/s ≈ a 60px drop), with a 5-damage floor below which it's just a bonk. Thin-and-slow is harmless; big-and-fast still flattens. |

## Verification

- `node --check` passes on all JS files.
- Headless Chromium playthroughs (Playwright) across 12+ feature arenas —
  including every redesigned one — with two keyboard players and two bots:
  zero JS errors; simultaneous draft, tide, lightning, movers, teleporters,
  bounce pads, and conveyors all exercised.
- The only console noise is 404s for the 97 optional art files, which is the
  designed procedural-fallback path.

## Remaining opportunities (deferred)

- A rare+ movement card (e.g. a dodge-dash) to round out the movement tag. 🔭
- An additive damage-stacking model if late-game one-shot builds prove unfun in
  4-player lobbies (kept multiplicative for now — big builds are the genre's joy). 🔭
- Gradient/backdrop render caching if low-end devices struggle (60fps was fine
  headlessly; revisit with real hardware). 🔭

