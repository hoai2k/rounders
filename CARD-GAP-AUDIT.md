# Card Gap Audit — Rounders (55) vs ROUNDS (67)

An audit of our full card set against the complete base-game card list of ROUNDS
(Landfall Games), to find basic, fun, or otherwise key powers we're missing, plus
new ideas that go beyond what ROUNDS offers.

**Sources for the ROUNDS list** (two independent sources, matching card-for-card,
67 cards total): the [ROUNDS Fandom wiki "All Cards"](https://rounds.fandom.com/wiki/All_Cards)
table and the [Steam Community "All Cards A-Z" guide](https://steamcommunity.com/sharedfiles/filedetails/?id=2445921586).
Cards like "Pong" or "Wraparound" are mod-only (Pykess expansion etc.) and excluded.

**Verdict up front:** we cover roughly **40 of ROUNDS' 67 cards** with a direct or
close equivalent, and we have ~15 mechanics ROUNDS doesn't have at all (burn, chain
lightning, thorns, regen, golden shot, regenerating shield, knockback resist, real
movement cards, Mythic actives…). The real gaps are **structural, not individual**:

1. **Block depth** — ROUNDS hangs ~20 cards off the block button; we have 6.
   This is ROUNDS' signature system and our thinnest area.
2. **Reload-cycle economy** — ROUNDS has 5 cards that interact with the reload
   cycle (Scavenger, Tactical Reload, Shields Up, Radiance, Refresh); we have zero
   beyond "reload faster".
3. **Conditional / triggered buffs** — ROUNDS rewards momentary states (after
   dealing damage, while topped up, while approaching); our only conditionals are
   low-HP ones (Berserker's Blood, Panic Pedals).
4. **Area denial** — every effect we have is instantaneous; ROUNDS has lingering
   clouds, fields, and delayed bombs.
5. **Skill-expression bullets** — Remote (manually steered bullets), Target
   Bounce, and bounce-damage scaling are some of ROUNDS' most-loved cards and we
   have no counterpart.
6. **Control beyond slow** — stun (Dazzle) and silence exist there, not here.
7. **Knockback as offense** — we added knockback *resist* (Brick Wall) but no card
   *deals* extra knockback (Thruster).

Recommendation: add **12 cards** (§4) to close the high-value gaps, taking the set
from 55 to 67 — coincidentally matching ROUNDS' count — plus a shortlist of
original ideas (§5) that use engine systems we already built (slab physics, void
pull, shields, chill).

---

## 1. Our current coverage, by mechanic family

The 55 cards in `js/cards.js` group into these families (stat names from
`defaultStats()` in `game.js`):

| Family | Our cards | Stats |
|---|---|---|
| Gun stats (damage/ammo/rate/reload) | Bubblegum Rounds, Cannonball, Hair Trigger, Speed Loader, Big Bore, Glass Cannon, Hummingbird, Dragon's Hoard, Golden Gun | damage, maxAmmo, fireDelay, reload, goldenShot |
| Multishot | Buckshot Buttons, Double Dutch, Bullet Ballet | pellets, spread |
| Ballistics / accuracy | Longshot, Magnet Fingers, Comet Trail, Railgun | bulletSpeed, bulletGravity, homing, grow, pierce |
| Bullet behavior | Ricochet Romance, Drill Rounds, Lowrider, Shrapnel Burst | bounces, pierce, groundHug, shards |
| On-hit effects | Wasp Venom, Cinder Shot, Permafrost, Popcorn Payload, Black Mamba, Chain Letter, Storm Caller, Pocket Void, Supernova, Party Favor | poison, burn, chill, explosive, chain, voidPull |
| Block | Rocket Skates, Echo Chamber, Bodyguard, French Exit, Crown of Storms (+ Rocket Skates/French Exit cooldown mods) | blockDash, echoBlock, blockPush, warpBlock, stormBlock, blockCooldown |
| Defense / health | Stone Soup, Brick Wall, Juggernaut, Thorn Jacket, Aegis Bubble | maxHp, kbResist, thorns, shield, radius |
| Sustain | Leech Lunch, Field Medic, Grim Harvest | lifesteal, regen, killHeal |
| Clutch / low-HP | Phoenix Feather, Guardian Halo, Berserker's Blood, Panic Pedals | revives, guardian, rage, adrenaline |
| Movement | Featherweight, Grasshopper, Moon Shoes, Sticky Soles, Tailwind | speed, jump, extraJumps, accel, airAccel, brake |
| Mythic actives | Starfall Protocol, Event Horizon, Chronoshift | active |

## 2. Card-by-card mapping — every ROUNDS card vs our set

✅ = covered (direct or close equivalent) · 〰️ = partially covered · ❌ = gap

### Gun / firing modifiers

| ROUNDS card | Effect (short) | Ours | Status |
|---|---|---|---|
| Barrage | +4 bullets, big damage cut | Bullet Ballet | ✅ |
| Big Bullet | Bigger bullets | Big Bore | ✅ |
| Buckshot | Shotgun spread | Buckshot Buttons | ✅ |
| Burst | Fires bullets **in sequence** (burst fire) | — (pellets fire simultaneously) | ❌ |
| Careful Planning | +100% dmg, much slower firing | Cannonball | ✅ |
| Combine | +100% dmg, −2 ammo | Cannonball / Glass Cannon | ✅ |
| Demonic Pact | Shooting costs 10 HP; no fire cooldown | — | ❌ |
| Fastball | +250% bullet speed | Longshot / Railgun | ✅ |
| Fast Forward | Straight trajectory, faster | Longshot (less drop, not none) | 〰️ |
| Glass Cannon | +100% dmg, −100% HP | Glass Cannon | ✅ |
| Quick Reload | −70% reload | Speed Loader | ✅ |
| Quick Shot | +150% bullet speed | Longshot | ✅ |
| Spray | +1000% attack speed, +12 ammo, −75% dmg | Hummingbird (much tamer) | 〰️ |
| Steady Shot | +HP +bullet speed | (stat combos exist) | ✅ |
| Wind Up | Slow but hard-hitting | Cannonball | ✅ |
| Scavenger | **Dealing damage reloads your gun** | — | ❌ |

### Bullet behavior

| ROUNDS card | Effect (short) | Ours | Status |
|---|---|---|---|
| Bouncy | +2 bounces, +dmg | Ricochet Romance | ✅ |
| Mayhem | +5 bounces | Ricochet Romance ×2 | ✅ |
| Ricochet | +2 bounces, +attack speed | Ricochet Romance | ✅ |
| Target Bounce | **Bullets aim at targets when bouncing** | — | ❌ |
| Trickster | **+80% damage per bounce** | — | ❌ |
| Homing | Bullets home | Magnet Fingers / Black Mamba | ✅ |
| Remote | **Steer bullets manually with your aim** | — | ❌ |
| Sneaky | Bullets curve over terrain | Lowrider (inverse: hugs ground) | ✅ |
| Drill Ammo | **Bullets pass through walls** | Drill Rounds pierce *players*, not walls | ❌ |
| Grow | Damage grows in flight | Comet Trail | ✅ |
| Thruster | **Bullets shove targets (knockback)** | — | ❌ |

### On-hit effects

| ROUNDS card | Effect (short) | Ours | Status |
|---|---|---|---|
| Cold Bullets | Chill on hit | Permafrost | ✅ |
| Dazzle | **Bullets stun** | — | ❌ |
| Explosive Bullet | Explode on impact | Popcorn Payload / Supernova | ✅ |
| Poison | DoT 3s | Wasp Venom | ✅ |
| Parasite | DoT + lifesteal + HP | Black Mamba + Leech Lunch | ✅ |
| Timed Detonation | **Impact spawns a delayed bomb** | — | ❌ |
| Toxic Cloud | **Impact leaves a poison cloud (area denial)** | — | ❌ |

### Block cards (ROUNDS' signature family — 20 cards vs our 6)

| ROUNDS card | Effect (short) | Ours | Status |
|---|---|---|---|
| Bombs Away | Block scatters bombs | — | ❌ |
| Echo | Delayed second block | Echo Chamber | ✅ |
| EMP | Block emits slowing ring | — | ❌ |
| Empower | **Block buffs next shot; that shot carries your block effects to where it lands** | — | ❌ |
| Frost Slam | Block chills nearby enemies | — | ❌ |
| Healing Field | Block creates a healing zone | — | ❌ |
| Implode | Block pulls enemies in | Pocket Void (bullet-side pull) | 〰️ |
| Overpower | Block damages nearby (% max HP) | Crown of Storms | ✅ |
| Radar Shot | Block auto-shoots detected enemies | — | ❌ (skip — see §3) |
| Saw | Block spawns an orbiting saw | — | ❌ |
| Shield Charge | Block launches you forward | Rocket Skates | ✅ |
| Shields Up | **Last bullet fired triggers a block** | — | ❌ |
| Shockwave | Block pushes enemies away | Bodyguard | ✅ |
| Silence | **Block disables nearby enemies' abilities** | — | ❌ |
| Static Field | Block leaves a slowing/damaging field | — | ❌ |
| Supernova | Block pulls in, then detonates | Event Horizon (Mythic active) | 〰️ |
| Tactical Reload | **Block reloads your gun** | — | ❌ |
| Teleport | Block teleports you | French Exit | ✅ |
| Defender | Pure block-cooldown + HP | (cooldown mods ride other cards) | 〰️ |
| Refresh | **Dealing damage refreshes your block** | — | ❌ |

### Health / defense / sustain

| ROUNDS card | Effect (short) | Ours | Status |
|---|---|---|---|
| Brawler | **+200 HP for 3s after dealing damage** | — | ❌ |
| Decay | **Damage to you is dealt gradually over 4s** | — | ❌ |
| Huge | +80% HP, bigger hitbox | Juggernaut | ✅ |
| Leech | Lifesteal + HP | Leech Lunch | ✅ |
| Lifestealer | **Passive HP drain from nearby opponents** | — | ❌ |
| Phoenix | Respawn once on death | Phoenix Feather | ✅ |
| Pristine Perseverance | **+400 HP while above 90% HP** | — | ❌ |
| Tank | +100% HP, slower gun | Stone Soup / Juggernaut | ✅ |

### Movement / aura / utility

| ROUNDS card | Effect (short) | Ours | Status |
|---|---|---|---|
| Chase | **+speed when moving toward the opponent** | — | ❌ |
| Taste of Blood | **+speed for 3s after dealing damage** | — | ❌ |
| Chilling Presence | **Slow aura around you** | — | ❌ |
| Abyssal Countdown | **Stand still to charge a block-aura** | — | ❌ (skip — see §3) |
| Radiance | **Damaging waves while reloading** | — | ❌ |

### Where we exceed ROUNDS

Mechanics we have that vanilla ROUNDS doesn't: **burn** (Cinder Shot), **chain
lightning** (Chain Letter, Storm Caller), **thorns** (Thorn Jacket), **regen**
(Field Medic), **low-HP rage/adrenaline** (Berserker's Blood, Panic Pedals),
**golden first shot** (Golden Gun), **regenerating shield** (Aegis Bubble),
**kill-heal** (Grim Harvest), **survive-lethal** (Guardian Halo), **knockback
resist** (Brick Wall), **shrapnel split** (Shrapnel Burst), **void pull on
impact** (Pocket Void), **ground-hugging bullets** (Lowrider), a real
**movement family** (5 cards — vanilla ROUNDS famously has almost none), and
the whole **Mythic active tier** (Starfall, Event Horizon, Chronoshift).

## 3. Gap analysis — what to close, what to skip

### Close (high value)

- **Block depth** is the single biggest gap. ROUNDS' most build-defining drafts
  are block cards, and block-on-X effects compound beautifully with our existing
  echoBlock/blockPush/stormBlock. Missing verbs: heal zone, chill slam, saw,
  bomb scatter, empower-next-shot, auto-block-on-empty-clip.
- **Reload economy** creates a second rhythm to fight around. "Damage reloads
  you", "block reloads you", and "you're dangerous *while* reloading" all reward
  different play, and our engine's whole-clip auto-reload makes them trivial to
  implement (skip/shorten `reloadT`).
- **Triggered buffs** (after-hit speed, after-hit temp shield, chase speed,
  topped-up bonus) give commons/uncommons personality without new projectile
  code — they're timers on existing stats.
- **Area denial** (lingering cloud, delayed bomb) changes how space is used and
  synergizes with our chill/burn/poison DoT plumbing.
- **Remote steering + bounce intelligence** (Remote, Target Bounce, Trickster)
  are the highest-skill-expression cards in ROUNDS and consistently rated the
  most fun. We already integrate per-bullet steering for homing; steering by
  aim input is the same code path with a different target.
- **Knockback offense** (Thruster). We built kbResist; the offensive half is
  missing, and it makes our pit/hazard arenas matter more.
- **Stun / silence** — one short, honest stun card and one anti-block card add
  counterplay to turtles. Keep durations short (≤0.5s stun) — see AUDIT.md's
  philosophy of avoiding feel-bad control.

### Skip (with rationale)

- **Radar Shot** (block auto-shoots detected enemies) — automation that removes
  the player from the loop; our homing already covers "aim help" with more
  player agency.
- **Abyssal Countdown** (stand still to charge) — rewards camping; our arenas
  and hazard design push movement, and bots would abuse or be abused by it.
- **Spray** at ROUNDS magnitude (+1000% attack speed) — our C2/C3 balance work
  (AUDIT.md) deliberately caps stacking magnitudes; Hummingbird already owns
  this fantasy at sane numbers.
- **Demonic Pact** exact form (shooting costs HP) — worth doing, but as a
  rare with lifesteal anti-synergy guarded (HP cost can't kill you, floor at
  1 HP), see Blood Money below.
- **Defender** (pure block-stat card) — folded into the new block cards'
  cooldown riders instead of a card of its own; pure stat sticks are our least
  interesting commons.

## 4. Proposed cards — 12 to close the gaps (55 → 67)

Names follow the set's pun-forward voice; every effect stacks per the STACKING
RULE in `js/cards.js` unless noted. Suggested rarity keeps the ladder's shape
(now 16 C / 17 U / 15 R / 11 E / 5 L / 3 M… see distribution note below).

| # | Card | Rarity | Effect | Fills | Engine notes |
|---|---|---|---|---|---|
| 1 | **Waste Not** | Uncommon | Every bullet that hits a player is refunded to your magazine. +0.15s fire delay. | Scavenger | On-hit hook: `ammo = min(ammo+1, maxAmmo)`. Stacks → also shave 0.2s off next reload. |
| 2 | **Pit Stop** | Uncommon | Blocking instantly refills your magazine. +0.25s block cooldown. | Tactical Reload | On-block: cancel `reloadT`, refill clip. |
| 3 | **Lemonade Stand** | Rare | Blocking plants a fizzy zone that heals anyone inside 10 HP/s for 3s (you included — position it well). | Healing Field | Circle zone entity; reuse tide/syrup zone plumbing. Stacks → bigger + stronger. |
| 4 | **Cold Snap** | Uncommon | Blocking flash-freezes the air: everyone nearby is chilled for 2.5s. +10% health. | Frost Slam / EMP | On-block AoE applying existing `chill`. |
| 5 | **Mosh Pit** | Rare | Blocking spins a sawblade around you for 2s that shreds anyone it touches (8 dmg/tick + knockback). | Saw | Orbiting hazard entity, reuse hazard-contact damage path. |
| 6 | **Return to Sender** | Epic | Blocking supercharges your next shot: +75% damage, and your block effects (push, nova, chill…) detonate where it lands. | Empower | Flag on player consumed by next fired bullet; on impact, run on-block handlers at impact point. The combo engine that multiplies every other block card. |
| 7 | **Panic Button** | Uncommon | Firing your last bullet automatically triggers your block (and everything attached to it). +0.3s reload. | Shields Up | On clip-empty: invoke block if off cooldown. |
| 8 | **Puppet Strings** | Epic | After firing, your bullet steers toward wherever you point — walk it around cover. −30% bullet speed, −10% damage. | Remote | Reuse homing integration with target = aim ray instead of nearest player. Only the newest bullet is steered. |
| 9 | **Bank Shot** | Rare | +1 bounce, and after any bounce the bullet veers toward the nearest opponent and hits 30% harder per bounce taken. | Target Bounce + Trickster | On-bounce: acquire homing target; per-bounce damage multiplier on the bullet. |
| 10 | **Boxing Glove** | Common | Your bullets hit like a haymaker: +120% knockback dealt, +10% bullet size, −10% damage. | Thruster | New stat `kbDeal` mirrored against existing `kbResist`; shines on pit/hazard arenas. |
| 11 | **Stink Bomb** | Rare | Impacts burst into a lingering cloud (2.5s) that poisons and slows anyone who stands in it. −10% damage. | Toxic Cloud / Static Field / Timed Detonation | Zone entity applying `poison` + `chill` on contact; area denial verb. |
| 12 | **Sugar Rush** | Common | Landing a hit makes you giddy: +35% move speed for 2.5s. | Taste of Blood / Chase | Timer buff on existing `speed`; pairs with Panic Pedals for a speed build. |

**Second wave (if the set should grow past 67)** — the rest of the close-list,
pre-named: **Payment Plan** (rare — damage you take is dealt over 3s instead of
instantly; Decay), **Fresh Coat** (rare — +50% max HP while you haven't been hit
this round... resets on taking damage; Pristine Perseverance), **Hot Streak**
(uncommon — dealing damage grants a 25-point decaying shield; Brawler, reuses
`shield`), **Blood Money** (rare — no fire delay, each shot costs 5 HP, can't
drop you below 1; Demonic Pact), **Camera Flash** (rare — hits daze for 0.4s
(no move/shoot), 2s per-target immunity after; Dazzle), **Gag Order** (rare —
hits mute the victim's block and active for 1.5s; Silence), **Coffee Break**
(uncommon — while reloading you emit three damaging espresso pulses; Radiance),
**Triple Tap** (uncommon — each trigger pull fires a tight 3-round burst over
0.18s; Burst), **Cold Shoulder** (rare — enemies near you are permanently
chilled; Chilling Presence), **Second Serve** (rare — dealing bullet damage
instantly refreshes your block; Refresh).

**Rarity distribution note:** the 12 land as 2 common, 4 uncommon, 4 rare,
2 epic → new totals 16 C / 17 U / 15 R / 11 E / 5 L / 3 M. That keeps commons
plentiful at draft time and adds no new legendaries/mythics, which stay scarce
on purpose.

## 5. Beyond ROUNDS — original ideas the engine is already asking for

Ideas with no ROUNDS counterpart, ordered by how much existing engine machinery
they reuse:

1. **Bricklayer** (epic, block) — blocking conjures a stone slab in front of you
   that becomes a real physics object: it falls, tumbles, can be stood on, shot,
   and crushes. We already built the entire loose-slab rigid-body system for
   arenas (AUDIT.md §5 L10) — this card hands it to players. Cover on demand,
   crush plays, bridge-building over pits.
2. **Overflow** (rare, sustain) — lifesteal and healing past full HP becomes
   shield (up to +40). Pure synergy card: makes Leech Lunch / Field Medic /
   Grim Harvest / Lemonade Stand drafts keep paying when topped up. Reuses
   `shield` wholesale.
3. **Helium Rounds** (uncommon, ballistics) — your bullets fall *up*: gravity
   inverted, gentle. Lob shots under floating islands and up through gaps; a
   genuinely new firing solution on our vertical arenas, and it's one sign flip
   on `bulletGravity` plus a tell.
4. **Boomerang** (rare, projectile) — bullets that break without hitting anyone
   fly back toward you; catching one refunds it to your magazine. Skill loop:
   missing on purpose becomes a second angle of attack (rear hits on the way
   back). Reuses homing steering with target = owner.
5. **Body Double** (rare, block) — blocking leaves a stationary decoy of your
   character (procedural renderer already draws them); enemy homing, chain
   lightning, and bots target it until it pops (20 HP). Counterplay to our
   whole guidance family.
6. **Springload** (uncommon, movement) — landing on an opponent's head deals 25
   damage and launches you high. Mario-stomp fantasy; we already resolve
   player-player contact and have launch plumbing from hazards.
7. **Encore** (epic, firing) — every shot is followed 0.8s later by a ghost
   copy of itself at 50% damage, fired from where you are now. Rhythm-based
   pressure; doubles as a mind game around blocks (bait the parry, hit with
   the echo).
8. **Underdog** (uncommon, meta) — +8% damage and +8% speed for every round
   your opponent leads by. A comeback card that leans into the loser-drafts
   loop — the further behind, the scarier the draft.
9. **Firecracker Heels** (uncommon, movement/aoe) — your mid-air jumps detonate
   a small blast beneath you (15 dmg, knockback). Turns Moon Shoes stacks into
   an attack pattern; reuses explosion plumbing.
10. **Magnet Suit** (rare, defense) — enemy bullets curve slightly *away* from
    you (inverse homing). The defensive mirror of Magnet Fingers; creates
    near-miss drama and rewards flat, fast shots against it.

Synergy hooks worth keeping in mind while implementing: Return to Sender (#6 in
§4) multiplies the value of *every* block card, existing and new; Overflow does
the same for the sustain family; Boxing Glove + Pocket Void/knockback arenas;
Stink Bomb + Storm Caller (chill stacking); Panic Button + Echo Chamber +
Crown of Storms is a doomsday-clip build. That connective tissue — cards whose
value depends on the rest of your board — is what ROUNDS' Empower proves out,
and it's the single most build-crafty addition available to us.

---

*Next steps if approved: implement §4's 12 cards (new stats: `kbDeal`, zone
entities, empower/steered-bullet flags), add their emblem + scene prompts to
`image-requests.md`, and run a balance pass against the AUDIT.md baseline math
(80.5 sustained DPS, 100 HP pool).*
