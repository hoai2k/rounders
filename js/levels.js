// Rounders — 25 arenas, each with its own theme, palette, weather, and
// signature mechanics. World space is 1600×900; the engine renders backdrops
// procedurally (or from assets/images/arenas/<id>.png when present).
//
// Feature reference:
//   platforms[]  {x,y,w,h, ice, conveyor(px/s), phase:{period,offset,duty}}
//   movers[]     platform oscillating (x,y)→(x+dx,y+dy) over `period` seconds
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
      id: "neon-skyline", name: "Neon Skyline",
      tagline: "Rain-slick rooftops. The billboards keep moving — so should you.",
      backdrop: "city", weather: "rain",
      palette: { skyTop: "#141134", skyMid: "#33175c", skyBottom: "#a12a6e", plat: "#2b2b45", platEdge: "#12121f", accent: "#ff5fd0", hazard: "#ff2e63" },
      platforms: [
        P(0, 830, 1600, 70),
        P(120, 660, 340, 26), P(1140, 660, 340, 26),
        P(620, 560, 360, 26, { conveyor: 150 }),
        P(240, 420, 300, 24, { conveyor: -130 }),
        P(1060, 420, 300, 24, { conveyor: 130 }),
        P(660, 280, 280, 24)
      ],
      hazards: [P(720, 812, 160, 18)],
      spawns: [{ x: 250, y: 620 }, { x: 1350, y: 620 }, { x: 380, y: 380 }, { x: 1220, y: 380 }]
    },
    {
      id: "ember-foundry", name: "Ember Foundry",
      tagline: "The forge never sleeps. The catwalks, however, take breaks.",
      backdrop: "forge", weather: "embers",
      palette: { skyTop: "#1a0c0a", skyMid: "#521b0c", skyBottom: "#a33a10", plat: "#4a3a35", platEdge: "#241a17", accent: "#ff9e3d", hazard: "#ff6316" },
      platforms: [
        P(0, 830, 380, 70), P(1220, 830, 380, 70),
        P(500, 700, 240, 26), P(860, 700, 240, 26),
        P(180, 560, 280, 24), P(1140, 560, 280, 24),
        P(560, 470, 480, 26, { phase: { period: 5.2, offset: 0, duty: 0.68 } }),
        P(330, 320, 240, 24, { phase: { period: 5.2, offset: 2.6, duty: 0.68 } }),
        P(1030, 320, 240, 24, { phase: { period: 5.2, offset: 1.3, duty: 0.68 } })
      ],
      hazards: [P(380, 850, 840, 50)],
      spawns: [{ x: 180, y: 790 }, { x: 1420, y: 790 }, { x: 320, y: 520 }, { x: 1280, y: 520 }]
    },
    {
      id: "frostbite-observatory", name: "Frostbite Observatory",
      tagline: "Every surface is ice. Book your stopping distance in advance.",
      backdrop: "mountains", weather: "snow",
      palette: { skyTop: "#0e1e33", skyMid: "#1d3f5c", skyBottom: "#5f92b0", plat: "#cfe8f5", platEdge: "#5f88a3", accent: "#8fd8ff", hazard: "#7fb8ff" },
      platforms: [
        P(0, 830, 1600, 70, { ice: true }),
        P(160, 665, 330, 26, { ice: true }), P(1110, 665, 330, 26, { ice: true }),
        P(600, 590, 400, 26, { ice: true }),
        P(320, 440, 260, 24, { ice: true }), P(1020, 440, 260, 24, { ice: true }),
        P(660, 300, 280, 24, { ice: true })
      ],
      hazards: [],
      spawns: [{ x: 260, y: 790 }, { x: 1340, y: 790 }, { x: 450, y: 400 }, { x: 1150, y: 400 }]
    },
    {
      id: "verdant-overgrowth", name: "Verdant Overgrowth",
      tagline: "The temple lost. The vines won. They make excellent trampolines.",
      backdrop: "jungle", weather: "leaves",
      palette: { skyTop: "#0d2b1a", skyMid: "#1c4d2a", skyBottom: "#67a03a", plat: "#6b4a2f", platEdge: "#33241a", accent: "#9be24f", hazard: "#d4482f" },
      platforms: [
        P(0, 830, 1600, 70),
        P(140, 650, 300, 26), P(1160, 650, 300, 26),
        P(620, 610, 360, 26),
        P(360, 450, 240, 24), P(1000, 450, 240, 24),
        P(660, 290, 280, 24)
      ],
      hazards: [],
      bouncePads: [
        { x: 520, y: 818, w: 130, power: 1550 },
        { x: 950, y: 818, w: 130, power: 1550 },
        { x: 700, y: 598, w: 90, power: 1350 }
      ],
      spawns: [{ x: 240, y: 610 }, { x: 1360, y: 610 }, { x: 460, y: 410 }, { x: 1140, y: 410 }]
    },
    {
      id: "orbital-drift", name: "Orbital Drift",
      tagline: "Low gravity, no floor, and a very long way down.",
      backdrop: "space", weather: "stars", gravityScale: 0.55,
      palette: { skyTop: "#05060f", skyMid: "#101a38", skyBottom: "#1c2f57", plat: "#8b93b8", platEdge: "#3d4460", accent: "#63e8ff", hazard: "#ff5f8f" },
      platforms: [
        P(180, 720, 320, 28), P(1100, 720, 320, 28),
        P(620, 620, 360, 28),
        P(140, 460, 260, 24), P(1200, 460, 260, 24),
        P(500, 360, 220, 24), P(880, 360, 220, 24),
        P(680, 180, 240, 24)
      ],
      hazards: [],
      spawns: [{ x: 340, y: 680 }, { x: 1260, y: 680 }, { x: 610, y: 320 }, { x: 990, y: 320 }]
    },
    {
      id: "sirocco-canyon", name: "Sirocco Canyon",
      tagline: "The wind changes its mind every few seconds. Bullets listen to it.",
      backdrop: "canyon", weather: "dust", windX: 260, gustPeriod: 5.5,
      palette: { skyTop: "#3f1f3d", skyMid: "#b3542e", skyBottom: "#e8a04b", plat: "#a4643a", platEdge: "#5c3a20", accent: "#ffd27a", hazard: "#d44a2f" },
      platforms: [
        P(0, 830, 620, 70), P(980, 830, 620, 70),
        P(700, 740, 200, 26),
        P(150, 620, 280, 24), P(1170, 620, 280, 24),
        P(560, 540, 200, 24), P(840, 540, 200, 24),
        P(300, 400, 220, 24), P(1080, 400, 220, 24),
        P(680, 330, 240, 24)
      ],
      hazards: [P(620, 850, 360, 50)],
      spawns: [{ x: 260, y: 790 }, { x: 1340, y: 790 }, { x: 410, y: 360 }, { x: 1190, y: 360 }]
    },
    {
      id: "saltwind-boardwalk", name: "Saltwind Boardwalk",
      tagline: "Sunset, string lights, and one very punctual gondola.",
      backdrop: "pier", weather: null,
      palette: { skyTop: "#3a2c6e", skyMid: "#c65f7a", skyBottom: "#ffb45e", plat: "#8a5a38", platEdge: "#452c18", accent: "#ffde8a", hazard: "#3a7ea8" },
      platforms: [
        P(0, 830, 520, 70), P(1080, 830, 520, 70),
        P(180, 650, 280, 26), P(1140, 650, 280, 26),
        P(620, 700, 360, 26),
        P(420, 500, 220, 24), P(960, 500, 220, 24),
        P(660, 350, 280, 24)
      ],
      movers: [P(560, 560, 160, 22, { dx: 320, dy: 0, period: 6 })],
      hazards: [P(520, 852, 560, 48)],
      spawns: [{ x: 240, y: 790 }, { x: 1360, y: 790 }, { x: 320, y: 610 }, { x: 1280, y: 610 }]
    },
    {
      id: "glimmer-hollow", name: "Glimmer Hollow",
      tagline: "Giant mushrooms. Extremely bouncy. Scientists are thrilled.",
      backdrop: "cave", weather: "spores",
      palette: { skyTop: "#0a0d1f", skyMid: "#182042", skyBottom: "#27355c", plat: "#5c4a78", platEdge: "#2a2140", accent: "#ff7ac8", hazard: "#8f4ae0" },
      platforms: [
        P(0, 830, 1600, 70),
        P(200, 640, 260, 26), P(1140, 640, 260, 26),
        P(640, 520, 320, 26),
        P(380, 380, 220, 24), P(1000, 380, 220, 24),
        P(690, 240, 220, 24)
      ],
      hazards: [],
      bouncePads: [
        { x: 100, y: 818, w: 150, power: 1500 },
        { x: 725, y: 818, w: 150, power: 1750 },
        { x: 1350, y: 818, w: 150, power: 1500 }
      ],
      spawns: [{ x: 330, y: 600 }, { x: 1270, y: 600 }, { x: 490, y: 340 }, { x: 1110, y: 340 }]
    },
    {
      id: "cogwork-spire", name: "Cogwork Spire",
      tagline: "Everything here runs like clockwork. Including the floor.",
      backdrop: "gears", weather: null,
      palette: { skyTop: "#241a10", skyMid: "#3d2c17", skyBottom: "#5c4423", plat: "#8a6a3c", platEdge: "#42311a", accent: "#ffca66", hazard: "#c9452a" },
      platforms: [
        P(0, 830, 440, 70), P(1160, 830, 440, 70),
        P(180, 620, 240, 24), P(1180, 620, 240, 24),
        P(660, 260, 280, 24)
      ],
      movers: [
        P(560, 720, 180, 24, { dx: 0, dy: -160, period: 5 }),
        P(880, 560, 180, 24, { dx: 0, dy: 160, period: 5 }),
        P(420, 420, 170, 22, { dx: 390, dy: 0, period: 7 })
      ],
      hazards: [P(440, 850, 720, 50)],
      spawns: [{ x: 220, y: 790 }, { x: 1380, y: 790 }, { x: 300, y: 580 }, { x: 1300, y: 580 }]
    },
    {
      id: "prism-caverns", name: "Prism Caverns",
      tagline: "The crystals love bullets. Every shot ricochets twice more.",
      backdrop: "crystal", weather: "sparkle", bulletBounceBonus: 2,
      palette: { skyTop: "#160a2e", skyMid: "#2c1657", skyBottom: "#4a2a85", plat: "#b48ae8", platEdge: "#57329c", accent: "#7ffcff", hazard: "#ff5fa8" },
      platforms: [
        P(0, 830, 1600, 70),
        P(130, 660, 300, 26), P(1170, 660, 300, 26),
        P(600, 580, 400, 26),
        P(340, 430, 240, 24), P(1020, 430, 240, 24),
        P(670, 290, 260, 24)
      ],
      hazards: [],
      spawns: [{ x: 250, y: 620 }, { x: 1350, y: 620 }, { x: 450, y: 390 }, { x: 1150, y: 390 }]
    },
    {
      id: "sugar-rush", name: "Sugar Rush",
      tagline: "Gumdrops bounce. Syrup doesn't. Choose your footing wisely.",
      backdrop: "candy", weather: "confetti",
      palette: { skyTop: "#7fc4ff", skyMid: "#c9e8ff", skyBottom: "#ffd9ec", plat: "#ff8fbe", platEdge: "#b04a7c", accent: "#fff3a0", hazard: "#8a4a2a" },
      platforms: [
        P(0, 830, 1600, 70),
        P(160, 650, 300, 26), P(1140, 650, 300, 26),
        P(620, 560, 360, 26),
        P(370, 410, 220, 24), P(1010, 410, 220, 24),
        P(680, 270, 240, 24)
      ],
      hazards: [],
      bouncePads: [
        { x: 540, y: 818, w: 120, power: 1500 },
        { x: 940, y: 818, w: 120, power: 1500 }
      ],
      zones: [P(120, 790, 260, 40, { type: "syrup" }), P(1220, 790, 260, 40, { type: "syrup" })],
      spawns: [{ x: 280, y: 610 }, { x: 1320, y: 610 }, { x: 470, y: 370 }, { x: 1130, y: 370 }]
    },
    {
      id: "thunderhead-perch", name: "Thunderhead Perch",
      tagline: "Lovely view. Periodic smiting.",
      backdrop: "storm", weather: "rain", lightning: { period: 4.4, warn: 1.1 },
      palette: { skyTop: "#151a2c", skyMid: "#2a3450", skyBottom: "#48587a", plat: "#a8b4d0", platEdge: "#525f80", accent: "#ffe95e", hazard: "#ffe95e" },
      platforms: [
        P(80, 760, 380, 30), P(1140, 760, 380, 30),
        P(600, 690, 400, 30),
        P(280, 560, 260, 26), P(1060, 560, 260, 26),
        P(620, 430, 360, 26),
        P(400, 290, 220, 24), P(980, 290, 220, 24)
      ],
      hazards: [],
      spawns: [{ x: 260, y: 720 }, { x: 1340, y: 720 }, { x: 410, y: 520 }, { x: 1190, y: 520 }]
    },
    {
      id: "midnight-library", name: "Midnight Library",
      tagline: "Shhh. The dueling section is on the top shelf.",
      backdrop: "library", weather: "dust",
      palette: { skyTop: "#1c1208", skyMid: "#33200e", skyBottom: "#4d3018", plat: "#7a4a26", platEdge: "#3a2210", accent: "#ffb84d", hazard: "#c9452a" },
      platforms: [
        P(0, 830, 1600, 70),
        P(90, 640, 250, 190),
        P(1260, 640, 250, 190),
        P(430, 660, 220, 26), P(950, 660, 220, 26),
        P(620, 500, 360, 26),
        P(240, 440, 220, 24), P(1140, 440, 220, 24),
        P(680, 320, 240, 24)
      ],
      movers: [P(720, 740, 160, 20, { dx: 0, dy: -150, period: 6 })],
      hazards: [],
      spawns: [{ x: 210, y: 600 }, { x: 1390, y: 600 }, { x: 540, y: 620 }, { x: 1060, y: 620 }]
    },
    {
      id: "koi-temple", name: "Koi Temple",
      tagline: "The koi are judging your aim. Stay out of their pond.",
      backdrop: "temple", weather: "petals",
      palette: { skyTop: "#ffd9e8", skyMid: "#ffc2cf", skyBottom: "#ffe9c9", plat: "#c93b35", platEdge: "#6e1c18", accent: "#ffd700", hazard: "#3a8ac9" },
      platforms: [
        P(0, 830, 560, 70), P(1040, 830, 560, 70),
        P(620, 760, 360, 28),
        P(180, 640, 280, 26), P(1140, 640, 280, 26),
        P(560, 560, 200, 24), P(840, 560, 200, 24),
        P(320, 430, 220, 24), P(1060, 430, 220, 24),
        P(660, 330, 280, 24)
      ],
      hazards: [P(560, 852, 480, 48)],
      spawns: [{ x: 260, y: 790 }, { x: 1340, y: 790 }, { x: 420, y: 390 }, { x: 1180, y: 390 }]
    },
    {
      id: "neon-grid", name: "Neon Grid",
      tagline: "Welcome to the mainframe. The lanes push, the walls answer back.",
      backdrop: "grid", weather: "stars", bulletBounceBonus: 1,
      palette: { skyTop: "#0b0518", skyMid: "#1e0a38", skyBottom: "#3d0f5c", plat: "#1f1433", platEdge: "#08050f", accent: "#00f0ff", hazard: "#ff2ea8" },
      platforms: [
        P(0, 830, 1600, 70, { conveyor: 120 }),
        P(150, 650, 320, 24, { conveyor: -160 }),
        P(1130, 650, 320, 24, { conveyor: 160 }),
        P(620, 550, 360, 24),
        P(360, 400, 240, 24, { conveyor: 160 }),
        P(1000, 400, 240, 24, { conveyor: -160 }),
        P(680, 260, 240, 24)
      ],
      hazards: [],
      spawns: [{ x: 260, y: 610 }, { x: 1340, y: 610 }, { x: 470, y: 360 }, { x: 1130, y: 360 }]
    },
    {
      id: "bonepit-arena", name: "Bonepit Arena",
      tagline: "The crowd is long dead. The floor is following their example.",
      backdrop: "colosseum", weather: "dust",
      palette: { skyTop: "#5c2c1a", skyMid: "#a05a2c", skyBottom: "#d9a05c", plat: "#d8c9a8", platEdge: "#7a6a48", accent: "#ffefc9", hazard: "#b03a2a" },
      platforms: [
        P(0, 830, 1600, 70),
        P(170, 650, 280, 26, { phase: { period: 4.6, offset: 0, duty: 0.65 } }),
        P(1150, 650, 280, 26, { phase: { period: 4.6, offset: 2.3, duty: 0.65 } }),
        P(620, 580, 360, 26),
        P(390, 430, 220, 24, { phase: { period: 4.6, offset: 1.15, duty: 0.65 } }),
        P(990, 430, 220, 24, { phase: { period: 4.6, offset: 3.45, duty: 0.65 } }),
        P(680, 290, 240, 24)
      ],
      hazards: [P(740, 812, 120, 18)],
      spawns: [{ x: 260, y: 790 }, { x: 1340, y: 790 }, { x: 700, y: 540 }, { x: 900, y: 540 }]
    },
    {
      id: "aurora-summit", name: "Aurora Summit",
      tagline: "Ice underfoot, wind overhead, and the sky showing off.",
      backdrop: "aurora", weather: "snow", windX: 190, gustPeriod: 7,
      palette: { skyTop: "#071224", skyMid: "#0e2c44", skyBottom: "#1c4a5c", plat: "#dff2ff", platEdge: "#6f9cbf", accent: "#5effc3", hazard: "#7fb8ff" },
      platforms: [
        P(0, 830, 500, 70, { ice: true }), P(1100, 830, 500, 70, { ice: true }),
        P(600, 740, 400, 28, { ice: true }),
        P(220, 620, 260, 24, { ice: true }), P(1120, 620, 260, 24, { ice: true }),
        P(540, 540, 200, 24, { ice: true }), P(860, 540, 200, 24, { ice: true }),
        P(340, 400, 200, 24, { ice: true }), P(1060, 400, 200, 24, { ice: true }),
        P(700, 300, 200, 24, { ice: true })
      ],
      hazards: [P(500, 852, 600, 48)],
      spawns: [{ x: 240, y: 790 }, { x: 1360, y: 790 }, { x: 440, y: 360 }, { x: 1160, y: 360 }]
    },
    {
      id: "rustyard", name: "Rustyard",
      tagline: "One crane, zero safety inspections.",
      backdrop: "junkyard", weather: "sparks",
      palette: { skyTop: "#2a1e2c", skyMid: "#4d3038", skyBottom: "#8a5038", plat: "#6e5a4a", platEdge: "#33281e", accent: "#ffb35c", hazard: "#d9622e" },
      platforms: [
        P(0, 830, 1600, 70),
        P(120, 660, 300, 90),
        P(1180, 660, 300, 90),
        P(480, 600, 220, 26), P(900, 600, 220, 26),
        P(300, 440, 220, 24), P(1080, 440, 220, 24),
        P(680, 330, 240, 24)
      ],
      movers: [P(620, 480, 180, 22, { dx: 180, dy: -140, period: 6.5 })],
      hazards: [P(700, 812, 200, 18)],
      spawns: [{ x: 270, y: 620 }, { x: 1330, y: 620 }, { x: 590, y: 560 }, { x: 1010, y: 560 }]
    },
    {
      id: "hexwood-glade", name: "Hexwood Glade",
      tagline: "The wisps know a shortcut. Step in, pop out somewhere weirder.",
      backdrop: "hexwood", weather: "wisps",
      palette: { skyTop: "#160f24", skyMid: "#26183d", skyBottom: "#3d2a52", plat: "#4a3a5c", platEdge: "#221833", accent: "#8dff6e", hazard: "#63d43a" },
      platforms: [
        P(0, 830, 1600, 70),
        P(140, 650, 300, 26), P(1160, 650, 300, 26),
        P(620, 590, 360, 26),
        P(360, 430, 220, 24), P(1020, 430, 220, 24),
        P(680, 280, 240, 24)
      ],
      hazards: [],
      teleporters: [
        { ax: 90, ay: 760, bx: 1510, by: 760 },
        { ax: 800, ay: 200, bx: 800, by: 700 }
      ],
      spawns: [{ x: 280, y: 610 }, { x: 1320, y: 610 }, { x: 460, y: 390 }, { x: 1140, y: 390 }]
    },
    {
      id: "tidal-wreck", name: "Tidal Wreck",
      tagline: "The tide is coming in. Higher ground is not a suggestion.",
      backdrop: "wreck", weather: "rain", tide: { min: 870, max: 640, period: 14 },
      palette: { skyTop: "#1e2c38", skyMid: "#33505c", skyBottom: "#5c8a8a", plat: "#7a5c3a", platEdge: "#3a2c1c", accent: "#7fe8d0", hazard: "#2a6e8f" },
      platforms: [
        P(0, 830, 420, 70), P(1180, 830, 420, 70),
        P(560, 750, 220, 26), P(830, 750, 220, 26),
        P(180, 620, 260, 26), P(1160, 620, 260, 26),
        P(620, 560, 360, 26),
        P(400, 420, 220, 24), P(980, 420, 220, 24),
        P(680, 290, 240, 24)
      ],
      hazards: [],
      spawns: [{ x: 210, y: 790 }, { x: 1390, y: 790 }, { x: 510, y: 380 }, { x: 1090, y: 380 }]
    },
    {
      id: "lantern-festival", name: "Lantern Festival",
      tagline: "Ride the lanterns. Mind the river. Make a wish.",
      backdrop: "festival", weather: "lanterns",
      palette: { skyTop: "#160f2c", skyMid: "#33184d", skyBottom: "#6e2a52", plat: "#8f3a3a", platEdge: "#421a1a", accent: "#ffcf5e", hazard: "#2a5e8f" },
      platforms: [
        P(0, 830, 480, 70), P(1120, 830, 480, 70),
        P(170, 640, 260, 26), P(1170, 640, 260, 26),
        P(640, 560, 320, 26),
        P(690, 330, 220, 24)
      ],
      movers: [
        P(540, 730, 150, 22, { dx: 0, dy: -90, period: 4.5 }),
        P(910, 730, 150, 22, { dx: 0, dy: -90, period: 4.5, phase: 0.5 }),
        P(380, 450, 150, 22, { dx: 0, dy: -80, period: 5.5 }),
        P(1070, 450, 150, 22, { dx: 0, dy: -80, period: 5.5, phase: 0.5 })
      ],
      hazards: [P(480, 852, 640, 48)],
      spawns: [{ x: 240, y: 790 }, { x: 1360, y: 790 }, { x: 300, y: 600 }, { x: 1300, y: 600 }]
    },
    {
      id: "magma-lift", name: "Magma Lift",
      tagline: "Going up. The floor lava is non-negotiable.",
      backdrop: "forge", weather: "embers",
      palette: { skyTop: "#170c0c", skyMid: "#38160e", skyBottom: "#701f0c", plat: "#57493f", platEdge: "#291f1a", accent: "#ffd23d", hazard: "#ff7316" },
      platforms: [
        P(60, 760, 280, 30), P(1260, 760, 280, 30),
        P(200, 560, 240, 24), P(1160, 560, 240, 24),
        P(620, 430, 360, 26),
        P(360, 300, 220, 24), P(1020, 300, 220, 24),
        P(700, 180, 200, 24)
      ],
      movers: [
        P(600, 700, 170, 24, { dx: 0, dy: -220, period: 6 }),
        P(840, 480, 170, 24, { dx: 0, dy: 220, period: 6 })
      ],
      hazards: [P(0, 855, 1600, 45)],
      spawns: [{ x: 200, y: 720 }, { x: 1400, y: 720 }, { x: 470, y: 260 }, { x: 1130, y: 260 }]
    },
    {
      id: "cloud-nine", name: "Cloud Nine",
      tagline: "Gravity is on vacation. The clouds bounce back.",
      backdrop: "heaven", weather: "feathers", gravityScale: 0.7,
      palette: { skyTop: "#5fa8e8", skyMid: "#9fd0f5", skyBottom: "#fff3d9", plat: "#ffffff", platEdge: "#a8c4d9", accent: "#ffd700", hazard: "#ff8f5e" },
      platforms: [
        P(120, 760, 340, 30), P(1140, 760, 340, 30),
        P(620, 680, 360, 28),
        P(300, 540, 240, 24), P(1060, 540, 240, 24),
        P(640, 420, 320, 24),
        P(420, 260, 220, 24), P(960, 260, 220, 24)
      ],
      hazards: [],
      bouncePads: [
        { x: 660, y: 668, w: 130, power: 1300 },
        { x: 180, y: 748, w: 110, power: 1300 },
        { x: 1310, y: 748, w: 110, power: 1300 }
      ],
      spawns: [{ x: 290, y: 720 }, { x: 1310, y: 720 }, { x: 530, y: 220 }, { x: 1070, y: 220 }]
    },
    {
      id: "static-circus", name: "Static Circus",
      tagline: "Trampolines below, cannons on the wings. The show never stops.",
      backdrop: "circus", weather: "confetti",
      palette: { skyTop: "#2c0f1e", skyMid: "#571c33", skyBottom: "#8f2a3d", plat: "#f5e2c9", platEdge: "#8f5a3a", accent: "#ff4d6d", hazard: "#d92a4a" },
      platforms: [
        P(0, 830, 1600, 70),
        P(180, 640, 280, 26), P(1140, 640, 280, 26),
        P(620, 550, 360, 26),
        P(400, 400, 220, 24), P(980, 400, 220, 24),
        P(690, 260, 220, 24)
      ],
      hazards: [],
      bouncePads: [
        { x: 590, y: 818, w: 180, power: 1650 },
        { x: 830, y: 818, w: 180, power: 1650 }
      ],
      teleporters: [{ ax: 80, ay: 750, bx: 1520, by: 750 }],
      spawns: [{ x: 300, y: 600 }, { x: 1300, y: 600 }, { x: 500, y: 360 }, { x: 1100, y: 360 }]
    },
    {
      id: "voidfall", name: "Voidfall",
      tagline: "Islands blink in and out. The void keeps whatever falls.",
      backdrop: "void", weather: "stars", gravityScale: 0.8,
      palette: { skyTop: "#08030f", skyMid: "#1c0a33", skyBottom: "#33125c", plat: "#3a2a5c", platEdge: "#160d29", accent: "#b45cff", hazard: "#ff2ea8" },
      platforms: [
        P(160, 700, 300, 28), P(1140, 700, 300, 28),
        P(620, 600, 360, 28),
        P(360, 440, 220, 24, { phase: { period: 5.5, offset: 0, duty: 0.7 } }),
        P(1020, 440, 220, 24, { phase: { period: 5.5, offset: 2.75, duty: 0.7 } }),
        P(680, 280, 240, 24)
      ],
      hazards: [],
      teleporters: [{ ax: 100, ay: 400, bx: 1500, by: 400 }],
      spawns: [{ x: 310, y: 660 }, { x: 1290, y: 660 }, { x: 720, y: 560 }, { x: 880, y: 560 }]
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
