// Rounders — engine. Content lives in js/cards.js, js/levels.js, js/characters.js.
(() => {
  "use strict";

  const { CARDS, RARITIES, CHARACTERS, LEVELS, drawCharacter, setProceduralCharacters, arenaImage } = window.ROUNDERS;
  const { cardArt, cardArtUrl, cardScene, cardSceneUrl } = window.ROUNDERS;
  const str = window.ROUNDERS.str;
  const GP = window.ROUNDERS.GAMEPLAY;

  // Fills every [data-str] / [data-str-html] node from js/strings.js so all UI
  // wording can be edited in one file.
  function applyStrings() {
    for (const el of document.querySelectorAll("[data-str]")) el.textContent = str(el.dataset.str);
    for (const el of document.querySelectorAll("[data-str-html]")) el.innerHTML = str(el.dataset.strHtml);
    for (const [id, key] of [["iconHow", "icons.instructions"], ["iconSettings", "icons.settings"], ["iconFullscreen", "icons.fullscreen"]]) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.title = str(key);
      el.setAttribute("aria-label", str(key));
    }
  }

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const hud = document.getElementById("hud");
  const toast = document.getElementById("toast");
  const menu = document.getElementById("menu");
  const titleScreen = document.getElementById("title");
  const iconBar = document.getElementById("iconBar");
  const nowPlayingBar = document.getElementById("nowPlaying");
  const startBtn = () => document.getElementById("startBtn");
  const settingsPanel = document.getElementById("settings");
  const howPanel = document.getElementById("how");
  const draftPanel = document.getElementById("draft");
  const draftGrid = document.getElementById("draftGrid");
  const draftTitle = document.getElementById("draftTitle");
  const joinSlots = document.getElementById("joinSlots");
  const battleSplash = document.getElementById("battleSplash");
  const battleKicker = document.getElementById("battleKicker");
  const battleTitle = document.getElementById("battleTitle");
  const battleSub = document.getElementById("battleSub");
  const arenaBanner = document.getElementById("arenaBanner");
  const arenaName = document.getElementById("arenaName");
  const arenaTag = document.getElementById("arenaTag");
  const pausePanel = document.getElementById("pausePanel");

  const settings = {
    playerCount: 4,
    botDifficulty: 2,
    scoreLimit: 5,
    draftCount: 4,
    levelChoice: -1, // -1 random
    hazards: true,
    proceduralCharacters: false,
    haptics: true,
    shake: true,
    music: true,
    musicVolume: 0.2,
    rarityWeights: Object.fromEntries(Object.entries(RARITIES).map(([k, v]) => [k, v.weight])),
    // Choose Cards: which cards can be drafted, and how their odds are rolled.
    //   default  — every card, weighted by the rarity rates below
    //   equalize — every card, all equally likely (rarity rates ignored)
    //   choose   — only the cards left enabled in the grid, rarity-weighted
    cardMode: "default",
    // Card ids the player has switched off. Kept whatever the mode is, so
    // flipping to Default to see everything and back to Choose later finds the
    // same selection waiting.
    disabledCards: new Set()
  };

  // Only the Choose Cards state persists — it is the one setting a player builds
  // up over sessions rather than dials in for a match.
  const CARD_PREF_KEY = "rounders.cards.v1";
  const CARD_MODES = ["default", "equalize", "choose"];

  function loadCardPrefs() {
    try {
      const raw = localStorage.getItem(CARD_PREF_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (CARD_MODES.includes(saved.mode)) settings.cardMode = saved.mode;
      if (Array.isArray(saved.disabled)) {
        const known = new Set(CARDS.map(c => c.id));
        // ids from an older card set are dropped, so a renamed card comes back on
        settings.disabledCards = new Set(saved.disabled.filter(id => known.has(id)));
      }
    } catch { /* private mode, file:// with no storage — defaults are fine */ }
  }

  function saveCardPrefs() {
    try {
      localStorage.setItem(CARD_PREF_KEY, JSON.stringify({
        mode: settings.cardMode,
        disabled: [...settings.disabledCards]
      }));
    } catch { /* nothing to do but keep the choice for this session */ }
  }

  const world = {
    width: 1600,
    height: 900,
    gravity: GP.world.gravity,
    airDrag: GP.world.airDrag,
    floorDrag: GP.world.floorDrag,
    state: "title",
    panelReturn: "menu",
    musicDuck: 1,     // volume multiplier: 1 normal, DUCK.* while paused/drafting
    lockedThisFrame: false,
    winner: null,
    roundWinner: null,
    drafters: [],
    botPicks: [],
    cardShows: [],
    levelIndex: 0,
    lastLevelIndex: -1,
    roundFreeze: 0,
    shake: 0,
    time: 0,
    menuIndex: 0,
    quickIndex: -1,   // icon-row cursor; -1 is nothing selected
    joinedThisFrame: false,
    pausedThisFrame: false,
    windPhase: Math.random() * 10,
    lastStep: 1 / 60,
    dt: 1 / 60,
    draftTimer: 30,
    draftBaseTitle: "",
    lightningTimer: 0,
    lightningX: 0,
    lightningFlash: 0,
    tideLevel: 900,
    weather: []
  };

  const playerColors = ["#ff5277", "#52d7ff", "#ffe169", "#74f08b"];

  const keyboardSchemes = [
    { left: "KeyA", right: "KeyD", up: "KeyW", down: "KeyS", jump: "KeyW", shoot: "KeyF", block: "KeyG", special: "KeyH", label: "Keyboard 1 (WASD + F/G)" },
    { left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp", down: "ArrowDown", jump: "ArrowUp", shoot: "Slash", block: "Period", special: "Comma", label: "Keyboard 2 (Arrows + / .)" }
  ];
  // any directional key on a scheme takes that keyboard's slot
  const schemeJoinKeys = sc => [sc.left, sc.right, sc.up, sc.down];

  const keys = new Set();
  const pressed = new Set();
  const lastPadButtons = new Map();
  const lobbySlots = [];

  let players = [];
  let bullets = [];
  let particles = [];
  let fields = [];
  let bolts = []; // lightning polylines {points, life, color}
  // Lifesteal in flight: a mote of health torn out of whoever was hit, chasing
  // the shooter down. The heal lands when the mote ARRIVES, not on impact, so
  // the number you see is the energy you watched come home.
  let siphons = [];
  let crackers = [];
  // short-lived text that rises off a fighter: heal ticks and the like
  let floats = [];
  function floatText(x, y, text, color) {
    floats.push({ x, y, text, color, life: 0.9, maxLife: 0.9 });
    if (floats.length > 60) floats.shift();
  }
  let decoys = []; // Body Double stand-ins {x, y, hp, owner, character, color, life}
  // Destructible / dynamic arena props, rebuilt every round from level data:
  //   breaks — Map(level platform → {hp,max,dead}) for platforms with `breakable`
  //   hungs  — platforms suspended on shootable chains; cut every chain and they drop
  //   crates — pushable, shootable boxes players can climb and knock around
  // holes: Map<source platform/mover/hung object, [{lx, ly, r}]> in platform-LOCAL
  // coordinates, so a hole bored in a moving platform rides along with it.
  const props = { breaks: new Map(), hungs: [], crates: [], slabs: [], holes: new Map() };

  // Chronoshift rewinds the WHOLE board, so the world keeps a short film of
  // itself: one frame per tick, capped at REWIND_MAX seconds of game time.
  // Rewinding replays that film backwards at half speed, which is why holding
  // the button for 6 real seconds undoes 3 seconds of the fight.
  const REWIND_MAX = 3;          // seconds of game time that can be undone
  const REWIND_RATE = 0.5;       // history consumed per second of real time
  let history = [];
  const rewind = { active: false, owner: null, cursor: 0, spent: 0, budget: 0, carry: 0 };
  let last = performance.now();
  let toastTimer = 0;
  let audioCtx = null;
  let masterGain = null;
  let musicAudio = null;
  let hudRefs = [];

  const MUSIC = window.ROUNDERS.MUSIC;
  const ARENA_MUSIC = window.ROUNDERS.ARENA_MUSIC || {};
  const musicState = {
    index: MUSIC.titleIndex,
    context: "menu", // "menu" (title/lobby/settings) or "battle"
    preload: null,   // { index, el } streamed ahead so a skip starts instantly
    started: false,
    boardId: null,   // arena whose playlist is running, so a repeat round doesn't restart it
    pairNext: -1,    // the opening song's partner: what plays when the opener ends
    boardPlayed: new Set() // tracks already heard on this board (no repeats until dry)
  };
  // Music volume multipliers. The card screen only steps back a little — the
  // board's song keeps running under the draft and into the next board.
  const DUCK = { none: 1, draft: 0.55, paused: 0.22 };

  // ------------------------------------------------------------------ stats
  // A fighter's REAL trigger and reload timings. Cards multiply these stats
  // down without limit — four stacked Blood Moneys reach 0.0004s — so the
  // engine floors them at the point of use (js/gameplay.js gun.minFireDelay /
  // gun.minReload). The stats themselves are left untouched, so a card still
  // reports what it does; it simply stops buying speed past the floor.
  const fireDelayOf = p => Math.max(GP.gun.minFireDelay, p.stats.fireDelay);
  const reloadOf = p => Math.max(GP.gun.minReload, p.stats.reload);

  function defaultStats() {
    // Baselines live in js/gameplay.js — edit numbers there, not here.
    const F = GP.fighter, G = GP.gun, B = GP.block;
    return {
      maxHp: F.maxHp, speed: F.speed, accel: F.accel, airAccel: F.airAccel, brake: F.brake, jump: F.jump,
      damage: G.damage, bulletSpeed: G.bulletSpeed, bulletGravity: G.bulletGravity, bulletDrag: G.bulletDrag,
      bulletRestitution: G.bulletRestitution, bulletSize: G.bulletSize,
      maxAmmo: G.maxAmmo, reload: G.reload, fireDelay: G.fireDelay,
      blockCooldown: B.cooldown, blockDuration: B.duration,
      radius: F.radius, pellets: G.pellets, spread: G.spread,
      bounces: 0, explosive: 0, homing: 0, grow: 0, pierce: 0,
      poison: 0, burn: 0, chill: 0, chain: 0, shards: 0, popcorn: 0,
      groundHug: 0, voidPull: 0,
      lifesteal: 0, thorns: 0, regen: 0, rage: 0, adrenaline: 0,
      echoBlock: 0, blockPush: 0, blockDash: 0, warpBlock: 0, stormBlock: 0,
      guardian: 0, revives: 0, extraJumps: 0, kbResist: 0, shield: 0, ironHull: 0, hover: 0, hoard: 0, glass: 0,
      goldenShot: 0, killHeal: false,
      active: null, activeCooldown: 10,
      // gap-audit wave (CARD-GAP-AUDIT.md): offense & bullets
      kbDeal: 0, bankShot: 0, stink: 0, dazzle: 0, silence: 0, wallPierce: 0, holePunch: 0,
      steer: 0, helium: 0, boomerang: 0, encore: 0, burstFire: 0,
      bloodMoney: 0, underdog: 0,
      // block toolkit
      blockReload: 0, healField: 0, frostBlock: 0, sawBlock: 0,
      empowerBlock: 0, autoBlock: 0, brickBlock: 0, decoy: 0, blockRefresh: 0,
      // reload / sustain / triggered
      scavenge: 0, reloadPulse: 0, sugarRush: 0, hotStreak: 0, overflow: 0, floatTime: 0,
      decay: 0, freshCoat: 0, chillAura: 0, stomp: 0, jumpBlast: 0, repel: 0, chargeJump: 0
    };
  }

  function makePlayer(i, slot) {
    const ch = CHARACTERS[slot ? slot.charIndex % CHARACTERS.length : i % CHARACTERS.length];
    return {
      id: i,
      name: ch.name,
      character: ch,
      color: playerColors[i],
      x: 0, y: 0, vx: 0, vy: 0,
      aimX: i % 2 === 0 ? 1 : -1, aimY: 0,
      hp: 100, score: 0, alive: true,
      grounded: false, groundPlatform: null, jumpsLeft: 1,
      wallDir: 0, wallTimer: 0, wallCooldown: 0, botWallClimb: 0, wallJumps: 0,
      ammo: 3, reloadTimer: 0, fireTimer: 0,
      blockTimer: 0, blockCooldown: 0, echoTimer: 0,
      activeCooldown: 0, teleWasInside: false, rewindLeft: REWIND_MAX,
      poisonTimer: 0, poisonDps: 0,
      burnTimer: 0, burnDps: 0,
      chillTimer: 0,
      teleCooldown: 0,
      guardianCharges: 0, roundRevives: 0,
      sugarTimer: 0, stunTimer: 0, silenceTimer: 0, dazzleImmune: 0, floatLeft: 0,
      sawGrace: 0, stompGrace: 0, refreshLock: 0, pulseClock: 0,
      decayPool: 0, decayAttacker: null, freshPool: 0, hotShield: 0, overShield: 0,
      empowerShot: 0, steeredBullet: null, burstQueue: [], encoreQueue: [],
      trail: [],
      cards: [],
      stats: defaultStats(),
      input: emptyInput(),
      scheme: slot && slot.type === "keyboard" ? keyboardSchemes[slot.schemeIndex] : null,
      gamepadIndex: slot && slot.type === "pad" ? slot.gamepadIndex : null,
      bot: slot ? slot.type === "bot" : false,
      botSeed: Math.random() * 1000,
      botJumpLock: 0,
      botStrafe: Math.random() < 0.5 ? -1 : 1,
      draftLock: false,
      spawnGrace: 0.9,
      hazardGrace: 0, pitBounces: 0,
      blinkClock: Math.random() * 4
    };
  }

  // One frame of the whole board, cheap enough to keep 180 of.
  function snapshot(dt) {
    return {
      dt,
      players: players.map(p => ({
        x: p.x, y: p.y, vx: p.vx, vy: p.vy, hp: p.hp, alive: p.alive,
        aimX: p.aimX, aimY: p.aimY, facing: p.facing, ammo: p.ammo,
        reloadTimer: p.reloadTimer, blockTimer: p.blockTimer, hitFlash: p.hitFlash,
        poisonTimer: p.poisonTimer, burnTimer: p.burnTimer, chillTimer: p.chillTimer,
        shield: p.shield, temp: p.hotShield, over: p.overShield, decayPool: p.decayPool
      })),
      bullets: bullets.map(b => ({
        ref: b, x: b.x, y: b.y, vx: b.vx, vy: b.vy, life: b.life, damage: b.damage
      })),
      crates: props.crates.map(c => ({ ref: c, x: c.x, y: c.y, vx: c.vx, vy: c.vy, hp: c.hp, dead: c.dead })),
      slabs: props.slabs.map(sl => ({ ref: sl, x: sl.x, y: sl.y, angle: sl.angle, dead: sl.dead }))
    };
  }

  function restore(frame) {
    frame.players.forEach((snap, i) => {
      const p = players[i];
      if (!p) return;
      Object.assign(p, {
        x: snap.x, y: snap.y, vx: snap.vx, vy: snap.vy, hp: snap.hp, alive: snap.alive,
        aimX: snap.aimX, aimY: snap.aimY, facing: snap.facing, ammo: snap.ammo,
        reloadTimer: snap.reloadTimer, blockTimer: snap.blockTimer,
        poisonTimer: snap.poisonTimer, burnTimer: snap.burnTimer, chillTimer: snap.chillTimer,
        shield: snap.shield, hotShield: snap.temp, overShield: snap.over, decayPool: snap.decayPool
      });
    });
    // bullets that had already broken come back; ones not yet fired go away
    bullets = frame.bullets.map(sb => Object.assign(sb.ref, {
      x: sb.x, y: sb.y, vx: sb.vx, vy: sb.vy, life: sb.life, damage: sb.damage
    }));
    for (const sc of frame.crates) Object.assign(sc.ref, { x: sc.x, y: sc.y, vx: sc.vx, vy: sc.vy, hp: sc.hp, dead: sc.dead });
    for (const ss of frame.slabs) Object.assign(ss.ref, { x: ss.x, y: ss.y, angle: ss.angle, dead: ss.dead });
  }

  function emptyInput() {
    return {
      move: 0, aimX: 0, aimY: 0,
      jump: false, shoot: false, block: false, special: false, pause: false,
      jumpPressed: false, shootPressed: false, blockPressed: false, specialPressed: false, pausePressed: false,
      menuPressed: false, leftPressed: false, rightPressed: false
    };
  }

  // ------------------------------------------------------------------ level
  function currentLevel() { return LEVELS[world.levelIndex]; }

  function pickNextLevel() {
    if (settings.levelChoice >= 0) {
      world.levelIndex = settings.levelChoice;
      return;
    }
    let next = Math.floor(Math.random() * LEVELS.length);
    if (LEVELS.length > 1) {
      while (next === world.lastLevelIndex) next = Math.floor(Math.random() * LEVELS.length);
    }
    world.levelIndex = next;
    world.lastLevelIndex = next;
  }

  // Live platform list for this frame: statics (phase-filtered) + movers with velocity.
  let platCache = { t: -1, level: null, list: null };
  function activePlatforms(level, t) {
    if (platCache.t === t && platCache.level === level) return platCache.list;
    const list = [];
    for (const p of level.platforms) {
      const brk = props.breaks.get(p);
      if (brk && brk.dead) continue;
      if (p.phase) {
        const cyc = ((t + p.phase.offset) % p.phase.period) / p.phase.period;
        if (cyc > p.phase.duty) continue;
        list.push({ ...p, vxDelta: 0, vyDelta: 0, phaseCyc: cyc, breakRef: brk, holes: props.holes.get(p), holeSrc: p });
      } else {
        list.push({ ...p, vxDelta: 0, vyDelta: 0, breakRef: brk, holes: props.holes.get(p), holeSrc: p });
      }
    }
    // Hung platforms are static while they hang; once every chain is cut they
    // leave this list and live on as free-tumbling slabs (see updateSlabs).
    for (const hg of props.hungs) {
      if (hg.dead) continue;
      list.push({ x: hg.x, y: hg.y, w: hg.w, h: hg.h, ice: hg.ice, vxDelta: 0, vyDelta: 0, hungRef: hg, holes: props.holes.get(hg), holeSrc: hg });
    }
    for (const c of props.crates) {
      if (c.dead) continue;
      list.push({ x: c.x, y: c.y, w: c.w, h: c.h, vxDelta: 0, vyDelta: 0, isCrate: true, crateRef: c });
    }
    for (const m of level.movers || []) {
      const ph = (m.phase || 0) * Math.PI * 2;
      const s = (Math.sin((t / m.period) * Math.PI * 2 + ph) + 1) / 2;
      const sPrev = (Math.sin(((t - world.lastStep) / m.period) * Math.PI * 2 + ph) + 1) / 2;
      const x = m.x + m.dx * s, y = m.y + m.dy * s;
      list.push({ ...m, x, y, vxDelta: m.dx * (s - sPrev), vyDelta: m.dy * (s - sPrev), isMover: true, holes: props.holes.get(m), holeSrc: m });
    }
    platCache = { t, level, list };
    return list;
  }

  // ------------------------------------------------------------------ holes
  // Breakthrough bores permanent gaps in terrain. Holes are stored in the source
  // object's local space and read back through the live platform each frame,
  // so a hole in a mover travels with it.

  // Bore a square bite out of `platform` at world point (wx, wy).
  //
  // A hole is a RECTANGLE of removed material, not a doorway: a single shot
  // takes a square bite out of the face it strikes, so anything thicker than
  // one bite needs a second shot to finish the job. Overlapping bites merge
  // into one opening, which is what deepens a hole into a passage.
  function punchHole(platform, wx, wy, size, dir = 0) {
    const src = platform.holeSrc;
    if (!src || platform.isCrate) return false;
    const list = props.holes.get(src) || [];
    const w = Math.min(size, platform.w);
    const h = Math.min(size, platform.h);
    const lx = clamp(wx - platform.x - w / 2, 0, Math.max(0, platform.w - w));
    const ly = clamp(wy - platform.y - h / 2, 0, Math.max(0, platform.h - h));
    const bite = { lx, ly, w, h };
    // merge with anything it touches, so successive shots chew deeper
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const o = list[i];
      const touches = bite.lx <= o.lx + o.w + 2 && bite.lx + bite.w >= o.lx - 2 &&
                      bite.ly <= o.ly + o.h + 2 && bite.ly + bite.h >= o.ly - 2;
      if (!touches) continue;
      const x0 = Math.min(bite.lx, o.lx), y0 = Math.min(bite.ly, o.ly);
      bite.w = Math.max(bite.lx + bite.w, o.lx + o.w) - x0;
      bite.h = Math.max(bite.ly + bite.h, o.ly + o.h) - y0;
      bite.lx = x0; bite.ly = y0;
      list.splice(i, 1);
    }
    if (list.length > 10) return false;          // a wall can only be so much lace
    list.push(bite);
    props.holes.set(src, list);
    // the material has to go somewhere: it comes out as wall-coloured chunks,
    // which is the whole visual for the break — the gap itself is drawn as
    // nothing at all
    rubble(wx, wy, size, dir);
    return true;
  }

  // Does this opening go all the way through the slab's thickness?
  function holeSpans(platform, h) {
    return platform.w >= platform.h
      ? h.ly <= 2 && h.ly + h.h >= platform.h - 2      // a floor: a shaft top to bottom
      : h.lx <= 2 && h.lx + h.w >= platform.w - 2;     // a wall: a tunnel side to side
  }

  // Is (wx, wy) inside removed material?
  //
  // Bullets travel through ANY excavation, including a half-finished niche —
  // that is how a second shot reaches the back of the bite and holes right
  // through. Players only pass an opening that spans the slab, so nobody can
  // sink into a pocket and fall out of the world.
  function inHole(platform, wx, wy, rad = 0, requireSpan = false) {
    const list = platform.holes;
    if (!list || !list.length) return false;
    for (const h of list) {
      if (requireSpan && !holeSpans(platform, h)) continue;
      const x0 = platform.x + h.lx, y0 = platform.y + h.ly;
      const pad = rad * 0.62;
      if (wx > x0 + pad && wx < x0 + h.w - pad && wy > y0 + pad && wy < y0 + h.h - pad) return true;
      // an opening narrower than the body still lets it through along the
      // thickness, so only the long axis is measured against the body
      if (!requireSpan && wx > x0 && wx < x0 + h.w && wy > y0 && wy < y0 + h.h) return true;
    }
    return false;
  }

  function phaseAlpha(p, t) {
    if (!p.phase) return 1;
    const cyc = ((t + p.phase.offset) % p.phase.period) / p.phase.period;
    if (cyc > p.phase.duty) return 0.12;
    const remain = p.phase.duty - cyc;
    if (remain < 0.18) return 0.4 + 0.5 * Math.abs(Math.sin(t * 18)); // warning blink
    return 1;
  }

  function levelGravity() { return world.gravity * (currentLevel().gravityScale || 1); }

  function windForce() {
    const lv = currentLevel();
    if (!lv.windX) return 0;
    return lv.windX * Math.sin((world.time / (lv.gustPeriod || 6)) * Math.PI * 2 + world.windPhase);
  }

  // ------------------------------------------------------------------ lobby
  function slotJoined(type, key) {
    return lobbySlots.some(s => (type === "keyboard" && s.type === "keyboard" && s.schemeIndex === key) ||
      (type === "pad" && s.type === "pad" && s.gamepadIndex === key));
  }

  function freeCharIndex() {
    const taken = new Set(lobbySlots.map(s => s.charIndex));
    const free = CHARACTERS.map((_, i) => i).filter(i => !taken.has(i));
    if (!free.length) return Math.floor(Math.random() * CHARACTERS.length);
    return free[Math.floor(Math.random() * free.length)];
  }

  function addSlot(slot) {
    if (lobbySlots.length >= settings.playerCount) {
      showToast(str("menu.lobbyFull"));
      return null;
    }
    slot.charIndex = freeCharIndex();
    slot.locked = slot.type === "bot";
    lobbySlots.push(slot);
    ensureAudio();
    sfx("card");
    world.joinedThisFrame = true;
    renderLobby();
    return slot;
  }

  function removeSlot(slot) {
    const i = lobbySlots.indexOf(slot);
    if (i >= 0) lobbySlots.splice(i, 1);
    renderLobby();
  }

  function cycleSlotChar(slot, dir) {
    const taken = new Set(lobbySlots.filter(s => s !== slot).map(s => s.charIndex));
    let next = slot.charIndex;
    for (let i = 0; i < CHARACTERS.length; i += 1) {
      next = (next + dir + CHARACTERS.length) % CHARACTERS.length;
      if (!taken.has(next)) break;
    }
    slot.charIndex = next;
    sfx("jump");
    renderLobby();
  }

  function updateLobby(pads) {
    if (world.state !== "menu") return;
    // Sampled before the join pass: a pad that is not in the lobby yet is
    // joining with this press, not asking for a bot.
    const wantsBot = pressed.has("KeyY") ||
      pads.some(pad => buttonEdge(pad, 3) && slotJoined("pad", pad.index));
    // keyboard joins: any of WASD (player 1) or the arrow keys (player 2)
    keyboardSchemes.forEach((scheme, i) => {
      if (slotJoined("keyboard", i)) return;
      if (schemeJoinKeys(scheme).some(k => pressed.has(k)) || pressed.has(scheme.shoot)) {
        addSlot({ type: "keyboard", schemeIndex: i, label: scheme.label });
      }
    });
    // pad joins: any button
    for (const pad of pads) {
      const anyPressed = pad.buttons.some((_, i) => buttonEdge(pad, i));
      if (anyPressed && !slotJoined("pad", pad.index)) {
        addSlot({ type: "pad", gamepadIndex: pad.index, label: pad.id.split("(")[0].trim() || `Controller ${pad.index + 1}` });
      }
    }
    // Y takes an open slot as a bot (needs someone in the lobby first)
    if (wantsBot && lobbySlots.length >= 1 && lobbySlots.length < settings.playerCount) {
      addBot();
      world.joinedThisFrame = true;
    }

    // While an icon is picked with the bumpers, the lobby lets go of A/B and
    // left/right: those belong to the icon row until it is stepped off.
    if (world.quickIndex >= 0) return;

    // per-slot input: cycle / lock / leave
    for (const slot of [...lobbySlots]) {
      if (slot.type === "bot") continue;
      let left = false, right = false, lock = false, leave = false;
      if (slot.type === "keyboard") {
        const sc = keyboardSchemes[slot.schemeIndex];
        left = pressed.has(sc.left);
        right = pressed.has(sc.right);
        lock = pressed.has(sc.shoot) && !world.joinedThisFrame;
        leave = pressed.has(sc.block);
      } else {
        const pad = getPadByIndex(pads, slot.gamepadIndex);
        if (pad) {
          left = buttonEdge(pad, 14) || axisEdge(pad, 0, -1);
          right = buttonEdge(pad, 15) || axisEdge(pad, 0, 1);
          lock = (buttonEdge(pad, 0) || buttonEdge(pad, 2) || buttonEdge(pad, 7)) && !world.joinedThisFrame;
          leave = buttonEdge(pad, 1) || buttonEdge(pad, 6);
        }
      }
      if (leave) {
        if (slot.locked) { slot.locked = false; renderLobby(); }
        else removeSlot(slot);
        continue;
      }
      if (!slot.locked && left) cycleSlotChar(slot, -1);
      if (!slot.locked && right) cycleSlotChar(slot, 1);
      if (lock && !slot.locked) {
        slot.locked = true;
        world.lockedThisFrame = true;
        sfx("card");
        renderLobby();
      }
    }
  }

  function renderLobby() {
    const cells = [];
    for (let i = 0; i < settings.playerCount; i += 1) {
      const slot = lobbySlots[i];
      if (!slot) {
        cells.push(`
          <article class="join-slot empty pickable" data-slot="${i}" role="button" tabindex="-1">
            <div class="slot-portrait empty-portrait">?</div>
            <strong>${escapeHtml(str("menu.slotOpenTitle"))}</strong>
            <span class="slot-join">${escapeHtml(str("menu.slotJoinPrompt"))}</span>
            ${i > 0 ? `<span class="slot-bot-hint">${escapeHtml(str("menu.slotBotPrompt"))}</span>` : ""}
          </article>`);
        continue;
      }
      const ch = CHARACTERS[slot.charIndex];
      cells.push(`
        <article class="join-slot joined ${slot.locked ? "locked" : ""}${slot.type === "pad" ? "" : " pickable"}" data-slot="${i}" style="--pcol:${playerColors[i]}">
          <div class="slot-arrows">${slot.locked || slot.type === "bot" ? "" : "◀&nbsp;&nbsp;&nbsp;▶"}</div>
          <div class="slot-portrait"><canvas data-portrait="${slot.charIndex}" width="96" height="96"></canvas></div>
          <strong>${ch.name} <em>${ch.title}</em></strong>
          <span class="slot-blurb">${ch.blurb}</span>
          <span class="slot-input">${slot.type === "bot" ? escapeHtml(str("menu.slotBot")) : escapeHtml(slot.label)}</span>
          <span class="slot-state">${escapeHtml(slot.locked || slot.type === "bot" ? str("menu.slotReady") : str("menu.slotChoosing"))}</span>

        </article>`);
    }
    joinSlots.innerHTML = cells.join("");
    syncLobbyActions();
    for (const cv of joinSlots.querySelectorAll("canvas[data-portrait]")) {
      const ch = CHARACTERS[Number(cv.dataset.portrait)];
      const c2 = cv.getContext("2d");
      c2.clearRect(0, 0, 96, 96);
      c2.save();
      c2.translate(40, 52);
      drawCharacter(c2, ch, 24, { t: world.time, aimX: 1, aimY: 0 });
      c2.restore();
    }
  }

  function addBot() {
    addSlot({ type: "bot", label: str("menu.slotBot") });
  }

  // Clicking a slot walks it through the seats a mouse can hand out:
  // keyboard 1 → keyboard 2 → bot → empty, skipping keyboards already taken.
  function cycleSlotByClick(index) {
    const slot = lobbySlots[index];
    if (slot && slot.type === "pad") return;     // that seat belongs to a controller
    const takenByOther = i => lobbySlots.some(sl => sl !== slot && sl.type === "keyboard" && sl.schemeIndex === i);
    const options = [];
    for (const i of [0, 1]) if (!takenByOther(i)) options.push({ kind: "keyboard", schemeIndex: i });
    options.push({ kind: "bot" });
    options.push({ kind: "none" });

    const currentKind = !slot ? "none" : slot.type === "bot" ? "bot" : "keyboard";
    const at = options.findIndex(o => o.kind === currentKind &&
      (o.kind !== "keyboard" || o.schemeIndex === slot.schemeIndex));
    const next = options[(at + 1 + options.length) % options.length];

    if (next.kind === "none") {
      if (slot) removeSlot(slot);
      return;
    }
    if (!slot) {
      if (lobbySlots.length >= settings.playerCount) { showToast(str("menu.lobbyFull")); return; }
      if (next.kind === "bot") addBot();
      else addSlot({ type: "keyboard", schemeIndex: next.schemeIndex, label: keyboardSchemes[next.schemeIndex].label });
      return;
    }
    if (next.kind === "bot") {
      slot.type = "bot";
      slot.schemeIndex = undefined;
      slot.label = str("menu.slotBot");
      slot.locked = true;
    } else {
      slot.type = "keyboard";
      slot.schemeIndex = next.schemeIndex;
      slot.label = keyboardSchemes[next.schemeIndex].label;
      slot.locked = false;
    }
    sfx("card");
    renderLobby();
  }

  // Start Match appears once there are two or more fighters.
  function syncLobbyActions() {
    const start = startBtn();
    if (!start) return;
    const wasHidden = start.classList.contains("hidden");
    start.classList.toggle("hidden", lobbySlots.length < 2);
    if (wasHidden && !start.classList.contains("hidden") && world.state === "menu") {
      const controls = visibleControls();
      const i = controls.indexOf(start);
      if (i >= 0) setMenuIndex(i, controls);
    }
  }

  // ------------------------------------------------------------------ match
  function startMatch() {
    ensureAudio();
    if (lobbySlots.length < 2) {
      startMusic();
      showToast(str("menu.needPlayers"));
      return;
    }
    // The first board's song starts from resetRound → startArenaMusic below.
    musicState.boardId = null;
    players = lobbySlots.map((slot, i) => {
      const p = makePlayer(i, slot);
      if (slot.type === "bot") p.name = `${p.character.name} (Bot)`;
      return p;
    });
    world.state = "playing";
    world.winner = null;
    world.roundWinner = null;
    world.drafters = [];
    world.lastLevelIndex = -1;
    hideAllPanels();
    buildHud();
    resetRound();
    // prime inputs so a held Start/Enter doesn't edge-trigger pause on frame one
    applyInputs(getPads());
    for (const p of players) {
      p.input.jumpPressed = p.input.shootPressed = p.input.blockPressed = p.input.specialPressed = p.input.pausePressed = false;
    }
  }

  function startFromTitle() {
    if (world.state !== "title") return;
    world.state = "menu";
    world.panelReturn = "menu";
    titleScreen.classList.add("hidden");
    menu.classList.remove("hidden");
    ensureAudio();
    setMusicContext("menu");
    sfx("card");
    renderLobby();
    setMenuIndex(0);
    // don't let the same press also activate the focused menu button
    pressed.clear();
    // Always ask. Browsers only grant fullscreen during a user gesture, and a
    // gamepad poll is not formally one — but Chrome does honour a pad press
    // here, so try regardless and let enterFullscreen swallow a refusal.
    enterFullscreen();
  }

  // The icon row belongs to the menu and pause screens; the track widget only
  // shows once a match is running.
  function syncChrome() {
    const showIcons = world.state === "menu" || world.state === "paused";
    if (world.state === "playing" || world.state === "title") {
      world.quickIndex = -1;
      for (const el of document.querySelectorAll(".controller-focus")) el.classList.remove("controller-focus");
    }
    const showTracks = players.length > 0 && world.state !== "menu" && world.state !== "title";
    if (world.chromeIcons !== showIcons) {
      world.chromeIcons = showIcons;
      iconBar.classList.toggle("hidden", !showIcons);
    }
    if (nowPlayingBar && world.chromeTracks !== showTracks) {
      world.chromeTracks = showTracks;
      nowPlayingBar.classList.toggle("hidden", !showTracks);
    }
  }

  function hideAllPanels() {
    for (const el of [titleScreen, menu, settingsPanel, howPanel, draftPanel, battleSplash, pausePanel, arenaBanner]) el.classList.add("hidden");
  }

  function resetRound() {
    pickNextLevel();
    const level = currentLevel();
    // New board, new soundtrack — and card picking is over, so back to full volume.
    duckMusic(DUCK.none);
    startArenaMusic(level);
    // Arenas vary in playfield size (ROUNDS-style): the whole level is always
    // framed, so a bigger field renders the fighters smaller and opens room
    // for lobbed arcs, while a tight one plays up close.
    world.width = (level.size && level.size.w) || 1600;
    world.height = (level.size && level.size.h) || 900;
    bullets = [];
    particles = [];
    fields = [];
    bolts = [];
    fxShots = [];
    siphons = [];
    crackers = [];
    floats = [];
    world.weather = [];
    world.lightningTimer = level.lightning ? level.lightning.period : 0;
    world.lightningFlash = 0;
    world.tideLevel = level.tide ? level.tide.min : world.height + 100;
    resetProps(level);
    players.forEach((p, i) => {
      const sp = level.spawns[i % level.spawns.length];
      p.x = sp.x; p.y = sp.y;
      p.vx = 0; p.vy = 0;
      p.aimX = p.x < world.width / 2 ? 1 : -1; p.aimY = 0;
      p.facing = p.aimX;
      p.hp = p.stats.maxHp;
      p.alive = true;
      p.grounded = false;
      p.groundPlatform = null;
      p.jumpsLeft = 1 + p.stats.extraJumps;
      p.wallDir = 0; p.wallTimer = 0; p.wallCooldown = 0;
      p.ammo = p.stats.maxAmmo;
      p.reloadTimer = 0; p.fireTimer = 0;
      p.blockTimer = 0; p.blockCooldown = 0; p.echoTimer = 0;
      p.activeCooldown = 0; p.teleWasInside = false; p.rewindLeft = REWIND_MAX;
      p.poisonTimer = 0; p.burnTimer = 0; p.chillTimer = 0;
      p.teleCooldown = 0;
      p.hazardGrace = 0;
      p.pitBounces = 0;
      p.guardianCharges = p.stats.guardian;
      p.roundRevives = p.stats.revives;
      p.rebirth = null;
      p.shield = p.stats.shield;      // whole hits it will swallow, not HP
      p.shieldDelay = 0;
      p.shieldFlash = 0;
      p.trail = [];
      p.sugarTimer = 0; p.stunTimer = 0; p.silenceTimer = 0; p.dazzleImmune = 0;
      p.floatLeft = p.stats.floatTime;
      p.sawGrace = 0; p.stompGrace = 0; p.refreshLock = 0; p.pulseClock = 0;
      p.decayPool = 0; p.decayAttacker = null;
      p.freshPool = p.stats.maxHp * p.stats.freshCoat; // shatters on first hit
      p.hotShield = 0; p.overShield = 0;
      p.empowerShot = 0; p.steeredBullet = null;
      p.burstQueue = []; p.encoreQueue = [];
      p.spawnGrace = 1.6;
    });
    decoys = [];
    history = [];
    rewind.active = false;
    rewind.owner = null;
    world.roundFreeze = 1.1;
    arenaName.textContent = level.name;
    arenaTag.textContent = level.tagline;
    arenaBanner.classList.remove("hidden");
    setTimeout(() => arenaBanner.classList.add("hidden"), 2100);
  }

  function endRound(winner) {
    if (!winner) return;
    winner.score += 1;
    pulse(winner, 0.45, 180);
    burst(winner.x, winner.y, winner.color, 42, 520);
    if (winner.score >= settings.scoreLimit) {
      world.state = "ended";
      world.winner = winner;
      showToast(str("round.matchWon", { name: winner.name }));
      return;
    }
    world.state = "round-won";
    world.roundWinner = winner;
    // ranked worst-first; only the bottom two draft, so a 4-player match never
    // has more than two hands on screen at once
    const ranked = players.filter(p => p !== winner).sort((a, b) => a.score - b.score || a.id - b.id);
    const losers = ranked.slice(0, 2);
    battleKicker.textContent = str("round.kicker", { number: players.reduce((a, p) => a + p.score, 0) });
    battleTitle.textContent = str("round.winner", { name: winner.name });
    battleTitle.style.color = winner.color;
    battleSub.textContent =
      ranked.length > 2 ? str("round.subTwo")
      : losers.length > 1 ? str("round.subMulti")
      : str("round.subSolo", { name: losers[0].name });
    battleSplash.classList.remove("hidden");
    sfx("win");
    setTimeout(() => {
      if (world.state === "round-won") {
        battleSplash.classList.add("hidden");
        beginDraft(losers);
      }
    }, 1500);
  }

  // ---------------------------------------------------------------- drafting
  // The cards a draft is allowed to offer. In Choose mode that is whatever the
  // player left enabled — unless they switched everything off, which is not a
  // playable state, so an empty pool falls back to the full set (the settings
  // panel says as much under the counter).
  function cardPool() {
    if (settings.cardMode !== "choose") return CARDS;
    const on = CARDS.filter(c => !settings.disabledCards.has(c.id));
    return on.length ? on : CARDS;
  }

  function drawCards(count, exclude = []) {
    const bag = cardPool().filter(c => !exclude.includes(c));
    const weighted = [];
    for (const c of bag) {
      // Equalize flattens the rarity ladder: one ticket each, so a Mythic is
      // exactly as likely as a Common.
      const n = settings.cardMode === "equalize"
        ? 1
        : Math.max(0, Math.round(settings.rarityWeights[c.rarity] ?? 1));
      for (let i = 0; i < n; i += 1) weighted.push(c);
    }
    // A pool smaller than the hand simply deals a smaller hand. Both draws
    // below reject duplicates, so asking either for more distinct cards than
    // exist would spin forever — Choose mode makes that easy to arrange.
    const want = Math.min(count, bag.length);
    const picked = [];
    // Weighted draw without replacement: take a ticket, then strike every other
    // ticket for that card so the pool genuinely shrinks each time round.
    while (picked.length < want && weighted.length) {
      const candidate = weighted[Math.floor(Math.random() * weighted.length)];
      picked.push(candidate);
      for (let i = weighted.length - 1; i >= 0; i -= 1) if (weighted[i] === candidate) weighted.splice(i, 1);
    }
    // Every rarity rate can be dialled to zero, and in Choose mode they can be
    // zero for everything left in the pool — deal the rest flat rather than
    // hand back a short hand.
    const rest = bag.filter(c => !picked.includes(c));
    while (picked.length < want && rest.length) {
      picked.push(rest.splice(Math.floor(Math.random() * rest.length), 1)[0]);
    }
    return picked;
  }

  // Humans draft on the card screen. Bots don't need a screen — nobody is
  // choosing — so they take a card off-screen and it is *shown*: the card flies
  // up over the arena and then flings back into the bot that took it. A round
  // with only bots drafting never opens the panel at all.
  function beginDraft(losers) {
    world.state = "draft";
    // The board's song keeps playing under the card screen, just quieter; the
    // next board's song takes over when the round starts.
    duckMusic(DUCK.draft);
    const humans = losers.filter(p => !p.bot);
    const bots = losers.filter(p => p.bot);
    world.drafters = humans.map(p => ({
      player: p,
      options: drawCards(settings.draftCount),
      index: 0,
      picked: false
    }));
    // Bots pick from a real hand, so the rarity odds are the ones everyone plays.
    world.botPicks = bots.map(p => {
      const options = drawCards(settings.draftCount);
      return { player: p, card: options[Math.floor(Math.random() * options.length)] };
    });

    if (!world.drafters.length) {
      showBotPicks();
      return;
    }
    world.draftBaseTitle = humans.length > 1 ? str("draft.titleMulti") : str("draft.titleSolo", { name: humans[0].name });
    world.draftTimer = 30;
    draftTitle.textContent = world.draftBaseTitle;
    renderDraftPanel();
    draftPanel.classList.remove("hidden");
  }

  // ------------------------------------------------------- bot card flings
  // One card at a time, so four bots read as four separate gifts rather than a
  // pile-up. The card is only applied when it lands in the bot.
  const CARD_FLY = { rise: 0.42, hold: 0.62, fling: 0.42 };
  const CARD_FLY_TOTAL = CARD_FLY.rise + CARD_FLY.hold + CARD_FLY.fling;

  function showBotPicks() {
    if (!world.botPicks || !world.botPicks.length) {
      finishDraft();
      return;
    }
    world.state = "card-show";
    world.cardShows = world.botPicks.map((b, i) => ({
      player: b.player, card: b.card,
      t: -i * (CARD_FLY_TOTAL * 0.78), // the previous card is already flying home
      landed: false
    }));
    world.botPicks = [];
  }

  function updateCardShows(dt) {
    let running = false;
    for (const show of world.cardShows) {
      show.t += dt;
      if (show.t < 0) { running = true; continue; }
      if (show.t < CARD_FLY_TOTAL) running = true;
      if (!show.landed && show.t >= CARD_FLY.rise + CARD_FLY.hold + CARD_FLY.fling * 0.85) {
        show.landed = true;
        grantCard(show.player, show.card);
        burst(show.player.x, show.player.y, RARITIES[show.card.rarity].color, 34, 460);
        world.shake = Math.max(world.shake, 5);
        sfx("card");
        pulse(show.player, 0.5, 150);
        showToast(str("draft.picked", { name: show.player.name, card: show.card.name }));
      }
    }
    if (!running) {
      world.cardShows = [];
      finishDraft();
    }
  }

  // Where a flying card is right now, in world space, plus how big it is.
  function cardShowPose(show) {
    const p = show.player;
    const stage = { x: world.width / 2, y: world.height * 0.34 };
    const t = show.t;
    if (t < CARD_FLY.rise) {
      const k = t / CARD_FLY.rise;
      const ease = 1 - (1 - k) ** 3;
      return {
        x: stage.x, y: stage.y + (1 - ease) * 220,
        scale: 0.25 + ease * 0.75, alpha: Math.min(1, k * 2.2), spin: (1 - ease) * 0.5
      };
    }
    if (t < CARD_FLY.rise + CARD_FLY.hold) {
      const k = (t - CARD_FLY.rise) / CARD_FLY.hold;
      return { x: stage.x, y: stage.y - Math.sin(k * Math.PI) * 10, scale: 1, alpha: 1, spin: 0 };
    }
    const k = Math.min(1, (t - CARD_FLY.rise - CARD_FLY.hold) / CARD_FLY.fling);
    const ease = k * k;
    return {
      x: stage.x + (p.x - stage.x) * ease,
      y: stage.y + (p.y - stage.y) * ease,
      scale: 1 - ease * 0.86,
      alpha: 1 - ease * 0.25,
      spin: ease * 1.6
    };
  }

  function finishDraft() {
    if (world.state !== "draft" && world.state !== "card-show") return;
    draftPanel.classList.add("hidden");
    world.state = "playing";
    buildHud();
    resetRound();
  }

  // Everything that happens when a card lands on a player, whoever picked it.
  function grantCard(p, c) {
    p.cards.push(c);
    c.apply(p);
    p.hp = p.stats.maxHp;
    p.ammo = p.stats.maxAmmo;
    // per-round counters derived from stats have to move with them, or a card
    // taken mid-round (drafts, the debug hook) grants a save you cannot spend
    p.guardianCharges = p.stats.guardian;
    p.roundRevives = p.stats.revives;
    if (p.stats.hover > 0) p.hoverLeft = p.stats.hover;
    if (p.stats.freshCoat > 0) p.freshPool = p.stats.maxHp * p.stats.freshCoat;
  }

  // Each chooser gets a full stage washed in their color: their character
  // large at the bottom, holding a fanned hand of playing cards. One chooser
  // fills the screen; two stand side by side with a slimmer hand.
  function renderDraftPanel() {
    draftGrid.innerHTML = "";
    draftGrid.classList.toggle("multi", world.drafters.length > 1);
    world.drafters.forEach(d => {
      const stage = document.createElement("section");
      stage.className = `draft-stage${d.picked ? " locked" : ""}`;
      stage.style.setProperty("--pcol", d.player.color);

      const who = document.createElement("div");
      who.className = "draft-who";
      who.innerHTML = `
        <canvas width="220" height="220"></canvas>
        <div class="draft-who-text">
          <strong>${escapeHtml(d.player.name)}</strong>
          <span>${escapeHtml(str(d.picked ? "draft.rowLocked" : "draft.rowPrompt"))}</span>
        </div>`;
      const pc = who.querySelector("canvas").getContext("2d");
      pc.translate(110, 124);
      drawCharacter(pc, d.player.character, 62, { t: world.time, aimX: 1, aimY: -0.15 });

      const hand = document.createElement("div");
      hand.className = "draft-hand";
      hand.style.setProperty("--n", d.options.length);
      d.options.forEach((c, i) => {
        const rar = RARITIES[c.rarity];
        const el = document.createElement("article");
        el.className = `card r-${c.rarity}${i === d.index ? " selected" : ""}${d.picked && i === d.index ? " picked" : ""}`;
        el.style.setProperty("--rcol", rar.color);
        el.style.setProperty("--rglow", rar.glow);
        // fan the hand around its middle like held playing cards
        el.style.setProperty("--tilt", `${(i - (d.options.length - 1) / 2) * 5.5}deg`);
        el.style.setProperty("--deal", `${i * 70}ms`);
        el.innerHTML = `
          <span class="card-pip">${rar.name[0]}</span>
          <span class="rarity">${rar.name}</span>
          <span class="card-art" style="--scene:url('${cardSceneUrl(c.id)}');--emblem:url('${cardArtUrl(c.id)}')"></span>
          <strong class="card-name">${c.name}</strong>
          <em class="card-tagline">${c.tagline}</em>
          <p class="card-desc">${c.description}</p>
          <div class="stat-list">${c.effects.map(s => `<span>${s}</span>`).join("")}</div>
          <span class="card-pip flip">${rar.name[0]}</span>
          ${(c.buttons || []).length ? `<span class="card-btns">${c.buttons.map(b =>
            `<b data-b="${b.b}" title="${escapeHtml(b.why)}">${b.b}</b>`).join("")}</span>` : ""}
        `;
        el.addEventListener("pointerdown", event => {
          event.preventDefault();
          if (world.state !== "draft" || d.picked || d.player.bot) return;
          d.index = i;
          confirmPick(d);
        });
        hand.appendChild(el);
      });

      stage.appendChild(hand);
      stage.appendChild(who);
      draftGrid.appendChild(stage);
      d.rowEl = stage;
    });
  }

  function refreshDraftSelection(d) {
    if (!d.rowEl) return;
    [...d.rowEl.querySelectorAll(".card")].forEach((el, i) => {
      el.classList.toggle("selected", i === d.index);
      el.classList.toggle("picked", d.picked && i === d.index);
    });
    d.rowEl.classList.toggle("locked", d.picked);
    const state = d.rowEl.querySelector(".draft-who-text span");
    if (state) state.textContent = str(d.picked ? "draft.rowLocked" : "draft.rowPrompt");
  }

  function confirmPick(d) {
    if (d.picked || world.state !== "draft") return;
    const c = d.options[d.index];
    d.picked = true;
    grantCard(d.player, c);
    sfx("card");
    pulse(d.player, 0.5, 150);
    refreshDraftSelection(d);
    showToast(str("draft.picked", { name: d.player.name, card: c.name }));
    if (world.drafters.every(x => x.picked)) {
      setTimeout(() => {
        if (world.state !== "draft") return;
        draftPanel.classList.add("hidden");
        // Bots that lost the same round take their cards now, on the arena,
        // where the fling is visible instead of hidden behind the panel.
        showBotPicks();
      }, 650);
    }
  }

  function updateDraftInput(dt) {
    world.draftTimer -= dt;
    if (world.draftTimer <= 0) {
      for (const d of world.drafters) {
        if (!d.picked) {
          d.index = Math.floor(Math.random() * d.options.length);
          confirmPick(d);
        }
      }
    } else if (world.draftTimer < 9.5) {
      draftTitle.textContent = str("draft.autoPick", { title: world.draftBaseTitle, seconds: Math.ceil(world.draftTimer) });
    }
    for (const d of world.drafters) {
      const p = d.player;
      if (p.bot || d.picked) continue;
      const move = p.input.rightPressed ? 1 : p.input.leftPressed ? -1 : 0;
      if (move && !p.draftLock) {
        d.index = (d.index + move + d.options.length) % d.options.length;
        p.draftLock = true;
        sfx("jump");
        refreshDraftSelection(d);
      }
      if (!p.input.leftPressed && !p.input.rightPressed) p.draftLock = false;
      if (p.input.shootPressed || p.input.jumpPressed) confirmPick(d);
    }
  }

  // ------------------------------------------------------------------ input
  function applyInputs(pads) {
    for (const p of players) {
      const prev = p.input;
      const input = emptyInput();
      if (p.bot) {
        if (world.state === "playing") readBot(p, input);
      } else {
        if (p.scheme) readKeyboard(p.scheme, input);
        const pad = getPadByIndex(pads, p.gamepadIndex);
        if (pad) readGamepad(pad, input);
      }
      input.jumpPressed = input.jump && !prev.jump;
      input.shootPressed = input.shoot && !prev.shoot;
      input.blockPressed = input.block && !prev.block;
      input.specialPressed = input.special && !prev.special;
      input.pausePressed = input.pause && !prev.pause;
      p.input = input;
    }
  }

  function readKeyboard(scheme, input) {
    const left = keys.has(scheme.left);
    const right = keys.has(scheme.right);
    input.move += (right ? 1 : 0) - (left ? 1 : 0);
    input.jump ||= keys.has(scheme.jump);
    input.shoot ||= keys.has(scheme.shoot);
    input.block ||= keys.has(scheme.block);
    input.special ||= keys.has(scheme.special);
    input.pause ||= keys.has("Escape") || keys.has("KeyP");
    input.leftPressed ||= pressed.has(scheme.left);
    input.rightPressed ||= pressed.has(scheme.right);
    input.menuPressed ||= pressed.has("Enter") || pressed.has("NumpadEnter");
  }

  const PAD = (window.ROUNDERS.GAMEPLAY && window.ROUNDERS.GAMEPLAY.controls) || {};

  function readGamepad(pad, input) {
    const lx = axis(pad.axes[0]);
    const ly = axis(pad.axes[1]);
    const rx = axis(pad.axes[2]);
    const ry = axis(pad.axes[3]);
    const dLeft = button(pad, 14);
    const dRight = button(pad, 15);
    const dUp = button(pad, 12);
    const dMove = (dRight ? 1 : 0) - (dLeft ? 1 : 0);
    input.move += Math.abs(lx) > 0 ? lx : dMove;
    if (Math.hypot(rx, ry) > 0.2) {
      input.aimX = rx; input.aimY = ry;
    } else if (Math.hypot(lx, ly) > 0.2) {
      input.aimX = lx; input.aimY = ly;
    } else {
      input.aimX = input.move || 0; input.aimY = 0;
    }
    // Bindings come from GAMEPLAY.controls, the same table the card badges are
    // printed from — move a button there and the badges move with it.
    const held = act => (PAD[act] ? PAD[act].pad : []).some(i => button(pad, i));
    input.jump ||= held("jump") || dUp;
    input.shoot ||= held("shoot");
    input.block ||= held("block");
    // the ability has its own button: with a Mythic in hand the active no
    // longer eats the block press, so you can still parry while it is charged
    input.special ||= held("ability");
    input.pause ||= held("pause");
    input.menuPressed ||= (PAD.pause ? PAD.pause.pad : [9]).some(i => buttonEdge(pad, i));
    input.leftPressed ||= buttonEdge(pad, 14) || axisEdge(pad, 0, -1);
    input.rightPressed ||= buttonEdge(pad, 15) || axisEdge(pad, 0, 1);
  }

  function axis(v) { return Math.abs(v || 0) > 0.18 ? v : 0; }
  function button(pad, i) { return Boolean(pad.buttons[i] && pad.buttons[i].pressed); }
  function buttonEdge(pad, i) {
    const lastButtons = lastPadButtons.get(pad.index) || [];
    return button(pad, i) && !lastButtons[i];
  }
  function axisEdge(pad, axisIndex, dir) {
    const lastAxes = lastPadButtons.get(`axes-${pad.index}`) || [];
    const current = axis(pad.axes[axisIndex]);
    const previous = Math.abs(lastAxes[axisIndex] || 0) > 0.18 ? lastAxes[axisIndex] : 0;
    return dir < 0 ? current < -0.55 && previous >= -0.55 : current > 0.55 && previous <= 0.55;
  }
  function getPads() { return navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : []; }
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

  // -------------------------------------------------------------------- bot
  function readBot(p, input) {
    const target = nearestBotTarget(p);
    if (!target) return;
    const skill = botDifficulty();
    const dx = target.x - p.x;
    const dy = target.y - p.y;
    const distance = Math.hypot(dx, dy) || 1;
    const lead = clamp(distance / Math.max(600, p.stats.bulletSpeed), 0, 0.55);
    const wobble = (1 - skill.aim) * 260;
    const ax = dx + target.vx * lead + Math.sin(performance.now() / 330 + p.botSeed) * wobble;
    const ay = dy + target.vy * lead - 38 + Math.cos(performance.now() / 420 + p.botSeed) * wobble;
    const mag = Math.hypot(ax, ay) || 1;
    input.aimX = ax / mag;
    input.aimY = ay / mag;

    const ideal = 430 + (p.id % 2) * 80;
    if (Math.abs(dx) > ideal) input.move = Math.sign(dx);
    else if (Math.abs(dx) < 220) input.move = -Math.sign(dx || p.botStrafe);
    else input.move = Math.sin(performance.now() / 650 + p.botSeed) > 0 ? p.botStrafe : -p.botStrafe;

    if (p.x < 110) input.move = 1;
    if (p.x > world.width - 110) input.move = -1;
    p.botJumpLock = Math.max(0, p.botJumpLock - 1 / 60);

    // --- look where you are going -------------------------------------------
    // Standing on top of something that hurts: get off it first, nothing else
    // matters this frame.
    const standingOver = botHazardUnder(p);
    if (standingOver) {
      input.move = p.x < standingOver.x + standingOver.w / 2 ? -1 : 1;
      if (p.grounded && p.botJumpLock <= 0) {
        input.jump = true;
        p.botJumpLock = 0.3;
      }
    }

    // Spikes or lava in the direction of travel: hop them if they are narrow
    // enough to clear, otherwise turn around.
    const hazardAhead = !standingOver && botHazardAhead(p, input.move);
    if (hazardAhead) {
      if (p.grounded && p.botJumpLock <= 0 && hazardAhead.w < 260) {
        input.jump = true;
        p.botJumpLock = 0.4;
      } else {
        input.move = -input.move;
      }
    }

    // A drop with nothing to land on is just a slower hazard.
    const walkingOffALedge = !standingOver && !hazardAhead && p.grounded &&
      input.move && !botGroundAhead(p, input.move);
    if (walkingOffALedge) input.move = -input.move;

    const shouldJump = p.grounded && p.botJumpLock <= 0 &&
      (dy < -85 || Math.random() < skill.wander || isBotWallAhead(p, input.move));
    if (shouldJump) {
      input.jump = true;
      p.botJumpLock = 0.35 + Math.random() * 0.25;
    }
    // --- walls are a staircase, not a dead end -------------------------------
    // Bots knew how to jump AT a wall but not off one, so a fighter parked on a
    // ledge was unreachable and a bot knocked into a shaft rode it all the way
    // down. Touching a wall in mid-air is now a move: kick off it, then steer
    // straight back into it so the next kick can be chained into a climb.
    const noFloorBelow = !botGroundAhead(p, 0);
    const wantsHeight = dy < -60 || noFloorBelow;
    if (!p.grounded && p.wallTimer > 0 && wantsHeight) {
      if (p.wallCooldown <= 0 && p.botJumpLock <= 0) {
        input.jump = true;
        // a short lock, so a climb can be chained rather than waiting out the
        // full hop cooldown between kicks
        p.botJumpLock = 0.16;
        p.botWallClimb = 0.3;
      } else {
        input.move = -p.wallDir || input.move;      // hug it, keep the contact
      }
    }
    // after a kick the wall throws you AWAY from it; steer back for the next one
    if ((p.botWallClimb || 0) > 0) {
      p.botWallClimb = Math.max(0, p.botWallClimb - 1 / 60);
      if (wantsHeight && p.wallDir) input.move = -p.wallDir;
    }

    const aimDot = (dx / distance) * input.aimX + (dy / distance) * input.aimY;
    input.shoot = distance < 980 && aimDot > 0.72 && p.reloadTimer <= 0 && Math.random() < skill.shoot;
    input.block = botThreatened(p) && Math.random() < skill.block;
  }

  function nearestBotTarget(bot) {
    let best = null, bestD = Infinity;
    for (const p of players) {
      if (!p.alive || p === bot) continue;
      const d = Math.hypot(p.x - bot.x, p.y - bot.y);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }

  // Hazards the bot is currently standing over (or wading in).
  function botHazardUnder(p) {
    if (!settings.hazards) return null;
    const r = p.stats.radius;
    for (const h of currentLevel().hazards) {
      if (p.x > h.x - r && p.x < h.x + h.w + r && p.y + r > h.y - 26 && p.y - r < h.y + h.h) return h;
    }
    return null;
  }

  // Hazards a step ahead, at roughly the height the bot would walk or land at.
  function botHazardAhead(p, move) {
    if (!move || !settings.hazards) return null;
    const r = p.stats.radius;
    const aheadX = p.x + move * (r + 52);
    for (const h of currentLevel().hazards) {
      if (aheadX > h.x - r && aheadX < h.x + h.w + r && p.y + r > h.y - 120 && p.y - r < h.y + h.h + 30) return h;
    }
    return null;
  }

  // Is there anything to land on a step ahead, within a survivable drop?
  function botGroundAhead(p, move) {
    const r = p.stats.radius;
    const aheadX = p.x + move * (r + 46);
    const feet = p.y + r;
    return activePlatforms(currentLevel(), world.time).some(pl =>
      aheadX > pl.x - 6 && aheadX < pl.x + pl.w + 6 && pl.y >= feet - 14 && pl.y < feet + 210);
  }

  function isBotWallAhead(p, move) {
    if (!move) return false;
    const r = p.stats.radius;
    const probe = { x: p.x + move * (r + 14), y: p.y, r };
    return activePlatforms(currentLevel(), world.time).some(platform => circleRect(probe, platform));
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

  function botDifficultyLabel(v) { return str(Number(v) === 3 ? "settings.difficultyHard" : Number(v) === 2 ? "settings.difficultyNormal" : "settings.difficultyEasy"); }

  // ------------------------------------------------------------------ update
  function update(dt) {
    const pads = getPads();
    world.joinedThisFrame = false;
    world.pausedThisFrame = false;
    world.lockedThisFrame = false;
    world.time += dt;
    world.dt = dt;

    if (world.state === "title") {
      // Gamepads cannot grant the user activation the Fullscreen API needs, so a
      // pad start enters the menu without it (keyboard and click paths can).
      if (pads.some(pad => pad.buttons.some((_, i) => buttonEdge(pad, i)))) startFromTitle();
      updateParticles(dt);
      return;
    }

    if (world.state === "menu") updateLobby(pads);
    applyInputs(pads);

    if (world.state === "menu" || world.state === "settings" || world.state === "how") {
      updateMenuControls(pads);
      updateWeatherMenu(dt);
      updateParticles(dt);
      return;
    }


    const globalPauseKey = pressed.has("Escape") || pressed.has("KeyP");
    if ((players.some(p => p.input.pausePressed) || globalPauseKey) && (world.state === "playing" || world.state === "paused")) togglePause();
    if (world.state === "paused") {
      updateMenuControls(pads);
      updateParticles(dt);
      return;
    }
    if (world.state === "ended") {
      if (menuBack(pads)) {
        returnToMainMenu();
        return;
      }
      if (players.some(p => p.input.menuPressed)) {
        rebuildLobbyFromPlayers();
        startMatch();
        return;
      }
    }
    if (world.state === "round-won") { updateParticles(dt); return; }
    if (world.state === "draft") { updateDraftInput(dt); updateParticles(dt); return; }
    // A bot's card flying back into it: the arena is still drawn, frozen, so
    // the fling reads against the fighters rather than a blank screen.
    if (world.state === "card-show") { updateCardShows(dt); updateParticles(dt); return; }
    if (world.state !== "playing") { updateParticles(dt); return; }

    updateWeather(dt);
    if (world.roundFreeze > 0) {
      world.roundFreeze -= dt;
      updateParticles(dt);
      return;
    }

    // ---- Chronoshift: hold the button and the whole board runs backwards
    // enough tape to be worth starting — a few frames' worth, so a nearly
    // empty reel cannot be machine-gunned for a stutter
    const rewinder = players.find(p =>
      p.alive && p.stats.active === "chronoshift" && (p.rewindLeft ?? 0) > 0.15 && p.input.special);
    if (rewinder || rewind.active) {
      if (rewinder && !rewind.active) {
        rewind.active = true;
        rewind.owner = rewinder;
        rewind.cursor = history.length - 1;
        rewind.spent = 0;
        rewind.budget = rewinder.rewindLeft ?? REWIND_MAX;   // only what is on the reel
        rewind.carry = 0;
        sfx("teleport");
        showToast(str("toast.chronoshift", { name: rewinder.name }));
      }
      const holder = rewind.owner;
      const stillHeld = rewinder && rewinder === holder;
      // consume history at half real time, and never more than the budget
      const canRewind = stillHeld && rewind.cursor > 0 && rewind.spent < rewind.budget;
      if (canRewind) {
        // whole frames only, with the remainder carried to the next tick —
        // paying a frame off partially would unwind it at full speed
        let left = dt * REWIND_RATE + rewind.carry;
        let undone = 0;
        while (rewind.cursor > 0 && rewind.spent < rewind.budget) {
          const frame = history[rewind.cursor];
          if (left < frame.dt) break;
          left -= frame.dt;
          rewind.spent += frame.dt;
          undone += frame.dt;
          rewind.cursor -= 1;
        }
        // the reel is charged for exactly what was played back
        holder.rewindLeft = Math.max(0, (holder.rewindLeft ?? REWIND_MAX) - undone);
        rewind.carry = left;
        restore(history[Math.max(0, rewind.cursor)]);
        history.length = Math.max(1, rewind.cursor + 1);
        // update() already pushed the clock forward by dt at the top; take that
        // back as well as the tape we just unwound, so the clock really reverses
        world.time -= dt + undone;
        updateParticles(dt);
        updateHud();
        return;                                  // the world does not advance
      }
      // let go, ran out of tape, or died mid-rewind: hand time back. There is
      // no lockout — whatever is left on the reel is usable at once, and the
      // rest refills at its own pace.
      rewind.active = false;
      rewind.owner = null;
    }

    const step = Math.min(dt, 1 / 45);
    world.lastStep = step;
    history.push(snapshot(step));
    // 3 seconds of tape at 60fps, with headroom for slower frames
    while (history.length > 260) history.shift();
    updateArena(step);
    updateProps(step);
    updatePlayers(step);
    updateBullets(step);
    updateFields(step);
    updateDecoys(step);
    updateParticles(step);
    updateBolts(step);
    updateSiphons(step);
    updateCrackers(step);
    updateHud();
    checkRoundEnd();
  }

  // If controller disconnects shrank the lobby, rebuild it from the match lineup
  function rebuildLobbyFromPlayers() {
    if (lobbySlots.length >= 2) return;
    lobbySlots.length = 0;
    for (const p of players) {
      if (!p.bot && !p.scheme && (p.gamepadIndex === null || p.gamepadIndex === undefined)) continue;
      lobbySlots.push({
        type: p.bot ? "bot" : p.scheme ? "keyboard" : "pad",
        schemeIndex: p.scheme ? keyboardSchemes.indexOf(p.scheme) : undefined,
        gamepadIndex: p.gamepadIndex,
        label: p.bot ? "Bot" : p.scheme ? p.scheme.label : "Controller",
        charIndex: Math.max(0, CHARACTERS.indexOf(p.character)),
        locked: true
      });
    }
  }

  // ------------------------------------------------------------- arena tick
  function updateArena(dt) {
    const level = currentLevel();
    // tide
    if (level.tide) {
      const s = (Math.sin((world.time / level.tide.period) * Math.PI * 2 - Math.PI / 2) + 1) / 2;
      world.tideLevel = level.tide.min + (level.tide.max - level.tide.min) * s;
    }
    // lightning
    if (level.lightning && settings.hazards) {
      world.lightningFlash = Math.max(0, world.lightningFlash - dt);
      world.lightningTimer -= dt;
      if (world.lightningTimer <= 0) {
        strikeLightning();
        world.lightningTimer = level.lightning.period * (0.75 + Math.random() * 0.5);
      }
    }
  }

  function strikeLightning() {
    const level = currentLevel();
    const targets = players.filter(p => p.alive);
    const tx = targets.length && Math.random() < 0.7
      ? targets[Math.floor(Math.random() * targets.length)].x + rand(-60, 60)
      : rand(120, world.width - 120);
    world.lightningX = clamp(tx, 80, world.width - 80);
    // the warn field doubles as the strike timer: it resolves on game time in
    // updateFields, so pauses hold it and resetRound (fields = []) cancels it
    fields.push({ type: "lightning-warn", x: world.lightningX, y: 0, r: 55, life: level.lightning.warn, owner: null });
  }

  function resolveLightningStrike(x) {
    world.lightningFlash = 0.22;
    world.shake = Math.max(world.shake, 14);
    sfx("hit");
    boltVisual(x, 0, x + rand(-20, 20), world.height, "#ffe95e", 0.35);
    for (const p of players) {
      if (!p.alive || p.spawnGrace > 0) continue;
      if (Math.abs(p.x - x) < 70) {
        hurt(p, 42, null, 0, -1);
        p.vy -= 420;
      }
    }
  }

  // ----------------------------------------------------------------- players
  // ------------------------------------------------------- destructible props
  function resetProps(level) {
    props.holes = new Map();   // terrain repairs itself between rounds
    props.breaks = new Map();
    for (const p of level.platforms) {
      if (p.breakable) props.breaks.set(p, { hp: p.breakable, max: p.breakable, dead: false, flash: 0 });
    }
    props.hungs = (level.hung || []).map(h => ({
      x: h.x, y: h.y, w: h.w, h: h.h, ice: h.ice, anchorY: h.anchorY || 0,
      chains: h.chains.map(cx => ({ x: cx, cut: false, cutAt: 0 })),
      dead: false
    }));
    props.slabs = [];
    props.crates = (level.crates || []).map(c => ({
      x: c.x, y: c.y, w: c.s, h: c.s, vx: 0, vy: 0,
      hp: c.hp || 70, max: c.hp || 70, dead: false, grounded: false,
      seed: Math.floor(Math.random() * 1000)
    }));
  }

  // Static solids a prop can rest on: live level platforms + settled hung ones.
  function propSolids(level) {
    const t = world.time;
    const list = [];
    for (const p of level.platforms) {
      const brk = props.breaks.get(p);
      if (brk && brk.dead) continue;
      if (p.phase) {
        const cyc = ((t + p.phase.offset) % p.phase.period) / p.phase.period;
        if (cyc > p.phase.duty) continue;
      }
      list.push(p);
    }
    for (const hg of props.hungs) if (!hg.dead) list.push(hg);
    return list;
  }

  function updateProps(dt) {
    const level = currentLevel();
    const g = levelGravity();
    const solids = propSolids(level);
    for (const brk of props.breaks.values()) brk.flash = Math.max(0, brk.flash - dt);
    updateSlabs(dt, level, g, solids);
    for (const c of props.crates) {
      if (c.dead) continue;
      c.vy += g * dt;
      c.vx *= Math.pow(c.grounded ? 0.86 : 0.985, dt * 60);
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.grounded = false;
      if (c.x < 0) { c.x = 0; c.vx = Math.abs(c.vx) * 0.3; }
      if (c.x + c.w > world.width) { c.x = world.width - c.w; c.vx = -Math.abs(c.vx) * 0.3; }
      const rests = solids.concat(props.crates.filter(o => o !== c && !o.dead));
      for (const s of rests) {
        if (c.x + c.w <= s.x || c.x >= s.x + s.w || c.y + c.h <= s.y || c.y >= s.y + s.h) continue;
        const overlaps = [
          { side: "top", amount: c.y + c.h - s.y },
          { side: "bottom", amount: s.y + s.h - c.y },
          { side: "left", amount: c.x + c.w - s.x },
          { side: "right", amount: s.x + s.w - c.x }
        ].sort((a, b) => a.amount - b.amount);
        const o = overlaps[0];
        if (o.side === "top" && c.vy >= 0) {
          c.y = s.y - c.h;
          c.vy = 0;
          c.grounded = true;
        } else if (o.side === "bottom") {
          c.y = s.y + s.h;
          c.vy = Math.max(0, c.vy);
        } else if (o.side === "left") {
          c.x = s.x - c.w;
          c.vx = -Math.abs(c.vx) * 0.25;
          if (s.vx !== undefined) s.vx += 30;
        } else if (o.side === "right") {
          c.x = s.x + s.w;
          c.vx = Math.abs(c.vx) * 0.25;
          if (s.vx !== undefined) s.vx -= 30;
        }
      }
      if (level.tide && c.y + c.h > world.tideLevel + 6) {
        c.vy -= g * dt * 1.6; // crates float
        c.vx *= 0.96;
      }
      for (const h of level.hazards) {
        if (h.kind === "water" && c.x + c.w > h.x && c.x < h.x + h.w && c.y + c.h > h.y + 6) {
          c.vy -= g * dt * 1.6;
          c.vx *= 0.96;
        }
      }
      if (c.y > world.height + 80) c.dead = true;
    }
  }

  // ------------------------------------------------------------ loose slabs
  // A platform cut off its chains becomes a SLAB: a free rigid body that
  // tumbles, teeters on its corners, gets kicked around by bullets and
  // explosions, can be shoved by walking into it, crushes whoever it lands
  // on, carries whoever rides it, and floats in water. A physics toy.
  const SLAB_E = 0.26;          // restitution on corner impacts
  const SLAB_MU = 0.8;          // contact friction
  const SLAB_REST = 0.45;       // seconds of stillness before it sleeps

  function spawnSlab(hg, tipX) {
    const cx = hg.x + hg.w / 2;
    props.slabs.push({
      x: cx, y: hg.y + hg.h / 2, w: hg.w, h: hg.h, ice: hg.ice,
      angle: 0, vx: 0, vy: 0,
      // tip away from the last chain that was holding it
      va: clamp((cx - tipX) / hg.w, -0.5, 0.5) * 1.4,
      I: (hg.w * hg.w + hg.h * hg.h) / 12,
      rest: 0, thudCd: 0, dead: false
    });
  }

  function slabCorners(s) {
    const c = Math.cos(s.angle), n = Math.sin(s.angle);
    const hw = s.w / 2, hh = s.h / 2;
    return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]]
      .map(([lx, ly]) => ({ x: s.x + lx * c - ly * n, y: s.y + lx * n + ly * c }));
  }

  // y of the water surface under x, or Infinity if the air is dry there
  function waterSurfaceY(level, x) {
    let y = Infinity;
    if (level.tide) y = world.tideLevel;
    for (const h of level.hazards) {
      if (h.kind === "water" && x > h.x && x < h.x + h.w) y = Math.min(y, h.y);
    }
    return y;
  }

  function updateSlabs(dt, level, g, solids) {
    for (const s of props.slabs) {
      if (s.dead) continue;
      s.thudCd = Math.max(0, s.thudCd - dt);
      if (s.rest >= SLAB_REST) continue;      // asleep until something wakes it
      s.vy += g * dt;
      const waterY = waterSurfaceY(level, s.x);
      if (s.y > waterY) {                      // buoyancy: slabs make rafts
        s.vy -= g * dt * (1.55 + Math.min(0.6, (s.y - waterY) / 80));
        s.vx *= Math.pow(0.985, dt * 60);
        s.vy *= Math.pow(0.97, dt * 60);
        s.va *= Math.pow(0.96, dt * 60);
      }
      s.vy = Math.min(s.vy, 1050);
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.angle += s.va * dt;
      const edge = s.w * 0.35;
      if (s.x < edge) { s.x = edge; s.vx = Math.abs(s.vx) * 0.4; }
      if (s.x > world.width - edge) { s.x = world.width - edge; s.vx = -Math.abs(s.vx) * 0.4; }

      // corner contacts against level geometry and crates
      let grounded = false;
      const rests = solids.concat(props.crates.filter(c => !c.dead));
      for (const box of rests) {
        for (const pt of slabCorners(s)) {
          if (pt.x <= box.x || pt.x >= box.x + box.w || pt.y <= box.y || pt.y >= box.y + box.h) continue;
          // shallowest exit for this corner
          const outs = [
            { nx: 0, ny: -1, d: pt.y - box.y },
            { nx: 0, ny: 1, d: box.y + box.h - pt.y },
            { nx: -1, ny: 0, d: pt.x - box.x },
            { nx: 1, ny: 0, d: box.x + box.w - pt.x }
          ].sort((a, b) => a.d - b.d)[0];
          s.x += outs.nx * outs.d;
          s.y += outs.ny * outs.d;
          const rx = pt.x - s.x, ry = pt.y - s.y;
          const vpx = s.vx - s.va * ry, vpy = s.vy + s.va * rx;
          const vn = vpx * outs.nx + vpy * outs.ny;
          if (vn < 0) {
            const rn = rx * outs.ny - ry * outs.nx;
            const j = -(1 + SLAB_E) * vn / (1 + rn * rn / s.I);
            s.vx += j * outs.nx;
            s.vy += j * outs.ny;
            s.va += rn * j / s.I;
            // friction along the tangent
            const tx = -outs.ny, ty = outs.nx;
            const vt = vpx * tx + vpy * ty;
            const rt = rx * ty - ry * tx;
            const jt = clamp(-vt / (1 + rt * rt / s.I), -SLAB_MU * j, SLAB_MU * j);
            s.vx += jt * tx;
            s.vy += jt * ty;
            s.va += rt * jt / s.I;
            if (box.hp !== undefined) {          // slab lands on a crate: shove it
              box.vx -= outs.nx * j * 0.45;
              box.vy -= outs.ny * j * 0.35;
            }
            if (j > 180 && s.thudCd <= 0) {
              s.thudCd = 0.25;
              world.shake = Math.max(world.shake, Math.min(9, j / 60));
              puff(pt.x, pt.y, level.palette.accent, 8);
              sfx("thud");
            }
          }
          if (outs.ny === -1) grounded = true;
        }
      }
      // settle: damp the rocking, then sleep when genuinely still
      if (grounded) {
        s.va *= Math.pow(0.92, dt * 60);
        s.vx *= Math.pow(0.96, dt * 60);
        if (Math.abs(s.vx) < 22 && Math.abs(s.vy) < 30 && Math.abs(s.va) < 0.35) {
          s.rest += dt;
          if (s.rest >= SLAB_REST) { s.vx = 0; s.vy = 0; s.va = 0; }
        } else s.rest = 0;
      } else s.rest = 0;
      if (s.y - Math.max(s.w, s.h) > world.height + 140) s.dead = true;
    }
  }

  function wakeSlab(s) { s.rest = 0; }

  // Bullets kick slabs: impulse along the shot at the hit point, so an edge
  // hit spins it and a hit under a grounded slab pops it into the air.
  function checkSlabHits(b) {
    for (const s of props.slabs) {
      if (s.dead) continue;
      const hit = slabCirclePoint(s, b.x, b.y, b.r);
      if (!hit) continue;
      const mag = Math.hypot(b.vx, b.vy) || 1;
      const dx = b.vx / mag, dy = b.vy / mag;
      const j = 120 + b.damage * 2.4;
      const rx = hit.qx - s.x, ry = hit.qy - s.y;
      s.vx += dx * j * 0.55;
      s.vy += dy * j * 0.55 - 42;
      s.va += (rx * dy - ry * dx) * j / s.I * 0.4;
      wakeSlab(s);
      puff(hit.qx, hit.qy, currentLevel().palette.accent, 6);
      sfx("block");
      return true;
    }
    return false;
  }

  // Closest point on a slab to a circle; null if the circle is clear of it.
  function slabCirclePoint(s, px, py, r) {
    const c = Math.cos(s.angle), sn = Math.sin(s.angle);
    const dx = px - s.x, dy = py - s.y;
    const lx = dx * c + dy * sn, ly = -dx * sn + dy * c;
    const qlx = clamp(lx, -s.w / 2, s.w / 2), qly = clamp(ly, -s.h / 2, s.h / 2);
    const ddx = lx - qlx, ddy = ly - qly;
    const d2 = ddx * ddx + ddy * ddy;
    if (d2 > r * r) return null;
    let nlx, nly, depth;
    if (d2 > 1e-6) {
      const d = Math.sqrt(d2);
      nlx = ddx / d; nly = ddy / d; depth = r - d;
    } else {
      // centre inside: exit along the shallower local axis
      const ex = s.w / 2 - Math.abs(lx), ey = s.h / 2 - Math.abs(ly);
      if (ex < ey) { nlx = lx < 0 ? -1 : 1; nly = 0; depth = ex + r; }
      else { nlx = 0; nly = ly < 0 ? -1 : 1; depth = ey + r; }
    }
    return {
      nx: nlx * c - nly * sn, ny: nlx * sn + nly * c, depth,
      qx: s.x + qlx * c - qly * sn, qy: s.y + qlx * sn + qly * c
    };
  }

  // Players vs slabs: stand on them, ride them, shove them, get crushed by
  // them, wall-kick off a leaning one.
  function collidePlayerSlabs(p, dt) {
    p.slabGrace = Math.max(0, (p.slabGrace || 0) - dt);
    const r = p.stats.radius;
    for (const s of props.slabs) {
      if (s.dead) continue;
      const hit = slabCirclePoint(s, p.x, p.y, r);
      if (!hit) continue;
      const rx = hit.qx - s.x, ry = hit.qy - s.y;
      const svx = s.vx - s.va * ry, svy = s.vy + s.va * rx;
      // A slab slamming down hurts in proportion to how big it is and how
      // fast it lands: a thin shelf dropping a short way is a bonk, a chunky
      // block from height is a crush. Reference mass is a standard 220×24
      // hung platform; damage only starts past a real falling speed.
      const relDown = svy - p.vy;
      if (hit.ny > 0.55 && relDown > 500 && p.slabGrace <= 0) {
        const massF = clamp((s.w * s.h) / (220 * 24), 0.35, 2.4);
        const dmg = clamp((relDown - 500) * 0.05 * massF, 0, 55);
        if (dmg >= 5) {
          hurt(p, dmg, null, hit.nx * 220, 260);
          p.slabGrace = 0.6;
        }
        wakeSlab(s);
      }
      p.x += hit.nx * hit.depth;
      p.y += hit.ny * hit.depth;
      const rvx = p.vx - svx, rvy = p.vy - svy;
      const vn = rvx * hit.nx + rvy * hit.ny;
      if (vn < 0) {
        p.vx -= vn * hit.nx;
        p.vy -= vn * hit.ny;
        if (vn < -60) {                       // real knock, not resting contact
          const rn = rx * hit.ny - ry * hit.nx;
          const j = Math.min(-vn * 0.4, 420);
          s.vx -= j * hit.nx * 0.5;
          s.vy -= j * hit.ny * 0.22;
          s.va -= rn * j / s.I * 0.45;
          wakeSlab(s);
        }
      }
      if (hit.ny < -0.55) {                   // on top: it's ground, and it carries
        p.grounded = true;
        p.jumpsLeft = Math.max(p.jumpsLeft, 1 + p.stats.extraJumps);
        p.x += svx * dt;
        p.y += svy * dt;
      } else if (Math.abs(hit.nx) > 0.72 && !p.grounded) {
        touchWall(p, hit.nx < 0 ? -1 : 1);
      }
      // leaning into it walks it along the floor
      const move = clamp(p.input.move, -1, 1);
      if (Math.abs(hit.nx) > 0.6 && move && Math.sign(move) === -Math.sign(hit.nx)) {
        s.vx += move * 620 * dt;
        wakeSlab(s);
      }
    }
  }

  function damageCrate(c, dmg, ix, iy) {
    c.hp -= dmg;
    c.vx += clamp(ix, -260, 260) * 0.4;
    c.vy += clamp(iy, -200, 200) * 0.3 - 40;
    puff(c.x + c.w / 2, c.y + c.h / 2, currentLevel().palette.plat, 5);
    if (c.hp <= 0 && !c.dead) {
      c.dead = true;
      burst(c.x + c.w / 2, c.y + c.h / 2, currentLevel().palette.accent, 22, 330);
      world.shake = Math.max(world.shake, 6);
      sfx("thud");
    }
  }

  function damageBreakable(brk, x, y, dmg) {
    brk.hp -= dmg;
    brk.flash = 0.12;
    if (brk.hp <= 0 && !brk.dead) {
      brk.dead = true;
      burst(x, y, currentLevel().palette.accent, 26, 380);
      world.shake = Math.max(world.shake, 7);
      sfx("thud");
    }
  }

  // A bullet crossing an intact chain cuts it; cutting the last chain frees
  // the platform into a tumbling slab.
  function checkChainHits(b) {
    for (const hg of props.hungs) {
      if (hg.dead) continue;
      for (const ch of hg.chains) {
        if (ch.cut) continue;
        if (Math.abs(b.x - ch.x) < 9 + b.r && b.y > hg.anchorY && b.y < hg.y) {
          ch.cut = true;
          ch.cutAt = world.time;
          burst(b.x, b.y, "#ffd27a", 12, 260);
          sfx("chain");
          if (hg.chains.every(k => k.cut)) {
            hg.dead = true;
            spawnSlab(hg, ch.x);
            world.shake = Math.max(world.shake, 5);
          }
          return true;
        }
      }
    }
    return false;
  }

  function updatePlayers(dt) {
    const level = currentLevel();
    const plats = activePlatforms(level, world.time);
    const wind = windForce();
    for (const p of players) {
      if (p.rebirth) tickRebirth(p, dt);
      if (!p.alive) continue;
      p.fireTimer = Math.max(0, p.fireTimer - dt);
      p.blockCooldown = Math.max(0, p.blockCooldown - dt);
      p.blockTimer = Math.max(0, p.blockTimer - dt);
      p.activeCooldown = Math.max(0, p.activeCooldown - dt);
      // Chronoshift's tape is a pool, not a switch: it refills at a steady
      // REWIND_MAX-per-cooldown, so spending two of your three seconds costs
      // two thirds of the cooldown to earn back, and a sliver of tape is
      // usable the moment it exists rather than after a fixed lockout.
      if (p.stats.active === "chronoshift" && !(rewind.active && rewind.owner === p)) {
        const per = REWIND_MAX / Math.max(0.1, p.stats.activeCooldown);
        p.rewindLeft = Math.min(REWIND_MAX, (p.rewindLeft ?? REWIND_MAX) + dt * per);
      }
      p.spawnGrace = Math.max(0, p.spawnGrace - dt);
      p.hazardGrace = Math.max(0, p.hazardGrace - dt);
      p.hitFlash = Math.max(0, (p.hitFlash || 0) - dt);
      p.thornPulse = Math.max(0, (p.thornPulse || 0) - dt);
      p.flashPop = Math.max(0, (p.flashPop || 0) - dt);
      p.squish = Math.max(0, (p.squish || 0) - dt);
      p.teleCooldown = Math.max(0, p.teleCooldown - dt);
      p.wallTimer = Math.max(0, p.wallTimer - dt);
      p.wallCooldown = Math.max(0, p.wallCooldown - dt);
      p.blinkClock += dt;
      p.sugarTimer = Math.max(0, p.sugarTimer - dt);
      p.stunTimer = Math.max(0, p.stunTimer - dt);
      p.silenceTimer = Math.max(0, p.silenceTimer - dt);
      p.dazzleImmune = Math.max(0, p.dazzleImmune - dt);
      p.sawGrace = Math.max(0, p.sawGrace - dt);
      p.stompGrace = Math.max(0, p.stompGrace - dt);
      p.refreshLock = Math.max(0, p.refreshLock - dt);
      // Hot Streak armor bleeds away fast; Overflow shield sticks around
      if (p.hotShield > 0) p.hotShield = Math.max(0, p.hotShield - 6 * dt);
      // Payment Plan: the pool of deferred damage drips into your health bar
      if (p.decayPool > 0) {
        // one copy spreads the bill over 3s; each extra copy stretches it out
        // further, buying more time to turn the fight around
        const over = 3 * (p.stats.decay || 1);
        const bite = Math.min(p.decayPool, Math.max(p.decayPool / over, 3 / over) * dt);
        p.decayPool -= bite;
        applyDamage(p, bite, p.decayAttacker, true);
        if (Math.random() < dt * 10) puffOne(p.x + rand(-12, 12), p.y + rand(-12, 12), "#c88fff");
      }
      // Triple Tap echoes and Encore ghosts fire themselves on their timers
      if (p.burstQueue.length) {
        for (const q of p.burstQueue) q.t -= dt;
        while (p.burstQueue.length && p.burstQueue[0].t <= 0) {
          const q = p.burstQueue.shift();
          if (p.alive) { fireVolley(p, { mul: q.mul }); sfx("shoot"); }
        }
      }
      if (p.encoreQueue.length) {
        for (const q of p.encoreQueue) q.t -= dt;
        while (p.encoreQueue.length && p.encoreQueue[0].t <= 0) {
          const q = p.encoreQueue.shift();
          if (p.alive) {
            fireVolley(p, { mul: q.mul, angle: q.angle, ghost: true, pellets: q.pellets, from: q.from });
            puff(p.x, p.y, "#b8c4ff", 6);
            sfx("shoot");
          }
        }
      }
      // Cold Shoulder: standing near the wearer is its own punishment
      if (p.stats.chillAura) {
        for (const q of players) {
          if (!q.alive || q === p || q.spawnGrace > 0) continue;
          if (Math.hypot(q.x - p.x, q.y - p.y) < 200) {
            q.chillTimer = Math.max(q.chillTimer, 0.3);
            if (Math.random() < dt * 6) puffOne(q.x + rand(-12, 12), q.y + rand(-12, 12), "#8fd8ff");
          }
        }
      }

      if (p.echoTimer > 0) {
        p.echoTimer -= dt;
        if (p.echoTimer <= 0) {
          p.blockTimer = Math.max(p.blockTimer, p.stats.blockDuration * 0.8);
          if (p.stats.blockPush) fields.push({ type: "push", owner: p, x: p.x, y: p.y, r: 200, life: 0.18, maxLife: 0.18, force: 840, scatter: true });
          burst(p.x, p.y, "#ffffff", 12, 200);
        }
      }

      // trail for chronoshift
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 120) p.trail.shift();

      // DoTs & sustain
      if (p.poisonTimer > 0) {
        p.poisonTimer -= dt;
        hurtRaw(p, p.poisonDps * dt, p.poisonAttacker);
        if (Math.random() < dt * 14) puffOne(p.x + rand(-14, 14), p.y + rand(-14, 14), "#63d43a");
      }
      if (p.burnTimer > 0) {
        p.burnTimer -= dt;
        hurtRaw(p, p.burnDps * dt, p.burnAttacker);
        // Actually on fire: licking flames off the body, dark smoke peeling up
        // off them, and the odd ember dropping. A single orange puff read as
        // "hit", not "burning".
        const heat = Math.min(1, p.burnDps / 14);
        for (let i = 0; i < 3; i += 1) {
          if (Math.random() > dt * 34 * (0.6 + heat)) continue;
          const a = rand(0, Math.PI * 2), rr = p.stats.radius * rand(0.35, 1);
          particles.push({
            x: p.x + Math.cos(a) * rr, y: p.y + Math.sin(a) * rr * 0.8,
            vx: rand(-26, 26) + p.vx * 0.16, vy: rand(-150, -70) + p.vy * 0.1,
            life: 0.42, maxLife: 0.42, r: rand(2.5, 5.5),
            color: Math.random() < 0.55 ? "#ffcf4d" : "#ff7a26", flame: true
          });
        }
        if (Math.random() < dt * 14) {
          particles.push({
            x: p.x + rand(-12, 12), y: p.y - p.stats.radius * 0.7,
            vx: rand(-18, 18), vy: rand(-70, -34),
            life: 1.1, maxLife: 1.1, r: rand(5, 9), color: "rgba(70,66,72,0.55)", smoke: true
          });
        }
        if (Math.random() < dt * 6) {
          particles.push({
            x: p.x + rand(-14, 14), y: p.y + rand(-8, 10),
            vx: rand(-40, 40), vy: rand(-20, 40),
            life: 0.7, maxLife: 0.7, r: rand(1.2, 2.2), color: "#ffb02e"
          });
        }
      }
      if (p.chillTimer > 0) p.chillTimer -= dt;
      if (p.stats.regen > 0) {
        const before = p.hp;
        p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.regen * dt);
        // little motes of health drifting IN while it is actually mending
        // something — silent once you are topped up
        if (p.hp > before && Math.random() < dt * 14) {
          const ang = rand(0, Math.PI * 2);
          const rr = p.stats.radius * rand(1.8, 3.0);
          particles.push({
            x: p.x + Math.cos(ang) * rr, y: p.y + Math.sin(ang) * rr,
            vx: -Math.cos(ang) * rand(60, 130), vy: -Math.sin(ang) * rand(60, 130),
            life: rand(0.3, 0.55), maxLife: 0.55, r: rand(1.4, 2.6),
            color: Math.random() < 0.4 ? "#c6ffd0" : "#74f08b", spark: true
          });
        }
      }
      if (p.stats.shield > 0) {
        p.shieldFlash = Math.max(0, p.shieldFlash - dt);
        p.shieldDelay = Math.max(0, p.shieldDelay - dt);
        if (p.shieldDelay <= 0 && p.shield < p.stats.shield) {
          const was = p.shield;
          // a whole charge comes back at once, so the bubble is either there
          // to eat a hit or it is not — no half-shield to reason about
          p.shield = Math.min(p.stats.shield, p.shield + 1);
          if (was <= 0 && p.shield > 0) puff(p.x, p.y - p.stats.radius, "#7fd8ff", 6);
        }
      }

      if (p.reloadTimer > 0) {
        p.reloadTimer -= dt;
        // Coffee Break: the reload itself is dangerous to stand next to
        if (p.stats.reloadPulse) {
          p.pulseClock += dt;
          if (p.pulseClock >= 0.45) {
            p.pulseClock = 0;
            fields.push({ type: "push", owner: p, x: p.x, y: p.y, r: 130, life: 0.14, maxLife: 0.14, force: 520 });
            for (const q of players) {
              if (!q.alive || q === p || q.spawnGrace > 0) continue;
              if (Math.hypot(q.x - p.x, q.y - p.y) < 130) {
                hurtRaw(q, 8 * p.stats.reloadPulse, p);
              }
            }
            sfx("block");
          }
        } else p.pulseClock = 0;
        if (p.reloadTimer <= 0) {
          p.ammo = p.stats.maxAmmo;
          puff(p.x, p.y, "#ffffff", 8);
        }
      }

      const chillMul = p.chillTimer > 0 ? 0.55 : 1;
      const adrenalineMul = p.stats.adrenaline > 0 && p.hp / p.stats.maxHp < 0.35 ? 1 + p.stats.adrenaline : 1;
      const sugarMul = p.sugarTimer > 0 ? 1 + 2 * p.stats.sugarRush : 1;
      let speed = p.stats.speed * chillMul * adrenalineMul * sugarMul * underdogMul(p);
      // syrup zones
      for (const z of level.zones || []) {
        if (circleRect(p, z)) { speed *= 0.45; break; }
      }

      // Camera Flash: stunned players stand there, seeing spots
      const stunned = p.stunTimer > 0;
      if (stunned && Math.random() < dt * 10) {
        puffOne(p.x + rand(-14, 14), p.y - p.stats.radius - rand(4, 16), "#ffffff");
      }
      const move = stunned ? 0 : clamp(p.input.move, -1, 1);
      const onIce = p.groundPlatform && p.groundPlatform.ice;
      const targetVx = move * speed;
      let accel = p.grounded ? p.stats.accel : p.stats.airAccel;
      let brake = p.stats.brake;
      if (onIce && p.grounded) { accel *= 0.3; brake *= 0.08; }
      p.vx += (targetVx - p.vx) * clamp(accel * dt, 0, 1);
      if (!move && p.grounded) p.vx += (0 - p.vx) * clamp(brake * dt, 0, 1);

      // Which way the character is turned follows where they are *moving*, so
      // they can back away while still shooting where the stick points. It
      // holds the last direction when they stop.
      if (move) p.facing = move < 0 ? -1 : 1;
      if (move) { p.aimX = move; p.aimY = 0; }
      if (Math.abs(p.input.aimX) > 0.2 || Math.abs(p.input.aimY) > 0.2) {
        const mag = Math.hypot(p.input.aimX, p.input.aimY) || 1;
        p.aimX = p.input.aimX / mag;
        p.aimY = p.input.aimY / mag;
      }
      const aimMag = Math.hypot(p.aimX, p.aimY) || 1;
      p.aimX /= aimMag; p.aimY /= aimMag;

      const chillJump = p.chillTimer > 0 ? 0.75 : 1;
      // Grasshopper: a PRESS is an ordinary jump, fired the instant the button
      // goes down like anyone else's — the wind-up never delays it. Keeping the
      // button down banks charge, and the coil is entered the moment they are
      // back on the ground with the button still held; letting go from there
      // launches. So a tap hops, and a hold hops, lands coiled, and fires.
      const charging = p.stats.chargeJump > 0;
      if (charging && !stunned) {
        if (p.input.jump) {
          // the clock runs from the press, in the air as well as on the ground,
          // so a held button lands already wound up
          p.jumpCharge = Math.min(CHARGE.maxHold, (p.jumpCharge || 0) + dt);
          const k = p.grounded
            ? clamp(((p.jumpCharge || 0) - CHARGE.minHold) / (CHARGE.maxHold - CHARGE.minHold), 0, 1)
            : 0;
          if (k > 0 && Math.random() < dt * (8 + k * 40)) {
            const a = rand(0, Math.PI * 2);
            particles.push({
              x: p.x + Math.cos(a) * p.stats.radius * 1.3,
              y: p.y + p.stats.radius * rand(0.3, 0.95),
              vx: -Math.cos(a) * rand(20, 90), vy: rand(-90, -20) * (0.4 + k),
              life: 0.35, maxLife: 0.35, r: rand(1.4, 2.8 + k * 2),
              color: k > 0.66 ? "#c9f7a8" : "#9fe870", spark: true
            });
          }
        } else if (p.grounded && (p.jumpCharge || 0) >= CHARGE.minHold) {
          // let go on the ground with a wound-up reel: the launch
          const mul = chargeMul(p.jumpCharge, p);
          p.vy = -p.stats.jump * chillJump * mul;
          p.grounded = false;
          p.groundPlatform = null;
          p.jumpsLeft = Math.max(0, p.jumpsLeft - 1);   // same cost as any jump
          p.jumpCharge = 0;
          pulse(p, 0.12 + (mul - 1) * 0.14, 25 + (mul - 1) * 90);
          sfx("jump");
          puff(p.x, p.y + p.stats.radius, "#ffffff", 10 + Math.round((mul - 1) * 14));
          if (mul > 1.2) {
            burst(p.x, p.y + p.stats.radius, "#9fe870", Math.round(6 + (mul - 1) * 14), 240);
            world.shake = Math.max(world.shake, (mul - 1) * 4);
          }
        } else if (!p.input.jump) p.jumpCharge = 0;   // let go: the wind-up is spent
      }
      if (p.input.jumpPressed && !stunned) {
        const canWallJump = !p.grounded && p.wallTimer > 0 && p.wallCooldown <= 0;
        // Hummingbird: tap jump a second time in the air and you stop dead,
        // wings blurring, for as long as this jump's budget lasts. Tapping
        // again drops you out of it. Checked before the ordinary air jump so
        // the hover is what the second press buys.
        let usedOnHover = false;
        if (p.stats.hover > 0 && !p.grounded && !canWallJump) {
          if (p.hovering) {
            p.hovering = false;
            usedOnHover = true;
            puff(p.x, p.y + p.stats.radius * 0.5, "#ffffff", 8);
          } else if (p.hoverLeft > 0) {
            p.hovering = true;
            usedOnHover = true;
            p.vy = 0;
            p.vx *= 0.25;
            sfx("jump");
            puff(p.x, p.y, "#d8f0ff", 12, 160);
          }
        }
        if (usedOnHover) {
          // the press bought the hover, not a jump
        } else if (canWallJump) {
          // Kick up and away from the wall. It costs no air jump, so a wall can
          // be climbed by steering back into it and jumping again — the push is
          // deliberately small enough that air control gets you back in ~0.15s.
          p.vy = -p.stats.jump * 0.92 * chillJump;
          p.vx = p.wallDir * WALL_JUMP_PUSH;
          p.wallJumps = (p.wallJumps || 0) + 1;
          p.wallTimer = 0;
          p.wallCooldown = 0.14;
          p.grounded = false;
          p.groundPlatform = null;
          pulse(p, 0.16, 35);
          sfx("jump");
          burst(p.x - p.wallDir * p.stats.radius, p.y, "#ffffff", 9, 190);
        } else if (p.jumpsLeft > 0) {
          // Firecracker Heels: an air jump goes off like a mortar under you
          if (!p.grounded && p.stats.jumpBlast) {
            const dmg = 15 * p.stats.jumpBlast;
            fields.push({ type: "push", owner: p, x: p.x, y: p.y + 20, r: 110, life: 0.14, maxLife: 0.14, force: 640 });
            for (const q of players) {
              if (!q.alive || q === p || q.spawnGrace > 0) continue;
              const d = Math.hypot(q.x - p.x, q.y - (p.y + 20));
              if (d < 110) hurt(q, (1 - d / 110) * dmg + 4, p, q.x - p.x, q.y - p.y);
            }
            burst(p.x, p.y + 16, "#ff9e3d", 18, 320);
            // and a handful of lit crackers kicked out of the heels, which
            // tumble down and pop wherever they land
            for (let i = 0; i < 3 + p.stats.jumpBlast; i += 1) {
              crackers.push({
                x: p.x + rand(-8, 8), y: p.y + p.stats.radius * 0.6,
                vx: rand(-150, 150) + p.vx * 0.25, vy: rand(-60, 60),
                rot: rand(0, Math.PI * 2), spin: rand(-9, 9),
                fuse: rand(0.5, 1.1), owner: p
              });
            }
            flames(p.x, p.y + 18, 8, 12, 0.9);
            smoke(p.x, p.y + 16, 2, 10, 0.8);
            world.shake = Math.max(world.shake, 5);
            sfx("boom");
          }
          p.vy = -p.stats.jump * chillJump;
          p.jumpsLeft -= 1;
          p.grounded = false;
          p.groundPlatform = null;
          pulse(p, 0.12, 25);
          sfx("jump");
          puff(p.x, p.y + p.stats.radius, "#ffffff", 10);
        }
      }

      if (p.input.specialPressed && !stunned) tryActive(p);
      if (p.input.blockPressed && !stunned && !tryActive(p)) tryBlock(p);
      if (p.input.shoot && !stunned) tryShoot(p);

      // Hummingbird: hovering holds you in place, wings blurring, until this
      // jump's budget runs out or you touch down. Gravity is cancelled rather
      // than fought, so the hover is dead still and easy to shoot from.
      if (p.stats.hover > 0) {
        if (p.grounded) { p.hoverLeft = p.stats.hover; p.hovering = false; }
        if (p.hovering) {
          p.hoverLeft -= dt;
          if (p.hoverLeft <= 0) { p.hovering = false; p.hoverLeft = 0; }
          else {
            p.vy = Math.sin(world.time * 9) * 12;      // a small idling bob
            p.vx *= Math.pow(0.02, dt);
            p.wingPhase = (p.wingPhase || 0) + dt * 46;
            if (Math.random() < dt * 30) {
              puffOne(p.x + rand(-18, 18), p.y + p.stats.radius * 0.7, "rgba(220,240,255,0.6)");
            }
          }
        }
      }

      p.vy += levelGravity() * dt;
      if (p.hovering) p.vy -= levelGravity() * dt;    // the hover pays for itself
      // Springload: the stomper rides the head DOWN while it compresses, and is
      // thrown off it on the way back up, so the launch reads as a rebound
      if (p.stompHold > 0) {
        p.stompHold -= dt;
        p.vy = 120;
        if (p.stompHold <= 0) {
          p.vy = -(p.stompLaunch || p.stats.jump * 1.05);
          p.stompLaunch = 0;
          pulse(p, 0.25, 80);
          sfx("bounce");
        }
      }
      // Tailwind: holding jump in mid-air spends a float budget to hang, and
      // the budget refills once you touch down again
      if (p.stats.floatTime > 0) {
        if (p.grounded) p.floatLeft = p.stats.floatTime;
        else if (p.input.jump && p.floatLeft > 0 && p.vy > -30) {
          p.floatLeft = Math.max(0, p.floatLeft - dt);
          p.vy = Math.min(p.vy, 26);
          p.vy -= levelGravity() * dt * 0.92;
          if (Math.random() < dt * 26) {
            puffOne(p.x + rand(-16, 16), p.y + p.stats.radius * 0.6, "rgba(220,240,255,0.75)");
          }
        }
      }
      // hugging a wall slows the fall, giving you time to line up the next kick
      if (!p.grounded && p.wallTimer > 0 && p.vy > WALL_SLIDE_MAX) {
        p.vy = WALL_SLIDE_MAX;
        if (Math.random() < dt * 22) {
          puffOne(p.x - p.wallDir * p.stats.radius, p.y + rand(-10, 14), "rgba(255,255,255,0.75)");
        }
      }
      if (wind) p.vx += wind * 0.55 * dt;
      p.vx *= Math.pow(p.grounded && !onIce ? world.floorDrag : world.airDrag, dt * 60);
      // carry by mover
      if (p.grounded && p.groundPlatform && p.groundPlatform.isMover) {
        p.x += p.groundPlatform.vxDelta;
        p.y += p.groundPlatform.vyDelta;
      }
      // conveyor
      if (p.grounded && p.groundPlatform && p.groundPlatform.conveyor) {
        p.x += p.groundPlatform.conveyor * dt;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.grounded = false;
      p.groundPlatform = null;

      collidePlayer(p, plats);
      collidePlayerSlabs(p, dt);

      // Springload: landing on a head is an attack and a launchpad
      if (p.stats.stomp && p.vy > 160 && p.stompGrace <= 0) {
        for (const q of players) {
          if (!q.alive || q === p || q.spawnGrace > 0) continue;
          const dx = q.x - p.x, dy = q.y - p.y;
          if (Math.abs(dx) < q.stats.radius + p.stats.radius * 0.7 &&
              dy > 0 && dy < q.stats.radius + p.stats.radius + 10) {
            hurt(q, 25 * p.stats.stomp, p, dx * 0.4, 120);
            // the head squashes under the landing and springs back, and the
            // stomper leaves on the spring rather than the impact
            q.squish = SQUISH_TIME;
            p.vy = 120;
            p.stompHold = SQUISH_TIME * 0.45;
            p.stompLaunch = p.stats.jump * 1.05;
            p.jumpsLeft = Math.max(p.jumpsLeft, 1);
            p.stompGrace = 0.5;
            burst(q.x, q.y - q.stats.radius, "#ffe169", 14, 280);
            sfx("thud");
            break;
          }
        }
      }

      // bounce pads
      for (const pad of level.bouncePads || []) {
        if (p.vy > 0 &&
            p.x > pad.x - 10 && p.x < pad.x + pad.w + 10 &&
            p.y + p.stats.radius > pad.y && p.y + p.stats.radius < pad.y + 46) {
          p.vy = -pad.power;
          p.grounded = false;
          sfx("bounce");
          burst(p.x, pad.y, level.palette.accent, 16, 300);
          pulse(p, 0.2, 60);
        }
      }

      // teleporters (must leave a pad before it re-arms)
      let onTele = false;
      for (const t of level.teleporters || []) {
        const near = (x, y) => Math.hypot(p.x - x, p.y - y) < 40;
        let dest = null;
        if (near(t.ax, t.ay)) dest = { x: t.bx, y: t.by };
        else if (near(t.bx, t.by)) dest = { x: t.ax, y: t.ay };
        if (!dest) continue;
        onTele = true;
        if (!p.teleWasInside && p.teleCooldown <= 0) {
          burst(p.x, p.y, level.palette.accent, 20, 320);
          p.x = dest.x; p.y = dest.y;
          p.teleCooldown = 0.4;
          burst(p.x, p.y, level.palette.accent, 20, 320);
          sfx("teleport");
          break;
        }
      }
      p.teleWasInside = onTele;

      // Water — the rising tide, or a pool tagged {kind:"water"} — is somewhere
      // you can be, not something that kills you. You float, you slow down, and
      // it wears you down in small bites until you climb out.
      const submerged = inWater(p.x, p.y, level);
      if (submerged) {
        p.vy -= levelGravity() * dt * 0.72;     // buoyancy
        p.vy *= Math.pow(0.9, dt * 60);          // and the water resists
        p.vx *= Math.pow(0.93, dt * 60);
        soakDamage(p, dt);
        if (Math.random() < dt * 12) puffOne(p.x + rand(-14, 14), p.y - 18, "#9ff0e0");
      } else p.soak = 0;

      // falling out of the bottom throws you back in — the pit only finishes
      // the job after a couple of returns
      if (p.y > world.height + 30) pitBounce(p);
      if (p.x < -160 || p.x > world.width + 160) hurtRaw(p, 999, null);
      if (settings.hazards) {
        for (const h of level.hazards) {
          if (h.kind === "water") continue; // handled above, as a volume
          if (circleRect(p, h)) { hazardHit(p, h); break; }
        }
      }
    }
  }

  function collidePlayer(p, plats) {
    const r = p.stats.radius;
    // wallDir points AWAY from the surface, i.e. the way a wall jump throws you
    if (p.x < r) { p.x = r; p.vx = Math.abs(p.vx) * 0.46; touchWall(p, 1); }
    if (p.x > world.width - r) { p.x = world.width - r; p.vx = -Math.abs(p.vx) * 0.46; touchWall(p, -1); }
    if (p.y < r) { p.y = r; p.vy = Math.abs(p.vy) * 0.42; }
    for (const platform of plats) {
      const overlap = playerPlatformOverlap(p, platform);
      if (!overlap) continue;
      // a bored-out gap is a way through, for people as well as bullets
      if (platform.holes && inHole(platform, p.x, p.y, r, true)) continue;
      if (overlap.side === "top") {
        p.y -= overlap.amount;
        p.vy = Math.min(0, p.vy);
        p.grounded = true;
        p.groundPlatform = platform;
        p.jumpsLeft = 1 + p.stats.extraJumps;
        p.floatLeft = p.stats.floatTime;
      } else if (overlap.side === "bottom") {
        p.y += overlap.amount;
        p.vy = Math.max(0, p.vy) * 0.24;
      } else if (overlap.side === "left") {
        if (platform.isCrate) {
          // shoulder the crate along instead of stopping dead
          platform.crateRef.x += overlap.amount * 0.55;
          platform.crateRef.vx = Math.max(platform.crateRef.vx, p.vx * 0.9);
          p.x -= overlap.amount * 0.45;
        } else {
          p.x -= overlap.amount;
          p.vx = Math.min(0, p.vx) * 0.22;
          touchWall(p, -1);
        }
      } else if (overlap.side === "right") {
        if (platform.isCrate) {
          platform.crateRef.x -= overlap.amount * 0.55;
          platform.crateRef.vx = Math.min(platform.crateRef.vx, p.vx * 0.9);
          p.x += overlap.amount * 0.45;
        } else {
          p.x += overlap.amount;
          p.vx = Math.max(0, p.vx) * 0.22;
          touchWall(p, 1);
        }
      }
    }
  }

  // Wall contact is remembered for a short window so a jump pressed a frame or
  // two after sliding off the edge of a wall still counts (coyote time).
  const WALL_COYOTE = GP.wall.coyote;
  const WALL_JUMP_PUSH = GP.wall.jumpPush;
  const CHARGE = GP.chargeJump;
  // How much of a launch a wind-up has bought. A tap is worth nothing extra;
  // past minHold it climbs to maxMul at maxHold.
  // Configured in HEIGHT, which is what a player reads off the screen, and
  // returned as a LAUNCH SPEED multiplier — rise goes as the square of speed.
  // The top of the range is the height of the ARENA, measured against the
  // arena's own gravity, so a taller board is cleared just as completely
  // rather than the fighter simply pinning himself to a low ceiling.
  function chargeMul(held, p) {
    if (!held || held < CHARGE.minHold) return 1;
    const k = Math.min(1, (held - CHARGE.minHold) / (CHARGE.maxHold - CHARGE.minHold));
    const g = levelGravity();
    const v0 = p.stats.jump;
    const base = (v0 * v0) / (2 * g);                       // their ordinary rise
    const rise = CHARGE.minHeight * base +
      (CHARGE.maxBoards * world.height - CHARGE.minHeight * base) * k;
    return Math.sqrt(2 * g * rise) / v0;
  }
  const WALL_SLIDE_MAX = GP.wall.slideMax;
  function touchWall(p, awayDir) {
    if (p.grounded) return;
    p.wallDir = awayDir;
    p.wallTimer = WALL_COYOTE;
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
    if (p.vy >= 0 && vertical && vertical.side === "top" && vertical.amount < r * 1.4) return vertical;
    if (p.vy < 0 && vertical && vertical.side === "bottom" && vertical.amount < r * 1.1) return vertical;
    return overlaps[0] || vertical;
  }

  // ----------------------------------------------------------------- combat
  // The block effects that happen *at a place* — normally where the blocker
  // stands, but Return to Sender fires them again wherever the empowered
  // bullet lands. Movement effects (dash, warp) stay on the body and are not
  // part of this set.
  function blockEffectsAt(p, x, y) {
    if (p.stats.blockPush) fields.push({ type: "push", owner: p, x, y, r: 190, life: 0.18, maxLife: 0.18, force: 1000, scatter: true });
    if (p.stats.stormBlock) {
      for (const q of players) {
        if (!q.alive || q === p || q.spawnGrace > 0) continue;
        const d = Math.hypot(q.x - x, q.y - y);
        if (d < 260) {
          boltVisual(x, y, q.x, q.y, "#ffe95e", 0.25);
          hurt(q, 30, p, q.x - x, q.y - y - 120);
        }
      }
      // the crown itself: a burst of lightning thrown outward from the block
      fxShot("storm-nova", x, y, 300, 0.4, { grow: 0.8 });
      world.shake = Math.max(world.shake, 8);
      sfx("chain");
    }
    if (p.stats.frostBlock) {
      for (const q of players) {
        if (!q.alive || q === p || q.spawnGrace > 0) continue;
        if (Math.hypot(q.x - x, q.y - y) < 260) {
          q.chillTimer = Math.max(q.chillTimer, 2.5 * p.stats.frostBlock);
          burst(q.x, q.y, "#8fd8ff", 12, 220);
        }
      }
      burst(x, y, "#8fd8ff", 18, 280);
    }
    if (p.stats.healField) {
      fields.push({
        type: "heal", owner: p, x, y,
        r: 130 + (p.stats.healField - 1) * 40, life: 10,
        hps: 10 * p.stats.healField
      });
      sfx("card");
    }
  }

  // `free` is Panic Button's automatic block: an EXTRA shield, so it neither
  // waits on the block cooldown nor spends it — your manual parry is still
  // there the instant you want it.
  function tryBlock(p, free = false) {
    if (p.silenceTimer > 0) return;
    if (!free && p.blockCooldown > 0) return;
    p.blockTimer = p.stats.blockDuration;
    if (!free) p.blockCooldown = p.stats.blockCooldown;
    pulse(p, 0.32, 95);
    sfx("block");
    burst(p.x, p.y, "#ffffff", 14, 240);
    // Body Double: the decoy stands where you blocked — before a warp moves you
    if (p.stats.decoy) {
      // set a step to the side, so the copy is a separate body rather than
      // a second drawing hidden underneath you
      // The copy stands EXACTLY where you were, facing the way you were —
      // that is the whole trick. You are the one who moves: the block shoves
      // you back off the spot so the decoy is left holding it.
      decoys.push({
        x: p.x, y: p.y, hp: 20 * p.stats.decoy, maxHp: 20 * p.stats.decoy,
        owner: p, character: p.character, color: p.color, life: 6, wobble: Math.random() * 6,
        facing: p.facing || 1, aimX: p.aimX, aimY: p.aimY,
        isDecoy: true
      });
      p.vx -= (p.facing || 1) * 320;
    }
    if (p.stats.warpBlock) {
      burst(p.x, p.y, p.color, 18, 300);
      p.x = clamp(p.x + p.aimX * 260, p.stats.radius, world.width - p.stats.radius);
      p.y = clamp(p.y + p.aimY * 200, p.stats.radius, world.height - 60);
      burst(p.x, p.y, p.color, 18, 300);
      sfx("teleport");
    }
    if (p.stats.blockDash) {
      p.vx += p.aimX * 720;
      p.vy += p.aimY * 520;
    }
    if (p.stats.blockReload) {
      p.ammo = p.stats.maxAmmo;
      p.reloadTimer = 0;
      puff(p.x, p.y, "#ffe169", 10);
    }
    if (p.stats.sawBlock) {
      fields.push({
        type: "saw", owner: p, x: p.x, y: p.y,
        r: 64 + p.stats.sawBlock * 8, life: 3, angle: Math.random() * 6.3,
        dmg: 9 + p.stats.sawBlock * 3
      });
    }
    // Bricklayer: conjure a loose slab in front of you; it drops into the
    // arena's rigid-body pool and lives by the same physics as a cut platform
    if (p.stats.brickBlock) {
      const mine = props.slabs.filter(s => !s.dead && s.brickOwner === p).length;
      if (mine < 1 + p.stats.brickBlock) {
        const bx = clamp(p.x + p.aimX * 150, 90, world.width - 90);
        const by = clamp(p.y + p.aimY * 110 - 30, 60, world.height - 80);
        // stood on end: a wall you can hide behind, not a shelf
        const w = 24, h = 150;
        props.slabs.push({
          x: bx, y: by, w, h, ice: false,
          angle: 0,
          vx: 0, vy: -40, va: 0,
          I: (w * w + h * h) / 12,
          rest: 0, thudCd: 0, dead: false, brickOwner: p
        });
        burst(bx, by, "#d8c8a8", 16, 240);
        sfx("bounce");
      }
    }
    if (p.stats.empowerBlock) {
      p.empowerShot = p.stats.empowerBlock;
      puff(p.x, p.y - p.stats.radius, "#ffd700", 8);
    }
    blockEffectsAt(p, p.x, p.y);
    if (p.stats.echoBlock) p.echoTimer = 0.19;
  }

  function tryActive(p) {
    if (!p.stats.active || p.activeCooldown > 0 || p.silenceTimer > 0) return false;
    p.activeCooldown = p.stats.activeCooldown;
    pulse(p, 0.75, 170);
    sfx("mythic");
    burst(p.x, p.y, "#ff4d8f", 30, 480);
    const aim = Math.atan2(p.aimY, p.aimX);
    // Mythic stacking: a duplicate cannot give you a second ability, so it
    // sharpens the one you have — shorter cooldown, longer-lived effect.
    const stacks = p.stats.activeStacks || 1;
    if (p.stats.active === "eventHorizon") {
      // thrown, not placed: it flies like a round and plants where it hits
      const a2 = Math.atan2(p.aimY, p.aimX);
      bullets.push({
        owner: p, x: p.x + Math.cos(a2) * 34, y: p.y + Math.sin(a2) * 34,
        prevX: p.x, prevY: p.y, ox: p.x, oy: p.y,
        vx: Math.cos(a2) * 820, vy: Math.sin(a2) * 820,
        r: 16, damage: 12, life: 4, gravity: 260, drag: 1, restitution: 0,
        bounces: 0, explosive: 0, homing: 0, pierce: 0, poison: 0, burn: 0,
        chill: 0, chain: 0, shards: 0, popcorn: 0, grow: 0, groundHug: 0, voidPull: 0,
        wallPierce: 0, holePunch: 0, bankShot: 0, stink: 0, dazzle: 0, silence: 0,
        boomerang: 0, steer: 0, empowered: 0, golden: false, isShard: true,
        singularity: stacks, hitIds: new Set(), color: "#c88fff"
      });
      showToast(str("toast.eventHorizon", { name: p.name }));
      return true;
    }
    if (p.stats.active === "starfall") {
      const tx = clamp(p.x + p.aimX * 420, 120, world.width - 120);
      for (let i = 0; i < 5; i += 1) {
        const sx = tx + (i - 2) * 80 + rand(-25, 25);
        bullets.push({
          owner: p, x: sx, y: -40 - i * 60, prevX: sx, prevY: -40, ox: sx, oy: -40,
          vx: rand(-40, 40), vy: 900 + rand(0, 250),
          r: 15, damage: 34, life: 3, gravity: 500, drag: 1, restitution: 0.5,
          bounces: 0, explosive: 1.2, homing: 0, pierce: 0, poison: 0, burn: 1,
          chain: 0, shards: 0, popcorn: 0, grow: 0, golden: false, isShard: true,
          color: "#ff9e3d", meteor: true, hitIds: new Set()
        });
      }
      showToast(str("toast.starfall", { name: p.name }));
    } else if (p.stats.active === "chronoshift") {
      // handled by the rewind branch in update(): it runs while the button is
      // HELD, so there is nothing to do on the press itself
      p.activeCooldown = 0;
      return false;
    }
    return true;
  }

  // Underdog: every round you trail the current leader makes you scrappier
  function underdogMul(p) {
    if (!p.stats.underdog) return 1;
    const lead = Math.max(0, ...players.filter(q => q !== p).map(q => q.score)) - p.score;
    return 1 + p.stats.underdog * Math.max(0, lead);
  }

  // One trigger pull's worth of pellets. Triple Tap echoes and Encore ghosts
  // re-fire this with a damage multiplier (and, for Encore, the recorded aim),
  // so every card a bullet carries rides along on the repeats too.
  function fireVolley(p, opts = {}) {
    const golden = opts.golden || false;
    const mul = (opts.mul ?? 1) * underdogMul(p);
    const baseAngle = opts.angle ?? Math.atan2(p.aimY, p.aimX);
    const empower = opts.empower || 0;
    const rageMul = p.stats.rage > 0 ? 1 + p.stats.rage * (1 - clamp(p.hp / p.stats.maxHp, 0, 1)) : 1;
    const pellets = opts.pellets || p.stats.pellets;
    const from = opts.from || null;
    const spreadStep = opts.pellets ? Math.max(p.stats.spread, 0.09) : p.stats.spread;
    // Rigged characters fire from the actual barrel tip; everyone else keeps
    // the old fixed offset along the aim.
    const muz = window.ROUNDERS.rig
      ? window.ROUNDERS.rig.muzzle(p.character, p.stats.radius, p.aimX, p.aimY, 0, p.facing || 0)
      : null;
    // A flash off the barrel tip, pointing where the shot went. The art is
    // drawn pointing right, so it rotates onto the aim; it rides the fighter
    // for its one frame of life so it does not lag behind a moving shooter.
    {
      const mx = muz ? muz.x : Math.cos(baseAngle) * 34;
      const my = muz ? muz.y : Math.sin(baseAngle) * 34;
      const from = opts.from || null;
      // the art's hot core sits back from its cone, so the flash is nudged
      // forward along the aim to put the core on the barrel tip itself
      const lead = 12;
      fxShot("muzzle-flash",
        (from ? from.x : p.x) + mx + Math.cos(baseAngle) * lead,
        (from ? from.y : p.y) + my + Math.sin(baseAngle) * lead,
        54 + p.stats.bulletSize * 8, 0.07,
        { rot: baseAngle, follow: from ? null : { p, dx: mx + Math.cos(baseAngle) * lead, dy: my + Math.sin(baseAngle) * lead } });
    }
    let newest = null;
    for (let i = 0; i < pellets; i += 1) {
      const spread = (i - (pellets - 1) / 2) * spreadStep + rand(-0.018, 0.018);
      const a = baseAngle + spread;
      const speed = p.stats.bulletSpeed * rand(0.94, 1.05);
      const b = {
        owner: p,
        x: (from ? from.x : p.x) + (muz && !from ? muz.x : Math.cos(a) * 34),
        y: (from ? from.y : p.y) + (muz && !from ? muz.y : Math.sin(a) * 34),
        prevX: from ? from.x : p.x, prevY: from ? from.y : p.y,
        ox: from ? from.x : p.x, oy: from ? from.y : p.y,
        vx: Math.cos(a) * speed + p.vx * 0.18,
        vy: Math.sin(a) * speed + p.vy * 0.08,
        // Berserker's Blood: a raging round is visibly fatter, so how close
        // its owner is to death can be read off the bullet itself
        r: (5.5 + Math.min(9, p.stats.damage / 22)) * p.stats.bulletSize
           * (1 + (rageMul - 1) * 0.55),
        rage: rageMul - 1,
        damage: p.stats.damage * rageMul * mul
          * (golden ? (pellets > 1 ? 2 : 3) : 1)
          * (empower ? 1 + 0.75 * empower : 1),
        life: 3.2,
        // seekers fly true: homing shots shrug off most of their drop
        gravity: p.stats.helium
          ? -p.stats.bulletGravity * (0.35 + 0.15 * (p.stats.helium - 1))
          : p.stats.bulletGravity * (p.stats.homing > 0 ? 0.4 : 1),
        drag: p.stats.bulletDrag,
        restitution: p.stats.bulletRestitution,
        bounces: p.stats.bounces + (currentLevel().bulletBounceBonus || 0),
        explosive: p.stats.explosive,
        homing: p.stats.homing,
        pierce: p.stats.pierce,
        poison: p.stats.poison,
        burn: p.stats.burn,
        chill: p.stats.chill,
        chain: p.stats.chain,
        shards: p.stats.shards,
        popcorn: p.stats.popcorn,
        grow: p.stats.grow,
        glass: p.stats.glass,
        groundHug: p.stats.groundHug,
        voidPull: p.stats.voidPull,
        // Drill Rounds: how much solid a shot can bore through, in px of thickness
        // Drill Rounds: how many pieces of terrain a shot can bore through,
        // whatever they are made of and however thick they are
        wallPierce: p.stats.wallPierce,
        holePunch: p.stats.holePunch,
        bankShot: p.stats.bankShot,
        kbDeal: p.stats.kbDeal,
        stink: p.stats.stink,
        dazzle: p.stats.dazzle,
        silence: p.stats.silence,
        boomerang: p.stats.boomerang,
        steer: p.stats.steer,
        empowered: empower,
        golden,
        isShard: false,
        ghost: opts.ghost || false,
        hitIds: new Set(),
        color: golden ? "#ffd700" : empower ? "#ffd700" : p.color
      };
      bullets.push(b);
      newest = b;
    }
    // Puppet Strings drives only the newest bullet — the one you just fired
    if (p.stats.steer && newest) p.steeredBullet = newest;
    if (!from) {
      p.vx -= Math.cos(baseAngle) * 70 * mul;
      p.vy -= Math.sin(baseAngle) * 20 * mul;
    }
    pulse(p, 0.18, 45);
  }

  function tryShoot(p) {
    if (p.fireTimer > 0 || p.reloadTimer > 0 || p.ammo <= 0) return;
    p.fireTimer = fireDelayOf(p);
    // Golden Gun stacks by widening the golden window: one copy gilds the first
    // round of the magazine, two gild the first two, and so on
    const golden = p.stats.goldenShot > 0 && p.ammo > p.stats.maxAmmo - p.stats.goldenShot;
    p.ammo -= 1;
    if (p.stats.bloodMoney) {
      // the pact never finishes you off, but it always collects
      p.hp = Math.max(1, p.hp - 5 * p.stats.bloodMoney);
      p.hitFlash = Math.max(p.hitFlash || 0, 0.12);
      puffOne(p.x + rand(-10, 10), p.y + rand(-10, 10), "#ff4d5f");
    }
    sfx(golden ? "golden" : "shoot");
    const empower = p.empowerShot;
    p.empowerShot = 0;
    const angle = Math.atan2(p.aimY, p.aimX);
    fireVolley(p, { golden, empower, angle });
    // Hummingbird: shooting from the hover empties the magazine in one buzzing
    // string of rounds — the rest of the ammo goes off 60ms apart and the
    // reload starts immediately, so the hover is a burst you commit to
    if (p.hovering && p.ammo > 0) {
      const rest = p.ammo;
      p.ammo = 0;
      for (let i = 1; i <= rest; i += 1) p.burstQueue.push({ t: i * 0.06, mul: 1 });
      p.reloadTimer = reloadOf(p);
      p.fireTimer = Math.max(p.fireTimer, rest * 0.06 + 0.05);
    }
    // Triple Tap: the echoes follow on their own, aimed wherever you are then
    if (p.stats.burstFire) {
      for (let i = 1; i <= p.stats.burstFire; i += 1) {
        p.burstQueue.push({ t: i * 0.09, mul: 0.45 });
      }
    }
    // Encore: one ghost of this shot per stack, a beat apart
    for (let i = 1; i <= p.stats.encore; i += 1) {
      // the ghost fires a full second later, as a twin shot, from the spot the
      // original was fired from — so stepping aside after shooting leaves the
      // encore covering the ground you just left
      p.encoreQueue.push({ t: 1 * i, angle, mul: 0.5, pellets: 2, from: { x: p.x, y: p.y } });
    }
    // Panic Button: the empty click doubles as the block button. Stacking arms
    // it earlier — two copies cover the last two rounds in the magazine.
    if (p.ammo < p.stats.autoBlock) tryBlock(p, true);
    if (p.ammo <= 0) p.reloadTimer = reloadOf(p);
  }

  function updateBullets(dt) {
    const level = currentLevel();
    const plats = activePlatforms(level, world.time);
    const wind = windForce();
    for (const b of bullets) {
      // Boomerang, coming home: fly to the owner's hand, through everything
      if (b.returning) {
        const o = b.owner;
        if (!o || !o.alive) { b.life = -1; continue; }
        const cur = Math.atan2(b.vy, b.vx);
        const want = Math.atan2(o.y - b.y, o.x - b.x);
        let diff = want - cur;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const a = cur + clamp(diff, -9 * dt, 9 * dt);
        const sp = Math.max(700, Math.hypot(b.vx, b.vy));
        b.vx = Math.cos(a) * sp;
        b.vy = Math.sin(a) * sp;
        b.prevX = b.x; b.prevY = b.y;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;
        if (Math.random() < dt * 30) puffOne(b.x, b.y, b.color);
        if (Math.hypot(o.x - b.x, o.y - b.y) < o.stats.radius + b.r + 6) {
          o.ammo = Math.min(o.stats.maxAmmo, o.ammo + 1);
          if (o.reloadTimer > 0 && o.ammo > 0) o.reloadTimer = 0;
          puff(o.x, o.y, "#ffe169", 8);
          sfx("card");
          b.life = -1;
          continue;
        }
        // it can still clip an enemy on the way back
        for (const p of players) {
          if (!p.alive || p === b.owner || p.spawnGrace > 0 || b.hitIds.has(p.id)) continue;
          if (Math.hypot(p.x - b.x, p.y - b.y) < p.stats.radius + b.r) {
            hurt(p, b.damage * 0.8, b.owner, b.vx, b.vy);
            b.hitIds.add(p.id);
            b.life = -1;
            break;
          }
        }
        continue;
      }
      // Puppet Strings: the newest bullet chases the owner's aim ray, so the
      // shooter walks it around cover by moving the stick
      if (b.steer && b.owner && b.owner.alive && b.owner.steeredBullet === b) {
        const o = b.owner;
        const cur = Math.atan2(b.vy, b.vx);
        const want = Math.atan2(o.aimY, o.aimX);
        let diff = want - cur;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const maxTurn = Math.min(b.steer * 3.4, 7.5) * dt;
        const a = cur + clamp(diff, -maxTurn, maxTurn);
        const sp = Math.hypot(b.vx, b.vy);
        b.vx = Math.cos(a) * sp;
        b.vy = Math.sin(a) * sp;
        if (Math.random() < dt * 24) puffOne(b.x, b.y, "#ffffff");
      } else if (b.homing) {
        // Steering, not a nudge: rotate the whole velocity toward the target
        // at a turn rate set by the homing stat, keeping speed — so one card
        // visibly curves shots and two make heat-seekers. (The old version
        // added ~500 px/s² of side pull to an ~1100 px/s bullet: invisible.)
        const target = nearestEnemy(b);
        if (target) {
          const cur = Math.atan2(b.vy, b.vx);
          const want = Math.atan2(target.y - b.y, target.x - b.x);
          let diff = want - cur;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const maxTurn = Math.min(b.homing * 2.7, 6.5) * dt;
          const a = cur + clamp(diff, -maxTurn, maxTurn);
          const sp = Math.hypot(b.vx, b.vy);
          b.vx = Math.cos(a) * sp;
          b.vy = Math.sin(a) * sp;
        }
      }
      // Magnet Suit: wearers gently bend incoming bullets off course
      for (const q of players) {
        if (!q.alive || q === b.owner || !q.stats.repel) continue;
        const dx = b.x - q.x, dy = b.y - q.y;
        const d = Math.hypot(dx, dy);
        if (d > 1 && d < 340) {
          const cur = Math.atan2(b.vy, b.vx);
          const away = Math.atan2(dy, dx);
          let diff = away - cur;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          // a real shove: the old rate was too gentle to turn a fast round
          // aside before it arrived, so the card looked inert
          const maxTurn = Math.min(q.stats.repel * 3.4, 7) * (1 - d / 340) * dt;
          const a = cur + clamp(diff, -maxTurn, maxTurn);
          const sp = Math.hypot(b.vx, b.vy);
          b.vx = Math.cos(a) * sp;
          b.vy = Math.sin(a) * sp;
          if (Math.random() < dt * 30) {
            particles.push({
              x: b.x, y: b.y, vx: rand(-30, 30), vy: rand(-30, 30),
              life: 0.25, maxLife: 0.25, r: rand(1.2, 2.4), color: "#9fd8ff", spark: true
            });
          }
        }
      }
      b.prevX = b.x; b.prevY = b.y;
      // ground-hugging bullets catch a surface below them and skim along it,
      // kicking up dust — they drop off ledges and catch the next floor
      if (b.groundHug && b.vy > -60) {
        let caught = null;
        for (const platform of plats) {
          if (b.x < platform.x || b.x > platform.x + platform.w) continue;
          const gap = platform.y - b.y;
          if (gap > -6 && gap < 44 && (!caught || platform.y < caught.y)) caught = platform;
        }
        if (caught) {
          const targetY = caught.y - b.r - 2;
          b.y += (targetY - b.y) * Math.min(1, 14 * dt);
          b.vy = 0;
          b.hugging = true;
          if (Math.random() < dt * 30) puffOne(b.x, caught.y, "rgba(255,255,255,0.5)");
        } else b.hugging = false;
      }
      if (!b.hugging) b.vy += b.gravity * dt;
      if (wind) b.vx += wind * 0.9 * dt;
      let drag = Math.pow(b.drag, dt * 60);
      // Water drags a shot down hard: shooting across a pool is a real choice,
      // and a bullet fired into one visibly gives up.
      const wet = inWater(b.x, b.y, level);
      if (wet) {
        // Enough to matter — a shot across a pond arrives visibly late and
        // short — without stopping it dead the moment it touches the surface.
        drag *= Math.pow(0.955, dt * 60);
        if (Math.random() < dt * 26) {
          particles.push({
            x: b.x + rand(-4, 4), y: b.y + rand(-4, 4), vx: rand(-10, 10), vy: rand(-45, -12),
            life: 0.4, maxLife: 0.4, r: rand(1.5, 3), color: "#bff4ff"
          });
        }
      }
      b.vx *= drag; b.vy *= drag;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 && tryBoomerang(b)) continue;
      if (b.meteor) {
        if (Math.random() < dt * 60) flames(b.x, b.y, 1, 5, 1.1);
        if (Math.random() < dt * 24) smoke(b.x, b.y, 1, 6, 0.8);
      } else if (b.burn && Math.random() < dt * 40) {
        // an incendiary round is visibly alight in flight
        flames(b.x, b.y, 1, 3, 0.7);
      }
      particles.push({
        x: b.x, y: b.y, vx: rand(-16, 16), vy: rand(-16, 16),
        life: 0.16, maxLife: 0.16, r: b.golden ? 3 : 2,
        color: b.burn ? "#ff9e3d" : b.color
      });

      if (b.life > 0 && checkChainHits(b)) {
        b.life = -1;
      }
      if (b.life > 0 && checkSlabHits(b)) {
        b.life = -1;
        explodeBullet(b);
      }

      for (const platform of plats) {
        if (b.life <= 0) break;
        if (circleRect(b, platform)) {
          // a plain shot flies clean through a gap someone already bored
          if (platform.holes && inHole(platform, b.x, b.y, b.r) && !b.holePunch) continue;
          // A borer starts biting where solid material actually begins.
          // Collision fires at the slab's FACE, so without first walking
          // through what has already been excavated, every shot would re-cut
          // the same opening bite and a thick wall could never be holed.
          let bx = b.x, by = b.y;
          if (b.holePunch && !platform.isCrate) {
            const mag = Math.hypot(b.vx, b.vy) || 1;
            const dx = b.vx / mag, dy = b.vy / mag;
            const solidAt = (x, y) => x > platform.x && x < platform.x + platform.w &&
              y > platform.y && y < platform.y + platform.h && !inHole(platform, x, y, 0);
            let guard = 0;
            while (guard < 400 && !solidAt(bx, by)) {
              if (bx > platform.x + platform.w + 4 || bx < platform.x - 4 ||
                  by > platform.y + platform.h + 4 || by < platform.y - 4) break;
              bx += dx * 3; by += dy * 3; guard += 3;
            }
            if (!solidAt(bx, by)) continue;    // the way through is already clear
          }
          // a bite wide enough for a fighter (radius 27) to climb through
          if (b.holePunch && !platform.isCrate &&
              punchHole(platform, bx, by, 64 + 14 * (b.holePunch - 1), Math.atan2(b.vy, b.vx))) {
            b.life = -1;
            world.shake = Math.max(world.shake, 7);
            sfx("boom");
            explodeBullet(b);
            continue;
          }
          // Drill Rounds go through ANYTHING — stone, breakable panel, crate,
          // thick or thin — and spend one hole doing it. Checked before the
          // material-specific cases so no material is exempt; whatever the
          // round would have done to it on impact, it still does on the way
          // through.
          if (b.wallPierce > 0 && drillThrough(b, platform)) {
            if (platform.isCrate) damageCrate(platform.crateRef, b.damage, b.vx, b.vy);
            else if (platform.breakRef) damageBreakable(platform.breakRef, b.x, b.y, b.damage);
            sfx("block");
          } else if (platform.isCrate) {
            damageCrate(platform.crateRef, b.damage, b.vx, b.vy);
            b.life = -1;
            explodeBullet(b);
          } else if (platform.breakRef) {
            damageBreakable(platform.breakRef, b.x, b.y, b.damage);
            if (b.bounces > 0 && !platform.breakRef.dead) {
              bounceBullet(b, platform);
              b.bounces -= 1;
              sfx("block");
            } else if (!tryBoomerang(b)) {
              b.life = -1;
              explodeBullet(b);
            }
          } else if (b.bounces > 0) {
            bounceBullet(b, platform);
            b.bounces -= 1;
            sfx("block");
          } else if (!tryBoomerang(b)) {
            b.life = -1;
            explodeBullet(b);
          }
        }
      }

      // Body Doubles soak bullets like a body would
      for (const dcy of decoys) {
        if (b.life <= 0 || dcy.hp <= 0 || dcy.owner === b.owner) continue;
        if (Math.hypot(dcy.x - b.x, dcy.y - b.y) < 26 + b.r) {
          dcy.hp -= b.damage;
          puff(dcy.x, dcy.y, dcy.color, 8);
          if (b.pierce > 0) b.pierce -= 1;
          else { b.life = -1; explodeBullet(b); }
        }
      }

      for (const p of players) {
        if (!p.alive || p === b.owner || p.spawnGrace > 0 || b.hitIds.has(p.id)) continue;
        const d = Math.hypot(p.x - b.x, p.y - b.y);
        if (d < p.stats.radius + b.r) {
          if (p.blockTimer > 0) {
            // parry: reflect the bullet back
            const mag = Math.hypot(b.vx, b.vy) || 1;
            const inX = b.vx / mag, inY = b.vy / mag;
            // Boxing Glove: a block stops the DAMAGE, not the punch. The shove
            // lands through the parry, so a gloved round still shifts whoever
            // just caught it — you can be knocked off a ledge holding a block.
            if (b.kbDeal) {
              const kb = (1 - clamp(p.stats.kbResist, 0, 0.9)) * b.kbDeal;
              p.vx += inX * 300 * kb;
              p.vy += (inY * 150 - 130) * kb;
              pulse(p, 0.3, 110);
              world.shake = Math.max(world.shake, Math.min(10, 3 * b.kbDeal));
              burst(p.x - inX * p.stats.radius, p.y - inY * p.stats.radius, "#ffe169", 14, 300);
              sfx("hit");
            }
            b.owner = p;
            b.hitIds = new Set();
            b.kbDeal = p.stats.kbDeal;      // the punch belongs to whoever fires it
            b.vx = -inX * p.stats.bulletSpeed * 1.05;
            b.vy = -inY * p.stats.bulletSpeed * 1.05;
            b.color = p.color;
            b.x += b.vx * dt * 2;
            b.y += b.vy * dt * 2;
            pulse(p, 0.22, 70);
            sfx("parry");
          } else {
            const travel = Math.hypot(b.x - b.ox, b.y - b.oy);
            const growBonus = b.grow ? 1 + Math.min(1, travel / 600) : 1;
            const damage = b.damage * growBonus;
            hurt(p, damage, b.owner, b.vx, b.vy);
            if (b.owner && b.owner.alive && b.owner.stats.lifesteal) {
              siphonHealth(p, b.owner, damage * b.owner.stats.lifesteal);
            }
            if (b.owner && b.owner.alive) {
              const o = b.owner;
              // Waste Not: the hit hands the bullet back
              if (o.stats.scavenge) {
                if (o.reloadTimer > 0) o.reloadTimer = Math.max(0, o.reloadTimer - 0.4 * o.stats.scavenge);
                else o.ammo = Math.min(o.stats.maxAmmo, o.ammo + 1);
                for (let i = 0; i < o.stats.scavenge; i += 1) returnAmmo(p, o);
              }
              // Sugar Rush / Hot Streak / Second Serve: landing a hit pays out
              if (o.stats.sugarRush) o.sugarTimer = 2.5;
              if (o.stats.hotStreak) o.hotShield = 25 * o.stats.hotStreak;
              if (o.stats.blockRefresh && o.refreshLock <= 0) {
                o.blockCooldown = 0;
                // stacking shortens the lockout, so a second copy lets the
                // refresh keep up with a faster trigger finger
                o.refreshLock = 1 / o.stats.blockRefresh;
                puffOne(o.x, o.y - o.stats.radius - 8, "#ffffff");
              }
            }
            if (b.banked) {
              // it arrives with everything it picked up off the cushions
              burst(p.x, p.y, "#ffe169", 16 + b.banked * 8, 300 + b.banked * 80);
              burst(p.x, p.y, "#ffb03a", 10, 220);
            }
            if (b.dazzle && p.dazzleImmune <= 0) {
              p.stunTimer = Math.max(p.stunTimer, Math.min(0.7, 0.4 * b.dazzle));
              p.dazzleImmune = 2;
              // it is a camera flash: the bulb goes off all around them
              p.flashPop = 0.26;
              burst(p.x, p.y - p.stats.radius - 6, "#ffffff", 10, 160);
              burst(p.x, p.y, "#ffffff", 16, 320);
            }
            if (b.silence) {
              p.silenceTimer = Math.max(p.silenceTimer, 1.5 * b.silence);
              puff(p.x, p.y - p.stats.radius - 6, "#b8b8c8", 6);
            }
            // Return to Sender: the empowered shot carries its owner's block
            // effects to wherever it lands
            if (b.empowered && b.owner && b.owner.alive) {
              blockEffectsAt(b.owner, p.x, p.y);
              b.empowered = 0;
            }
            if (b.poison) {
              // doses ADD UP: sting them again and the venom gets worse, up to
              // a ceiling so a magazine cannot delete somebody outright
              const dose = (9 + b.damage * 0.1) * b.poison;
              p.poisonTimer = Math.max(p.poisonTimer, 3);
              p.poisonDps = Math.min(dose * 4, (p.poisonDps || 0) + dose);
              p.poisonAttacker = b.owner;
            }
            if (b.burn) {
              p.burnTimer = Math.max(p.burnTimer, 2.5);
              p.burnDps = Math.max(p.burnDps, (8 + b.damage * 0.1) * b.burn);
              p.burnAttacker = b.owner;
            }
            if (b.chill) {
              const fresh = p.chillTimer <= 0;   // only the moment it takes hold
              p.chillTimer = Math.max(p.chillTimer, 2);
              if (fresh) fxShot("frost-burst", p.x, p.y, p.stats.radius * 4, 0.35, { grow: 0.5 });
              burst(p.x, p.y, "#8fd8ff", 10, 200);
            }
            if (b.chain) chainLightning(b, p, damage);
            b.hitIds.add(p.id);
            if (b.pierce > 0) {
              b.pierce -= 1;
            } else {
              b.life = -1;
              explodeBullet(b);
            }
          }
        }
      }
    }
    bullets = bullets.filter(b => b.life > 0 && b.x > -120 && b.x < world.width + 120 && b.y > (b.meteor ? -420 : -160) && b.y < world.height + 120);
  }

  function chainLightning(b, victim, damage) {
    let best = null, bestD = Infinity;
    for (const q of players) {
      if (!q.alive || q === victim || q === b.owner || q.spawnGrace > 0) continue;
      const d = Math.hypot(q.x - victim.x, q.y - victim.y);
      if (d < bestD && d < 520) { bestD = d; best = q; }
    }
    for (const dcy of decoys) {
      if (dcy.hp <= 0 || dcy.owner === b.owner) continue;
      const d = Math.hypot(dcy.x - victim.x, dcy.y - victim.y);
      if (d < bestD && d < 520) { bestD = d; best = dcy; }
    }
    if (best && best.isDecoy) {
      boltVisual(victim.x, victim.y, best.x, best.y, "#ffe95e", 0.22);
      best.hp -= damage * 0.55 * b.chain;
      puff(best.x, best.y, best.color, 8);
      sfx("chain");
    } else if (best) {
      boltVisual(victim.x, victim.y, best.x, best.y, "#ffe95e", 0.22);
      hurt(best, damage * 0.55 * b.chain, b.owner, best.x - victim.x, best.y - victim.y);
      sfx("chain");
    } else {
      // Nobody else to jump to, so the bolt goes looking for something to
      // earth itself on: it strikes the top of a nearby wall and comes back,
      // catching the victim on the way out AND the way home. With nothing
      // tall enough around, it simply flies up and away into the sky.
      const perch = nearestPerch(victim);
      if (perch) {
        boltVisual(victim.x, victim.y, perch.x, perch.y, "#ffe95e", 0.26);
        hurtRaw(victim, damage * 0.35 * b.chain, b.owner);
        // the return leg lands a beat later, so it reads as there-and-back
        bolts.push({ delay: 0.12, from: { x: perch.x, y: perch.y }, to: { x: victim.x, y: victim.y },
          victim, damage: damage * 0.35 * b.chain, owner: b.owner, pending: true, life: 0.3, points: [], color: "#ffe95e" });
        sfx("chain");
      } else {
        // Nothing to earth on and nobody to jump to: rather than a bolt to
        // nowhere, the charge has no way out and fizzles across the victim as
        // crawling static.
        staticFizzle(victim, "#ffe95e");
        sfx("chain");
      }
    }
  }

  // Charge with nowhere to go: short arcs crawl around the fighter and spit
  // sparks, dying out in place instead of striking off into empty sky.
  function staticFizzle(victim, color) {
    const rad = (victim.stats ? victim.stats.radius : 24) + 6;
    for (let i = 0; i < 7; i += 1) {
      const a1 = Math.random() * Math.PI * 2;
      const a2 = a1 + rand(0.7, 2.1);
      boltVisual(
        victim.x + Math.cos(a1) * rad, victim.y + Math.sin(a1) * rad * 0.8,
        victim.x + Math.cos(a2) * rad, victim.y + Math.sin(a2) * rad * 0.8,
        color, rand(0.12, 0.34)
      );
    }
    for (let i = 0; i < 18; i += 1) {
      const a1 = Math.random() * Math.PI * 2;
      particles.push({
        x: victim.x + Math.cos(a1) * rad, y: victim.y + Math.sin(a1) * rad * 0.8,
        vx: Math.cos(a1) * rand(20, 70), vy: Math.sin(a1) * rand(20, 70) - 30,
        life: rand(0.25, 0.6), maxLife: 0.6, r: rand(1, 2.4),
        color: Math.random() < 0.5 ? color : "#ffffff", spark: true
      });
    }
  }

  // The nearest bit of terrain above head height that a stray bolt could
  // strike — its top edge, or halfway up if the thing is towering.
  function nearestPerch(victim) {
    const plats = activePlatforms(currentLevel(), world.time);
    const headY = victim.y - victim.stats.radius;
    let best = null, bestD = Infinity;
    for (const pl of plats) {
      if (pl.y >= headY - 10) continue;                       // not above their head
      const px = clamp(victim.x, pl.x, pl.x + pl.w);
      const d = Math.hypot(px - victim.x, pl.y - victim.y);
      if (d < bestD && d < 420) { bestD = d; best = { x: px, y: pl.y }; }
    }
    if (!best) return null;
    const rise = victim.y - best.y;
    // a very tall wall gets struck halfway up rather than at its distant top
    return rise > 320 ? { x: best.x, y: victim.y - rise / 2 } : best;
  }

  function plantSingularity(b) {
    const stacks = b.singularity || 1;
    fields.push({
      type: "blackhole", owner: b.owner, singularity: true,
      x: clamp(b.x, 90, world.width - 90),
      y: clamp(b.y, 90, world.height - 90),
      r: 380, life: 7 + (stacks - 1) * 2.5, force: -1500, dps: 16
    });
    burst(b.x, b.y, "#c88fff", 40, 520);
    world.shake = Math.max(world.shake, 12);
    sfx("mythic");
  }

  function explodeBullet(b) {
    if (b.singularity) { plantSingularity(b); return; }
    // Stink Bomb: the impact lingers as a poisonous, slowing cloud
    if (b.stink) {
      fields.push({
        type: "stink", owner: b.owner, x: b.x, y: b.y,
        r: 110 + b.stink * 30, life: 2.5, stink: b.stink
      });
    }
    // Return to Sender: an empowered shot that breaks on terrain still
    // delivers the block payload where it lands
    if (b.empowered && b.owner && b.owner.alive) {
      blockEffectsAt(b.owner, b.x, b.y);
      b.empowered = 0;
    }
    if (b.voidPull) {
      // a pocket vortex: brief, hungry, and very visible
      fields.push({
        type: "blackhole", owner: b.owner, x: b.x, y: b.y,
        r: 120 + b.voidPull * 40, life: 0.55 + b.voidPull * 0.25,
        force: -(520 + b.voidPull * 260), dps: 4 + b.voidPull * 3
      });
      sfx("teleport");
    }
    if (b.explosive) {
      fields.push({ type: "push", owner: b.owner, x: b.x, y: b.y, r: 95 + b.explosive * 20, life: 0.14, maxLife: 0.14, force: 760 });
      // the visible detonation: a white core that flashes out into expanding
      // shockwave spheres, scaled by the size of the charge
      fields.push({
        type: "boom", owner: b.owner, x: b.x, y: b.y,
        r: (105 + b.explosive * 12) * 1.35, life: 0.5, power: b.explosive
      });
      // The player the bullet actually hit is not immune to its own blast —
      // that read as "the explosion did nothing" in a duel, where there is
      // nobody else for the splash to catch (a legendary Supernova was just
      // +30% damage). They take a *share* of it instead of the full double-dip
      // that AUDIT C1 rightly called broken, and the share grows with the size
      // of the bang: a little uncommon pop stays a pop, a legendary detonation
      // is felt by whoever it went off against.
      const coreShare = clamp(0.25 + 0.12 * b.explosive, 0, 0.6);
      for (const p of players) {
        if (!p.alive || p === b.owner) continue;
        const direct = b.hitIds.has(p.id);
        const radius = 105 + b.explosive * 12;
        const d = Math.hypot(p.x - b.x, p.y - b.y);
        if (d < radius) {
          const splash = (1 - d / radius) * (26 + b.explosive * 9) * (direct ? coreShare : 1);
          // the direct victim already took knockback from the bullet, so the
          // blast only adds damage, not a second shove
          if (direct) hurtRaw(p, splash, b.owner);
          else hurt(p, splash, b.owner, p.x - b.x, p.y - b.y);
        }
      }
      world.shake = Math.max(world.shake, 9 + b.explosive * 2);
      flames(b.x, b.y, 10 + Math.round(b.explosive * 6), 16 + b.explosive * 6, 1 + b.explosive * 0.25);
      smoke(b.x, b.y, 4 + Math.round(b.explosive * 2), 14, 1 + b.explosive * 0.2);
      sfx("boom");
      // splash also batters nearby crates and cracked platforms
      const radius = 105 + b.explosive * 12;
      for (const c of props.crates) {
        if (c.dead) continue;
        const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
        const d = Math.hypot(cx - b.x, cy - b.y);
        if (d < radius) damageCrate(c, (1 - d / radius) * (30 + b.explosive * 10), (cx - b.x) * 4, (cy - b.y) * 4);
      }
      for (const [pl, brk] of props.breaks) {
        if (brk.dead) continue;
        const cx = clamp(b.x, pl.x, pl.x + pl.w), cy = clamp(b.y, pl.y, pl.y + pl.h);
        const d = Math.hypot(cx - b.x, cy - b.y);
        if (d < radius) damageBreakable(brk, cx, cy, (1 - d / radius) * (30 + b.explosive * 10));
      }
      for (const s of props.slabs) {
        if (s.dead) continue;
        const d = Math.hypot(s.x - b.x, s.y - b.y);
        if (d < radius + s.w / 2) {
          const f = (1 - Math.min(1, d / (radius + s.w / 2))) * (260 + b.explosive * 60);
          const mag = Math.hypot(s.x - b.x, s.y - b.y) || 1;
          s.vx += ((s.x - b.x) / mag) * f;
          s.vy += ((s.y - b.y) / mag) * f - 60;
          s.va += rand(-1, 1) * f / 200;
          wakeSlab(s);
        }
      }
    }
    if (b.shards && !b.isShard) {
      for (let i = 0; i < b.shards; i += 1) {
        const a = -Math.PI / 2 + (i - (b.shards - 1) / 2) * 0.55 + rand(-0.1, 0.1);
        bullets.push({
          owner: b.owner, x: b.x, y: b.y - 4, prevX: b.x, prevY: b.y, ox: b.x, oy: b.y,
          vx: Math.cos(a) * 520 + rand(-60, 60), vy: Math.sin(a) * 520,
          // long enough to finish the arc and reach the floor or a target —
          // at 0.9s they used to wink out at the top of their own hop
          r: Math.max(4, b.r * 0.55), damage: b.damage * 0.4, life: 2.6,
          gravity: 1500, drag: 0.997, restitution: 0.6,
          bounces: 0, explosive: 0, homing: 0, pierce: 0,
          poison: b.poison, burn: b.burn, chill: 0, chain: 0, shards: 0, popcorn: 0, grow: 0,
          golden: false, isShard: true, hitIds: new Set(), color: b.color
        });
      }
    }
    // Popcorn Payload: the round POPS. Ten hot kernels go straight up in a
    // spray, arc over and rain back down for a second helping of damage; any
    // that miss keep bouncing twice more before they give up.
    if (b.popcorn && !b.isShard && !b.kernel) {
      for (let i = 0; i < b.popcorn; i += 1) {
        const a = -Math.PI / 2 + rand(-0.85, 0.85);
        const sp = rand(340, 620);
        bullets.push({
          owner: b.owner, x: b.x + rand(-6, 6), y: b.y - 6,
          prevX: b.x, prevY: b.y, ox: b.x, oy: b.y,
          vx: Math.cos(a) * sp + rand(-70, 70), vy: Math.sin(a) * sp,
          r: Math.max(3.5, b.r * 0.4), damage: b.damage * 0.16, life: 3.4,
          gravity: 1700, drag: 0.999, restitution: 0.52,
          bounces: 2, explosive: 0, homing: 0, pierce: 0,
          poison: 0, burn: 0, chill: 0, chain: 0, shards: 0, popcorn: 0, grow: 0,
          golden: false, isShard: true, kernel: true,
          hitIds: new Set(), color: "#fff0c0"
        });
      }
      burst(b.x, b.y, "#fff0c0", 16, 300);
      sfx("bounce");
    }
    burst(b.x, b.y, b.color, b.explosive ? 30 : 10, b.explosive ? 520 : 180);
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
      if (Math.abs(b.x - cx) > Math.abs(b.y - cy)) {
        b.vx = -b.vx * restitution;
        b.x += Math.sign(b.vx) * (r + 2);
      } else {
        b.vy = -b.vy * restitution;
        b.y += Math.sign(b.vy) * (r + 2);
      }
    }
    b.hitIds = new Set(); // a fresh bounce can hit the same target again
    b.vx += rand(-18, 18);
    b.vy += rand(-18, 18);
    // Bank Shot: every cushion makes the ball smarter and meaner, and it stays
    // visibly charged for the rest of its flight — the sparks do not stop at
    // the cushion, so a round that has banked is obvious on sight
    if (b.bankShot) {
      b.homing = Math.max(b.homing, 0.9 * b.bankShot);
      b.damage *= 1 + 0.3 * b.bankShot;
      b.banked = (b.banked || 0) + 1;
      puff(b.x, b.y, "#ffe169", 10);
    }
  }

  // Drill Rounds: bore straight through a platform and come out the far side,
  // spending one of the round's holes. Material and thickness do not enter
  // into it — the only way this fails is a shot running the LENGTH of a wall
  // rather than across it, which has no far side to reach.
  function drillThrough(b, platform) {
    const vx = b.vx, vy = b.vy;
    const mag = Math.hypot(vx, vy) || 1;
    const dx = vx / mag, dy = vy / mag;
    // Walk forward until we are clear of this platform. The reach is taken
    // from the platform ITSELF — its own diagonal plus the round's width — so
    // thickness never decides whether a drill round makes it out the far side;
    // it is only a bound that stops a shot travelling along a wall's length
    // from looping forever.
    const step = 4;
    const reach = Math.hypot(platform.w, platform.h) + b.r * 4 + 64;
    let dist = 0;
    let x = b.x, y = b.y;
    while (dist < reach) {
      x += dx * step;
      y += dy * step;
      dist += step;
      const inside = x + b.r > platform.x && x - b.r < platform.x + platform.w &&
                     y + b.r > platform.y && y - b.r < platform.y + platform.h;
      if (!inside) {
        b.x = x + dx * 2;
        b.y = y + dy * 2;
        // the walk across the wall was a straight line; hand the round back
        // the drop it would have taken in that time, so a thick wall does not
        // flatten the shot's arc
        b.vy += (b.gravity || 0) * (dist / mag);
        b.wallPierce -= 1;                     // one hole spent, whatever it was
        b.drilled = (b.drilled || 0) + 1;
        // dust on both faces so the hole is legible
        puff(b.x, b.y, "#e8e2d4", 7);
        world.shake = Math.max(world.shake, 3);
        return true;
      }
    }
    return false;
  }

  // Boomerang: a shot that dies without touching anyone turns for home instead
  function tryBoomerang(b) {
    if (!b.boomerang || b.returning || b.isShard || b.meteor || b.hitIds.size > 0) return false;
    if (!b.owner || !b.owner.alive) return false;
    b.returning = true;
    b.life = 2.4;
    b.gravity = 0;
    b.hugging = false;
    sfx("bounce");
    return true;
  }

  function updateFields(dt) {
    for (const f of fields) {
      f.life -= dt;
      if (f.type === "lightning-warn") {
        if (f.life <= 0) resolveLightningStrike(f.x);
        continue;
      }
      if (f.type === "boom" || f.type === "guardian") continue;   // drawn only
      // Lemonade Stand: a stationary fizz that heals anyone inside, owner too
      if (f.type === "heal") {
        f.ticked = f.ticked || new Map();
        for (const p of players) {
          if (!p.alive) continue;
          if (Math.hypot(p.x - f.x, p.y - f.y) < f.r) {
            const before = p.hp;
            healPlayer(p, f.hps * dt);
            // bank the trickle and call it out in whole numbers, so the heal
            // reads as "+10" ticks rather than a health bar creeping upward
            const owed = (f.ticked.get(p) || 0) + (p.hp - before);
            if (owed >= 10) {
              floatText(p.x, p.y - p.stats.radius - 14, `+${Math.round(owed)}`, "#ffe45c");
              f.ticked.set(p, 0);
            } else {
              f.ticked.set(p, owed);
            }
            if (Math.random() < dt * 8) puffOne(p.x + rand(-12, 12), p.y - rand(0, 20), "#ffe45c");
          }
        }
        continue;
      }
      // Stink Bomb: a cloud that keeps poisoning and slowing whoever stands in it
      if (f.type === "stink") {
        for (const p of players) {
          if (!p.alive || p === f.owner || p.spawnGrace > 0) continue;
          if (Math.hypot(p.x - f.x, p.y - f.y) < f.r) {
            p.poisonTimer = Math.max(p.poisonTimer, 0.8);
            p.poisonDps = Math.max(p.poisonDps, 8 * f.stink);
            p.poisonAttacker = f.owner;
            p.chillTimer = Math.max(p.chillTimer, 0.5);
            // it visibly boils off anyone standing in it
            if (Math.random() < dt * 16) stinkBubble(p.x + rand(-14, 14), p.y + rand(-10, 14), 1.25);
          }
        }
        // and off the ground the cloud is sitting on
        if (Math.random() < dt * 34) {
          const off = rand(-f.r * 0.85, f.r * 0.85);
          stinkBubble(f.x + off, f.y + Math.sqrt(Math.max(0, f.r * f.r - off * off)) * 0.55, 1);
        }
        continue;
      }
      // Mosh Pit: the blade rides an orbit around its owner
      if (f.type === "saw") {
        // One huge blade centred on the fighter and spinning on its own axis,
        // not a small one riding an orbit — so the thing you can see IS the
        // area it hurts in.
        const o = f.owner;
        if (!o || !o.alive) { f.life = -1; continue; }
        f.angle += dt * 9;
        f.x = o.x;
        f.y = o.y;
        for (const p of players) {
          if (!p.alive || p === o || p.spawnGrace > 0 || p.sawGrace > 0) continue;
          if (Math.hypot(p.x - f.x, p.y - f.y) < p.stats.radius + f.r) {
            hurt(p, f.dmg, o, p.x - o.x, p.y - o.y - 60);
            p.sawGrace = 0.35;
          }
        }
        for (const dcy of decoys) {
          if (dcy.hp <= 0 || dcy.owner === o) continue;
          if (Math.hypot(dcy.x - f.x, dcy.y - f.y) < 26 + f.r) dcy.hp -= f.dmg * dt * 8;
        }
        continue;
      }
      // A planted singularity does not care who threw it: stand too close and
      // it takes you as well. It also hauls anything loose on the board.
      if (f.type === "blackhole" && f.singularity) {
        for (const c of props.crates) {
          if (c.dead) continue;
          const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
          const dx = f.x - cx, dy = f.y - cy, d = Math.hypot(dx, dy) || 1;
          if (d < f.r) {
            const t2 = 1 - d / f.r;
            c.vx += (dx / d) * 900 * t2 * dt;
            c.vy += (dy / d) * 700 * t2 * dt;
          }
        }
        for (const sl of props.slabs) {
          if (sl.dead) continue;
          const dx = f.x - sl.x, dy = f.y - sl.y, d = Math.hypot(dx, dy) || 1;
          if (d < f.r) {
            const t2 = 1 - d / f.r;
            sl.vx += (dx / d) * 620 * t2 * dt;
            sl.vy += (dy / d) * 480 * t2 * dt;
            sl.va += 0.6 * t2 * dt;
            wakeSlab(sl);
          }
        }
      }
      // Bodyguard's shockwave doesn't only shove people: anything still in
      // the air inside the knockaway zone is scattered off in a random
      // direction. Rounds the block itself parried are already gone by now,
      // so this only catches the ones that were going to sail past.
      if (f.type === "push" && f.scatter && !f.scattered) {
        f.scattered = true;
        for (const b of bullets) {
          if (b.owner === f.owner) continue;
          if (Math.hypot(b.x - f.x, b.y - f.y) > f.r) continue;
          const sp = Math.hypot(b.vx, b.vy) || 1;
          const a = Math.random() * Math.PI * 2;
          b.vx = Math.cos(a) * sp;
          b.vy = Math.sin(a) * sp;
          b.hitIds = new Set();          // it may now find anyone, its thrower included
          b.owner = f.owner;             // and it answers to whoever swatted it
          b.steer = 0; b.homing = 0;     // no more guidance after a knock like that
          burst(b.x, b.y, "#ffffff", 8, 220);
        }
      }
      for (const p of players) {
        if (!p.alive || (p === f.owner && !f.singularity)) continue;
        const dx = p.x - f.x, dy = p.y - f.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < f.r) {
          const t = 1 - d / f.r;
          if (f.type === "blackhole") {
            p.vx += (dx / d) * f.force * t * dt;
            p.vy += (dy / d) * f.force * t * dt;
            // Reaching the middle is like touching a hazard: a solid bite and
            // a launch clear of it. The vortex then hauls them back in, so a
            // careless player is chewed several times over.
            if (d < f.r * 0.3 && p.hazardGrace <= 0) {
              p.hazardGrace = HAZARD_GRACE * 0.55;
              hurtRaw(p, HAZARD_DAMAGE, f.owner);
              if (p.alive) {
                const away = Math.hypot(dx, dy) || 1;
                p.vx = -(dx / away) * 520;
                p.vy = -(dy / away) * 380 - 260;
                pulse(p, 0.4, 150);
                world.shake = Math.max(world.shake, 8);
                burst(p.x, p.y, "#c88fff", 24, 420);
                sfx("hit");
              }
            } else {
              hurtRaw(p, f.dps * t * dt, f.owner);
            }
            if (Math.random() < dt * 20) puffOne(p.x + rand(-10, 10), p.y + rand(-10, 10), "#b45cff");
          } else {
            p.vx += (dx / d) * f.force * t * dt;
            p.vy += (dy / d) * f.force * t * dt;
            hurtRaw(p, 12 * t * dt, f.owner);
          }
        }
      }
    }
    fields = fields.filter(f => f.life > 0);
  }

  // -------------------------------------------------------------- water
  // Is this point under water — the level's tide, or inside a water hazard?
  // Body Doubles: they just stand there, convincingly, until they pop
  function updateDecoys(dt) {
    for (const dcy of decoys) {
      dcy.life -= dt;
      dcy.wobble += dt;
      if ((dcy.hp <= 0 || dcy.life <= 0) && !dcy.popped) {
        dcy.popped = true;
        burst(dcy.x, dcy.y, dcy.color, 26, 380);
        puff(dcy.x, dcy.y, "#ffffff", 10);
        sfx("hit");
      }
    }
    decoys = decoys.filter(dcy => !dcy.popped);
  }

  function inWater(x, y, level = currentLevel()) {
    if (level.tide && y > world.tideLevel + 10) return true;
    if (!settings.hazards) return false;
    for (const h of level.hazards) {
      if (h.kind !== "water") continue;
      if (x > h.x && x < h.x + h.w && y > h.y && y < h.y + h.h + 200) return true;
    }
    return false;
  }

  const SOAK_RATE = GP.hazards.soakRate;
  const SOAK_BITE = 3.5;  // ...delivered in bites this size

  // Drowning is damage over time, but a health bar sliding down reads as a bug.
  // Bank the damage and spend it in small bites, each with its own splash and
  // flash, so it looks like the water is landing a series of little hits.
  function soakDamage(p, dt) {
    if (!p.alive || p.spawnGrace > 0) return;
    p.soak = (p.soak || 0) + SOAK_RATE * dt;
    while (p.soak >= SOAK_BITE) {
      p.soak -= SOAK_BITE;
      hurtRaw(p, SOAK_BITE, null);
      if (!p.alive) return;
      p.hitFlash = Math.max(p.hitFlash || 0, 0.16);
      burst(p.x + rand(-10, 10), p.y + rand(-8, 8), "#bff4ff", 7, 190);
      sfx("hit");
      pulse(p, 0.18, 70);
    }
  }

  // hurt with knockback, blockable
  // Touching a hazard hurts and launches the player clear rather than killing:
  // damage first (so guardian/revive rules still apply at low HP), then a hard
  // upward bounce away from the hazard, with a grace window so one dip into
  // lava reads as one hit.
  const HAZARD_DAMAGE = GP.hazards.touchDamage;
  const HAZARD_GRACE = GP.hazards.touchGrace;
  const PIT_BOUNCES = GP.hazards.pitBounces;
  function hazardHit(p, h) {
    if (!p.alive || p.hazardGrace > 0 || p.spawnGrace > 0) return;
    p.hazardGrace = HAZARD_GRACE;
    hurtRaw(p, HAZARD_DAMAGE, null);
    if (!p.alive) return;
    const cx = h.x + h.w / 2;
    p.vy = -Math.max(980, Math.abs(p.vy) * 0.6 + 760);
    p.vx += (p.x < cx ? -1 : 1) * 180;
    p.y = Math.min(p.y, h.y - p.stats.radius * 0.35);
    sfx("hit");
    pulse(p, 0.4, 150);
    world.shake = Math.max(world.shake, 7);
    const hazCol = currentLevel().palette.hazard || "#ff6a3d";
    burst(p.x, p.y + p.stats.radius, hazCol, 18, 420);
    // Lava spits fire and smoke; ice spikes and blades must not, so this keys
    // off the arena's own hazard colour being a hot one.
    if (isHot(hazCol)) {
      flames(p.x, p.y + p.stats.radius * 0.6, 8, 12, 1);
      smoke(p.x, p.y + p.stats.radius * 0.4, 3, 10, 1);
    }
  }

  // "hot" = fire colours only: bright red through orange to yellow. Requiring
  // green to beat blue keeps the neon magenta hazards (Neon Skyline, Voidfall)
  // out of it — those glow, they don't burn.
  function isHot(hex) {
    const h = String(hex).replace("#", "");
    if (h.length < 6) return false;
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return r > 150 && r > b + 60 && g < r && g >= b;
  }

  // The bottom of the world is a trampoline with a temper: it hurts, flings you
  // high enough to land somewhere, and only swallows you on the third fall.
  function pitBounce(p) {
    // No grace check: being under the world must always throw you back, or a
    // player who fell during hazard grace would keep dropping into nothing.
    // Re-entry can't double-fire because the bounce lifts them above the line.
    if (!p.alive) return;
    p.pitBounces += 1;
    if (p.pitBounces > PIT_BOUNCES) {
      hurtRaw(p, 999, null);
      return;
    }
    p.hazardGrace = HAZARD_GRACE;
    hurtRaw(p, HAZARD_DAMAGE, null);
    if (!p.alive) return;
    p.y = world.height + 24;
    // clear the floor line with room to steer onto a ledge
    p.vy = -Math.sqrt(2 * levelGravity() * 430);
    p.vx *= 0.55;
    p.jumpsLeft = Math.max(p.jumpsLeft, 1);
    sfx("bounce");
    pulse(p, 0.45, 170);
    world.shake = Math.max(world.shake, 9);
    burst(p.x, world.height + 10, currentLevel().palette.accent || "#ffffff", 22, 460);
  }

  // Healing funnels through here so Overflow can bank the excess as shield
  function healPlayer(p, amount) {
    if (!p.alive || amount <= 0) return;
    const toHp = Math.min(p.stats.maxHp - p.hp, amount);
    p.hp += toHp;
    const extra = amount - toHp;
    if (extra > 0 && p.stats.overflow) {
      const was = p.overShield;
      p.overShield = Math.min(p.stats.overflow, p.overShield + extra);
      if (p.overShield > was && Math.random() < 0.3) puffOne(p.x, p.y - p.stats.radius, "#7fd8ff");
    }
  }

  function hurt(p, amount, attacker, kx, ky) {
    if (!p.alive || p.blockTimer > 0 || p.spawnGrace > 0) return;
    // Aegis Bubble eats the hit ENTIRELY — the damage and the shove with it —
    // so it has to be checked before any knockback is applied. A DoT tick is
    // not a "hit" and must not waste the charge, hence the floor.
    if (popAegis(p, amount)) return;
    const mag = Math.hypot(kx, ky) || 1;
    const kb = (1 - clamp(p.stats.kbResist, 0, 0.9))
      // Boxing Glove: the attacker's gloves add shove on top of the damage
      * (attacker && attacker.stats ? 1 + attacker.stats.kbDeal : 1);
    p.vx += (kx / mag) * Math.min(620, amount * 16) * kb;
    p.vy += ((ky / mag) * Math.min(320, amount * 8) - Math.min(220, amount * 2)) * kb;
    if (amount > 4) {
      sfx("hit");
      pulse(p, Math.min(0.55, amount / 90), Math.min(190, 50 + amount));
      world.shake = Math.max(world.shake, Math.min(18, amount / 7));
      burst(p.x, p.y, p.color, Math.min(34, 6 + amount / 3), 340);
    }
    if (attacker && p.stats.thorns > 0 && attacker.alive && amount < 500) {
      hurtRaw(attacker, amount * p.stats.thorns, null);
      boltVisual(p.x, p.y, attacker.x, attacker.y, "#ff5f8f", 0.15);
      // the briar blooms on the bite
      p.thornPulse = 0.35;
    }
    applyDamage(p, amount, attacker);
  }

  // direct damage: no knockback, no thorns (used by DoTs, fields, thorns itself)
  function hurtRaw(p, amount, attacker) {
    if (!p.alive || p.spawnGrace > 0) return;
    applyDamage(p, amount, attacker);
  }

  // Aegis Bubble: one charge swallows one whole hit. Returns true when the hit
  // was eaten, so the caller stops — no damage, and in hurt() no knockback.
  const AEGIS_MIN = 5;        // below this it is a tick, not a hit
  function popAegis(p, amount) {
    if (!(p.stats.shield > 0) || p.shield <= 0) return false;
    if (amount >= 500 || amount < AEGIS_MIN) return false;   // world-kill / DoT
    p.shield -= 1;
    p.shieldDelay = 3.5;
    p.shieldFlash = 0.3;
    p.hitFlash = Math.max(p.hitFlash || 0, 0.14);
    // the bubble coming apart into glassy shards, thrown wider than it was
    fxShot("shield-break", p.x, p.y, (p.stats.radius + 19) * 2.7, 0.32);
    burst(p.x, p.y, "#7fd8ff", 22, 360);
    floatText(p.x, p.y - p.stats.radius - 14, "ABSORBED", "#7fd8ff");
    sfx("block");
    return true;
  }

  function applyDamage(p, amount, attacker, fromDecay = false) {
    p.hitFlash = Math.max(p.hitFlash || 0, amount >= 8 ? 0.2 : 0.16);
    if (popAegis(p, amount)) return;
    if (p.stats.shield > 0 && amount < 500) p.shieldDelay = 3.5;
    // Hot Streak / Overflow temp shields soak next (world-kill bypasses)
    if (amount < 500 && p.hotShield > 0) {
      const soaked = Math.min(p.hotShield, amount);
      p.hotShield -= soaked;
      amount -= soaked;
      p.shieldFlash = 0.25;
      if (amount <= 0) return;
    }
    if (amount < 500 && p.overShield > 0) {
      const soaked = Math.min(p.overShield, amount);
      p.overShield -= soaked;
      amount -= soaked;
      p.shieldFlash = 0.25;
      if (amount <= 0) return;
    }
    // Fresh Coat: the overcoat eats the first hit, then the rest shatters
    if (amount < 500 && p.freshPool > 0) {
      const soaked = Math.min(p.freshPool, amount);
      amount -= soaked;
      p.freshPool = 0;
      burst(p.x, p.y, "#ffffff", 22, 320);
      sfx("block");
      if (amount <= 0) return;
    }
    // Payment Plan: real damage is banked and paid off over the next seconds
    if (!fromDecay && p.stats.decay && amount < 500 && amount > 0) {
      p.decayPool += amount;
      p.decayAttacker = attacker || p.decayAttacker;
      return;
    }
    const lethal = p.hp - amount <= 0;
    if (lethal && p.guardianCharges > 0 && amount < 500) {
      p.guardianCharges -= 1;
      p.hp = p.stats.maxHp * 0.25;
      p.spawnGrace = Math.max(p.spawnGrace, 0.5);
      burst(p.x, p.y, "#ffd700", 36, 480);
      // someone up there really did owe you one
      fields.push({ type: "guardian", owner: p, x: p.x, y: p.y, r: p.stats.radius, life: 1.6 });
      for (let i = 0; i < 14; i += 1) {
        particles.push({
          x: p.x + rand(-20, 20), y: p.y + rand(-16, 16),
          vx: rand(-30, 30), vy: rand(-90, -30),
          life: rand(0.6, 1.1), maxLife: 1.1, r: rand(1.5, 3.2),
          color: Math.random() < 0.5 ? "#fff3b0" : "#ffd700", spark: true
        });
      }
      showToast(str("toast.guardianSave", { name: p.name }));
      sfx("mythic");
      return;
    }
    p.hp -= amount;
    if (p.hp <= 0) {
      if (p.roundRevives > 0) {
        // Phoenix Feather: you genuinely die — a fire blast, then a second of
        // burning wreckage — and only then rise back out of the same spot.
        p.roundRevives -= 1;
        p.alive = false;
        p.hp = 0;
        // the pyre sits on the ground they fell on, not at chest height
        p.rebirth = { t: 1, x: p.x, y: p.y + p.stats.radius * 0.85 };
        burst(p.x, p.y, "#ff9e3d", 54, 660);
        flames(p.x, p.y, 26, 24, 1.5);
        smoke(p.x, p.y, 12, 20, 1.3);
        world.shake = Math.max(world.shake, 11);
        showToast(str("toast.revive", { name: p.name }));
        sfx("boom");
      } else {
        p.alive = false;
        p.hp = 0;
        burst(p.x, p.y, p.color, 70, 760);
        world.shake = Math.max(world.shake, 12);
        if (attacker) {
          pulse(attacker, 0.35, 130);
          if (attacker.stats.killHeal && attacker.alive) {
            // a kill gives everything back, and you watch it come: the whole
            // pool leaves the body as a spray of motes
            siphonHealth(p, attacker, attacker.stats.maxHp - attacker.hp, 7);
            burst(p.x, p.y, "#74f08b", 26, 420);
          }
        }
      }
    }
  }

  // Phoenix Feather's second beat: the pyre keeps burning for a second where
  // they fell, then they climb back out of the ground on the same spot.
  function tickRebirth(p, dt) {
    const rb = p.rebirth;
    rb.t -= dt;
    // the wreckage smoulders the whole time
    if (Math.random() < dt * 34) flames(rb.x + rand(-20, 20), rb.y + rand(-6, 14), 1, 6, 0.9);
    if (Math.random() < dt * 16) smoke(rb.x + rand(-16, 16), rb.y, 1, 10, 1.1);
    if (rb.t > 0) return;
    // up they come, out of the fire, at half health and briefly untouchable
    p.rebirth = null;
    p.alive = true;
    p.hp = p.stats.maxHp * 0.5;
    p.x = rb.x;
    p.y = rb.y;
    p.vx = 0;
    p.vy = -760;
    p.spawnGrace = 0.9;
    p.grounded = false;
    p.groundPlatform = null;
    p.jumpsLeft = 1 + p.stats.extraJumps;
    burst(rb.x, rb.y, "#ffcf4d", 44, 560);
    flames(rb.x, rb.y, 20, 18, 1.4);
    smoke(rb.x, rb.y, 8, 16, 1.2);
    p.burnTimer = Math.max(p.burnTimer || 0, 1.2);   // they come back still alight
    world.shake = Math.max(world.shake, 8);
    sfx("mythic");
  }

  function checkRoundEnd() {
    if (world.state !== "playing") return;
    // someone rising out of a Phoenix Feather is down, not out — the round
    // must not be called over their smoking crater
    const alive = players.filter(p => p.alive || p.rebirth);
    if (alive.length === 1 && alive[0].alive) endRound(alive[0]);
    else if (alive.length === 0) {
      showToast(str("round.nobodySurvived"));
      resetRound();
    }
  }

  function nearestEnemy(b) {
    let best = null, bestD = Infinity;
    for (const p of players) {
      if (!p.alive || p === b.owner || b.hitIds.has(p.id)) continue;
      const d = Math.hypot(p.x - b.x, p.y - b.y);
      if (d < bestD && d < 900) { bestD = d; best = p; }
    }
    // Body Doubles read as bodies to anything that seeks — that's their job
    for (const dcy of decoys) {
      if (dcy.hp <= 0 || dcy.owner === b.owner) continue;
      const d = Math.hypot(dcy.x - b.x, dcy.y - b.y);
      if (d < bestD && d < 900) { bestD = d; best = dcy; }
    }
    return best;
  }

  function circleRect(c, r) {
    const cx = clamp(c.x, r.x, r.x + r.w);
    const cy = clamp(c.y, r.y, r.y + r.h);
    return Math.hypot(c.x - cx, c.y - cy) <= (c.r || (c.stats && c.stats.radius) || 0);
  }

  // ------------------------------------------------------------ choose cards
  // The card grid is its own focus region inside Settings. Eighty-odd cells is
  // far too many for the panel's generic cursor — that is one button press per
  // card and a rect measured per candidate — so the grid keeps its own cursor,
  // its own row map built from live geometry, and its own held-direction
  // repeat, and hands focus back to the panel at its top and bottom edges.
  const cardUi = {
    picker: null,
    grid: null,
    detail: null,   // the line under the grid describing the card at the cursor
    cells: [],      // every focusable thing in the grid, in DOM order
    heads: [],      // indices of the rarity headings, for LB/RB section jumps
    byRarity: new Map(),
    rows: [],       // [[cellIndex, …], …], rebuilt whenever the grid reflows
    rowOf: [],      // cell index → row index
    cursor: 0,
    active: false,  // true while the grid, not the panel, is driving the cursor
    layoutW: -1,    // grid width the row map was measured at
    nav: { axis: null, value: 0, timer: 0 }
  };

  const GRID_REPEAT_DELAY = 0.3;   // hold this long before it starts repeating
  const GRID_REPEAT_RATE = 0.055;  // ≈18 cells a second once it does

  function buildCardPicker() {
    cardUi.picker = document.getElementById("cardPicker");
    cardUi.grid = document.getElementById("cardGrid");
    if (!cardUi.grid) return;
    for (const rarity of window.ROUNDERS.RARITY_ORDER) {
      cardUi.byRarity.set(rarity, CARDS.filter(c => c.rarity === rarity));
    }
    let html = "";
    for (const [rarity, list] of cardUi.byRarity) {
      if (!list.length) continue;
      const rar = RARITIES[rarity];
      const style = `--rcol:${rar.color};--rglow:${rar.glow}`;
      html += `<button type="button" class="rarity-head" style="${style}" data-cell data-kind="rarity" data-rarity="${rarity}"></button>`;
      for (const c of list) {
        html += `<button type="button" class="card-cell" style="${style};--emblem:url('${cardArtUrl(c.id)}')" ` +
          `data-cell data-kind="card" data-id="${c.id}" title="${escapeHtml(`${c.name} — ${c.description}`)}">` +
          `<span class="cc-art"></span><span class="cc-name">${escapeHtml(c.name)}</span></button>`;
      }
    }
    cardUi.grid.innerHTML = html;
    cardUi.cells = [...cardUi.grid.querySelectorAll("[data-cell]")];
    cardUi.heads = cardUi.cells.map((el, i) => (el.dataset.kind === "rarity" ? i : -1)).filter(i => i >= 0);
    cardUi.detail = document.getElementById("cardDetail");
    cardUi.grid.addEventListener("click", e => {
      const cell = e.target.closest("[data-cell]");
      if (!cell) return;
      const i = cardUi.cells.indexOf(cell);
      if (i >= 0) cardUi.cursor = i;
      toggleCell(cell);
    });
    cardUi.grid.addEventListener("pointerover", e => {
      const cell = e.target.closest("[data-cell]");
      if (cell) showCardDetail(cell);
    });
  }

  // Nobody remembers what all eighty-odd cards do, and the cell only has room
  // for a name — so the card under the cursor spells itself out underneath the
  // grid. Mouse hover feeds it too.
  function showCardDetail(cell) {
    if (!cardUi.detail || !cell) return;
    if (cell.dataset.kind === "rarity") {
      const rar = RARITIES[cell.dataset.rarity];
      cardUi.detail.style.setProperty("--rcol", rar.color);
      cardUi.detail.innerHTML = `<b>${escapeHtml(rar.name)}</b> — <i>${escapeHtml(str("settings.rarityHint"))}</i>`;
      return;
    }
    const c = CARDS.find(x => x.id === cell.dataset.id);
    if (!c) return;
    cardUi.detail.style.setProperty("--rcol", RARITIES[c.rarity].color);
    cardUi.detail.innerHTML = `<b>${escapeHtml(c.name)}</b> — ${escapeHtml(c.description)} <i>${escapeHtml(c.effects.join(" · "))}</i>`;
  }

  function enabledCardCount() {
    return CARDS.reduce((n, c) => n + (settings.disabledCards.has(c.id) ? 0 : 1), 0);
  }

  function setCardMode(mode) {
    if (!CARD_MODES.includes(mode) || mode === settings.cardMode) return;
    settings.cardMode = mode;
    sfx("card");
    saveCardPrefs();
    refreshCardPicker();
  }

  function toggleCell(cell) {
    if (!cell) return;
    if (cell.dataset.kind === "rarity") toggleRarity(cell.dataset.rarity);
    else toggleCard(cell.dataset.id);
    saveCardPrefs();
    refreshCardPicker();
  }

  function toggleCard(id) {
    const turningOn = settings.disabledCards.has(id);
    if (turningOn) settings.disabledCards.delete(id);
    else settings.disabledCards.add(id);
    sfx(turningOn ? "parry" : "thud");
  }

  // A rarity heading switches its whole block: all on → all off, anything else
  // → all on, so half a block of greyed-out cards is one press from whole.
  function toggleRarity(rarity) {
    const list = cardUi.byRarity.get(rarity) || [];
    const allOn = list.every(c => !settings.disabledCards.has(c.id));
    for (const c of list) {
      if (allOn) settings.disabledCards.add(c.id);
      else settings.disabledCards.delete(c.id);
    }
    sfx(allOn ? "thud" : "parry");
  }

  function toggleCursorRarity() {
    const cell = cardUi.cells[cardUi.cursor];
    if (!cell) return;
    const rarity = cell.dataset.rarity || (CARDS.find(c => c.id === cell.dataset.id) || {}).rarity;
    if (!rarity) return;
    toggleRarity(rarity);
    saveCardPrefs();
    refreshCardPicker();
  }

  function setAllCards(on) {
    if (on) settings.disabledCards.clear();
    else for (const c of CARDS) settings.disabledCards.add(c.id);
    sfx(on ? "parry" : "thud");
    saveCardPrefs();
    refreshCardPicker();
  }

  function invertCards() {
    const next = new Set();
    for (const c of CARDS) if (!settings.disabledCards.has(c.id)) next.add(c.id);
    settings.disabledCards = next;
    sfx("card");
    saveCardPrefs();
    refreshCardPicker();
  }

  function refreshCardPicker() {
    const modeBar = document.getElementById("cardMode");
    if (!modeBar || !cardUi.picker) return;
    for (const b of modeBar.querySelectorAll("button[data-mode]")) {
      const on = b.dataset.mode === settings.cardMode;
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", String(on));
    }
    const mode = settings.cardMode;
    const note = document.getElementById("cardModeNote");
    if (note) note.textContent = str(`settings.cardNote${mode[0].toUpperCase()}${mode.slice(1)}`);
    const rarityGroup = document.getElementById("rarityGroup");
    // Equalize ignores the rarity ladder, so its sliders read as switched off
    if (rarityGroup) rarityGroup.classList.toggle("muted", mode === "equalize");

    const choosing = mode === "choose";
    const wasHidden = cardUi.picker.classList.contains("hidden");
    cardUi.picker.classList.toggle("hidden", !choosing);
    // Switching modes adds or removes controls, so the cursor's index into the
    // panel means something different afterwards. Re-anchor it on the element
    // it was actually sitting on, or the picker's own buttons are unreachable
    // until the panel is closed and opened again.
    if (wasHidden !== !choosing && world.state === "settings") {
      const held = document.querySelector(".controller-focus");
      if (held) {
        const list = visibleControls();
        const at = list.indexOf(held);
        if (at >= 0) world.menuIndex = at;
      }
    }
    if (!choosing) return;
    if (wasHidden) cardUi.rows = [];   // measured at zero width while hidden

    const on = enabledCardCount();
    const count = document.getElementById("cardCount");
    if (count) {
      count.textContent = on ? str("settings.cardCount", { on, total: CARDS.length }) : str("settings.cardNoneWarning");
      count.classList.toggle("warn", on === 0);
    }
    for (const cell of cardUi.cells) {
      if (cell.dataset.kind === "card") {
        const off = settings.disabledCards.has(cell.dataset.id);
        cell.classList.toggle("off", off);
        cell.setAttribute("aria-pressed", String(!off));
      } else {
        const list = cardUi.byRarity.get(cell.dataset.rarity) || [];
        cell.textContent = str("settings.rarityToggle", {
          rarity: RARITIES[cell.dataset.rarity].name,
          on: list.filter(c => !settings.disabledCards.has(c.id)).length,
          total: list.length
        });
      }
    }
    showCardDetail(cardUi.cells[cardUi.cursor]);
  }

  // Rows come from where the cells actually landed, so ragged last rows and the
  // full-width rarity headings need no special case. Re-measured only when the
  // grid's width changes.
  function measureCardRows() {
    const grid = cardUi.grid;
    if (!grid || !cardUi.cells.length) return;
    if (cardUi.rows.length && cardUi.layoutW === grid.clientWidth) return;
    cardUi.layoutW = grid.clientWidth;
    const rows = [];
    const rowOf = [];
    let top = null;
    cardUi.cells.forEach((el, i) => {
      if (top === null || Math.abs(el.offsetTop - top) > 4) { rows.push([]); top = el.offsetTop; }
      rows[rows.length - 1].push(i);
      rowOf[i] = rows.length - 1;
    });
    cardUi.rows = rows;
    cardUi.rowOf = rowOf;
  }

  function setCardCursor(i) {
    cardUi.cursor = clamp(i, 0, cardUi.cells.length - 1);
    for (const el of document.querySelectorAll(".controller-focus")) el.classList.remove("controller-focus");
    const el = cardUi.cells[cardUi.cursor];
    if (!el) return;
    el.classList.add("controller-focus");
    el.focus({ preventScroll: true });
    // instant, not smooth: at eighteen moves a second a smooth scroll never
    // catches the cursor up
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
    showCardDetail(el);
  }

  // Returns false when the move runs off the grid, so the caller can hand focus
  // back to the rest of the panel.
  function moveCardCursor(axis, dir) {
    measureCardRows();
    const rows = cardUi.rows;
    if (!rows.length) return true;
    const r = cardUi.rowOf[cardUi.cursor] || 0;
    const row = rows[r];
    if (axis === "x") {
      const at = row.indexOf(cardUi.cursor) + dir;
      if (at >= 0 && at < row.length) { setCardCursor(row[at]); return true; }
      // stepping off the end of a row wraps onto the next one, the way reading
      // down a list does
      const wrap = rows[r + dir];
      if (!wrap) return false;
      setCardCursor(dir > 0 ? wrap[0] : wrap[wrap.length - 1]);
      return true;
    }
    const next = rows[r + dir];
    if (!next) return false;
    setCardCursor(nearestInRow(next, cardUi.cursor));
    return true;
  }

  // Keeps the column when moving between rows: land on whichever cell in the
  // next row sits nearest across.
  function nearestInRow(row, fromIndex) {
    const from = cardUi.cells[fromIndex];
    const x = from.offsetLeft + from.offsetWidth / 2;
    let best = row[0], bestD = Infinity;
    for (const i of row) {
      const el = cardUi.cells[i];
      const d = Math.abs(el.offsetLeft + el.offsetWidth / 2 - x);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  // LB / RB skip a whole rarity: forward to the next heading, back to the top of
  // this block and then to the one before it.
  function jumpRarity(dir) {
    const heads = cardUi.heads;
    if (!heads.length) return;
    if (dir > 0) {
      const next = heads.find(i => i > cardUi.cursor);
      setCardCursor(next === undefined ? heads[0] : next);
      return;
    }
    const here = [...heads].reverse().find(i => i <= cardUi.cursor);
    if (here === undefined) { setCardCursor(heads[heads.length - 1]); return; }
    if (here < cardUi.cursor) { setCardCursor(here); return; }
    const prev = [...heads].reverse().find(i => i < cardUi.cursor);
    setCardCursor(prev === undefined ? heads[heads.length - 1] : prev);
  }

  function cardGridFocused(controls) {
    if (!cardUi.grid || !cardUi.picker || cardUi.picker.classList.contains("hidden")) return false;
    const el = controls[world.menuIndex];
    return Boolean(el && cardUi.grid.contains(el));
  }

  // Runs instead of the panel's generic cursor while the grid holds focus.
  function updateCardGrid(pads, dt) {
    if (menuBack(pads)) { closePanel(settingsPanel); return; }
    let jumped = 0;
    for (const pad of pads) {
      if (buttonEdge(pad, 5)) jumped = 1;
      if (buttonEdge(pad, 4)) jumped = -1;
      if (buttonEdge(pad, 2)) { toggleCursorRarity(); return; }
    }
    if (pressed.has("BracketRight")) jumped = 1;
    if (pressed.has("BracketLeft")) jumped = -1;
    if (jumped) { jumpRarity(jumped); return; }
    if (menuConfirm(pads)) { toggleCell(cardUi.cells[cardUi.cursor]); return; }
    const step = gridRepeat(pads, dt);
    if (!step) return;
    if (!moveCardCursor(step.axis, step.value) && step.axis === "y") leaveCardGrid(step.value);
  }

  // The grid stands in the panel's cursor list as a single cell, so the control
  // either side of it in that list is the one just outside the grid. The cursor
  // is parked on the edge it left by, which both keeps the stand-in cell on
  // screen — the panel's spatial search has to be able to see it — and puts you
  // back where you were when you walk into the grid again.
  function leaveCardGrid(dir) {
    const controls = visibleControls();
    const at = controls.indexOf(cardUi.cells[cardUi.cursor]);
    if (at < 0 || !controls[at + dir]) return;
    setCardCursor(dir > 0 ? cardUi.cells.length - 1 : 0);
    setMenuIndex(at + dir, controls);
  }

  // A direction still held from the panel brought the cursor in here; it must
  // not also count as a press inside the grid. Adopt the hold as it stands, so
  // keeping it down carries on scrolling after the usual repeat delay.
  function seedGridNav(pads) {
    const d = heldMenuDirection(pads);
    const nav = cardUi.nav;
    nav.axis = d.x ? "x" : d.y ? "y" : null;
    nav.value = nav.axis === "x" ? d.x : nav.axis === "y" ? d.y : 0;
    nav.timer = GRID_REPEAT_DELAY;
  }

  // Held-direction auto-repeat: first press moves at once, then a pause, then a
  // fast steady walk. The axis that started the hold keeps it until released,
  // so a sloppy diagonal on the stick doesn't wander off the row.
  function gridRepeat(pads, dt) {
    const d = heldMenuDirection(pads);
    const nav = cardUi.nav;
    let ax = nav.axis;
    if ((ax === "x" && !d.x) || (ax === "y" && !d.y)) ax = null;
    if (!ax) ax = d.x ? "x" : d.y ? "y" : null;
    const value = ax === "x" ? d.x : ax === "y" ? d.y : 0;
    if (!value) { nav.axis = null; nav.value = 0; nav.timer = 0; return null; }
    if (nav.axis !== ax || nav.value !== value) {
      nav.axis = ax;
      nav.value = value;
      nav.timer = GRID_REPEAT_DELAY;
      return { axis: ax, value };
    }
    nav.timer -= dt;
    if (nav.timer > 0) return null;
    nav.timer = GRID_REPEAT_RATE;
    return { axis: ax, value };
  }

  // menuNav() is edge-triggered — one move per press. This is the held state,
  // which is what an auto-repeating cursor needs.
  //
  // `pressed` is folded in alongside `keys` so a quick tap still counts: a key
  // pressed and released between two frames never shows up as held, and would
  // otherwise be swallowed. `pressed` only survives one frame, so a tap moves
  // the cursor exactly once and never starts a repeat.
  function heldMenuDirection(pads) {
    let x = 0, y = 0;
    const down = code => keys.has(code) || pressed.has(code);
    for (const sc of keyboardSchemes) {
      if (down(sc.right)) x = 1;
      if (down(sc.left)) x = -1;
      if (down(sc.down)) y = 1;
      if (down(sc.up)) y = -1;
    }
    for (const pad of pads) {
      const ax = axis(pad.axes[0]), ay = axis(pad.axes[1]);
      if (button(pad, 15) || ax > 0.55) x = 1;
      if (button(pad, 14) || ax < -0.55) x = -1;
      if (button(pad, 13) || ay > 0.55) y = 1;
      if (button(pad, 12) || ay < -0.55) y = -1;
    }
    return { x, y };
  }

  // ------------------------------------------------------------------- menus
  function updateMenuControls(pads) {
    const controls = visibleControls();
    if (!controls.length) return;
    world.menuIndex = clamp(world.menuIndex, 0, controls.length - 1);

    // The card grid drives itself while the cursor is inside it.
    const inGrid = cardGridFocused(controls);
    if (inGrid !== cardUi.active) {
      cardUi.active = inGrid;
      if (inGrid) seedGridNav(pads);
    }
    if (inGrid) { updateCardGrid(pads, world.dt); return; }

    // The bumpers walk the icon row (how to play, sound, settings, fullscreen)
    // from anywhere, so those are reachable without first locking in or
    // hunting for them with the stick. Stepping off either end lets go again.
    const quickMoved = updateQuickBar(pads);
    // Any direction hands control back to whatever the screen normally does
    // with the stick — picking a fighter in the lobby, the cursor elsewhere.
    if (!quickMoved && world.quickIndex >= 0 && anyDirectionPressed(pads)) {
      setQuickIndex(-1);
      return;
    }

    const nav = quickMoved ? null : menuNav(pads);
    if (nav) {
      if (world.quickIndex >= 0) setQuickIndex(-1);   // the stick takes over
      const focused = controls[world.menuIndex];
      const onValue = focused && (focused.matches("input[type='range']") || focused.matches("select"));
      // left/right tunes a slider or dropdown; anything else moves the cursor
      if (onValue && nav.x) adjustMenuControl(focused, nav.x);
      else if (!moveFocusSpatial({ x: nav.x, y: nav.y }, controls) && nav.y) scrollPanel(nav.y);
    }
    if (menuConfirm(pads)) {
      const target = quickTarget() || controls[world.menuIndex];
      if (target) {
        if (target.matches("input[type='checkbox']")) {
          target.checked = !target.checked;
          target.dispatchEvent(new Event("change"));
        } else if (target.matches("select")) {
          // A steps a dropdown along, which is what pressing it looks like it
          // should do; the arrows are still there for going back.
          adjustMenuControl(target, 1);
        } else {
          target.click();
        }
      }
    }
    if (menuBack(pads)) {
      if (world.quickIndex >= 0) setQuickIndex(-1);
      else if (world.state === "settings") closePanel(settingsPanel);
      else if (world.state === "how") closePanel(howPanel);
      else if (world.state === "paused") togglePause(false);
    }
  }

  // The icon row, when it is on screen. Its own cursor is separate from the
  // panel's so the two never fight over what is highlighted.
  function quickControls() {
    if (iconBar.classList.contains("hidden")) return [];
    return [...iconBar.querySelectorAll("button")].filter((el) => !el.disabled && el.offsetParent !== null);
  }

  // Any stick or d-pad direction, whoever pressed it — used only to decide
  // that the icon row should let go.
  function anyDirectionPressed(pads) {
    for (const sc of keyboardSchemes) {
      if (pressed.has(sc.left) || pressed.has(sc.right) || pressed.has(sc.up) || pressed.has(sc.down)) return true;
    }
    for (const pad of pads) {
      for (const b of [12, 13, 14, 15]) if (buttonEdge(pad, b)) return true;
      if (axisEdge(pad, 0, 1) || axisEdge(pad, 0, -1) || axisEdge(pad, 1, 1) || axisEdge(pad, 1, -1)) return true;
    }
    return false;
  }

  function quickTarget() {
    const quick = quickControls();
    return world.quickIndex >= 0 ? quick[world.quickIndex] || null : null;
  }

  function updateQuickBar(pads) {
    const quick = quickControls();
    if (!quick.length) {
      if (world.quickIndex >= 0) world.quickIndex = -1;
      return false;
    }
    let dir = 0;
    for (const pad of pads) {
      if (buttonEdge(pad, 5)) dir = 1;
      if (buttonEdge(pad, 4)) dir = -1;
    }
    if (pressed.has("BracketRight")) dir = 1;
    if (pressed.has("BracketLeft")) dir = -1;
    if (!dir) return false;
    // -1 is "nothing selected", and it sits at both ends of the row: step off
    // the last icon and the row lets go rather than wrapping straight round.
    let i = world.quickIndex + dir;
    if (i < -1) i = quick.length - 1;
    if (i > quick.length - 1) i = -1;
    setQuickIndex(i, quick);
    return true;
  }

  function setQuickIndex(i, quick = quickControls()) {
    world.quickIndex = i;
    for (const el of document.querySelectorAll(".controller-focus")) el.classList.remove("controller-focus");
    const target = i >= 0 ? quick[i] : null;
    if (!target) {
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      return;
    }
    target.classList.add("controller-focus");
    target.focus({ preventScroll: true });
  }

  // Long panels (Settings, How to Play) scroll when the cursor has run out of
  // controls to move to, so the bottom of the page is reachable on a pad.
  function scrollPanel(dy) {
    const panel = world.state === "settings" ? settingsPanel
      : world.state === "how" ? howPanel
        : world.state === "paused" ? pausePanel : menu;
    if (panel) panel.scrollBy({ top: dy * 90, behavior: "smooth" });
  }

  function visibleControls() {
    const panel = world.state === "settings" ? settingsPanel : world.state === "how" ? howPanel : world.state === "paused" ? pausePanel : menu;
    const roots = [panel];
    // the icon row is part of the menu and pause screens
    if (!iconBar.classList.contains("hidden")) roots.push(iconBar);
    const out = [];
    for (const root of roots) {
      for (const el of root.querySelectorAll("button, input, select")) {
        if (el.disabled || el.offsetParent === null) continue;
        // The card grid appears here as its own cursor cell and nothing else:
        // eighty-odd buttons would otherwise flood the spatial search, and
        // crossing them one press at a time is nobody's idea of comfortable.
        if (el.dataset.cell !== undefined && el !== cardUi.cells[cardUi.cursor]) continue;
        out.push(el);
      }
    }
    return out;
  }

  function setMenuIndex(index, controls = visibleControls()) {
    // Clear first: a panel we just left would otherwise keep its highlight on
    // a control nobody can see any more.
    for (const el of document.querySelectorAll(".controller-focus")) el.classList.remove("controller-focus");
    if (!controls.length) return;
    world.quickIndex = -1;
    world.menuIndex = (index + controls.length) % controls.length;
    const target = controls[world.menuIndex];
    target.classList.add("controller-focus");
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: "nearest" });
  }

  // A keyboard scheme's direction keys belong to the lobby (join / pick a
  // fighter) until that player has locked in; only then do they drive the menu.
  function schemeFreeForNav(sc, i) {
    if (world.state !== "menu") return true;
    const slot = lobbySlots.find(s => s.type === "keyboard" && s.schemeIndex === i);
    return Boolean(slot && slot.locked);
  }

  // Returns a direction vector {x, y} for menu navigation, or null.
  function menuNav(pads) {
    if (world.joinedThisFrame || world.lockedThisFrame) return null;
    let x = 0, y = 0;
    keyboardSchemes.forEach((sc, i) => {
      if (!schemeFreeForNav(sc, i)) return;
      if (pressed.has(sc.right)) x = 1;
      if (pressed.has(sc.left)) x = -1;
      if (pressed.has(sc.down)) y = 1;
      if (pressed.has(sc.up)) y = -1;
    });
    for (const pad of pads) {
      if (buttonEdge(pad, 13) || axisEdge(pad, 1, 1)) y = 1;
      if (buttonEdge(pad, 12) || axisEdge(pad, 1, -1)) y = -1;
      // in the lobby left/right picks a fighter until that pad is locked in
      if (world.state !== "menu" || padSlotLocked(pad)) {
        if (buttonEdge(pad, 15) || axisEdge(pad, 0, 1)) x = 1;
        if (buttonEdge(pad, 14) || axisEdge(pad, 0, -1)) x = -1;
      }
    }
    return x || y ? { x, y } : null;
  }

  // Moves the cursor to whichever control actually sits in that direction, so a
  // row of buttons is crossed with left/right and a column with up/down.
  function moveFocusSpatial(dir, controls) {
    const current = controls[world.menuIndex];
    if (!current) return;
    const a = current.getBoundingClientRect();
    const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    // The card grid stands in the list as one cell that sits directly under the
    // Choose Cards mode buttons, so coming DOWN the panel it always won the
    // spatial search and the All / None / Invert row above it — sitting off to
    // the right — was stepped straight over and could never be reached on a
    // pad. Walking down now enters the grid THROUGH that row.
    const inPickerBar = Boolean(current.closest && current.closest(".card-picker-bar"));
    let best = -1, bestScore = Infinity;
    controls.forEach((el, i) => {
      if (el === current) return;
      if (dir.y > 0 && !inPickerBar && el.dataset.cell !== undefined) return;
      const r = el.getBoundingClientRect();
      const vx = r.left + r.width / 2 - ax;
      const vy = r.top + r.height / 2 - ay;
      const along = vx * dir.x + vy * dir.y;
      if (along <= 6) return;                       // must lie that way
      const across = Math.abs(vx * -dir.y + vy * dir.x);
      // The cone is generous close in, so a control on the next row but well
      // off to one side — the card picker's All / None / Invert — still counts
      // as "that way", while distant off-axis controls stay excluded.
      if (across > along * 2 + 240) return;
      // Across is penalised, but not so hard that a control one row down and a
      // little to the side loses to one straight ahead but far away — that is
      // what hid the card picker's All / None / Invert row.
      const score = along + across * 1.2;
      if (score < bestScore) { bestScore = score; best = i; }
    });
    if (best >= 0) setMenuIndex(best, controls);
    return best >= 0;
  }

  function padSlotLocked(pad) {
    const slot = lobbySlots.find(s => s.type === "pad" && s.gamepadIndex === pad.index);
    return !slot || slot.locked;
  }

  function menuConfirm(pads) {
    if (world.pausedThisFrame || world.joinedThisFrame || world.lockedThisFrame) return false;
    if (pressed.has("Enter") || pressed.has("Space") || pressed.has("NumpadEnter")) return true;
    // a locked-in keyboard player confirms with their shoot key
    if (keyboardSchemes.some((sc, i) => pressed.has(sc.shoot) && schemeFreeForNav(sc, i))) return true;
    if (world.state === "menu" && world.quickIndex < 0) {
      // In the lobby A locks your character first; once you're ready it confirms
      // the focused button. Start always confirms. An icon picked with the
      // bumpers is confirmable either way — that is the point of the row.
      return pads.some(pad => buttonEdge(pad, 9) || ((buttonEdge(pad, 0) || buttonEdge(pad, 7)) && padSlotLocked(pad)));
    }
    return pads.some(pad => buttonEdge(pad, 0) || buttonEdge(pad, 7) || buttonEdge(pad, 9));
  }

  function menuBack(pads) {
    // the keypress that just opened the pause panel must not also close it
    if (world.pausedThisFrame) return false;
    if (pressed.has("Escape") || pressed.has("Backspace")) return true;
    // In the lobby B un-readies your slot, so only View/Back exits there.
    if (world.state === "menu") return pads.some(pad => buttonEdge(pad, 8));
    return pads.some(pad => buttonEdge(pad, 1) || buttonEdge(pad, 8));
  }

  function adjustMenuControl(el, dir) {
    if (el.matches("select")) {
      const n = el.options.length;
      if (!n) return;
      el.selectedIndex = (el.selectedIndex + dir + n) % n;
      el.dispatchEvent(new Event("change"));
    } else if (el.type === "range") {
      el.value = String(clamp(Number(el.value) + dir * Number(el.step || 1), Number(el.min), Number(el.max)));
      el.dispatchEvent(new Event("input"));
    } else if (el.type === "checkbox") {
      el.checked = dir > 0;
      el.dispatchEvent(new Event("change"));
    }
  }

  // Settings and Controls can be opened from the main menu or mid-match from the
  // pause panel; closing returns to whichever opened it.
  function openPanel(panel, state) {
    world.panelReturn = world.state === "paused" ? "paused" : "menu";
    if (world.panelReturn === "paused") pausePanel.classList.add("hidden");
    else menu.classList.add("hidden");
    panel.classList.remove("hidden");
    world.state = state;
    setMenuIndex(0);
  }

  function closePanel(panel) {
    panel.classList.add("hidden");
    battleSplash.classList.add("hidden");
    if (world.panelReturn === "paused" && players.length) {
      pausePanel.classList.remove("hidden");
      world.state = "paused";
    } else {
      menu.classList.remove("hidden");
      world.state = "menu";
      renderLobby();
    }
    setMenuIndex(0);
  }

  function togglePause(forceState = null) {
    const shouldPause = forceState === null ? world.state === "playing" : forceState;
    if (shouldPause && world.state === "playing") {
      world.state = "paused";
      world.pausedThisFrame = true;
      pausePanel.classList.remove("hidden");
      setMenuIndex(0);
      duckMusic(DUCK.paused);
      sfx("card");
    } else if (!shouldPause && world.state === "paused") {
      world.state = "playing";
      pausePanel.classList.add("hidden");
      duckMusic(DUCK.none);
    }
  }

  function duckMusic(level) {
    world.musicDuck = level;
    applyMusicVolume();
  }

  function applyMusicVolume() {
    if (musicAudio) musicAudio.volume = musicGain();
    if (musicState.preload) musicState.preload.el.volume = musicGain();
  }

  function returnToMainMenu() {
    players = [];
    bullets = [];
    fields = [];
    particles = [];
    fxShots = [];
    hud.innerHTML = "";
    hudRefs = [];
    duckMusic(DUCK.none);
    setMusicContext("menu");
    world.width = 1600;   // menu background is authored for the default field
    world.height = 900;
    world.state = "menu";
    world.panelReturn = "menu";
    world.winner = null;
    hideAllPanels();
    menu.classList.remove("hidden");
    renderLobby();
    setMenuIndex(0);
  }

  // -------------------------------------------------------------------- HUD
  function buildHud() {
    hud.innerHTML = '<div class="hud-col left"></div><div class="hud-col right"></div>';
    const cols = [hud.querySelector(".hud-col.left"), hud.querySelector(".hud-col.right")];
    hudRefs = [];
    players.forEach((p, i) => {
      const el = document.createElement("article");
      el.className = "hud-card";
      el.style.setProperty("--pcol", p.color);
      el.innerHTML = `
        <div class="hud-head">
          <div class="hud-portrait"><canvas width="64" height="64"></canvas></div>
          <div class="hud-id">
            <span class="hud-name">${escapeHtml(p.name)}</span>
            <span class="hud-score"></span>
          </div>
        </div>
        <div class="hud-cards"></div>`;
      const pc = el.querySelector("canvas").getContext("2d");
      pc.translate(26, 36);
      drawCharacter(pc, p.character, 17, { t: 0, aimX: 1 });
      cols[i % 2].appendChild(el);
      hudRefs.push({
        p, el,
        score: el.querySelector(".hud-score"),
        cards: el.querySelector(".hud-cards"),
        lastCards: -1
      });
    });
    updateHud(true);
  }

  // Park the two card columns in the letterbox margins when the window is wider
  // than 16:9; on an exact fit they tuck into the arena corners instead.
  function layoutHud(marginX, marginY) {
    const roomy = marginX >= 150;
    if (world.hudRoomy !== roomy) {
      world.hudRoomy = roomy;
      hud.classList.toggle("tight", !roomy);
    }
    const inset = roomy ? Math.max(8, marginX - 236) : 10;
    const top = roomy ? Math.max(10, marginY + 10) : marginY + 10;
    if (world.hudInset !== inset || world.hudTop !== top) {
      world.hudInset = inset;
      world.hudTop = top;
      hud.style.setProperty("--hud-inset", `${Math.round(inset)}px`);
      hud.style.setProperty("--hud-top", `${Math.round(top)}px`);
    }
  }

  function updateHud(force = false) {
    for (const ref of hudRefs) {
      const p = ref.p;
      ref.el.classList.toggle("dead", !p.alive);
      ref.score.textContent = str("hud.score", { score: p.score, limit: settings.scoreLimit });
      if (force || p.cards.length !== ref.lastCards) {
        ref.lastCards = p.cards.length;
        const shown = p.cards.slice(-3);
        ref.cards.innerHTML = shown.map(c =>
          `<span style="--rcol:${RARITIES[c.rarity].color};--art:url('${cardArtUrl(c.id)}')">${c.name}</span>`).join("") +
          (p.cards.length > 3 ? `<span class="more">${escapeHtml(str("hud.more", { count: p.cards.length - 3 }))}</span>` : "") ||
          `<span class="none">${escapeHtml(str("hud.noCards"))}</span>`;
      }
      const activeReady = p.stats.active &&
        (p.stats.active === "chronoshift" ? (p.rewindLeft ?? 0) > 0.15 : p.activeCooldown <= 0);
      ref.el.classList.toggle("active-ready", Boolean(activeReady));
    }
  }

  // ------------------------------------------------------------------ render
  function render() {
    resize();
    syncChrome();
    const onMenuScreen = world.state === "title" || world.state === "menu" ||
      ((world.state === "settings" || world.state === "how") && (world.panelReturn !== "paused" || !players.length));
    const inGame = !onMenuScreen;
    const dpr = canvas.height / innerHeight;
    // the arena always takes the largest 16:9 fit — health and ammo ride on the
    // fighters themselves, so nothing needs to be reserved at the bottom
    const scale = Math.min(canvas.width / world.width, canvas.height / world.height);
    const ox = (canvas.width - world.width * scale) / 2;
    const oy = (canvas.height - world.height * scale) / 2;
    if (inGame) layoutHud(ox / dpr, oy / dpr);
    ctx.save();
    ctx.fillStyle = "#0a0a12";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const shake = settings.shake ? world.shake : 0;
    ctx.translate(ox + rand(-shake, shake), oy + rand(-shake, shake));
    ctx.scale(scale, scale);
    world.shake *= 0.86;
    ctx.beginPath();
    ctx.rect(0, 0, world.width, world.height);
    ctx.clip();

    if (onMenuScreen) {
      drawMenuBackground();
      drawParticles();
    } else {
      const level = currentLevel();
      drawArenaBackground(level);
      drawWeatherParticles();
      drawArenaFeatures(level);
      drawPlatforms(level);
      drawFields();
      // Chronoshift: the future being unwound, drawn as fading ghosts of every
      // fighter and every round at points further along the tape
      if (rewind.active && history.length) {
        ctx.save();
        for (let g = 1; g <= 5; g += 1) {
          const idx = Math.min(history.length - 1, rewind.cursor + g * 7);
          const frame = history[idx];
          if (!frame || idx <= rewind.cursor) continue;
          const a = 0.42 * (1 - g / 6);
          ctx.globalAlpha = a;
          frame.players.forEach((snap, i) => {
            const p = players[i];
            if (!p || !snap.alive) return;
            ctx.save();
            ctx.translate(snap.x, snap.y);
            drawCharacter(ctx, p.character, p.stats.radius, { t: world.time, aimX: snap.aimX, aimY: snap.aimY });
            ctx.restore();
          });
          for (const sb of frame.bullets) {
            if (sb.life <= 0) continue;
            ctx.fillStyle = sb.ref.color || "#8fd8ff";
            ctx.beginPath();
            ctx.arc(sb.x, sb.y, sb.ref.r || 6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      }
      drawDecoys();
      drawBullets();
      drawPlayersAll();
      drawTide(level);
      drawParticles();
      drawBoltsAll();
      drawFxShots();
      drawCrackers();
      drawSiphons();
      drawFloats();
      if (world.lightningFlash > 0) {
        ctx.fillStyle = `rgba(255,244,200,${world.lightningFlash * 1.4})`;
        ctx.fillRect(0, 0, world.width, world.height);
      }
      if (world.state === "card-show") drawCardShows();
      drawRewindOverlay();
      if (world.roundFreeze > 0 && world.state === "playing") drawCountdown();
      if (world.state === "ended") drawWinner();
      // vignette
      const vg = ctx.createRadialGradient(world.width / 2, world.height / 2, world.height * 0.45, world.width / 2, world.height / 2, world.height * 0.95);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.32)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, world.width, world.height);
    }
    ctx.restore();
    updateToast();
  }

  // A bot's card, drawn the size of a real card and flung home. Same face as the
  // draft hand — emblem, rarity colour, name — so a card learned on the card
  // screen is the same card here.
  const CARD_W = 190, CARD_H = 266;

  function drawCardShows() {
    // Darken behind the flight so a card reads over a busy arena.
    const lead = world.cardShows.find(sh => sh.t >= 0 && sh.t < CARD_FLY_TOTAL);
    if (lead) {
      const fade = Math.min(1, lead.t / 0.25) * (1 - Math.max(0, (lead.t - CARD_FLY.rise - CARD_FLY.hold) / CARD_FLY.fling));
      ctx.fillStyle = `rgba(6,6,14,${0.45 * fade})`;
      ctx.fillRect(0, 0, world.width, world.height);
    }
    for (const show of world.cardShows) {
      if (show.t < 0 || show.t > CARD_FLY_TOTAL) continue;
      const pose = cardShowPose(show);
      ctx.save();
      ctx.globalAlpha = pose.alpha;
      ctx.translate(pose.x, pose.y);
      ctx.rotate(pose.spin * 0.35);
      ctx.scale(pose.scale, pose.scale);
      drawCardFace(show.card, show.player);
      ctx.restore();
    }
  }

  function drawCardFace(c, owner) {
    const rar = RARITIES[c.rarity];
    const w = CARD_W, h = CARD_H;
    ctx.save();
    ctx.translate(-w / 2, -h / 2);

    ctx.shadowColor = rar.glow;
    ctx.shadowBlur = 34;
    ctx.fillStyle = "#191c26";
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 14);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = rar.color;
    ctx.lineWidth = 4;
    ctx.stroke();

    // art panel: the painted scene fills it edge to edge (centre-cropped), and
    // the emblem cutout stands in until the scene loads or if it is missing
    const scene = cardScene(c.id);
    const art = scene || cardArt(c.id);
    const pad = 12, artH = 120;
    const ax = pad, ay = pad + 16, aw = w - pad * 2;
    ctx.fillStyle = hexAlpha(rar.color, 0.14);
    ctx.beginPath();
    ctx.roundRect(ax, ay, aw, artH, 10);
    ctx.fill();
    if (art) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(ax, ay, aw, artH, 10);
      ctx.clip();
      if (scene) {
        const s = Math.max(aw / art.width, artH / art.height);   // cover
        const dw = art.width * s, dh = art.height * s;
        ctx.drawImage(art, ax + (aw - dw) / 2, ay + (artH - dh) / 2, dw, dh);
      } else {
        const size = Math.min(aw - 8, artH - 8);                  // contain
        ctx.drawImage(art, w / 2 - size / 2, ay + artH / 2 - size / 2, size, size);
      }
      ctx.restore();
    }

    ctx.fillStyle = rar.color;
    ctx.font = "700 15px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(rar.name.toUpperCase(), w / 2, 22);

    ctx.fillStyle = "#f2eeff";
    ctx.font = "700 19px system-ui, sans-serif";
    wrapText(c.name, w / 2, pad + 16 + artH + 30, w - 26, 22);

    ctx.fillStyle = "rgba(226,220,255,0.7)";
    ctx.font = "13px system-ui, sans-serif";
    const effects = c.effects.slice(0, 3);
    effects.forEach((line, i) => {
      ctx.fillText(line, w / 2, pad + 16 + artH + 58 + i * 17);
    });

    if (owner) {
      ctx.fillStyle = owner.color;
      ctx.font = "700 13px system-ui, sans-serif";
      ctx.fillText(owner.name, w / 2, h - 14);
    }
    ctx.restore();
  }

  // Card names are short but not all short; two lines is plenty.
  function wrapText(text, x, y, maxWidth, lineHeight) {
    const words = String(text).split(" ");
    let line = "";
    let dy = 0;
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > maxWidth && line) {
        ctx.fillText(line, x, y + dy);
        dy += lineHeight;
        line = word;
      } else line = next;
    }
    if (line) ctx.fillText(line, x, y + dy);
  }

  // -------- backdrop
  const seedCache = new Map();
  function seeded(id, n) {
    const key = `${id}:${n}`;
    if (!seedCache.has(key)) {
      let h = 2166136261;
      for (const c of key) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
      seedCache.set(key, ((h >>> 0) % 1000) / 1000);
    }
    return seedCache.get(key);
  }

  function skyGradient(pal) {
    const g = ctx.createLinearGradient(0, 0, 0, world.height);
    g.addColorStop(0, pal.skyTop);
    g.addColorStop(0.55, pal.skyMid);
    g.addColorStop(1, pal.skyBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, world.width, world.height);
  }

  function drawArenaBackground(level) {
    const img = arenaImage.get(level.id);
    if (img) {
      ctx.drawImage(img, 0, 0, world.width, world.height);
      return;
    }
    const pal = level.palette;
    skyGradient(pal);
    drawBackdropSilhouettes(level);
  }

  function drawBackdropSilhouettes(level) {
    const pal = level.palette;
    const id = level.id;
    ctx.save();
    // far layer
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = shade(pal.skyTop, 24);
    drawSilhouetteLayer(level, 0, 560, 0.6);
    // near layer
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = shade(pal.skyTop, 12);
    drawSilhouetteLayer(level, 1, 640, 1);
    ctx.restore();
    // theme extras
    ctx.save();
    switch (level.backdrop) {
      case "space": case "void": case "grid": drawStarsBg(id); break;
      case "aurora": drawAuroraBg(); drawStarsBg(id); break;
      case "storm": drawStarsBg(id); break;
      case "heaven": drawSunburst(pal.accent); break;
      case "festival": drawLanternsBg(id); break;
      case "crystal": drawCrystalBeams(pal.accent); break;
    }
    if (level.backdrop === "grid") drawGridFloor(pal.accent);
    ctx.restore();
  }

  function drawSilhouetteLayer(level, layer, horizon, scaleF) {
    const id = level.id;
    const style = level.backdrop;
    const step = 130 * scaleF;
    ctx.beginPath();
    ctx.moveTo(0, world.height);
    for (let x = -60; x < world.width + 120; x += step) {
      const s1 = seeded(id, Math.floor(x / step) * 2 + layer * 100);
      const s2 = seeded(id, Math.floor(x / step) * 2 + 1 + layer * 100);
      let h;
      if (["city", "grid", "junkyard", "library", "gears"].includes(style)) {
        // blocky skyline
        h = horizon + s1 * 220;
        ctx.lineTo(x, world.height);
        ctx.lineTo(x, world.height - (world.height - h));
        ctx.lineTo(x + step * (0.55 + s2 * 0.4), world.height - (world.height - h));
        ctx.lineTo(x + step * (0.55 + s2 * 0.4), world.height);
      } else if (["mountains", "canyon", "colosseum", "wreck", "temple", "aurora"].includes(style)) {
        // jagged peaks
        h = horizon - 60 + s1 * 260;
        ctx.lineTo(x + step / 2, h);
        ctx.lineTo(x + step, world.height - (world.height - horizon - 120) * s2 * 0.3 - 100);
      } else {
        // rolling bumps (forest, cave, candy, jungle, etc.)
        h = horizon + s1 * 160;
        ctx.quadraticCurveTo(x + step / 2, h - 130 * s2, x + step, h);
      }
    }
    ctx.lineTo(world.width + 120, world.height);
    ctx.closePath();
    ctx.fill();
  }

  function drawStarsBg(id) {
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    for (let i = 0; i < 70; i += 1) {
      const x = seeded(id, i * 3) * world.width;
      const y = seeded(id, i * 3 + 1) * world.height * 0.7;
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(world.time * (0.5 + seeded(id, i * 3 + 2)) + i));
      ctx.globalAlpha = tw * 0.8;
      ctx.fillRect(x, y, 2.5, 2.5);
    }
    ctx.globalAlpha = 1;
  }

  function drawAuroraBg() {
    for (let band = 0; band < 3; band += 1) {
      ctx.beginPath();
      const baseY = 120 + band * 70;
      ctx.moveTo(0, baseY);
      for (let x = 0; x <= world.width; x += 80) {
        ctx.lineTo(x, baseY + Math.sin(x / 210 + world.time * 0.5 + band * 2) * 46);
      }
      ctx.strokeStyle = band === 1 ? "rgba(94,255,195,0.16)" : "rgba(180,92,255,0.13)";
      ctx.lineWidth = 46 - band * 8;
      ctx.lineCap = "round";
      ctx.stroke();
    }
  }

  function drawSunburst(color) {
    ctx.save();
    ctx.translate(world.width / 2, 150);
    ctx.rotate(world.time * 0.05);
    ctx.fillStyle = hexAlpha(color, 0.08);
    for (let i = 0; i < 12; i += 1) {
      ctx.rotate(Math.PI / 6);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-90, 1500);
      ctx.lineTo(90, 1500);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawLanternsBg(id) {
    for (let i = 0; i < 16; i += 1) {
      const x = seeded(id, i * 7) * world.width;
      const y = (seeded(id, i * 7 + 1) * 700 - world.time * 12 - i * 40) % 760;
      const yy = y < 0 ? y + 760 : y;
      ctx.fillStyle = "rgba(255,207,94,0.5)";
      ctx.beginPath();
      ctx.ellipse(x, yy, 9, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,150,60,0.25)";
      ctx.beginPath();
      ctx.arc(x, yy, 22, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCrystalBeams(color) {
    ctx.save();
    ctx.globalAlpha = 0.1;
    for (let i = 0; i < 5; i += 1) {
      ctx.fillStyle = i % 2 ? color : "#ff5fa8";
      ctx.beginPath();
      const x = 200 + i * 300 + Math.sin(world.time * 0.3 + i) * 40;
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 130, 0);
      ctx.lineTo(x + 320, world.height);
      ctx.lineTo(x + 190, world.height);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawGridFloor(color) {
    ctx.strokeStyle = hexAlpha(color, 0.14);
    ctx.lineWidth = 1.5;
    for (let x = 0; x <= world.width; x += 100) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, world.height); ctx.stroke();
    }
    for (let y = 0; y <= world.height; y += 100) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(world.width, y); ctx.stroke();
    }
  }

  // -------- arena features
  function drawArenaFeatures(level) {
    const pal = level.palette;
    // teleporters
    for (const t of level.teleporters || []) {
      for (const [x, y] of [[t.ax, t.ay], [t.bx, t.by]]) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(world.time * 2.4);
        for (let i = 0; i < 3; i += 1) {
          ctx.strokeStyle = hexAlpha(pal.accent, 0.7 - i * 0.2);
          ctx.lineWidth = 5 - i;
          ctx.beginPath();
          ctx.arc(0, 0, 16 + i * 9, i, i + Math.PI * 1.4);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
    // bounce pads
    for (const pad of level.bouncePads || []) {
      const squish = 1 + Math.sin(world.time * 6 + pad.x) * 0.08;
      ctx.fillStyle = pal.accent;
      ctx.strokeStyle = shade(pal.accent, -60);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(pad.x + pad.w / 2, pad.y + 10, pad.w / 2, 14 * squish, 0, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath();
      ctx.moveTo(pad.x + pad.w / 2 - 10, pad.y + 2);
      ctx.lineTo(pad.x + pad.w / 2, pad.y - 8 - squish * 3);
      ctx.lineTo(pad.x + pad.w / 2 + 10, pad.y + 2);
      ctx.closePath();
      ctx.fill();
    }
    // zones (syrup)
    for (const z of level.zones || []) {
      ctx.fillStyle = "rgba(140,60,20,0.4)";
      ctx.beginPath();
      ctx.roundRect(z.x, z.y, z.w, z.h, 10);
      ctx.fill();
      ctx.fillStyle = "rgba(255,200,120,0.25)";
      for (let i = 0; i < 4; i += 1) {
        const bx = z.x + ((seeded(level.id, i * 13) * z.w + world.time * 18) % z.w);
        ctx.beginPath();
        ctx.arc(bx, z.y + 8 + (i % 2) * 12, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Draw a platform with its bored holes actually missing: everything is drawn
  // inside an even-odd clip of (slab minus holes), so the backdrop shows
  // through the gap instead of the hole being painted over the terrain.
  function withHoles(holes, box, fn) {
    if (!holes || !holes.length) { fn(); return; }
    ctx.save();
    ctx.beginPath();
    ctx.rect(box.x - 12, box.y - 12, box.w + 24, box.h + 24);
    for (const h of holes) ctx.rect(box.x + h.lx, box.y + h.ly, h.w, h.h);
    ctx.clip("evenodd");
    fn();
    ctx.restore();
    // No rim, no outline: a bored gap is simply empty space. What sells the
    // break is the shower of wall-coloured debris thrown at the moment of
    // impact (see punchHole), not a box drawn where the material used to be.
  }

  function drawPlatforms(level) {
    const pal = level.palette;
    const t = world.time;
    for (const p of level.platforms) {
      const brk = props.breaks.get(p);
      if (brk && brk.dead) continue;
      const alpha = phaseAlpha(p, t);
      withHoles(props.holes.get(p), p, () => {
        drawPlatform(p, pal, alpha, p.ice, p.conveyor);
        if (brk) drawBreakableOverlay(p, brk, pal);
      });
    }
    for (const hg of props.hungs) {
      drawChains(hg, pal);                    // dead hungs keep their cut stubs
      if (!hg.dead) withHoles(props.holes.get(hg), hg, () => drawPlatform(hg, pal, 1, hg.ice, 0));
    }
    for (const s of props.slabs) {
      if (s.dead) continue;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      drawPlatform({ x: -s.w / 2, y: -s.h / 2, w: s.w, h: s.h }, pal, 1, s.ice, 0);
      ctx.restore();
    }
    for (const c of props.crates) {
      if (c.dead) continue;
      drawCrate(c, pal, level.id);
    }
    for (const m of level.movers || []) {
      const ph = (m.phase || 0) * Math.PI * 2;
      const s = (Math.sin((t / m.period) * Math.PI * 2 + ph) + 1) / 2;
      const box = { ...m, x: m.x + m.dx * s, y: m.y + m.dy * s };
      withHoles(props.holes.get(m), box, () => drawPlatform(box, pal, 1, m.ice, m.conveyor, true));
    }
    if (settings.hazards) {
      for (const h of level.hazards) drawHazard(h, pal);
    }
    // lightning warns
    for (const f of fields) {
      if (f.type === "lightning-warn") {
        ctx.fillStyle = `rgba(255,233,94,${0.1 + 0.12 * Math.abs(Math.sin(world.time * 16))})`;
        ctx.fillRect(f.x - 55, 0, 110, world.height);
      }
    }
  }

  function drawPlatform(p, pal, alpha, ice, conveyor, isMover = false) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = pal.plat;
    ctx.strokeStyle = pal.platEdge;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(p.x, p.y, p.w, p.h, 8);
    ctx.fill();
    ctx.stroke();
    // top accent glow line
    ctx.fillStyle = ice ? "rgba(255,255,255,0.75)" : hexAlpha(pal.accent, 0.8);
    ctx.beginPath();
    ctx.roundRect(p.x + 6, p.y + 3, p.w - 12, 4, 2);
    ctx.fill();
    if (ice) {
      ctx.fillStyle = "rgba(200,240,255,0.25)";
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, p.w, p.h, 8);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      for (let x = p.x + 18; x < p.x + p.w - 18; x += 46) {
        ctx.fillRect(x, p.y + p.h / 2 - 1, 18, 2);
      }
    }
    if (conveyor) {
      const dir = Math.sign(conveyor);
      const off = (world.time * Math.abs(conveyor) * 0.6) % 30;
      ctx.fillStyle = hexAlpha(pal.accent, 0.65);
      for (let x = p.x + 8 + (dir > 0 ? off : 30 - off); x < p.x + p.w - 14; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, p.y + p.h / 2 + 4);
        ctx.lineTo(x + 8 * dir, p.y + p.h / 2);
        ctx.lineTo(x, p.y + p.h / 2 - 4);
        ctx.fill();
      }
    }
    if (isMover) {
      ctx.strokeStyle = hexAlpha(pal.accent, 0.35);
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 7]);
      ctx.strokeRect(p.x - 4, p.y - 4, p.w + 8, p.h + 8);
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  // Breakables telegraph with a stitched accent outline; cracks grow with damage.
  function drawBreakableOverlay(p, brk, pal) {
    ctx.save();
    ctx.strokeStyle = hexAlpha(pal.accent, 0.55);
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 6]);
    ctx.strokeRect(p.x + 3, p.y + 3, p.w - 6, p.h - 6);
    ctx.setLineDash([]);
    const dmg = 1 - brk.hp / brk.max;
    if (dmg > 0.02) {
      ctx.strokeStyle = `rgba(10,8,8,${0.35 + dmg * 0.45})`;
      ctx.lineWidth = 2;
      const n = Math.ceil(dmg * 6);
      const seedId = `crack${p.x},${p.y}`;
      for (let i = 0; i < n; i += 1) {
        const sx = p.x + seeded(seedId, i * 7 + 1) * p.w;
        const sy = p.y + 2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + (seeded(seedId, i * 3 + 2) - 0.5) * 24, sy + p.h * 0.55);
        ctx.lineTo(sx + (seeded(seedId, i * 5 + 3) - 0.5) * 34, sy + p.h - 4);
        ctx.stroke();
      }
    }
    if (brk.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${brk.flash * 3})`;
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, p.w, p.h, 8);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawChains(hg, pal) {
    ctx.save();
    ctx.lineWidth = 3;
    for (const ch of hg.chains) {
      const topY = hg.anchorY;
      const endY = ch.cut ? topY + Math.min(60, (world.time - ch.cutAt) * 90 + 26) : hg.y;
      const sway = ch.cut ? Math.sin(world.time * 3 + ch.x) * 10 : 0;
      ctx.strokeStyle = ch.cut ? hexAlpha(pal.platEdge, 0.7) : shade(pal.plat, -25);
      for (let y = topY; y < endY - 6; y += 13) {
        const f = (y - topY) / Math.max(1, endY - topY);
        const cx = ch.x + sway * f;
        ctx.beginPath();
        ctx.ellipse(cx, y + 6, 3.5, 6.5, sway * 0.02, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (!ch.cut) {
        // glint so players read the chain as shootable
        const gy = topY + ((world.time * 60 + ch.x) % Math.max(1, hg.y - topY));
        ctx.fillStyle = hexAlpha(pal.accent, 0.9);
        ctx.beginPath();
        ctx.arc(ch.x, gy, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawCrate(c, pal, levelId) {
    ctx.save();
    const body = shade(pal.plat, 18);
    ctx.fillStyle = body;
    ctx.strokeStyle = pal.platEdge;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.roundRect(c.x, c.y, c.w, c.h, 6);
    ctx.fill();
    ctx.stroke();
    // cross braces
    ctx.strokeStyle = hexAlpha(pal.platEdge, 0.65);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(c.x + 5, c.y + 5); ctx.lineTo(c.x + c.w - 5, c.y + c.h - 5);
    ctx.moveTo(c.x + c.w - 5, c.y + 5); ctx.lineTo(c.x + 5, c.y + c.h - 5);
    ctx.stroke();
    ctx.strokeStyle = hexAlpha(pal.accent, 0.5);
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x + 4, c.y + 4, c.w - 8, c.h - 8);
    const dmg = 1 - c.hp / c.max;
    if (dmg > 0.05) {
      ctx.strokeStyle = `rgba(0,0,0,${0.3 + dmg * 0.5})`;
      ctx.lineWidth = 2;
      const n = Math.ceil(dmg * 5);
      for (let i = 0; i < n; i += 1) {
        const sx = c.x + seeded(`${levelId}c${c.seed}`, i * 11) * c.w;
        ctx.beginPath();
        ctx.moveTo(sx, c.y + 3);
        ctx.lineTo(sx + (seeded(`${levelId}c${c.seed}`, i * 13) - 0.5) * 20, c.y + c.h * 0.6);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawHazard(h, pal) {
    if (h.kind === "water") { drawWaterHazard(h, pal); return; }
    ctx.fillStyle = pal.hazard;
    ctx.strokeStyle = shade(pal.hazard, -60);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(h.x, h.y, h.w, h.h, 6);
    ctx.fill();
    ctx.stroke();
    // bubbling / spikes
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    for (let x = h.x + 8; x < h.x + h.w - 8; x += 20) {
      const bob = Math.sin(world.time * 5 + x * 0.2) * 3;
      ctx.beginPath();
      ctx.moveTo(x, h.y + h.h);
      ctx.lineTo(x + 8, h.y + 2 + bob);
      ctx.lineTo(x + 16, h.y + h.h);
      ctx.fill();
    }
  }

  // Water reads as water: a translucent body with a moving surface line, so it
  // is obvious you can be in it rather than obliterated by it.
  function drawWaterHazard(h, pal) {
    const surf = 5;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(h.x, h.y - surf, h.w, h.h + surf, 5);
    ctx.clip();
    const g = ctx.createLinearGradient(0, h.y - surf, 0, h.y + h.h);
    g.addColorStop(0, hexAlpha(pal.hazard, 0.55));
    g.addColorStop(1, hexAlpha(pal.hazard, 0.85));
    ctx.fillStyle = g;
    ctx.fillRect(h.x, h.y - surf, h.w, h.h + surf);

    // surface chop
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = h.x; x <= h.x + h.w; x += 8) {
      const y = h.y - surf + 3 + Math.sin(world.time * 2.6 + x * 0.05) * 2.5;
      if (x === h.x) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // slow drifting glints
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    for (let x = h.x + 14; x < h.x + h.w; x += 46) {
      const y = h.y + 12 + ((world.time * 12 + x) % (h.h - 6));
      ctx.beginPath();
      ctx.ellipse(x + Math.sin(world.time + x) * 5, y, 7, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawTide(level) {
    if (!level.tide) return;
    const y = world.tideLevel;
    const g = ctx.createLinearGradient(0, y, 0, world.height);
    g.addColorStop(0, hexAlpha(level.palette.hazard, 0.55));
    g.addColorStop(1, hexAlpha(level.palette.hazard, 0.8));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, y + 8);
    for (let x = 0; x <= world.width; x += 60) {
      ctx.lineTo(x, y + Math.sin(x / 90 + world.time * 2.2) * 7);
    }
    ctx.lineTo(world.width, world.height);
    ctx.lineTo(0, world.height);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 0; x <= world.width; x += 60) {
      const yy = y + Math.sin(x / 90 + world.time * 2.2) * 7;
      if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }

  // -------- entities
  // Springload's squash: a quarter of their height goes on the compression and
  // springs back out, pivoting on the feet so they stay planted.
  const SQUISH_TIME = 0.22;
  function squishScale(p) {
    const left = p.squish || 0;
    // Grasshopper coiling on the spot: the deeper the wind-up, the lower they
    // get, with a bob on top so the fighter reads as loaded rather than stuck.
    const held = p.grounded ? (p.jumpCharge || 0) : 0;
    if (left <= 0 && held <= 0) return null;
    let sy = 1, sx = 1, lift = 0;
    if (held > 0) {
      const k = clamp((held - CHARGE.minHold) / (CHARGE.maxHold - CHARGE.minHold), 0, 1);
      const coil = 0.12 + CHARGE.squash * k;
      const bob = Math.sin(world.time * (9 + k * 9)) * CHARGE.bob * (0.35 + k);
      sy *= 1 - coil;
      sx *= 1 + coil * 0.55;
      lift = bob;
    }
    if (left > 0) {
      const k = 1 - left / SQUISH_TIME;               // 0 at impact, 1 when done
      const bend = Math.sin(Math.PI * Math.min(1, k / 0.55));     // down then up
      const over = k > 0.55 ? Math.sin(Math.PI * (k - 0.55) / 0.45) * 0.1 : 0;
      sy *= 1 - 0.25 * bend + over;
      sx *= 1 + 0.16 * bend - over * 0.6;
    }
    return { sy, sx, lift };
  }

  function drawPlayersAll() {
    for (const p of players) {
      if (!p.alive) continue;
      const r = p.stats.radius;
      ctx.save();
      ctx.translate(p.x, p.y);
      // Camera Flash: a stunned fighter is rattled, not merely stationary
      if (p.stunTimer > 0) {
        const k = clamp(p.stunTimer / 0.4, 0, 1);
        ctx.translate(Math.sin(world.time * 46) * 3.2 * k, Math.cos(world.time * 39) * 1.8 * k);
      }
      const sq = squishScale(p);
      if (sq) { ctx.translate(0, r + (sq.lift || 0)); ctx.scale(sq.sx, sq.sy); ctx.translate(0, -r); }

      // Magnet Suit: a crackling magnetic field, so the deflection has a
      // visible cause rather than bullets mysteriously swerving
      if (p.stats.repel) {
        const t2 = world.time;
        ctx.save();
        for (let i = 0; i < 2; i += 1) {
          const rr = r + 14 + i * 12 + Math.sin(t2 * 5 + i) * 3;
          ctx.strokeStyle = `rgba(159,216,255,${0.35 - i * 0.12})`;
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 10]);
          ctx.lineDashOffset = -t2 * (60 + i * 40);
          ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.setLineDash([]);
        // little arcs of static skittering around the rim
        ctx.strokeStyle = "rgba(200,236,255,0.85)";
        ctx.lineWidth = 1.8;
        for (let i = 0; i < 3; i += 1) {
          const a0 = t2 * (2.2 + i) + i * 2.1;
          const rr = r + 10 + i * 7;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a0) * rr, Math.sin(a0) * rr);
          ctx.lineTo(Math.cos(a0 + 0.3) * (rr + 5), Math.sin(a0 + 0.3) * (rr + 5));
          ctx.lineTo(Math.cos(a0 + 0.55) * rr, Math.sin(a0 + 0.55) * rr);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Juggernaut wears its bulk: a studded iron shell sitting just proud of
      // the body, so the fighter reads as armoured rather than merely large
      if (p.stats.ironHull > 0) window.ROUNDERS.drawIronHull(ctx, r, p.stats.ironHull, world.time + p.botSeed);
      // Dragon's Hoard smoulders: curling smoke and gold embers off every side
      if (p.stats.hoard > 0) window.ROUNDERS.drawHoardAura(ctx, r, p.stats.hoard, world.time + p.botSeed);
      // Hot Streak: the fighter wears their streak as a golden field that
      // thins out as the shield burns down
      if (p.hotShield > 0) {
        const k = clamp(p.hotShield / (25 * Math.max(1, p.stats.hotStreak)), 0, 1);
        const rr = r * (1.5 + 0.12 * k) + Math.sin(world.time * 7) * 1.5;
        ctx.save();
        const hg = ctx.createRadialGradient(0, 0, r * 0.8, 0, 0, rr);
        hg.addColorStop(0, "rgba(255,214,110,0)");
        hg.addColorStop(0.7, `rgba(255,201,74,${0.16 * k})`);
        hg.addColorStop(1, `rgba(255,236,150,${0.42 * k})`);
        ctx.fillStyle = hg;
        ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(255,226,120,${0.75 * k})`;
        ctx.lineWidth = 2 + k;
        ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.stroke();
        // a few sparks riding the shell so it reads as heat, not glass
        ctx.fillStyle = `rgba(255,244,196,${0.85 * k})`;
        for (let i = 0; i < 4; i += 1) {
          const a2 = world.time * (1.6 + i * 0.4) + i * 1.7;
          ctx.beginPath();
          ctx.arc(Math.cos(a2) * rr, Math.sin(a2) * rr, 1.6 + k, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      // Thorn Jacket wears a briar: roses swell for a moment each time it bites
      if (p.stats.thorns > 0) {
        window.ROUNDERS.drawThornVine(ctx, r, p.stats.thorns, world.time + p.botSeed,
          clamp((p.thornPulse || 0) / 0.35, 0, 1));
      }
      // Hummingbird holding station: wings beating far too fast to resolve
      if (p.hovering) window.ROUNDERS.drawHoverWings(ctx, 0, 0, r, p.wingPhase || 0);

      // shadow
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.beginPath();
      ctx.ellipse(0, r + 9, r * 0.95, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // body (the lean is cosmetic, so the gauges below stay upright)
      ctx.save();
      ctx.rotate(clamp(p.vx / 1400, -0.4, 0.4));
      const pose = {
        t: world.time + p.botSeed,
        aimX: p.aimX, aimY: p.aimY, facing: p.facing,
        blink: p.blinkClock % 4 > 3.8
      };
      drawCharacter(ctx, p.character, r, pose);
      if (p.chillTimer > 0) {
        // Frozen through. The tint is masked to the fighter's OWN pixels by
        // redrawing them in the same pose, so it rides the body exactly —
        // hair, weapon and all — instead of being a pale disc in front of it.
        window.ROUNDERS.drawFrostTint(ctx, p.character, r, pose);
        // A wreath of cold vapour around the frozen fighter, over the tint.
        // The art is a ring with a hollow middle and it is drawn wide enough for
        // that hollow to clear the body — a chilled fighter you cannot see is a
        // fighter you cannot shoot at.
        drawFxSheet("chill-aura", 0, 0, r * 4, 0, { rot: world.time * 0.5, alpha: 0.4 });
      }
      if (p.burnTimer > 0) {
        ctx.fillStyle = "rgba(255,120,40,0.22)";
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      }
      // one bite of damage landing — a quick white bloom, so a stream of small
      // hits reads as hits rather than as a health bar quietly draining
      if (p.hitFlash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${0.5 * (p.hitFlash / 0.16)})`;
        ctx.beginPath(); ctx.arc(0, 0, r * 1.04, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();

      drawHealthBar(p, r);
      drawAmmoPips(p, r);

      if (p.blockTimer > 0 || p.spawnGrace > 0) {
        ctx.strokeStyle = p.blockTimer > 0 ? "#ffffff" : "rgba(255,255,255,0.45)";
        ctx.lineWidth = p.blockTimer > 0 ? 7 : 3;
        ctx.beginPath();
        ctx.arc(0, 0, r + 15 + Math.sin(performance.now() / 45) * 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      // regenerating shield: a cyan bubble whose glow tracks its charge, with
      // a hard flash when a hit lands on it
      if (p.stats.shield > 0 && p.shield > 0) {
        const frac = p.shield / p.stats.shield;
        const flash = p.shieldFlash > 0 ? p.shieldFlash / 0.25 : 0;
        // The painted bubble carries its own hex facets and rim; how full the
        // shield is still reads through its opacity, and a hit still flares it.
        // Its hex band rides the outer third of the image, so it is drawn wide
        // enough for that band to sit clear of the body rather than on it.
        const painted = drawFxSheet("shield-bubble", 0, 0,
          (r + 19) * 2 + Math.sin(world.time * 5) * 3, 0,
          { alpha: 0.5 + frac * 0.35 + flash * 0.4 });
        if (!painted) {
          ctx.strokeStyle = `rgba(127,216,255,${0.25 + frac * 0.35 + flash * 0.4})`;
          ctx.lineWidth = 2.5 + flash * 3;
          ctx.beginPath();
          ctx.arc(0, 0, r + 9 + Math.sin(world.time * 5) * 1.5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = `rgba(127,216,255,${0.05 + flash * 0.18})`;
          ctx.beginPath();
          ctx.arc(0, 0, r + 9, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // the bulb going off: a hard white wash over the body that blows out
      // into a ring and is gone inside a quarter second
      if (p.flashPop > 0) {
        const k = 1 - clamp(p.flashPop / 0.26, 0, 1);      // 0 at the pop, 1 at the end
        const rr = r * (1.1 + k * 2.4);
        ctx.save();
        const fg2 = ctx.createRadialGradient(0, 0, 0, 0, 0, rr);
        fg2.addColorStop(0, `rgba(255,255,255,${0.85 * (1 - k)})`);
        fg2.addColorStop(0.6, `rgba(255,255,255,${0.45 * (1 - k) * (1 - k)})`);
        fg2.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = fg2;
        ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - k)})`;
        ctx.lineWidth = 3 * (1 - k) + 0.5;
        ctx.beginPath(); ctx.arc(0, 0, rr * 0.92, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      // Camera Flash leaves its victim seeing stars — before this the only tell
      // a stun had was that they stopped moving. They ride above the health bar
      // and the name tag, which both sit just over the head, and rock as they go.
      if (p.stunTimer > 0) {
        drawFxSheet("stun-stars", 0, -r - 64, 74, 0,
          { rot: Math.sin(world.time * 7) * 0.2, alpha: clamp(p.stunTimer / 0.25, 0, 1) });
      }
      // active ability ready. A held active shows how much of its reel is
      // left as an arc rather than an all-or-nothing ring.
      const reel = p.stats.active === "chronoshift"
        ? clamp((p.rewindLeft ?? 0) / REWIND_MAX, 0, 1) : 1;
      if (p.stats.active && (p.stats.active === "chronoshift" ? reel > 0.05 : p.activeCooldown <= 0)) {
        ctx.strokeStyle = "rgba(255,77,143,0.8)";
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 8]);
        ctx.lineDashOffset = -world.time * 40;
        ctx.beginPath();
        ctx.arc(0, 0, r + 21, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * reel);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();

      // name tag
      ctx.fillStyle = hexAlpha(p.color, 0.9);
      ctx.font = "700 15px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(p.name, p.x, p.y - r - 32);
    }
  }

  // Health is a bar riding just above the fighter. Its LENGTH tracks max health,
  // so a Stone Soup or Juggernaut pickup visibly grows the bar rather than just
  // refilling a fixed ring — you can read who is the tank at a glance.
  const HEALTH_BAR_BASE_HP = 100;   // width below is calibrated to this
  const HEALTH_BAR_BASE_W = 52;
  function drawHealthBar(p, r) {
    const frac = clamp(p.hp / p.stats.maxHp, 0, 1);
    const w = clamp(HEALTH_BAR_BASE_W * (p.stats.maxHp / HEALTH_BAR_BASE_HP), 32, 190);
    const h = 7;
    const x = -w / 2;
    const y = -r - 20;

    ctx.save();
    // track
    ctx.fillStyle = "rgba(10,8,18,0.72)";
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, h / 2);
    ctx.fill();
    ctx.stroke();

    // Payment Plan lives INSIDE this bar rather than beside it: health you
    // still hold but have already lost on paper is drawn as an amber tail at
    // the end of the fill, and the solid part eats into it as the bill is
    // paid. One bar, and the number you are really on is where the amber ends.
    const owed = clamp(Math.min(p.decayPool || 0, p.hp) / p.stats.maxHp, 0, frac);
    if (frac > 0) {
      if (owed > 0) {
        ctx.fillStyle = `rgba(255,196,77,${0.72 + 0.18 * Math.abs(Math.sin(world.time * 6))})`;
        ctx.beginPath();
        ctx.roundRect(x + 1.5, y + 1.5, Math.max(2, (w - 3) * frac), h - 3, (h - 3) / 2);
        ctx.fill();
      }
      const keep = Math.max(0, frac - owed);
      const low = keep < 0.28;
      if (keep > 0) {
        ctx.fillStyle = low
          ? `rgba(255,90,110,${0.75 + 0.25 * Math.abs(Math.sin(world.time * 9))})`
          : p.color;
        ctx.beginPath();
        ctx.roundRect(x + 1.5, y + 1.5, Math.max(2, (w - 3) * keep), h - 3, (h - 3) / 2);
        ctx.fill();
      }
      // top highlight so the fill reads as a solid bar over busy backdrops
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.beginPath();
      ctx.roundRect(x + 2.5, y + 2, Math.max(1, (w - 5) * frac), 1.6, 1);
      ctx.fill();
    }
    // temp armor (Overflow, Fresh Coat) rides as a gold sliver. Hot Streak is
    // NOT in here — it is worn as a field around the fighter instead, so the
    // streak is visible on the fighter rather than read off a bar.
    const temp = (p.overShield || 0) + (p.freshPool || 0);
    if (temp > 0) {
      const tf = clamp(temp / p.stats.maxHp, 0, 1);
      ctx.fillStyle = "#ffd76e";
      ctx.beginPath();
      ctx.roundRect(x + 1, y - (p.stats.shield > 0 ? 9.5 : 5) + 0.6, Math.max(2, (w - 2) * tf), 2.4, 1.4);
      ctx.fill();
    }
    // Aegis charges are whole hits, so they read as pips — one dot per hit the
    // bubble will still swallow, rather than a bar that could be half full
    if (p.stats.shield > 0) {
      for (let i = 0; i < Math.min(5, p.stats.shield); i += 1) {
        const cx = x + 4 + i * 8;
        const lit = i < p.shield;
        ctx.beginPath();
        ctx.arc(cx, y - 5.5, 2.6, 0, Math.PI * 2);
        ctx.fillStyle = lit ? "#7fd8ff" : "rgba(40,62,84,0.75)";
        ctx.fill();
        if (lit) {
          ctx.strokeStyle = "rgba(200,240,255,0.9)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  // Ammo sits on the weapon side as a little fan of rounds that empties as you
  // fire; while reloading the fan refills left-to-right.
  function drawAmmoPips(p, r) {
    const n = Math.max(1, Math.round(p.stats.maxAmmo));
    if (n > 14) return;                       // absurd magazines would ring the body
    // The pips ride in a row just above the weapon: along the aim direction,
    // offset to the screen-up side of the barrel, so the count reads where the
    // eye already is instead of arcing perpendicular around the body.
    const ax = p.aimX, ay = p.aimY;
    let px = -ay, py = ax;                    // perpendicular to the aim
    if (py > 0) { px = -px; py = -py; }       // pick the side that points up
    const lift = 13;                          // clearance above the barrel
    const gap = 8.5;                          // spacing along the barrel
    const start = r + 4;                      // first pip sits past the body edge
    const reloading = p.reloadTimer > 0;
    const filled = reloading
      ? (1 - clamp(p.reloadTimer / Math.max(0.01, reloadOf(p)), 0, 1)) * n
      : p.ammo;
    for (let i = 0; i < n; i += 1) {
      const d = start + i * gap;
      const x = ax * d + px * lift;
      const y = ay * d + py * lift;
      const on = i < filled;
      ctx.beginPath();
      ctx.arc(x, y, on ? 3.1 : 2.2, 0, Math.PI * 2);
      ctx.fillStyle = on ? (reloading ? "rgba(255,255,255,0.92)" : "#ffe169") : "rgba(12,10,20,0.5)";
      ctx.fill();
      if (on) {
        ctx.strokeStyle = "rgba(12,10,20,0.75)";
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
    }
  }

  // Every card effect a bullet carries should be readable on the bullet
  // itself, so a loaded build LOOKS loaded mid-fight.
  // A round sheathed in glass (Glass Cannon): a thin blown-glass sphere around
  // the bullet, drawn procedurally so it sits over painted and procedural
  // rounds alike. Highlights are fixed relative to the screen, which is what
  // sells it as glass rather than a coloured ring.
  function glassShell(g, x, y, r) {
    const R = r * 1.62;
    g.save();
    g.translate(x, y);
    const gr = g.createRadialGradient(0, 0, R * 0.25, 0, 0, R);
    gr.addColorStop(0, "rgba(200,235,255,0.04)");
    gr.addColorStop(0.72, "rgba(200,235,255,0.12)");
    gr.addColorStop(0.93, "rgba(235,250,255,0.42)");
    gr.addColorStop(1, "rgba(255,255,255,0.06)");
    g.fillStyle = gr;
    g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(226,246,255,0.6)";
    g.lineWidth = Math.max(1, R * 0.09);
    g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.stroke();
    g.lineCap = "round";
    g.strokeStyle = "rgba(255,255,255,0.9)";
    g.lineWidth = Math.max(1, R * 0.14);
    g.beginPath(); g.arc(0, 0, R * 0.72, Math.PI * 1.05, Math.PI * 1.42); g.stroke();
    g.strokeStyle = "rgba(255,255,255,0.45)";
    g.lineWidth = Math.max(1, R * 0.08);
    g.beginPath(); g.arc(0, 0, R * 0.8, Math.PI * 0.12, Math.PI * 0.34); g.stroke();
    g.restore();
  }

  function drawBullets() {
    const t = world.time;
    for (const b of bullets) {
      ctx.save();
      // Resolved EVERY frame, not cached on the bullet: a sprite that finishes
      // loading after the shot was fired still gets drawn on it. Read by the
      // trail below as well as the round itself, so it is resolved up here.
      const look = bulletLookFor(b.owner);
      if (b.golden || b.empowered) {
        // the golden shot announces itself: hard glow plus a sparkle trail
        ctx.shadowColor = "#ffd700";
        ctx.shadowBlur = 26 + Math.sin(t * 24) * 8;
        if (Math.random() < 0.9) {
          const a = Math.random() * Math.PI * 2, rr = b.r * rand(0.6, 1.8);
          particles.push({
            x: b.x + Math.cos(a) * rr, y: b.y + Math.sin(a) * rr,
            vx: rand(-28, 28) - b.vx * 0.05, vy: rand(-28, 28) - b.vy * 0.05,
            life: rand(0.45, 0.8), maxLife: 0.8, r: rand(1.8, 3.6),
            color: Math.random() < 0.5 ? "#fff3b0" : "#ffd700", spark: true
          });
        }
      }
      // A painted round leaves a streak in its OWN colour (js/bullet-art.js) —
      // a venom round trails green, a frost round blue — so the streak and the
      // sprite agree, and a build carrying several bullet cards trails their
      // blend. Skipped for rounds that already have a louder trail of their
      // own (golden, banked, raging, supernova).
      if (look.color && !b.golden && !b.empowered && !b.banked && !b.rage && b.explosive < 2
          && Math.random() < 0.6) {
        const sp = b.r * (look.scale || 1);      // `r` is not resolved yet up here
        particles.push({
          x: b.x + rand(-sp * 0.5, sp * 0.5), y: b.y + rand(-sp * 0.5, sp * 0.5),
          vx: rand(-14, 14) - b.vx * 0.05, vy: rand(-14, 14) - b.vy * 0.05,
          life: rand(0.16, 0.3), maxLife: 0.3, r: rand(1.2, 2.4) * (look.scale || 1),
          color: look.color
        });
      }
      if (b.rage > 0) {
        // Berserker's Blood: the round bleeds as it flies. A scratch leaves the
        // odd fleck; at death's door it trails a steady ribbon of red.
        const bleed = clamp(b.rage / 1.5, 0, 1);
        const drops = bleed > 0.66 ? 3 : bleed > 0.33 ? 2 : 1;
        for (let i = 0; i < drops; i += 1) {
          if (Math.random() > 0.18 + bleed * 0.72) continue;
          particles.push({
            x: b.x + rand(-b.r, b.r), y: b.y + rand(-b.r * 0.6, b.r),
            vx: rand(-18, 18) - b.vx * 0.04, vy: rand(-10, 30),
            life: rand(0.4, 0.9), maxLife: 0.9, r: rand(1.4, 2.2 + bleed * 2.2),
            color: Math.random() < 0.35 ? "#ff4d5f" : "#a80f22"
          });
        }
        ctx.shadowColor = "#c41228";
        ctx.shadowBlur = 6 + bleed * 16;
      }
      if (b.banked) {
        // a banked round keeps throwing sparks all the way home, brighter for
        // each cushion it has taken
        ctx.shadowColor = "#ffe169";
        ctx.shadowBlur = 12 + b.banked * 6;
        const n = Math.min(3, b.banked);
        for (let i = 0; i < n; i += 1) {
          if (Math.random() > 0.75) continue;
          const a = Math.random() * Math.PI * 2, rr = b.r * rand(0.5, 1.6);
          particles.push({
            x: b.x + Math.cos(a) * rr, y: b.y + Math.sin(a) * rr,
            vx: rand(-22, 22) - b.vx * 0.06, vy: rand(-22, 22) - b.vy * 0.06,
            life: rand(0.25, 0.5), maxLife: 0.5, r: rand(1.4, 2.8),
            color: Math.random() < 0.5 ? "#ffe169" : "#ffb03a", spark: true
          });
        }
      }
      if (b.empowered) {
        // it is carrying a block: draw the parry bubble around the round
        const rr = b.r * 2.6 + 4;
        ctx.save();
        ctx.strokeStyle = `rgba(255,255,255,${0.75 + 0.25 * Math.sin(t * 16)})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(b.x, b.y, rr, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.14)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,215,0,0.55)";
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(b.x, b.y, rr - 4, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      // a big charge flies as a white-hot core with a corona (Supernova)
      if (b.explosive >= 2) {
        ctx.shadowColor = "#fff0c0";
        ctx.shadowBlur = 30 + Math.sin(t * 20) * 10;
        if (Math.random() < 0.5) {
          particles.push({
            x: b.x + rand(-6, 6), y: b.y + rand(-6, 6),
            vx: rand(-40, 40), vy: rand(-40, 40),
            life: 0.3, maxLife: 0.3, r: rand(1.5, 3.5), color: "#ffe9a8", spark: true
          });
        }
      }
      if (b.meteor) { ctx.shadowColor = "#ff9e3d"; ctx.shadowBlur = 20; }
      // helium shots trail tiny rising bubbles; a returning boomerang glints
      if (b.gravity < 0 && Math.random() < 0.25) {
        particles.push({ x: b.x + rand(-4, 4), y: b.y + 4, vx: rand(-8, 8), vy: rand(-60, -30),
          life: 0.35, maxLife: 0.35, r: rand(1.2, 2.4), color: "#cfe8ff" });
      }
      if (b.returning) { ctx.shadowColor = b.color; ctx.shadowBlur = 12; }
      if (b.explosive) { ctx.shadowColor = "#ff7a3d"; ctx.shadowBlur = 10 + Math.sin(t * 18) * 5; }
      // grown bullets read bigger the farther they've flown
      const growF = b.grow ? 1 + Math.min(0.7, Math.hypot(b.x - b.ox, b.y - b.oy) / 867) : 1;
      const r = b.r * growF * (look.scale || 1);
      // Comet Trail: the tail is sized off the CURRENT radius, so the trail
      // thickens and lengthens along with the head instead of staying a thin
      // thread behind a swelling comet
      if (b.grow && growF > 1.03) {
        const heat = (growF - 1) / 0.7;
        ctx.shadowColor = "#ff9e3d";
        ctx.shadowBlur = 8 + heat * 22;
        const n = 1 + Math.round(heat * 3);
        for (let i = 0; i < n; i += 1) {
          particles.push({
            x: b.x + rand(-r, r), y: b.y + rand(-r, r),
            vx: rand(-30, 30) - b.vx * 0.05, vy: rand(-30, 30) - b.vy * 0.05,
            life: 0.25 + heat * 0.45, maxLife: 0.7,
            r: (1.4 + heat * 3.2) * (0.6 + Math.random() * 0.8),
            color: Math.random() < 0.5 ? "#ffcf4d" : "#ff7a26", flame: true
          });
        }
      }
      if (look.art && b.explosive < 2) {
        // painted rounds are drawn pointing along their flight, plus whatever
        // turn the card's art needs to line its barrel up with that
        const d = r * 3.4;
        ctx.translate(b.x, b.y);
        // a boomerang tumbles end over end instead of pointing where it is
        // going — clockwise, which is +ve with the canvas y axis pointing down
        ctx.rotate(b.boomerang
          ? world.time * 13 + (look.rotation || 0)
          : Math.atan2(b.vy, b.vx) + (look.rotation || 0));
        ctx.drawImage(look.art, -d / 2, -d / 2, d, d);
        ctx.restore();
        continue;
      }
      if (b.explosive >= 2) {
        // white-hot centre, hot rim, so it reads as a star and not a pellet
        const cg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r * 1.9);
        cg.addColorStop(0, "rgba(255,255,255,1)");
        cg.addColorStop(0.45, "rgba(255,240,190,0.95)");
        cg.addColorStop(0.75, "rgba(255,170,70,0.55)");
        cg.addColorStop(1, "rgba(255,120,40,0)");
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.arc(b.x, b.y, r * 1.9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.arc(b.x, b.y, r * 0.72, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        continue;
      }
      const ang = Math.atan2(b.vy, b.vx);
      ctx.fillStyle = b.color;
      ctx.strokeStyle = "#15121c";
      ctx.lineWidth = 3;
      if (b.pierce > 0) {
        // drill slugs are elongated along their flight
        ctx.translate(b.x, b.y);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.roundRect(-r * 1.9, -r * 0.72, r * 3.8, r * 1.44, r * 0.7);
        ctx.fill();
        ctx.stroke();
        ctx.rotate(-ang);
        ctx.translate(-b.x, -b.y);
      } else {
        ctx.beginPath();
        ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      if (b.poison) {
        ctx.strokeStyle = "rgba(122,220,60,0.85)";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(b.x, b.y, r + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (b.chill) {
        ctx.strokeStyle = "rgba(160,225,255,0.9)";
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i += 1) {
          const a = t * 4 + (i / 3) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(b.x + Math.cos(a) * (r + 2), b.y + Math.sin(a) * (r + 2));
          ctx.lineTo(b.x + Math.cos(a) * (r + 7), b.y + Math.sin(a) * (r + 7));
          ctx.stroke();
        }
      }
      if (b.chain) {
        ctx.strokeStyle = "rgba(255,233,94,0.8)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        let px = b.x - Math.cos(ang) * (r + 12), py = b.y - Math.sin(ang) * (r + 12);
        ctx.moveTo(px, py);
        for (let i = 0; i < 3; i += 1) {
          px += Math.cos(ang) * 5 + rand(-4, 4);
          py += Math.sin(ang) * 5 + rand(-4, 4);
          ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      if (b.voidPull) {
        ctx.strokeStyle = "rgba(180,92,255,0.7)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(b.x, b.y, r + 5 + Math.sin(t * 10) * 2, t * 3, t * 3 + Math.PI * 1.4);
        ctx.stroke();
      }
      if (b.homing) {
        // seeker ring + swept fins so the curve reads as guidance
        ctx.strokeStyle = "rgba(255,255,255,0.45)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(b.x, b.y, r + 4, t * 6, t * 6 + Math.PI * 1.3);
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        for (const side of [-1, 1]) {
          const fa = ang + Math.PI + side * 0.55;
          ctx.beginPath();
          ctx.moveTo(b.x + Math.cos(ang + side * Math.PI / 2) * r * 0.7, b.y + Math.sin(ang + side * Math.PI / 2) * r * 0.7);
          ctx.lineTo(b.x + Math.cos(fa) * (r + 8), b.y + Math.sin(fa) * (r + 8));
          ctx.lineTo(b.x + Math.cos(ang + Math.PI) * r, b.y + Math.sin(ang + Math.PI) * r);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.restore();
    }
    // Glass Cannon's sheath goes on in a second pass so it lands over every
    // kind of round — painted, golden, white-hot — instead of being repeated
    // at each of the early exits above.
    for (const b of bullets) {
      if (!b.glass) continue;
      const look = bulletLookFor(b.owner);
      const growF = b.grow ? 1 + Math.min(0.7, Math.hypot(b.x - b.ox, b.y - b.oy) / 867) : 1;
      glassShell(ctx, b.x, b.y, b.r * growF * (look.scale || 1));
    }
  }

  function drawFields() {
    for (const f of fields) {
      if (f.type === "lightning-warn") continue;
      // The knockback pulse used to be pure physics with nothing on screen —
      // fighters simply flew apart. The painted pressure ring gives it a cause.
      if (f.type === "push") {
        // strong the instant it goes off, gone by the end — the ring is a thin
        // feathered thing and a linear fade leaves it invisible for most of its
        // life against a bright arena
        const k = 1 - clamp(f.life / (f.maxLife || 0.18), 0, 1);
        drawFxSheet("shockwave-ring", f.x, f.y, f.r * 2 * (0.25 + k * 1.05), 0, { alpha: 0.95 * (1 - k * k) });
        continue;
      }
      if (f.type === "blackhole") {
        const a = clamp(f.life / 3, 0, 1);
        const hole = fxImage("black-hole");
        if (hole) {
          ctx.save();
          ctx.globalAlpha = a;
          ctx.translate(f.x, f.y);
          ctx.rotate(world.time * 1.6);
          const d = f.r * 1.9;
          ctx.drawImage(hole, -d / 2, -d / 2, d, d);
          ctx.restore();
        }
        // debris spiralling inward, so the pull is visible even in empty air
        if (Math.random() < 0.6) {
          const ang = rand(0, Math.PI * 2), rr = f.r * rand(0.45, 0.95);
          particles.push({
            x: f.x + Math.cos(ang) * rr, y: f.y + Math.sin(ang) * rr,
            vx: -Math.cos(ang) * 260 - Math.sin(ang) * 200,
            vy: -Math.sin(ang) * 260 + Math.cos(ang) * 200,
            life: 0.45, maxLife: 0.45, r: rand(1.5, 3.5), color: "#d8a8ff", spark: true
          });
        }
        ctx.save();
        ctx.translate(f.x, f.y);
        // a wide, slow maw with fast arms inside it
        ctx.rotate(world.time * 1.6);
        ctx.strokeStyle = `rgba(190,120,255,${0.4 * a})`;
        for (let i = 0; i < 5; i += 1) {
          ctx.lineWidth = 7 - i;
          ctx.beginPath();
          ctx.arc(0, 0, f.r * (0.24 + i * 0.15), i * 1.3, i * 1.3 + Math.PI * 1.35);
          ctx.stroke();
        }
        ctx.rotate(world.time * 1.4);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, f.r * 0.6);
        g.addColorStop(0, "rgba(4,2,10,1)");
        g.addColorStop(0.5, `rgba(120,40,200,${0.5 * a})`);
        g.addColorStop(1, "rgba(120,40,200,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, f.r * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(180,92,255,${0.6 * a})`;
        ctx.lineWidth = 4;
        for (let i = 0; i < 3; i += 1) {
          ctx.beginPath();
          ctx.arc(0, 0, 24 + i * 26, i * 2, i * 2 + Math.PI * 1.3);
          ctx.stroke();
        }
        ctx.restore();
      } else if (f.type === "guardian") {
        const k = 1 - Math.max(0, f.life) / 1.6;      // 0 at the save, 1 at the end
        const o = f.owner;
        const px = o && o.alive ? o.x : f.x;
        const py = o && o.alive ? o.y : f.y;
        ctx.save();
        // the glow around the fighter who was spared
        const glow = ctx.createRadialGradient(px, py, 0, px, py, f.r * 2.6);
        glow.addColorStop(0, `rgba(255,240,180,${(1 - k) * 0.55})`);
        glow.addColorStop(0.6, `rgba(255,215,90,${(1 - k) * 0.25})`);
        glow.addColorStop(1, "rgba(255,200,60,0)");
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(px, py, f.r * 2.6, 0, Math.PI * 2); ctx.fill();
        // the halo, tilted, hanging over their head
        ctx.strokeStyle = `rgba(255,226,120,${1 - k})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(px, py - f.r - 16 - k * 6, f.r * 0.72, f.r * 0.24, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255,${(1 - k) * 0.8})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(px, py - f.r - 16 - k * 6, f.r * 0.72, f.r * 0.24, 0, 0, Math.PI * 2);
        ctx.stroke();
        // the angel: rises, spreads its wings and thins away to nothing
        const ay = py - 20 - k * 130;
        const av = (1 - k) * 0.85;
        const scale = 0.7 + k * 0.5;
        ctx.globalAlpha = av;
        ctx.translate(px, ay);
        ctx.scale(scale, scale);
        const ang = window.ROUNDERS.fxImage && window.ROUNDERS.fxImage("angel");
        if (ang) {
          ctx.drawImage(ang, -26, -30, 52, 60);
        } else {
          // procedural stand-in until assets/images/fx/angel.png lands
          ctx.fillStyle = "rgba(255,248,214,0.95)";
          ctx.beginPath(); ctx.arc(0, -12, 7, 0, Math.PI * 2); ctx.fill();       // head
          ctx.beginPath(); ctx.ellipse(0, 6, 7, 14, 0, 0, Math.PI * 2); ctx.fill();  // robe
          ctx.strokeStyle = "rgba(255,248,214,0.95)";
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(-14, 2, 12, -1.2, 0.9); ctx.stroke();          // wings
          ctx.beginPath(); ctx.arc(14, 2, 12, Math.PI - 0.9, Math.PI + 1.2); ctx.stroke();
          ctx.strokeStyle = "rgba(255,226,120,0.95)";
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(0, -22, 8, 3, 0, 0, Math.PI * 2); ctx.stroke();  // its own halo
        }
        ctx.restore();
      } else if (f.type === "boom") {
        // A detonation you cannot miss: white core, a bloom of hot colour and
        // two expanding shockwave spheres, all sized by the charge.
        const k = 1 - Math.max(0, f.life) / 0.5;         // 0 at the flash, 1 at the end
        const R = f.r * (0.25 + k * 0.95);
        // The painted fireball plays its own six frames at a fixed size — the
        // art does the blooming, so it is not scaled by k the way the drawn
        // one is. Supernova-scale charges get the bigger sheet.
        if (drawFxSheet(f.power >= 1.5 ? "explosion-big" : "explosion", f.x, f.y, f.r * 2.5, k,
          { alpha: 1 - clamp((k - 0.8) / 0.2, 0, 1) })) continue;
        ctx.save();
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, R);
        g.addColorStop(0, `rgba(255,255,255,${(1 - k) * 0.95})`);
        g.addColorStop(0.35, `rgba(255,226,150,${(1 - k) * 0.7})`);
        g.addColorStop(0.7, `rgba(255,140,50,${(1 - k) * 0.4})`);
        g.addColorStop(1, "rgba(255,90,30,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(f.x, f.y, R, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(255,255,255,${(1 - k) * 0.9})`;
        ctx.lineWidth = 5 * (1 - k) + 1;
        ctx.beginPath(); ctx.arc(f.x, f.y, R, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = `rgba(255,190,90,${(1 - k) * 0.55})`;
        ctx.lineWidth = 3 * (1 - k) + 1;
        ctx.beginPath(); ctx.arc(f.x, f.y, R * 0.62, 0, Math.PI * 2); ctx.stroke();
        // spikes of light for the really big bangs
        if (f.power >= 1.5) {
          ctx.strokeStyle = `rgba(255,255,255,${(1 - k) * 0.5})`;
          ctx.lineWidth = 2;
          for (let i = 0; i < 8; i += 1) {
            const a = (i / 8) * Math.PI * 2 + k;
            ctx.beginPath();
            ctx.moveTo(f.x + Math.cos(a) * R * 0.5, f.y + Math.sin(a) * R * 0.5);
            ctx.lineTo(f.x + Math.cos(a) * R * 1.25, f.y + Math.sin(a) * R * 1.25);
            ctx.stroke();
          }
        }
        ctx.restore();
      } else if (f.type === "heal") {
        // Lemonade Stand: a faded lemon-yellow pool with a tall glass sitting
        // in the middle of it, so the zone reads as the card and not as a
        // generic green heal circle
        const a = clamp(f.life / 3, 0.15, 1);   // fades out over its last 3s
        ctx.save();
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
        g.addColorStop(0, `rgba(255,232,120,${0.42 * a})`);
        g.addColorStop(0.75, `rgba(255,220,80,${0.22 * a})`);
        g.addColorStop(1, "rgba(255,206,48,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(255,228,92,${0.55 * a})`;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([10, 8]);
        ctx.lineDashOffset = -world.time * 40;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        // the glass itself, faded into the pool
        ctx.globalAlpha = 0.7 * a;
        window.ROUNDERS.drawLemonade(ctx, f.x, f.y, f.r * 0.62, world.time);
        ctx.globalAlpha = 1;
        // bubbles rising through the zone
        for (let i = 0; i < 5; i += 1) {
          const t = (world.time * 0.55 + i / 5) % 1;
          const px = f.x + Math.sin(i * 7.3 + world.time * 0.8) * f.r * 0.66;
          const py = f.y + f.r * 0.5 - t * f.r * 1.1;
          ctx.globalAlpha = (1 - t) * 0.7 * a;
          ctx.fillStyle = "#fff3b0";
          ctx.beginPath();
          ctx.arc(px, py, 2 + (1 - t) * 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else if (f.type === "stink") {
        const a = clamp(f.life / 2.5, 0.1, 1);
        ctx.save();
        const cloud = fxImage("poison-cloud");
        if (cloud) {
          // The sheet is a hard-edged disc. Drawn through a radial mask it
          // dissolves at the rim instead, so the cloud has no boundary you can
          // point at — which is what a gas should look like.
          const d = f.r * 2.4;
          const buf = softMask(d);
          const bc = buf.getContext("2d");
          bc.clearRect(0, 0, d, d);
          bc.globalCompositeOperation = "source-over";
          bc.drawImage(cloud, 0, 0, d, d);
          bc.globalCompositeOperation = "destination-in";
          const mg = bc.createRadialGradient(d / 2, d / 2, d * 0.18, d / 2, d / 2, d * 0.5);
          mg.addColorStop(0, "rgba(0,0,0,1)");
          mg.addColorStop(0.62, "rgba(0,0,0,0.85)");
          mg.addColorStop(1, "rgba(0,0,0,0)");
          bc.fillStyle = mg;
          bc.fillRect(0, 0, d, d);
          bc.globalCompositeOperation = "source-over";
          ctx.globalAlpha = a * 0.92;
          ctx.drawImage(buf, f.x - d / 2, f.y - d / 2);
          ctx.restore();
          continue;
        }
        for (let i = 0; i < 5; i += 1) {
          const wob = Math.sin(world.time * 1.8 + i * 2.4);
          const px = f.x + Math.cos(i * 1.26 + world.time * 0.4) * f.r * 0.45;
          const py = f.y + Math.sin(i * 2.1) * f.r * 0.3 - wob * 8;
          const rr = f.r * (0.34 + 0.1 * wob);
          const g = ctx.createRadialGradient(px, py, 0, px, py, rr);
          g.addColorStop(0, `rgba(110,190,60,${0.22 * a})`);
          g.addColorStop(1, "rgba(80,150,40,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(px, py, rr, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else if (f.type === "saw") {
        // Drawn at the FULL radius it hurts in, spinning on its own axis and
        // sitting behind the fighter (drawFields runs before drawPlayersAll).
        window.ROUNDERS.drawSawblade(ctx, f.x, f.y, f.r, world.time * 9, fxImage("sawblade"));
      } else {
        const alpha = clamp(f.life / 0.18, 0, 1);
        ctx.strokeStyle = `rgba(255,255,255,${0.3 * alpha})`;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r * (1 - alpha * 0.45), 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  // Body Doubles: drawn exactly like the player they copy — solid, not a
  // ghost. What gives them away is that they are perfectly STILL: their idle
  // clock is frozen at the moment they were made, so they neither breathe nor
  // bob while the real fighter does.
  function drawDecoys() {
    for (const dcy of decoys) {
      ctx.save();
      ctx.translate(dcy.x, dcy.y + Math.sin(dcy.wobble * 2.2) * 2);
      drawCharacter(ctx, dcy.character, 27, {
        t: dcy.wobble,
        aimX: dcy.aimX ?? dcy.facing ?? 1, aimY: dcy.aimY ?? 0, facing: dcy.facing ?? 1
      });
      // hp pips
      const frac = clamp(dcy.hp / dcy.maxHp, 0, 1);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = "rgba(10,8,18,0.7)";
      ctx.fillRect(-16, -40, 32, 4);
      ctx.fillStyle = dcy.color;
      ctx.fillRect(-15, -39, 30 * frac, 2);
      ctx.restore();
    }
  }

  // jitter is scaled to the span so a hand-sized crackle does not wander as
  // far off its line as a bolt thrown at a wall
  function boltVisual(x1, y1, x2, y2, color, life, jitter) {
    const points = [];
    const segs = 8;
    const j = jitter ?? Math.min(26, Math.hypot(x2 - x1, y2 - y1) * 0.18);
    for (let i = 0; i <= segs; i += 1) {
      const t = i / segs;
      points.push({
        x: x1 + (x2 - x1) * t + (i > 0 && i < segs ? rand(-j, j) : 0),
        y: y1 + (y2 - y1) * t + (i > 0 && i < segs ? rand(-j, j) : 0)
      });
    }
    bolts.push({ points, life, maxLife: life, color });
  }

  // ------------------------------------------------------------- lifesteal
  // Health torn out of `from` and sent home to `to`. The heal is deliberately
  // NOT applied here: each mote carries its share and pays out when it lands,
  // so the health bar fills as the energy arrives rather than the instant the
  // bullet connects.
  function siphonHealth(from, to, amount, count = 3) {
    if (!to || !to.alive || amount <= 0) return;
    const n = Math.max(1, Math.min(9, Math.round(count)));
    for (let i = 0; i < n; i += 1) {
      const a = rand(0, Math.PI * 2);
      siphons.push({
        x: from.x + Math.cos(a) * rand(4, from.stats.radius * 0.8),
        y: from.y + Math.sin(a) * rand(4, from.stats.radius * 0.8),
        // it drifts out of the wound before turning for home, which is what
        // makes it read as drawn OUT rather than fired across
        vx: Math.cos(a) * rand(90, 190), vy: Math.sin(a) * rand(90, 190) - 60,
        to, amount: amount / n, t: 0, delay: i * 0.05
      });
    }
    puff(from.x, from.y, "#74f08b", 6, 180);
  }

  // Waste Not: the round that just landed comes back out of the wound and
  // flies home to the magazine. Pure show — the ammo is already back — but it
  // is what makes the refund legible.
  function returnAmmo(from, to) {
    if (!to || !to.alive) return;
    const x = from.x + rand(-4, 4), y = from.y + rand(-4, 4);
    const dx = to.x - x, dy = to.y - y;
    const d = Math.hypot(dx, dy) || 1;
    // Straight home and FAST — the whole trip inside a tenth of a second — so
    // it reads as a round jetting back to the magazine rather than something
    // flying at the shooter that they might have to dodge.
    const speed = Math.max(2800, d / 0.08);
    siphons.push({
      kind: "ammo", x, y,
      vx: (dx / d) * speed, vy: (dy / d) * speed,
      to, amount: 0, t: 0, delay: 0
    });
  }

  // Firecracker Heels: the crackers thrown out by an air jump. They carry no
  // damage of their own — the blast under the heels already landed — they are
  // there so the card reads as fireworks rather than a bare shove.
  function updateCrackers(dt) {
    if (!crackers.length) return;
    const plats = activePlatforms(currentLevel(), world.time);
    for (const c of crackers) {
      c.fuse -= dt;
      c.vy += 1900 * dt;
      c.vx *= 1 - Math.min(1, dt * 1.2);
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.rot += c.spin * dt;
      let hit = c.fuse <= 0;
      if (!hit) {
        for (const pl of plats) {
          if (circleRect({ x: c.x, y: c.y, r: 3 }, pl)) { hit = true; break; }
        }
      }
      if (Math.random() < dt * 30) {
        puffOne(c.x + rand(-2, 2), c.y + rand(-2, 2), Math.random() < 0.5 ? "#ffd76a" : "#ff9e3d");
      }
      if (hit) {
        c.dead = true;
        burst(c.x, c.y, "#ffcf4d", 8, 210);
        flames(c.x, c.y, 3, 7, 0.5);
        sfx("pop");
      }
    }
    crackers = crackers.filter(c => !c.dead);
  }

  function drawCrackers() {
    for (const c of crackers) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = "#d8322f";
      ctx.strokeStyle = "#2a1410";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(-2.5, -6, 5, 12, 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "#e8e2d4";
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(2.5, -11); ctx.stroke();
      // the lit tip, flickering
      ctx.fillStyle = Math.random() < 0.5 ? "#fff3b0" : "#ffb03a";
      ctx.beginPath(); ctx.arc(2.5, -11, 1.9, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  function updateSiphons(dt) {
    for (const s of siphons) {
      if (s.delay > 0) { s.delay -= dt; continue; }
      s.t += dt;
      if (!s.to || !s.to.alive) { s.dead = true; continue; }
      if (s.kind === "ammo") {
        // dead straight, no correction — it was aimed when it left
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if (Math.hypot(s.to.x - s.x, s.to.y - s.y) < s.to.stats.radius || s.t > 0.35) {
          puff(s.to.x, s.to.y, "#ffe169", 5, 140);
          sfx("pop");
          s.dead = true;
        }
        continue;
      }
      // the first beat is a loose drift; after that it homes, and hardens its
      // turn the longer it has been travelling so it always gets there
      const dx = s.to.x - s.x, dy = s.to.y - s.y;
      const d = Math.hypot(dx, dy) || 1;
      const pull = Math.min(1, s.t * 4) * 5200;
      s.vx += (dx / d) * pull * dt;
      s.vy += (dy / d) * pull * dt;
      const sp = Math.hypot(s.vx, s.vy);
      const cap = 520 + s.t * 2400;
      if (sp > cap) { s.vx = (s.vx / sp) * cap; s.vy = (s.vy / sp) * cap; }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (Math.random() < dt * 40) {
        puffOne(s.x + rand(-3, 3), s.y + rand(-3, 3), "rgba(116,240,139,0.7)");
      }
      // arrived: this is where the health is actually handed over
      if (d < s.to.stats.radius * 0.7 || s.t > 2.5) {
        healPlayer(s.to, s.amount);
        floatText(s.to.x, s.to.y - s.to.stats.radius - 12, `+${Math.max(1, Math.round(s.amount))}`, "#74f08b");
        burst(s.to.x, s.to.y, "#74f08b", 5, 130);
        s.dead = true;
      }
    }
    siphons = siphons.filter(s => !s.dead);
  }

  function drawSiphons() {
    ctx.save();
    for (const s of siphons) {
      if (s.delay > 0) continue;
      if (s.kind === "ammo") {
        // the ghost of the round, jetting back down its own line with a long
        // streak behind it — at this speed the streak is most of what you see
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(Math.atan2(s.vy, s.vx));
        ctx.globalAlpha = 0.5;
        const tail = ctx.createLinearGradient(-46, 0, 0, 0);
        tail.addColorStop(0, "rgba(255,225,105,0)");
        tail.addColorStop(1, "rgba(255,238,170,0.75)");
        ctx.fillStyle = tail;
        ctx.beginPath(); ctx.moveTo(-46, -1.4); ctx.lineTo(0, -4); ctx.lineTo(0, 4); ctx.lineTo(-46, 1.4);
        ctx.closePath(); ctx.fill();
        ctx.shadowColor = "#ffe169"; ctx.shadowBlur = 10;
        ctx.fillStyle = "rgba(255,240,180,0.75)";
        ctx.beginPath(); ctx.ellipse(0, 0, 7, 3.6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        continue;
      }
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 9);
      g.addColorStop(0, "rgba(198,255,208,0.95)");
      g.addColorStop(0.45, "rgba(116,240,139,0.75)");
      g.addColorStop(1, "rgba(116,240,139,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(s.x, s.y, 9, 0, Math.PI * 2); ctx.fill();
      // a short wisp behind it, along its own heading
      const sp = Math.hypot(s.vx, s.vy) || 1;
      ctx.strokeStyle = "rgba(116,240,139,0.5)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - (s.vx / sp) * 14, s.y - (s.vy / sp) * 14);
      ctx.stroke();
    }
    ctx.restore();
  }

  function updateBolts(dt) {
    for (const bo of bolts) {
      if (!bo.pending) continue;
      bo.delay -= dt;
      if (bo.delay > 0) { bo.life = Math.max(bo.life, 0.05); continue; }
      bo.pending = false;
      // the bolt comes back off the wall and catches them a second time
      boltVisual(bo.from.x, bo.from.y, bo.to.x, bo.to.y, bo.color, 0.24);
      if (bo.victim && bo.victim.alive) hurtRaw(bo.victim, bo.damage, bo.owner);
      bo.life = 0;
    }
    for (const b of bolts) b.life -= dt;
    bolts = bolts.filter(b => b.life > 0);
    for (const f of floats) { f.life -= dt; f.y -= 30 * dt; }
    floats = floats.filter(f => f.life > 0);
  }

  // The strike itself is instantaneous, but it CLEARS in the direction it
  // travelled: the tail lets go first and the vanishing edge chases the head
  // down the path, so you can read which way a bolt went after the flash.
  // The painted bolt is one horizontal jagged arc meant to stretch between two
  // points, so it replaces the whole polyline rather than a segment of it — the
  // art supplies the jaggedness the jitter used to, and the wipe survives as a
  // clip on the tail. The colour check picks WHICH bolts get the painted look:
  // storm lightning does, and a bolt deliberately tinted something else (Thorn
  // Jacket's pink retaliation) keeps the drawn version, since recolouring a PNG
  // per frame is not worth it here.
  const BOLT_ART_COLOR = "#ffe95e";
  function drawBoltArt(b, a, edge) {
    if (b.color !== BOLT_ART_COLOR || !fxImage("lightning-arc")) return false;
    const p0 = b.points[0], p1 = b.points[b.points.length - 1];
    const dx = p1.x - p0.x, dy = p1.y - p0.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) return false;
    const img = fxImage("lightning-arc");
    const h = len * (img.height / img.width) * 1.6;
    const from = clamp(edge, 0, 1);          // the wiped-away tail
    ctx.save();
    ctx.globalAlpha = 0.35 + a * 0.65;
    ctx.translate(p0.x, p0.y);
    ctx.rotate(Math.atan2(dy, dx));
    ctx.beginPath();
    ctx.rect(len * from, -h, len * (1 - from), h * 2);
    ctx.clip();
    ctx.drawImage(img, 0, -h / 2, len, h);
    ctx.restore();
    return true;
  }

  function drawBoltsAll() {
    for (const b of bolts) {
      if (!b.points.length) continue;
      const a = clamp(b.life / b.maxLife, 0, 1);
      const edge = (1 - a) * 1.35 - 0.35;   // the path is gone up to here
      if (drawBoltArt(b, a, edge)) continue;
      const n = b.points.length - 1;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      for (let i = 0; i < n; i += 1) {
        const u = i / n;
        const lit = clamp((u - edge) / 0.35, 0, 1);
        if (lit <= 0.01) continue;
        // the head stays bright while the tail wipes away behind it
        ctx.strokeStyle = hexAlpha(b.color, lit * (0.35 + a * 0.65));
        ctx.lineWidth = (4 * a + 1) * (0.5 + lit * 0.5);
        ctx.beginPath();
        ctx.moveTo(b.points[i].x, b.points[i].y);
        ctx.lineTo(b.points[i + 1].x, b.points[i + 1].y);
        ctx.stroke();
      }
    }
    ctx.lineCap = "butt";
  }

  function drawFloats() {
    ctx.save();
    ctx.font = "800 17px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(10,10,16,0.75)";
    for (const f of floats) {
      ctx.globalAlpha = clamp(f.life / (f.maxLife * 0.5), 0, 1);
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();
  }

  // While the world unwinds, say so: a cold wash over the arena, a rewind
  // glyph, and how much of the tape is left.
  function drawRewindOverlay() {
    if (!rewind.active) return;
    ctx.save();
    ctx.fillStyle = "rgba(80,170,255,0.10)";
    ctx.fillRect(0, 0, world.width, world.height);
    // scanlines, for the tape-being-scrubbed feel
    ctx.strokeStyle = "rgba(143,216,255,0.10)";
    ctx.lineWidth = 2;
    for (let y = (world.time * 220) % 14; y < world.height; y += 14) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(world.width, y); ctx.stroke();
    }
    const left = Math.max(0, REWIND_MAX - (rewind.spent || 0));
    ctx.fillStyle = "rgba(143,216,255,0.95)";
    ctx.font = "900 34px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("◀◀ REWIND", world.width / 2, 74);
    ctx.font = "700 20px system-ui, sans-serif";
    ctx.fillText(`${left.toFixed(1)}s of tape left`, world.width / 2, 104);
    ctx.restore();
  }

  function drawCountdown() {
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(0, 0, world.width, world.height);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 78px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(str(world.roundFreeze > 0.35 ? "round.ready" : "round.fight"), world.width / 2, 180);
  }

  function drawWinner() {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, world.width, world.height);
    if (!world.winner) return;
    ctx.save();
    ctx.translate(world.width / 2, 330);
    const bob = Math.sin(world.time * 3) * 8;
    ctx.save();
    ctx.translate(0, -90 + bob);
    drawCharacter(ctx, world.winner.character, 60, { t: world.time, aimX: 1 });
    ctx.restore();
    ctx.fillStyle = world.winner.color;
    ctx.font = "900 84px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(str("round.championName", { name: world.winner.name.toUpperCase() }), 0, 120);
    ctx.fillStyle = "#f5f2ff";
    ctx.font = "700 28px system-ui, sans-serif";
    ctx.fillText(str("round.championSub"), 0, 170);
    ctx.restore();
  }

  function drawMenuBackground() {
    const t = world.time;
    // A fixed indigo→violet→magenta ramp: hues stay in one harmonious family
    // instead of cycling through the whole wheel (which turned everything olive).
    const g = ctx.createLinearGradient(0, 0, world.width * 0.35, world.height);
    g.addColorStop(0, "#140f2e");
    g.addColorStop(0.45, "#2a1250");
    g.addColorStop(0.78, "#4a1554");
    g.addColorStop(1, "#5c1440");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, world.width, world.height);

    // slow coloured spotlights, added rather than blended so they stay vivid
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const lights = [
      { c: "255,61,132", x: 0.24, y: 0.32, r: 0.62, s: 0.11, a: 0.3 },
      { c: "69,208,255", x: 0.78, y: 0.28, r: 0.55, s: 0.083, a: 0.24 },
      { c: "255,216,77", x: 0.55, y: 0.86, r: 0.5, s: 0.061, a: 0.16 }
    ];
    for (const l of lights) {
      const cx = (l.x + Math.sin(t * l.s) * 0.09) * world.width;
      const cy = (l.y + Math.cos(t * l.s * 1.3) * 0.07) * world.height;
      const rad = l.r * world.height;
      const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      rg.addColorStop(0, `rgba(${l.c},${l.a})`);
      rg.addColorStop(1, `rgba(${l.c},0)`);
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, world.width, world.height);
    }
    ctx.restore();

    // drifting round fighters
    for (let i = 0; i < 16; i += 1) {
      const ch = CHARACTERS[i % CHARACTERS.length];
      const x = (i * 233 + t * 34) % (world.width + 260) - 130;
      const y = 130 + ((i * 131) % 640) + Math.sin(t + i) * 26;
      ctx.save();
      ctx.globalAlpha = 0.13;
      ctx.translate(x, y);
      drawCharacter(ctx, ch, 30 + (i % 3) * 10, { t: t + i, aimX: Math.sin(t * 0.4 + i) > 0 ? 1 : -1, useImage: false });
      ctx.restore();
    }

    // corner falloff keeps the panels readable without dulling the centre
    const vg = ctx.createRadialGradient(
      world.width / 2, world.height / 2, world.height * 0.32,
      world.width / 2, world.height / 2, world.height * 0.98
    );
    vg.addColorStop(0, "rgba(8,4,18,0)");
    vg.addColorStop(1, "rgba(8,4,18,0.62)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, world.width, world.height);
  }

  // -------- weather
  function spawnWeatherParticle(type) {
    const W = world.width;
    switch (type) {
      case "rain": return { x: rand(0, W), y: -10, vx: -140, vy: 900, r: 1.6, kind: "line", color: "rgba(160,200,255,0.5)", life: 1.4 };
      case "snow": return { x: rand(0, W), y: -10, vx: rand(-30, 30), vy: rand(60, 130), r: rand(1.5, 3.5), kind: "dot", color: "rgba(255,255,255,0.8)", sway: rand(1, 2.4), life: 12 };
      case "embers": return { x: rand(0, W), y: world.height + 10, vx: rand(-30, 30), vy: rand(-160, -70), r: rand(1.5, 3.2), kind: "dot", color: "rgba(255,158,61,0.8)", sway: rand(1, 3), life: 8 };
      case "leaves": return { x: rand(0, W), y: -10, vx: rand(-60, -20), vy: rand(60, 120), r: rand(2.5, 4.5), kind: "leaf", color: "rgba(155,226,79,0.7)", sway: rand(1.5, 3), life: 12 };
      case "stars": return { x: rand(0, W), y: rand(0, world.height * 0.8), vx: 0, vy: 0, r: rand(1, 2.2), kind: "twinkle", color: "rgba(255,255,255,0.8)", life: rand(1, 3) };
      case "petals": return { x: rand(0, W), y: -10, vx: rand(-50, -15), vy: rand(50, 110), r: rand(2.5, 4), kind: "leaf", color: "rgba(255,183,213,0.8)", sway: rand(1.5, 3), life: 12 };
      case "confetti": return { x: rand(0, W), y: -10, vx: rand(-40, 40), vy: rand(90, 170), r: rand(2, 3.6), kind: "rect", color: `hsl(${Math.floor(rand(0, 360))}, 90%, 65%)`, sway: rand(2, 4), life: 9 };
      case "sparks": return { x: rand(0, W), y: rand(300, world.height - 100), vx: rand(-90, 90), vy: rand(-220, -60), r: rand(1, 2.2), kind: "dot", color: "rgba(255,179,92,0.9)", life: 0.8 };
      case "wisps": return { x: rand(0, W), y: rand(200, world.height - 60), vx: rand(-25, 25), vy: rand(-40, -10), r: rand(2, 4.5), kind: "glow", color: "rgba(141,255,110,0.5)", sway: rand(1, 2), life: 6 };
      case "dust": return { x: -10, y: rand(200, world.height - 60), vx: rand(120, 260), vy: rand(-20, 20), r: rand(1, 2.6), kind: "dot", color: "rgba(255,210,150,0.4)", life: 7 };
      case "spores": return { x: rand(0, W), y: rand(100, world.height - 60), vx: rand(-15, 15), vy: rand(-30, -8), r: rand(1.5, 3), kind: "glow", color: "rgba(255,122,200,0.5)", sway: rand(0.5, 1.5), life: 7 };
      case "sparkle": return { x: rand(0, W), y: rand(0, world.height), vx: 0, vy: 0, r: rand(1.2, 2.6), kind: "twinkle", color: "rgba(127,252,255,0.8)", life: rand(0.5, 1.6) };
      case "lanterns": return { x: rand(0, W), y: world.height + 14, vx: rand(-12, 12), vy: rand(-55, -30), r: rand(4, 7), kind: "lantern", color: "rgba(255,207,94,0.8)", sway: rand(0.5, 1.5), life: 22 };
      case "feathers": return { x: rand(0, W), y: -10, vx: rand(-30, 0), vy: rand(35, 70), r: rand(2.5, 4), kind: "leaf", color: "rgba(255,255,255,0.75)", sway: rand(2, 4), life: 16 };
      default: return null;
    }
  }

  const weatherRates = {
    rain: 26, snow: 9, embers: 7, leaves: 4, stars: 2, petals: 4, confetti: 5,
    sparks: 5, wisps: 2.5, dust: 6, spores: 3, sparkle: 6, lanterns: 0.8, feathers: 2.5
  };

  let weatherCarry = 0;
  function updateWeather(dt) {
    const type = currentLevel().weather;
    if (!type) return;
    weatherCarry += (weatherRates[type] || 4) * dt;
    while (weatherCarry >= 1) {
      weatherCarry -= 1;
      const w = spawnWeatherParticle(type);
      if (w) world.weather.push(w);
    }
    for (const w of world.weather) {
      w.life -= dt;
      w.x += (w.vx + (w.sway ? Math.sin(world.time * w.sway + w.y * 0.01) * 40 : 0)) * dt;
      w.y += w.vy * dt;
      if (w.y > world.height + 20) w.life = -1;
    }
    world.weather = world.weather.filter(w => w.life > 0);
  }

  function updateWeatherMenu(dt) { /* menu uses its own drifting characters */ }

  function drawWeatherParticles() {
    for (const w of world.weather) {
      ctx.globalAlpha = clamp(w.life, 0, 1);
      ctx.fillStyle = w.color;
      if (w.kind === "line") {
        ctx.strokeStyle = w.color;
        ctx.lineWidth = w.r;
        ctx.beginPath();
        ctx.moveTo(w.x, w.y);
        ctx.lineTo(w.x - w.vx * 0.02, w.y - w.vy * 0.02);
        ctx.stroke();
      } else if (w.kind === "rect") {
        ctx.save();
        ctx.translate(w.x, w.y);
        ctx.rotate(world.time * w.sway);
        ctx.fillRect(-w.r, -w.r * 0.6, w.r * 2, w.r * 1.2);
        ctx.restore();
      } else if (w.kind === "leaf") {
        ctx.save();
        ctx.translate(w.x, w.y);
        ctx.rotate(Math.sin(world.time * w.sway) * 0.8);
        ctx.beginPath();
        ctx.ellipse(0, 0, w.r * 1.4, w.r * 0.7, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (w.kind === "twinkle") {
        ctx.globalAlpha = clamp(w.life, 0, 1) * Math.abs(Math.sin(world.time * 4 + w.x));
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
        ctx.fill();
      } else if (w.kind === "glow") {
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.r * 2.2, 0, Math.PI * 2);
        ctx.globalAlpha *= 0.3;
        ctx.fill();
        ctx.globalAlpha = clamp(w.life, 0, 1);
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
        ctx.fill();
      } else if (w.kind === "lantern") {
        ctx.beginPath();
        ctx.ellipse(w.x, w.y, w.r * 0.8, w.r, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha *= 0.3;
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.r * 2.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  // -------- particles
  function updateParticles(dt) {
    updateFxShots(dt);
    for (const p of particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      // sparks and debris fall; fire and smoke are buoyant and rise instead
      if (p.smoke) { p.vy -= 60 * dt; p.vx *= Math.pow(0.9, dt * 60); }
      else if (p.flame) p.vy -= 130 * dt;
      else if (p.spark) { p.vx *= Math.pow(0.94, dt * 60); p.vy = p.vy * Math.pow(0.94, dt * 60) + 40 * dt; }
      else if (p.chunk) { p.vy += 900 * dt; p.rot += p.spin * dt; }
      else if (p.bubble) {
        p.vy -= 34 * dt;                       // buoyant
        p.wob += dt * 7;
        p.x += Math.sin(p.wob) * 14 * dt;
        p.vx *= Math.pow(0.94, dt * 60);
      }
      else p.vy += 360 * dt;
    }
    particles = particles.filter(p => p.life > 0);
  }

  function drawParticles() {
    for (const p of particles) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      if (p.smoke) {
        // smoke thins and swells as it climbs
        ctx.globalAlpha = a * 0.55;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (1.6 - a * 0.6), 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      ctx.globalAlpha = a;
      if (p.flame) {
        // a flame is a hot core in a softer glow, shrinking as it burns out
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * a * 1.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = a * 0.4;
        ctx.fillStyle = "#ffe9a8";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * a * 0.5, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      if (p.bubble) {
        const grow = 1 + (1 - a) * 0.9;        // swells on the way up
        ctx.globalAlpha = a * 0.75;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * grow, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = a * 0.22;
        ctx.fill();
        ctx.globalAlpha = a * 0.8;
        ctx.fillStyle = "rgba(240,255,220,0.9)";
        ctx.beginPath();
        ctx.arc(p.x - p.r * grow * 0.3, p.y - p.r * grow * 0.35, Math.max(0.6, p.r * grow * 0.22), 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      if (p.chunk) {
        // masonry: an angular shard of the wall, tumbling as it falls
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.r, -p.r * 0.8, p.r * 2, p.r * 1.6);
        ctx.restore();
        continue;
      }
      if (p.spark) {
        ctx.save();
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (0.4 + a * 0.8), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        continue;
      }
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (0.6 + a), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // One scratch canvas for feathering a sprite's edge, resized as needed —
  // allocating a canvas per frame per cloud would be silly.
  let maskBuf = null;
  function softMask(size) {
    const px = Math.max(8, Math.ceil(size));
    if (!maskBuf) maskBuf = document.createElement("canvas");
    if (maskBuf.width !== px || maskBuf.height !== px) { maskBuf.width = px; maskBuf.height = px; }
    return maskBuf;
  }

  // Stink Bomb boils. A bubble swells as it rises, wobbles on the way up and
  // pops near the top of its climb, which is what makes the cloud read as
  // something fermenting rather than a flat green disc.
  function stinkBubble(x, y, scale = 1) {
    particles.push({
      x, y,
      vx: rand(-16, 16), vy: rand(-52, -22) * scale,
      life: rand(0.7, 1.3), maxLife: 1.3,
      r: rand(1.6, 3.6) * scale,
      color: Math.random() < 0.35 ? "#c8ff8a" : "#7fd43c",
      bubble: true, wob: Math.random() * 6.3
    });
  }

  // A wall coming apart: chunks of the terrain's own colour thrown out of the
  // impact and tumbling to the ground, plus a haze of dust. This is what sells
  // a Breakthrough bite — the gap it leaves behind is simply empty space.
  function rubble(x, y, size = 64, dir = 0) {
    const pal = currentLevel().palette;
    const cols = [pal.plat, pal.platEdge || pal.plat, pal.accent || pal.plat];
    for (let i = 0; i < 22; i += 1) {
      const away = dir + rand(-1.1, 1.1);
      const sp = rand(90, 340);
      particles.push({
        x: x + rand(-size / 3, size / 3), y: y + rand(-size / 3, size / 3),
        vx: Math.cos(away) * sp, vy: Math.sin(away) * sp - rand(40, 190),
        life: rand(0.5, 1.1), maxLife: 1.1, r: rand(2, 5.5),
        rot: Math.random() * Math.PI, spin: rand(-9, 9),
        color: cols[i % cols.length], chunk: true
      });
    }
    // dust hanging in the gap
    for (let i = 0; i < 10; i += 1) {
      particles.push({
        x: x + rand(-size / 2, size / 2), y: y + rand(-size / 2, size / 2),
        vx: rand(-40, 40), vy: rand(-30, 10),
        life: rand(0.5, 1.0), maxLife: 1.0, r: rand(4, 9),
        color: pal.plat, smoke: true
      });
    }
  }

  // Fire and smoke, used by everything that should look genuinely alight:
  // burning fighters, explosions, meteors, lava. Flames rise and shrink, smoke
  // rises and swells (see updateParticles/drawParticles).
  function flames(x, y, count = 6, spread = 14, power = 1) {
    for (let i = 0; i < count; i += 1) {
      particles.push({
        x: x + rand(-spread, spread), y: y + rand(-spread, spread),
        vx: rand(-40, 40) * power, vy: rand(-170, -70) * power,
        life: rand(0.3, 0.5), maxLife: 0.5, r: rand(2.5, 6) * power,
        color: Math.random() < 0.55 ? "#ffcf4d" : "#ff7a26", flame: true
      });
    }
  }

  function smoke(x, y, count = 3, spread = 12, power = 1) {
    for (let i = 0; i < count; i += 1) {
      particles.push({
        x: x + rand(-spread, spread), y: y + rand(-spread, spread),
        vx: rand(-22, 22), vy: rand(-70, -30),
        life: rand(0.9, 1.4), maxLife: 1.4, r: rand(5, 10) * power,
        color: "rgba(70,66,72,0.55)", smoke: true
      });
    }
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const s = rand(speed * 0.18, speed);
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.25, 0.72), maxLife: 0.72, r: rand(2, 7), color });
    }
  }
  function puff(x, y, color, count) { burst(x, y, color, count, 160); }
  function puffOne(x, y, color) {
    particles.push({ x, y, vx: rand(-30, 30), vy: rand(-80, -20), life: 0.5, maxLife: 0.5, r: rand(2, 4), color });
  }

  // -------- misc helpers
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = clamp(((n >> 16) & 255) + amt, 0, 255);
    const g = clamp(((n >> 8) & 255) + amt, 0, 255);
    const b = clamp((n & 255) + amt, 0, 255);
    return `rgb(${r},${g},${b})`;
  }
  function hexAlpha(hex, a) {
    if (hex.startsWith("rgb")) return hex;
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function rand(min, max) { return min + Math.random() * (max - min); }
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[ch]);
  }

  function showToast(text) {
    toast.textContent = text;
    toast.classList.remove("hidden");
    toastTimer = 2.2;
  }
  function updateToast() {
    if (toastTimer > 0) {
      toastTimer -= world.dt;
      if (toastTimer <= 0) toast.classList.add("hidden");
    }
  }

  function pulse(target, strength, duration) {
    if (!settings.haptics || !target || target.gamepadIndex === null || target.gamepadIndex === undefined) return;
    const pad = navigator.getGamepads && navigator.getGamepads()[target.gamepadIndex];
    const actuator = pad && (pad.vibrationActuator || (pad.hapticActuators && pad.hapticActuators[0]));
    if (!actuator) return;
    if (actuator.playEffect) {
      actuator.playEffect("dual-rumble", { duration, strongMagnitude: clamp(strength, 0, 1), weakMagnitude: clamp(strength * 0.55, 0, 1) }).catch(() => {});
    } else if (actuator.pulse) {
      actuator.pulse(clamp(strength, 0, 1), duration).catch(() => {});
    }
  }

  // ------------------------------------------------------------------- audio
  function ensureAudio() {
    if (audioCtx) {
      if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioCtx = new AC();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.28;
    masterGain.connect(audioCtx.destination);
  }

  // Tracks are streamed: the element gets a src and starts as soon as enough
  // has buffered, so a multi-megabyte file never blocks the game loop. The
  // next track in list order is warmed in the background for instant skips.
  function makeTrackAudio(index) {
    const el = new Audio();
    el.preload = "auto";
    el.loop = false;
    el.volume = musicGain();
    el.src = MUSIC.tracks[index].url;
    el.load();
    return el;
  }

  function musicGain() {
    return settings.musicVolume * world.musicDuck;
  }

  function wrapTrack(index) {
    const n = MUSIC.tracks.length;
    return ((index % n) + n) % n;
  }

  function takeAudioFor(index) {
    if (musicState.preload && musicState.preload.index === index) {
      const el = musicState.preload.el;
      musicState.preload = null;
      el.volume = musicGain();
      return el;
    }
    return makeTrackAudio(index);
  }

  function warmNextTrack(index) {
    // In battle the next track is known when a board still owes its partner
    // song; otherwise warm the next one in list order, which is what the ▶
    // skip button plays.
    const next = musicState.context === "battle" && musicState.pairNext >= 0
      ? musicState.pairNext
      : wrapTrack(index + 1);
    if (musicState.preload && musicState.preload.index === next) return;
    releasePreload();
    musicState.preload = { index: next, el: makeTrackAudio(next) };
    musicState.preload.el.pause();
  }

  function releasePreload() {
    if (!musicState.preload) return;
    const el = musicState.preload.el;
    el.pause();
    el.removeAttribute("src");
    el.load();
    musicState.preload = null;
  }

  function onTrackEnded() {
    if (musicState.context !== "battle") { playTrack(musicState.index, true); return; }
    // A board plays its chosen song, then that song's partner, then random.
    if (musicState.pairNext >= 0) {
      const next = musicState.pairNext;
      musicState.pairNext = -1;
      playTrack(next);
      return;
    }
    playTrack(randomBattleTrack());
  }

  // Any track except the title theme, and nothing already heard on this board.
  // When the board has worked through everything, the slate is wiped and only
  // the track just played is held back.
  function randomBattleTrack() {
    let pool = battleCandidates(true);
    if (!pool.length) {
      musicState.boardPlayed = new Set([musicState.index]);
      pool = battleCandidates(true);
    }
    if (!pool.length) pool = battleCandidates(false);
    if (!pool.length) return wrapTrack(MUSIC.titleIndex + 1);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function battleCandidates(fresh) {
    const pool = [];
    for (let i = 0; i < MUSIC.tracks.length; i++) {
      if (i === MUSIC.titleIndex) continue;
      if (i === musicState.index) continue;
      if (fresh && musicState.boardPlayed.has(i)) continue;
      pool.push(i);
    }
    return pool;
  }

  // The song a board opens on, from the table in js/arena-music.js. An arena
  // with no entry (or a typo'd track name) just rolls a random battle track.
  function arenaTrackIndex(level) {
    const name = ARENA_MUSIC[level.id];
    const index = name === undefined ? undefined : MUSIC.indexByName.get(name);
    return index === undefined ? randomBattleTrack() : index;
  }

  // Called as each board loads. Staying on the same arena (a fixed Arena
  // setting, so every round is the same board) lets its playlist keep running
  // instead of restarting the opener each round.
  function startArenaMusic(level) {
    musicState.context = "battle";
    if (musicState.boardId === level.id && musicState.started) return;
    musicState.boardId = level.id;
    const index = arenaTrackIndex(level);
    musicState.pairNext = MUSIC.partnerOf[index];
    musicState.boardPlayed = new Set([index]);
    playTrack(index, true);
  }

  function playTrack(index, restart = false) {
    index = wrapTrack(index);
    const same = musicAudio && musicState.index === index && !restart;
    if (!same) {
      if (musicAudio) {
        musicAudio.pause();
        musicAudio.removeEventListener("ended", onTrackEnded);
        musicAudio.removeAttribute("src");
        musicAudio.load();
      }
      musicAudio = takeAudioFor(index);
      musicAudio.addEventListener("ended", onTrackEnded);
      musicState.index = index;
    } else if (restart) {
      musicAudio.currentTime = 0;
    }
    musicState.started = true;
    if (musicState.context === "battle") musicState.boardPlayed.add(index);
    applyMusicVolume();
    renderNowPlaying();
    if (settings.music) musicAudio.play().catch(() => {});
    warmNextTrack(index);
  }

  // "menu" keeps the title theme; battle music is driven by the arena instead
  // (see startArenaMusic), so leaving the menu also forgets the last board.
  function setMusicContext(context) {
    const changed = musicState.context !== context;
    musicState.context = context;
    if (context === "menu") musicState.boardId = null;
    if (changed || !musicState.started) playTrack(MUSIC.titleIndex);
    else startMusic();
  }

  // Manual skip takes the wheel: the board's partner song is no longer owed.
  function skipTrack(step) {
    ensureAudio();
    musicState.pairNext = -1;
    playTrack(musicState.index + step, true);
    if (!settings.music) showToast("Music is off — press M to turn it on");
  }

  function startMusic() {
    if (!settings.music) return;
    if (!musicAudio) playTrack(musicState.index);
    else musicAudio.play().catch(() => {});
  }
  function pauseMusic() {
    if (musicAudio) musicAudio.pause();
  }
  function stopMusic() {
    if (musicAudio) { musicAudio.pause(); musicAudio.currentTime = 0; }
  }
  function stopAudio() {
    pauseMusic();
    releasePreload();
    if (audioCtx) { audioCtx.close().catch(() => {}); audioCtx = null; masterGain = null; }
  }
  function toggleMusic() {
    settings.music = !settings.music;
    if (settings.music) { ensureAudio(); startMusic(); showToast(str("toast.soundOn")); }
    else { pauseMusic(); showToast(str("toast.soundOff")); }
    syncMusicButtons();
    renderNowPlaying();
  }
  function renderNowPlaying() {
    const label = document.getElementById("nowPlayingName");
    if (!label) return;
    label.textContent = MUSIC.tracks[musicState.index].name;
    const bar = document.getElementById("nowPlaying");
    if (bar) bar.classList.toggle("muted", !settings.music);
  }
  function syncMusicButtons() {
    const icon = document.getElementById("iconSound");
    if (!icon) return;
    icon.classList.toggle("muted", !settings.music);
    const label = str(settings.music ? "icons.soundOn" : "icons.soundOff");
    icon.title = label;
    icon.setAttribute("aria-label", label);
  }
  function setMusicVolume(value) {
    settings.musicVolume = clamp(Number(value) / 100, 0, 1);
    applyMusicVolume();
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

  function sfx(name) {
    if (!settings.music) return; // the speaker icon is a full mute
    ensureAudio();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    if (name === "shoot") { tone(220, 0.07, "square", 0.08, now, 95); noise(0.045, 0.05, 1800, now); }
    else if (name === "golden") { tone(660, 0.1, "square", 0.09, now, 220); tone(990, 0.14, "triangle", 0.06, now + 0.03); }
    else if (name === "jump") { tone(220, 0.09, "triangle", 0.06, now, 440); }
    else if (name === "block") { tone(180, 0.13, "sawtooth", 0.06, now, 260); noise(0.08, 0.03, 900, now); }
    else if (name === "parry") { tone(520, 0.1, "square", 0.07, now, 880); }
    else if (name === "hit") { tone(120, 0.11, "sawtooth", 0.08, now, 75); noise(0.08, 0.07, 700, now); }
    else if (name === "boom") { tone(70, 0.3, "sine", 0.12, now, 36); noise(0.22, 0.09, 500, now); }
    else if (name === "card") { tone(440, 0.08, "triangle", 0.06, now); tone(660, 0.12, "triangle", 0.05, now + 0.07); }
    else if (name === "chain") { tone(880, 0.05, "sawtooth", 0.05, now, 1400); noise(0.05, 0.04, 3200, now); }
    else if (name === "pop") { tone(420, 0.05, "square", 0.05, now, 140); noise(0.05, 0.04, 2600, now); }
    else if (name === "bounce") { tone(240, 0.12, "sine", 0.09, now, 620); }
    else if (name === "thud") { tone(90, 0.18, "sine", 0.11, now, 45); noise(0.14, 0.08, 420, now); }
    else if (name === "teleport") { tone(500, 0.14, "sine", 0.07, now, 1200); tone(1200, 0.12, "sine", 0.05, now + 0.08, 500); }
    else if (name === "mythic") { tone(330, 0.12, "sawtooth", 0.07, now, 660); tone(660, 0.18, "triangle", 0.07, now + 0.1, 990); }
    else if (name === "win") { tone(330, 0.13, "triangle", 0.08, now); tone(440, 0.13, "triangle", 0.08, now + 0.12); tone(660, 0.2, "triangle", 0.08, now + 0.24); }
  }

  // --------------------------------------------------------------------- UI
  function bindUi() {
    document.getElementById("startBtn").addEventListener("click", startMatch);
    joinSlots.addEventListener("click", e => {
      const cell = e.target.closest("[data-slot]");
      if (!cell || world.state !== "menu") return;
      cycleSlotByClick(Number(cell.dataset.slot));
    });
    document.getElementById("resumeBtn").addEventListener("click", () => togglePause(false));
    document.getElementById("musicPrev").addEventListener("click", () => skipTrack(-1));
    document.getElementById("musicNext").addEventListener("click", () => skipTrack(1));
    document.getElementById("pauseMenuBtn").addEventListener("click", returnToMainMenu);
    document.getElementById("iconSettings").addEventListener("click", () => openPanel(settingsPanel, "settings"));
    document.getElementById("iconHow").addEventListener("click", () => openPanel(howPanel, "how"));
    document.getElementById("iconFullscreen").addEventListener("click", toggleFullscreen);
    document.getElementById("iconSound").addEventListener("click", toggleMusic);
    document.getElementById("pauseSettingsBtn").addEventListener("click", () => openPanel(settingsPanel, "settings"));
    document.getElementById("settingsBack").addEventListener("click", () => closePanel(settingsPanel));
    document.getElementById("howBack").addEventListener("click", () => closePanel(howPanel));
    titleScreen.addEventListener("pointerdown", () => startFromTitle());

    // arena picker
    const levelSelect = document.getElementById("levelSelect");
    const rnd = document.createElement("option");
    rnd.value = "-1";
    rnd.textContent = str("settings.arenaRandom");
    levelSelect.appendChild(rnd);
    LEVELS.forEach((lv, i) => {
      const o = document.createElement("option");
      o.value = String(i);
      o.textContent = lv.name;
      levelSelect.appendChild(o);
    });
    levelSelect.addEventListener("change", () => {
      settings.levelChoice = Number(levelSelect.value);
      const label = document.getElementById("levelSelectValue");
      if (label) label.textContent = settings.levelChoice < 0 ? "Random" : LEVELS[settings.levelChoice].name;
    });

    bindSetting("playerCount", "playerCountValue", v => {
      settings.playerCount = Number(v);
      while (lobbySlots.length > settings.playerCount) lobbySlots.pop();
      renderLobby();
    });
    bindSetting("botDifficulty", "botDifficultyValue", v => {
      settings.botDifficulty = Number(v);
      document.getElementById("botDifficultyValue").textContent = botDifficultyLabel(settings.botDifficulty);
    });
    document.getElementById("botDifficultyValue").textContent = botDifficultyLabel(settings.botDifficulty);
    bindSetting("scoreLimit", "scoreLimitValue", v => settings.scoreLimit = Number(v));
    bindSetting("draftCount", "draftCountValue", v => settings.draftCount = Number(v));
    bindSetting("musicVolume", "musicVolumeValue", setMusicVolume);
    for (const rarity of window.ROUNDERS.RARITY_ORDER) {
      bindSetting(`${rarity}Weight`, `${rarity}WeightValue`, v => settings.rarityWeights[rarity] = Number(v));
    }
    // Choose Cards — the saved selection has to be in before the grid is built
    loadCardPrefs();
    buildCardPicker();
    document.getElementById("cardMode").addEventListener("click", e => {
      const b = e.target.closest("button[data-mode]");
      if (b) setCardMode(b.dataset.mode);
    });
    document.getElementById("cardsAll").addEventListener("click", () => setAllCards(true));
    document.getElementById("cardsNone").addEventListener("click", () => setAllCards(false));
    document.getElementById("cardsInvert").addEventListener("click", invertCards);
    refreshCardPicker();

    document.getElementById("hazards").addEventListener("change", e => settings.hazards = e.target.checked);
    document.getElementById("proceduralCharacters").addEventListener("change", e => {
      settings.proceduralCharacters = e.target.checked;
      setProceduralCharacters(e.target.checked);
    });
    document.getElementById("haptics").addEventListener("change", e => settings.haptics = e.target.checked);
    document.getElementById("shake").addEventListener("change", e => settings.shake = e.target.checked);
  }

  function bindSetting(inputId, valueId, setter) {
    const input = document.getElementById(inputId);
    const value = document.getElementById(valueId);
    if (!input) return;
    input.addEventListener("input", () => {
      if (value) value.textContent = input.value;
      setter(input.value);
    });
  }

  // Quietly best-effort: if the browser refuses (no user gesture it recognises)
  // the fullscreen icon in the corner is still there, so nagging adds nothing.
  async function enterFullscreen() {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    } catch { /* stay windowed */ }
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      showToast(str("toast.fullscreenBlocked"));
    }
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

  function tick(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    rememberGamepads();
    render();
    pressed.clear();
    requestAnimationFrame(tick);
  }

  addEventListener("keydown", e => {
    ensureAudio();
    if (!keys.has(e.code)) pressed.add(e.code);
    keys.add(e.code);
    if (world.state === "title") {
      startFromTitle();
      e.preventDefault();
      return;
    }
    if (e.code === "KeyM") toggleMusic();
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Enter", "NumpadEnter", "Slash"].includes(e.code)) e.preventDefault();
  });
  addEventListener("keyup", e => keys.delete(e.code));
  addEventListener("blur", () => { keys.clear(); pressed.clear(); });
  // the card grid reflows with the window, so its row map has to be remeasured
  addEventListener("resize", () => { cardUi.rows = []; cardUi.layoutW = -1; });
  addEventListener("pointerdown", () => {
    ensureAudio();
    // a pad-started session gets music on the first real user gesture
    if (world.state !== "title" && settings.music && (!musicAudio || musicAudio.paused)) startMusic();
  });
  addEventListener("pagehide", stopAudio);
  addEventListener("beforeunload", stopAudio);
  document.addEventListener("visibilitychange", () => {
    // pause, don't stop — coming back mid-track should not restart the song
    if (document.hidden) pauseMusic();
    else if (world.state !== "title") startMusic();
  });
  addEventListener("gamepadconnected", e => {
    const orphan = players.find(p => !p.bot && !p.scheme && (p.gamepadIndex === null || p.gamepadIndex === undefined));
    if (orphan && world.state !== "menu") {
      orphan.gamepadIndex = e.gamepad.index;
      showToast(str("toast.controllerReconnected", { name: orphan.name }));
    } else {
      showToast(str("toast.controllerDetected", { name: e.gamepad.id.split("(")[0].trim() || "Controller" }));
    }
  });
  addEventListener("gamepaddisconnected", e => {
    const slotIndex = lobbySlots.findIndex(slot => slot.gamepadIndex === e.gamepad.index);
    if (slotIndex >= 0) lobbySlots.splice(slotIndex, 1);
    for (const p of players) if (p.gamepadIndex === e.gamepad.index) p.gamepadIndex = null;
    renderLobby();
    showToast(str("toast.controllerLost"));
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

  // ------------------------------------------------------- delivered art
  // Painted rounds live at assets/images/bullets/<card-id>.png and effects at
  // assets/images/fx/<name>.png. Both load on demand and cache; anything
  // missing simply keeps the procedural drawing, so art can land piecemeal.
  const artCache = new Map();
  function loadArt(kind, name) {
    const key = `${kind}/${name}`;
    let entry = artCache.get(key);
    if (!entry) {
      const img = new Image();
      entry = { img, ok: false };
      artCache.set(key, entry);
      img.onload = () => { entry.ok = true; };
      img.onerror = () => { entry.ok = false; };
      img.src = `${window.ROUNDERS_ASSET_BASE || ""}assets/images/${kind}/${name}.png`;
    }
    return entry.ok ? entry.img : null;
  }
  const fxImage = name => loadArt("fx", name);
  window.ROUNDERS.fxImage = fxImage;

  // Sheets are one strip of equal left-to-right frames; everything else is a
  // single image, which is just a one-frame sheet.
  const FX_FRAMES = { explosion: 6, "explosion-big": 6, "shield-break": 5 };

  // Effect art is lazy-loaded on first use, which would mean the first
  // explosion of a match is the procedural one and the second is painted. A
  // touch at boot costs nothing and makes the art show from the first shot.
  const FX_WARM = [
    "explosion", "explosion-big", "shockwave-ring", "lightning-arc", "storm-nova",
    "shield-bubble", "shield-break", "stun-stars", "muzzle-flash", "chill-aura",
    "frost-burst", "black-hole", "poison-cloud", "sawblade", "angel", "lemonade"
  ];
  function warmFxArt() { for (const n of FX_WARM) fxImage(n); }

  // Draws one frame of a sheet centred on (x, y), `u` running 0→1 across the
  // strip. Returns false when the file is missing, which is every caller's cue
  // to draw the procedural version instead.
  function drawFxSheet(name, x, y, size, u = 0, opts = {}) {
    const img = fxImage(name);
    if (!img) return false;
    const frames = FX_FRAMES[name] || 1;
    const fw = img.width / frames;
    const frame = clamp(Math.floor(u * frames), 0, frames - 1);
    const h = size * (img.height / fw);
    ctx.save();
    ctx.globalAlpha = clamp(opts.alpha === undefined ? 1 : opts.alpha, 0, 1);
    ctx.translate(x, y);
    if (opts.rot) ctx.rotate(opts.rot);
    ctx.drawImage(img, frame * fw, 0, fw, img.height, -size / 2, -h / 2, size, h);
    ctx.restore();
    return true;
  }

  // Painted one-shots: art for moments the engine has no lasting field to hang
  // a drawing on — a shield shattering, a nova going off, a muzzle flash. They
  // age like particles and are drawn over the top of everything else.
  let fxShots = [];
  function fxShot(name, x, y, size, life = 0.35, opts = {}) {
    if (!fxImage(name)) return false;   // no art: the caller keeps its own
    fxShots.push({
      name, x, y, size, life, maxLife: life,
      rot: opts.rot || 0, spin: opts.spin || 0, grow: opts.grow || 0,
      alpha: opts.alpha === undefined ? 1 : opts.alpha,
      follow: opts.follow || null       // rides a fighter, e.g. a muzzle flash
    });
    return true;
  }

  function updateFxShots(dt) {
    for (const s of fxShots) {
      s.life -= dt;
      s.rot += s.spin * dt;
      if (s.follow) { s.x = s.follow.p.x + s.follow.dx; s.y = s.follow.p.y + s.follow.dy; }
    }
    fxShots = fxShots.filter(s => s.life > 0);
  }

  function drawFxShots() {
    for (const s of fxShots) {
      const k = 1 - clamp(s.life / s.maxLife, 0, 1);       // 0 at the flash, 1 at the end
      const size = s.size * (1 + s.grow * k);
      // a single image fades out; a sheet plays its frames and holds its alpha,
      // because the art itself is what dissipates
      const alpha = (FX_FRAMES[s.name] || 1) > 1 ? s.alpha : s.alpha * (1 - k);
      drawFxSheet(s.name, s.x, s.y, size, k, { rot: s.rot, alpha });
    }
  }

  // ---------------------------------------------------------- bullet looks
  // How a player's round is DRAWN, from js/bullet-art.js. A build with several
  // bullet cards gets the two newest painted rounds BLENDED — the newest at
  // full strength and the one before it washed over it, which at the size a
  // bullet is actually drawn keeps one clear silhouette while still telling
  // you the second card is there. Three or more turn to mud, so anything past
  // the second only shows in the trail colour.
  const MIX_TOP = 2;          // sprites blended into the round
  const MIX_LEAD = 0.68;      // how much of it is the newest card
  const mixCache = new Map();

  function mixBulletArt(ids) {
    if (ids.length === 1) return loadArt("bullets", ids[0]);
    const key = ids.join("|");
    if (mixCache.has(key)) return mixCache.get(key);
    const imgs = ids.map(id => loadArt("bullets", id));
    if (imgs.some(im => !im)) return imgs[imgs.length - 1] || null;   // retry once loaded
    const size = Math.max(...imgs.map(im => im.naturalWidth || im.width || 128));
    const cv = document.createElement("canvas");
    cv.width = cv.height = size;
    const c = cv.getContext("2d");
    imgs.forEach((im, i) => {
      c.globalAlpha = i === imgs.length - 1 ? MIX_LEAD : (1 - MIX_LEAD) / (imgs.length - 1);
      c.drawImage(im, 0, 0, size, size);
    });
    mixCache.set(key, cv);
    return cv;
  }

  // Everything about how this fighter's round looks, resolved together so the
  // sprite, its transform and its trail colour always agree.
  function bulletLookFor(p) {
    if (!p || !p.cards) return { art: null, scale: 1, rotation: 0, color: null };
    const cfg = window.ROUNDERS.BULLET_ART || {};
    const painted = [];
    const colours = [];
    for (const card of p.cards) {
      const k = cfg[card.id];
      if (k && k.color) colours.push(k.color);
      // a card marked procedural never lends its sprite — its hand-drawn round
      // is the one worth seeing
      if (!(k && k.procedural) && loadArt("bullets", card.id)) painted.push(card.id);
    }
    // The transform comes from the newest card that HAS an entry, whether or
    // not it ships a sprite — Cannonball is drawn 1.4× and has no art of its
    // own — and it is read independently of loading, so a slow sprite never
    // costs the round its size.
    // the LEAD SPRITE's entry decides the transform, since that is the art the
    // rotation lines up; with no sprite at all, fall back to the newest entry
    // that asks for one (Cannonball is drawn 1.4× and ships no art)
    let tuned = {};
    if (painted.length) tuned = cfg[painted[painted.length - 1]] || {};
    else for (const card of p.cards) {
      const k = cfg[card.id];
      if (k && (k.scale != null || k.rotation != null)) tuned = k;
    }
    return {
      art: painted.length ? mixBulletArt(painted.slice(-MIX_TOP)) : null,
      scale: tuned.scale || 1,
      rotation: (tuned.rotation || 0) * Math.PI / 180,
      // the trail carries every bullet card, not just the two that are drawn
      color: colours.length ? blendHex(colours) : null
    };
  }

  // average of a list of #rrggbb, so a build's trail is the blend of its rounds
  function blendHex(list) {
    let r = 0, g = 0, b = 0;
    for (const h of list) {
      r += parseInt(h.slice(1, 3), 16);
      g += parseInt(h.slice(3, 5), 16);
      b += parseInt(h.slice(5, 7), 16);
    }
    const n = list.length;
    const hx = v => Math.round(v / n).toString(16).padStart(2, "0");
    return `#${hx(r)}${hx(g)}${hx(b)}`;
  }

  // Tiny dev/test hooks: grant a card by id mid-match, peek at the fighters.
  // Used by the headless smoke tests; harmless in normal play.
  window.ROUNDERS.debug = {
    players: () => players,
    world,
    settings,
    // what a draft is allowed to offer, and a real hand rolled from it
    cardPool,
    drawCards,
    // Effect hooks, so a delivered fx sheet can be posed and eyeballed without
    // waiting for the card that fires it to turn up in a draft. `fields` below
    // is a read-only summary — this one is the live array, to push onto.
    liveFields: () => fields,
    fxShots: () => fxShots,
    fxShot,
    boltVisual,
    fire: p => tryShoot(p),
    // bored terrain, reported at LIVE positions (a mover's base x is not where
    // it currently is, and the hole rides with it)
    holes: () => activePlatforms(currentLevel(), world.time)
      .filter(pl => pl.holes && pl.holes.length)
      .map(pl => ({ box: { x: pl.x, y: pl.y, w: pl.w, h: pl.h }, holes: pl.holes.map(h => ({ ...h })), spans: pl.holes.map(h => holeSpans(pl, h)) })),
    bullets: () => bullets.map(b => ({
      x: Math.round(b.x), y: Math.round(b.y), vx: Math.round(b.vx), ghost: Boolean(b.ghost),
      damage: Math.round(b.damage), empowered: b.empowered || 0, explosive: b.explosive,
      singularity: b.singularity || 0, wallPierce: b.wallPierce || 0, drilled: b.drilled || 0
    })),
    // how a fighter's round is drawn, for checking the bullet-art config
    bulletLook: p => bulletLookFor(p),
    // strip a fighter back to a clean slate: no cards, baseline stats, full
    // health. Lets a test run build after build without reloading the page.
    stripCards(index) {
      const p = players[index];
      if (!p) return false;
      p.cards = [];
      p.stats = defaultStats();
      p.hp = p.stats.maxHp;
      p.ammo = p.stats.maxAmmo;
      p.guardianCharges = 0; p.roundRevives = 0; p.hoverLeft = 0; p.freshPool = 0;
      p.hovering = false; p.rebirth = null; p.activeCooldown = 0; p.rewindLeft = REWIND_MAX;
      p.burstQueue = []; p.encoreQueue = [];
      p.decayPool = 0; p.hotShield = 0; p.overShield = 0; p.shield = 0;
      p.alive = true;
      return true;
    },
    defaultStats,
    // fire a fighter's Mythic on demand: bots never press the ability button,
    // so a combination test has no other way to exercise the actives
    fireActive(index) {
      const p = players[index];
      if (!p || !p.stats.active) return false;
      p.activeCooldown = 0;
      return Boolean(tryActive(p));
    },
    // chronoshift tape: is the world running backwards, and how much is left
    rewind: () => ({ active: rewind.active, cursor: rewind.cursor, frames: history.length }),
    slabs: () => props.slabs.filter(s => !s.dead).map(s => ({
      x: Math.round(s.x), y: Math.round(s.y), w: s.w, h: s.h, brick: Boolean(s.brickOwner)
    })),
    fields: () => fields.map(f => ({
      type: f.type, x: Math.round(f.x), y: Math.round(f.y), r: Math.round(f.r || 0),
      singularity: Boolean(f.singularity), life: +(f.life || 0).toFixed(2)
    })),
    particles: () => ({
      total: particles.length,
      flame: particles.filter(x => x.flame).length,
      smoke: particles.filter(x => x.smoke).length
    }),
    probe: (px, py, rad = 27) => activePlatforms(currentLevel(), world.time)
      .filter(pl => pl.holes && pl.holes.length)
      .map(pl => ({ box: { x: pl.x, y: pl.y, w: pl.w, h: pl.h }, hasHoles: pl.holes.length, inHole: inHole(pl, px, py, rad) })),
    // every solid the level currently has, for tests that need to shoot at one
    platforms: () => activePlatforms(currentLevel(), world.time)
      .map(pl => ({ x: pl.x, y: pl.y, w: pl.w, h: pl.h,
        breakable: Boolean(pl.breakRef), crate: Boolean(pl.isCrate) })),
    punch: (px, py, size = 64) => {
      const plats = activePlatforms(currentLevel(), world.time);
      for (const pl of plats) if (circleRect({ x: px, y: py, r: 4 }, pl)) return punchHole(pl, px, py, size);
      return false;
    },
    grant(index, cardId) {
      const p = players[index];
      const c = CARDS.find(x => x.id === cardId);
      if (p && c) grantCard(p, c);
      return Boolean(p && c);
    }
  };

  applyStrings();
  warmFxArt();
  bindUi();
  renderLobby();
  syncMusicButtons();
  renderNowPlaying();
  requestAnimationFrame(tick);
})();
