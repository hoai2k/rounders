# Rounders — the card set

Every one of the **83 power cards**, what it does, and what it costs you.
Lose a round and you draft one; they stack, so a second copy compounds.

> Generated from [`js/cards.js`](js/cards.js) by `npm run cards-doc` — edit the cards there, not here.

A **button badge** in the *Asks you to* column means the card only pays off when you press
something; cards without one are passive and just change your numbers.

## Rarities

| Rarity | Cards | Draft weight | Chance per slot |
|---|---|---|---|
| **Common** | 13 | 9 | 36.0% |
| **Uncommon** | 20 | 6 | 24.0% |
| **Rare** | 26 | 4 | 16.0% |
| **Epic** | 17 | 3 | 12.0% |
| **Legendary** | 4 | 2 | 8.0% |
| **Mythic** | 3 | 1 | 4.0% |

Draft chances are for the default pool; **Settings → Choose Cards** can level them
out (*Equalize*) or cut the set down to a list you build yourself.

## Common (13)

| Card | What it does | Effects | Asks you to | Tags |
|---|---|---|---|---|
| **Bubblegum Rounds**<br>*Chews through magazines.* | Carry 2 extra bullets per magazine, but each one hits a little softer. | +2 ammo · −10% damage | — | ammo |
| **Cannonball**<br>*Subtlety is for other people.* | Your shots hit much harder, but they fly slower and reloading takes longer. | +25% damage · slower shot & reload | — | damage |
| **Featherweight**<br>*Float like a… you know.* | Faster everywhere and far better steering in the air, for a thinner health bar. | +16% speed · +20% air control · −12% health | — | movement |
| **Stone Soup**<br>*Mostly rocks. Somehow filling.* | A big helping of extra health with only a small hit to your ground speed. | +35% health · −6% speed | — | defense |
| **Hair Trigger**<br>*Don't even breathe on it.* | Shots come out much sooner after each other, and you carry one extra round. | −22% fire delay · +1 ammo | — | firerate |
| **Speed Loader**<br>*Practice makes permanent.* | Reloading your magazine takes a third less time. | −32% reload time | — | ammo |
| **Grasshopper**<br>*The floor is merely a suggestion.* | Tap jump as normal. Hold it and you land coiled — let go to launch, up to a full board. | tap = a normal jump · hold 0.5s+ = a charged one | **A** hold to charge the jump | movement |
| **Brick Wall**<br>*You shall not pass. Probably.* | Extra health, and you barely budge: knockback against you drops by 40%. | +15% health · −40% knockback taken | — | defense |
| **Buckshot Buttons**<br>*Why fire one when you can fire three?* | Each trigger pull fires 2 extra pellets in a cone. Each pellet is weaker. | +2 pellets, wide · −40% dmg per pellet | **RT** shoot | multishot |
| **Moon Shoes**<br>*One small hop for a rounder…* | Gain one extra jump you can use in mid-air. No catch. | +1 air jump | **A** jump | movement |
| **Sticky Soles**<br>*Grip for days.* | Accelerate and stop much more sharply — you go exactly where you mean to. | +50% acceleration · +35% braking | — | movement |
| **Second Wind**<br>*You are not done yet.* | A deeper reserve of health, and nothing given up for it. | +25% health | — | defense |
| **Padded Vest**<br>*Bulk has its uses.* | Thick padding soaks up punishment; you move a shade slower wearing it. | +20% health · −4% speed | — | defense |

## Uncommon (20)

