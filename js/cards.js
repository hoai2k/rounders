// Rounders — card set (77 cards, designed from scratch).
// Cards mutate player.stats via apply(). The engine implements every mechanic
// referenced here (burn, chill, pierce, chain, shards, thorns, regen, rage,
// adrenaline, guardian, goldenShot, killHeal, stormBlock, warpBlock, shield,
// groundHug, voidPull, actives — and the gap-audit wave: scavenge, blockReload,
// healField, frostBlock, sawBlock, empowerBlock, autoBlock, steer, bankShot,
// stink, sugarRush, kbDeal, decay, freshCoat, hotStreak, bloodMoney, dazzle,
// silence, reloadPulse, burstFire, chillAura, blockRefresh, brickBlock,
// overflow, helium, boomerang, decoy, stomp, encore, underdog, jumpBlast,
// repel; see CARD-GAP-AUDIT.md).
//
// STACKING RULE: every numeric effect uses += or *= so drafting a card twice
// compounds it (two Cannonballs = harder still; two Magnet Fingers = a true
// heat-seeker). The only exceptions are the boolean legendaries (Golden Gun,
// kill-heal) and the Mythic actives, where a duplicate replaces/no-ops.
(() => {
  "use strict";
  window.ROUNDERS = window.ROUNDERS || {};

  const RARITIES = {
    common: { name: "Common", color: "#b8c4d0", glow: "rgba(184,196,208,0.45)", weight: 9 },
    uncommon: { name: "Uncommon", color: "#3ddc84", glow: "rgba(61,220,132,0.45)", weight: 6 },
    rare: { name: "Rare", color: "#4da6ff", glow: "rgba(77,166,255,0.5)", weight: 4 },
    epic: { name: "Epic", color: "#b45cff", glow: "rgba(180,92,255,0.5)", weight: 3 },
    legendary: { name: "Legendary", color: "#ffb02e", glow: "rgba(255,176,46,0.55)", weight: 2 },
    mythic: { name: "Mythic", color: "#ff4d8f", glow: "rgba(255,77,143,0.6)", weight: 1 }
  };

  function card(id, name, rarity, tagline, description, effects, tags, apply) {
    return { id, name, rarity, tagline, description, effects, tags, apply };
  }

  const CARDS = [
    // -------------------------------------------------------- COMMON (13)

    card("bubblegum-rounds", "Bubblegum Rounds", "common",
      "Chews through magazines.",
      "Carry 2 extra bullets per magazine, but each one hits a little softer.",
      ["+2 ammo", "−10% damage"], ["ammo"],
      p => { p.stats.maxAmmo += 2; p.stats.damage *= 0.9; }),

    card("cannonball", "Cannonball", "common",
      "Subtlety is for other people.",
      "Your shots hit much harder, but they fly slower and reloading takes longer.",
      ["+25% damage", "slower shot & reload"], ["damage"],
      p => { p.stats.damage *= 1.25; p.stats.bulletSpeed *= 0.9; p.stats.reload += 0.22; }),

    card("featherweight", "Featherweight", "common",
      "Float like a… you know.",
      "Faster everywhere and far better steering in the air, for a thinner health bar.",
      ["+16% speed", "+20% air control", "−12% health"], ["movement"],
      p => { p.stats.speed *= 1.16; p.stats.airAccel *= 1.2; p.stats.maxHp *= 0.88; }),

    card("stone-soup", "Stone Soup", "common",
      "Mostly rocks. Somehow filling.",
      "A big helping of extra health with only a small hit to your ground speed.",
      ["+35% health", "−6% speed"], ["defense"],
      p => { p.stats.maxHp *= 1.35; p.stats.speed *= 0.94; }),

    card("hair-trigger", "Hair Trigger", "common",
      "Don't even breathe on it.",
      "Shots come out much sooner after each other, and you carry one extra round.",
      ["−22% fire delay", "+1 ammo"], ["firerate"],
      p => { p.stats.fireDelay *= 0.78; p.stats.maxAmmo += 1; }),

    card("speed-loader", "Speed Loader", "common",
      "Practice makes permanent.",
      "Reloading your magazine takes a third less time.",
      ["−32% reload time"], ["ammo"],
      p => { p.stats.reload *= 0.68; }),

    card("grasshopper", "Grasshopper", "common",
      "The floor is merely a suggestion.",
      "Tap jump as normal. Hold it and you land coiled — let go to launch, up to a full board.",
      ["tap = a normal jump", "hold 0.5s+ = a charged one"], ["movement"],
      p => { p.stats.chargeJump += 1; p.stats.airAccel *= 1.08; }),

    card("brick-wall", "Brick Wall", "common",
      "You shall not pass. Probably.",
      "Extra health, and you barely budge: knockback against you drops by 40%.",
      ["+15% health", "−40% knockback taken"], ["defense"],
      p => { p.stats.maxHp *= 1.15; p.stats.kbResist += 0.4; }),

    card("buckshot-buttons", "Buckshot Buttons", "common",
      "Why fire one when you can fire three?",
      "Each trigger pull fires 2 extra pellets in a cone. Each pellet is weaker.",
      ["+2 pellets, wide", "−40% dmg per pellet"], ["multishot"],
      p => { p.stats.pellets += 2; p.stats.damage *= 0.6; p.stats.spread += 0.14; }),

    card("moon-shoes", "Moon Shoes", "common",
      "One small hop for a rounder…",
      "Gain one extra jump you can use in mid-air. No catch.",
      ["+1 air jump"], ["movement"],
      p => { p.stats.extraJumps += 1; }),

    card("sticky-soles", "Sticky Soles", "common",
      "Grip for days.",
      "Accelerate and stop much more sharply — you go exactly where you mean to.",
      ["+50% acceleration", "+35% braking"], ["movement"],
      p => { p.stats.accel *= 1.5; p.stats.brake *= 1.35; }),

    card("second-wind", "Second Wind", "common",
      "You are not done yet.",
      "A deeper reserve of health, and nothing given up for it.",
      ["+25% health"], ["defense"],
      p => { p.stats.maxHp *= 1.25; }),

    card("padded-vest", "Padded Vest", "common",
      "Bulk has its uses.",
      "Thick padding soaks up punishment; you move a shade slower wearing it.",
      ["+20% health", "−4% speed"], ["defense"],
      p => { p.stats.maxHp *= 1.2; p.stats.speed *= 0.96; }),

    // ------------------------------------------------------ UNCOMMON (20)

    card("longshot", "Longshot", "uncommon",
      "Practically a laser.",
      "Bullets fly twice as fast and drop less over distance — great for cross-map duels.",
      ["+100% bullet speed", "−15% bullet drop"], ["accuracy"],
      p => { p.stats.bulletSpeed *= 2; p.stats.bulletGravity *= 0.85; }),

    card("tailwind", "Tailwind", "uncommon",
      "The sky likes you today.",
      "Steer far better in the air, and hold jump to hang there for up to 2 seconds.",
      ["+50% air control", "hold jump to float (2s)"], ["movement"],
      p => { p.stats.airAccel *= 1.5; p.stats.floatTime += 2; }),

    card("sugar-rush", "Sugar Rush", "uncommon",
      "Hits taste like candy.",
      "Landing a hit makes you giddy: triple move speed for 2.5 seconds.",
      ["+200% speed for 2.5s after a hit"], ["movement"],
      p => { p.stats.sugarRush += 1; }),

    card("ricochet-romance", "Ricochet Romance", "uncommon",
      "Every wall is a matchmaker.",
      "Your bullets bounce off walls and floors up to 2 times before breaking.",
      ["+2 wall bounces"], ["projectile"],
      p => { p.stats.bounces += 2; }),

    card("cinder-shot", "Cinder Shot", "uncommon",
      "Leave a little warmth behind.",
      "Bullets set enemies on fire, burning them for extra damage over 2.5 seconds.",
      ["burn on hit (2.5s)", "+0.06s fire delay"], ["dot"],
      p => { p.stats.burn += 1; p.stats.fireDelay += 0.06; }),

    card("permafrost", "Permafrost", "uncommon",
      "Cold hands, cold heart.",
      "Hits chill enemies, slowing their movement and jumps for 2 seconds.",
      ["chill on hit (2s slow)", "−10% damage"], ["control"],
      p => { p.stats.chill += 1; p.stats.damage *= 0.9; }),

    card("magnet-fingers", "Magnet Fingers", "uncommon",
      "Bullets with abandonment issues.",
      "Your shots gently curve toward the nearest opponent.",
      ["light homing", "−8% bullet speed"], ["accuracy"],
      p => { p.stats.homing += 0.6; p.stats.bulletSpeed *= 0.92; }),

    card("leech-lunch", "Leech Lunch", "uncommon",
      "Eat what you hit.",
      "Heal for 25% of every point of bullet damage you deal.",
      ["25% lifesteal"], ["sustain"],
      p => { p.stats.lifesteal += 0.25; }),

    card("double-dutch", "Double Dutch", "uncommon",
      "Two ropes, two bullets.",
      "Fire a tight twin shot. Each bullet is weaker than a single would be.",
      ["+1 pellet, tight", "−25% dmg per pellet"], ["multishot"],
      p => { p.stats.pellets += 1; p.stats.damage *= 0.75; p.stats.spread += 0.05; }),

    card("lowrider", "Lowrider", "uncommon",
      "Keeps a low profile.",
      "Your bullets drop to the floor and skim along it, up to your target's ankles.",
      ["bullets follow the ground", "−8% damage"], ["projectile"],
      p => { p.stats.groundHug += 1; p.stats.damage *= 0.92; }),

    card("waste-not", "Waste Not", "uncommon",
      "Every bullet comes home.",
      "Bullets that hit a player are refunded. Shots come a touch slower.",
      ["hits refund ammo", "+0.15s fire delay"], ["ammo"],
      p => { if (p.stats.scavenge) p.stats.reload *= 0.8; p.stats.scavenge += 1; p.stats.fireDelay += 0.15; }),

    card("pit-stop", "Pit Stop", "uncommon",
      "Four seconds flat.",
      "Throwing a block instantly refills your magazine — it need not catch anything.",
      ["block = full reload", "+0.25s block cooldown"], ["block", "ammo"],
      p => { p.stats.blockReload += 1; p.stats.blockCooldown += 0.25; }),

    card("triple-tap", "Triple Tap", "uncommon",
      "Once more, with feeling. Twice.",
      "Every trigger pull is followed by two lighter echo shots in a tight burst.",
      ["+2 burst echoes (45% damage)", "+0.1s fire delay"], ["firerate"],
      p => { p.stats.burstFire += 2; p.stats.fireDelay += 0.1; }),

    card("hot-streak", "Hot Streak", "uncommon",
      "Ride the wave.",
      "Dealing bullet damage wraps you in a 25 shield that burns off over four seconds.",
      ["hits grant a decaying 25 shield"], ["defense"],
      p => { p.stats.hotStreak += 1; }),

    card("helium-rounds", "Helium Rounds", "uncommon",
      "Gravity is a social construct.",
      "Your bullets fall up — gently. Lob shots under ledges and up through gaps.",
      ["bullets arc upward"], ["projectile"],
      p => { p.stats.helium += 1; }),

    card("springload", "Springload", "uncommon",
      "The classic.",
      "Landing on an opponent's head deals 25 damage and bounces you high.",
      ["head stomp: 25 damage + bounce"], ["movement"],
      p => { p.stats.stomp += 1; }),

    card("firecracker-heels", "Firecracker Heels", "uncommon",
      "Ignition on the second hop.",
      "Gain a mid-air jump, and every mid-air jump detonates beneath you.",
      ["+1 air jump", "air jumps explode (15)"], ["movement", "aoe"],
      p => { p.stats.extraJumps += 1; p.stats.jumpBlast += 1; }),

    card("fresh-coat", "Fresh Coat", "uncommon",
      "Still has the sticker on.",
      "Start each round in a +50% health overcoat. It shatters the first time you're hit.",
      ["+50% HP shell until first hit"], ["defense"],
      p => { p.stats.freshCoat += 0.5; }),

    card("iron-rations", "Iron Rations", "uncommon",
      "Heavy, dull, and it keeps you alive.",
      "A much longer health bar, paid for with a slower reload.",
      ["+30% health", "+0.15s reload"], ["defense"],
      p => { p.stats.maxHp *= 1.3; p.stats.reload += 0.15; }),

    card("sandbags", "Sandbags", "uncommon",
      "Dig in.",
      "Weighed down and hard to shift: much more health, a little less spring.",
      ["+25% health", "−6% jump"], ["defense"],
      p => { p.stats.maxHp *= 1.25; p.stats.jump *= 0.94; }),

    // ---------------------------------------------------------- RARE (26)

    card("boxing-glove", "Boxing Glove", "rare",
      "Float like a truck.",
      "Huge knockback on every shot, and a block stops the damage but not the punch.",
      ["+300% knockback", "punches through blocks", "bigger rounds · −10% dmg"], ["control"],
      p => { p.stats.kbDeal += 3; p.stats.bulletSize *= 1.1; p.stats.damage *= 0.9; }),

    card("wasp-venom", "Wasp Venom", "rare",
      "The sting is just the beginning.",
      "Hits inject stacking venom over 3s, and the sting drifts after its target.",
      ["stacking poison (3s)", "slight homing", "−15% damage"], ["dot", "accuracy"],
      p => { p.stats.poison += 1; p.stats.homing += 0.35; p.stats.damage *= 0.85; }),

    card("popcorn-payload", "Popcorn Payload", "rare",
      "Pop pop pop.",
      "Bullets pop into 10 kernels that rain down, bounce twice and keep hurting.",
      ["pops into 10 kernels", "they rain and bounce", "−10% damage"], ["aoe"],
      p => { p.stats.popcorn += 10; p.stats.damage *= 0.9; }),

    card("bodyguard", "Bodyguard", "rare",
      "Personal space, enforced.",
      "Blocking shoves nearby opponents away and swats bullets caught in it aside.",
      ["block shockwave", "scatters bullets near", "+15% health"], ["block"],
      p => { p.stats.blockPush += 1; p.stats.maxHp *= 1.15; }),

    card("panic-button", "Panic Button", "rare",
      "Insurance you fire.",
      "Firing your last bullet triggers your block automatically — and all it carries.",
      ["last bullet auto-blocks", "+0.3s reload"], ["block", "clutch"],
      p => { p.stats.autoBlock += 1; p.stats.reload += 0.3; }),

    card("drill-rounds", "Drill Rounds", "rare",
      "Through, not around.",
      "Bullets bore clean through one piece of terrain — any thickness, any material — and fly on.",
      ["through 1 wall per shot", "−12% damage"], ["projectile"],
      p => { p.stats.wallPierce += 1; p.stats.damage *= 0.88; }),

    card("thorn-jacket", "Thorn Jacket", "rare",
      "Hug at your own risk.",
      "Attackers take 35% of the damage they deal you, straight back through blocks.",
      ["reflect 35% of damage taken", "+15% health"], ["defense"],
      p => { p.stats.thorns += 0.35; p.stats.maxHp *= 1.15; }),

    card("phoenix-feather", "Phoenix Feather", "rare",
      "Death is a scheduling conflict.",
      "The first time you die each round, burst back to life at half health.",
      ["revive once per round (50% HP)", "−15% health"], ["clutch"],
      p => { p.stats.revives += 1; p.stats.maxHp *= 0.85; }),

    card("glass-cannon", "Glass Cannon", "rare",
      "Handle with care. Or don't.",
      "Massive damage boost, but your health bar becomes alarmingly small.",
      ["+60% damage", "−25% health", "rounds fly in glass"], ["damage"],
      p => { p.stats.damage *= 1.6; p.stats.maxHp *= 0.75; p.stats.glass += 1; }),

    card("comet-trail", "Comet Trail", "rare",
      "Give it room to breathe.",
      "Bullets grow stronger the farther they fly — up to double damage at range.",
      ["grows to 2× with range", "+12% bullet speed"], ["accuracy"],
      p => { p.stats.grow += 1; p.stats.bulletSpeed *= 1.12; }),

    card("shrapnel-burst", "Shrapnel Burst", "rare",
      "The gift that keeps on fragmenting.",
      "When a bullet breaks, it splits into 3 shards that each deal 40% damage.",
      ["bullets split into 3 shards"], ["aoe"],
      p => { p.stats.shards += 3; }),

    card("field-medic", "Field Medic", "rare",
      "Walk it off. Literally.",
      "Constantly regenerate 5 health per second, plus a little more max health.",
      ["+5 HP/s regeneration", "+10% health"], ["sustain"],
      p => { p.stats.regen += 5; p.stats.maxHp *= 1.1; }),

    card("aegis-bubble", "Aegis Bubble", "rare",
      "Bring your own weather.",
      "A shield swallows one hit WHOLE — damage and knockback — then returns in 3.5s.",
      ["absorbs 1 whole hit", "recharges after 3.5s"], ["defense"],
      p => { p.stats.shield += 1; }),

    card("lemonade-stand", "Lemonade Stand", "rare",
      "Fresh squeezed. Slightly radioactive.",
      "Blocking plants a fizzy zone healing anyone inside 10 HP a second for 10s.",
      ["block = heal zone", "10 HP/s for 10s"], ["block", "sustain"],
      p => { p.stats.healField += 1; }),

    card("sawblade", "Sawblade", "rare",
      "Mind the blade.",
      "Blocking wraps you in a spinning sawblade for 3 seconds; the block cooldown starts when it stops.",
      ["block = spinning saw (3s)", "cooldown starts after it"], ["block", "aoe"],
      p => { p.stats.sawBlock += 1; }),

    card("bank-shot", "Bank Shot", "rare",
      "Called it. Off two cushions.",
      "One extra bounce, and each bounce sends the round seeking, +30% harder.",
      ["+1 bounce", "bounces seek, +30% dmg"], ["projectile"],
      p => { p.stats.bankShot += 1; p.stats.bounces += 1; }),

    card("stink-bomb", "Stink Bomb", "rare",
      "You'll clear the room.",
      "A broken bullet bursts into a lingering cloud that poisons and slows.",
      ["toxic cloud on hit (2.5s)", "−10% damage"], ["aoe", "dot"],
      p => { p.stats.stink += 1; p.stats.damage *= 0.9; }),

    card("payment-plan", "Payment Plan", "rare",
      "Suffer now, later.",
      "Damage you take is paid off over 3 seconds instead of all at once.",
      ["damage taken drips over 3s", "+10% health"], ["defense"],
      p => { p.stats.decay += 1; p.stats.maxHp *= 1.1; }),

    card("blood-money", "Blood Money", "rare",
      "Everything costs something.",
      "Fire wildly fast, but every shot costs 5 health. It can't finish you off.",
      ["−70% fire delay", "shots cost 5 HP (never lethal)"], ["damage", "firerate"],
      p => { p.stats.bloodMoney += 1; p.stats.fireDelay *= 0.3; }),

    card("camera-flash", "Camera Flash", "rare",
      "Say cheese.",
      "Hits briefly stun your victim, who then shrugs off further flashes for 2s.",
      ["stuns 0.4s (2s immunity)", "−10% damage"], ["control"],
      p => { p.stats.dazzle += 1; p.stats.damage *= 0.9; }),

    card("second-defence", "Second Defence", "rare",
      "Advantage: you.",
      "Dealing bullet damage instantly returns your block. Deep breaths between rallies.",
      ["hits refresh your block (1s lockout)"], ["block"],
      p => { p.stats.blockRefresh += 1; }),

    card("boomerang", "Boomerang", "rare",
      "It misses you too.",
      "Missed bullets fly back to your hand and refund themselves. They still hit.",
      ["missed shots return & refund ammo"], ["projectile", "ammo"],
      p => { p.stats.boomerang += 1; }),

    card("body-double", "Body Double", "rare",
      "You, but expendable.",
      "Blocking leaves a decoy of you. Seeking shots and lightning chase it till it pops.",
      ["block leaves a 20 HP decoy"], ["block", "defense"],
      p => { p.stats.decoy += 1; }),

    card("magnet-suit", "Magnet Suit", "rare",
      "Opposites repulse.",
      "Enemy bullets curve gently away from you. Flat, fast shots still find you.",
      ["enemy bullets veer away from you"], ["defense"],
      p => { p.stats.repel += 1; }),

    card("bulwark", "Bulwark", "rare",
      "Hold the line.",
      "A vast pool of health, at the cost of a slightly slower trigger finger.",
      ["+40% health", "+0.06s fire delay"], ["defense"],
      p => { p.stats.maxHp *= 1.4; p.stats.fireDelay += 0.06; }),

    card("second-skin", "Second Skin", "rare",
      "It moves when you do.",
      "More health, and incoming shots shove you around far less.",
      ["+30% health", "+20% knockback resist"], ["defense"],
      p => { p.stats.maxHp *= 1.3; p.stats.kbResist += 0.2; }),

    // ---------------------------------------------------------- EPIC (17)

    card("breakthrough", "Breakthrough", "epic",
      "Make your own door.",
      "Shots bite squares out of terrain; two into a thick wall opens a permanent gap — and anyone can walk through it.",
      ["shots bite doors in terrain", "thick walls take 2", "−10% damage"], ["projectile", "control"],
      p => { p.stats.holePunch += 1; p.stats.damage *= 0.9; }),

    card("berserkers-blood", "Berserker's Blood", "epic",
      "Pain is a power source.",
      "The lower your health the harder you hit: up to +150% damage at death's door.",
      ["up to +150% dmg hurt", "rounds grow and drip"], ["damage", "clutch"],
      p => { p.stats.rage += 1.5; }),

    card("hummingbird", "Hummingbird", "epic",
      "Blink and you'll miss all of it.",
      "Faster shots. Tap jump in mid-air to hover 3s; shooting dumps the magazine.",
      ["jump twice to hover 3s", "hover shot = whole mag", "fast · +2 ammo · −20% dmg"], ["firerate", "mobility"],
      p => {
        p.stats.fireDelay *= 0.6; p.stats.maxAmmo += 2; p.stats.damage *= 0.8;
        p.stats.hover += 3;              // seconds of hover per jump; stacks
      }),

    card("cluster-bomb", "Party Favor", "epic",
      "One explosion is never enough.",
      "Bullets explode on impact AND split into bomblets. Reloads take longer.",
      ["explodes + 2 shards", "+0.2s reload"], ["aoe"],
      p => { p.stats.explosive += 1; p.stats.shards += 2; p.stats.reload += 0.2; }),

    card("black-mamba", "Black Mamba", "epic",
      "It never misses twice.",
      "Venom-heavy shots that drift after their target and inject a double dose. Softer on impact.",
      ["strong poison (2×)", "slight homing", "−12% damage"], ["dot", "accuracy"],
      p => { p.stats.poison += 2; p.stats.homing += 0.35; p.stats.damage *= 0.88; }),

    card("juggernaut", "Juggernaut", "epic",
      "Built like a planet.",
      "More than double health and a bigger body, in exchange for slower movement.",
      ["+110% health", "+14% size", "−14% speed"], ["defense"],
      p => { p.stats.maxHp *= 2.1; p.stats.radius *= 1.14; p.stats.speed *= 0.86; p.stats.ironHull += 1; }),

    card("warp-block", "French Exit", "epic",
      "Be somewhere else.",
      "Blocking teleports you a short way along your aim — through bullets and walls.",
      ["block = teleport", "−10% block cooldown"], ["block", "movement"],
      p => { p.stats.warpBlock += 1; p.stats.blockCooldown *= 0.9; }),

    card("railgun", "Railgun", "epic",
      "Physics called. It's impressed.",
      "Hyper-velocity slugs pierce 2 players and hit harder, but fire slowly.",
      ["pierces 2 players", "+55% speed · +18% dmg", "slow fire · −1 ammo"], ["projectile", "damage"],
      p => { p.stats.pierce += 2; p.stats.bulletSpeed *= 1.55; p.stats.damage *= 1.18; p.stats.fireDelay += 0.3; p.stats.maxAmmo = Math.max(1, p.stats.maxAmmo - 1); }),

    card("storm-caller", "Storm Caller", "epic",
      "Weather forecast: you.",
      "Hits arc lightning to a second enemy AND chill everyone they touch.",
      ["chain lightning", "chill on hit"], ["aoe", "control"],
      p => { p.stats.chain += 1; p.stats.chill += 1; }),

    card("guardian-halo", "Guardian Halo", "epic",
      "Someone up there owes you one.",
      "Once per round, a hit that would kill you leaves you at 25% health instead.",
      ["survive 1 lethal hit", "left at 25% · +10% HP"], ["clutch", "defense"],
      p => { p.stats.guardian += 1; p.stats.maxHp *= 1.1; }),

    card("pocket-void", "Pocket Void", "epic",
      "Litter, but cosmic.",
      "Every impact tears open a vortex that drags players into a mauling core.",
      ["impacts open a vortex", "mauling core", "−10% damage"], ["control", "aoe"],
      p => { p.stats.voidPull += 1; p.stats.damage *= 0.9; }),

    card("bullet-ballet", "Bullet Ballet", "epic",
      "Choreographed devastation.",
      "Fire 3 extra pellets in an elegant, tight formation. Each pellet is much weaker.",
      ["+3 pellets, tight", "−53% dmg per pellet"], ["multishot"],
      p => { p.stats.pellets += 3; p.stats.spread += 0.06; p.stats.damage *= 0.47; }),

    card("return-to-sender", "Return to Sender", "epic",
      "Postage due.",
      "Blocking supercharges your next shot: +75%, and your block fires where it lands.",
      ["block = next shot +75%", "block fires on impact"], ["block", "damage"],
      p => { p.stats.empowerBlock += 1; }),

    card("puppet-strings", "Puppet Strings", "epic",
      "The bullet does what you're thinking.",
      "After firing, your newest bullet steers wherever you aim — walk it around cover.",
      ["steer your latest shot", "−30% speed · −10% dmg"], ["projectile", "accuracy"],
      p => { p.stats.steer += 1; p.stats.bulletSpeed *= 0.7; p.stats.damage *= 0.9; }),

    card("bricklayer", "Bricklayer", "epic",
      "Permits pending.",
      "Blocking stands a stone slab in front of you — real cover, heavy enough to topple.",
      ["block raises a slab of cover", "+0.3s block cooldown"], ["block", "control"],
      p => { p.stats.brickBlock += 1; p.stats.blockCooldown += 0.3; }),

    card("encore", "Encore", "epic",
      "The crowd demands it.",
      "A second later a ghostly twin volley fires from where you stood, half damage.",
      ["ghost twin volley (1s)", "fires from where you stood", "+0.1s fire delay"], ["firerate"],
      p => { p.stats.encore += 1; p.stats.fireDelay += 0.1; }),

    card("dragons-hoard", "Dragon's Hoard", "epic",
      "Never enough. Always more.",
      "A vast magazine, fast reloads, and a damage bonus. Pure greed, no downside.",
      ["+4 ammo", "−25% reload", "+10% damage"], ["ammo"],
      p => { p.stats.maxAmmo += 4; p.stats.reload *= 0.75; p.stats.damage *= 1.1; p.stats.hoard += 1; }),

    // ------------------------------------------------------ LEGENDARY (4)

    card("supernova", "Supernova", "legendary",
      "Astronomers hate this one trick.",
      "Fat white-hot slugs that detonate in a colossal blast and hit far harder.",
      ["colossal explosion", "+70% dmg · slow reload"], ["aoe", "damage"],
      // the biggest bang in the set: it must out-hit epic Party Favor, whose
      // point-blank shards otherwise stack past it
      p => { p.stats.explosive += 2.8; p.stats.damage *= 1.7; p.stats.bulletSize *= 1.5; p.stats.reload += 0.3; }),

    card("golden-gun", "Golden Gun", "legendary",
      "The first word is the last word.",
      "The first shot of every magazine deals TRIPLE damage and gleams gold.",
      ["1st shot each mag ×3", "+0.15s reload"], ["damage"],
      p => { p.stats.goldenShot += 1; p.stats.reload += 0.15; }),

    card("grim-harvest", "Grim Harvest", "legendary",
      "Waste nothing.",
      "Heal 45% of the bullet damage you deal; a knockout restores you to full.",
      ["45% lifesteal", "kills fully heal you"], ["sustain"],
      p => { p.stats.lifesteal += 0.45; p.stats.killHeal = true; }),

    card("crown-of-storms", "Crown of Storms", "legendary",
      "Heavy is the head that conducts.",
      "Blocking fires a lightning nova that hurts and hurls away everyone nearby.",
      ["block = lightning nova", "block shockwave"], ["block", "aoe"],
      p => { p.stats.stormBlock += 1; p.stats.blockPush += 1; }),

    // --------------------------------------------------------- MYTHIC (3)

    card("starfall-protocol", "Starfall Protocol", "mythic",
      "The sky picks a side.",
      "ACTIVE (Y): call 5 meteors down onto your aim point. 12s cooldown.",
      ["ACTIVE: meteor volley", "12s cooldown · +10% dmg"], ["active", "aoe"],
      // STACKING: a second Mythic cannot grant a second ability, so it sharpens
      // this one — the cooldown drops and the passive stacks as usual.
      p => { p.stats.active = "starfall"; p.stats.activeStacks = (p.stats.activeStacks || 0) + 1;
             p.stats.activeCooldown = 12 / p.stats.activeStacks; p.stats.damage *= 1.1; }),

    card("event-horizon", "Event Horizon", "mythic",
      "Everything falls. Eventually.",
      "ACTIVE (Y): hurl a black hole that drags in everyone and everything for 7s.",
      ["ACTIVE: thrown black hole", "drags players & objects", "14s cooldown · +10% HP"], ["active", "control"],
      p => { p.stats.active = "eventHorizon"; p.stats.activeStacks = (p.stats.activeStacks || 0) + 1;
             p.stats.activeCooldown = 14 / p.stats.activeStacks; p.stats.maxHp *= 1.1; }),

    card("chronoshift", "Chronoshift", "mythic",
      "You were never there.",
      "ACTIVE (hold Y): run the whole board backwards at half speed, up to 3s of tape.",
      ["ACTIVE: hold to rewind", "3s of tape, refills in 10s", "1s cooldown · +8% speed"], ["active", "clutch"],
      p => { p.stats.active = "chronoshift"; p.stats.activeCooldown = 10; p.stats.speed *= 1.08; })
  ];

  // Card art comes in two shapes, and the card uses whichever fits the space:
  //   emblem — assets/images/cards/<id>.png, 256×256 transparent cutout. Reads
  //            at any size, so it drives the tiny HUD chips and stands in for a
  //            missing scene.
  //   scene  — assets/images/cards/art/<id>.png, 512×384 full-bleed painting.
  //            The panel across the top of a full card face, so a draft hand is
  //            recognised at a glance instead of read.
  // Both load on demand and cache; a card with neither simply draws the tinted
  // panel, the way it always has.
  const ART = `${window.ROUNDERS_ASSET_BASE || ""}assets/images/cards/`;
  const art = new Map();
  const scenes = new Map();

  function cardArtUrl(id) { return `${ART}${id}.png`; }
  function cardSceneUrl(id) { return `${ART}art/${id}.png`; }

  function load(cache, id, url) {
    let entry = cache.get(id);
    if (!entry) {
      const img = new Image();
      entry = { img, ok: false };
      cache.set(id, entry);
      img.onload = () => { entry.ok = true; };
      img.onerror = () => { entry.ok = false; entry.failed = true; };
      img.src = url;
    }
    return entry.ok ? entry.img : null;
  }

  // Return the loaded image, or null until it is ready (or forever, if the file
  // is missing). Callers draw the card either way.
  function cardArt(id) { return load(art, id, cardArtUrl(id)); }
  function cardScene(id) { return load(scenes, id, cardSceneUrl(id)); }

  // ------------------------------------------------------------- controls
  // Most cards are passive — they just change your numbers. The ones that only
  // pay off when you PRESS something get a little Xbox badge on the face, so a
  // draft tells you at a glance that a card asks something of you.
  // Every stat a card can touch, at its untouched value. A card's badges are
  // worked out by applying it to this and seeing what moved.
  const BASE_PROBE = () => ({
    // block family
    blockPush: 0, echoBlock: 0, blockDash: 0, warpBlock: 0, stormBlock: 0,
    blockReload: 0, healField: 0, frostBlock: 0, sawBlock: 0, empowerBlock: 0,
    brickBlock: 0, decoy: 0, blockRefresh: 0, blockCooldown: 1.55, blockDuration: 0.25,
    autoBlock: 0,
    // movement family
    floatTime: 0, extraJumps: 0, jump: 880, jumpBlast: 0, stomp: 0, hover: 0, chargeJump: 0,
    // the shot: anything that changes what pulling the trigger does, or what
    // landing a hit pays out
    damage: 36, fireDelay: 0.22, reload: 2, maxAmmo: 3,
    bulletSpeed: 1180, bulletGravity: 1050, bulletDrag: 0.997,
    bulletRestitution: 0.72, bulletSize: 1, pellets: 1, spread: 0.04,
    bounces: 0, explosive: 0, homing: 0, pierce: 0, poison: 0, burn: 0, chill: 0,
    chain: 0, shards: 0, popcorn: 0, grow: 0, groundHug: 0, voidPull: 0,
    wallPierce: 0, holePunch: 0, bankShot: 0, stink: 0, dazzle: 0, silence: 0,
    boomerang: 0, helium: 0, encore: 0, burstFire: 0, goldenShot: 0,
    lifesteal: 0, killHeal: false, rage: 0, scavenge: 0, bloodMoney: 0,
    kbDeal: 0, sugarRush: 0, hotStreak: 0, hoard: 0, glass: 0,
    // aim
    steer: 0,
    // Mythics
    active: null
  });

  // `autoBlock` is deliberately absent: Panic Button throws the block for you
  // when the magazine runs dry, so it never asks the player to press LT.
  const BLOCK_KEYS = ["blockPush", "echoBlock", "blockDash", "warpBlock", "stormBlock",
    "blockReload", "healField", "frostBlock", "sawBlock", "empowerBlock",
    "brickBlock", "decoy", "blockRefresh", "blockCooldown", "blockDuration"];
  const JUMP_KEYS = ["floatTime", "extraJumps", "jumpBlast", "stomp", "hover", "jump", "chargeJump"];
  // RT means "pulling the trigger DOES something different", not "your gun has
  // better numbers". Dragon's Hoard is more ammo, a faster reload and more
  // damage — you shoot exactly as you always did, so it wears no badge, and
  // the same goes for Cannonball, Hair Trigger and Speed Loader. Deliberately
  // absent from this list: damage, fireDelay, reload, maxAmmo, bulletSpeed,
  // bulletGravity, bulletDrag, bulletRestitution, bulletSize, spread.
  const SHOOT_KEYS = ["pellets", "bounces", "explosive", "homing", "pierce",
    "poison", "burn", "chill", "chain", "shards", "popcorn", "grow", "groundHug",
    "voidPull", "wallPierce", "holePunch", "bankShot", "stink", "dazzle",
    "silence", "boomerang", "helium", "encore", "burstFire", "goldenShot",
    "lifesteal", "killHeal", "rage", "scavenge", "bloodMoney", "kbDeal",
    // `hover` is in both lists on purpose: you press A to hold station and RT
    // to dump the whole magazine from up there, so Hummingbird names two
    "sugarRush", "hotStreak", "hover"];

  // Which ACTIONS a card pays off from. Purely passive cards — more health,
  // more speed, thicker skin — name no action and wear no badge; everything
  // else tells you what to press. The button itself is looked up from
  // GAMEPLAY.controls at render time, so a re-binding moves the badges too.
  function actionsFor(apply) {
    const base = BASE_PROBE();
    const st = BASE_PROBE();
    try { apply({ stats: st }); } catch { return []; }
    const moved = k => st[k] !== base[k];
    const up = k => (st[k] || 0) > (base[k] || 0);
    const out = [];
    if (st.active) out.push({ action: "ability", why: "ability" });
    if (BLOCK_KEYS.some(moved)) out.push({ action: "block", why: "block" });
    if (SHOOT_KEYS.some(moved)) out.push({ action: "shoot", why: "shoot" });
    if (JUMP_KEYS.some(moved)) {
      out.push({
        action: "jump",
        why: up("chargeJump") ? "hold to charge the jump"
          : up("floatTime") ? "hold to float"
          : up("hover") ? "double-tap to hover" : "jump"
      });
    }
    if (moved("steer")) out.push({ action: "aim", why: "steer the shot" });
    return out;
  }

  // Actions are fixed at load; the BUTTON is resolved on read, so the badges
  // follow GAMEPLAY.controls even though that file loads after this one.
  for (const c of CARDS) {
    c.actions = actionsFor(c.apply);
    Object.defineProperty(c, "buttons", {
      get() {
        const badge = (window.ROUNDERS && window.ROUNDERS.padBadge) || (a => a);
        return c.actions.map(a => ({ b: badge(a.action), why: a.why, action: a.action }));
      }
    });
  }

  // -------------------------------------------------------- special drafts
  // Deliberately NOT in CARDS: it is never rolled into a hand, never listed in
  // the Choose Cards window, and never counted by the card pool. In a 3+ player
  // free-for-all the round's runner-up finds it swapped into their hand in
  // place of one real card — a straight trade, a power for half a round win.
  // It carries no art of its own: the draft panel paints the drafter's own
  // character on the face and stamps a +1/2 badge on it (see image-requests.md
  // if a painted version ever lands).
  const HALF_WIN_CARD = {
    id: "half-round-win",
    name: "Photo Finish",
    rarity: "legendary",
    special: "halfWin",
    tagline: "Second place, paid out.",
    description: "Half a round win, banked on the spot instead of a power.",
    effects: ["+0.5 Round Win"],
    tags: ["score"],
    actions: [],
    buttons: [],
    // The only card that touches the scoreboard rather than the stat block.
    apply: p => { p.score += 0.5; }
  };

  window.ROUNDERS.RARITIES = RARITIES;
  window.ROUNDERS.RARITY_ORDER = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];
  window.ROUNDERS.CARDS = CARDS;
  window.ROUNDERS.HALF_WIN_CARD = HALF_WIN_CARD;
  window.ROUNDERS.cardArt = cardArt;
  window.ROUNDERS.cardArtUrl = cardArtUrl;
  window.ROUNDERS.cardScene = cardScene;
  window.ROUNDERS.cardSceneUrl = cardSceneUrl;
})();
