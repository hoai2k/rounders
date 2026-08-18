# ROUNDERS: Total Redesign — Project State

This document tracks every workstream ("effort") in the full redesign of Rounders,
so work can resume cleanly if interrupted. Update the status boxes as work lands.

**Working branch:** `claude/rounds-game-redesign-4z7slv` → merged to `main` when a task completes (see CLAUDE.md policy).

---

## Vision

A colorful, dynamic, professionally polished 1–4 player arena brawler in the spirit
of ROUNDS: short physics duels, loser-drafts-a-card comebacks, huge build variety.
Everything is being redesigned from scratch — cards, arenas, characters, UI — using
the old codebase only as an engine framework.

Pillars:

1. **Personality everywhere** — every card, arena, and character has a name, a face,
   a palette, and a gimmick you can describe in one sentence.
2. **Readable depth** — cards explain exactly what they do; rarity is color-coded;
   arenas telegraph their hazards.
3. **Juice** — particles, screen shake, splash banners, animated gradients,
   weather effects, rumble.

---

## Workstreams

### 1. Design foundation & docs
- [x] Research ROUNDS design patterns (draft-on-loss, stat-trade cards, arena variety)
- [x] Define rarity ladder + colors: Common (silver), Uncommon (green), Rare (blue),
      Epic (purple), Legendary (gold), Mythic (animated magenta) — Mythics grant active abilities
- [x] `image-requests.md` — prompts for all generated art (committed to main early so
      generation can start while code is built). Delivered batches move to
      `image-requests-history.md`, so the live doc is only what is still wanted
- [x] **Card art wired in**: the 52 emblems in `assets/images/cards/` are drawn on
      the card faces in the draft hand, on the HUD card chips, and on the card a
      bot is shown taking, so a hand is recognised instead of read
- [x] `CLAUDE.md` — repo policy (merge to main when a task is done)
- [x] This state document

### 2. Card system — 84 cards, designed from scratch
- [x] New card schema: id, name, rarity, tagline (flavor), description (plain-English
      explanation), effect list, tags, apply()
- [x] 15 Common / 24 Uncommon / 23 Rare / 14 Epic / 5 Legendary / 3 Mythic = **84 cards**
- [x] **Power-card audit** (AUDIT.md §6): homing reworked from a feeble nudge to
      real steering (visible curves, heat-seekers when stacked); three ROUNDS
      gaps filled — Aegis Bubble (regenerating shield with bubble/absorb/break
      visuals), Lowrider (ground-hugging bullets), Pocket Void (impacts open a
      brief black hole); per-effect bullet tells (drill slugs, poison ring,
      frost picks, crackling chain tail, swelling grow shots); every numeric
      effect verified to stack on duplicate drafts; slab crush damage now
      scales with slab mass and impact speed
- [x] New combat mechanics to support them: burn DoT, chill (slow), pierce, chain
      lightning, shrapnel split, thorns, regen, rage (low-HP damage), adrenaline
      (low-HP speed), guardian save, golden first shot, kill-heal, storm block,
      warp block, 3 active Mythic abilities (Starfall Protocol, Event Horizon, Chronoshift)
- [x] File: `js/cards.js`
- [x] **Card gap audit vs ROUNDS** (`CARD-GAP-AUDIT.md`): all 67 vanilla ROUNDS
      cards mapped against our 55 — ~40 covered, structural gaps identified
      (block depth, reload economy, triggered buffs, area denial, steered
      bullets, knockback offense); 12 gap-closing cards proposed plus the
      second wave and 10 original beyond-ROUNDS ideas
- [x] **Gap-audit wave implemented — all 32 cards** (55 → 87): the §4 twelve,
      the §4 second wave of ten, and the §5 ten originals. New engine systems:
      temp-shield soak chain (Hot Streak / Overflow / Fresh Coat), deferred
      damage pool (Payment Plan), stun + silence control, heal/stink/saw
      fields, block toolkit (reload, frost, saw, decoy, brick-slab conjuring,
      empowered shots that carry block effects to impact), steered and
      boomerang and helium bullets, bounce-seeking Bank Shot, burst echoes and
      Encore ghosts, kbDeal knockback offense, head stomps, air-jump blasts,
      chill/repel auras, underdog comeback scaling. Art prompts for all 32 in
      `image-requests.md` §2 (procedural fallbacks until delivered).
      Headless smoke-tested: full bot/human match with all 32 granted, clean
- [x] **Drill Rounds is the wall-driller** (`wallPierce`, `drillThrough()`):
      bullets bore through walls and keep flying. The old pierce-a-player
      version and its stand-in card (Open Plan) are gone; `pierce` survives
      only as one clause of Railgun
- [x] **Skylight** (epic): impacts blow *permanent holes* in terrain that
      anyone can shoot or climb through. Holes live in `props.holes`, keyed by
      the source platform and stored in local space so a hole rides a moving
      platform; `inHole()` treats one as a doorway bored across the slab's
      short axis (a sphere test spat a falling player back out halfway
      through a thick floor); rendering punches them out with an even-odd
      clip so the backdrop shows through, with a scorched rim. Terrain heals
      between rounds. Verified: a fighter falls through a bored shaft while
      the solid part of the same slab still holds them up
- [x] **Card preview simulator** (`js/cardsim.js`): the workbench's ▶ Preview
      button runs a small self-contained fight that illustrates the selected
      card — the scenario is chosen from the stats the card actually changes
      (a pillar to drill, a second body for pierce/chain, a deliberate miss for
      seekers and boomerangs, a blocking receiver for block/silence cards, the
      card-holder taking fire for shields and armor), with health bars, ammo
      pips and floating numbers so pure-stat cards read too. Shots are aimed
      with a real ballistic solution so they connect. Verified: all 88 cards
      simulate without throwing and land damage
- [x] **Card workbench** (`/workbench?edit=cards` → `workbench/cards.html`):
      every card rendered with the game's own card-face markup and stylesheet —
      featured card with ←/→ flipping, rarity filter chips, full-set grid;
      `server.mjs` now redirects bare directory paths so the query URL works
- [x] **Bullet viewer + export** in the card workbench: a pane under the
      preview draws the selected card's bullet at true game size (same formula
      the game uses), pointing right, beside a fighter-radius circle for
      scale, with size and rotation sliders. Tweaks persist in localStorage
      and come out of **⬇ Export changes** as `card-workbench-changes.json`.
      Painted rounds are picked up from `assets/images/bullets/<id>.png`
- [x] **Choose Cards** (Settings → Choose Cards): a three-way pool mode —
      **Default** (every card, rarity-weighted), **Equalize** (every card, one
      ticket each, so a Mythic is as likely as a Common) and **Choose**, which
      opens a scrollable grid of the whole set where any card can be greyed out
      and taken off the draft table. Rarity headings carry a live `on/total`
      count and toggle their whole block; All / None / Invert sit above the
      grid. Only the mode and the disabled set persist (`localStorage`,
      `rounders.cards.v1`), and they persist independently — flip to Default to
      see everything, come back to Choose and the same selection is waiting.
      Switching everything off is not a playable state, so an empty pool falls
      back to the full set and the counter says so.
      The grid is its own focus region for the pad: eighty-odd cells would
      flood the panel's spatial cursor, so it stands in that list as a single
      cell and takes over from there — row map measured from live geometry
      (ragged last rows and full-width headings need no special case),
      held-direction auto-repeat (0.3s, then ~18 cells a second), A to toggle,
      X for the whole rarity, LB/RB to jump between rarities, and focus handed
      back to the panel at the top and bottom edges
