// Rounders — card set (87 cards, designed from scratch).
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
    // ------------------------------------------------------------- COMMON (15)
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

    card("longshot", "Longshot", "common",
      "Practically a laser.",
      "Bullets fly twice as fast and drop less over distance — great for cross-map duels.",
      ["+100% bullet speed", "−15% bullet drop"], ["accuracy"],
      p => { p.stats.bulletSpeed *= 2; p.stats.bulletGravity *= 0.85; }),

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

    card("tailwind", "Tailwind", "common",
      "The sky likes you today.",
      "Steer far better while airborne, and hold the jump button to hang in the air for up to 2 seconds.",
      ["+50% air control", "hold jump to float (2s)"], ["movement"],
      p => { p.stats.airAccel *= 1.5; p.stats.floatTime += 2; }),

    card("boxing-glove", "Boxing Glove", "common",
      "Float like a truck.",
      "Your shots hit like a haymaker — they send people flying, and they hit a little softer for it.",
      ["+300% knockback dealt", "+10% bullet size", "−10% damage"], ["control"],
      p => { p.stats.kbDeal += 3; p.stats.bulletSize *= 1.1; p.stats.damage *= 0.9; }),

    card("sugar-rush", "Sugar Rush", "common",
      "Hits taste like candy.",
      "Landing a hit makes you giddy: double move speed for 2.5 seconds.",
      ["+100% speed for 2.5s after a hit"], ["movement"],
      p => { p.stats.sugarRush += 1; }),

    // ---------------------------------------------------------- UNCOMMON (24)
    card("ricochet-romance", "Ricochet Romance", "uncommon",
      "Every wall is a matchmaker.",
      "Your bullets bounce off walls and floors up to 2 times before breaking.",
      ["+2 wall bounces"], ["projectile"],
      p => { p.stats.bounces += 2; }),

    card("wasp-venom", "Wasp Venom", "uncommon",
      "The sting is just the beginning.",
      "Hits inject venom that deals damage over 3 seconds (strongest venom wins — it does not stack). Direct damage drops.",
      ["poison on hit (3s)", "−15% damage"], ["dot"],
      p => { p.stats.poison += 1; p.stats.damage *= 0.85; }),

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
      "Heal for 18% of every point of bullet damage you deal.",
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
      "A moment after you block, your parry window automatically re-opens for a second pulse.",
      ["block repeats once", "+0.2s block cooldown"], ["block"],
      p => { p.stats.echoBlock += 1; p.stats.blockCooldown += 0.2; }),

    card("bodyguard", "Bodyguard", "uncommon",
      "Personal space, enforced.",
      "Blocking releases a shockwave that shoves nearby opponents away. Extra health too.",
      ["block shockwave", "+15% health"], ["block"],
      p => { p.stats.blockPush += 1; p.stats.maxHp *= 1.15; }),

    card("lowrider", "Lowrider", "uncommon",
      "Keeps a low profile.",
      "Your bullets drop to the nearest floor and skim along it, hugging the terrain over ledges and up to your target's ankles.",
      ["bullets follow the ground", "−8% damage"], ["projectile"],
      p => { p.stats.groundHug += 1; p.stats.damage *= 0.92; }),

    card("panic-pedals", "Panic Pedals", "uncommon",
      "Fear is a performance enhancer.",
      "While below 35% health you move 40% faster. Panic responsibly.",
      ["+40% speed when under 35% HP"], ["movement", "clutch"],
      p => { p.stats.adrenaline += 0.4; }),

    card("waste-not", "Waste Not", "uncommon",
      "Every bullet comes home.",
      "Bullets that hit a player are refunded to your magazine. Shots come a touch slower.",
      ["hits refund ammo", "+0.15s fire delay"], ["ammo"],
      p => { if (p.stats.scavenge) p.stats.reload *= 0.8; p.stats.scavenge += 1; p.stats.fireDelay += 0.15; }),

    card("pit-stop", "Pit Stop", "uncommon",
      "Four seconds flat.",
      "Blocking instantly refills your magazine.",
      ["block = full reload", "+0.25s block cooldown"], ["block", "ammo"],
      p => { p.stats.blockReload += 1; p.stats.blockCooldown += 0.25; }),

    card("cold-snap", "Cold Snap", "uncommon",
      "Everyone out of the pool.",
      "Blocking flash-freezes the air, chilling everyone nearby for 2.5 seconds.",
      ["block chills nearby (2.5s)", "+10% health"], ["block", "control"],
      p => { p.stats.frostBlock += 1; p.stats.maxHp *= 1.1; }),

    card("panic-button", "Panic Button", "uncommon",
      "Insurance you fire.",
      "Firing the last bullet in your magazine automatically triggers your block — and everything attached to it.",
      ["last bullet auto-blocks", "+0.3s reload"], ["block", "clutch"],
      p => { p.stats.autoBlock += 1; p.stats.reload += 0.3; }),

    card("coffee-break", "Coffee Break", "uncommon",
      "Do not talk to me yet.",
      "While reloading you emit scalding pulses that damage and push nearby enemies.",
      ["damaging pulses while reloading"], ["aoe"],
      p => { p.stats.reloadPulse += 1; }),

    card("triple-tap", "Triple Tap", "uncommon",
      "Once more, with feeling. Twice.",
      "Every trigger pull is followed by two lighter echo shots in a tight burst.",
      ["+2 burst echoes (45% damage)", "+0.1s fire delay"], ["firerate"],
      p => { p.stats.burstFire += 2; p.stats.fireDelay += 0.1; }),

    card("hot-streak", "Hot Streak", "uncommon",
      "Ride the wave.",
      "Dealing bullet damage armors you with a 25-point shield that fades fast.",
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

    card("underdog", "Underdog", "uncommon",
      "Nothing left to lose.",
      "For every round you trail the leader, hit 8% harder and move 8% faster.",
      ["+8% damage & speed per round behind"], ["clutch"],
      p => { p.stats.underdog += 0.08; }),

    card("firecracker-heels", "Firecracker Heels", "uncommon",
      "Ignition on the second hop.",
      "Your mid-air jumps detonate a small blast beneath you that damages and shoves enemies.",
      ["air jumps explode (15 dmg)"], ["movement", "aoe"],
      p => { p.stats.jumpBlast += 1; }),

    // -------------------------------------------------------------- RARE (26)
    card("drill-rounds", "Drill Rounds", "rare",
      "Through, not around.",
      "Your bullets bore straight through walls and floors and keep flying, so cover stops being cover. Stacks drill deeper.",
      ["bullets drill through walls", "−12% damage"], ["projectile"],
      p => { p.stats.wallPierce += 1; p.stats.damage *= 0.88; }),

    card("skylight", "Skylight", "epic",
      "Every wall wants a window.",
      "Shots that strike terrain blow a permanent hole clean through it — anyone can shoot or climb through the gaps you make. People still just get hit.",
      ["impacts punch real holes in terrain", "−10% damage"], ["projectile", "control"],
      p => { p.stats.holePunch += 1; p.stats.damage *= 0.9; }),

    card("chain-lightning", "Chain Letter", "rare",
      "Sharing is shocking.",
      "When you hit someone, lightning arcs to the nearest other opponent for 55% damage. In a duel it re-strikes your victim for 25% instead.",
      ["hits arc to a 2nd enemy (55%)", "duels: re-strike 25%"], ["aoe"],
      p => { p.stats.chain += 1; }),

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

    card("aegis-bubble", "Aegis Bubble", "rare",
      "Bring your own weather.",
      "A regenerating energy shield absorbs 30 damage before your health is touched. It recharges after 3.5 seconds without being hit.",
      ["+30 regenerating shield"], ["defense"],
      p => { p.stats.shield += 30; }),

    card("hummingbird", "Hummingbird", "rare",
      "Blink and you'll miss all of it.",
      "A blur of light, fast shots: a bigger magazine, much higher fire rate and speed, lower damage.",
      ["−40% fire delay", "+2 ammo", "+10% speed", "−20% damage"], ["firerate"],
      p => { p.stats.fireDelay *= 0.6; p.stats.maxAmmo += 2; p.stats.speed *= 1.1; p.stats.damage *= 0.8; }),

    card("lemonade-stand", "Lemonade Stand", "rare",
      "Fresh squeezed. Slightly radioactive.",
      "Blocking plants a fizzy zone that heals anyone inside 10 HP a second for 3 seconds — stand in your own.",
      ["block plants a heal zone (10 HP/s)"], ["block", "sustain"],
      p => { p.stats.healField += 1; }),

    card("mosh-pit", "Mosh Pit", "rare",
      "Mind the blade.",
      "Blocking spins a sawblade around you for 2 seconds, shredding anyone it touches.",
      ["block = orbiting saw (2s)"], ["block", "aoe"],
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

    card("fresh-coat", "Fresh Coat", "rare",
      "Still has the sticker on.",
      "Start each round with a +50% health overcoat. It shatters the first time you're hit.",
      ["+50% HP shell until first hit"], ["defense"],
      p => { p.stats.freshCoat += 0.5; }),

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

    card("gag-order", "Gag Order", "rare",
      "Talk to my lawyer.",
      "Hits mute the victim: no blocking, no abilities for 1.5 seconds.",
      ["hits disable block & actives (1.5s)", "−8% damage"], ["control"],
      p => { p.stats.silence += 1; p.stats.damage *= 0.92; }),

    card("cold-shoulder", "Cold Shoulder", "rare",
      "You bring the weather with you.",
      "Enemies near you are permanently chilled — slower feet, weaker jumps.",
      ["chill aura around you"], ["control"],
      p => { p.stats.chillAura += 1; }),

    card("second-serve", "Second Serve", "rare",
      "Advantage: you.",
      "Dealing bullet damage instantly returns your block. Deep breaths between rallies.",
      ["hits refresh your block (1s lockout)"], ["block"],
      p => { p.stats.blockRefresh += 1; }),

    card("overflow", "Overflow", "rare",
      "Waste not a drop.",
      "Healing past full health becomes a shield instead, up to 40 points.",
      ["overheal → shield (max 40)"], ["sustain", "defense"],
      p => { p.stats.overflow += 40; }),

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

    // -------------------------------------------------------------- EPIC (13)
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
      p => { p.stats.maxHp *= 2.1; p.stats.radius *= 1.14; p.stats.speed *= 0.86; }),

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
      "Wherever a bullet breaks it tears open a vortex that drags players in — and its heart mauls them like an arena hazard, over and over if they cannot get clear.",
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

    // ---------------------------------------------------------- LEGENDARY (5)
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
      p => { p.stats.goldenShot = true; p.stats.reload += 0.15; }),

    card("dragons-hoard", "Dragon's Hoard", "legendary",
      "Never enough. Always more.",
      "A vast magazine, fast reloads, and a damage bonus. Pure greed, no downside.",
      ["+4 ammo", "−25% reload", "+10% damage"], ["ammo"],
      p => { p.stats.maxAmmo += 4; p.stats.reload *= 0.75; p.stats.damage *= 1.1; }),

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

    // ------------------------------------------------------------- MYTHIC (3)
    card("starfall-protocol", "Starfall Protocol", "mythic",
      "The sky picks a side.",
      "ACTIVE (Y / LB): call a volley of 5 meteors crashing down toward your aim point. 12s cooldown. Passive: +10% damage.",
      ["ACTIVE: meteor volley", "12s cooldown", "+10% damage"], ["active", "aoe"],
      p => { p.stats.active = "starfall"; p.stats.activeCooldown = 12; p.stats.damage *= 1.1; }),

    card("event-horizon", "Event Horizon", "mythic",
      "Everything falls. Eventually.",
      "ACTIVE (Y / LB): tear open a vast black hole at your aim point. It hauls enemies in for 3.4s and mauls them like a hazard every time they reach its heart. 14s cooldown. Passive: +10% health.",
      ["ACTIVE: huge black hole (3.4s)", "hazard damage at its core", "14s cooldown", "+10% health"], ["active", "control"],
      p => { p.stats.active = "eventHorizon"; p.stats.activeCooldown = 14; p.stats.maxHp *= 1.1; }),

    card("chronoshift", "Chronoshift", "mythic",
      "You were never there.",
      "ACTIVE (Y / LB): rewind to where you were 2 seconds ago and heal 35 HP. 10s cooldown. Passive: +8% speed.",
      ["ACTIVE: rewind 2s + heal 35", "10s cooldown", "+8% speed"], ["active", "clutch"],
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

  window.ROUNDERS.RARITIES = RARITIES;
  window.ROUNDERS.RARITY_ORDER = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];
  window.ROUNDERS.CARDS = CARDS;
  window.ROUNDERS.cardArt = cardArt;
  window.ROUNDERS.cardArtUrl = cardArtUrl;
  window.ROUNDERS.cardScene = cardScene;
  window.ROUNDERS.cardSceneUrl = cardSceneUrl;
})();
