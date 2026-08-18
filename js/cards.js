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
    // -------------------------------------------------------- COMMON (11)

    card("bubblegum-rounds", "Bubblegum Rounds", "common",
      "Chews through magazines.",
      "Carry 2 extra bullets per magazine, but each one hits a little softer.",
      ["+2 ammo", "−10% damage"], ["ammo"],
      p => { p.stats.maxAmmo += 2; p.stats.damage *= 0.9; }),

    card("cannonball", "Cannonball", "common",
      "Subtlety is for other people.",
      "Your shots hit much harder, but they fly slower and reloading takes longer.",
      ["+30% damage", "−10% bullet speed", "+0.22s reload"], ["damage"],
      p => { p.stats.damage *= 1.3; p.stats.bulletSpeed *= 0.9; p.stats.reload += 0.22; }),

    card("featherweight", "Featherweight", "common",
      "Float like a… you know.",
      "Move faster everywhere and steer far better in the air, at the cost of a thinner health bar.",
      ["+16% speed", "+20% air control", "−12% health"], ["movement"],
      p => { p.stats.speed *= 1.16; p.stats.airAccel *= 1.2; p.stats.maxHp *= 0.88; }),

    card("stone-soup", "Stone Soup", "common",
      "Mostly rocks. Somehow filling.",
      "A big helping of extra health with only a small hit to your ground speed.",
      ["+35% health", "−6% speed"], ["defense"],
      p => { p.stats.maxHp *= 1.35; p.stats.speed *= 0.94; }),

    card("hair-trigger", "Hair Trigger", "common",
      "Don't even breathe on it.",
      "Shots come out much sooner after each other, and you carry one extra round to enjoy it.",
      ["−22% fire delay", "+1 ammo"], ["firerate"],
      p => { p.stats.fireDelay *= 0.78; p.stats.maxAmmo += 1; }),

    card("speed-loader", "Speed Loader", "common",
      "Practice makes permanent.",
      "Reloading your magazine takes a third less time.",
      ["−32% reload time"], ["ammo"],
      p => { p.stats.reload *= 0.68; }),

    card("grasshopper", "Grasshopper", "common",
      "The floor is merely a suggestion.",
      "Launch off the floor like you were fired from it — a much faster, much higher jump.",
      ["+38% jump speed & height", "+8% air control"], ["movement"],
      p => { p.stats.jump *= 1.38; p.stats.airAccel *= 1.08; }),

    card("brick-wall", "Brick Wall", "common",
      "You shall not pass. Probably.",
      "Extra health, and you barely budge when shot — knockback against you drops by 40%.",
      ["+15% health", "−40% knockback taken"], ["defense"],
      p => { p.stats.maxHp *= 1.15; p.stats.kbResist += 0.4; }),

    card("buckshot-buttons", "Buckshot Buttons", "common",
      "Why fire one when you can fire three?",
      "Each trigger pull fires 2 extra pellets in a cone. Each pellet is weaker.",
      ["+2 pellets", "−40% damage per pellet", "wide spread"], ["multishot"],
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

    // ------------------------------------------------------ UNCOMMON (18)

    card("longshot", "Longshot", "uncommon",
      "Practically a laser.",
      "Bullets fly twice as fast and drop less over distance — great for cross-map duels.",
      ["+100% bullet speed", "−15% bullet drop"], ["accuracy"],
      p => { p.stats.bulletSpeed *= 2; p.stats.bulletGravity *= 0.85; }),

    card("tailwind", "Tailwind", "uncommon",
      "The sky likes you today.",
      "Steer far better while airborne, and hold the jump button to hang in the air for up to 2 seconds.",
      ["+50% air control", "hold jump to float (2s)"], ["movement"],
      p => { p.stats.airAccel *= 1.5; p.stats.floatTime += 2; }),

    card("sugar-rush", "Sugar Rush", "uncommon",
      "Hits taste like candy.",
      "Landing a hit makes you giddy: double move speed for 2.5 seconds.",
      ["+100% speed for 2.5s after a hit"], ["movement"],
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
      ["+1 pellet", "−25% damage per pellet", "slight spread"], ["multishot"],
      p => { p.stats.pellets += 1; p.stats.damage *= 0.75; p.stats.spread += 0.05; }),

    card("lowrider", "Lowrider", "uncommon",
      "Keeps a low profile.",
      "Your bullets drop to the nearest floor and skim along it, hugging the terrain over ledges and up to your target's ankles.",
      ["bullets follow the ground", "−8% damage"], ["projectile"],
      p => { p.stats.groundHug += 1; p.stats.damage *= 0.92; }),

    card("waste-not", "Waste Not", "uncommon",
      "Every bullet comes home.",
      "Bullets that hit a player are refunded to your magazine. Shots come a touch slower.",
      ["hits refund ammo", "+0.15s fire delay"], ["ammo"],
      p => { if (p.stats.scavenge) p.stats.reload *= 0.8; p.stats.scavenge += 1; p.stats.fireDelay += 0.15; }),

    card("pit-stop", "Pit Stop", "uncommon",
      "Four seconds flat.",
      "Throwing a block instantly refills your magazine — it does not have to catch anything.",
      ["block = full reload", "+0.25s block cooldown"], ["block", "ammo"],
      p => { p.stats.blockReload += 1; p.stats.blockCooldown += 0.25; }),

    card("triple-tap", "Triple Tap", "uncommon",
      "Once more, with feeling. Twice.",
      "Every trigger pull is followed by two lighter echo shots in a tight burst.",
      ["+2 burst echoes (45% damage)", "+0.1s fire delay"], ["firerate"],
      p => { p.stats.burstFire += 2; p.stats.fireDelay += 0.1; }),

    card("hot-streak", "Hot Streak", "uncommon",
      "Ride the wave.",
      "Dealing bullet damage wraps you in a 25-point shield that burns off over about four seconds.",
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
      "Your mid-air jumps detonate a small blast beneath you that damages and shoves enemies.",
      ["air jumps explode (15 dmg)"], ["movement", "aoe"],
      p => { p.stats.jumpBlast += 1; }),

    card("fresh-coat", "Fresh Coat", "uncommon",
      "Still has the sticker on.",
      "Start each round with a +50% health overcoat. It shatters the first time you're hit.",
      ["+50% HP shell until first hit"], ["defense"],
      p => { p.stats.freshCoat += 0.5; }),

    // ---------------------------------------------------------- RARE (24)

    card("boxing-glove", "Boxing Glove", "rare",
      "Float like a truck.",
      "Your shots hit like a haymaker — they send people flying, and a block stops the damage but not the punch. They hit a little softer for it.",
      ["+300% knockback dealt", "shoves through blocks", "+10% bullet size", "−10% damage"], ["control"],
      p => { p.stats.kbDeal += 3; p.stats.bulletSize *= 1.1; p.stats.damage *= 0.9; }),

    card("wasp-venom", "Wasp Venom", "rare",
      "The sting is just the beginning.",
      "Hits inject venom that deals damage over 3 seconds. Sting them again and the doses ADD UP. The sting drifts after its target. Direct damage drops.",
      ["poison on hit (3s)", "doses stack", "slight homing", "−15% damage"], ["dot", "accuracy"],
      p => { p.stats.poison += 1; p.stats.homing += 0.35; p.stats.damage *= 0.85; }),

    card("popcorn-payload", "Popcorn Payload", "rare",
      "Pop pop pop.",
      "Bullets pop on impact, flinging 10 hot kernels up into the air. They rain back down for more damage, and anything that misses bounces twice more before it gives up.",
      ["impacts pop into 10 kernels", "kernels rain down & bounce twice", "−10% damage"], ["aoe"],
      p => { p.stats.popcorn += 10; p.stats.damage *= 0.9; }),

    card("bodyguard", "Bodyguard", "rare",
      "Personal space, enforced.",
      "Blocking releases a shockwave that shoves nearby opponents away and swats any bullet caught in it off in a random direction. Extra health too.",
      ["block shockwave", "scatters bullets in range", "+15% health"], ["block"],
      p => { p.stats.blockPush += 1; p.stats.maxHp *= 1.15; }),

    card("panic-button", "Panic Button", "rare",
      "Insurance you fire.",
      "Firing the last bullet in your magazine automatically triggers your block — and everything attached to it.",
      ["last bullet auto-blocks", "+0.3s reload"], ["block", "clutch"],
      p => { p.stats.autoBlock += 1; p.stats.reload += 0.3; }),

    card("drill-rounds", "Drill Rounds", "rare",
      "Through, not around.",
      "Your bullets bore straight through walls and floors and keep flying, so cover stops being cover. Stacks drill deeper.",
      ["bullets drill through walls", "−12% damage"], ["projectile"],
      p => { p.stats.wallPierce += 1; p.stats.damage *= 0.88; }),

    card("thorn-jacket", "Thorn Jacket", "rare",
      "Hug at your own risk.",
      "Attackers take 35% of the damage they deal to you, reflected back instantly. Thorns ignore blocks.",
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
      ["+75% damage", "−30% health", "rounds fly sheathed in glass"], ["damage"],
      p => { p.stats.damage *= 1.75; p.stats.maxHp *= 0.7; p.stats.glass += 1; }),

    card("comet-trail", "Comet Trail", "rare",
      "Give it room to breathe.",
      "Bullets grow stronger the farther they travel — up to double damage at long range.",
      ["damage grows with distance (up to 2×)", "+12% bullet speed"], ["accuracy"],
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
      "A regenerating energy shield swallows one hit WHOLE — all of its damage and all of its knockback. It comes back 3.5 seconds after it pops.",
      ["absorbs 1 whole hit", "recharges after 3.5s"], ["defense"],
      p => { p.stats.shield += 1; }),

    card("lemonade-stand", "Lemonade Stand", "rare",
      "Fresh squeezed. Slightly radioactive.",
      "Blocking plants a fizzy zone that heals anyone inside 10 HP a second for 10 seconds — stand in your own.",
      ["block plants a heal zone (10 HP/s, 10s)"], ["block", "sustain"],
      p => { p.stats.healField += 1; }),

    card("sawblade", "Sawblade", "rare",
      "Mind the blade.",
      "Blocking wraps you in a huge spinning sawblade for 3 seconds, shredding anyone who comes near.",
      ["block = spinning saw (3s)"], ["block", "aoe"],
      p => { p.stats.sawBlock += 1; }),

    card("bank-shot", "Bank Shot", "rare",
      "Called it. Off two cushions.",
      "One extra bounce, and after each bounce your bullet veers toward the nearest opponent and hits 30% harder.",
      ["+1 bounce", "bounces seek & gain +30% damage"], ["projectile"],
      p => { p.stats.bankShot += 1; p.stats.bounces += 1; }),

    card("stink-bomb", "Stink Bomb", "rare",
      "You'll clear the room.",
      "When a bullet breaks it bursts into a lingering cloud that poisons and slows anyone inside.",
      ["impacts leave a toxic cloud (2.5s)", "−10% damage"], ["aoe", "dot"],
      p => { p.stats.stink += 1; p.stats.damage *= 0.9; }),

    card("payment-plan", "Payment Plan", "rare",
      "Suffer now, later.",
      "Damage you take is paid off over 3 seconds instead of all at once — time enough to turn the fight.",
      ["damage taken drips over 3s", "+10% health"], ["defense"],
      p => { p.stats.decay += 1; p.stats.maxHp *= 1.1; }),

    card("blood-money", "Blood Money", "rare",
      "Everything costs something.",
      "Fire wildly fast, but every shot costs 5 health. It can't finish you off.",
      ["−70% fire delay", "shots cost 5 HP (never lethal)"], ["damage", "firerate"],
      p => { p.stats.bloodMoney += 1; p.stats.fireDelay *= 0.3; }),

    card("camera-flash", "Camera Flash", "rare",
      "Say cheese.",
      "Hits briefly stun your victim. Each target shrugs off further flashes for 2 seconds.",
      ["hits stun 0.4s (then 2s immunity)", "−10% damage"], ["control"],
      p => { p.stats.dazzle += 1; p.stats.damage *= 0.9; }),

    card("second-defence", "Second Defence", "rare",
      "Advantage: you.",
      "Dealing bullet damage instantly returns your block. Deep breaths between rallies.",
      ["hits refresh your block (1s lockout)"], ["block"],
      p => { p.stats.blockRefresh += 1; }),

    card("boomerang", "Boomerang", "rare",
      "It misses you too.",
      "Bullets that miss fly back to your hand — catching one refunds it. They can still hit on the way back.",
      ["missed shots return & refund ammo"], ["projectile", "ammo"],
      p => { p.stats.boomerang += 1; }),

    card("body-double", "Body Double", "rare",
      "You, but expendable.",
      "Blocking leaves a decoy of you behind. Seeking shots and lightning chase it until it pops.",
      ["block leaves a 20 HP decoy"], ["block", "defense"],
      p => { p.stats.decoy += 1; }),

    card("magnet-suit", "Magnet Suit", "rare",
      "Opposites repulse.",
      "Enemy bullets curve gently away from you. Flat, fast shots still find you.",
      ["enemy bullets veer away from you"], ["defense"],
      p => { p.stats.repel += 1; }),

    // ---------------------------------------------------------- EPIC (17)

    card("breakthrough", "Breakthrough", "epic",
      "Make your own door.",
      "Shots chew a square bite out of whatever terrain they strike — two into a thick wall opens a permanent gap anyone can shoot or climb through. People still just get hit.",
      ["impacts bite squares out of terrain", "thick walls take 2 hits", "−10% damage"], ["projectile", "control"],
      p => { p.stats.holePunch += 1; p.stats.damage *= 0.9; }),

    card("berserkers-blood", "Berserker's Blood", "epic",
      "Pain is a power source.",
      "The lower your health, the harder you hit — up to +150% damage at death's door, and the rounds swell and drip as you bleed.",
      ["up to +150% damage at low HP", "wounded rounds grow and drip"], ["damage", "clutch"],
      p => { p.stats.rage += 1.5; }),

    card("hummingbird", "Hummingbird", "epic",
      "Blink and you'll miss all of it.",
      "Faster, lighter shots — and tap jump again in mid-air to HOVER on humming wings for 3 seconds. Shoot while hovering and the whole magazine goes at once.",
      ["jump twice to hover 3s", "hovering: empty the magazine in one burst",
       "−40% fire delay", "+2 ammo", "−20% damage"], ["firerate", "mobility"],
      p => {
        p.stats.fireDelay *= 0.6; p.stats.maxAmmo += 2; p.stats.damage *= 0.8;
        p.stats.hover += 3;              // seconds of hover per jump; stacks
      }),

    card("cluster-bomb", "Party Favor", "epic",
      "One explosion is never enough.",
      "Bullets explode on impact AND split into bomblets. Reloads take longer.",
      ["explosion on hit", "splits into 2 shards", "+0.2s reload"], ["aoe"],
      p => { p.stats.explosive += 1; p.stats.shards += 2; p.stats.reload += 0.2; }),

    card("black-mamba", "Black Mamba", "epic",
      "It never misses twice.",
      "Strong homing shots that inject double venom. Slightly weaker on impact.",
      ["strong poison (2×)", "homing", "−12% damage"], ["dot", "accuracy"],
      p => { p.stats.poison += 2; p.stats.homing += 0.7; p.stats.damage *= 0.88; }),

    card("juggernaut", "Juggernaut", "epic",
      "Built like a planet.",
      "More than double health and a bigger body, in exchange for slower movement.",
      ["+110% health", "+14% size", "−14% speed"], ["defense"],
      p => { p.stats.maxHp *= 2.1; p.stats.radius *= 1.14; p.stats.speed *= 0.86; p.stats.ironHull += 1; }),

    card("warp-block", "French Exit", "epic",
      "Be somewhere else.",
      "Blocking teleports you a short distance in your aim direction — through bullets, through walls.",
      ["block = teleport", "−10% block cooldown"], ["block", "movement"],
      p => { p.stats.warpBlock += 1; p.stats.blockCooldown *= 0.9; }),

    card("railgun", "Railgun", "epic",
      "Physics called. It's impressed.",
      "Hyper-velocity slugs that pierce 2 players and hit harder — but fire slowly and your magazine shrinks.",
      ["pierce 2 players", "+55% bullet speed", "+25% damage", "+0.3s fire delay", "−1 ammo"], ["projectile", "damage"],
      p => { p.stats.pierce += 2; p.stats.bulletSpeed *= 1.55; p.stats.damage *= 1.25; p.stats.fireDelay += 0.3; p.stats.maxAmmo = Math.max(1, p.stats.maxAmmo - 1); }),

    card("storm-caller", "Storm Caller", "epic",
      "Weather forecast: you.",
      "Hits arc lightning to a second enemy AND chill everyone they touch.",
      ["chain lightning", "chill on hit"], ["aoe", "control"],
      p => { p.stats.chain += 1; p.stats.chill += 1; }),

    card("guardian-halo", "Guardian Halo", "epic",
      "Someone up there owes you one.",
      "Once per round, a hit that would kill you leaves you at 25% health instead.",
      ["survive 1 lethal hit per round (25% HP)", "+10% health"], ["clutch", "defense"],
      p => { p.stats.guardian += 1; p.stats.maxHp *= 1.1; }),

    card("pocket-void", "Pocket Void", "epic",
      "Litter, but cosmic.",
      "Every bullet impact tears open a vortex that drags players in, and its heart mauls them like an arena hazard.",
      ["impacts open a black hole", "core deals hazard damage", "−10% damage"], ["control", "aoe"],
      p => { p.stats.voidPull += 1; p.stats.damage *= 0.9; }),

    card("bullet-ballet", "Bullet Ballet", "epic",
      "Choreographed devastation.",
      "Fire 3 extra pellets in an elegant, tight formation. Each pellet is much weaker.",
      ["+3 pellets", "tight spread", "−45% damage per pellet"], ["multishot"],
      p => { p.stats.pellets += 3; p.stats.spread += 0.06; p.stats.damage *= 0.55; }),

    card("return-to-sender", "Return to Sender", "epic",
      "Postage due.",
      "Blocking supercharges your next shot: +75% damage, and your block effects detonate where it lands.",
      ["block empowers next shot (+75%)", "block effects fire at impact"], ["block", "damage"],
      p => { p.stats.empowerBlock += 1; }),

    card("puppet-strings", "Puppet Strings", "epic",
      "The bullet does what you're thinking.",
      "After firing, your newest bullet steers toward wherever you aim — walk it around cover.",
      ["steer your latest bullet", "−30% bullet speed", "−10% damage"], ["projectile", "accuracy"],
      p => { p.stats.steer += 1; p.stats.bulletSpeed *= 0.7; p.stats.damage *= 0.9; }),

    card("bricklayer", "Bricklayer", "epic",
      "Permits pending.",
      "Blocking stands a stone slab on end in front of you — real cover that stops bullets, and heavy enough to topple onto someone.",
      ["block raises a slab of cover", "+0.3s block cooldown"], ["block", "control"],
      p => { p.stats.brickBlock += 1; p.stats.blockCooldown += 0.3; }),

    card("encore", "Encore", "epic",
      "The crowd demands it.",
      "A second after every shot, a ghostly twin volley fires from the spot you shot from — two rounds, half damage each.",
      ["twin ghost shot 1s later (50% dmg each)", "fires from where you stood", "+0.1s fire delay"], ["firerate"],
      p => { p.stats.encore += 1; p.stats.fireDelay += 0.1; }),

    card("dragons-hoard", "Dragon's Hoard", "epic",
      "Never enough. Always more.",
      "A vast magazine, fast reloads, and a damage bonus. Pure greed, no downside.",
      ["+4 ammo", "−25% reload", "+10% damage"], ["ammo"],
      p => { p.stats.maxAmmo += 4; p.stats.reload *= 0.75; p.stats.damage *= 1.1; p.stats.hoard += 1; }),

    // ------------------------------------------------------ LEGENDARY (4)

    card("supernova", "Supernova", "legendary",
      "Astronomers hate this one trick.",
      "Fire fat white-hot slugs that detonate in a colossal blast and hit twice as hard. Reloads are slow.",
      ["colossal explosion on hit", "+100% damage", "+50% bullet size", "+0.3s reload"], ["aoe", "damage"],
      // the biggest bang in the set: it must out-hit epic Party Favor, whose
      // point-blank shards otherwise stack past it
      p => { p.stats.explosive += 2.8; p.stats.damage *= 2; p.stats.bulletSize *= 1.5; p.stats.reload += 0.3; }),

    card("golden-gun", "Golden Gun", "legendary",
      "The first word is the last word.",
      "The first shot of every magazine deals TRIPLE damage and gleams gold.",
      ["1st shot per magazine ×3 damage", "+0.15s reload"], ["damage"],
      p => { p.stats.goldenShot += 1; p.stats.reload += 0.15; }),

    card("grim-harvest", "Grim Harvest", "legendary",
      "Waste nothing.",
      "Heal for 45% of the bullet damage you deal, and knockouts restore you to full health.",
      ["45% lifesteal", "kills fully heal you"], ["sustain"],
      p => { p.stats.lifesteal += 0.45; p.stats.killHeal = true; }),

    card("crown-of-storms", "Crown of Storms", "legendary",
      "Heavy is the head that conducts.",
      "Blocking unleashes a lightning nova that damages and hurls away everyone nearby.",
      ["block = lightning nova", "block shockwave"], ["block", "aoe"],
      p => { p.stats.stormBlock += 1; p.stats.blockPush += 1; }),

    // --------------------------------------------------------- MYTHIC (3)

    card("starfall-protocol", "Starfall Protocol", "mythic",
      "The sky picks a side.",
      "ACTIVE (Y / LB): call a volley of 5 meteors crashing down toward your aim point. 12s cooldown. Passive: +10% damage.",
      ["ACTIVE: meteor volley", "12s cooldown", "+10% damage"], ["active", "aoe"],
      // STACKING: a second Mythic cannot grant a second ability, so it sharpens
      // this one — the cooldown drops and the passive stacks as usual.
      p => { p.stats.active = "starfall"; p.stats.activeStacks = (p.stats.activeStacks || 0) + 1;
             p.stats.activeCooldown = 12 / p.stats.activeStacks; p.stats.damage *= 1.1; }),

    card("event-horizon", "Event Horizon", "mythic",
      "Everything falls. Eventually.",
      "ACTIVE (Y): hurl a singularity that plants itself wherever it lands. For 7 seconds it drags in players, crates and loose slabs — you included, if you stand too close — and mauls anything that reaches its heart. 14s cooldown. Passive: +10% health.",
      ["ACTIVE: thrown black hole (7s)", "drags players AND objects", "hazard damage at its core", "14s cooldown", "+10% health"], ["active", "control"],
      p => { p.stats.active = "eventHorizon"; p.stats.activeStacks = (p.stats.activeStacks || 0) + 1;
             p.stats.activeCooldown = 14 / p.stats.activeStacks; p.stats.maxHp *= 1.1; }),

    card("chronoshift", "Chronoshift", "mythic",
      "You were never there.",
      "ACTIVE (hold Y): run the whole board backwards at half speed — every fighter, every bullet — for up to 3 seconds of the fight. Let go and time restarts from there. 10s cooldown, counted from release. Passive: +8% speed.",
      ["ACTIVE: hold to rewind the world", "up to 3s of the fight, at half speed", "10s cooldown from release", "+8% speed"], ["active", "clutch"],
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
    floatTime: 0, extraJumps: 0, jump: 880, jumpBlast: 0, stomp: 0, hover: 0,
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
  const JUMP_KEYS = ["floatTime", "extraJumps", "jumpBlast", "stomp", "hover", "jump"];
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
      out.push({ action: "jump", why: up("floatTime") ? "hold to float" : up("hover") ? "double-tap to hover" : "jump" });
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

  window.ROUNDERS.RARITIES = RARITIES;
  window.ROUNDERS.RARITY_ORDER = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];
  window.ROUNDERS.CARDS = CARDS;
  window.ROUNDERS.cardArt = cardArt;
  window.ROUNDERS.cardArtUrl = cardArtUrl;
  window.ROUNDERS.cardScene = cardScene;
  window.ROUNDERS.cardSceneUrl = cardSceneUrl;
})();