- [x] **Card art delivered 2026-08-17**: Lowrider, Aegis Bubble and Pocket
      Void (emblem + scene each). Verified on arrival — emblems are RGBA with
      transparent corners, so no `npm run intake` keying was needed; prompts
      moved to `image-requests-history.md` §9
- [x] **Art complete 2026-08-17** (`image-requests.md`): nothing outstanding.
      All 77 shipping cards have an emblem and a scene, 29 painted bullets and
      20 effect sheets are on disk. The last six files — `fx/angel.png`,
      `fx/lemonade.png` and re-arts for Second Defence and Sawblade — landed
      already transparent, so `npm run intake-art` filed them with nothing to
      key; prompts moved to `image-requests-history.md` §11
- [x] **Effect sheets wired in 2026-08-17**: 11 of the 15 that were sitting on
      disk unused now draw, on a small shared rig — `FX_FRAMES` describes the
      sprite strips, `drawFxSheet` plays a frame, and `fxShot` carries painted
      one-shots for moments with no lasting field to hang art on. Every caller
      keeps its procedural drawing for when a file is missing, and the art is
      warmed at boot so the first explosion of a match is already the painted
      one. What each replaced:
      **explosion** / **explosion-big** (6-frame) → the `boom` field, big sheet
      for Supernova-scale charges · **shockwave-ring** → the `push` field, which
      was pure physics with *nothing on screen* · **muzzle-flash** → every shot,
      at the rig's real barrel tip, rotated onto the aim · **stun-stars** →
      Camera Flash's stun, which also had no tell at all · **lightning-arc** →
      the storm bolts, stretched between the endpoints with the tail-wipe kept
      as a clip · **storm-nova** → Crown of Storms' block · **shield-bubble** /
      **shield-break** (5-frame) → Aegis Bubble holding and shattering ·
      **chill-aura** / **frost-burst** → chilled fighters and the moment a chill
      lands (Permafrost, Storm Caller)
- [ ] **4 effect sheets deliberately left unused.** Not oversights — each would
      undo a later decision, and all four are recorded here so nobody re-opens
      them by accident:
      **armor-plates** (golden hex scales) loses to `drawIronHull`, which is
      deliberately rolled steel, concentric and fixed — "a rotating ring reads as
      a gadget, not as plate" · **bore-hole** (scorched hole decal) contradicts
      Breakthrough's "the gap is drawn as nothing at all", where the break is
      sold by flying chunks instead · **heal-field** (citrus-green dome, plus
      signs) is superseded: the only `healField` card left is Lemonade Stand,
      restyled lemon-yellow with a glass in it · **dust-puff** (pale rubble
      puff) would flatten dust that is currently tinted with each arena's own
      wall colour
- [x] **Play-feel pass 2026-08-17**: Big Bore cut (a strictly worse
      Cannonball); Boxing Glove +300% knockback; Sugar Rush +100% speed;
      Longshot +100% bullet speed; Grasshopper is a hard launch (+38% jump
      speed); Moon Shoes lost its speed penalty; Tailwind gained **hold-jump
      float** (new `floatTime` stat, budget refills on landing)
- [x] **Mythic actives moved to their own button**: Y (pad button 3) fires the
      ability, so a Mythic no longer eats your block press — B / LB / LT still
      block. Card text and the controller diagram name the pad button only
      ("Y / LB"), and Y has its own label on the How to Play pad
- [x] **Fire & smoke particles**: buoyant `flame`/`smoke` particle kinds (they
      rise, flames shrink, smoke swells) driving burning fighters, explosions,
      meteor trails, incendiary rounds in flight, Firecracker Heels, and
      contact with *hot* hazards only — the arena's own hazard colour decides,
      so lava burns and ice spikes don't. Mirrored in the preview sim
- [x] **Mythic / block previews made legible 2026-08-17**: three staging bugs,
      not just faint drawing — Event Horizon's +10% health tripped the
      "defensive" test, so the caster became the *target* and the black hole
      spawned on itself (fields skip their owner, so it pulled nobody); Crown
      of Storms' 170px nova fired with the attacker 425px away; Chronoshift
      merely healed. Now: a Mythic's caster holds its own preview (Chronoshift
      excepted — it takes the fire), block effects with a radius stage the
      fighters close enough to be caught, the vortex opens between the two and
      hauls the victim in, the nova is a crown of forked bolts with an
      expanding ring, and Chronoshift walks in under fire then snaps back with
      a ghost + "◀ 2s" trail and the health restored (measured: walks 212px,
      drops to 27% HP, snaps back 138px, recovers to 99%)
- [x] **Detail pane shows the card face** again — the two-pane rewrite had left
      the right-hand side text-only, so the selected card had no artwork
- [x] **Supernova & Golden Gun made to look the part 2026-08-17**: Supernova
      now +100% damage and +50% bullet size, flying as a white-hot star (white
      core, hot corona, sparking) and detonating in a real blast — a white
      flash blooming into expanding shockwave spheres with spikes of light,
      scaled by charge (new visual-only `boom` field). Golden Gun's first
      round gleams hard and trails golden sparkles. New buoyant `spark`
      particle kind (drifts rather than falling). All mirrored in the preview
      sim and the bullet viewer; painted rounds for both are already requested
      in `image-requests.md` §2
- [x] **Card feel pass 2026-08-17 (2)**: Encore's follow-up is now a twin shot
      a full second later, fired **from the spot you shot from** (step aside
      and the ghost covers the ground you left); Bricklayer stands its slab on
      end (24×150) so it is cover that stops bullets; Return to Sender's
      charged round flies inside a visible block bubble; a vortex core —
      Pocket Void's and Event Horizon's alike — now mauls like an arena hazard
      (30 damage + a launch clear of it, on a short grace, so a careless
      player is chewed repeatedly); Event Horizon is wider (380px), hungrier
      (−1500 pull) and swirls with layered arms and debris spiralling in
- [x] **Effect legibility pass 2026-08-17 (3)**: Guardian Halo now haloes and
      gilds the fighter it saves and sends a little angel rising away (art
      requested as `fx/angel.png`, procedural until then); Storm Caller /
      Chain Letter in a duel earth their bolt on the nearest ledge above head
      height — top of it, or halfway up a towering one — and come back,
      catching the victim twice (nothing tall nearby: it just arcs off into
      the sky); Skylight's bores were centred on the face they struck so the
      rings hung in open air — the centre is now pulled inside the slab and
      the scorched rim is clipped to it; Body Double's decoy was spawned
      exactly under its owner and so was invisible — it now stands clear;
      Magnet Suit deflects hard enough to actually turn shots away (0% of
      shots landing in the preview, was 100%) and crackles with a visible
      magnetic field
- [x] **Skylight excavates square bites 2026-08-17**: holes are rectangles of
      removed material, not circular doorways — one shot takes a square bite
      out of the face it strikes, and anything thicker than a bite needs a
      second shot to hole right through (the 92px preview wall opens on hit 2,
      a 120px slab on hit 3). Overlapping bites merge, which is what deepens a
      niche into a passage. Bullets travel through any excavation; players
      only pass an opening that spans the slab, so nobody sinks into a pocket.
      A borer walks through what is already cut before biting, since collision
      fires at the slab's face and every shot would otherwise re-cut the same
      first bite
- [x] **Workbench**: the duplicate card face above the preview is gone, and
      card art is drawn with real `<img>` elements (scene → emblem → a plain
      "no art yet" badge), so a missing file is visible instead of silently
      falling through to the tinted panel
