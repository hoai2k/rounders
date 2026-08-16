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

