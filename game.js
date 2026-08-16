(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const hud = document.getElementById("hud");
  const toast = document.getElementById("toast");
  const menu = document.getElementById("menu");
  const settingsPanel = document.getElementById("settings");
  const howPanel = document.getElementById("how");
  const draftPanel = document.getElementById("draft");
  const draftCards = document.getElementById("draftCards");
  const draftPrompt = document.getElementById("draftPrompt");
  const joinSlots = document.getElementById("joinSlots");
  const onlineGames = document.getElementById("onlineGames");
  const battleSplash = document.getElementById("battleSplash");
  const battleKicker = document.getElementById("battleKicker");
  const battleTitle = document.getElementById("battleTitle");
  const battleSub = document.getElementById("battleSub");
  const pausePanel = document.getElementById("pausePanel");

  const settings = {
    playerCount: 4,
    botCount: 0,
    botDifficulty: 1,
    scoreLimit: 5,
    draftCount: 5,
    hazards: true,
    haptics: true,
    shake: true,
    music: true,
    musicVolume: 0.2,
    rarityWeights: {
      common: 9,
      uncommon: 6,
      rare: 4,
      epic: 3,
      legendary: 2,
      mythical: 1
    }
  };

  const world = {
    width: 1600,
    height: 900,
    gravity: 2100,
    airDrag: 0.996,
    floorDrag: 0.86,
    state: "menu",
    timeScale: 1,
    winner: null,
    roundWinner: null,
    pendingDraftPlayer: null,
    draftQueue: [],
    splashTimer: 0,
    draftPlayer: null,
    draftOptions: [],
    draftIndex: 0,
    roundFreeze: 0,
    shake: 0,
    mapIndex: 0,
    nextMap: 0,
    menuIndex: 0,
    menuStickLock: false,
    joinedThisFrame: false,
    pausedThisFrame: false
  };

  const colors = ["#ff5277", "#52d7ff", "#ffe169", "#74f08b"];
  const spawnPoints = [
    { x: 260, y: 760 },
    { x: 1340, y: 760 },
    { x: 420, y: 555 },
    { x: 1180, y: 555 }
  ];

  const maps = [
    {
      name: "Switchback",
      platforms: [
        rect(0, 830, 1600, 70),
        rect(165, 640, 330, 28),
        rect(1105, 640, 330, 28),
        rect(610, 505, 380, 28),
        rect(260, 360, 260, 24),
        rect(1080, 360, 260, 24),
        rect(700, 250, 200, 24)
      ],
      hazards: [rect(740, 810, 120, 20)]
    },
    {
      name: "Spokes",
      platforms: [
        rect(0, 830, 1600, 70),
        rect(220, 635, 260, 26),
        rect(1120, 635, 260, 26),
        rect(625, 570, 350, 24),
        rect(370, 430, 255, 24),
        rect(975, 430, 255, 24),
        rect(675, 300, 250, 24)
      ],
      hazards: [rect(130, 812, 180, 18), rect(1290, 812, 180, 18)]
    },
    {
      name: "Chimney",
      platforms: [
        rect(0, 830, 1600, 70),
        rect(105, 690, 320, 26),
        rect(1175, 690, 320, 26),
        rect(560, 640, 480, 26),
        rect(245, 500, 260, 24),
        rect(1095, 500, 260, 24),
        rect(640, 395, 320, 24),
        rect(455, 250, 230, 24),
        rect(915, 250, 230, 24)
      ],
      hazards: [rect(760, 812, 80, 18)]
    },
    {
      name: "Split Rail",
      platforms: [
        rect(0, 830, 1600, 70),
        rect(130, 650, 360, 26),
        rect(1110, 650, 360, 26),
        rect(570, 595, 460, 26),
        rect(130, 420, 250, 24),
        rect(1220, 420, 250, 24),
        rect(520, 350, 210, 24),
        rect(870, 350, 210, 24),
        rect(700, 205, 200, 24)
      ],
      hazards: [rect(650, 812, 90, 18), rect(860, 812, 90, 18)]
    },
    {
      name: "Kettle",
      platforms: [
        rect(0, 830, 1600, 70),
        rect(170, 705, 270, 26),
        rect(1160, 705, 270, 26),
        rect(480, 610, 220, 24),
        rect(900, 610, 220, 24),
        rect(650, 500, 300, 26),
        rect(280, 365, 260, 24),
        rect(1060, 365, 260, 24),
        rect(665, 240, 270, 24)
      ],
      hazards: [rect(735, 812, 130, 18)]
    },
    {
      name: "Overpass",
      platforms: [
        rect(0, 830, 1600, 70),
        rect(110, 665, 310, 26),
        rect(1180, 665, 310, 26),
        rect(500, 690, 600, 26),
        rect(315, 510, 260, 24),
        rect(1025, 510, 260, 24),
        rect(670, 405, 260, 24),
        rect(210, 285, 230, 24),
        rect(1160, 285, 230, 24)
      ],
      hazards: [rect(520, 812, 100, 18), rect(980, 812, 100, 18)]
    },
    {
      name: "Needle",
      platforms: [
        rect(0, 830, 1600, 70),
        rect(165, 690, 300, 26),
        rect(1135, 690, 300, 26),
        rect(670, 665, 260, 26),
        rect(465, 520, 260, 24),
        rect(875, 520, 260, 24),
        rect(690, 370, 220, 24),
        rect(350, 300, 190, 22),
        rect(1060, 300, 190, 22),
        rect(735, 185, 130, 22)
      ],
      hazards: [rect(150, 812, 120, 18), rect(1330, 812, 120, 18)]
    },
    {
      name: "Low Tide",
      platforms: [
        rect(0, 830, 1600, 70),
        rect(100, 720, 420, 26),
        rect(1080, 720, 420, 26),
        rect(585, 625, 430, 26),
        rect(165, 500, 285, 24),
        rect(1150, 500, 285, 24),
        rect(520, 360, 230, 24),
        rect(850, 360, 230, 24),
        rect(660, 230, 280, 24)
      ],
      hazards: [rect(610, 812, 380, 18)]
    }
  ];

  const keyboardSchemes = [
    { left: "KeyA", right: "KeyD", jump: "KeyW", shoot: "KeyF", block: "KeyG" },
    { left: "ArrowLeft", right: "ArrowRight", jump: "ArrowUp", shoot: "Slash", block: "Period" }
  ];

  const keys = new Set();
  const pressed = new Set();
  const gamepadSlots = new Map();
  const lastPadButtons = new Map();
  const lobbySlots = [];
  const INSTANT_APP_ID = "96e3e93f-4644-4596-a02f-40e8ae915138";
  const online = {
    db: null,
    id: null,
    unsubGames: null,
    games: [],
    active: false,
    role: null,
    gameId: null,
    localId: loadLocalClientId(),
    hostId: null,
    guestId: null,
    remoteInput: emptyInput(),
    lastLocalInput: emptyInput(),
    lastInputSent: 0,
    lastSnapshotSent: 0,
    lastSnapshotAt: 0,
    lastDraftPickSent: -1,
    lastRemoteDraftPick: "",
    hostStarted: false,
    connected: false
  };

  let players = [];
  let bullets = [];
  let particles = [];
  let fields = [];
  let last = performance.now();
  let toastTimer = 0;
  let audioCtx = null;
  let masterGain = null;
  let musicAudio = null;
  let currentTrack = 0;

  const soundtrack = [
    "assets/audio/Apex_Pursuit.mp3",
    "assets/audio/The_Last_Overpass.mp3"
  ];

  const cardPool = [
    card("heavyParcel", "Heavy Parcel", "common", "Shots hit harder and reload slower.", ["+45% damage", "+0.18s reload"], p => {
      p.stats.damage *= 1.45;
      p.stats.reload += 0.18;
    }),
    card("lightDrum", "Light Drum", "common", "A larger magazine with a softer bite.", ["+2 ammo", "-15% damage"], p => {
      p.stats.maxAmmo += 2;
      p.stats.damage *= 0.85;
    }),
    card("snapLoad", "Snap Load", "common", "Reloads become much shorter.", ["-35% reload"], p => {
      p.stats.reload *= 0.65;
    }),
    card("thickSkin", "Thick Skin", "common", "More health, slower feet.", ["+45% health", "-6% speed"], p => {
      p.stats.maxHp *= 1.45;
      p.stats.speed *= 0.94;
    }),
    card("skipRounds", "Skip Rounds", "uncommon", "Bullets ricochet off the stage.", ["+2 bounces", "+0.14s reload"], p => {
      p.stats.bounces += 2;
      p.stats.reload += 0.14;
    }),
    card("scatterPin", "Scatter Pin", "uncommon", "Fire a tight cluster of weaker shots.", ["+3 pellets", "+3 ammo", "-55% damage"], p => {
      p.stats.pellets += 3;
      p.stats.maxAmmo += 3;
      p.stats.damage *= 0.45;
      p.stats.spread += 0.16;
    }),
    card("emberCore", "Ember Core", "uncommon", "Shots burst on contact.", ["explosive hits", "-18% fire rate"], p => {
      p.stats.explosive += 1;
      p.stats.fireDelay += 0.1;
    }),
    card("curveMind", "Curve Mind", "uncommon", "Shots bend toward nearby rivals.", ["guided bullets", "-18% damage"], p => {
      p.stats.homing += 0.9;
      p.stats.damage *= 0.82;
    }),
    card("echoGuard", "Echo Guard", "uncommon", "Blocking repeats a second pulse.", ["double block pulse", "+0.25s block cooldown"], p => {
      p.stats.echoBlock += 1;
      p.stats.blockCooldown += 0.25;
    }),
    card("pulsePalm", "Pulse Palm", "uncommon", "Blocks shove nearby opponents away.", ["block shockwave", "+25% health"], p => {
      p.stats.blockPush += 1;
      p.stats.maxHp *= 1.25;
    }),
    card("stingTrail", "Sting Trail", "rare", "Bullets leave damage over time.", ["poison shots", "+20% damage"], p => {
      p.stats.poison += 1;
      p.stats.damage *= 1.2;
    }),
    card("anchorHeart", "Anchor Heart", "rare", "Lifesteal rewards brave trades.", ["35% lifesteal", "+20% health"], p => {
      p.stats.lifesteal += 0.35;
      p.stats.maxHp *= 1.2;
    }),
    card("blinkBuckle", "Blink Buckle", "rare", "Block warps you through danger.", ["block dash", "-25% block cooldown"], p => {
      p.stats.blockDash += 1;
      p.stats.blockCooldown *= 0.75;
    }),
    card("lastWord", "Last Word", "rare", "Your last bullet auto-blocks.", ["empty magazine shield", "+0.25s reload"], p => {
      p.stats.emptyBlock = true;
      p.stats.reload += 0.25;
    }),
    card("phoenixPop", "Phoenix Pop", "rare", "Survive one knockout per round.", ["one revive", "-20% health"], p => {
      p.stats.revives += 1;
      p.stats.maxHp *= 0.8;
    }),
    card("meteorMath", "Meteor Math", "rare", "Long-travel shots gain power.", ["distance damage", "+0.2s reload"], p => {
      p.stats.grow += 1;
      p.stats.reload += 0.2;
    })
  ];

  cardPool.push(
    card("rubberBand", "Rubber Band", "common", "Move faster with softer stopping.", ["+14% speed", "-8% brake"], p => {
      p.stats.speed *= 1.14;
      p.stats.brake *= 0.92;
    }),
    card("cleanShoes", "Clean Shoes", "common", "Tighter ground control.", ["+22% acceleration", "+10% brake"], p => {
      p.stats.accel *= 1.22;
      p.stats.brake *= 1.1;
    }),
    card("floatStep", "Float Step", "common", "Better air control with a lighter jump.", ["+30% air control", "-5% jump"], p => {
      p.stats.airAccel *= 1.3;
      p.stats.jump *= 0.95;
    }),
    card("springHeel", "Spring Heel", "common", "Jump higher.", ["+18% jump"], p => {
      p.stats.jump *= 1.18;
    }),
    card("fatSpring", "Fat Spring", "common", "A higher jump and a slower body.", ["+28% jump", "-8% speed"], p => {
      p.stats.jump *= 1.28;
      p.stats.speed *= 0.92;
    }),
    card("softShell", "Soft Shell", "common", "A little more health and block time.", ["+18% health", "+0.04s block"], p => {
      p.stats.maxHp *= 1.18;
      p.stats.blockDuration += 0.04;
    }),
    card("fastHands", "Fast Hands", "common", "Shoot sooner after firing.", ["-18% fire delay"], p => {
      p.stats.fireDelay *= 0.82;
    }),
    card("tallStack", "Tall Stack", "common", "More ammo, longer reload.", ["+1 ammo", "+0.1s reload"], p => {
      p.stats.maxAmmo += 1;
      p.stats.reload += 0.1;
    }),
    card("hotNeedle", "Hot Needle", "common", "Faster bullets with lower damage.", ["+22% bullet speed", "-8% damage"], p => {
      p.stats.bulletSpeed *= 1.22;
      p.stats.damage *= 0.92;
    }),
    card("wideNose", "Wide Nose", "common", "Chunkier shots.", ["+12% damage", "+0.04s fire delay"], p => {
      p.stats.damage *= 1.12;
      p.stats.fireDelay += 0.04;
    }),
    card("sturdyCore", "Sturdy Core", "common", "More health and slower reloads.", ["+28% health", "+0.08s reload"], p => {
      p.stats.maxHp *= 1.28;
      p.stats.reload += 0.08;
    }),
    card("paperCut", "Paper Cut", "common", "Smaller frequent shots.", ["-22% damage", "-22% fire delay"], p => {
      p.stats.damage *= 0.78;
      p.stats.fireDelay *= 0.78;
    }),
    card("zipLine", "Zip Line", "common", "Quick feet, weaker body.", ["+18% speed", "-12% health"], p => {
      p.stats.speed *= 1.18;
      p.stats.maxHp *= 0.88;
    }),
    card("denseInk", "Dense Ink", "common", "Hits harder but travels slower.", ["+22% damage", "-14% bullet speed"], p => {
      p.stats.damage *= 1.22;
      p.stats.bulletSpeed *= 0.86;
    }),
    card("quickLatch", "Quick Latch", "common", "Block recharges faster.", ["-18% block cooldown"], p => {
      p.stats.blockCooldown *= 0.82;
    }),
    card("pocketRounds", "Pocket Rounds", "common", "A bigger magazine.", ["+2 ammo"], p => {
      p.stats.maxAmmo += 2;
    }),
    card("snapGuard", "Snap Guard", "common", "Shorter block, much faster recharge.", ["-0.04s block", "-28% block cooldown"], p => {
      p.stats.blockDuration = Math.max(0.1, p.stats.blockDuration - 0.04);
      p.stats.blockCooldown *= 0.72;
    }),
    card("rubberShot", "Rubber Shot", "uncommon", "A ricochet and faster bullets.", ["+1 bounce", "+12% bullet speed"], p => {
      p.stats.bounces += 1;
      p.stats.bulletSpeed *= 1.12;
    }),
    card("splitBill", "Split Bill", "uncommon", "Two-shot spread with less damage.", ["+1 pellet", "-25% damage", "+spread"], p => {
      p.stats.pellets += 1;
      p.stats.damage *= 0.75;
      p.stats.spread += 0.08;
    }),
    card("coinFlip", "Coin Flip", "uncommon", "More burst, less certainty.", ["+2 pellets", "-35% damage", "+wide spread"], p => {
      p.stats.pellets += 2;
      p.stats.damage *= 0.65;
      p.stats.spread += 0.13;
    }),
    card("sparkPlug", "Spark Plug", "uncommon", "Tiny explosive pressure.", ["+small explosion", "-10% damage"], p => {
      p.stats.explosive += 0.55;
      p.stats.damage *= 0.9;
    }),
    card("heavyFuse", "Heavy Fuse", "uncommon", "Bigger explosions, longer reloads.", ["+explosion", "+0.18s reload"], p => {
      p.stats.explosive += 1;
      p.stats.reload += 0.18;
    }),
    card("magnetTip", "Magnet Tip", "uncommon", "Gentle bullet guidance.", ["+homing", "-8% bullet speed"], p => {
      p.stats.homing += 0.55;
      p.stats.bulletSpeed *= 0.92;
    }),
    card("bloodOrange", "Blood Orange", "uncommon", "Light lifesteal.", ["18% lifesteal"], p => {
      p.stats.lifesteal += 0.18;
    }),
    card("saltCloud", "Salt Cloud", "uncommon", "Poison lasts longer through stronger shots.", ["poison", "+10% damage"], p => {
      p.stats.poison += 1;
      p.stats.damage *= 1.1;
    }),
    card("shieldBattery", "Shield Battery", "uncommon", "Block longer and recharge slower.", ["+0.1s block", "+0.12s cooldown"], p => {
      p.stats.blockDuration += 0.1;
      p.stats.blockCooldown += 0.12;
    }),
    card("waveBox", "Wave Box", "uncommon", "Block sends pressure outward.", ["block push", "-10% speed"], p => {
      p.stats.blockPush += 1;
      p.stats.speed *= 0.9;
    }),
    card("mirrorTap", "Mirror Tap", "uncommon", "Block repeats, but not as often.", ["echo block", "+0.2s cooldown"], p => {
      p.stats.echoBlock += 1;
      p.stats.blockCooldown += 0.2;
    }),
    card("sidePocket", "Side Pocket", "uncommon", "Carry more and reload faster.", ["+1 ammo", "-18% reload"], p => {
      p.stats.maxAmmo += 1;
      p.stats.reload *= 0.82;
    }),
    card("stutterStep", "Stutter Step", "uncommon", "Sharper stopping and quicker shots.", ["+35% brake", "-10% fire delay"], p => {
      p.stats.brake *= 1.35;
      p.stats.fireDelay *= 0.9;
    }),
    card("pogoPermit", "Pogo Permit", "uncommon", "Gain an extra air jump.", ["+1 air jump", "-8% speed"], p => {
      p.stats.extraJumps += 1;
      p.stats.speed *= 0.92;
    }),
    card("featherPermit", "Feather Permit", "uncommon", "Jump higher and control air better.", ["+12% jump", "+18% air control"], p => {
      p.stats.jump *= 1.12;
      p.stats.airAccel *= 1.18;
    }),
    card("roundHouse", "Round House", "uncommon", "Bigger body, bigger health.", ["+30% health", "+10% size"], p => {
      p.stats.maxHp *= 1.3;
      p.stats.radius *= 1.1;
    }),
    card("pinBody", "Pin Body", "uncommon", "Smaller body and less health.", ["-12% size", "-10% health", "+10% speed"], p => {
      p.stats.radius *= 0.88;
      p.stats.maxHp *= 0.9;
      p.stats.speed *= 1.1;
    }),
    card("lineDrive", "Line Drive", "uncommon", "Fast accurate shots.", ["+32% bullet speed", "-spread"], p => {
      p.stats.bulletSpeed *= 1.32;
      p.stats.spread *= 0.75;
    }),
    card("fatPacket", "Fat Packet", "uncommon", "Chunky bullets with heavy recoil feel.", ["+30% damage", "+0.08s fire delay"], p => {
      p.stats.damage *= 1.3;
      p.stats.fireDelay += 0.08;
    }),
    card("doubleTap", "Double Tap", "rare", "Fire more often with less punch.", ["-35% fire delay", "-18% damage"], p => {
      p.stats.fireDelay *= 0.65;
      p.stats.damage *= 0.82;
    }),
    card("moonBoots", "Moon Boots", "rare", "Two extra air jumps.", ["+2 air jumps", "-12% health"], p => {
      p.stats.extraJumps += 2;
      p.stats.maxHp *= 0.88;
    }),
    card("cometCore", "Comet Core", "rare", "Shots accelerate into serious hits.", ["distance damage", "+25% bullet speed"], p => {
      p.stats.grow += 1;
      p.stats.bulletSpeed *= 1.25;
    }),
    card("vampireDrum", "Vampire Drum", "rare", "A big magazine with lifesteal.", ["+3 ammo", "20% lifesteal"], p => {
      p.stats.maxAmmo += 3;
      p.stats.lifesteal += 0.2;
    }),
    card("ghostBlock", "Ghost Block", "rare", "Fast dash blocks.", ["block dash", "-18% cooldown", "+0.04s block"], p => {
      p.stats.blockDash += 1;
      p.stats.blockCooldown *= 0.82;
      p.stats.blockDuration += 0.04;
    }),
    card("stormGlass", "Storm Glass", "rare", "Guided explosive shots.", ["homing", "explosion", "-20% damage"], p => {
      p.stats.homing += 0.75;
      p.stats.explosive += 0.75;
      p.stats.damage *= 0.8;
    }),
    card("porcupine", "Porcupine", "rare", "Lots of tiny shots.", ["+5 pellets", "-60% damage", "+spread"], p => {
      p.stats.pellets += 5;
      p.stats.damage *= 0.4;
      p.stats.spread += 0.22;
    }),
    card("bankShot", "Bank Shot", "rare", "Bullets love walls.", ["+4 bounces", "+10% damage"], p => {
      p.stats.bounces += 4;
      p.stats.damage *= 1.1;
    }),
    card("riotFoam", "Riot Foam", "rare", "Huge defensive presence.", ["block push", "echo block", "+25% health"], p => {
      p.stats.blockPush += 1;
      p.stats.echoBlock += 1;
      p.stats.maxHp *= 1.25;
    }),
    card("needleStorm", "Needle Storm", "rare", "High-speed low-damage pressure.", ["+45% bullet speed", "-30% fire delay", "-35% damage"], p => {
      p.stats.bulletSpeed *= 1.45;
      p.stats.fireDelay *= 0.7;
      p.stats.damage *= 0.65;
    }),
    card("ironLungs", "Iron Lungs", "rare", "Massive health and sluggish movement.", ["+70% health", "-18% speed"], p => {
      p.stats.maxHp *= 1.7;
      p.stats.speed *= 0.82;
    }),
    card("flashPaper", "Flash Paper", "rare", "Explosive reload-heavy glass cannon.", ["+60% damage", "explosion", "+0.35s reload", "-15% health"], p => {
      p.stats.damage *= 1.6;
      p.stats.explosive += 1;
      p.stats.reload += 0.35;
      p.stats.maxHp *= 0.85;
    }),
    card("secondWind", "Second Wind", "rare", "A revive and better movement.", ["one revive", "+12% speed"], p => {
      p.stats.revives += 1;
      p.stats.speed *= 1.12;
    }),
    card("luckyChamber", "Lucky Chamber", "rare", "A little bit of everything dangerous.", ["+1 ammo", "+15% damage", "+1 bounce"], p => {
      p.stats.maxAmmo += 1;
      p.stats.damage *= 1.15;
      p.stats.bounces += 1;
    })
  );

  cardPool.push(
    card("solarLatch", "Solar Latch", "epic", "Blocks become explosive counter-zones.", ["block push", "explosion", "+0.08s block"], p => {
      p.stats.blockPush += 1;
      p.stats.explosive += 0.8;
      p.stats.blockDuration += 0.08;
    }),
    card("starMagazine", "Star Magazine", "epic", "A huge magazine with quick reloads.", ["+5 ammo", "-20% reload", "-12% damage"], p => {
      p.stats.maxAmmo += 5;
      p.stats.reload *= 0.8;
      p.stats.damage *= 0.88;
    }),
    card("afterImage", "After Image", "epic", "Move like a blur.", ["+30% speed", "+40% air control", "-15% health"], p => {
      p.stats.speed *= 1.3;
      p.stats.airAccel *= 1.4;
      p.stats.maxHp *= 0.85;
    }),
    card("needleHalo", "Needle Halo", "epic", "A ring of accurate rapid fire.", ["+4 pellets", "-35% fire delay", "-55% damage"], p => {
      p.stats.pellets += 4;
      p.stats.fireDelay *= 0.65;
      p.stats.damage *= 0.45;
      p.stats.spread += 0.1;
    }),
    card("gravityReceipt", "Gravity Receipt", "epic", "Leap twice and hit harder from range.", ["+1 air jump", "distance damage"], p => {
      p.stats.extraJumps += 1;
      p.stats.grow += 1;
    }),
    card("cinderMap", "Cinder Map", "epic", "Burning ricochets with heavier reloads.", ["+3 bounces", "poison", "+0.18s reload"], p => {
      p.stats.bounces += 3;
      p.stats.poison += 1;
      p.stats.reload += 0.18;
    }),
    card("vacuumSeal", "Vacuum Seal", "epic", "Guided shots and lifesteal.", ["homing", "22% lifesteal", "-10% speed"], p => {
      p.stats.homing += 1.1;
      p.stats.lifesteal += 0.22;
      p.stats.speed *= 0.9;
    }),
    card("fortressCoin", "Fortress Coin", "epic", "Become hard to kill.", ["+90% health", "-18% speed", "+0.08s block"], p => {
      p.stats.maxHp *= 1.9;
      p.stats.speed *= 0.82;
      p.stats.blockDuration += 0.08;
    }),
    card("prismBarrel", "Prism Barrel", "epic", "Fast splitting bullets.", ["+2 pellets", "+35% bullet speed", "-30% damage"], p => {
      p.stats.pellets += 2;
      p.stats.bulletSpeed *= 1.35;
      p.stats.damage *= 0.7;
      p.stats.spread += 0.07;
    }),
    card("panicButton", "Panic Button", "epic", "Blocking teleports and echoes.", ["block dash", "echo block", "+0.2s cooldown"], p => {
      p.stats.blockDash += 1;
      p.stats.echoBlock += 1;
      p.stats.blockCooldown += 0.2;
    }),
    card("meteorPocket", "Meteor Pocket", "epic", "Explosive distance scaling.", ["explosion", "distance damage", "+0.2s reload"], p => {
      p.stats.explosive += 1;
      p.stats.grow += 1;
      p.stats.reload += 0.2;
    }),
    card("wildOrbit", "Wild Orbit", "epic", "Wide bouncing chaos.", ["+4 pellets", "+2 bounces", "-50% damage"], p => {
      p.stats.pellets += 4;
      p.stats.bounces += 2;
      p.stats.damage *= 0.5;
      p.stats.spread += 0.24;
    }),
    card("goldenTrigger", "Golden Trigger", "legendary", "Ridiculous fire rate.", ["-55% fire delay", "+2 ammo", "-20% damage"], p => {
      p.stats.fireDelay *= 0.45;
      p.stats.maxAmmo += 2;
      p.stats.damage *= 0.8;
    }),
    card("blackHoleTip", "Black Hole Tip", "legendary", "Shots hunt hard and hit harder.", ["strong homing", "+35% damage", "+0.25s reload"], p => {
      p.stats.homing += 2.2;
      p.stats.damage *= 1.35;
      p.stats.reload += 0.25;
    }),
    card("sunburstCore", "Sunburst Core", "legendary", "Huge explosions.", ["big explosion", "+40% damage", "+0.35s reload"], p => {
      p.stats.explosive += 2.4;
      p.stats.damage *= 1.4;
      p.stats.reload += 0.35;
    }),
    card("immortalBattery", "Immortal Battery", "legendary", "Two revives and a thicker body.", ["+2 revives", "+35% health"], p => {
      p.stats.revives += 2;
      p.stats.maxHp *= 1.35;
    }),
    card("mirrorStorm", "Mirror Storm", "legendary", "Blocks become absurd.", ["double echo", "block push", "-20% cooldown"], p => {
      p.stats.echoBlock += 2;
      p.stats.blockPush += 1;
      p.stats.blockCooldown *= 0.8;
    }),
    card("crownOfJumps", "Crown of Jumps", "legendary", "The sky belongs to you.", ["+3 air jumps", "+20% speed"], p => {
      p.stats.extraJumps += 3;
      p.stats.speed *= 1.2;
    }),
    card("dragonDrum", "Dragon Drum", "legendary", "Massive magazine of explosive rounds.", ["+6 ammo", "explosion", "-20% fire delay", "-30% damage"], p => {
      p.stats.maxAmmo += 6;
      p.stats.explosive += 1;
      p.stats.fireDelay *= 0.8;
      p.stats.damage *= 0.7;
    }),
    card("royalVampire", "Royal Vampire", "legendary", "Lifesteal monster.", ["55% lifesteal", "+25% damage", "-15% health"], p => {
      p.stats.lifesteal += 0.55;
      p.stats.damage *= 1.25;
      p.stats.maxHp *= 0.85;
    })
  );

  cardPool.push(
    card("steadyGrip", "Steady Grip", "common", "Simple control under pressure.", ["-spread", "+8% brake"], p => { p.stats.spread *= 0.8; p.stats.brake *= 1.08; }),
    card("brassButtons", "Brass Buttons", "common", "Reload a touch faster.", ["-12% reload"], p => { p.stats.reload *= 0.88; }),
    card("tinBoots", "Tin Boots", "common", "Small body, quick stops.", ["-6% size", "+16% brake"], p => { p.stats.radius *= 0.94; p.stats.brake *= 1.16; }),
    card("warmPocket", "Warm Pocket", "common", "One safer extra round.", ["+1 ammo", "+10% health"], p => { p.stats.maxAmmo += 1; p.stats.maxHp *= 1.1; }),
    card("shortFuse", "Short Fuse", "common", "Faster shooting at a cost.", ["-14% fire delay", "+0.08s reload"], p => { p.stats.fireDelay *= 0.86; p.stats.reload += 0.08; }),
    card("highSocks", "High Socks", "common", "A little jump and speed.", ["+8% jump", "+8% speed"], p => { p.stats.jump *= 1.08; p.stats.speed *= 1.08; }),
    card("flatStone", "Flat Stone", "common", "Shots skim faster.", ["+16% bullet speed"], p => { p.stats.bulletSpeed *= 1.16; }),
    card("softHands", "Soft Hands", "common", "Gentler recoil and more reload.", ["-10% damage", "-20% fire delay"], p => { p.stats.damage *= 0.9; p.stats.fireDelay *= 0.8; }),
    card("hardCandy", "Hard Candy", "common", "Thicker health with slower jump.", ["+20% health", "-6% jump"], p => { p.stats.maxHp *= 1.2; p.stats.jump *= 0.94; }),
    card("sideStep", "Side Step", "common", "Better air drift.", ["+24% air control"], p => { p.stats.airAccel *= 1.24; }),

    card("angleTax", "Angle Tax", "uncommon", "Bounces pay back in damage.", ["+2 bounces", "+8% damage"], p => { p.stats.bounces += 2; p.stats.damage *= 1.08; }),
    card("blueSpark", "Blue Spark", "uncommon", "Quick homing pinshots.", ["homing", "+12% fire rate", "-15% damage"], p => { p.stats.homing += 0.6; p.stats.fireDelay *= 0.88; p.stats.damage *= 0.85; }),
    card("foamStep", "Foam Step", "uncommon", "Jump more, land softer.", ["+1 air jump", "+20% brake"], p => { p.stats.extraJumps += 1; p.stats.brake *= 1.2; }),
    card("coalPocket", "Coal Pocket", "uncommon", "Small blasts and big magazines.", ["+2 ammo", "small explosion"], p => { p.stats.maxAmmo += 2; p.stats.explosive += 0.45; }),
    card("glassNail", "Glass Nail", "uncommon", "Sharp damage, frail frame.", ["+30% damage", "-18% health"], p => { p.stats.damage *= 1.3; p.stats.maxHp *= 0.82; }),
    card("roundTrip", "Round Trip", "uncommon", "Ricochet faster after reloads.", ["+1 bounce", "-15% reload"], p => { p.stats.bounces += 1; p.stats.reload *= 0.85; }),
    card("fuseRibbon", "Fuse Ribbon", "uncommon", "Better explosions, worse ammo.", ["explosion", "-1 ammo"], p => { p.stats.explosive += 0.8; p.stats.maxAmmo = Math.max(1, p.stats.maxAmmo - 1); }),
    card("sourRain", "Sour Rain", "uncommon", "Poison pellets.", ["poison", "+1 pellet", "-20% damage"], p => { p.stats.poison += 1; p.stats.pellets += 1; p.stats.damage *= 0.8; }),
    card("shieldSprings", "Shield Springs", "uncommon", "Block recharge and jump improve.", ["-16% cooldown", "+10% jump"], p => { p.stats.blockCooldown *= 0.84; p.stats.jump *= 1.1; }),
    card("thinOrbit", "Thin Orbit", "uncommon", "More pellets with tight spread.", ["+2 pellets", "-30% damage"], p => { p.stats.pellets += 2; p.stats.damage *= 0.7; p.stats.spread += 0.04; }),

    card("redLedger", "Red Ledger", "rare", "Damage grows as health drops.", ["+30% damage", "+20% health"], p => { p.stats.damage *= 1.3; p.stats.maxHp *= 1.2; }),
    card("ghostRounds", "Ghost Rounds", "rare", "Fast homing pressure.", ["homing", "+28% bullet speed"], p => { p.stats.homing += 0.9; p.stats.bulletSpeed *= 1.28; }),
    card("emberBoots", "Ember Boots", "rare", "Explosive mobility.", ["+2 air jumps", "explosion"], p => { p.stats.extraJumps += 2; p.stats.explosive += 0.7; }),
    card("silverFoam", "Silver Foam", "rare", "Huge block zones.", ["block push", "+0.15s block"], p => { p.stats.blockPush += 1; p.stats.blockDuration += 0.15; }),
    card("nightNeedles", "Night Needles", "rare", "Lots of fast accurate shots.", ["+3 pellets", "+20% speed", "-45% damage"], p => { p.stats.pellets += 3; p.stats.bulletSpeed *= 1.2; p.stats.damage *= 0.55; }),
    card("plasmaTabs", "Plasma Tabs", "rare", "Explosive lifesteal.", ["explosion", "18% lifesteal"], p => { p.stats.explosive += 1; p.stats.lifesteal += 0.18; }),
    card("orbitDebt", "Orbit Debt", "rare", "Chaos that pays off late.", ["+3 bounces", "distance damage"], p => { p.stats.bounces += 3; p.stats.grow += 1; }),
    card("paperCrown", "Paper Crown", "rare", "Fast and fragile royalty.", ["+35% speed", "-22% health", "-18% fire delay"], p => { p.stats.speed *= 1.35; p.stats.maxHp *= 0.78; p.stats.fireDelay *= 0.82; }),
    card("ironPalm", "Iron Palm", "rare", "Blocks shove and heal.", ["block push", "+35% health"], p => { p.stats.blockPush += 1; p.stats.maxHp *= 1.35; }),
    card("revivalInk", "Revival Ink", "rare", "A second chance with poison.", ["one revive", "poison"], p => { p.stats.revives += 1; p.stats.poison += 1; }),

    card("voidReceipt", "Void Receipt", "epic", "Homing ricochets with lifesteal.", ["homing", "+2 bounces", "20% lifesteal"], p => { p.stats.homing += 1; p.stats.bounces += 2; p.stats.lifesteal += 0.2; }),
    card("solarChoir", "Solar Choir", "epic", "Explosive multi-shot burst.", ["+2 pellets", "explosion", "-25% damage"], p => { p.stats.pellets += 2; p.stats.explosive += 1; p.stats.damage *= 0.75; }),
    card("blinkMarket", "Blink Market", "epic", "Dash blocks and high speed.", ["block dash", "+24% speed"], p => { p.stats.blockDash += 1; p.stats.speed *= 1.24; }),
    card("stormStamp", "Storm Stamp", "epic", "Fast guided explosive shots.", ["homing", "explosion", "+20% bullet speed"], p => { p.stats.homing += 0.8; p.stats.explosive += 0.8; p.stats.bulletSpeed *= 1.2; }),
    card("crownBattery", "Crown Battery", "epic", "Defensive recharge engine.", ["double echo", "-28% cooldown"], p => { p.stats.echoBlock += 2; p.stats.blockCooldown *= 0.72; }),
    card("marbleGiant", "Marble Giant", "epic", "Big body, huge health.", ["+120% health", "+18% size", "-16% speed"], p => { p.stats.maxHp *= 2.2; p.stats.radius *= 1.18; p.stats.speed *= 0.84; }),
    card("starNeedle", "Star Needle", "epic", "High velocity distance scaling.", ["+55% bullet speed", "distance damage"], p => { p.stats.bulletSpeed *= 1.55; p.stats.grow += 1; }),
    card("echoJacket", "Echo Jacket", "epic", "Every block becomes a show.", ["echo block", "block push", "+0.1s block"], p => { p.stats.echoBlock += 1; p.stats.blockPush += 1; p.stats.blockDuration += 0.1; }),
    card("rocketPocket", "Rocket Pocket", "epic", "Explosive magazine build.", ["+4 ammo", "explosion", "+0.2s reload"], p => { p.stats.maxAmmo += 4; p.stats.explosive += 1; p.stats.reload += 0.2; }),
    card("moonLedger", "Moon Ledger", "epic", "Airborne reload monster.", ["+2 air jumps", "-22% reload"], p => { p.stats.extraJumps += 2; p.stats.reload *= 0.78; }),

    card("chronoTrigger", "Chrono Trigger", "legendary", "Time-bent fire rate.", ["-45% fire delay", "+35% bullet speed"], p => { p.stats.fireDelay *= 0.55; p.stats.bulletSpeed *= 1.35; }),
    card("novaCrown", "Nova Crown", "legendary", "Royal explosions.", ["huge explosion", "+3 ammo"], p => { p.stats.explosive += 2.2; p.stats.maxAmmo += 3; }),
    card("blackGlass", "Black Glass", "legendary", "Terrifying homing glass cannon.", ["strong homing", "+70% damage", "-30% health"], p => { p.stats.homing += 2.2; p.stats.damage *= 1.7; p.stats.maxHp *= 0.7; }),
    card("angelDebt", "Angel Debt", "legendary", "Revive into chaos.", ["+2 revives", "explosion", "+25% speed"], p => { p.stats.revives += 2; p.stats.explosive += 1; p.stats.speed *= 1.25; }),
    card("infinitePocket", "Infinite Pocket", "legendary", "Ridiculous ammo economy.", ["+8 ammo", "-35% reload"], p => { p.stats.maxAmmo += 8; p.stats.reload *= 0.65; }),
    card("stormCoffin", "Storm Coffin", "legendary", "Poison explosive tracking.", ["poison", "strong homing", "explosion"], p => { p.stats.poison += 1; p.stats.homing += 1.7; p.stats.explosive += 1.2; }),
    card("titanStep", "Titan Step", "legendary", "Huge movement and health.", ["+80% health", "+30% jump", "+1 air jump"], p => { p.stats.maxHp *= 1.8; p.stats.jump *= 1.3; p.stats.extraJumps += 1; }),
    card("mirrorKing", "Mirror King", "legendary", "Block kingdom.", ["triple echo", "block push", "+0.12s block"], p => { p.stats.echoBlock += 3; p.stats.blockPush += 1; p.stats.blockDuration += 0.12; }),
    card("sunEater", "Sun Eater", "legendary", "Massive slow shots.", ["+120% damage", "big explosion", "+0.5s reload"], p => { p.stats.damage *= 2.2; p.stats.explosive += 2; p.stats.reload += 0.5; }),
    card("royalOrbit", "Royal Orbit", "legendary", "Bouncing lifesteal storm.", ["+5 bounces", "40% lifesteal", "+1 pellet"], p => { p.stats.bounces += 5; p.stats.lifesteal += 0.4; p.stats.pellets += 1; p.stats.damage *= 0.85; })
  );

  cardPool.push(
    mythic("hollowViolet", "Hollow Violet", "A collapsing violet blast erases the center lane.", ["G/LB: void beam", "12s cooldown"], "hollowViolet", p => { p.stats.damage *= 1.15; }),
    mythic("greenGiant", "Green Giant", "Turn huge, furious, and very hard to stop.", ["G/LB: giant form", "10s cooldown"], "greenGiant", p => { p.stats.maxHp *= 1.25; }),
    mythic("pocketDomain", "Pocket Domain", "Trap rivals in a shrinking pressure sphere.", ["G/LB: domain field", "13s cooldown"], "pocketDomain", p => { p.stats.blockCooldown *= 0.9; }),
    mythic("starSword", "Star Sword", "A glowing blade wave cuts across the arena.", ["G/LB: blade wave", "9s cooldown"], "starSword", p => { p.stats.speed *= 1.12; }),
    mythic("webSwing", "Web Swing", "Launch a sticky pull and yank yourself forward.", ["G/LB: web dash", "7s cooldown"], "webSwing", p => { p.stats.airAccel *= 1.25; }),
    mythic("speedForce", "Speed Force", "Blink through space and leave sparks behind.", ["G/LB: lightning blink", "8s cooldown"], "speedForce", p => { p.stats.speed *= 1.18; }),
    mythic("wizardPortal", "Wizard Portal", "Open a portal and throw a ring burst.", ["G/LB: portal burst", "10s cooldown"], "wizardPortal", p => { p.stats.extraJumps += 1; }),
    mythic("iceQueen", "Ice Queen", "Freeze the floor and slow everyone nearby.", ["G/LB: ice field", "11s cooldown"], "iceQueen", p => { p.stats.blockDuration += 0.06; }),
    mythic("shadowClone", "Shadow Clone", "Split into afterimages that fire decoy rounds.", ["G/LB: clone volley", "10s cooldown"], "shadowClone", p => { p.stats.pellets += 1; p.stats.damage *= 0.9; }),
    mythic("kaijuRoar", "Kaiju Roar", "Roar a shockwave that shoves the whole map.", ["G/LB: arena roar", "12s cooldown"], "kaijuRoar", p => { p.stats.maxHp *= 1.18; }),
    mythic("dragonBreath", "Dragon Breath", "Breathe a fan of burning shots.", ["G/LB: fire cone", "9s cooldown"], "dragonBreath", p => { p.stats.poison += 1; }),
    mythic("laserGauntlet", "Laser Gauntlet", "Snap a bright beam from a jeweled glove.", ["G/LB: gauntlet laser", "11s cooldown"], "laserGauntlet", p => { p.stats.bulletSpeed *= 1.12; }),
    mythic("moonKnight", "Moon Knight", "Summon crescent blades that arc outward.", ["G/LB: crescent storm", "9s cooldown"], "moonKnight", p => { p.stats.bounces += 1; }),
    mythic("timeLoop", "Time Loop", "Rewind your position and recover health.", ["G/LB: rewind", "14s cooldown"], "timeLoop", p => { p.stats.revives += 1; }),
    mythic("mechaSuit", "Mecha Suit", "Call missile armor for a heavy volley.", ["G/LB: missile rain", "12s cooldown"], "mechaSuit", p => { p.stats.explosive += 0.8; p.stats.maxHp *= 1.12; })
  );

  const bonusNames = [
    "Copper Pin", "Lime Battery", "Paper Orbit", "Velvet Fuse", "Pocket Comet", "Tilted Crown", "Rust Ribbon", "Glass Engine", "Salt Lantern", "Frost Ticket",
    "Amber Gear", "Cloud Needle", "Tin Halo", "Silver Button", "Jolt Marble", "Cinder Bell", "Neon Receipt", "Quiet Rocket", "Blue Latch", "Honey Circuit",
    "Static Page", "Red Compass", "Moon Washer", "Lucky Rivet", "Violet Handle", "Bright Anchor", "Soft Meteor", "Iron Button", "Sour Compass", "Golden Washer",
    "Prism Ticket", "Storm Pocket", "Thin Battery", "Royal Fuse", "Echo Lantern", "Chrome Bell", "Black Ribbon", "Solar Pin", "Ghost Engine", "Heavy Halo",
    "Snap Crown", "Float Gear", "Dense Circuit", "Wild Marble", "Clean Rocket", "Hot Receipt", "Round Anchor", "Needle Button", "Flash Latch", "Coal Ticket",
    "Marble Needle", "Orbit Spark", "Copper Cloud", "Lime Comet", "Paper Battery", "Velvet Rocket", "Pocket Crown", "Tilted Fuse", "Rust Engine", "Glass Lantern",
    "Salt Halo", "Frost Button", "Amber Receipt", "Cloud Bell", "Tin Anchor", "Silver Circuit", "Jolt Gear", "Cinder Washer", "Neon Pin", "Quiet Compass",
    "Blue Ribbon", "Honey Ticket", "Static Meteor", "Red Latch", "Moon Engine", "Lucky Halo", "Violet Fuse", "Bright Battery", "Soft Crown", "Iron Rocket",
    "Sour Lantern", "Golden Button", "Prism Gear", "Storm Receipt", "Thin Anchor", "Royal Needle", "Echo Circuit", "Chrome Pin", "Black Comet", "Solar Washer",
    "Ghost Ticket", "Heavy Ribbon", "Snap Battery", "Float Fuse", "Dense Bell", "Wild Engine", "Clean Halo", "Hot Crown", "Round Rocket", "Needle Compass"
  ];

  const bonusRarities = ["common", "uncommon", "rare", "epic", "legendary"];
  const bonusEffects = [
    p => { p.stats.speed *= 1.1; },
    p => { p.stats.maxHp *= 1.14; },
    p => { p.stats.damage *= 1.12; },
    p => { p.stats.reload *= 0.9; },
    p => { p.stats.fireDelay *= 0.9; },
    p => { p.stats.bulletSpeed *= 1.14; },
    p => { p.stats.maxAmmo += 1; },
    p => { p.stats.jump *= 1.12; },
    p => { p.stats.airAccel *= 1.18; },
    p => { p.stats.blockCooldown *= 0.9; },
    p => { p.stats.bounces += 1; },
    p => { p.stats.pellets += 1; p.stats.damage *= 0.86; p.stats.spread += 0.035; },
    p => { p.stats.explosive += 0.35; },
    p => { p.stats.homing += 0.35; },
    p => { p.stats.poison += 0.5; },
    p => { p.stats.lifesteal += 0.08; },
    p => { p.stats.extraJumps += 1; p.stats.speed *= 0.96; },
    p => { p.stats.blockDuration += 0.04; },
    p => { p.stats.grow += 0.5; },
    p => { p.stats.radius *= 0.94; p.stats.maxHp *= 0.95; }
  ];

  bonusNames.forEach((name, i) => {
    const rarity = bonusRarities[Math.floor(i / 20)];
    const power = rarity === "legendary" ? 1.85 : rarity === "epic" ? 1.55 : rarity === "rare" ? 1.32 : rarity === "uncommon" ? 1.16 : 1;
    cardPool.push(card(
      `bonus${i}`,
      name,
      rarity,
      "A fresh arena modifier that tilts your build in a new direction.",
      bonusStats(i, rarity),
      p => {
        const before = { ...p.stats };
        bonusEffects[i % bonusEffects.length](p);
        scaleBonusEffect(p, before, power);
      }
    ));
  });

  function rect(x, y, w, h) {
    return { x, y, w, h };
  }

  function card(id, name, rarity, description, stats, apply) {
    return { id, name, rarity, description, stats, apply };
  }

  function mythic(id, name, description, stats, mythicId, apply) {
    return card(id, name, "mythical", description, stats, p => {
      p.stats.mythic = mythicId;
      p.stats.mythicCooldown = mythicCooldown(mythicId);
      apply(p);
    });
  }

  function mythicCooldown(id) {
    const times = {
      webSwing: 7,
      speedForce: 8,
      starSword: 9,
      dragonBreath: 9,
      moonKnight: 9,
      greenGiant: 10,
      wizardPortal: 10,
      shadowClone: 10,
      iceQueen: 11,
      laserGauntlet: 11,
      hollowViolet: 12,
      kaijuRoar: 12,
      mechaSuit: 12,
      pocketDomain: 13,
      timeLoop: 14
    };
    return times[id] || 10;
  }

  function bonusStats(index, rarity) {
    const pools = [
      ["+speed", "+control"],
      ["+health", "+stability"],
      ["+damage", "+recoil"],
      ["-reload", "+tempo"],
      ["-fire delay", "+pressure"],
      ["+bullet speed", "+range"],
      ["+ammo", "+reload"],
      ["+jump", "+air"],
      ["+air control", "+drift"],
      ["-block cooldown", "+defense"],
      ["+bounce", "+angles"],
      ["+pellet", "+spread"],
      ["small explosion", "+pressure"],
      ["light homing", "+tracking"],
      ["poison", "+chip"],
      ["lifesteal", "+sustain"],
      ["+air jump", "-speed"],
      ["+block time", "+defense"],
      ["distance damage", "+range"],
      ["smaller body", "-health"]
    ];
    const tier = rarity === "legendary" ? "huge" : rarity === "epic" ? "major" : rarity === "rare" ? "strong" : rarity === "uncommon" ? "solid" : "small";
    return [tier, ...pools[index % pools.length]];
  }

  function scaleBonusEffect(player, before, power) {
    for (const key of Object.keys(player.stats)) {
      if (typeof player.stats[key] !== "number" || typeof before[key] !== "number") continue;
      player.stats[key] = before[key] + (player.stats[key] - before[key]) * power;
    }
    player.stats.maxAmmo = Math.max(1, Math.round(player.stats.maxAmmo));
    player.stats.pellets = Math.max(1, Math.round(player.stats.pellets));
    player.stats.bounces = Math.max(0, Math.round(player.stats.bounces));
    player.stats.extraJumps = Math.max(0, Math.round(player.stats.extraJumps));
    player.stats.revives = Math.max(0, Math.round(player.stats.revives));
  }

  function defaultStats() {
    return {
      maxHp: 100,
      speed: 560,
      accel: 12,
      airAccel: 5.2,
      brake: 10,
      jump: 880,
      damage: 44,
      bulletSpeed: 980,
      bulletGravity: 1300,
      bulletDrag: 0.997,
      bulletRestitution: 0.72,
      maxAmmo: 3,
      reload: 1.12,
      fireDelay: 0.26,
      blockCooldown: 1.55,
      blockDuration: 0.25,
      radius: 27,
      pellets: 1,
      spread: 0.04,
      bounces: 0,
      explosive: 0,
      homing: 0,
      poison: 0,
      lifesteal: 0,
      echoBlock: 0,
      blockPush: 0,
      blockDash: 0,
      emptyBlock: false,
      revives: 0,
      grow: 0,
      extraJumps: 0,
      mythic: null,
      mythicCooldown: 9,
      mythicDuration: 0
    };
  }

  function makePlayer(i) {
    const sp = spawnPoints[i];
    return {
      id: i,
      name: `P${i + 1}`,
      color: colors[i],
      x: sp.x,
      y: sp.y,
      renderX: sp.x,
      renderY: sp.y,
      vx: 0,
      vy: 0,
      aimX: i % 2 === 0 ? 1 : -1,
      aimY: 0,
      hp: 100,
      score: 0,
      alive: true,
      grounded: false,
      jumpReady: true,
      jumpsLeft: 1,
      ammo: 3,
      reloadTimer: 0,
      fireTimer: 0,
      blockTimer: 0,
      blockCooldown: 0,
      mythicCooldown: 0,
      mythicTimer: 0,
      poisonTimer: 0,
      poisonDps: 0,
      roundRevives: 0,
      cards: [],
      stats: defaultStats(),
      input: emptyInput(),
      scheme: keyboardSchemes[i] || null,
      gamepadIndex: null,
      bot: false,
      botSeed: Math.random() * 1000,
      botJumpLock: 0,
      botStrafe: Math.random() < 0.5 ? -1 : 1,
      draftStickLock: false,
      spawnGrace: 0.9,
      faceBlink: Math.random() * 4
    };
  }

  function makePlayerFromSlot(slot, index) {
    const p = makePlayer(index);
    p.scheme = slot.type === "keyboard" ? keyboardSchemes[index] || null : null;
    p.gamepadIndex = slot.type === "pad" ? slot.gamepadIndex : null;
    p.bot = slot.type === "bot";
    if (p.bot) {
      p.name = `Bot ${index + 1}`;
      p.scheme = null;
      p.gamepadIndex = null;
    }
    return p;
  }

  function getSafeSpawn(map, index, player) {
    const fallback = spawnPoints[index] || spawnPoints[0] || { x: 300 + index * 220, y: 600 };
    const r = player.stats.radius;
    const platforms = map.platforms && map.platforms.length ? map.platforms : [rect(0, 830, 1600, 70)];
    const candidates = platforms
      .filter(platform => fallback.x >= platform.x - r && fallback.x <= platform.x + platform.w + r)
      .filter(platform => !isHazardUnderSpawn(map, fallback.x, platform.y))
      .sort((a, b) => {
        const aFloor = a.y > world.height - 100 ? 1 : 0;
        const bFloor = b.y > world.height - 100 ? 1 : 0;
        if (aFloor !== bFloor) return aFloor - bFloor;
        return Math.abs(a.y - fallback.y) - Math.abs(b.y - fallback.y);
      });
    const platform = candidates[0] || platforms.find(p => p.w > r * 4) || platforms[0];
    const minX = platform.x + r + 12;
    const maxX = platform.x + platform.w - r - 12;
    const x = minX <= maxX ? clamp(fallback.x, minX, maxX) : platform.x + platform.w / 2;
    const y = platform.y - r - 12;
    return {
      x: Number.isFinite(x) ? x : fallback.x,
      y: Number.isFinite(y) ? y : fallback.y
    };
  }

  function repairBadSpawn(p, index) {
    if (!Number.isFinite(p.vx)) p.vx = 0;
    if (!Number.isFinite(p.vy)) p.vy = 0;
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || (p.x === 0 && p.y === 0)) {
      const safe = getSafeSpawn(maps[world.mapIndex], index, p);
      p.x = safe.x;
      p.y = safe.y;
      p.renderX = safe.x;
      p.renderY = safe.y;
      p.vx = 0;
      p.vy = 0;
      p.spawnGrace = Math.max(p.spawnGrace, 1.2);
    }
  }

  function isHazardUnderSpawn(map, x, platformY) {
    return settings.hazards && map.hazards.some(h => x >= h.x - 35 && x <= h.x + h.w + 35 && Math.abs(h.y - platformY) < 40);
  }

  function emptyInput() {
    return {
      move: 0,
      aimX: 0,
      aimY: 0,
      jump: false,
      shoot: false,
      block: false,
      pause: false,
      jumpPressed: false,
      shootPressed: false,
      blockPressed: false,
      pausePressed: false,
      menuPressed: false,
      leftPressed: false,
      rightPressed: false,
      downPressed: false
    };
  }

  function loadLocalClientId() {
    const key = "rounder-online-client-id";
    try {
      const existing = localStorage.getItem(key);
      if (existing) return existing;
      const created = crypto.randomUUID ? crypto.randomUUID() : `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem(key, created);
      return created;
    } catch {
      return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
  }

  async function ensureInstant() {
    if (online.db) return online.db;
    if (!window.instant) {
      showToast("InstantDB is still loading. Try again in a second.");
      throw new Error("InstantDB global was not loaded");
    }
    const { init, id } = window.instant;
    online.id = id;
    online.db = init({ appId: INSTANT_APP_ID });
    online.db.subscribeConnectionStatus?.(status => {
      online.connected = status === "authenticated";
      renderOnlineGames();
    });
    watchOnlineGames();
    return online.db;
  }

  function watchOnlineGames() {
    if (!online.db || online.unsubGames) return;
    online.unsubGames = online.db.subscribeQuery({ rounderGames: {} }, resp => {
      if (resp.error) {
        showToast(`Online error: ${resp.error.message}`);
        return;
      }
      online.games = (resp.data && resp.data.rounderGames ? resp.data.rounderGames : [])
        .filter(g => g.status === "open" || g.status === "playing")
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      syncOnlineGameFromDb();
      renderOnlineGames();
    });
  }

  async function createOnlineGame() {
    try {
      const db = await ensureInstant();
      leaveOnlineGame(false);
      const gameId = online.id();
      online.active = false;
      online.role = "host";
      online.gameId = gameId;
      online.hostId = online.localId;
      online.guestId = null;
      online.hostStarted = false;
      await db.transact(db.tx.rounderGames[gameId].update({
        name: `Rounder ${online.localId.slice(0, 4).toUpperCase()}`,
        hostId: online.localId,
        guestId: "",
        status: "open",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        settings: JSON.stringify({ scoreLimit: settings.scoreLimit }),
        input: "",
        draftPick: "",
        snapshot: ""
      }));
      showToast("Online game created. Waiting for another player.");
    } catch (error) {
      showToast(`Could not create online game: ${error.message}`);
    }
  }

  async function joinOnlineGame(gameId) {
    try {
      const db = await ensureInstant();
      const game = online.games.find(g => g.id === gameId);
      if (!game || game.hostId === online.localId) return;
      leaveOnlineGame(false);
      online.active = true;
      online.role = "guest";
      online.gameId = gameId;
      online.hostId = game.hostId;
      online.guestId = online.localId;
      online.hostStarted = true;
      players = [makePlayer(0), makePlayer(1)];
      players[0].name = "Host";
      players[1].name = "You";
      players[1].scheme = keyboardSchemes[0];
      world.state = "playing";
      world.nextMap = 0;
      menu.classList.add("hidden");
      settingsPanel.classList.add("hidden");
      howPanel.classList.add("hidden");
      pausePanel.classList.add("hidden");
      draftPanel.classList.add("hidden");
      battleSplash.classList.add("hidden");
      ensureAudio();
      startMusic();
      await db.transact(db.tx.rounderGames[gameId].update({
        guestId: online.localId,
        status: "playing",
        updatedAt: Date.now()
      }));
      showToast("Joined online game");
    } catch (error) {
      showToast(`Could not join online game: ${error.message}`);
    }
  }

  function syncOnlineGameFromDb() {
    if (!online.gameId) return;
    const game = online.games.find(g => g.id === online.gameId);
    if (!game) return;
    if (online.role === "host" && game.guestId && !online.hostStarted) {
      online.guestId = game.guestId;
      startOnlineHostGame(game);
    }
    if (online.role === "host" && game.input) {
      try {
        const packet = JSON.parse(game.input);
        if (packet.clientId === online.guestId) online.remoteInput = sanitizeInput(packet.input);
      } catch {}
    }
    if (online.role === "host" && game.draftPick) {
      try {
        const packet = JSON.parse(game.draftPick);
        if (packet.clientId === online.guestId) handleOnlineDraftPick(packet);
      } catch {}
    }
    if (online.role === "guest" && game.snapshot) {
      try {
        applyOnlineSnapshot(JSON.parse(game.snapshot));
      } catch {}
    }
  }

  function startOnlineHostGame(game) {
    online.active = true;
    online.hostStarted = true;
    online.guestId = game.guestId;
    players = [makePlayer(0), makePlayer(1)];
    players[0].name = "You";
    players[1].name = "Guest";
    players[1].scheme = null;
    rebuildGamepadSlots();
    world.state = "playing";
    world.winner = null;
    world.roundWinner = null;
    world.pendingDraftPlayer = null;
    world.draftQueue = [];
    world.draftPlayer = null;
    world.nextMap = 0;
    world.menuIndex = 0;
    menu.classList.add("hidden");
    settingsPanel.classList.add("hidden");
    howPanel.classList.add("hidden");
    draftPanel.classList.add("hidden");
    battleSplash.classList.add("hidden");
    pausePanel.classList.add("hidden");
    ensureAudio();
    startMusic();
    resetRound(true);
    showToast("Online opponent joined");
  }

  function leaveOnlineGame(updateDb = true) {
    if (updateDb && online.db && online.gameId && online.role === "host") {
      online.db.transact(online.db.tx.rounderGames[online.gameId].update({
        status: "closed",
        updatedAt: Date.now()
      })).catch(() => {});
    }
    online.active = false;
    online.role = null;
    online.gameId = null;
    online.hostId = null;
    online.guestId = null;
    online.hostStarted = false;
    online.remoteInput = emptyInput();
    online.lastLocalInput = emptyInput();
    online.lastDraftPickSent = -1;
    online.lastRemoteDraftPick = "";
  }

  function captureLocalInput(prev = online.lastLocalInput) {
    const input = emptyInput();
    readKeyboard(keyboardSchemes[0], input);
    const pads = getPads();
    const preferred = lobbySlots[0] && lobbySlots[0].type === "pad" ? getPadByIndex(pads, lobbySlots[0].gamepadIndex) : null;
    const pad = preferred || pads[0];
    if (pad) readGamepad(pad, input);
    input.jumpPressed = input.jump && !prev.jump;
    input.shootPressed = input.shoot && !prev.shoot;
    input.blockPressed = input.block && !prev.block;
    input.pausePressed = input.pause && !prev.pause;
    return input;
  }

  function sanitizeInput(input) {
    const clean = emptyInput();
    if (!input) return clean;
    clean.move = clamp(Number(input.move) || 0, -1, 1);
    clean.aimX = clamp(Number(input.aimX) || 0, -1, 1);
    clean.aimY = clamp(Number(input.aimY) || 0, -1, 1);
    for (const key of ["jump", "shoot", "block", "pause", "jumpPressed", "shootPressed", "blockPressed", "pausePressed", "menuPressed", "leftPressed", "rightPressed", "downPressed"]) {
      clean[key] = Boolean(input[key]);
    }
    return clean;
  }

  function updateOnlineGuestInput() {
    if (!online.active || online.role !== "guest" || !online.db || !online.gameId) return;
    const input = captureLocalInput(online.lastLocalInput);
    online.lastLocalInput = input;
    if (players[1]) players[1].input = input;
    const now = performance.now();
    if (now - online.lastInputSent < 40) return;
    online.lastInputSent = now;
    online.db.transact(online.db.tx.rounderGames[online.gameId].update({
      input: JSON.stringify({ clientId: online.localId, t: Date.now(), input: compactInput(input) }),
      updatedAt: Date.now()
    })).catch(error => showToast(`Input sync failed: ${error.message}`));
  }

  function compactInput(input) {
    return {
      move: input.move,
      aimX: input.aimX,
      aimY: input.aimY,
      jump: input.jump,
      shoot: input.shoot,
      block: input.block,
      pause: input.pause,
      jumpPressed: input.jumpPressed,
      shootPressed: input.shootPressed,
      blockPressed: input.blockPressed,
      pausePressed: input.pausePressed,
      menuPressed: input.menuPressed,
      leftPressed: input.leftPressed,
      rightPressed: input.rightPressed,
      downPressed: input.downPressed
    };
  }

  function sendOnlineDraftPick(index) {
    if (!online.active || online.role !== "guest" || !online.db || !online.gameId) return;
    if (online.lastDraftPickSent === index) return;
    online.lastDraftPickSent = index;
    online.db.transact(online.db.tx.rounderGames[online.gameId].update({
      draftPick: JSON.stringify({ clientId: online.localId, t: Date.now(), index }),
      updatedAt: Date.now()
    })).catch(error => showToast(`Draft sync failed: ${error.message}`));
  }

  function handleOnlineDraftPick(packet) {
    const key = `${packet.t}:${packet.index}`;
    if (online.lastRemoteDraftPick === key) return;
    if (world.state !== "draft" || !world.draftPlayer || world.draftPlayer.id !== 1) return;
    online.lastRemoteDraftPick = key;
    world.draftIndex = clamp(Number(packet.index) || 0, 0, world.draftOptions.length - 1);
    pickDraft();
  }

  function publishOnlineSnapshot(force = false) {
    if (!online.active || online.role !== "host" || !online.db || !online.gameId) return;
    const now = performance.now();
    if (!force && now - online.lastSnapshotSent < 55) return;
    online.lastSnapshotSent = now;
    online.db.transact(online.db.tx.rounderGames[online.gameId].update({
      status: world.state === "ended" ? "ended" : "playing",
      snapshot: JSON.stringify(makeOnlineSnapshot()),
      updatedAt: Date.now()
    })).catch(() => {});
  }

  function makeOnlineSnapshot() {
    return {
      state: world.state,
      mapIndex: world.mapIndex,
      nextMap: world.nextMap,
      roundFreeze: world.roundFreeze,
      winnerId: world.winner ? world.winner.id : null,
      roundWinnerId: world.roundWinner ? world.roundWinner.id : null,
      pendingDraftPlayerId: world.pendingDraftPlayer ? world.pendingDraftPlayer.id : null,
      draftPlayerId: world.draftPlayer ? world.draftPlayer.id : null,
      draftIndex: world.draftIndex,
      draftOptions: world.draftOptions.map(c => c.id),
      players: players.map(p => ({
        id: p.id,
        name: p.name,
        color: p.color,
        x: p.x,
        y: p.y,
        renderX: p.renderX,
        renderY: p.renderY,
        vx: p.vx,
        vy: p.vy,
        aimX: p.aimX,
        aimY: p.aimY,
        hp: p.hp,
        score: p.score,
        alive: p.alive,
        grounded: p.grounded,
        ammo: p.ammo,
        blockTimer: p.blockTimer,
        mythicCooldown: p.mythicCooldown,
        mythicTimer: p.mythicTimer,
        spawnGrace: p.spawnGrace,
        faceBlink: p.faceBlink,
        stats: { maxHp: p.stats.maxHp, maxAmmo: p.stats.maxAmmo, radius: p.stats.radius, mythic: p.stats.mythic, mythicCooldown: p.stats.mythicCooldown },
        cards: p.cards.map(c => c.name)
      })),
      bullets: bullets.map(b => ({ ...b, ownerId: b.owner ? b.owner.id : null, owner: undefined })),
      fields: fields.map(f => ({ ...f, ownerId: f.owner ? f.owner.id : null, owner: undefined }))
    };
  }

  function applyOnlineSnapshot(snapshot) {
    online.lastSnapshotAt = performance.now();
    world.state = snapshot.state || "playing";
    world.mapIndex = snapshot.mapIndex || 0;
    world.nextMap = snapshot.nextMap || 0;
    world.roundFreeze = snapshot.roundFreeze || 0;
    players = (snapshot.players || []).map((sp, i) => {
      const p = players[i] || makePlayer(i);
      Object.assign(p, sp);
      p.stats = { ...defaultStats(), ...(sp.stats || {}) };
      p.cards = (sp.cards || []).map(name => ({ name }));
      p.input = i === 1 ? online.lastLocalInput : emptyInput();
      return p;
    });
    world.winner = snapshot.winnerId === null || snapshot.winnerId === undefined ? null : players.find(p => p.id === snapshot.winnerId) || null;
    world.roundWinner = snapshot.roundWinnerId === null || snapshot.roundWinnerId === undefined ? null : players.find(p => p.id === snapshot.roundWinnerId) || null;
    world.pendingDraftPlayer = snapshot.pendingDraftPlayerId === null || snapshot.pendingDraftPlayerId === undefined ? null : players.find(p => p.id === snapshot.pendingDraftPlayerId) || null;
    world.draftPlayer = snapshot.draftPlayerId === null || snapshot.draftPlayerId === undefined ? null : players.find(p => p.id === snapshot.draftPlayerId) || null;
    world.draftIndex = snapshot.draftIndex || 0;
    world.draftOptions = (snapshot.draftOptions || []).map(id => cardPool.find(c => c.id === id)).filter(Boolean);
    bullets = (snapshot.bullets || []).map(b => ({ ...b, owner: players.find(p => p.id === b.ownerId) || null }));
    fields = (snapshot.fields || []).map(f => ({ ...f, owner: players.find(p => p.id === f.ownerId) || null }));
    menu.classList.add("hidden");
    pausePanel.classList.add("hidden");
    if (world.state === "draft" && world.draftPlayer && world.draftOptions.length) {
      renderDraftPanelFromState();
      draftPanel.classList.remove("hidden");
      battleSplash.classList.add("hidden");
    } else {
      draftPanel.classList.add("hidden");
    }
    if (world.state === "round-won" && world.roundWinner && world.pendingDraftPlayer) {
      battleKicker.textContent = "Battle won";
      battleTitle.textContent = `${world.roundWinner.name} wins`;
      battleTitle.style.color = world.roundWinner.color;
      battleSub.textContent = `${world.pendingDraftPlayer.name} drafts next`;
      battleSplash.classList.remove("hidden");
    } else if (world.state !== "round-won") {
      battleSplash.classList.add("hidden");
    }
  }

  function resetRound(fullReset = false) {
    if (fullReset) world.nextMap = 0;
    world.mapIndex = world.nextMap % maps.length;
    const map = maps[world.mapIndex];
    world.nextMap += 1;
    bullets = [];
    particles = [];
    fields = [];
    players.forEach((p, i) => {
      const sp = getSafeSpawn(map, i, p);
      p.x = sp.x;
      p.y = sp.y;
      p.renderX = sp.x;
      p.renderY = sp.y;
      p.vx = 0;
      p.vy = 0;
      p.aimX = i % 2 === 0 ? 1 : -1;
      p.aimY = 0;
      p.hp = p.stats.maxHp;
      p.alive = true;
      p.grounded = false;
      p.jumpReady = true;
      p.jumpsLeft = 1 + p.stats.extraJumps;
      p.ammo = p.stats.maxAmmo;
      p.reloadTimer = 0;
      p.fireTimer = 0;
      p.blockTimer = 0;
      p.blockCooldown = 0;
      p.mythicCooldown = 0;
      p.mythicTimer = 0;
      p.poisonTimer = 0;
      p.poisonDps = 0;
      p.roundRevives = p.stats.revives;
      p.spawnGrace = 1.6;
      repairBadSpawn(p, i);
    });
    showToast(`${map.name} arena`);
    world.roundFreeze = 0.8;
  }

  function startMatch() {
    leaveOnlineGame();
    ensureAudio();
    startMusic();
    const slots = activeMatchSlots();
    if (slots.length < 2) {
      showToast("Need 2 players. Press buttons on 2 controllers.");
      return;
    }
    players = slots.map((slot, i) => makePlayerFromSlot(slot, i));
    rebuildGamepadSlots();
    world.state = "playing";
    world.winner = null;
    world.roundWinner = null;
    world.pendingDraftPlayer = null;
    world.draftQueue = [];
    world.draftPlayer = null;
    world.nextMap = 0;
    world.menuIndex = 0;
    menu.classList.add("hidden");
    settingsPanel.classList.add("hidden");
    howPanel.classList.add("hidden");
    draftPanel.classList.add("hidden");
    battleSplash.classList.add("hidden");
    pausePanel.classList.add("hidden");
    resetRound(true);
  }

  function activeMatchSlots() {
    const slots = lobbySlots.length
      ? lobbySlots.slice(0, settings.playerCount)
      : [
          { type: "keyboard", label: "Keyboard P1" },
          ...(settings.botCount > 0 ? [] : [{ type: "keyboard", label: "Keyboard P2" }])
        ];
    const botSlots = Math.min(settings.botCount, settings.playerCount - slots.length);
    for (let i = 0; i < botSlots; i += 1) {
      slots.push({ type: "bot", label: `Bot ${i + 1}` });
    }
    if (slots.length < 2 && settings.playerCount > slots.length) {
      slots.push({ type: "keyboard", label: `Keyboard P${slots.length + 1}` });
    }
    return slots.slice(0, settings.playerCount);
  }

  function endRound(winner) {
    if (!winner) return;
    winner.score += 1;
    pulse(winner, 0.45, 180);
    burst(winner.x, winner.y, winner.color, 42, 520);
    if (winner.score >= settings.scoreLimit) {
      world.state = "ended";
      world.winner = winner;
      showToast(`${winner.name} wins. Press Start / Enter for rematch.`);
      publishOnlineSnapshot(true);
      return;
    }
    if (online.active) {
      world.draftQueue = [players.find(p => p !== winner) || winner];
      showRoundSplash(winner, world.draftQueue[0]);
      return;
    }
    world.draftQueue = players
      .filter(p => p !== winner)
      .sort((a, b) => a.score - b.score || a.id - b.id);
    showRoundSplash(winner, world.draftQueue[0]);
  }

  function showRoundSplash(winner, draftPlayer) {
    world.state = "round-won";
    world.roundWinner = winner;
    world.pendingDraftPlayer = draftPlayer;
    battleKicker.textContent = "Battle won";
    battleTitle.textContent = `${winner.name} wins`;
    battleTitle.style.color = winner.color;
    battleSub.textContent = `${draftPlayer.name} drafts next`;
    battleSplash.classList.remove("hidden");
    sfx("win");
    setTimeout(() => {
      if (world.state === "round-won") {
        if (online.active && online.role !== "host") return;
        battleSplash.classList.add("hidden");
        beginDraft(draftPlayer);
      }
    }, 1350);
    publishOnlineSnapshot(true);
  }

  function beginDraft(player) {
    world.state = "draft";
    world.draftPlayer = player;
    world.draftIndex = 0;
    world.draftOptions = drawCards(settings.draftCount);
    draftPrompt.textContent = `${player.name} drafts a counter-card`;
    renderDraftPanelFromState();
    draftPanel.classList.remove("hidden");
    pulse(player, 0.25, 90);
    publishOnlineSnapshot(true);
    if (player.bot) {
      setTimeout(() => {
        if (world.state === "draft" && world.draftPlayer === player) {
          world.draftIndex = Math.floor(Math.random() * world.draftOptions.length);
          pickDraft();
        }
      }, 650);
    }
  }

  function renderDraftPanelFromState() {
    const player = world.draftPlayer;
    draftPrompt.textContent = `${player ? player.name : "Player"} drafts a counter-card`;
    draftCards.innerHTML = "";
    world.draftOptions.forEach((c, i) => {
      const el = document.createElement("article");
      el.className = `card ${c.rarity}${i === 0 ? " selected" : ""}`;
      el.innerHTML = `
        <span class="rarity">${c.rarity}</span>
        <strong>${c.name}</strong>
        <p>${c.description}</p>
        <div class="stat-list">${c.stats.map(s => `<span>${s}</span>`).join("")}</div>
      `;
      el.dataset.cardIndex = String(i);
      el.addEventListener("pointerdown", event => {
        event.preventDefault();
        event.stopPropagation();
        world.draftIndex = i;
        renderDraftSelection();
        if (online.active && online.role === "guest") {
          sendOnlineDraftPick(i);
          return;
        }
        pickDraft();
      });
      draftCards.appendChild(el);
    });
    renderDraftSelection();
  }

  function drawCards(count) {
    const bag = [...cardPool];
    const weighted = [];
    for (const c of bag) {
      const n = Math.max(0, Math.round(settings.rarityWeights[c.rarity] ?? 1));
      for (let i = 0; i < n; i += 1) weighted.push(c);
    }
    const picked = [];
    while (picked.length < count && weighted.length) {
      const candidate = weighted[Math.floor(Math.random() * weighted.length)];
      if (!picked.includes(candidate)) picked.push(candidate);
    }
    while (picked.length < count && bag.length) {
      const candidate = bag[Math.floor(Math.random() * bag.length)];
      if (!picked.includes(candidate)) picked.push(candidate);
    }
    return picked;
  }

  function pickDraft() {
    const p = world.draftPlayer;
    const c = world.draftOptions[world.draftIndex];
    if (world.state !== "draft" || !p || !c) return;
    if (online.active && online.role === "guest") {
      sendOnlineDraftPick(world.draftIndex);
      return;
    }
    world.state = "draft-picked";
    p.cards.push(c);
    c.apply(p);
    sfx("card");
    p.hp = p.stats.maxHp;
    p.ammo = p.stats.maxAmmo;
    pulse(p, 0.55, 160);
    showToast(`${p.name} picked ${c.name}`);
    draftPanel.classList.add("hidden");
    setTimeout(() => {
      if (world.state === "draft-picked") {
        world.draftQueue = world.draftQueue.filter(next => next !== p);
        const nextDrafter = world.draftQueue[0];
        if (nextDrafter) {
          beginDraft(nextDrafter);
        } else {
          world.state = "playing";
          resetRound();
          publishOnlineSnapshot(true);
        }
      }
    }, 360);
    publishOnlineSnapshot(true);
  }

  function applyInputs(pads = getPads()) {
    if (online.active && online.role === "guest") {
      updateOnlineGuestInput();
      return;
    }
    for (const p of players) {
      const prev = p.input;
      const input = emptyInput();
      if (p.bot) {
        readBot(p, input);
      } else {
        if (p.scheme) readKeyboard(p.scheme, input);
        const pad = getPadByIndex(pads, p.gamepadIndex);
        if (pad) readGamepad(pad, input);
      }
      input.jumpPressed = input.jump && !prev.jump;
      input.shootPressed = input.shoot && !prev.shoot;
      input.blockPressed = input.block && !prev.block;
      input.pausePressed = input.pause && !prev.pause;
      p.input = input;
    }
    if (online.active && online.role === "host" && players[1]) {
      const prev = players[1].input;
      const remote = sanitizeInput(online.remoteInput);
      remote.jumpPressed = remote.jump && !prev.jump;
      remote.shootPressed = remote.shoot && !prev.shoot;
      remote.blockPressed = remote.block && !prev.block;
      remote.pausePressed = remote.pause && !prev.pause;
      players[1].input = remote;
    }
  }

  function readBot(p, input) {
    const target = nearestBotTarget(p);
    if (!target) return;
    const skill = botDifficulty();
    const dx = target.x - p.x;
    const dy = target.y - p.y;
    const distance = Math.hypot(dx, dy) || 1;
    const lead = clamp(distance / Math.max(600, p.stats.bulletSpeed), 0, 0.55);
    const wobble = (1 - skill.aim) * 260;
    const aimX = dx + target.vx * lead + Math.sin(performance.now() / 330 + p.botSeed) * wobble;
    const aimY = dy + target.vy * lead - 38 + Math.cos(performance.now() / 420 + p.botSeed) * wobble;
    const aimMag = Math.hypot(aimX, aimY) || 1;
    input.aimX = aimX / aimMag;
    input.aimY = aimY / aimMag;

    const ideal = 430 + (p.id % 2) * 80;
    if (Math.abs(dx) > ideal) input.move = Math.sign(dx);
    else if (Math.abs(dx) < 220) input.move = -Math.sign(dx || p.botStrafe);
    else input.move = Math.sin(performance.now() / 650 + p.botSeed) > 0 ? p.botStrafe : -p.botStrafe;

    if (p.x < 110) input.move = 1;
    if (p.x > world.width - 110) input.move = -1;
    p.botJumpLock = Math.max(0, p.botJumpLock - 1 / 60);
    const shouldJump = p.grounded && p.botJumpLock <= 0 && (dy < -85 || Math.random() < skill.wander || isBotWallAhead(p, input.move));
    if (shouldJump) {
      input.jump = true;
      p.botJumpLock = 0.35 + Math.random() * 0.25;
    }

    const aimDot = (dx / distance) * input.aimX + (dy / distance) * input.aimY;
    input.shoot = distance < 980 && aimDot > 0.72 && p.reloadTimer <= 0 && Math.random() < skill.shoot;
    input.block = botThreatened(p) && Math.random() < skill.block;
  }

  function nearestBotTarget(bot) {
    let best = null;
    let bestD = Infinity;
    for (const p of players) {
      if (!p.alive || p === bot) continue;
      const d = Math.hypot(p.x - bot.x, p.y - bot.y);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  function isBotWallAhead(p, move) {
    if (!move) return false;
    const r = p.stats.radius;
    const probe = { x: p.x + move * (r + 14), y: p.y, r };
    return maps[world.mapIndex].platforms.some(platform => circleRect(probe, platform));
  }

  function botThreatened(p) {
    return bullets.some(b => {
      if (b.owner === p) return false;
      const d = Math.hypot(b.x - p.x, b.y - p.y);
      if (d > 165) return false;
      const toward = ((p.x - b.x) * b.vx + (p.y - b.y) * b.vy) > 0;
      return toward || d < 75;
    });
  }

  function botDifficulty() {
    return settings.botDifficulty === 3
      ? { aim: 1.0, shoot: 0.66, block: 0.25, wander: 0.008 }
      : settings.botDifficulty === 2
        ? { aim: 0.78, shoot: 0.5, block: 0.12, wander: 0.012 }
        : { aim: 0.52, shoot: 0.3, block: 0.03, wander: 0.018 };
  }

  function botDifficultyLabel(value) {
    return Number(value) === 3 ? "Hard" : Number(value) === 2 ? "Normal" : "Easy";
  }

  function readKeyboard(scheme, input) {
    const left = keys.has(scheme.left);
    const right = keys.has(scheme.right);
    input.move += (right ? 1 : 0) - (left ? 1 : 0);
    input.jump ||= keys.has(scheme.jump);
    input.shoot ||= keys.has(scheme.shoot);
    input.block ||= keys.has(scheme.block);
    input.pause ||= keys.has("Escape") || keys.has("KeyP");
    input.leftPressed ||= pressed.has(scheme.left);
    input.rightPressed ||= pressed.has(scheme.right);
    input.menuPressed ||= pressed.has("Enter") || pressed.has("NumpadEnter");
  }

  function readGamepad(pad, input) {
    const lx = axis(pad.axes[0]);
    const ly = axis(pad.axes[1]);
    const rx = axis(pad.axes[2]);
    const ry = axis(pad.axes[3]);
    const altX = axis(pad.axes[6]);
    const altY = axis(pad.axes[7]);
    const dLeft = button(pad, 14);
    const dRight = button(pad, 15);
    const dUp = button(pad, 12);
    const dDown = button(pad, 13);
    const dMove = (dRight ? 1 : 0) - (dLeft ? 1 : 0);
    const axisMove = Math.abs(lx) > 0 ? lx : altX;
    input.move += Math.abs(axisMove) > 0 ? axisMove : dMove;
    if (Math.hypot(rx, ry) > 0.2) {
      input.aimX = rx;
      input.aimY = ry;
    } else if (Math.hypot(lx, ly) > 0.2) {
      input.aimX = lx;
      input.aimY = ly;
    } else {
      input.aimX = input.move || 0;
      input.aimY = 0;
    }
    input.jump ||= button(pad, 0) || dUp || altY < -0.55;
    input.shoot ||= button(pad, 2) || button(pad, 5) || button(pad, 7);
    input.block ||= button(pad, 1) || button(pad, 3) || button(pad, 4) || button(pad, 6);
    input.pause ||= button(pad, 9);
    input.menuPressed ||= button(pad, 8) || button(pad, 9);
    input.leftPressed ||= dLeft || axisMove < -0.55;
    input.rightPressed ||= dRight || axisMove > 0.55;
    input.downPressed ||= dDown || altY > 0.55;
  }

  function axis(v) {
    return Math.abs(v || 0) > 0.18 ? v : 0;
  }

  function button(pad, index) {
    return Boolean(pad.buttons[index] && pad.buttons[index].pressed);
  }

  function buttonEdge(pad, index) {
    const lastButtons = lastPadButtons.get(pad.index) || [];
    return button(pad, index) && !lastButtons[index];
  }

  function axisEdge(pad, axisIndex, direction) {
    const lastAxes = lastPadButtons.get(`axes-${pad.index}`) || [];
    const current = axis(pad.axes[axisIndex]);
    const previous = Math.abs(lastAxes[axisIndex] || 0) > 0.18 ? lastAxes[axisIndex] : 0;
    return direction < 0 ? current < -0.55 && previous >= -0.55 : current > 0.55 && previous <= 0.55;
  }

  function getPads() {
    return navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
  }

  function getPadByIndex(pads, index) {
    if (index === null || index === undefined) return null;
    return pads.find(pad => pad.index === index) || null;
  }

  function rememberGamepads() {
    for (const pad of getPads()) {
      lastPadButtons.set(pad.index, pad.buttons.map(b => b.pressed));
      lastPadButtons.set(`axes-${pad.index}`, [...pad.axes]);
    }
  }

  function update(dt) {
    const pads = getPads();
    world.joinedThisFrame = false;
    world.pausedThisFrame = false;
    if (online.active && online.role === "guest") {
      updateOnlineGuestInput();
      if (world.state === "draft" && world.draftPlayer && world.draftPlayer.id === 1) updateDraftInput();
      updateParticles(dt);
      return;
    }
    if (world.state === "menu") updateLobbyJoins(pads);
    if (world.state !== "menu" && world.state !== "settings" && world.state !== "how") assignGamepads(pads);
    applyInputs(pads);

    if (world.state === "menu" || world.state === "settings" || world.state === "how") {
      updateMenuControls(pads);
      updateParticles(dt);
      return;
    }

    if (players.some(p => p.input.pausePressed) && (world.state === "playing" || world.state === "paused")) togglePause();
    if (world.state === "paused") {
      updateMenuControls(pads);
      updateParticles(dt);
      return;
    }

    if (players.some(p => p.input.menuPressed) && world.state === "ended") startMatch();

    if (world.state === "round-won") {
      updateParticles(dt);
      publishOnlineSnapshot();
      return;
    }

    if (world.state === "draft") {
      updateDraftInput();
      updateParticles(dt);
      publishOnlineSnapshot();
      return;
    }

    if (world.state !== "playing") {
      updateParticles(dt);
      return;
    }

    if (world.roundFreeze > 0) {
      world.roundFreeze -= dt;
      updateParticles(dt);
      return;
    }

    const step = Math.min(dt, 1 / 45);
    updatePlayers(step);
    updateBullets(step);
    updateFields(step);
    updateParticles(step);
    checkRoundEnd();
    publishOnlineSnapshot();
  }

  function updateDraftInput() {
    const p = world.draftPlayer;
    if (!p) return;
    const move = p.input.rightPressed ? 1 : p.input.leftPressed ? -1 : 0;
    if (move && !p.draftStickLock) {
      world.draftIndex = (world.draftIndex + move + world.draftOptions.length) % world.draftOptions.length;
      p.draftStickLock = true;
      pulse(p, 0.12, 40);
      renderDraftSelection();
    }
    if (!p.input.leftPressed && !p.input.rightPressed) p.draftStickLock = false;
    if (p.input.shootPressed || p.input.jumpPressed) pickDraft();
  }

  function renderDraftSelection() {
    [...draftCards.children].forEach((el, i) => {
      el.classList.toggle("selected", i === world.draftIndex);
    });
  }

  function updatePlayers(dt) {
    const map = maps[world.mapIndex];
    for (const [index, p] of players.entries()) {
      if (!p.alive) continue;
      repairBadSpawn(p, index);
      p.fireTimer = Math.max(0, p.fireTimer - dt);
      p.blockCooldown = Math.max(0, p.blockCooldown - dt);
      p.blockTimer = Math.max(0, p.blockTimer - dt);
      p.mythicCooldown = Math.max(0, p.mythicCooldown - dt);
      p.mythicTimer = Math.max(0, p.mythicTimer - dt);
      p.spawnGrace = Math.max(0, p.spawnGrace - dt);
      p.faceBlink += dt;

      if (p.poisonTimer > 0) {
        p.poisonTimer -= dt;
        hurt(p, p.poisonDps * dt, null, 0, 0);
      }

      if (p.reloadTimer > 0) {
        p.reloadTimer -= dt;
        if (p.reloadTimer <= 0) {
          p.ammo = p.stats.maxAmmo;
          puff(p.x, p.y, "#ffffff", 8);
        }
      }

      const move = clamp(p.input.move, -1, 1);
      const targetVx = move * p.stats.speed;
      const accel = p.grounded ? p.stats.accel : p.stats.airAccel;
      p.vx += (targetVx - p.vx) * clamp(accel * dt, 0, 1);
      if (!move && p.grounded) p.vx += (0 - p.vx) * clamp(p.stats.brake * dt, 0, 1);
      if (move) {
        p.aimX = move;
        p.aimY = 0;
      }
      if (Math.abs(p.input.aimX) > 0.2 || Math.abs(p.input.aimY) > 0.2) {
        const mag = Math.hypot(p.input.aimX, p.input.aimY) || 1;
        p.aimX = p.input.aimX / mag;
        p.aimY = p.input.aimY / mag;
      }
      const aimMag = Math.hypot(p.aimX, p.aimY) || 1;
      p.aimX /= aimMag;
      p.aimY /= aimMag;

      if (p.input.jumpPressed && p.jumpsLeft > 0) {
        p.vy = -p.stats.jump;
        p.jumpsLeft -= 1;
        p.jumpReady = p.jumpsLeft > 0;
        p.grounded = false;
        pulse(p, 0.12, 25);
        sfx("jump");
        puff(p.x, p.y + p.stats.radius, p.color, 12);
      }

      if (p.input.blockPressed && !tryMythic(p)) tryBlock(p);
      if (p.input.shoot) tryShoot(p);

      p.vy += world.gravity * dt;
      p.vx *= p.grounded ? world.floorDrag : world.airDrag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.grounded = false;

      collidePlayerWithMap(p, map);
      p.renderX = Number.isFinite(p.x) ? p.x : p.renderX;
      p.renderY = Number.isFinite(p.y) ? p.y : p.renderY;
      if (p.x < -80 || p.x > world.width + 80 || p.y > world.height + 120) hurt(p, 999, null, 0, -1);
      if (settings.hazards) {
        for (const h of map.hazards) {
          if (circleRect(p, h)) hurt(p, 999, null, 0, -1);
        }
      }
    }
  }

  function tryMythic(p) {
    if (!p.stats.mythic || p.mythicCooldown > 0) return false;
    p.mythicCooldown = p.stats.mythicCooldown || mythicCooldown(p.stats.mythic);
    p.mythicTimer = p.stats.mythicDuration || 0.45;
    pulse(p, 0.75, 170);
    sfx("win");
    burst(p.x, p.y, "#85fff2", 36, 520);

    const aim = Math.atan2(p.aimY, p.aimX);
    if (p.stats.mythic === "hollowViolet") {
      fields.push({ type: "beam", owner: p, x: p.x + p.aimX * 360, y: p.y + p.aimY * 360, r: 210, life: 0.24, force: 1600 });
      damageCone(p, aim, 0.18, 920, 96, 1900);
    } else if (p.stats.mythic === "greenGiant") {
      p.hp = Math.min(p.stats.maxHp * 1.6, p.hp + 95);
      p.vx += p.aimX * 760;
      p.vy -= 520;
      fields.push({ type: "push", owner: p, x: p.x, y: p.y, r: 260, life: 0.25, force: 1600 });
      p.mythicTimer = 4;
    } else if (p.stats.mythic === "pocketDomain") {
      fields.push({ type: "domain", owner: p, x: p.x, y: p.y, r: 360, life: 3.2, force: -780 });
    } else if (p.stats.mythic === "starSword") {
      spawnMythicBullet(p, aim, 1500, 32, 78, 1.2, 0, 0, 2, "#f8f4e8");
    } else if (p.stats.mythic === "webSwing") {
      p.vx += p.aimX * 1250;
      p.vy += p.aimY * 900 - 180;
      damageCone(p, aim, 0.45, 520, 34, 900);
    } else if (p.stats.mythic === "speedForce") {
      p.x = clamp(p.x + p.aimX * 360, 70, world.width - 70);
      p.y = clamp(p.y + p.aimY * 240, 80, world.height - 120);
      fields.push({ type: "push", owner: p, x: p.x, y: p.y, r: 190, life: 0.18, force: 980 });
    } else if (p.stats.mythic === "wizardPortal") {
      for (let i = -2; i <= 2; i += 1) spawnMythicBullet(p, aim + i * 0.18, 980, 10, 32, 1.4, 700, 0.2, 1, "#ffcf75");
    } else if (p.stats.mythic === "iceQueen") {
      fields.push({ type: "ice", owner: p, x: p.x, y: p.y, r: 320, life: 2.4, force: 260 });
    } else if (p.stats.mythic === "shadowClone") {
      for (let i = -3; i <= 3; i += 1) spawnMythicBullet(p, aim + i * 0.12, 1050, 7, 22, 1.1, 0, 0.3, 0, p.color);
    } else if (p.stats.mythic === "kaijuRoar") {
      fields.push({ type: "push", owner: p, x: p.x, y: p.y, r: 520, life: 0.32, force: 2200 });
      damageCone(p, aim, Math.PI, 520, 48, 1800);
    } else if (p.stats.mythic === "dragonBreath") {
      for (let i = -4; i <= 4; i += 1) spawnMythicBullet(p, aim + i * 0.1, 880, 9, 26, 0.95, 0, 1, 0, "#ff7a32");
    } else if (p.stats.mythic === "laserGauntlet") {
      damageCone(p, aim, 0.08, 1120, 74, 2200);
      fields.push({ type: "beam", owner: p, x: p.x + p.aimX * 500, y: p.y + p.aimY * 500, r: 140, life: 0.16, force: 1200 });
    } else if (p.stats.mythic === "moonKnight") {
      for (let i = -2; i <= 2; i += 1) spawnMythicBullet(p, aim + i * 0.28, 1180, 14, 38, 1.9, 0, 0, 3, "#dce8ff");
    } else if (p.stats.mythic === "timeLoop") {
      p.hp = Math.min(p.stats.maxHp, p.hp + 80);
      p.spawnGrace = Math.max(p.spawnGrace, 1.2);
      p.x = clamp(p.x - p.aimX * 260, 80, world.width - 80);
      p.y = clamp(p.y - p.aimY * 180, 80, world.height - 120);
    } else if (p.stats.mythic === "mechaSuit") {
      for (let i = -3; i <= 3; i += 1) spawnMythicBullet(p, -Math.PI / 2 + i * 0.16, 760, 16, 42, 1.5, 1.4, 0, 1, "#9ff0ff", p.x + i * 44, p.y - 120);
    }
    showToast(`${p.name} used ${mythicName(p.stats.mythic)}`);
    return true;
  }

  function mythicName(id) {
    const c = cardPool.find(card => card.stats.some(stat => stat.includes("G/LB")) && card.id === id);
    return c ? c.name : "Mythic";
  }

  function spawnMythicBullet(p, angle, speed, radius, damage, life, explosive = 0, poison = 0, bounces = 0, color = p.color, x = null, y = null) {
    const sx = x ?? p.x + Math.cos(angle) * 38;
    const sy = y ?? p.y + Math.sin(angle) * 38;
    bullets.push({
      owner: p,
      x: sx,
      y: sy,
      prevX: sx,
      prevY: sy,
      ox: p.x,
      oy: p.y,
      vx: Math.cos(angle) * speed + p.vx * 0.1,
      vy: Math.sin(angle) * speed + p.vy * 0.06,
      r: radius,
      damage,
      life,
      gravity: p.stats.bulletGravity * 0.4,
      drag: 0.998,
      restitution: 0.78,
      bounces,
      explosive,
      homing: 0,
      poison,
      grow: 0,
      color
    });
  }

  function damageCone(owner, angle, arc, range, damage, force) {
    for (const p of players) {
      if (!p.alive || p === owner || p.spawnGrace > 0) continue;
      const dx = p.x - owner.x;
      const dy = p.y - owner.y;
      const distance = Math.hypot(dx, dy) || 1;
      const diff = Math.abs(Math.atan2(Math.sin(Math.atan2(dy, dx) - angle), Math.cos(Math.atan2(dy, dx) - angle)));
      if (distance <= range && diff <= arc) {
        const t = 1 - distance / range;
        hurt(p, damage * (0.55 + t * 0.45), owner, dx * force / distance, dy * force / distance);
      }
    }
  }

  function tryBlock(p) {
    if (p.blockCooldown > 0) return;
    p.blockTimer = p.stats.blockDuration;
    p.blockCooldown = p.stats.blockCooldown;
    pulse(p, 0.32, 95);
    sfx("block");
    burst(p.x, p.y, p.color, 18, 260);
    if (p.stats.blockDash) {
      p.vx += p.aimX * 720;
      p.vy += p.aimY * 520;
    }
    if (p.stats.blockPush) fields.push({ type: "push", owner: p, x: p.x, y: p.y, r: 180, life: 0.18, force: 980 });
    if (p.stats.echoBlock) {
      setTimeout(() => {
        if (p.alive && world.state === "playing") {
          p.blockTimer = Math.max(p.blockTimer, p.stats.blockDuration * 0.8);
          if (p.stats.blockPush) fields.push({ type: "push", owner: p, x: p.x, y: p.y, r: 200, life: 0.18, force: 820 });
          burst(p.x, p.y, p.color, 16, 220);
        }
      }, 190);
    }
  }

  function tryShoot(p) {
    if (p.fireTimer > 0 || p.reloadTimer > 0 || p.ammo <= 0) return;
    p.fireTimer = p.stats.fireDelay;
    p.ammo -= 1;
    sfx("shoot");
    const baseAngle = Math.atan2(p.aimY, p.aimX);
    const pellets = p.stats.pellets;
    for (let i = 0; i < pellets; i += 1) {
      const spread = (i - (pellets - 1) / 2) * p.stats.spread + rand(-0.018, 0.018);
      const a = baseAngle + spread;
      const speed = p.stats.bulletSpeed * rand(0.94, 1.05);
      bullets.push({
        owner: p,
        x: p.x + Math.cos(a) * 32,
        y: p.y + Math.sin(a) * 32,
        prevX: p.x + Math.cos(a) * 32,
        prevY: p.y + Math.sin(a) * 32,
        ox: p.x,
        oy: p.y,
        vx: Math.cos(a) * speed + p.vx * 0.18,
        vy: Math.sin(a) * speed + p.vy * 0.08,
        r: 7 + Math.min(10, p.stats.damage / 18),
        damage: p.stats.damage,
        life: 2.7,
        gravity: p.stats.bulletGravity,
        drag: p.stats.bulletDrag,
        restitution: p.stats.bulletRestitution,
        bounces: p.stats.bounces,
        explosive: p.stats.explosive,
        homing: p.stats.homing,
        poison: p.stats.poison,
        grow: p.stats.grow,
        color: p.color
      });
    }
    p.vx -= Math.cos(baseAngle) * 70;
    p.vy -= Math.sin(baseAngle) * 20;
    pulse(p, 0.18, 45);
    if (p.ammo <= 0) {
      if (p.stats.emptyBlock) tryBlock(p);
      p.reloadTimer = p.stats.reload;
    }
  }

  function updateBullets(dt) {
    const map = maps[world.mapIndex];
    for (const b of bullets) {
      if (b.homing) {
        const target = nearestEnemy(b);
        if (target) {
          const dx = target.x - b.x;
          const dy = target.y - b.y;
          const mag = Math.hypot(dx, dy) || 1;
          b.vx += (dx / mag) * b.homing * 520 * dt;
          b.vy += (dy / mag) * b.homing * 520 * dt;
        }
      }
      b.prevX = b.x;
      b.prevY = b.y;
      b.vy += b.gravity * dt;
      const drag = Math.pow(b.drag, dt * 60);
      b.vx *= drag;
      b.vy *= drag;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      particles.push({ x: b.x, y: b.y, vx: rand(-18, 18), vy: rand(-18, 18), life: 0.18, maxLife: 0.18, r: 2, color: b.color });

      for (const platform of map.platforms) {
        if (circleRect(b, platform)) {
          if (b.bounces > 0) {
            bounceBullet(b, platform);
            b.bounces -= 1;
            sfx("block");
            pulse(b.owner, 0.08, 25);
          } else {
            b.life = -1;
            explodeBullet(b);
          }
        }
      }

      for (const p of players) {
        if (!p.alive || p === b.owner || p.spawnGrace > 0) continue;
        const d = Math.hypot(p.x - b.x, p.y - b.y);
        if (d < p.stats.radius + b.r) {
          if (p.blockTimer > 0) {
            const mag = Math.hypot(b.vx, b.vy) || 1;
            b.owner = p;
            b.vx = -(b.vx / mag) * p.stats.bulletSpeed * 1.05;
            b.vy = -(b.vy / mag) * p.stats.bulletSpeed * 1.05;
            b.color = p.color;
            b.x += b.vx * dt * 2;
            b.y += b.vy * dt * 2;
            pulse(p, 0.22, 70);
          } else {
            const travel = Math.hypot(b.x - b.ox, b.y - b.oy);
            const growBonus = b.grow ? 1 + Math.min(1.3, travel / 900) : 1;
            const damage = b.damage * growBonus;
            hurt(p, damage, b.owner, b.vx, b.vy);
            if (b.owner && b.owner.alive && b.owner.stats.lifesteal) {
              b.owner.hp = Math.min(b.owner.stats.maxHp, b.owner.hp + damage * b.owner.stats.lifesteal);
            }
            if (b.poison) {
              p.poisonTimer = Math.max(p.poisonTimer, 2.6);
              p.poisonDps = Math.max(p.poisonDps, 11 + b.damage * 0.12);
            }
            b.life = -1;
            explodeBullet(b);
          }
        }
      }
    }
    bullets = bullets.filter(b => b.life > 0 && b.x > -120 && b.x < world.width + 120 && b.y > -120 && b.y < world.height + 120);
  }

  function updateFields(dt) {
    for (const f of fields) {
      f.life -= dt;
      for (const p of players) {
        if (!p.alive || p === f.owner) continue;
        const dx = p.x - f.x;
        const dy = p.y - f.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < f.r) {
          const t = 1 - d / f.r;
          if (f.type === "domain") {
            p.vx -= (dx / d) * Math.abs(f.force) * t * dt;
            p.vy -= (dy / d) * Math.abs(f.force) * t * dt;
            hurt(p, 18 * t * dt, f.owner, -dx, -dy);
          } else if (f.type === "ice") {
            p.vx *= Math.pow(0.86, dt * 60);
            p.vy += 80 * t * dt;
            hurt(p, 7 * t * dt, f.owner, dx, dy);
          } else {
            p.vx += (dx / d) * f.force * t * dt;
            p.vy += (dy / d) * f.force * t * dt;
            hurt(p, 12 * t * dt, f.owner, dx, dy);
          }
        }
      }
    }
    fields = fields.filter(f => f.life > 0);
  }

  function hurt(p, amount, attacker, kx, ky) {
    if (!p.alive || p.blockTimer > 0 || p.spawnGrace > 0) return;
    p.hp -= amount;
    const mag = Math.hypot(kx, ky) || 1;
    p.vx += (kx / mag) * Math.min(620, amount * 16);
    p.vy += (ky / mag) * Math.min(320, amount * 8) - Math.min(220, amount * 2);
    if (amount > 4) {
      sfx("hit");
      pulse(p, Math.min(0.55, amount / 90), Math.min(190, 50 + amount));
      world.shake = Math.max(world.shake, Math.min(18, amount / 7));
      burst(p.x, p.y, p.color, Math.min(34, 6 + amount / 3), 340);
    }
    if (p.hp <= 0) {
      if (p.roundRevives > 0) {
        p.roundRevives -= 1;
        p.hp = p.stats.maxHp * 0.55;
        p.spawnGrace = 0.75;
        p.vy = -760;
        showToast(`${p.name} pops back in`);
        burst(p.x, p.y, p.color, 48, 620);
      } else {
        p.alive = false;
        p.hp = 0;
        burst(p.x, p.y, p.color, 70, 760);
        if (attacker) pulse(attacker, 0.35, 130);
      }
    }
  }

  function collidePlayerWithMap(p, map) {
    const r = p.stats.radius;
    if (p.x < r) {
      p.x = r;
      p.vx = Math.abs(p.vx) * 0.46;
      if (p.blockTimer > 0) p.vx += 720;
    }
    if (p.x > world.width - r) {
      p.x = world.width - r;
      p.vx = -Math.abs(p.vx) * 0.46;
      if (p.blockTimer > 0) p.vx -= 720;
    }
    if (p.y < r) {
      p.y = r;
      p.vy = Math.abs(p.vy) * 0.42;
    }

    for (const platform of map.platforms) {
      const overlap = playerPlatformOverlap(p, platform);
      if (!overlap) continue;
      if (overlap.side === "top") {
        p.y -= overlap.amount;
        p.vy = Math.min(0, p.vy);
        p.grounded = true;
        p.jumpReady = true;
        p.jumpsLeft = 1 + p.stats.extraJumps;
      } else if (overlap.side === "bottom") {
        p.y += overlap.amount;
        p.vy = Math.max(0, p.vy) * 0.24;
      } else if (overlap.side === "left") {
        p.x -= overlap.amount;
        p.vx = Math.min(0, p.vx) * 0.22;
      } else if (overlap.side === "right") {
        p.x += overlap.amount;
        p.vx = Math.max(0, p.vx) * 0.22;
      }
    }
  }

  function playerPlatformOverlap(p, platform) {
    const r = p.stats.radius;
    if (p.x + r <= platform.x || p.x - r >= platform.x + platform.w || p.y + r <= platform.y || p.y - r >= platform.y + platform.h) return null;
    const overlaps = [
      { side: "top", amount: p.y + r - platform.y },
      { side: "bottom", amount: platform.y + platform.h - (p.y - r) },
      { side: "left", amount: p.x + r - platform.x },
      { side: "right", amount: platform.x + platform.w - (p.x - r) }
    ].filter(o => o.amount > 0);
    overlaps.sort((a, b) => a.amount - b.amount);
    const vertical = overlaps.filter(o => o.side === "top" || o.side === "bottom")[0];
    const horizontal = overlaps.filter(o => o.side === "left" || o.side === "right")[0];
    if (p.vy >= 0 && vertical && vertical.side === "top" && vertical.amount < r * 1.4) return vertical;
    if (p.vy < 0 && vertical && vertical.side === "bottom" && vertical.amount < r * 1.1) return vertical;
    return overlaps[0] || horizontal || vertical;
  }

  function bounceBullet(b, platform) {
    const r = b.r;
    const cameFromLeft = b.prevX + r <= platform.x;
    const cameFromRight = b.prevX - r >= platform.x + platform.w;
    const cameFromTop = b.prevY + r <= platform.y;
    const cameFromBottom = b.prevY - r >= platform.y + platform.h;
    const restitution = b.restitution || 0.78;

    if (cameFromLeft || cameFromRight) {
      b.x = cameFromLeft ? platform.x - r - 1 : platform.x + platform.w + r + 1;
      b.vx = -b.vx * restitution;
      b.vy *= 0.96;
    } else if (cameFromTop || cameFromBottom) {
      b.y = cameFromTop ? platform.y - r - 1 : platform.y + platform.h + r + 1;
      b.vy = -b.vy * restitution;
      b.vx *= 0.96;
    } else {
      const cx = clamp(b.x, platform.x, platform.x + platform.w);
      const cy = clamp(b.y, platform.y, platform.y + platform.h);
      const dx = b.x - cx;
      const dy = b.y - cy;
      if (Math.abs(dx) > Math.abs(dy)) {
        b.vx = -b.vx * restitution;
        b.x += Math.sign(b.vx) * (r + 2);
      } else {
        b.vy = -b.vy * restitution;
        b.y += Math.sign(b.vy) * (r + 2);
      }
    }
    b.vx += rand(-18, 18);
    b.vy += rand(-18, 18);
  }

  function explodeBullet(b) {
    if (b.explosive) {
      fields.push({ type: "push", owner: b.owner, x: b.x, y: b.y, r: 95 + b.explosive * 18, life: 0.14, force: 720 });
      for (const p of players) {
        if (!p.alive || p === b.owner) continue;
        const d = Math.hypot(p.x - b.x, p.y - b.y);
        if (d < 105) hurt(p, (1 - d / 105) * 34, b.owner, p.x - b.x, p.y - b.y);
      }
      world.shake = Math.max(world.shake, 9);
    }
    burst(b.x, b.y, b.color, b.explosive ? 30 : 10, b.explosive ? 520 : 180);
  }

  function checkRoundEnd() {
    const alive = players.filter(p => p.alive);
    if (alive.length === 1) endRound(alive[0]);
    else if (alive.length === 0) {
      showToast("Nobody survived");
      resetRound();
    }
  }

  function nearestEnemy(b) {
    let best = null;
    let bestD = Infinity;
    for (const p of players) {
      if (!p.alive || p === b.owner) continue;
      const d = Math.hypot(p.x - b.x, p.y - b.y);
      if (d < bestD && d < 650) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  function circleRect(c, r) {
    const cx = clamp(c.x, r.x, r.x + r.w);
    const cy = clamp(c.y, r.y, r.y + r.h);
    return Math.hypot(c.x - cx, c.y - cy) <= (c.r || c.stats.radius);
  }

  function assignGamepads(pads = getPads()) {
    for (const pad of pads) {
      const anyPressed = pad.buttons.some((_, i) => buttonEdge(pad, i));
      if (!anyPressed || gamepadSlots.has(pad.index)) continue;
      const player = players.find(p => p.gamepadIndex === null);
      if (player) {
        claimPad(player, pad);
      }
    }
  }

  function updateLobbyJoins(pads) {
    for (const pad of pads) {
      const anyPressed = pad.buttons.some((_, i) => buttonEdge(pad, i));
      if (!anyPressed || lobbySlots.some(slot => slot.gamepadIndex === pad.index)) continue;
      if (lobbySlots.length + settings.botCount >= settings.playerCount) {
        showToast("Lobby is full");
        world.joinedThisFrame = true;
        return;
      }
      lobbySlots.push({
        type: "pad",
        gamepadIndex: pad.index,
        label: pad.id.split("(")[0].trim() || `Controller ${pad.index + 1}`
      });
      ensureAudio();
      sfx("card");
      world.joinedThisFrame = true;
      showToast(`P${lobbySlots.length} joined`);
      renderLobbySlots();
    }
  }

  function rebuildGamepadSlots() {
    gamepadSlots.clear();
    for (const p of players) {
      if (p.gamepadIndex !== null) gamepadSlots.set(p.gamepadIndex, p.id);
    }
  }

  function claimPad(player, pad, announce = true) {
    player.gamepadIndex = pad.index;
    gamepadSlots.set(pad.index, player.id);
    if (announce) {
      showToast(`${pad.id.split("(")[0].trim() || "Controller"} joined ${player.name}`);
      pulse(player, 0.28, 100);
    }
  }

  function updateMenuControls(pads) {
    const controls = visibleControls();
    if (!controls.length) return;
    world.menuIndex = clamp(world.menuIndex, 0, controls.length - 1);
    const move = menuMove(pads);
    if (move) setMenuIndex(world.menuIndex + move, controls);

    const focused = controls[world.menuIndex];
    const adjust = menuAdjust(pads);
    if (focused && focused.matches("input") && adjust) {
      adjustMenuInput(focused, adjust);
    }

    if (menuConfirm(pads)) {
      const target = controls[world.menuIndex];
      if (target) {
        if (target.matches("input[type='checkbox']")) {
          target.checked = !target.checked;
          target.dispatchEvent(new Event("change"));
        } else {
          target.click();
        }
      }
    }

    if (menuBack(pads)) {
      if (world.state === "settings") showMainMenu(settingsPanel);
      if (world.state === "how") showMainMenu(howPanel);
      if (world.state === "paused") togglePause(false);
    }
  }

  function visibleControls() {
    const panel = world.state === "settings" ? settingsPanel : world.state === "how" ? howPanel : world.state === "paused" ? pausePanel : menu;
    return [...panel.querySelectorAll("button, input")].filter(el => !el.disabled && el.offsetParent !== null);
  }

  function setMenuIndex(index, controls = visibleControls()) {
    if (!controls.length) return;
    world.menuIndex = (index + controls.length) % controls.length;
    controls.forEach(el => el.classList.remove("controller-focus"));
    const target = controls[world.menuIndex];
    target.classList.add("controller-focus");
    target.focus({ preventScroll: true });
  }

  function menuMove(pads) {
    if (pressed.has("ArrowDown") || pressed.has("KeyS")) return 1;
    if (pressed.has("ArrowUp") || pressed.has("KeyW")) return -1;
    for (const pad of pads) {
      if (buttonEdge(pad, 13) || axisEdge(pad, 1, 1)) return 1;
      if (buttonEdge(pad, 12) || axisEdge(pad, 1, -1)) return -1;
    }
    return 0;
  }

  function menuAdjust(pads) {
    if (pressed.has("ArrowRight") || pressed.has("KeyD")) return 1;
    if (pressed.has("ArrowLeft") || pressed.has("KeyA")) return -1;
    for (const pad of pads) {
      if (buttonEdge(pad, 15) || axisEdge(pad, 0, 1)) return 1;
      if (buttonEdge(pad, 14) || axisEdge(pad, 0, -1)) return -1;
    }
    return 0;
  }

  function menuConfirm(pads) {
    if (world.pausedThisFrame) return false;
    if (world.joinedThisFrame) return false;
    if (pressed.has("Enter") || pressed.has("Space")) return true;
    return pads.some(pad => buttonEdge(pad, 0) || buttonEdge(pad, 7) || buttonEdge(pad, 9));
  }

  function menuBack(pads) {
    if (pressed.has("Escape") || pressed.has("Backspace")) return true;
    return pads.some(pad => buttonEdge(pad, 1) || buttonEdge(pad, 8));
  }

  function adjustMenuInput(input, direction) {
    if (input.type === "range") {
      input.value = String(clamp(Number(input.value) + direction, Number(input.min), Number(input.max)));
      input.dispatchEvent(new Event("input"));
    } else if (input.type === "checkbox") {
      input.checked = direction > 0;
      input.dispatchEvent(new Event("change"));
    }
  }

  function showMainMenu(panel) {
    panel.classList.add("hidden");
    menu.classList.remove("hidden");
    world.state = "menu";
    pausePanel.classList.add("hidden");
    battleSplash.classList.add("hidden");
    setMenuIndex(0);
  }

  function togglePause(forceState = null) {
    const shouldPause = forceState === null ? world.state === "playing" : forceState;
    if (shouldPause && world.state === "playing") {
      world.state = "paused";
      world.pausedThisFrame = true;
      pausePanel.classList.remove("hidden");
      setMenuIndex(0);
      showToast("Paused");
    } else if (!shouldPause && world.state === "paused") {
      world.state = "playing";
      pausePanel.classList.add("hidden");
      showToast("Resumed");
    }
  }

  function returnToMainMenu() {
    leaveOnlineGame();
    players = [];
    bullets = [];
    fields = [];
    stopAudio();
    world.state = "menu";
    world.winner = null;
    pausePanel.classList.add("hidden");
    battleSplash.classList.add("hidden");
    draftPanel.classList.add("hidden");
    menu.classList.remove("hidden");
    setMenuIndex(0);
  }

  function pulse(target, strength, duration) {
    if (!settings.haptics || !target || target.gamepadIndex === null) return;
    const pad = navigator.getGamepads && navigator.getGamepads()[target.gamepadIndex];
    const actuator = pad && (pad.vibrationActuator || (pad.hapticActuators && pad.hapticActuators[0]));
    if (!actuator) return;
    if (actuator.playEffect) {
      actuator.playEffect("dual-rumble", {
        duration,
        strongMagnitude: clamp(strength, 0, 1),
        weakMagnitude: clamp(strength * 0.55, 0, 1)
      }).catch(() => {});
    } else if (actuator.pulse) {
      actuator.pulse(clamp(strength, 0, 1), duration).catch(() => {});
    }
  }

  function render() {
    resize();
    const scale = Math.min(canvas.width / world.width, canvas.height / world.height);
    const ox = (canvas.width - world.width * scale) / 2;
    const oy = (canvas.height - world.height * scale) / 2;
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#111418";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const shake = settings.shake ? world.shake : 0;
    ctx.translate(ox + rand(-shake, shake), oy + rand(-shake, shake));
    ctx.scale(scale, scale);
    world.shake *= 0.86;
    if (world.state === "menu" || world.state === "settings" || world.state === "how") {
      drawTitleBackground();
    } else {
      drawBackground();
      drawMap();
      drawFields();
      drawBullets();
      drawPlayers();
      drawParticles();
      if (world.roundFreeze > 0 && world.state === "playing") drawCountdown();
      if (world.state === "ended") drawWinner();
    }
    ctx.restore();
    renderHud();
    if (world.state === "menu") renderLobbySlots();
    updateToast();
  }

  function drawTitleBackground() {
    const t = performance.now() / 1000;
    const g = ctx.createLinearGradient(0, 0, world.width, world.height);
    g.addColorStop(0, "#11171d");
    g.addColorStop(0.55, "#151013");
    g.addColorStop(1, "#07090c");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, world.width, world.height);

    for (let i = 0; i < 22; i += 1) {
      const x = (i * 197 + t * 42) % (world.width + 220) - 110;
      const y = 115 + ((i * 89) % 680);
      ctx.globalAlpha = 0.08 + (i % 4) * 0.025;
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.arc(x, y + Math.sin(t + i) * 22, 28 + (i % 3) * 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.13)";
      ctx.lineWidth = 5;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 9; i += 1) {
      const y = 140 + i * 84 + Math.sin(t * 0.7 + i) * 10;
      ctx.beginPath();
      ctx.moveTo(180, y);
      ctx.quadraticCurveTo(world.width / 2, y - 40, world.width - 180, y);
      ctx.stroke();
    }
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, world.height);
    g.addColorStop(0, "#182026");
    g.addColorStop(0.5, "#11161b");
    g.addColorStop(1, "#090b0e");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, world.width, world.height);
    ctx.strokeStyle = "rgba(255,255,255,0.035)";
    ctx.lineWidth = 1.5;
    for (let x = 0; x < world.width; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, world.height);
      ctx.stroke();
    }
    for (let y = 30; y < world.height; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(world.width, y);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(255,255,255,0.035)";
    for (let i = 0; i < 42; i += 1) {
      const x = (i * 137 + performance.now() * 0.012) % world.width;
      const y = (i * 83) % world.height;
      ctx.fillRect(x, y, 3, 3);
    }
  }

  function drawMap() {
    const map = maps[world.mapIndex];
    for (const p of map.platforms) {
      roundRect(p.x, p.y, p.w, p.h, 8, "#eef0e4", "#171a1d");
      ctx.fillStyle = "#a7adb0";
      ctx.fillRect(p.x + 8, p.y + p.h - 8, p.w - 16, 4);
      ctx.fillStyle = "rgba(255,255,255,0.38)";
      ctx.fillRect(p.x + 10, p.y + 5, p.w - 20, 2);
    }
    if (settings.hazards) {
      for (const h of map.hazards) {
        roundRect(h.x, h.y, h.w, h.h, 6, "#ff4268", "#651323");
        ctx.fillStyle = "rgba(255,255,255,0.24)";
        for (let x = h.x + 8; x < h.x + h.w - 8; x += 18) {
          ctx.beginPath();
          ctx.moveTo(x, h.y + h.h);
          ctx.lineTo(x + 8, h.y + 2);
          ctx.lineTo(x + 16, h.y + h.h);
          ctx.fill();
        }
      }
    }
  }

  function drawPlayers() {
    for (const p of players) {
      if (!p.alive) continue;
      const r = p.stats.radius * (p.stats.mythic === "greenGiant" && p.mythicTimer > 0 ? 1.38 : 1);
      const wobble = Math.sin(performance.now() / 115 + p.id) * 3;
      const drawX = Number.isFinite(p.renderX) ? p.renderX : Number.isFinite(p.x) ? p.x : spawnPoints[p.id].x;
      const drawY = Number.isFinite(p.renderY) ? p.renderY : Number.isFinite(p.y) ? p.y : spawnPoints[p.id].y;
      ctx.save();
      ctx.translate(drawX, drawY);
      ctx.rotate(clamp(p.vx / 1200, -0.45, 0.45));
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.beginPath();
      ctx.ellipse(0, r + 9, r * 0.95, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.color;
      ctx.strokeStyle = "#171717";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(0, wobble, r * 0.95, r * 1.08, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      drawArm(-r * 0.72, -4, -p.aimY * 15 - 10, p.aimX * 18, p.color);
      drawArm(r * 0.72, -2, p.aimY * 15 + 10, p.aimX * 18, p.color);
      drawGun(p, r);

      ctx.fillStyle = "#111";
      const blink = p.faceBlink % 4 > 3.75 ? 1 : 6;
      ctx.fillRect(-9 + p.aimX * 4, -10 + p.aimY * 4, 6, blink);
      ctx.fillRect(9 + p.aimX * 4, -10 + p.aimY * 4, 6, blink);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#111";
      ctx.beginPath();
      ctx.arc(p.aimX * 4, 6, 9, 0.1, Math.PI - 0.1);
      ctx.stroke();

      if (p.blockTimer > 0 || p.spawnGrace > 0) {
        ctx.strokeStyle = p.blockTimer > 0 ? "#ffffff" : "rgba(255,255,255,0.45)";
        ctx.lineWidth = p.blockTimer > 0 ? 7 : 3;
        ctx.beginPath();
        ctx.arc(0, 0, r + 12 + Math.sin(performance.now() / 45) * 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawArm(x, y, bend, reach, color) {
    ctx.strokeStyle = "#161616";
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + reach * 0.25, y + bend, x + reach, y + bend * 0.35);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 7;
    ctx.stroke();
  }

  function drawGun(p, r) {
    const angle = Math.atan2(p.aimY, p.aimX);
    const side = p.aimX >= 0 ? 1 : -1;
    ctx.save();
    ctx.rotate(angle);
    ctx.translate(r * 0.58, 1);
    ctx.fillStyle = "#121417";
    ctx.strokeStyle = "#f8f4e8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-4, -7, 42, 14, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#f8f4e8";
    ctx.fillRect(28, -4, 16, 8);
    ctx.fillStyle = p.color;
    ctx.fillRect(8, -4, 10, 8);
    ctx.fillStyle = "#151515";
    ctx.save();
    ctx.translate(5, 7);
    ctx.rotate(0.45 * side);
    ctx.fillRect(-3, -1, 7, 16);
    ctx.restore();
    ctx.restore();
  }

  function drawBullets() {
    for (const b of bullets) {
      ctx.fillStyle = b.color;
      ctx.strokeStyle = "#121212";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (b.homing) {
        ctx.strokeStyle = "rgba(255,255,255,0.28)";
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r + 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  function drawFields() {
    for (const f of fields) {
      const alpha = clamp(f.life / 0.18, 0, 1);
      const longAlpha = clamp(f.life / 3.2, 0, 1);
      ctx.strokeStyle = f.type === "domain"
        ? `rgba(133,255,242,${0.32 * longAlpha})`
        : f.type === "ice"
          ? `rgba(180,235,255,${0.34 * clamp(f.life / 2.4, 0, 1)})`
          : f.type === "beam"
            ? `rgba(215,92,255,${0.5 * alpha})`
            : `rgba(255,255,255,${0.28 * alpha})`;
      ctx.lineWidth = f.type === "beam" ? 18 : 8;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * (1 - alpha * 0.45), 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawParticles() {
    for (const p of particles) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (0.6 + a), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawCountdown() {
    ctx.fillStyle = "rgba(0,0,0,0.24)";
    ctx.fillRect(0, 0, world.width, world.height);
    ctx.fillStyle = "#f8f4e8";
    ctx.font = "800 74px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(world.roundFreeze > 0.35 ? "READY" : "GO", world.width / 2, 180);
  }

  function drawWinner() {
    ctx.fillStyle = "rgba(0,0,0,0.48)";
    ctx.fillRect(0, 0, world.width, world.height);
    ctx.fillStyle = world.winner ? world.winner.color : "#fff";
    ctx.font = "900 84px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${world.winner.name} WINS`, world.width / 2, 390);
    ctx.fillStyle = "#f8f4e8";
    ctx.font = "700 28px system-ui, sans-serif";
    ctx.fillText("Press Enter or Start for rematch", world.width / 2, 440);
  }

  function renderHud() {
    if (world.state === "menu" || world.state === "settings" || world.state === "how") {
      hud.innerHTML = "";
      return;
    }
    hud.innerHTML = players.map(p => {
      const hp = clamp(p.hp / p.stats.maxHp, 0, 1) * 100;
      const cards = p.cards.map(c => c.name).slice(-3).join(" / ") || "No cards";
      const mythic = p.stats.mythic ? ` - Mythic ${p.mythicCooldown > 0 ? Math.ceil(p.mythicCooldown) : "Ready"}` : "";
      return `
        <article class="hud-card ${p.alive ? "" : "dead"}" style="color:${p.color}">
          <div class="hud-top"><span>${p.name}</span><span>${p.score}/${settings.scoreLimit}</span></div>
          <div class="bar"><i style="width:${hp}%"></i></div>
          <div class="mini">Ammo ${p.ammo}/${p.stats.maxAmmo}${mythic} - ${cards}</div>
        </article>
      `;
    }).join("");
  }

  function renderLobbySlots() {
    const displaySlots = [...lobbySlots];
    if (!displaySlots.length && settings.botCount > 0) {
      displaySlots.push({ type: "keyboard", label: "Keyboard P1" });
    }
    joinSlots.innerHTML = Array.from({ length: settings.playerCount }, (_, i) => {
      const slot = displaySlots[i];
      const botIndex = i - displaySlots.length;
      const bot = !slot && botIndex >= 0 && botIndex < settings.botCount;
      const color = colors[i % colors.length];
      return `
        <article class="join-slot ${slot || bot ? "joined" : ""}" style="color:${color}">
          <strong>${slot || bot ? `P${i + 1}` : `P${i + 1} Open`}</strong>
          <span>${slot ? slot.label : bot ? `Bot ${botIndex + 1}` : "Press controller button"}</span>
        </article>
      `;
    }).join("");
  }

  function renderOnlineGames() {
    if (!onlineGames) return;
    const joinable = online.games.filter(game => game.status === "open" && game.hostId !== online.localId).slice(0, 4);
    const ownWaiting = online.gameId && online.role === "host" && !online.active;
    const rows = [];
    if (ownWaiting) {
      rows.push(`
        <article class="online-row">
          <div><strong>Your online game is open</strong><span>Waiting for a friend to join</span></div>
          <button type="button" data-online-cancel="1">Cancel</button>
        </article>
      `);
    }
    for (const game of joinable) {
      rows.push(`
        <article class="online-row">
          <div><strong>${escapeHtml(game.name || "Online Game")}</strong><span>Ready to join</span></div>
          <button type="button" data-online-join="${game.id}">Join</button>
        </article>
      `);
    }
    onlineGames.innerHTML = rows.join("");
    for (const button of onlineGames.querySelectorAll("[data-online-join]")) {
      button.addEventListener("click", () => joinOnlineGame(button.dataset.onlineJoin));
    }
    const cancel = onlineGames.querySelector("[data-online-cancel]");
    if (cancel) cancel.addEventListener("click", () => {
      leaveOnlineGame();
      renderOnlineGames();
      showToast("Online game closed");
    });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function updateParticles(dt) {
    for (const p of particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 360 * dt;
    }
    particles = particles.filter(p => p.life > 0);
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const s = rand(speed * 0.18, speed);
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.25, 0.72), maxLife: 0.72, r: rand(2, 7), color });
    }
  }

  function puff(x, y, color, count) {
    burst(x, y, color, count, 160);
  }

  function showToast(text) {
    toast.textContent = text;
    toast.classList.remove("hidden");
    toastTimer = 2.2;
  }

  function ensureAudio() {
    if (audioCtx) {
      if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    audioCtx = new AudioContext();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.28;
    masterGain.connect(audioCtx.destination);
  }

  function startMusic() {
    if (!settings.music) return;
    if (!musicAudio) makeMusicAudio();
    musicAudio.currentTime = musicAudio.currentTime || 0;
    musicAudio.play().catch(() => showToast("Click once to enable music"));
  }

  function makeMusicAudio() {
    musicAudio = new Audio(soundtrack[currentTrack % soundtrack.length]);
    musicAudio.loop = false;
    musicAudio.volume = settings.musicVolume;
    musicAudio.preload = "auto";
    musicAudio.addEventListener("ended", () => {
      currentTrack = (currentTrack + 1) % soundtrack.length;
      musicAudio = null;
      startMusic();
    });
  }

  function stopMusic() {
    if (musicAudio) {
      musicAudio.pause();
      musicAudio.currentTime = 0;
    }
  }

  function stopAudio() {
    stopMusic();
    if (audioCtx) {
      audioCtx.close().catch(() => {});
      audioCtx = null;
      masterGain = null;
    }
  }

  function toggleMusic() {
    settings.music = !settings.music;
    if (settings.music) {
      ensureAudio();
      startMusic();
      showToast("Music on");
    } else {
      stopAudio();
      showToast("Music off");
    }
    syncMusicButtons();
  }

  function syncMusicButtons() {
    const label = `Music: ${settings.music ? "On" : "Off"}`;
    const menuButton = document.getElementById("musicBtn");
    const pauseButton = document.getElementById("pauseMusicBtn");
    if (menuButton) menuButton.textContent = label;
    if (pauseButton) pauseButton.textContent = label;
  }

  function setMusicVolume(value) {
    settings.musicVolume = clamp(Number(value) / 100, 0, 1);
    if (musicAudio) musicAudio.volume = settings.musicVolume;
  }

  function tone(freq, duration = 0.12, type = "sine", volume = 0.08, when = null, slideTo = null) {
    if (!audioCtx || !masterGain) return;
    const start = when ?? audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(start);
    osc.stop(start + duration + 0.03);
  }

  function noise(duration = 0.08, volume = 0.08, cutoff = 1200, when = null) {
    if (!audioCtx || !masterGain) return;
    const start = when ?? audioCtx.currentTime;
    const buffer = audioCtx.createBuffer(1, Math.max(1, Math.floor(audioCtx.sampleRate * duration)), audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    const src = audioCtx.createBufferSource();
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    src.buffer = buffer;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    src.start(start);
    src.stop(start + duration);
  }

  function kick(when = null) {
    const start = when ?? (audioCtx ? audioCtx.currentTime : 0);
    tone(95, 0.16, "sine", 0.11, start, 42);
  }

  function sfx(name) {
    ensureAudio();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    if (name === "shoot") {
      tone(220, 0.07, "square", 0.08, now, 95);
      noise(0.045, 0.05, 1800, now);
    } else if (name === "jump") {
      tone(220, 0.09, "triangle", 0.07, now, 440);
    } else if (name === "block") {
      tone(180, 0.13, "sawtooth", 0.07, now, 260);
      noise(0.08, 0.035, 900, now);
    } else if (name === "hit") {
      tone(120, 0.11, "sawtooth", 0.08, now, 75);
      noise(0.08, 0.07, 700, now);
    } else if (name === "card") {
      tone(440, 0.08, "triangle", 0.06, now);
      tone(660, 0.12, "triangle", 0.05, now + 0.07);
    } else if (name === "win") {
      tone(330, 0.13, "triangle", 0.08, now);
      tone(440, 0.13, "triangle", 0.08, now + 0.12);
      tone(660, 0.2, "triangle", 0.08, now + 0.24);
    }
  }

  function updateToast() {
    if (toastTimer > 0) {
      toastTimer -= 1 / 60;
      if (toastTimer <= 0) toast.classList.add("hidden");
    }
  }

  function roundRect(x, y, w, h, r, fill, stroke) {
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
    ctx.stroke();
  }

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.floor(innerWidth * dpr);
    const h = Math.floor(innerHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function tick(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    rememberGamepads();
    render();
    pressed.clear();
    requestAnimationFrame(tick);
  }

  function bindUi() {
    document.getElementById("startBtn").addEventListener("click", startMatch);
    document.getElementById("createOnlineBtn").addEventListener("click", createOnlineGame);
    document.getElementById("fullscreenBtn").addEventListener("click", toggleFullscreen);
    document.getElementById("musicBtn").addEventListener("click", toggleMusic);
    document.getElementById("resumeBtn").addEventListener("click", () => togglePause(false));
    document.getElementById("pauseFullscreenBtn").addEventListener("click", toggleFullscreen);
    document.getElementById("pauseMusicBtn").addEventListener("click", toggleMusic);
    document.getElementById("pauseMenuBtn").addEventListener("click", returnToMainMenu);
    document.getElementById("settingsBtn").addEventListener("click", () => {
      menu.classList.add("hidden");
      settingsPanel.classList.remove("hidden");
      world.state = "settings";
      setMenuIndex(0);
    });
    document.getElementById("howBtn").addEventListener("click", () => {
      menu.classList.add("hidden");
      howPanel.classList.remove("hidden");
      world.state = "how";
      setMenuIndex(0);
    });
    document.getElementById("settingsBack").addEventListener("click", () => {
      showMainMenu(settingsPanel);
    });
    document.getElementById("howBack").addEventListener("click", () => {
      showMainMenu(howPanel);
    });
    bindSetting("playerCount", "playerCountValue", v => {
      settings.playerCount = Number(v);
      while (lobbySlots.length > settings.playerCount) lobbySlots.pop();
      settings.botCount = Math.min(settings.botCount, Math.max(0, settings.playerCount - lobbySlots.length));
      const botInput = document.getElementById("botCount");
      const botValue = document.getElementById("botCountValue");
      botInput.value = String(settings.botCount);
      botValue.textContent = botInput.value;
      renderLobbySlots();
    });
    bindSetting("botCount", "botCountValue", v => {
      settings.botCount = Math.min(Number(v), Math.max(0, settings.playerCount - lobbySlots.length));
      document.getElementById("botCount").value = String(settings.botCount);
      document.getElementById("botCountValue").textContent = String(settings.botCount);
      renderLobbySlots();
    });
    bindSetting("botDifficulty", "botDifficultyValue", v => {
      settings.botDifficulty = Number(v);
      document.getElementById("botDifficultyValue").textContent = botDifficultyLabel(settings.botDifficulty);
    });
    bindSetting("scoreLimit", "scoreLimitValue", v => settings.scoreLimit = Number(v));
    bindSetting("draftCount", "draftCountValue", v => settings.draftCount = Number(v));
    bindSetting("musicVolume", "musicVolumeValue", setMusicVolume);
    bindRarityWeight("commonWeight", "commonWeightValue", "common");
    bindRarityWeight("uncommonWeight", "uncommonWeightValue", "uncommon");
    bindRarityWeight("rareWeight", "rareWeightValue", "rare");
    bindRarityWeight("epicWeight", "epicWeightValue", "epic");
    bindRarityWeight("legendaryWeight", "legendaryWeightValue", "legendary");
    bindRarityWeight("mythicalWeight", "mythicalWeightValue", "mythical");
    document.getElementById("hazards").addEventListener("change", e => settings.hazards = e.target.checked);
    document.getElementById("haptics").addEventListener("change", e => settings.haptics = e.target.checked);
    document.getElementById("shake").addEventListener("change", e => settings.shake = e.target.checked);
  }

  function bindSetting(inputId, valueId, setter) {
    const input = document.getElementById(inputId);
    const value = document.getElementById(valueId);
    input.addEventListener("input", () => {
      value.textContent = input.value;
      setter(input.value);
    });
  }

  function bindRarityWeight(inputId, valueId, rarity) {
    bindSetting(inputId, valueId, value => {
      settings.rarityWeights[rarity] = Number(value);
    });
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        showToast("Fullscreen on");
      } else {
        await document.exitFullscreen();
        showToast("Fullscreen off");
      }
    } catch {
      showToast("Fullscreen is blocked by this browser");
    }
  }

  addEventListener("keydown", e => {
    ensureAudio();
    if (!keys.has(e.code)) pressed.add(e.code);
    keys.add(e.code);
    if (e.code === "KeyM") toggleMusic();
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Enter", "NumpadEnter"].includes(e.code)) e.preventDefault();
  });
  addEventListener("pointerdown", ensureAudio);
  addEventListener("pagehide", stopAudio);
  addEventListener("beforeunload", stopAudio);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAudio();
  });
  addEventListener("keyup", e => keys.delete(e.code));
  addEventListener("gamepadconnected", e => showToast(`${e.gamepad.id.split("(")[0].trim() || "Controller"} detected`));
  addEventListener("gamepaddisconnected", e => {
    gamepadSlots.delete(e.gamepad.index);
    const slotIndex = lobbySlots.findIndex(slot => slot.gamepadIndex === e.gamepad.index);
    if (slotIndex >= 0) lobbySlots.splice(slotIndex, 1);
    for (const p of players) if (p.gamepadIndex === e.gamepad.index) p.gamepadIndex = null;
    renderLobbySlots();
    showToast("Controller disconnected");
  });

  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function polyfillRoundRect(x, y, w, h, r) {
      const rr = Math.min(r, w / 2, h / 2);
      this.moveTo(x + rr, y);
      this.arcTo(x + w, y, x + w, y + h, rr);
      this.arcTo(x + w, y + h, x, y + h, rr);
      this.arcTo(x, y + h, x, y, rr);
      this.arcTo(x, y, x + w, y, rr);
      return this;
    };
  }

  bindUi();
  renderLobbySlots();
  renderOnlineGames();
  ensureInstant().catch(() => {});
  syncMusicButtons();
  setMenuIndex(0);
  for (let i = 0; i < 80; i += 1) {
    particles.push({ x: rand(0, world.width), y: rand(0, world.height), vx: rand(-20, 20), vy: rand(-10, 10), life: rand(1, 4), maxLife: 4, r: rand(1, 3), color: "rgba(255,255,255,0.25)" });
  }
  requestAnimationFrame(tick);
})();