| Card | What it does | Effects | Asks you to | Tags |
|---|---|---|---|---|
| **Longshot**<br>*Practically a laser.* | Bullets fly twice as fast and drop less over distance — great for cross-map duels. | +100% bullet speed · −15% bullet drop | — | accuracy |
| **Tailwind**<br>*The sky likes you today.* | Steer far better in the air, and hold jump to hang there for up to 2 seconds. | +50% air control · hold jump to float (2s) | **A** hold to float | movement |
| **Sugar Rush**<br>*Hits taste like candy.* | Landing a hit makes you giddy: triple move speed for 2.5 seconds. | +200% speed for 2.5s after a hit | **RT** shoot | movement |
| **Ricochet Romance**<br>*Every wall is a matchmaker.* | Your bullets bounce off walls and floors up to 2 times before breaking. | +2 wall bounces | **RT** shoot | projectile |
| **Cinder Shot**<br>*Leave a little warmth behind.* | Bullets set enemies on fire, burning them for extra damage over 2.5 seconds. | burn on hit (2.5s) · +0.06s fire delay | **RT** shoot | dot |
| **Permafrost**<br>*Cold hands, cold heart.* | Hits chill enemies, slowing their movement and jumps for 2 seconds. | chill on hit (2s slow) · −10% damage | **RT** shoot | control |
| **Magnet Fingers**<br>*Bullets with abandonment issues.* | Your shots gently curve toward the nearest opponent. | light homing · −8% bullet speed | **RT** shoot | accuracy |
| **Leech Lunch**<br>*Eat what you hit.* | Heal for 25% of every point of bullet damage you deal. | 25% lifesteal | **RT** shoot | sustain |
| **Double Dutch**<br>*Two ropes, two bullets.* | Fire a tight twin shot. Each bullet is weaker than a single would be. | +1 pellet, tight · −25% dmg per pellet | **RT** shoot | multishot |
| **Lowrider**<br>*Keeps a low profile.* | Your bullets drop to the floor and skim along it, up to your target's ankles. | bullets follow the ground · −8% damage | **RT** shoot | projectile |
| **Waste Not**<br>*Every bullet comes home.* | Bullets that hit a player are refunded. Shots come a touch slower. | hits refund ammo · +0.15s fire delay | **RT** shoot | ammo |
| **Pit Stop**<br>*Four seconds flat.* | Throwing a block instantly refills your magazine — it need not catch anything. | block = full reload · +0.25s block cooldown | **LT** block | block · ammo |
| **Triple Tap**<br>*Once more, with feeling. Twice.* | Every trigger pull comes back as two lighter echo shots, three quarters of a second later. | +2 echoes, 0.7s later (45% damage) · +0.1s fire delay | **RT** shoot | firerate |
| **Hot Streak**<br>*Ride the wave.* | Dealing bullet damage wraps you in a 25 shield that burns off over four seconds. | hits grant a decaying 25 shield | **RT** shoot | defense |
| **Helium Rounds**<br>*Gravity is a social construct.* | Your bullets fall up — gently. Lob shots under ledges and up through gaps. | bullets arc upward | **RT** shoot | projectile |
| **Springload**<br>*The classic.* | Landing on an opponent's head deals 25 damage and bounces you high. | head stomp: 25 damage + bounce | **A** jump | movement |
| **Firecracker Heels**<br>*Ignition on the second hop.* | Gain a mid-air jump, and every mid-air jump detonates beneath you. | +1 air jump · air jumps explode (15) | **A** jump | movement · aoe |
| **Fresh Coat**<br>*Still has the sticker on.* | Start each round in a +50% health overcoat. It shatters the first time you're hit. | +50% HP shell until first hit | — | defense |
| **Iron Rations**<br>*Heavy, dull, and it keeps you alive.* | A much longer health bar, paid for with a slower reload. | +30% health · +0.15s reload | — | defense |
| **Sandbags**<br>*Dig in.* | Weighed down and hard to shift: much more health, a little less spring. | +25% health · −6% jump | **A** jump | defense |

## Rare (26)