- [x] **Art delivered and integrated 2026-08-17**: 115 files filed by the new
      `npm run intake-art` (34 emblems + 34 scenes completing the set, 29
      painted bullets, 18 effect sheets). 16 arrived on white/black backdrops
      and were keyed on intake, originals kept in `assets/images/archive/`;
      card scenes are exempt since they are meant to be opaque. Painted rounds
      are now drawn in game (picked from the newest card a fighter holds that
      changes the bullet) and the delivered explosion sheets, black hole,
      sawblade and poison cloud replace their procedural drawings. `fx/angel.png`
      and `fx/lemonade.png` followed in the final six-file drop
- [x] **Controller badges on cards**: any card that only pays off when you
      press something wears the Xbox button in its corner — **LB** for the
      block family, **Y** for a Mythic ability, **A** for jump/float cards,
      **RS** for Puppet Strings' steering. 22 of 84 cards carry one; the rest
      are passive and stay clean. Derived from the stats a card changes, so a
      new card gets its badge for free
- [x] **Skylight renamed Breakthrough**; **Second Serve renamed Second
      Defence**; **Gag Order, Cold Shoulder and Overflow cut** (their effects
      were not pulling their weight). The engine still carries `silence`,
      `chillAura` and `overflow` support, unused, in case they come back
- [x] **Mythic rework 2026-08-17**: **Chronoshift** no longer teleports its
      holder — hold **Y** and the whole board runs backwards. The world keeps a
      rolling film of itself (one frame per tick, `REWIND_MAX = 3` seconds of
      game time) and the rewind consumes it at half real time, so a full tape
      costs six seconds of holding. Every fighter, bullet, crate and slab is
      restored, the clock genuinely counts down, ghost trails show where
      everything is retreating to, and the cooldown only starts when you let
      go. **Event Horizon** is thrown rather than placed: it flies out as a
      round at 820px/s and plants where it lands, then spends 7 seconds
      dragging in every fighter — its caster included, if they stood too close
      — plus crates and slabs, mauling anything that reaches the core
- [x] **Mythic stacking**: a duplicate cannot grant a second ability, so it
      sharpens the one you hold — cooldown divided by the stack count, and an
      Event Horizon that lives 2.5s longer per copy
- [x] **Stacking audit of the non-obvious stats**: four cards silently ignored
      a second copy and now do not. **Golden Gun** widens the golden window
      (copy *n* gilds the first *n* rounds of the magazine) instead of setting
      a flag; **Panic Button** arms earlier (`ammo < autoBlock`, so two copies
      cover the last two rounds); **Second Defence** shortens its lockout to
      `1 / stacks`; **Payment Plan** stretches the bill over `3 × stacks`
      seconds. `guardian`, `revives`, `scavenge`, `freshCoat` and `bloodMoney`
      were already counted and were left alone
- [x] **Keyboard special**: moving the ability off the block button left
      keyboard players with no way to fire a Mythic at all. **H** (Keyboard 1)
      and **,** (Keyboard 2) now do what pad **Y** does
- [x] **Workbench art priority**: no card carries a `src` until it scrolls into
      view, and whenever one of six loading slots frees it goes to whichever
      waiting card is nearest the middle of the panel — so scrolling anywhere
      makes that view jump the queue instead of waiting behind 16MB of scenes
      queued at page load. A card scrolled past before its art arrives has the
      request dropped rather than left holding a connection
- [x] **Effect legibility pass 2026-08-17 (4)**: **Guardian Halo**'s glow, halo
      and rising angel existed only in the game — the workbench preview showed
      a "SAVED" float and nothing else. The preview now draws the whole
      intervention. **Lightning** clears in the direction it travelled: the
      tail lets go first and the vanishing edge chases the head, so an
      instantaneous strike still shows you which way it went. A **Storm Caller
      bolt with nobody to jump to and nothing to earth on** now crawls over the
      victim as dying static instead of striking off into empty sky, and the
      preview stands a wall behind the target so the there-and-back strike is
      actually visible. **Railgun**'s round disagreed with the bullet pane —
      the preview drew every bullet as a plain circle while the pane and the
      game drew pierce rounds elongated; the preview now uses the same
      `drawBullet` renderer as the pane, so the two can no longer diverge.
      **Juggernaut** wears its bulk: a studded iron shell drawn behind the
      fighter and slightly wider, so they read as armoured rather than merely
      large (shared helper `ROUNDERS.drawIronHull`, stacks add plate and
      rivets). **Breakthrough**'s bores are no longer outlined — the drawn box
      is gone and the gap is simply empty space; what sells the break is a
      shower of ~30 wall-coloured tumbling chunks plus dust, thrown from
      `punchHole` itself so every bore throws debris whatever punched it
- [x] **Second Defence re-arted**: the rename kept its files, which were a
      tennis serve from when it was Second Serve. Both were re-requested and
      have now been replaced — the emblem and scene show a hexagonal shield
      snapping back as the punch lands. Breakthrough's painting already showed a
      fighter smashing through a stone wall and needed nothing. Sawblade got the
      same treatment: its art no longer shows a blade on an orbital track
- [x] **Card feel pass 2026-08-17 (5)**: **Mosh Pit renamed Sawblade**, and the
      blade no longer orbits — one huge disc centred on the fighter, spinning on
      its own axis, drawn behind them at the full radius it damages in and
      stroked in near-black so it reads against a grey arena (shared helper
      `ROUNDERS.drawSawblade`). **Bank Shot** keeps throwing sparks for the rest
      of the flight after a cushion, not just at it, and arrives in a burst
      scaled to how many cushions it took. **Hummingbird** gained its namesake:
      tap jump again in mid-air and you hold station on blurred wings for 3
      seconds, and shooting from the hover empties the whole magazine 60ms a
      round. **Lemonade Stand** is lemon-yellow instead of generic heal-green,
      with a glass of lemonade faded into the pool, rising bubbles, and heal
      **"+10" ticks** banked and called out in whole numbers (the game had no
      floating-text system at all; there is one now). **Berserker's Blood**
      goes to +150% (was +60%), its rounds swell with the multiplier and drip
      blood as they fly — a fleck at a scratch, a ribbon at death's door.
      **Shrapnel Burst**'s shards lived 0.9s and winked out at the top of their
      own hop; at 2.6s they finish the arc and reach the floor or a target.
      **Comet Trail**'s tail is sized off the round's CURRENT radius, so it
      thickens and lengthens with the comet and throws embers once it is
      genuinely burning. **Phoenix Feather** now actually kills you: a fire
      blast, a second of burning wreckage where you fell — the round will not
      end over it — then you climb back out of that same spot at half health,
      still alight
- [x] **Mid-round grants sync their per-round counters**: `grantCard` refreshes
      `guardianCharges`, `roundRevives`, `hoverLeft` and `freshPool`, so a card
      taken mid-round no longer grants a save you cannot spend
- [x] **Seven more cards cut 2026-08-17**: Chain Letter (redundant with Storm
      Caller), Underdog, Coffee Break, Cold Snap, Panic Pedals, Rocket Skates,
      Echo Chamber. **77 cards** now: 15 C / 18 U / 22 R / 14 E / 5 L / 3 M.
      Their art stays in the repo in case they return, as with the earlier cuts
