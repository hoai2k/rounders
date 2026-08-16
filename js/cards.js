// Rounders — card set (52 cards, designed from scratch).
// Cards mutate player.stats via apply(). The engine implements every mechanic
// referenced here (burn, chill, pierce, chain, shards, thorns, regen, rage,
// adrenaline, guardian, goldenShot, killHeal, stormBlock, warpBlock, actives).
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
    // ------------------------------------------------------------- COMMON (14)
    card("bubblegum-rounds", "Bubblegum Rounds", "common",
      "Chews through magazines.",
      "Carry 2 extra bullets per magazine, but each one hits a little softer.",
      ["+2 ammo", "−10% damage"], ["ammo"],
      p => { p.stats.maxAmmo += 2; p.stats.damage *= 0.9; }),

    card("cannonball", "Cannonball", "common",
      "Subtlety is for other people.",
      "Your shots hit much harder, but they fly slower and reloading takes longer.",
      ["+45% damage", "−10% bullet speed", "+0.22s reload"], ["damage"],
      p => { p.stats.damage *= 1.45; p.stats.bulletSpeed *= 0.9; p.stats.reload += 0.22; }),

    card("featherweight", "Featherweight", "common",
      "Float like a… you know.",
      "Move and steer in the air much faster, at the cost of a thinner health bar.",
      ["+16% speed", "+20% air control", "−12% health"], ["movement"],
      p => { p.stats.speed *= 1.16; p.stats.airAccel *= 1.2; p.stats.maxHp *= 0.88; }),

    card("stone-soup", "Stone Soup", "common",
      "Hearty. Extremely hearty.",
      "A big helping of extra health with only a small hit to your ground speed.",
      ["+35% health", "−6% speed"], ["defense"],
      p => { p.stats.maxHp *= 1.35; p.stats.speed *= 0.94; }),

    card("hair-trigger", "Hair Trigger", "common",
      "Don't even breathe on it.",
      "Shots come out much sooner after each other. Pure fire-rate, no strings.",
      ["−22% fire delay"], ["firerate"],
      p => { p.stats.fireDelay *= 0.78; }),

    card("speed-loader", "Speed Loader", "common",
      "Practice makes permanent.",
      "Reloading your magazine takes a third less time.",
      ["−32% reload time"], ["ammo"],
      p => { p.stats.reload *= 0.68; }),

    card("grasshopper", "Grasshopper", "common",
      "The floor is merely a suggestion.",
      "Jump noticeably higher and drift a little better while airborne.",
      ["+20% jump height", "+8% air control"], ["movement"],
      p => { p.stats.jump *= 1.2; p.stats.airAccel *= 1.08; }),

    card("longshot", "Longshot", "common",
      "Practically a laser.",
      "Bullets fly faster and drop less over distance — great for cross-map duels.",
      ["+28% bullet speed", "−15% bullet drop"], ["accuracy"],
      p => { p.stats.bulletSpeed *= 1.28; p.stats.bulletGravity *= 0.85; }),

    card("brick-wall", "Brick Wall", "common",
      "You shall not pass. Probably.",
      "A chunky slab of extra health. Reloads get slightly slower.",
      ["+30% health", "+0.12s reload"], ["defense"],
      p => { p.stats.maxHp *= 1.3; p.stats.reload += 0.12; }),

    card("buckshot-buttons", "Buckshot Buttons", "common",
      "Why fire one when you can fire three?",
      "Each trigger pull fires 2 extra pellets in a cone. Each pellet is weaker.",
      ["+2 pellets", "−30% damage per pellet", "wider spread"], ["multishot"],
      p => { p.stats.pellets += 2; p.stats.damage *= 0.7; p.stats.spread += 0.11; }),

    card("moon-shoes", "Moon Shoes", "common",
      "One small hop for a rounder…",
      "Gain one extra jump you can use in mid-air. Slightly slower on the ground.",
      ["+1 air jump", "−8% speed"], ["movement"],
      p => { p.stats.extraJumps += 1; p.stats.speed *= 0.92; }),

    card("sticky-soles", "Sticky Soles", "common",
      "Grip for days.",
      "Accelerate and stop much more sharply — you go exactly where you mean to.",
      ["+30% acceleration", "+20% braking"], ["movement"],
      p => { p.stats.accel *= 1.3; p.stats.brake *= 1.2; }),

    card("tailwind", "Tailwind", "common",
      "The sky likes you today.",
      "Steer far better while airborne. Jumps feel weightless.",
      ["+35% air control"], ["movement"],
      p => { p.stats.airAccel *= 1.35; }),

    card("big-bore", "Big Bore", "common",
      "Comically large. Comically effective.",
      "Fire fatter, harder-hitting slugs that travel a bit slower.",
      ["+18% damage", "+25% bullet size", "−12% bullet speed"], ["damage"],
      p => { p.stats.damage *= 1.18; p.stats.bulletSize *= 1.25; p.stats.bulletSpeed *= 0.88; }),

    // ---------------------------------------------------------- UNCOMMON (12)
    card("ricochet-romance", "Ricochet Romance", "uncommon",
      "Every wall is a matchmaker.",
      "Your bullets bounce off walls and floors up to 2 times before breaking.",
      ["+2 wall bounces"], ["projectile"],
      p => { p.stats.bounces += 2; }),

    card("wasp-venom", "Wasp Venom", "uncommon",
      "The sting is just the beginning.",
      "Hits inject venom that deals damage over 3 seconds. Direct damage drops a little.",
      ["poison on hit (3s)", "−8% damage"], ["dot"],
      p => { p.stats.poison += 1; p.stats.damage *= 0.92; }),

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

    card("popcorn-payload", "Popcorn Payload", "uncommon",
      "Pop pop pop.",
      "Bullets burst on impact, dealing splash damage and knockback nearby.",
      ["small explosion on hit", "−10% damage"], ["aoe"],
      p => { p.stats.explosive += 0.6; p.stats.damage *= 0.9; }),

    card("leech-lunch", "Leech Lunch", "uncommon",
      "Eat what you hit.",
      "Heal for 18% of every point of damage you deal.",
      ["18% lifesteal"], ["sustain"],
      p => { p.stats.lifesteal += 0.18; }),

    card("double-dutch", "Double Dutch", "uncommon",
      "Two ropes, two bullets.",
      "Fire a tight twin shot. Each bullet is weaker than a single would be.",
      ["+1 pellet", "−25% damage per pellet", "slight spread"], ["multishot"],
      p => { p.stats.pellets += 1; p.stats.damage *= 0.75; p.stats.spread += 0.05; }),

    card("rocket-skates", "Rocket Skates", "uncommon",
      "Safety third.",
      "Blocking also dashes you hard in your aim direction. Block recharges faster.",
      ["block = dash", "−15% block cooldown"], ["block"],
      p => { p.stats.blockDash += 1; p.stats.blockCooldown *= 0.85; }),

    card("echo-chamber", "Echo Chamber", "uncommon",
      "Say it again, louder.",
      "A moment after you block, a second block pulse automatically repeats.",
      ["block repeats once", "+0.2s block cooldown"], ["block"],
      p => { p.stats.echoBlock += 1; p.stats.blockCooldown += 0.2; }),

    card("bodyguard", "Bodyguard", "uncommon",
      "Personal space, enforced.",
      "Blocking releases a shockwave that shoves nearby opponents away. Extra health too.",
      ["block shockwave", "+15% health"], ["block"],
      p => { p.stats.blockPush += 1; p.stats.maxHp *= 1.15; }),

    card("panic-pedals", "Panic Pedals", "uncommon",
      "Fear is a performance enhancer.",
      "While below 35% health you move 40% faster. Panic responsibly.",
      ["+40% speed when under 35% HP"], ["movement", "clutch"],
      p => { p.stats.adrenaline += 0.4; }),

    // -------------------------------------------------------------- RARE (10)
    card("drill-rounds", "Drill Rounds", "rare",
      "Through, not around.",
      "Bullets punch straight through the first player they hit and keep flying.",
      ["pierce 1 player", "−15% damage"], ["projectile"],
      p => { p.stats.pierce += 1; p.stats.damage *= 0.85; }),

    card("chain-lightning", "Chain Lightning", "rare",
      "Sharing is shocking.",
      "When you hit someone, lightning arcs to the nearest other opponent for 55% damage.",
      ["hits arc to a 2nd enemy (55%)"], ["aoe"],
      p => { p.stats.chain += 1; }),

    card("thorn-jacket", "Thorn Jacket", "rare",
      "Hug at your own risk.",
      "Attackers take 35% of the damage they deal to you, reflected back instantly.",
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
      ["+75% damage", "−30% health"], ["damage"],
      p => { p.stats.damage *= 1.75; p.stats.maxHp *= 0.7; }),

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

    card("berserkers-blood", "Berserker's Blood", "rare",
      "Pain is a power source.",
      "The lower your health, the harder you hit — up to +60% damage at death's door.",
      ["up to +60% damage at low HP"], ["damage", "clutch"],
      p => { p.stats.rage += 0.6; }),

    card("hummingbird", "Hummingbird", "rare",
      "Blink and you'll miss all of it.",
      "A blur of light, fast shots: much higher fire rate and speed, lower damage.",
      ["−40% fire delay", "+10% speed", "−20% damage"], ["firerate"],
      p => { p.stats.fireDelay *= 0.6; p.stats.speed *= 1.1; p.stats.damage *= 0.8; }),

    // -------------------------------------------------------------- EPIC (8)
    card("cluster-bomb", "Cluster Bomb", "epic",
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
      p => { p.stats.maxHp *= 2.1; p.stats.radius *= 1.14; p.stats.speed *= 0.86; }),

    card("warp-block", "Warp Block", "epic",
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
      "Once per round, a hit that would kill you leaves you at 1 HP instead.",
      ["survive 1 lethal hit per round", "+10% health"], ["clutch", "defense"],
      p => { p.stats.guardian += 1; p.stats.maxHp *= 1.1; }),

    card("bullet-ballet", "Bullet Ballet", "epic",
      "Choreographed devastation.",
      "Fire 3 extra pellets in an elegant, tight formation. Each pellet is much weaker.",
      ["+3 pellets", "tight spread", "−45% damage per pellet"], ["multishot"],
      p => { p.stats.pellets += 3; p.stats.spread += 0.06; p.stats.damage *= 0.55; }),

    // ---------------------------------------------------------- LEGENDARY (5)
    card("supernova", "Supernova", "legendary",
      "Astronomers hate this one trick.",
      "Every bullet detonates in a huge explosion and hits far harder. Reloads are slow.",
      ["big explosion on hit", "+30% damage", "+0.3s reload"], ["aoe", "damage"],
      p => { p.stats.explosive += 2; p.stats.damage *= 1.3; p.stats.reload += 0.3; }),

    card("golden-gun", "Golden Gun", "legendary",
      "The first word is the last word.",
      "The first shot of every magazine deals TRIPLE damage and gleams gold.",
      ["1st shot per magazine ×3 damage", "+0.15s reload"], ["damage"],
      p => { p.stats.goldenShot = true; p.stats.reload += 0.15; }),

    card("dragons-hoard", "Dragon's Hoard", "legendary",
      "Never enough. Always more.",
      "A vast magazine, fast reloads, and a damage bonus. Pure greed, no downside.",
      ["+4 ammo", "−25% reload", "+10% damage"], ["ammo"],
      p => { p.stats.maxAmmo += 4; p.stats.reload *= 0.75; p.stats.damage *= 1.1; }),

    card("grim-harvest", "Grim Harvest", "legendary",
      "Waste nothing.",
      "Heal for 45% of all damage you deal, and knockouts restore you to full health.",
      ["45% lifesteal", "kills fully heal you"], ["sustain"],
      p => { p.stats.lifesteal += 0.45; p.stats.killHeal = true; }),

    card("crown-of-storms", "Crown of Storms", "legendary",
      "Heavy is the head that conducts.",
      "Blocking unleashes a lightning nova that damages and hurls away everyone nearby.",
      ["block = lightning nova", "block shockwave"], ["block", "aoe"],
      p => { p.stats.stormBlock += 1; p.stats.blockPush += 1; }),

    // ------------------------------------------------------------- MYTHIC (3)
    card("starfall-protocol", "Starfall Protocol", "mythic",
      "The sky picks a side.",
      "ACTIVE (G / LB): call a volley of 5 meteors crashing down toward your aim point. 12s cooldown. Passive: +10% damage.",
      ["ACTIVE: meteor volley", "12s cooldown", "+10% damage"], ["active", "aoe"],
      p => { p.stats.active = "starfall"; p.stats.activeCooldown = 12; p.stats.damage *= 1.1; }),

    card("event-horizon", "Event Horizon", "mythic",
      "Everything falls. Eventually.",
      "ACTIVE (G / LB): open a black hole at your aim point that drags enemies in and crushes them for 3s. 14s cooldown. Passive: +10% health.",
      ["ACTIVE: black hole (3s)", "14s cooldown", "+10% health"], ["active", "control"],
      p => { p.stats.active = "eventHorizon"; p.stats.activeCooldown = 14; p.stats.maxHp *= 1.1; }),

    card("chronoshift", "Chronoshift", "mythic",
      "You were never there.",
      "ACTIVE (G / LB): rewind to where you were 2 seconds ago and heal 35 HP. 10s cooldown. Passive: +8% speed.",
      ["ACTIVE: rewind 2s + heal 35", "10s cooldown", "+8% speed"], ["active", "clutch"],
      p => { p.stats.active = "chronoshift"; p.stats.activeCooldown = 10; p.stats.speed *= 1.08; })
  ];

  window.ROUNDERS.RARITIES = RARITIES;
  window.ROUNDERS.RARITY_ORDER = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];
  window.ROUNDERS.CARDS = CARDS;
})();