| Card | What it does | Effects | Asks you to | Tags |
|---|---|---|---|---|
| **Boxing Glove**<br>*Float like a truck.* | Huge knockback on every shot, and a block stops the damage but not the punch. | +300% knockback · punches through blocks · bigger rounds · −10% dmg | **RT** shoot | control |
| **Wasp Venom**<br>*The sting is just the beginning.* | Hits inject stacking venom over 3s, and the sting drifts after its target. | stacking poison (3s) · slight homing · −15% damage | **RT** shoot | dot · accuracy |
| **Popcorn Payload**<br>*Pop pop pop.* | Bullets pop into 10 kernels that rain down, bounce twice and keep hurting. | pops into 10 kernels · they rain and bounce · −10% damage | **RT** shoot | aoe |
| **Bodyguard**<br>*Personal space, enforced.* | Blocking shoves nearby opponents away and swats bullets caught in it aside. | block shockwave · scatters bullets near · +15% health | **LT** block | block |
| **Panic Button**<br>*Insurance you fire.* | Firing your last bullet triggers your block automatically — and all it carries. | last bullet auto-blocks · +0.3s reload | — | block · clutch |
| **Drill Rounds**<br>*Through, not around.* | Bullets bore clean through one piece of terrain — any thickness, any material — and fly on. | through 1 wall per shot · −12% damage | **RT** shoot | projectile |
| **Thorn Jacket**<br>*Hug at your own risk.* | Attackers take 35% of the damage they deal you, straight back through blocks. | reflect 35% of damage taken · +15% health | — | defense |
| **Phoenix Feather**<br>*Death is a scheduling conflict.* | The first time you die each round, burst back to life at half health. | revive once per round (50% HP) · −15% health | — | clutch |
| **Glass Cannon**<br>*Handle with care. Or don't.* | Massive damage boost, but your health bar becomes alarmingly small. | +60% damage · −25% health · rounds fly in glass | — | damage |
| **Comet Trail**<br>*Give it room to breathe.* | Bullets grow stronger the farther they fly — up to double damage at range. | grows to 2× with range · +12% bullet speed | **RT** shoot | accuracy |
| **Shrapnel Burst**<br>*The gift that keeps on fragmenting.* | When a bullet breaks, it splits into 3 shards that each deal 40% damage. | bullets split into 3 shards | **RT** shoot | aoe |
| **Field Medic**<br>*Walk it off. Literally.* | Constantly regenerate 5 health per second, plus a little more max health. | +5 HP/s regeneration · +10% health | — | sustain |
| **Aegis Bubble**<br>*Bring your own weather.* | A shield swallows one hit WHOLE — damage and knockback — then returns in 3.5s. | absorbs 1 whole hit · recharges after 3.5s | — | defense |
| **Lemonade Stand**<br>*Fresh squeezed. Slightly radioactive.* | Blocking plants a fizzy zone healing anyone inside 10 HP a second for 10s. | block = heal zone · 10 HP/s for 10s | **LT** block | block · sustain |
| **Sawblade**<br>*Mind the blade.* | Blocking wraps you in a spinning sawblade for 3 seconds. It carves anyone it touches and throws them clear; the block cooldown starts when it stops. | block = spinning saw (3s) · cuts and flings enemies · cooldown starts after it | **LT** block | block · aoe |
| **Bank Shot**<br>*Called it. Off two cushions.* | One extra bounce, and each bounce sends the round seeking, +30% harder. | +1 bounce · bounces seek, +30% dmg | **RT** shoot | projectile |
| **Stink Bomb**<br>*You'll clear the room.* | A broken bullet bursts into a lingering cloud that poisons and slows. | toxic cloud on hit (2.5s) · −10% damage | **RT** shoot | aoe · dot |
| **Payment Plan**<br>*Suffer now, later.* | Damage you take is paid off over 3 seconds instead of all at once. | damage taken drips over 3s · +10% health | — | defense |
| **Blood Money**<br>*Everything costs something.* | Fire wildly fast, but every shot costs 5 health. It can't finish you off. | −70% fire delay · shots cost 5 HP (never lethal) | **RT** shoot | damage · firerate |
| **Camera Flash**<br>*Say cheese.* | Hits briefly stun your victim, who then shrugs off further flashes for 2s. | stuns 0.4s (2s immunity) · −10% damage | **RT** shoot | control |
| **Second Defence**<br>*Advantage: you.* | Dealing bullet damage instantly returns your block. Deep breaths between rallies. | hits refresh your block (1s lockout) | **LT** block | block |
| **Boomerang**<br>*It misses you too.* | Missed bullets fly back to your hand and refund themselves. They still hit. | missed shots return & refund ammo | **RT** shoot | projectile · ammo |
| **Body Double**<br>*You, but expendable.* | Blocking leaves a decoy of you. Seeking shots and lightning chase it till it pops. | block leaves a 20 HP decoy | **LT** block | block · defense |
| **Magnet Suit**<br>*Opposites repulse.* | Enemy bullets curve gently away from you. Flat, fast shots still find you. | enemy bullets veer away from you | — | defense |
| **Bulwark**<br>*Hold the line.* | A vast pool of health, at the cost of a slightly slower trigger finger. | +40% health · +0.06s fire delay | — | defense |
| **Second Skin**<br>*It moves when you do.* | More health, and incoming shots shove you around far less. | +30% health · +20% knockback resist | — | defense |