- [x] **Card feel pass 2026-08-17 (6)**: **Popcorn Payload** actually pops —
      the round throws 10 hot kernels up in a spray that rain back down for
      more damage, and any that miss bounce twice more before giving up (the
      old splash-explosion is gone). **Wasp Venom** stacks: doses add up on
      repeated stings instead of the strongest one winning, capped at 4×.
      **Bodyguard**'s shockwave now swats any bullet caught inside the
      knockaway zone off in a random direction — rounds the block itself
      parried are already gone, so it only catches the ones that were going to
      sail past, and a swatted round answers to whoever swatted it. **Leech
      Lunch** heals 25% (was 18%)
- [x] **Panic Button's auto-block is genuinely free**: `tryBlock` gained a
      `free` flag. The empty-magazine block no longer waits on the block
      cooldown *or* spends it, so your manual parry is still there — it is an
      extra shield, which is what the card promises
- [x] **Two dead previews fixed**: **Hot Streak** was staged on the receiving
      end, but its shield is earned by DEALING damage, so it never fired —
      its holder now shoots. **Springload** had no stomp in the sim at all;
      the sim implements it now and stages a hop onto the target's head
- [x] **Helium Rounds preview**: the launch was never wrong — helium touches
      only `gravity`, so the muzzle velocity is identical to a normal round.
      What looked wrong was the preview's ballistic solver correctly aiming low
      to let an upward-falling shot arc back down into a target at its own
      height. It now fires dead FLAT, exactly like any round, at a target
      standing on a ledge sized so the rise after launch carries it there —
      which is the card's actual use
- [x] **Badges are action-derived, not button-derived 2026-08-17**: a card is
      tagged with the ACTION it pays off from (`shoot` / `block` / `jump` /
      `ability` / `aim`) and the button is resolved at render time from
      `GAMEPLAY.controls` — which `game.js` now also reads its gamepad bindings
      from, so re-binding a button moves every badge with it and the two cannot
      drift apart. Anything that touches the shot wears **RT**, the block
      family wears **LT**, jump/float/hover **A**, a Mythic **Y**, Puppet
      Strings **RS**. 64 of 77 cards carry one; the 13 that do not are purely
      passive (more health, more speed, thicker skin). The badges are drawn as
      the buttons themselves: A/B/X/Y as coloured discs in Xbox's palette,
      bumpers and sticks as grey pills, and the triggers as paddles — a
      generously rounded top tapering to a squarer heel, which is what tells
      LT/RT from LB/RB at badge size
- [x] **Both Mythic previews rebuilt to match the reworked cards**:
      **Chronoshift** was still the old teleport — it now runs the whole
      preview backwards at half real time off a real frame buffer, with ghost
      trails for both fighters and every bullet, a cold wash and a tape
      counter. **Event Horizon** now visibly throws its swirling knot, which
      spins across the arena and plants where it lands into the 7-second
      vortex; the caster is no longer exempt from its own pull
- [x] **Preview rounds use the painted art**: the game has always picked a
      fighter's bullet sprite (`bulletArtFor`), but the preview drew every
      round procedurally, so the bullet pane and the preview disagreed for
      Supernova, Golden Gun and Railgun. The preview now loads the same
      sprites, at the same `r * 3.4` the game draws them at, and a round's
      trail takes its colour from how the round LOOKS — white-hot for
      Supernova, gold for Golden Gun — instead of the shooter's player colour
- [x] **Juggernaut's plate is armour, not machinery**: concentric with the
      body, sized off the current radius so any other resize carries it, and
      no longer spinning
- [x] **Body Double**: the copy stands EXACTLY where you were, facing the way
      you were — the block shoves YOU off the spot instead of offsetting the
      copy, which is what the card was always meant to do. The preview stages
      a long enough flight to see the copy standing before the round arrives,
      and the copy fades out where it fell rather than vanishing mid-frame
- [x] **Boxing Glove punches through a block**: a parry stops the DAMAGE, not
      the shove. A gloved round moves a blocking target 101px where a plain one
      moves 7px, and they still take no damage and keep their block — so you
      can be knocked off a ledge while guarding. The punch belongs to whoever
      fired the round, so a parried shot carries the *blocker's* gloves back
- [x] **Base fire delay 0.26s**: 0.22 was too quick to read. Split the
      difference with the original 0.30 (`GAMEPLAY.gun.fireDelay`)
- [x] **Scrollbars styled to match the UI**: new `scrollbars.css`, linked from
      the game and all three workbench pages, so a bar looks the same wherever
      one appears — a slim thumb in the panel palette on an empty track, and
      `scrollbar-gutter: stable` on the scrolling panels so content does not
      shift sideways when a list grows long enough to need one. The standard
      `scrollbar-width` / `scrollbar-color` lead (Firefox and Chromium 121+,
      and where either is set Chromium ignores the `::-webkit-` pseudo elements
      entirely); the `::-webkit-` rules are kept behind `@supports not
      (scrollbar-width: thin)` for Safari and older Chromium. Note headless
      Chromium paints no scrollbar thumb at all, so the appearance could not be
      confirmed by screenshot — what is verified is that the stylesheet loads
      and the values resolve on every page
- [x] **The card workbench never loaded `js/rig.js`**, so its fighters were
      drawn from fallback art instead of the composed rig — which is why a
      weapon there did not match the sprite workbench or the game. `rig.js` now
      loads *before* `characters.js` (which preloads the rig parts and pulls in
      `rigs.json` on load, and silently skips both if the module is absent).
      All three pages now resolve the same rig and the same muzzle at
      (55.4, 0). The preview also takes its firing position from `rig.muzzle`
      rather than a hardcoded 26px offset, so barrel and bullet agree
- [x] **Trigger badges mirror**: RT rounds only at bottom-right, LT only at
      bottom-left — one swept corner each, so left and right read apart at
      badge size without reading the letters. Text centred in the shape
- [x] **Rarity pass 2026-08-17** after the rework, 12 cards moved. Promoted for
      power they gained this session: **Boxing Glove** common → **rare** (it is
      the only card that ignores blocking, which is a rarity-defining
      property), **Wasp Venom** → rare (stacking doses out-damage Black Mamba's
      flat 2×, and that is Epic), **Popcorn Payload** → rare (10 kernels beats
      Shrapnel Burst's 3 shards), **Bodyguard** → rare (bullet scatter is
      defensive tech nothing else has), **Panic Button** → rare (a genuinely
      free block is a free proc of your whole block package every magazine),
      **Berserker's Blood** → **epic** (+150% with no downside; Glass Cannon is
      Rare at +75% for −30% health), **Hummingbird** → epic (four effects plus
      a unique movement mode). No-downside commons that outclassed the tier:
      **Sugar Rush**, **Longshot**, **Tailwind** → uncommon. Demoted:
      **Dragon's Hoard** legendary → **epic** (pure numbers, no identity — the
      only Legendary without a unique mechanic) and **Fresh Coat** rare →
      **uncommon** (the shell shatters on the first hit, so over a round it is
      worth less than Stone Soup, a Common). Now **11 C / 18 U / 24 R / 17 E /
      4 L / 3 M**. The card file is regrouped to match and its section counts,
      which had gone stale after the cuts, are correct again
- [ ] **Draft mix shifted with it** — measured over 6000 dealt cards: commons
      27% (was 35%), uncommons 30%, rares 25%, epics 14% (was 11%). Drafts are
      richer than before. If that reads as too generous, `RARITIES.common.weight`
      9 → 13 restores commons to ~35% without touching any card
