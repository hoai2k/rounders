// Rounders — 25 arenas, each with its own theme, palette, weather, and
// signature mechanics. World space is 1600×900; the engine renders backdrops
// procedurally (or from assets/images/arenas/<id>.png when present).
//
// Feature reference:
//   platforms[]  {x,y,w,h, ice, conveyor(px/s), phase:{period,offset,duty},
//                 breakable:hp} — breakable platforms shatter after soaking
//                 that much bullet damage (rebuilt every round). Tall rects
//                 double as WALLS: players wall-slide and wall-jump on their
//                 sides, so pillars/towers are climbable terrain.
//   movers[]     platform oscillating (x,y)→(x+dx,y+dy) over `period` seconds
//   hung[]       {x,y,w,h, chains:[x...], anchorY, ice} — platform suspended
//                 on shootable chains; cut every chain and it drops, then
//                 settles on whatever it lands on (or falls into the void)
//   crates[]     {x,y,s,hp} — pushable, climbable, destructible boxes; they
//                 shove, stack, block bullets, and float on tides
//   hazards[]    deadly rects (spikes/lava/water) — style via palette.hazard
//   bouncePads[] {x,y,w,power} launch upward on touch
//   teleporters[]{ax,ay,bx,by} bidirectional portals
//   zones[]      {x,y,w,h,type:'syrup'} slow fields
//   lightning    {period,warn} timed sky strikes at random x
//   tide         {min,max,period} water level rises/falls; submerged = drowning damage
//   gravityScale, windX + gustPeriod, bulletBounceBonus
(() => {
  "use strict";
  window.ROUNDERS = window.ROUNDERS || {};

  const P = (x, y, w, h, opts = {}) => ({ x, y, w, h, ...opts });

  const LEVELS = [
    {
      // Two rooftops with a deadly alley between them, a climbable tower on
      // each side, AC-unit crates to shove, and a neon sign hung over the gap.
      id: "neon-skyline", name: "Neon Skyline",
      tagline: "Rain-slick rooftops. Shoot the sign down — the landlord's not looking.",
      backdrop: "city", weather: "rain",
      palette: { skyTop: "#141134", skyMid: "#33175c", skyBottom: "#a12a6e", plat: "#2b2b45", platEdge: "#12121f", accent: "#ff5fd0", hazard: "#ff2e63" },
      platforms: [
        P(0, 830, 700, 70), P(900, 830, 700, 70),
        P(70, 540, 64, 290), P(20, 516, 164, 24),
        P(1466, 570, 64, 260), P(1416, 546, 164, 24),
        P(250, 670, 220, 24), P(1130, 670, 220, 24),
        P(620, 560, 360, 26, { conveyor: 150 })
      ],
      hung: [{ x: 660, y: 340, w: 280, h: 26, chains: [720, 880] }],
      crates: [{ x: 320, y: 774, s: 56 }, { x: 1210, y: 774, s: 56 }],
      hazards: [],
      spawns: [{ x: 200, y: 790 }, { x: 1400, y: 790 }, { x: 340, y: 630 }, { x: 1260, y: 630 }]
    },
    {
      // Furnace towers to scale on each side, phase catwalks over the lava,
      // and a crane platform on chains that drops in to bridge the middle.
      id: "ember-foundry", name: "Ember Foundry",
      tagline: "The forge never sleeps. The crane platform answers to bullets.",
      backdrop: "forge", weather: "embers",
      palette: { skyTop: "#1a0c0a", skyMid: "#521b0c", skyBottom: "#a33a10", plat: "#4a3a35", platEdge: "#241a17", accent: "#ff9e3d", hazard: "#ff6316" },
      platforms: [
        P(0, 830, 380, 70), P(1220, 830, 380, 70),
        P(340, 600, 56, 230), P(300, 576, 140, 24),
        P(1204, 600, 56, 230), P(1160, 576, 140, 24),
        P(500, 700, 240, 26), P(860, 700, 240, 26),
        P(560, 470, 480, 26, { phase: { period: 5.2, offset: 0, duty: 0.68 } }),
        P(330, 320, 240, 24, { phase: { period: 5.2, offset: 2.6, duty: 0.68 } }),
        P(1030, 320, 240, 24, { phase: { period: 5.2, offset: 1.3, duty: 0.68 } })
      ],
      hung: [{ x: 690, y: 590, w: 220, h: 24, chains: [730, 870], anchorY: 496 }],
      crates: [{ x: 60, y: 774, s: 52 }, { x: 1480, y: 774, s: 52 }],
      hazards: [P(380, 850, 840, 50)],
      spawns: [{ x: 180, y: 790 }, { x: 1420, y: 790 }, { x: 560, y: 660 }, { x: 1040, y: 660 }]
    },
    {
      // All ice, now with an observatory tower to climb, a breakable icicle
      // shelf, and ice-block crates that slide halfway across the map.
      id: "frostbite-observatory", name: "Frostbite Observatory",
      tagline: "Every surface is ice. The ice blocks skate better than you do.",
      backdrop: "mountains", weather: "snow",
      palette: { skyTop: "#0e1e33", skyMid: "#1d3f5c", skyBottom: "#5f92b0", plat: "#cfe8f5", platEdge: "#5f88a3", accent: "#8fd8ff", hazard: "#7fb8ff" },
      platforms: [
        P(0, 830, 1600, 70, { ice: true }),
        P(1300, 520, 70, 310, { ice: true }), P(1240, 496, 190, 26, { ice: true }),
        P(140, 655, 300, 26, { ice: true }), P(60, 480, 220, 24, { ice: true }),
        P(600, 590, 400, 26, { ice: true }),
        P(360, 430, 240, 24, { ice: true }),
        P(900, 430, 220, 24, { ice: true, breakable: 110 }),
        P(660, 300, 280, 24, { ice: true })
      ],
      crates: [{ x: 500, y: 776, s: 54 }, { x: 1050, y: 776, s: 54 }],
      hazards: [],
      spawns: [{ x: 260, y: 790 }, { x: 1460, y: 790 }, { x: 700, y: 550 }, { x: 1330, y: 456 }]
    },
    {
      // Ruined temple columns of uneven height to perch on, a vine-hung
      // platform up top, and stone crates between the bounce pads.
      id: "verdant-overgrowth", name: "Verdant Overgrowth",
      tagline: "The temple lost. The vines won. They're still holding one platform up.",
      backdrop: "jungle", weather: "leaves",
      palette: { skyTop: "#0d2b1a", skyMid: "#1c4d2a", skyBottom: "#67a03a", plat: "#6b4a2f", platEdge: "#33241a", accent: "#9be24f", hazard: "#d4482f" },
      platforms: [
        P(0, 830, 1600, 70),
        P(430, 610, 60, 220), P(400, 586, 120, 24),
        P(1120, 540, 60, 290), P(1090, 516, 120, 24),
        P(140, 650, 300, 26), P(1160, 650, 300, 26),
        P(620, 610, 360, 26),
        P(360, 450, 200, 24)
      ],
      hung: [{ x: 660, y: 360, w: 280, h: 24, chains: [700, 900] }],
      crates: [{ x: 700, y: 774, s: 56 }, { x: 840, y: 774, s: 56 }],
      hazards: [],
      bouncePads: [
        { x: 20, y: 818, w: 120, power: 1550 },
        { x: 1460, y: 818, w: 120, power: 1550 }
      ],
      spawns: [{ x: 240, y: 610 }, { x: 1360, y: 610 }, { x: 460, y: 560 }, { x: 1150, y: 476 }]
    },
    {
      // Low gravity over the void: a solar mast to wall-kick in slow motion,
      // hung cargo pods to cut loose, and floating supply crates.
      id: "orbital-drift", name: "Orbital Drift",
      tagline: "Low gravity, no floor. Cut the cargo loose and count the seconds.",
      backdrop: "space", weather: "stars", gravityScale: 0.55,
      palette: { skyTop: "#05060f", skyMid: "#101a38", skyBottom: "#1c2f57", plat: "#8b93b8", platEdge: "#3d4460", accent: "#63e8ff", hazard: "#ff5f8f" },
      platforms: [
        P(180, 720, 320, 28), P(1100, 720, 320, 28),
        P(620, 620, 360, 28),
        P(770, 300, 60, 320), P(720, 276, 160, 24),
        P(140, 460, 260, 24), P(1200, 460, 260, 24)
      ],
      hung: [
        { x: 460, y: 380, w: 180, h: 26, chains: [540] },
        { x: 960, y: 380, w: 180, h: 26, chains: [1060] }
      ],
      crates: [{ x: 260, y: 664, s: 56 }, { x: 1290, y: 664, s: 56 }],
      hazards: [],
      spawns: [{ x: 340, y: 680 }, { x: 1260, y: 680 }, { x: 240, y: 420 }, { x: 1360, y: 420 }]
    },
    {
      // Two mesas with sheer inner faces, a breakable plank bridge across the
      // ravine, and crates for the wind to whistle past.
      id: "sirocco-canyon", name: "Sirocco Canyon",
      tagline: "The wind changes its mind every few seconds. The bridge won't last either.",
      backdrop: "canyon", weather: "dust", windX: 260, gustPeriod: 5.5,
      palette: { skyTop: "#3f1f3d", skyMid: "#b3542e", skyBottom: "#e8a04b", plat: "#a4643a", platEdge: "#5c3a20", accent: "#ffd27a", hazard: "#d44a2f" },
      platforms: [
        P(0, 830, 620, 70), P(980, 830, 620, 70),
        P(560, 650, 60, 180), P(980, 650, 60, 180),
        P(640, 700, 150, 22, { breakable: 100 }),
        P(810, 700, 150, 22, { breakable: 100 }),
        P(150, 620, 280, 24), P(1170, 620, 280, 24),
        P(560, 540, 200, 24), P(840, 540, 200, 24),
        P(300, 400, 220, 24), P(1080, 400, 220, 24),
        P(680, 330, 240, 24)
      ],
      crates: [{ x: 80, y: 774, s: 56 }, { x: 1470, y: 774, s: 56 }],
      hazards: [P(620, 850, 360, 50)],
      spawns: [{ x: 260, y: 790 }, { x: 1340, y: 790 }, { x: 410, y: 360 }, { x: 1190, y: 360 }]
    },
    {
      // Pier posts rising out of the water to perch on, stacked cargo on the
      // docks, and the string-light rig hanging over the middle on chains.
      id: "saltwind-boardwalk", name: "Saltwind Boardwalk",
      tagline: "Sunset, string lights, and one very punctual gondola.",
      backdrop: "pier", weather: null,
      palette: { skyTop: "#3a2c6e", skyMid: "#c65f7a", skyBottom: "#ffb45e", plat: "#8a5a38", platEdge: "#452c18", accent: "#ffde8a", hazard: "#3a7ea8" },
      platforms: [
        P(0, 830, 520, 70), P(1080, 830, 520, 70),
        P(700, 700, 48, 200), P(676, 676, 96, 24),
        P(850, 700, 48, 200), P(828, 676, 96, 24),
        P(180, 650, 280, 26), P(1140, 650, 280, 26),
        P(420, 500, 220, 24), P(960, 500, 220, 24)
      ],
      movers: [P(560, 585, 160, 22, { dx: 320, dy: 0, period: 6 })],
      hung: [{ x: 660, y: 350, w: 280, h: 24, chains: [720, 880] }],
      crates: [{ x: 380, y: 774, s: 56 }, { x: 1120, y: 774, s: 56 }, { x: 1122, y: 718, s: 56 }],
      hazards: [P(520, 852, 560, 48)],
      spawns: [{ x: 240, y: 790 }, { x: 1360, y: 790 }, { x: 320, y: 610 }, { x: 1280, y: 610 }]
    },
    {
      // Stalagmite towers on the cave floor, stalactite platforms hanging
      // from the dark on chains, and the mushroom pads still bounce.
      id: "glimmer-hollow", name: "Glimmer Hollow",
      tagline: "Giant mushrooms below, nervous stalactites above.",
      backdrop: "cave", weather: "spores",
      palette: { skyTop: "#0a0d1f", skyMid: "#182042", skyBottom: "#27355c", plat: "#5c4a78", platEdge: "#2a2140", accent: "#ff7ac8", hazard: "#8f4ae0" },
      platforms: [
        P(0, 830, 1600, 70),
        P(500, 640, 56, 190), P(470, 616, 116, 24),
        P(1050, 640, 56, 190), P(1020, 616, 116, 24),
        P(200, 655, 260, 26), P(1140, 655, 260, 26),
        P(640, 520, 320, 26),
        P(690, 240, 220, 24)
      ],
      hung: [
        { x: 380, y: 340, w: 200, h: 24, chains: [440, 520] },
        { x: 1020, y: 340, w: 200, h: 24, chains: [1080, 1160] }
      ],
      crates: [{ x: 750, y: 774, s: 52 }],
      hazards: [],
      bouncePads: [
        { x: 40, y: 818, w: 150, power: 1650 },
        { x: 1410, y: 818, w: 150, power: 1650 }
      ],
      spawns: [{ x: 330, y: 615 }, { x: 1270, y: 615 }, { x: 700, y: 480 }, { x: 900, y: 480 }]
    },
    {
      // A climbable spire rises straight out of the gear pit, elevators on
      // either side, breakable service panels, and gear crates to shove.
      id: "cogwork-spire", name: "Cogwork Spire",
      tagline: "Everything here runs like clockwork. Including the floor.",
      backdrop: "gears", weather: null,
      palette: { skyTop: "#241a10", skyMid: "#3d2c17", skyBottom: "#5c4423", plat: "#8a6a3c", platEdge: "#42311a", accent: "#ffca66", hazard: "#c9452a" },
      platforms: [
        P(0, 830, 440, 70), P(1160, 830, 440, 70),
        P(770, 560, 60, 340), P(720, 536, 160, 24),
        P(180, 620, 240, 24), P(1180, 620, 240, 24),
        P(360, 720, 120, 22), P(1120, 720, 120, 22),
        P(60, 560, 140, 22, { breakable: 120 }), P(1400, 560, 140, 22, { breakable: 120 }),
        P(660, 260, 280, 24)
      ],
      movers: [
        P(560, 720, 180, 24, { dx: 0, dy: -160, period: 5 }),
        P(880, 560, 180, 24, { dx: 0, dy: 160, period: 5 }),
        P(420, 420, 170, 22, { dx: 390, dy: 0, period: 7 })
      ],
      crates: [{ x: 120, y: 774, s: 56 }, { x: 1430, y: 774, s: 56 }],
      hazards: [P(440, 850, 720, 50)],
      spawns: [{ x: 220, y: 790 }, { x: 1380, y: 790 }, { x: 300, y: 580 }, { x: 1300, y: 580 }]
    },
    {
      // Two crystal monoliths to wall-kick between, breakable crystal panes
      // that ricochet-happy bullets chew through, and a crystal crate.
      id: "prism-caverns", name: "Prism Caverns",
      tagline: "The crystals love bullets. Every shot ricochets twice more.",
      backdrop: "crystal", weather: "sparkle", bulletBounceBonus: 2,
      palette: { skyTop: "#160a2e", skyMid: "#2c1657", skyBottom: "#4a2a85", plat: "#b48ae8", platEdge: "#57329c", accent: "#7ffcff", hazard: "#ff5fa8" },
      platforms: [
        P(0, 830, 1600, 70),
        P(150, 600, 200, 230),
        P(1330, 540, 180, 290),
        P(450, 680, 180, 24),
        P(720, 560, 220, 24),
        P(1010, 660, 200, 24),
        P(600, 380, 160, 22),
        P(900, 300, 180, 22),
        P(480, 300, 110, 18, { breakable: 90 }),
        P(1120, 380, 110, 18, { breakable: 90 })
      ],
      crates: [{ x: 1180, y: 774, s: 54 }],
      hazards: [],
      spawns: [{ x: 250, y: 560 }, { x: 1420, y: 500 }, { x: 540, y: 640 }, { x: 1110, y: 620 }]
    },
    {
      // Gingerbread towers of two heights, a licorice-hung platform, a
      // breakable cookie shelf, and gumdrop crates by the syrup pools.
      id: "sugar-rush", name: "Sugar Rush",
      tagline: "Gumdrops bounce. Syrup doesn't. The cookie shelf is load-bearing — briefly.",
      backdrop: "candy", weather: "confetti",
      palette: { skyTop: "#7fc4ff", skyMid: "#c9e8ff", skyBottom: "#ffd9ec", plat: "#ff8fbe", platEdge: "#b04a7c", accent: "#fff3a0", hazard: "#8a4a2a" },
      platforms: [
        P(0, 830, 1600, 70),
        P(600, 560, 64, 270), P(560, 536, 144, 26),
        P(940, 640, 64, 190), P(900, 616, 144, 26),
        P(160, 655, 300, 26), P(1140, 655, 300, 26),
        P(330, 420, 190, 24), P(1080, 400, 190, 24),
        P(760, 450, 160, 22, { breakable: 100 })
      ],
      hung: [{ x: 660, y: 290, w: 240, h: 24, chains: [700, 860] }],
      crates: [{ x: 240, y: 776, s: 54 }, { x: 1310, y: 776, s: 54 }],
      hazards: [],
      bouncePads: [
        { x: 16, y: 818, w: 120, power: 1500 },
        { x: 1464, y: 818, w: 120, power: 1500 }
      ],
      zones: [P(140, 790, 240, 40, { type: "syrup" }), P(1220, 790, 240, 40, { type: "syrup" })],
      spawns: [{ x: 280, y: 615 }, { x: 1320, y: 615 }, { x: 620, y: 496 }, { x: 950, y: 576 }]
    },
    {
      // Cloud islands around a lightning-rod tower: the best perch on the map
      // is also the one the storm likes most.
      id: "thunderhead-perch", name: "Thunderhead Perch",
      tagline: "Lovely view from the rod. Periodic smiting.",
      backdrop: "storm", weather: "rain", lightning: { period: 4.4, warn: 1.1 }, windX: 170, gustPeriod: 4,
      palette: { skyTop: "#151a2c", skyMid: "#2a3450", skyBottom: "#48587a", plat: "#a8b4d0", platEdge: "#525f80", accent: "#ffe95e", hazard: "#ffe95e" },
      platforms: [
        P(80, 760, 380, 30), P(1140, 760, 380, 30),
        P(600, 690, 400, 30),
        P(770, 430, 56, 260), P(725, 406, 146, 24),
        P(280, 560, 260, 26), P(1060, 560, 260, 26),
        P(400, 290, 220, 24), P(980, 290, 220, 24)
      ],
      hazards: [],
      spawns: [{ x: 260, y: 720 }, { x: 1340, y: 720 }, { x: 410, y: 520 }, { x: 1190, y: 520 }]
    },
    {
      // A central bookcase divides the room; climb it, drop the chandelier,
      // or shove the book crates into a barricade.
      id: "midnight-library", name: "Midnight Library",
      tagline: "Shhh. The chandelier section is closing early.",
      backdrop: "library", weather: "dust",
      palette: { skyTop: "#1c1208", skyMid: "#33200e", skyBottom: "#4d3018", plat: "#7a4a26", platEdge: "#3a2210", accent: "#ffb84d", hazard: "#c9452a" },
      platforms: [
        P(0, 830, 1600, 70),
        P(90, 655, 250, 175),
        P(1260, 655, 250, 175),
        P(740, 470, 120, 360), P(700, 446, 200, 24),
        P(430, 660, 220, 26), P(950, 660, 220, 26),
        P(1050, 560, 140, 22),
        P(240, 440, 220, 24), P(1140, 440, 220, 24)
      ],
      movers: [P(500, 740, 140, 20, { dx: 0, dy: -150, period: 6 })],
      hung: [{ x: 670, y: 300, w: 260, h: 22, chains: [735, 865] }],
      crates: [{ x: 600, y: 776, s: 54 }, { x: 1000, y: 776, s: 54 }],
      hazards: [],
      spawns: [{ x: 210, y: 615 }, { x: 1390, y: 615 }, { x: 540, y: 620 }, { x: 1060, y: 620 }]
    },
    {
      // A torii gate spans the koi pond: climb the pillars, duel on the beam,
      // or cut the temple bell down onto the bridge below.
      id: "koi-temple", name: "Koi Temple",
      tagline: "The koi are judging your aim. The bell is within earshot.",
      backdrop: "temple", weather: "petals",
      palette: { skyTop: "#ffd9e8", skyMid: "#ffc2cf", skyBottom: "#ffe9c9", plat: "#c93b35", platEdge: "#6e1c18", accent: "#ffd700", hazard: "#3a8ac9" },
      platforms: [
        P(0, 830, 560, 70), P(1040, 830, 560, 70),
        P(620, 760, 360, 28),
        P(500, 530, 52, 300), P(1048, 530, 52, 300),
        P(450, 506, 700, 26),
        P(180, 655, 280, 26), P(1140, 655, 280, 26),
        P(720, 340, 160, 22)
      ],
      hung: [{ x: 730, y: 600, w: 140, h: 26, chains: [800], anchorY: 532 }],
      crates: [{ x: 120, y: 774, s: 56 }, { x: 1420, y: 774, s: 56 }],
      hazards: [P(560, 852, 480, 48)],
      spawns: [{ x: 260, y: 790 }, { x: 1340, y: 790 }, { x: 520, y: 466 }, { x: 1080, y: 466 }]
    },
    {
      // Conveyor lanes around a central data pillar, with breakable firewall
      // panels on the floor lanes and data-cube crates to reposition.
      id: "neon-grid", name: "Neon Grid",
      tagline: "Welcome to the mainframe. Firewalls sold separately, breakage included.",
      backdrop: "grid", weather: "stars", bulletBounceBonus: 1,
      palette: { skyTop: "#0b0518", skyMid: "#1e0a38", skyBottom: "#3d0f5c", plat: "#1f1433", platEdge: "#08050f", accent: "#00f0ff", hazard: "#ff2ea8" },
      platforms: [
        P(0, 830, 1600, 70),
        P(150, 650, 320, 24, { conveyor: -160 }),
        P(1130, 650, 320, 24, { conveyor: 160 }),
        P(770, 540, 60, 290), P(700, 516, 200, 24),
        P(500, 630, 36, 200, { breakable: 130 }),
        P(1064, 630, 36, 200, { breakable: 130 }),
        P(360, 400, 240, 24, { conveyor: 160 }),
        P(1000, 400, 240, 24, { conveyor: -160 }),
        P(680, 260, 240, 24)
      ],
      crates: [{ x: 300, y: 776, s: 52 }, { x: 1250, y: 776, s: 52 }],
      hazards: [],
      spawns: [{ x: 260, y: 790 }, { x: 1340, y: 790 }, { x: 760, y: 480 }, { x: 840, y: 480 }]
    },
    {
      // Colosseum walls with spectator perches, crumbling floor rings, a
      // hanging cage to drop, and bone crates for improvised cover.
      id: "bonepit-arena", name: "Bonepit Arena",
      tagline: "The crowd is long dead. The floor is following their example.",
      backdrop: "colosseum", weather: "dust",
      palette: { skyTop: "#5c2c1a", skyMid: "#a05a2c", skyBottom: "#d9a05c", plat: "#d8c9a8", platEdge: "#7a6a48", accent: "#ffefc9", hazard: "#b03a2a" },
      platforms: [
        P(0, 830, 1600, 70),
        P(60, 570, 70, 260), P(20, 546, 150, 24),
        P(1470, 570, 70, 260), P(1430, 546, 150, 24),
        P(170, 650, 280, 26, { phase: { period: 4.6, offset: 0, duty: 0.65 } }),
        P(1150, 650, 280, 26, { phase: { period: 4.6, offset: 2.3, duty: 0.65 } }),
        P(620, 580, 360, 26),
        P(390, 430, 220, 24, { phase: { period: 4.6, offset: 1.15, duty: 0.65 } }),
        P(990, 430, 220, 24, { phase: { period: 4.6, offset: 3.45, duty: 0.65 } }),
        P(680, 290, 240, 24)
      ],
      hung: [{ x: 690, y: 430, w: 220, h: 24, chains: [740, 860], anchorY: 314 }],
      crates: [{ x: 560, y: 774, s: 56 }, { x: 990, y: 774, s: 56 }],
      hazards: [P(740, 812, 120, 18)],
      spawns: [{ x: 260, y: 790 }, { x: 1340, y: 790 }, { x: 520, y: 790 }, { x: 1080, y: 790 }]
    },
    {
      // An asymmetric summit: staircase ridge on the left, a sheer ice wall at
      // the cliff edge, and ice crates skating in the wind.
      id: "aurora-summit", name: "Aurora Summit",
      tagline: "Ice underfoot, wind overhead, and the sky showing off.",
      backdrop: "aurora", weather: "snow", windX: 190, gustPeriod: 7,
      palette: { skyTop: "#071224", skyMid: "#0e2c44", skyBottom: "#1c4a5c", plat: "#dff2ff", platEdge: "#6f9cbf", accent: "#5effc3", hazard: "#7fb8ff" },
      platforms: [
        P(0, 830, 500, 70, { ice: true }), P(1100, 830, 500, 70, { ice: true }),
        P(500, 520, 64, 310, { ice: true }), P(460, 496, 144, 24, { ice: true }),
        P(60, 655, 240, 26, { ice: true }),
        P(200, 490, 220, 24, { ice: true }),
        P(340, 330, 200, 24, { ice: true }),
        P(600, 740, 400, 28, { ice: true }),
        P(720, 540, 180, 24, { ice: true }),
        P(700, 300, 200, 24, { ice: true }),
        P(1120, 655, 260, 24, { ice: true }),
        P(1060, 400, 200, 24, { ice: true })
      ],
      crates: [{ x: 60, y: 776, s: 54 }, { x: 1480, y: 776, s: 54 }],
      hazards: [P(500, 852, 600, 48)],
      spawns: [{ x: 240, y: 790 }, { x: 1360, y: 790 }, { x: 700, y: 700 }, { x: 900, y: 700 }]
    },
    {
      // Junk piles you can climb, a crate stack mid-field, a wrecked chassis
      // hanging from the crane, and one rusted-through platform.
      id: "rustyard", name: "Rustyard",
      tagline: "One crane, zero safety inspections, and a chassis on borrowed time.",
      backdrop: "junkyard", weather: "sparks",
      palette: { skyTop: "#2a1e2c", skyMid: "#4d3038", skyBottom: "#8a5038", plat: "#6e5a4a", platEdge: "#33281e", accent: "#ffb35c", hazard: "#d9622e" },
      platforms: [
        P(0, 830, 1600, 70),
        P(220, 650, 180, 180),
        P(1200, 620, 260, 130),
        P(480, 600, 220, 26), P(900, 600, 220, 26),
        P(300, 440, 220, 24, { breakable: 110 }),
        P(1080, 440, 220, 24),
        P(680, 330, 240, 24)
      ],
      movers: [P(620, 480, 180, 22, { dx: -180, dy: -140, period: 6.5 })],
      hung: [{ x: 900, y: 400, w: 200, h: 26, chains: [950, 1050] }],
      crates: [
        { x: 700, y: 774, s: 56 }, { x: 702, y: 716, s: 56 },
        { x: 460, y: 774, s: 56 }, { x: 1060, y: 774, s: 52 }
      ],
      hazards: [P(700, 812, 200, 18)],
      spawns: [{ x: 270, y: 610 }, { x: 1330, y: 580 }, { x: 590, y: 560 }, { x: 1010, y: 560 }]
    },
    {
      // Hexwood trunks with canopy perches, a wisp-hung platform, and the
      // teleporting shortcuts the wisps insist on keeping.
      id: "hexwood-glade", name: "Hexwood Glade",
      tagline: "The wisps know a shortcut. Step in, pop out somewhere weirder.",
      backdrop: "hexwood", weather: "wisps",
      palette: { skyTop: "#160f24", skyMid: "#26183d", skyBottom: "#3d2a52", plat: "#4a3a5c", platEdge: "#221833", accent: "#8dff6e", hazard: "#63d43a" },
      platforms: [
        P(0, 830, 700, 70), P(900, 830, 700, 70),
        P(360, 560, 70, 270), P(300, 536, 190, 26),
        P(1170, 560, 70, 270), P(1110, 536, 190, 26),
        P(180, 655, 260, 26),
        P(560, 700, 180, 24), P(860, 620, 180, 24),
        P(700, 320, 220, 24)
      ],
      hung: [{ x: 690, y: 460, w: 220, h: 24, chains: [750, 850], anchorY: 344 }],
      crates: [{ x: 600, y: 774, s: 52 }, { x: 950, y: 774, s: 52 }],
      hazards: [],
      teleporters: [
        { ax: 90, ay: 775, bx: 1510, by: 775 },
        { ax: 800, ay: 760, bx: 800, by: 250 }
      ],
      spawns: [{ x: 240, y: 790 }, { x: 1360, y: 790 }, { x: 380, y: 496 }, { x: 1190, y: 496 }]
    },
    {
      // A wreck beached mid-channel: hull to hide behind, mast to climb, a
      // crow's nest above the waterline, and cargo crates that float.
      id: "tidal-wreck", name: "Tidal Wreck",
      tagline: "The tide is coming in. The crow's nest is not a suggestion.",
      backdrop: "wreck", weather: "rain", tide: { min: 870, max: 640, period: 14 },
      palette: { skyTop: "#1e2c38", skyMid: "#33505c", skyBottom: "#5c8a8a", plat: "#7a5c3a", platEdge: "#3a2c1c", accent: "#7fe8d0", hazard: "#2a6e8f" },
      platforms: [
        P(0, 830, 420, 70), P(1180, 830, 420, 70),
        P(560, 700, 480, 30),
        P(620, 730, 360, 90),
        P(780, 420, 40, 280), P(720, 396, 160, 24),
        P(180, 620, 260, 26), P(1160, 620, 260, 26),
        P(380, 440, 200, 24), P(1020, 440, 200, 24),
        P(660, 560, 140, 22, { breakable: 100 })
      ],
      crates: [{ x: 480, y: 770, s: 56 }, { x: 1070, y: 770, s: 56 }],
      hazards: [],
      spawns: [{ x: 210, y: 790 }, { x: 1390, y: 790 }, { x: 700, y: 660 }, { x: 900, y: 660 }]
    },
    {
      // A two-tier pagoda mid-river, lantern platforms drifting upward, and
      // firework crates that were probably stored too close to the duel.
      id: "lantern-festival", name: "Lantern Festival",
      tagline: "Ride the lanterns. Mind the river. Make a wish.",
      backdrop: "festival", weather: "lanterns",
      palette: { skyTop: "#160f2c", skyMid: "#33184d", skyBottom: "#6e2a52", plat: "#8f3a3a", platEdge: "#421a1a", accent: "#ffcf5e", hazard: "#2a5e8f" },
      platforms: [
        P(0, 830, 480, 70), P(1120, 830, 480, 70),
        P(760, 600, 80, 230),
        P(690, 576, 220, 26),
        P(775, 440, 50, 136),
        P(715, 416, 170, 24),
        P(170, 655, 260, 26), P(1170, 655, 260, 26)
      ],
      movers: [
        P(540, 730, 150, 22, { dx: 0, dy: -90, period: 4.5 }),
        P(910, 730, 150, 22, { dx: 0, dy: -90, period: 4.5, phase: 0.5 }),
        P(380, 450, 150, 22, { dx: 0, dy: -80, period: 5.5 }),
        P(1070, 450, 150, 22, { dx: 0, dy: -80, period: 5.5, phase: 0.5 })
      ],
      crates: [{ x: 150, y: 774, s: 52 }, { x: 1400, y: 774, s: 52 }],
      hazards: [P(480, 852, 640, 48)],
      spawns: [{ x: 240, y: 790 }, { x: 1360, y: 790 }, { x: 300, y: 615 }, { x: 1300, y: 615 }]
    },
    {
      // Elevators over the plasma with a service pylon to wall-kick off and
      // two hung maintenance steps you can cut out from under someone.
      id: "magma-lift", name: "Ion Lift",
      tagline: "Going up. The plasma floor is non-negotiable.",
      backdrop: "forge", weather: "sparkle",
      palette: { skyTop: "#0a0e17", skyMid: "#14263d", skyBottom: "#1f4266", plat: "#3a4152", platEdge: "#171c26", accent: "#5fc8ff", hazard: "#3d7bff" },
      platforms: [
        P(60, 760, 280, 30), P(1260, 760, 280, 30),
        P(200, 560, 240, 24), P(1160, 560, 240, 24),
        P(620, 430, 360, 26),
        P(770, 456, 60, 200),
        P(360, 300, 220, 24), P(1020, 300, 220, 24),
        P(700, 180, 200, 24)
      ],
      movers: [
        P(600, 700, 170, 24, { dx: 0, dy: -180, period: 6 }),
        P(840, 520, 170, 24, { dx: 0, dy: 180, period: 6 })
      ],
      hung: [
        { x: 420, y: 640, w: 160, h: 22, chains: [500], anchorY: 324 },
        { x: 1040, y: 640, w: 160, h: 22, chains: [1120], anchorY: 324 }
      ],
      hazards: [P(0, 855, 1600, 45)],
      spawns: [{ x: 200, y: 720 }, { x: 1400, y: 720 }, { x: 470, y: 260 }, { x: 1130, y: 260 }]
    },
    {
      // Marble columns prop up the cloud islands, and a harp platform hangs
      // mid-sky waiting for someone to cut the strings.
      id: "cloud-nine", name: "Cloud Nine",
      tagline: "Gravity is on vacation. The clouds bounce back.",
      backdrop: "heaven", weather: "feathers", gravityScale: 0.7,
      palette: { skyTop: "#5fa8e8", skyMid: "#9fd0f5", skyBottom: "#fff3d9", plat: "#ffffff", platEdge: "#a8c4d9", accent: "#ffd700", hazard: "#ff8f5e" },
      platforms: [
        P(120, 760, 340, 30), P(1140, 760, 340, 30),
        P(620, 680, 360, 28),
        P(300, 540, 240, 24), P(1060, 540, 240, 24),
        P(390, 564, 60, 196), P(1150, 564, 60, 196),
        P(640, 420, 320, 24),
        P(420, 260, 220, 24), P(960, 260, 220, 24)
      ],
      hung: [{ x: 690, y: 310, w: 220, h: 24, chains: [740, 860] }],
      hazards: [],
      bouncePads: [
        { x: 660, y: 668, w: 130, power: 1300 },
        { x: 180, y: 748, w: 110, power: 1300 },
        { x: 1310, y: 748, w: 110, power: 1300 }
      ],
      spawns: [{ x: 290, y: 720 }, { x: 1310, y: 720 }, { x: 530, y: 220 }, { x: 1070, y: 220 }]
    },
    {
      // High-wire poles with tiny top plates, twin trapezes on single chains,
      // and prop crates between the trampolines.
      id: "static-circus", name: "Static Circus",
      tagline: "Trampolines below, trapezes above. The show never stops.",
      backdrop: "circus", weather: "confetti",
      palette: { skyTop: "#2c0f1e", skyMid: "#571c33", skyBottom: "#8f2a3d", plat: "#f5e2c9", platEdge: "#8f5a3a", accent: "#ff4d6d", hazard: "#d92a4a" },
      platforms: [
        P(0, 830, 1600, 70),
        P(480, 470, 44, 360), P(440, 446, 124, 22),
        P(1076, 470, 44, 360), P(1036, 446, 124, 22),
        P(180, 655, 280, 26), P(1140, 655, 280, 26),
        P(620, 550, 360, 26)
      ],
      hung: [
        { x: 660, y: 330, w: 130, h: 20, chains: [725] },
        { x: 810, y: 330, w: 130, h: 20, chains: [875] }
      ],
      crates: [{ x: 340, y: 774, s: 56 }, { x: 1200, y: 774, s: 56 }],
      hazards: [],
      bouncePads: [
        { x: 20, y: 818, w: 150, power: 1650 },
        { x: 1430, y: 818, w: 150, power: 1650 }
      ],
      teleporters: [{ ax: 80, ay: 775, bx: 1520, by: 775 }],
      spawns: [{ x: 300, y: 615 }, { x: 1300, y: 615 }, { x: 500, y: 406 }, { x: 1100, y: 406 }]
    },
    {
      // Obelisks rise from the islands, rune plates shatter when shot, and a
      // shard platform hangs over the void on cuttable chains.
      id: "voidfall", name: "Voidfall",
      tagline: "Islands blink in and out. The void keeps whatever falls.",
      backdrop: "void", weather: "stars", gravityScale: 0.8,
      palette: { skyTop: "#08030f", skyMid: "#1c0a33", skyBottom: "#33125c", plat: "#3a2a5c", platEdge: "#160d29", accent: "#b45cff", hazard: "#ff2ea8" },
      platforms: [
        P(160, 700, 300, 28), P(1140, 700, 300, 28),
        P(250, 480, 54, 220), P(210, 456, 134, 22),
        P(1290, 480, 54, 220), P(1250, 456, 134, 22),
        P(620, 600, 360, 28),
        P(360, 440, 220, 24, { phase: { period: 5.5, offset: 0, duty: 0.7 } }),
        P(1020, 440, 220, 24, { phase: { period: 5.5, offset: 2.75, duty: 0.7 } }),
        P(680, 280, 240, 24),
        P(480, 320, 130, 20, { breakable: 90 }),
        P(990, 320, 130, 20, { breakable: 90 })
      ],
      hung: [{ x: 700, y: 440, w: 200, h: 24, chains: [760, 840], anchorY: 304 }],
      hazards: [],
      teleporters: [{ ax: 260, ay: 560, bx: 1340, by: 560 }],
      spawns: [{ x: 310, y: 660 }, { x: 1290, y: 660 }, { x: 420, y: 660 }, { x: 1180, y: 660 }]
    }
  ];

  // arena backdrop images (optional)
  const arenaImages = new Map();
  for (const lv of LEVELS) {
    const img = new Image();
    img.onload = () => arenaImages.set(lv.id, img);
    img.onerror = () => {};
    img.src = `assets/images/arenas/${lv.id}.png`;
  }

  window.ROUNDERS.LEVELS = LEVELS;
  window.ROUNDERS.arenaImage = { has: id => arenaImages.has(id), get: id => arenaImages.get(id) || null };
})();