## Epic (17)

| Card | What it does | Effects | Asks you to | Tags |
|---|---|---|---|---|
| **Breakthrough**<br>*Make your own door.* | Shots bite squares out of terrain; two into a thick wall opens a permanent gap — and anyone can walk through it. | shots bite doors in terrain · thick walls take 2 · −10% damage | **RT** shoot | projectile · control |
| **Berserker's Blood**<br>*Pain is a power source.* | The lower your health the harder you hit: up to +150% damage at death's door. | up to +150% dmg hurt · rounds grow and drip | **RT** shoot | damage · clutch |
| **Hummingbird**<br>*Blink and you'll miss all of it.* | Faster shots. Tap jump in mid-air to hover 3s; shooting dumps the magazine. | jump twice to hover 3s · hover shot = whole mag · fast · +2 ammo · −20% dmg | **RT** shoot, **A** double-tap to hover | firerate · mobility |
| **Party Favor**<br>*One explosion is never enough.* | Bullets explode on impact AND split into bomblets. Reloads take longer. | explodes + 2 shards · +0.2s reload | **RT** shoot | aoe |
| **Black Mamba**<br>*It never misses twice.* | Venom-heavy shots that drift after their target and inject a double dose. Softer on impact. | strong poison (2×) · slight homing · −12% damage | **RT** shoot | dot · accuracy |
| **Juggernaut**<br>*Built like a planet.* | More than double health and a bigger body, in exchange for slower movement. | +110% health · +14% size · −14% speed | — | defense |
| **French Exit**<br>*Be somewhere else.* | Blocking teleports you a short way along your aim — through bullets and walls. | block = teleport · −10% block cooldown | **LT** block | block · movement |
| **Railgun**<br>*Physics called. It's impressed.* | Hyper-velocity slugs pierce 2 players and hit harder, but fire slowly. | pierces 2 players · +55% speed · +18% dmg · slow fire · −1 ammo | **RT** shoot | projectile · damage |
| **Storm Caller**<br>*Weather forecast: you.* | Hits arc lightning to a second enemy AND chill everyone they touch. | chain lightning · chill on hit | **RT** shoot | aoe · control |
| **Guardian Halo**<br>*Someone up there owes you one.* | Once per round, a hit that would kill you leaves you at 25% health instead. | survive 1 lethal hit · left at 25% · +10% HP | — | clutch · defense |
| **Pocket Void**<br>*Litter, but cosmic.* | Every impact tears open a vortex that drags players into a mauling core. | impacts open a vortex · mauling core · −10% damage | **RT** shoot | control · aoe |
| **Bullet Ballet**<br>*Choreographed devastation.* | Fire 3 extra pellets in an elegant, tight formation. Each pellet is much weaker. | +3 pellets, tight · −53% dmg per pellet | **RT** shoot | multishot |
| **Return to Sender**<br>*Postage due.* | Blocking supercharges your next shot: +75%, and your block fires where it lands. | block = next shot +75% · block fires on impact | **LT** block | block · damage |
| **Puppet Strings**<br>*The bullet does what you're thinking.* | After firing, your newest bullet steers wherever you aim — walk it around cover. | steer your latest shot · −30% speed · −10% dmg | **RS** steer the shot | projectile · accuracy |
| **Bricklayer**<br>*Permits pending.* | Blocking stands a stone slab in front of you — real cover, heavy enough to topple. | block raises a slab of cover · +0.3s block cooldown | **LT** block | block · control |
| **Encore**<br>*The crowd demands it.* | A second later a ghostly twin volley fires from where you stood, half damage. | ghost twin volley (1s) · fires from where you stood · +0.1s fire delay | **RT** shoot | firerate |
| **Dragon's Hoard**<br>*Never enough. Always more.* | A vast magazine, fast reloads, and a damage bonus. Pure greed, no downside. | +4 ammo · −25% reload · +10% damage | — | ammo |