- [x] **Bullet-art config 2026-08-17**: new `js/bullet-art.js` is the one table
      for how a card's round is drawn — scale, rotation, trail colour, and
      whether it keeps a procedural round. Game, preview and bullet pane all
      read it. Colours are derived from the sprites themselves by
      `tools/bullet-colors.mjs` (`npm run bullet-colors`), so a venom round
      trails green and a flaming one orange. Supernova is back to its
      procedural star and now wins over any sprite the rest of the build
      carries. Several bullet cards blend the two newest sprites 68/32 — chosen
      by rendering plain-average, additive, aura-behind and newest-only at true
      bullet size and looking; the rest of the build shows only in the trail
- [x] **Card-combination audit** — `npm run audit-combos` (live match) and
      `npm run audit-stats` (stat-space sweep). Findings are in the session
      notes; headline: engine is stable across 100 live 12-card builds and
      4000 stat builds with duplicates, but the damage tail one-shots and
      `fireDelay` has no floor
- [x] **Fire-rate floors** (`GAMEPLAY.gun.minFireDelay` 0.05s, `minReload`
      0.3s). Stacked Blood Money and Hair Trigger reached a 0.0004s delay, so a
      whole magazine left the barrel inside one frame. The floor is applied at
      the point of use, not to the stat, so a card still reports what it does —
      it simply stops buying speed past the floor. Measured: the extreme build
      now plays at 0.050s and empties 10 rounds over 663ms instead of a single
      frame; worst sustained DPS across 4000 builds falls 7603 → 3695, and peak
      rounds in the air in a live 12-card audit falls 329 → 33
- [ ] **Damage tail one-shots**: baseline volley is 36 vs 100 HP (3 hits, as
      designed). Over 16-card builds the median is 49, p90 109, p99 225 and
      the max 448. Supernova appears in 125% of the hottest 1% of builds (i.e.
      often twice) and Glass Cannon in 108%; damage multipliers compose and
      pellets multiply on top
- [x] **Lifesteal is visible energy 2026-08-18**: Leech Lunch and Grim Harvest
      tear health out of whoever was hit as green motes that chase the shooter
      down, and the heal is applied when a mote ARRIVES rather than on impact —
      so the health bar fills as the energy comes home. Measured at ~800ms
      between hit and heal in the preview. A kill under Grim Harvest sprays the
      whole pool. The preview also stages lifesteal holders at 45% health,
      without which they were at full and the card looked like it did nothing
- [x] **Body-attached effects ride the body bob**: `ROUNDERS.bodyWobble` is
      exported from the character renderer, so Juggernaut's plate no longer
      sits still while the fighter bobs in front of it — it is plate bolted on,
      not a hoop they float inside
- [x] **Dragon's Hoard smoulders**: curling smoke rises off every side, lit
      from within, with gold embers turning in it, drawn behind the body and on
      the same bob as Juggernaut's plate
- [x] **Boomerang tumbles** end over end as it flies instead of pointing along
      its path
- [x] **RT means the shot behaves differently**, not that the gun has better
      numbers. Dragon's Hoard is more ammo, a faster reload and more damage —
      you shoot exactly as before — so it and Cannonball, Hair Trigger, Speed
      Loader, Longshot and Bubblegum Rounds now wear no badge. 36 of 77 cards
      carry RT, down from 47. Hummingbird names both A and RT, since you hold
      station with one and dump the magazine with the other
- [x] **Glass Cannon flies sheathed in glass**: a procedurally blown sphere
      drawn in a second pass over the round, so it lands over painted, golden
      and white-hot rounds alike, with highlights pinned to the screen
- [x] **Blood Money reads in the preview**: the sim now charges the 5 HP a
      shot, and a card built on cadence keeps its real fire delay instead of
      the preview's 0.55s pacing floor
- [x] **Thorn Jacket wears a briar**: a green vine on the fighter's bob with
      thorns and roses, the roses swelling each time the jacket bites back
- [x] **Panic Button wears no badge**: it throws the block for you when the
      magazine runs dry, so `autoBlock` left the LT key list
- [x] **Wasp Venom drifts after its target** (+0.35 homing). Its preview keeps
      a straight shot — a slight drift cannot recover from the off-target
      launch the strong seekers are staged with
- [x] **Firecracker Heels kicks crackers** out of the heels on an air jump;
      they tumble, spin and pop where they land, carrying no damage of their own
- [x] **Springload squashes the head it lands on** a quarter of its height and
      springs back, with the stomper riding it down and leaving on the way up.
      The preview lands on the head again — the run-up was carrying it over
- [x] **Hot Streak is worn, not read**: a golden field around the fighter that
      thins as the shield burns down, lasting ~4s instead of 2.5s. Overflow and
      Fresh Coat keep the gold sliver on the bar
- [x] **Waste Not's refund flies home**: a semi-transparent ghost of the round
      jetting dead straight back to the shooter with a long streak behind it,
      the whole trip inside 0.08s so it could never read as something to dodge.
      The ammo is still credited on the hit, so the card's timing is unchanged
- [x] **Permafrost tints its victim** white-blue with rime on the outline,
      under the vapour wreath
- [x] **Preview fighters aim their guns**: the sim fed the rig a flat aim
      vector, so barrels sat horizontal while shots arced away from them
- [x] **Movement previews move**: speed runs through the game's own accel /
      brake / target-speed model with stops cut into them, so Sticky Soles
      reads; Sugar Rush doubles speed on a hit (360 px/s against 180 baseline);
      Moon Shoes spends its extra jump at the apex; Tailwind hangs on its float
- [x] **Grasshopper is a charged jump**: hold jump on the ground to coil (the
      fighter compresses and bobs), release to launch. A tap is an ordinary
      hop fired on the PRESS, exactly like anyone else's — the wind-up never
      delays it. Holding banks charge in the air as well as on the ground, so a
      held button lands already coiled and letting go from there launches. At
      `minHold` (0.5s) the wind-up is worth **2x normal jump height**
      and at `maxHold` (7s) **the whole height of the arena** (`maxBoards: 1`),
      measured against that arena's own gravity, so a taller board is cleared
      just as completely. Configured in HEIGHT in `GAMEPLAY.chargeJump` and
      converted to a launch-speed multiplier by square root, since rise goes as
      the square of speed. Measured in the real game: 184px on a tap (normal),
      370px at 0.53s (2.01x) and 899px at 7s against a 900px board. The
      preview quotes the same numbers against `previewBoard` (900px) rather
      than the couple of hundred pixels the little scene is tall, so the
      fighter does leave the top of the preview frame at the apex — the
      alternative is showing a launch the game never gives you
- [x] **Camera Flash goes off like a flashbulb**: a hard white wash over the
      victim that blows out into a ring and is gone inside a quarter second,
      and a stunned fighter is now visibly rattled — the body shakes as well as
      seeing stars, instead of only standing still
- [x] **Payment Plan drops its floating number**: the amber tail on the health
      bar already says what is owed; the "-N over time" text only repeated it
- [x] **Blood Money's preview runs long** (13s hard cut, as Breakthrough does):
      the trade only reads once the shooter has emptied a magazine or two into
      it, which now takes them down to ~40% health on screen
- [x] **Firecracker Heels grants the air jump it needs**: a baseline fighter
      has NO mid-air jump, so the card was inert on its own — the blast only
      fires on an air jump. It now carries `+1 air jump` itself and stacks with
      Moon Shoes for two (verified 0 / 1 / 2)
- [x] **Sugar Rush trebles** move speed for its 2.5s instead of doubling it
- [x] **Body Doubles are solid**, not translucent: the copy is drawn exactly
      like the fighter, and what gives it away is that its idle clock is frozen
      at the moment it was made — it neither breathes nor bobs
