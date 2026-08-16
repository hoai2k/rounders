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

### Verified

- Static validator over all 25 arenas: spawns above ground and outside solids,
  chains inside their platform span and not passing through geometry, crates
  non-intersecting with ground below (or a tide to float on), mover sweeps
  clear of hung platforms and crates.
- Headless playthroughs (Playwright/Chromium) across sampled arenas: no JS
  errors. A purpose-built test arena confirmed the full loop live: chain shot →
  platform drops and settles; crates shoved across the floor by gunfire;
  breakable telegraph rendering.

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