## Legendary (4)

| Card | What it does | Effects | Asks you to | Tags |
|---|---|---|---|---|
| **Supernova**<br>*Astronomers hate this one trick.* | Fat white-hot slugs that detonate in a colossal blast and hit far harder. | colossal explosion · +70% dmg · slow reload | **RT** shoot | aoe · damage |
| **Golden Gun**<br>*The first word is the last word.* | The first shot of every magazine deals TRIPLE damage and gleams gold. | 1st shot each mag ×3 · +0.15s reload | **RT** shoot | damage |
| **Grim Harvest**<br>*Waste nothing.* | Heal 45% of the bullet damage you deal; a knockout restores you to full. | 45% lifesteal · kills fully heal you | **RT** shoot | sustain |
| **Crown of Storms**<br>*Heavy is the head that conducts.* | Blocking fires a lightning nova that hurts and hurls away everyone nearby. | block = lightning nova · block shockwave | **LT** block | block · aoe |

## Mythic (3)

| Card | What it does | Effects | Asks you to | Tags |
|---|---|---|---|---|
| **Starfall Protocol**<br>*The sky picks a side.* | ACTIVE (Y): call 5 meteors down onto your aim point. 12s cooldown. | ACTIVE: meteor volley · 12s cooldown · +10% dmg | **Y** ability | active · aoe |
| **Event Horizon**<br>*Everything falls. Eventually.* | ACTIVE (Y): hurl a black hole that drags in everyone and everything for 7s. | ACTIVE: thrown black hole · drags players & objects · 14s cooldown · +10% HP | **Y** ability | active · control |
| **Chronoshift**<br>*You were never there.* | ACTIVE (hold Y): run the whole board backwards at half speed, up to 3s of tape. | ACTIVE: hold to rewind · 3s of tape, refills in 10s · 1s cooldown · +8% speed | **Y** ability | active · clutch |

## Special drafts

Never rolled into an ordinary hand, never listed in Choose Cards:

| Card | What it does | Effects | When |
|---|---|---|---|
| **Photo Finish** | Half a round win, banked on the spot instead of a power. | +0.5 Round Win | Swapped into the *runner-up's* hand in a 3+ player free-for-all |

## Where else to look

- **In game** — *Settings → Choose Cards* shows the whole set as a grid, and every card face
  states its own effects.
- **Card workbench** — [`workbench/cards.html`](workbench/cards.html) (`npm start`, then
  `/workbench/cards.html`) browses every card at full size and runs a live preview of what it does.
- **The source** — [`js/cards.js`](js/cards.js) is the card set; [`js/gameplay.js`](js/gameplay.js)
  holds the baselines the cards modify.