- [x] **Permafrost's tint is masked to the sprite**: the fighter is redrawn
      into a scratch canvas in the same pose and the colour composited
      `source-atop`, so the frost lands only on their own pixels — hair, weapon
      and all — and rides the body exactly instead of being a pale disc in
      front of it (`drawFrostTint` in `js/characters.js`, used by both renderers)
- [x] **Card text fits the card**: 48 descriptions were long enough to be
      clipped or squeezed out of the draft card entirely — Grasshopper showed
      NO description at all, because tall stacks of effect pills were eating
      the space the rules needed. Descriptions are now cut to three lines at
      card width, the wordiest effect pills merged (`+55% speed · +25% dmg`
      rather than one pill each), the art trimmed 37% -> 34%, the card gap 5px
      -> 4px and the pill type a half point smaller. Measured across all 77:
      every description now shows in full, with pills at two rows or fewer
- [x] **Chronoshift's tape is a pool, not a switch**: spending two of your
      three seconds costs two thirds of the cooldown to earn back, at a steady
      3s-of-tape-per-10s, and any sliver on the reel is usable the moment it
      exists instead of waiting out a fixed lockout. The ready ring became an
      arc showing how much reel is left. Measured: a 2s hold spent 0.9s of tape
      and took 3.06s to refill
- [x] **Bots use walls**: they knew how to jump AT a wall but never off one —
      airborne, they never pressed jump at all, so a wall touch went unused
      (measured: 0 wall jumps and 0 in-air wall contacts over a whole match).
      A bot that wants height (target above, or nothing under its feet) now
      kicks off a wall it is touching and steers straight back into it for the
      next kick, chaining a climb; the same reflex recovers it from a fall
      down the side of the arena. Measured after: 12 wall jumps in the same
      test, and a bot dropped past the edge kicks back off the wall
- [x] **Every settings control is reachable on a pad**: the Reset buttons sit
      at the right-hand end of their rows and were skipped entirely — a
      disabled control was left out of the cursor list altogether (so a greyed
      Reset was somewhere the cursor had never been able to go), and the
      spatial search preferred whatever was nearest in a straight line over
      whatever shared the current row. The search now tracks two candidates —
      the nearest control sharing this one's row or column, and the best of
      everything else — and takes the in-line one unless it is far away and
      something else is right there. Greyed Reset buttons keep their place in
      the cursor list. Measured: Choose Cards -> Reset -> the rarity Reset ->
      the sliders, and in the card panel the grid is entered through its own
      All / None / Invert bar rather than over the top of it
- [x] **Sawblade's cooldown starts when the disc stops**: the block cooldown
      was ticking away underneath the 3s guard, which made the shield close to
      free. It now runs 3s + the usual cooldown (measured 4.55s against a
      1.55s base)
- [x] **Drill Rounds go through anything, once**: the drill budget was a
      THICKNESS in pixels (70px, +50 a stack), so a fat pillar simply ate the
      round and a breakable panel or a crate was never drillable at all — those
      materials were handled before the drill check. It is now a COUNT of holes
      — one per copy of the card — and the walk across a solid is bounded by
      that solid's own diagonal, so stone, breakable panel and crate all give
      way regardless of size. The round is handed back the drop it would have
      taken while crossing, or a thick wall would flatten its arc. Measured
      through a 130x334 stone tower, a 220x24 breakable shelf and a 54px crate:
      each drilled through, came out the far side, and left the round with no
      holes to spare
- [ ] Balance pass on the newer cards once they've been played for real

### 3. Arena system — 25 levels with themes & personality
- [x] Level schema: name, theme blurb, full palette (sky gradient, platform colors,
      accent), platforms, hazards, movers, features, weather particles
- [x] Engine features: moving platforms (carry riders), bounce pads, conveyors, ice
      (slippery), wind/gusts, low gravity, teleporters, timed lightning strikes,
      rising/falling tide, syrup slow-zones, phase (crumbling) platforms,
      arena bullet-bounce modifier
- [x] **25 arenas**, each with a distinct theme + 1–2 signature mechanics
- [x] File: `js/levels.js`
- [x] **Level-design pass vs ROUNDS** (AUDIT.md §5): three new engine systems —
      breakable platforms (`breakable`), chain-hung platforms shot down by
      cutting their chains (`hung[]`), and pushable/climbable/destructible
      crates (`crates[]`, buoyant in water and tides, shoved by bullets and
      explosions) — plus a geometry second draft of all 25 arenas: climbable
      walls/towers everywhere (wall-jump finally has terrain), perches,
      overhangs, and asymmetric silhouettes. Per-round prop state resets in
      `resetRound`
- [x] **Loose-slab physics** (AUDIT.md §5 L10): a platform cut off its chains
      becomes a free rigid body — corner-contact solver with torque, so it
      teeters, tumbles, and settles honestly; bullets/explosions kick and spin
      it, players shove it, ride it, get crushed under it, and wall-kick off
      it; it floats in water. Sleeps when still, wakes on impulse; rebuilt
      per round in `resetProps`
- [x] **Tease-gap pass + `npm run audit-arenas`** (AUDIT.md §5 L11): 17 gaps
      that looked walkable but were narrower than the 54px body widened past a
      body width (or sealed flush); the audit tool scans doorways and vertical
      squeezes in every arena, reads the body size from `js/gameplay.js`, and
      fails CI-style on any find
- [x] **Swimming** (AUDIT.md §5 L12): underwater, jump is a repeatable stroke —
      paddle up, steer with left/right, breach with the last kick
- [x] **Scale & ballistics pass** (AUDIT.md §5 follow-up): per-level playfield
      sizes (`size:{w,h}` — 1460×820 tight up to 2000×1000 grand, ROUNDS-style
      scale variety); default bullets retuned for lobbing (speed 1180, gravity
      1050 → max arc ≈ 1330px, life 3.2s, slightly slimmer); seven explicit
      open-sky **lob arenas** whose upper air stays empty on purpose; ammo pips
      moved to a row just above the weapon barrel
- [x] **Backdrop refreshes delivered** (`image-requests-history.md` §8): repaints
      for the 6 arenas whose silhouette changed most (Neon Skyline, Koi Temple,
      Tidal Wreck, Midnight Library, Lantern Festival, Aurora Summit), painted
      to the new geometry and filed at `assets/images/arenas/`
- [x] **Card art panels wired in** (`image-requests-history.md` §7): the 52
      painted 512×384 scenes at `assets/images/cards/art/<id>.png` are drawn
      full-bleed across the top of every full card face — the draft hand (CSS
      layers) and the card a bot is shown taking (canvas, centre-cropped and
      clipped to the rounded panel). The 256×256 emblems still drive the tiny
      HUD chips and stand in if a scene is ever missing; a card with neither
      draws the tinted panel. Card text clamps to 3 lines so the effect pills
      always keep their space

### 4. Characters — 24 pilots across two waves, procedural + generated art
- [x] Round 2: 12 indie-badass characters lead the roster (Vex, Rook, Jinx,
      Diesel, Nyx, Saber, Havoc, Wraith, Blitz, Fang, Onyx, Riot) — new crest,
      face, and weapon renderers; prompts in image-requests.md §6
- [x] 12 characters, all roughly circular with a signature weapon sticking out
- [x] Procedural canvas renderer per character (crest, eyes, accessory, weapon shape,
      palette) so the game is fully playable before art is generated
- [x] Image prompts for each character in `image-requests.md`; game auto-loads
      `assets/images/characters/canonical/<id>.png` when present, falls back to procedural
- [x] Character select in the lobby: each player joins, cycles characters, locks in
- [x] **Composed sprites**: when `assets/images/characters/render/<id>_body.png` +
      `_weapon.png` (+ optional `_arm.png`) exist, the character is drawn from parts —
      body mirrors with facing, weapon rotates to the aim, bullets spawn at the
      real muzzle. Anchors (body pivot/radius/mount, weapon grip/muzzle, arm
      shoulder/hand) are auto-detected from the alpha channel, whatever framing
      the parts were delivered in
- [x] **Split facing**: the body mirrors with the character's facing (movement)
      and the weapon mirrors with the aim, in two independent frames, so aiming
      behind yourself no longer draws the weapon upside down. Arms ride the
      weapon's frame; the muzzle is a weapon point and depends only on the aim
- [x] **Arm attachment**: each arm sprite (drawn facing right like the weapon)
      keeps its shoulder pinned to a socket on the body and its hand on a hold
      point that rides the weapon, swinging and stretching within limits as the
      weapon tracks the aim. Round nub hands with no direction to them fall back
      to being rigidly parented to the weapon; per-arm layering is back / behind
      weapon / front. `npm run mock-parts <id>` writes placeholder parts so the
      whole path can be exercised before art arrives
- [x] `/workbench` UI for hand-tuning: character grid on the left, viewer on the
      right, and three modes kept in the URL (`?c=vex&mode=edit`) so a reload
      resumes where you left off — **preview** (clean, gamepad aims it like a
      player would), **edit** (onscreen Body/Weapon/Hand selector, move/resize/
      turn handles mirrored as numbers in the panel, reference overlay, undo and
      redo) and **anchor** (anchor points on the source images). Preview fires
      test shots from the rig's own muzzle on the gamepad triggers (or space),
      Anchors → Arm picks None / One / Two — arms exist only once they are asked
      for — and the mode, part tab and handles survive a character change.
      Exports `rigs.json` — overrides only, so a character nobody has touched is
      absent from the file and keeps improving with the detector
- [x] **Backdrop audit**: `npm run audit-keys` finds screen colour that survived
      keying — the pockets keying can't reach, enclosed by a pipe loop, a chain
      link, a topknot. Delivered originals in `characters/archive/` make the
      call factual where they exist (`--fix` cuts those); everything else is
      reported as a colour-only suspect for eyeballing, since plenty of art is
      legitimately neon green or magenta. Seven weapons/bodies cleaned this way
      (diesel, fang, saber, blitz, havoc, luna, riot)
- [x] **Art intake**: `npm run intake` takes delivered files from `intake/`, keys
      out solid backdrops (magenta/green/white screens) into transparent PNGs,
      files them into `characters/canonical/` or `characters/render/`, and keeps
      the delivered originals in `characters/archive/`. Interior color matching
      the screen survives (only backdrop connected to the border is cut) and
      already-transparent art passes through untouched. `/workbench/intake.html`
      is the visual version for stubborn cutouts; `js/chroma.js` is shared by
      both and also keys at load time as a safety net
- [x] **Art landed (24 characters)**: canonical hero images in
      `assets/images/characters/canonical/`, body/weapon/arm parts in `render/`.
      22 of the 96 delivered files arrived opaque on magenta/green/grey screens
      and were keyed at intake; the delivered originals are kept in
      `characters/archive/`
- [x] **Composed characters match the procedural geometry**: the body's ball is
      found by fitting a circle to the outline (RANSAC + least squares + a
      hug-the-outline polish), so hats, horns and flames fall out as outliers and
      the ball lands on the collision circle; the weapon is scaled to a
      1.5-radius barrel with the grip riding
      0.55 radii out along the aim, and the barrel's tilt in the source art is
      cancelled — the weapon points exactly where the stick does (verified at
      0.00° off-axis across all 24 characters and eight aim angles)
- [x] **`npm run fitrig`**: the delivered parts are each drawn full-frame on
      their own canvas, so a hand arrives as a ball half the size of the body.
      The fitter matches the arm art into the canonical hero image to recover the
      hand size and grip position, and writes those to `render/rigs.json`;
      everything else stays automatic
- [x] **Facing follows movement, aiming follows the aim stick**: the body turns
      with the direction the player is moving (holding the last direction when
      they stop) while the weapon points wherever they aim, so a fighter can
      retreat while shooting. The workbench mirrors that split — left stick
      turns the body, right stick aims
- [x] Settings → Visuals → **Use Procedural Characters** (default off) draws the
      whole roster with the built-in vector art instead of the sprites
- [x] Files: `js/characters.js`, `js/rig.js`, `js/chroma.js`, `tools/`, `workbench/`

### 5. Game flow redesign
- [x] Random arena every round (no immediate repeats)
- [x] Settings: arena picker — Random or lock any of the 25
- [x] **Simultaneous drafting**: the two lowest-ranked losers draft at the same
      time (max 2 hands on screen — in 4-player the third loser sits out), each
      with their own hand and their own controls
- [x] **Draft stage redesign**: full-screen scene per chooser washed in their
      color, their character shown large, cards fanned like a held hand of
      playing cards (corner pips, deal-in animation, lift on select); two
      choosers split the screen side by side
- [x] **ROUNDS-style baseline**: 100 HP, no regen, damage subtracted and reset
      each round; default gun three-shots (36 dmg — one full clip is exactly
      lethal), 3 ammo, automatic whole-clip reload when empty (2s), no manual
      reload. Health stays at 100 on purpose: hazard contact, meteors,
      explosions and DoT ticks are absolute numbers weighed against that pool
- [x] **Hazards sting, not kill**: touching a hazard deals 25 damage and
      launches the player up and away (0.9s grace between hits); falling out
      of the world still kills
- [x] Winner banner → draft → next arena loop with splash screens
- [x] Bots pick cards and characters automatically
- [x] **Bots draft off-screen**: a bot never opens the card screen. Its card flies
      up over the arena and flings back into the bot that took it, and the card
      only applies when it lands. A round where only bots draft never shows the
      panel at all
- [x] **Hazards hurt instead of killing**: water ({kind:"water"} pools and the
      rising tide) is a volume you float in — small repeated bites of damage,
      each with its own flash and splash, so you can swim out — and bullets
      crossing it are dragged down. Spikes and lava still hit once and launch
      you clear

### 6. UI / UX overhaul
- [x] Character select stripped to cards only; icon row (info / sound / settings /
      fullscreen) bottom-right; Add Bot appears at 1 player, big Start Match at 2
- [x] Any pad button or WASD / arrow keys joins; slots read "Press A to join"
- [x] Pause = "Game Paused" + Resume / Settings / Quit to Menu
- [x] Spatial controller navigation (rows crossed with left/right)
- [x] All UI text extracted to `js/strings.js`
- [x] Add Bot button replaced by "(Y to add bot)" on every slot but the first
- [x] Slots are mouse-selectable: click cycles keyboard 1 → keyboard 2 → bot → empty
- [x] Arena renders at full 16:9; health rings + ammo pips ride on the fighters
      (ROUNDS-style) and player cards sit in the letterbox margins
- [x] Icon row stays bottom-right everywhere; song widget moved to bottom-left
- [x] Title always attempts fullscreen, whatever pressed start
- [x] How to Play is a full-width two-column layout that fits without scrolling
- [x] Bots read hazards and ledges instead of walking into them
- [x] Hazards damage + launch (~3 touches); the pit bounces you back twice
- [x] `js/gameplay.js` — gameplay tuning config (fighter/gun/block/world/wall/
      hazard baselines); engine and card workbench both read it; base fire
      delay 0.3 → 0.22
- [x] **Arch logo art**: `assets/images/logo-arch.png` (keyed from
      `rounders_logo_arch_v3.png`) replaces the text logo on the title screen
      and main menu; UI palette shifted to match (gunmetal panels, steel-bevel
      buttons, crystal magenta/purple accents)
- [x] Arcade title screen (flashing PRESS START, any input begins, keyboard/mouse
      start also enters fullscreen)
- [x] **Crystal Glass restyle for Start Match + pause menu** (user picked from
      3 mocked options): frosted glass slabs with a coral→purple→sky gradient
      edge and glowing spaced type. The pause backing is deliberately
      semi-transparent (0.55 alpha + 14px blur) so the frozen match shows
      through; "Game Paused" is gradient-clipped text
- [x] Full controller menu navigation (D-pad move, A/Menu confirm, B/View back)
- [x] Every menu control reachable on a pad: dropdowns cycle with ◀ ▶ / step with A
      (Arena gets on-screen ◀ ▶ arrows), D-pad scrolls long panels when the cursor
      has nowhere to go, and LB/RB cycle the corner icon row (how to play, sound,
      settings, fullscreen) with the deselected state at both ends
- [x] Pause menu: resume, settings, how-to-play, fullscreen, music, quit to menu —
      music ducks to 22% while paused
- [x] Xbox controller diagram (inline SVG) on the How to Play screen
- [x] Full visual redesign: animated gradient menu, glassmorphism panels, rarity-glow
      cards, character-portrait HUD, arena intro banner with theme blurb
- [x] Restructured settings (grouped sections, arena picker, rarity rates)
- [x] **Settings pared down** (2026-08-18): Max Players gone (the board always
      seats four), Arena Hazards gone (part of every arena), "Score to Win" is
      now "Rounds to Win". Choose Cards is one button opening its own panel
      (state `cards`, same grid + pad nav) with a Reset beside it that relights
      everything — disabled when the pool is already whole. Card Rarity Rates
      heading carries its own Reset, enabled only when a slider is off its
      default. The Default/Equalize/Choose modes are gone: the pool is simply
      "everything not switched off", at the rarity rates (equalize = set the
      sliders equal)
- [x] **Bot slots are editable from the lobby cursor**: move up from Start
      Match onto any bot slot (they join `visibleControls()` as `.bot-editable`
      articles), A uncommits it into choosing mode (lemon ring, ◀ ▶ arrows),
      left/right walks the roster, A re-commits. Mouse: clicking the Evil Bot
      cycles its fighter; clicking a plain bot slot still cycles the seat type
- [x] **Real victory screen**: arena dims to 18%, spotlight in the winner's
      colour, spaced-out VICTORY kicker, the winner(s) drawn huge on podium
      glows with names beneath, title auto-shrinks to fit, confetti rain in
      the winners' colours, final scores frozen in the margin cards
- [x] **Victory salute for a shared win**: with more than one winner every
      fighter poses the same way — body turned left, weapon arm thrown up to
      1 o'clock, so the raised arm is the one BEHIND the body. Alternating
      aims used to cross two neighbours' weapons. A lone champion has nothing
      to clash with and keeps the relaxed default stance
- [x] Files: `index.html`, `styles.css`

### 6b. Cooperative Mode (2026-08-18)
- [x] Settings → Cooperative Mode checkbox (under Bot Difficulty). On: manual
      bots leave the lobby, "(Y to add bot)" hints disappear and Y does
      nothing, humans cap at 3, and the 4th cell is a pinned **Evil Bot** seat
      (violet `#a64dff`, virtual `evilSlot`, never in `lobbySlots`) with a
      random fighter that can be re-picked like any bot slot
- [x] Start Match appears from 1 human in co-op; `startMatch` spawns one Evil
      Bot copy per human (same fighter, `p.evil`, all violet), and collapses
      teams to players=0 vs bots=1 (`p.team`; in FFA every fighter is their
      own team, so nothing changes there)
- [x] **Team combat rules**: `allied(a,b)` gates `hurt`/`hurtRaw` (no damage,
      no shove), bullets/explosions/chain lightning/seekers/saws pass allies
      by, bots never target or fear teammates. A planted singularity that
      would chew its owner chews teammates too (`{friendly:true}`)
- [x] **Team rounds**: round ends when one side remains; the healthiest
      member carries it and the whole side scores. Splash reads "The
      Players/Evil Bots win the round". The losing side drafts — every fallen
      human at once, while the Evil squad is one mind: it draws ONE card and
      the fling lands it in every copy, so the squad stays identical
- [x] Round splash kicker counts completed rounds (`world.roundCount`) — team
      scoring made the old sum-of-scores wrong
- [x] **Early round call**: the moment every human is down (and none mid-
      Phoenix-rebirth), the round ends instead of making people watch bots
      finish — the healthiest bot standing takes it (FFA and co-op alike)
- [x] Headless suites (scratchpad `coop/t1–t4`): settings shape, card window +
      both resets, bot-slot editing, co-op lobby/Y/evil seat, 2-human → 2-copy
      spawn, friendly-fire truth table, early call, shared squad draft, team
      victory screen, FFA early call + solo victory + rematch

### 7. Audio & FX polish
- [x] Kept: synth SFX, rumble
- [x] New: per-mechanic SFX hooks (burn, chain, teleport, bounce pad), weather particles
- [x] Soundtrack: 28 tracks in `assets/music/` — 14 themes × 2, including the 12
      uploaded 2026-08-17 (Bossa Nova, Calypso, Italian Accorion, Salsa, Spy,
      Waltz). Manifest in `js/music.js`, which also carries each track's theme and
      which take of it this is. "Rounders Jazz 1" is the title/selection theme. Streamed
      via byte-range requests (`server.mjs` serves 206), with the next track warmed
      in the background so skips start instantly.
- [x] Music runs **per match**, not per round, and is not a blind shuffle:
      `js/arena-music.js` is the config table (arena id → song, one line each,
      with the reason) and a match opens on the song cast to the arena it starts
      in. Every track after that is picked by THEME — all 14 themes play once
      before any comes round again, and a returning theme plays the other song of
      its pair ("Tango 2" → "Tango 1"). Every theme is used by at least one arena
      and no two arenas open on the same song (checked at load, warns in console).
- [x] Card draft ducks the music to 55% and leaves the match's song playing —
      the next board does not change it. Pause ducks to 22%.
- [x] Now-playing readout bottom-right with ◀ / ▶ skip buttons

### 8. Audit (agent pass)
- [x] Card balance & variety audit
- [x] Arena variety & uniqueness audit
- [x] Character personality audit
- [x] UI polish audit
- [x] Findings + applied fixes: `AUDIT.md`

### 9. Ship
- [x] Commit and push feature branch
- [x] Merge to `main` and push
- [x] Deploy live: **https://hoai2k.github.io/rounders/** (GitHub Pages via
      `.github/workflows/deploy-pages.yml`, redeploys on every push to `main`)

---

## Descoped (deliberate)

- **Online 2-player mode** (InstantDB): the old netcode synced a 2-player snapshot and
  single-player drafting; it is incompatible with 4-player simultaneous drafting and
  the new arena features. Removed in this redesign; the old implementation remains in
  git history (`rounder-online.html`, pre-redesign `game.js`) if it should return.

## Resume notes (if interrupted)

- Content lives in `js/cards.js`, `js/levels.js`, `js/characters.js`; engine in `game.js`.
- Generated art is optional: drop PNGs at the paths listed in `image-requests.md`
  and the game will use them automatically; nothing breaks when absent.
