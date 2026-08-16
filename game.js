// Rounders — engine. Content lives in js/cards.js, js/levels.js, js/characters.js.
(() => {
  "use strict";

  const { CARDS, RARITIES, CHARACTERS, LEVELS, drawCharacter, setProceduralCharacters, arenaImage } = window.ROUNDERS;
  const str = window.ROUNDERS.str;

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
    rarityWeights: Object.fromEntries(Object.entries(RARITIES).map(([k, v]) => [k, v.weight]))
  };

  const world = {
    width: 1600,
    height: 900,
    gravity: 2100,
    airDrag: 0.996,
    floorDrag: 0.86,
    state: "title",
    panelReturn: "menu",
    musicDucked: false,
    lockedThisFrame: false,
    winner: null,
    roundWinner: null,
    drafters: [],
    levelIndex: 0,
    lastLevelIndex: -1,
    roundFreeze: 0,
    shake: 0,
    time: 0,
    menuIndex: 0,
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
    { left: "KeyA", right: "KeyD", up: "KeyW", down: "KeyS", jump: "KeyW", shoot: "KeyF", block: "KeyG", label: "Keyboard 1 (WASD + F/G)" },
    { left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp", down: "ArrowDown", jump: "ArrowUp", shoot: "Slash", block: "Period", label: "Keyboard 2 (Arrows + / .)" }
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
  let last = performance.now();
  let toastTimer = 0;
  let audioCtx = null;
  let masterGain = null;
  let musicAudio = null;
  let hudRefs = [];

  const MUSIC = window.ROUNDERS.MUSIC;
  const musicState = {
    index: MUSIC.titleIndex,
    context: "menu", // "menu" (title/lobby/settings) or "battle"
    preload: null,   // { index, el } streamed ahead so a skip starts instantly
    started: false
  };

  // ------------------------------------------------------------------ stats
  function defaultStats() {
    return {
      maxHp: 100, speed: 560, accel: 12, airAccel: 5.2, brake: 10, jump: 880,
      // ROUNDS-style baseline: 100 HP, no regen, the default gun two-shots
      // (55 a hit), 3 ammo with an automatic whole-clip reload when empty
      damage: 55, bulletSpeed: 980, bulletGravity: 1300, bulletDrag: 0.997,
      bulletRestitution: 0.72, bulletSize: 1,
      maxAmmo: 3, reload: 2.0, fireDelay: 0.3,
      blockCooldown: 1.55, blockDuration: 0.25,
      radius: 27, pellets: 1, spread: 0.04,
      bounces: 0, explosive: 0, homing: 0, grow: 0, pierce: 0,
      poison: 0, burn: 0, chill: 0, chain: 0, shards: 0,
      lifesteal: 0, thorns: 0, regen: 0, rage: 0, adrenaline: 0,
      echoBlock: 0, blockPush: 0, blockDash: 0, warpBlock: 0, stormBlock: 0,
      guardian: 0, revives: 0, extraJumps: 0, kbResist: 0,
      goldenShot: false, killHeal: false,
      active: null, activeCooldown: 10
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
      ammo: 3, reloadTimer: 0, fireTimer: 0,
      blockTimer: 0, blockCooldown: 0, echoTimer: 0,
      activeCooldown: 0, teleWasInside: false,
      poisonTimer: 0, poisonDps: 0,
      burnTimer: 0, burnDps: 0,
      chillTimer: 0,
      teleCooldown: 0,
      guardianCharges: 0, roundRevives: 0,
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
      hazardGrace: 0,
      blinkClock: Math.random() * 4
    };
  }

  function emptyInput() {
    return {
      move: 0, aimX: 0, aimY: 0,
      jump: false, shoot: false, block: false, pause: false,
      jumpPressed: false, shootPressed: false, blockPressed: false, pausePressed: false,
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
      if (p.phase) {
        const cyc = ((t + p.phase.offset) % p.phase.period) / p.phase.period;
        if (cyc > p.phase.duty) continue;
        list.push({ ...p, vxDelta: 0, vyDelta: 0, phaseCyc: cyc });
      } else {
        list.push({ ...p, vxDelta: 0, vyDelta: 0 });
      }
    }
    for (const m of level.movers || []) {
      const ph = (m.phase || 0) * Math.PI * 2;
      const s = (Math.sin((t / m.period) * Math.PI * 2 + ph) + 1) / 2;
      const sPrev = (Math.sin(((t - world.lastStep) / m.period) * Math.PI * 2 + ph) + 1) / 2;
      const x = m.x + m.dx * s, y = m.y + m.dy * s;
      list.push({ ...m, x, y, vxDelta: m.dx * (s - sPrev), vyDelta: m.dy * (s - sPrev), isMover: true });
    }
    platCache = { t, level, list };
    return list;
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
    setMusicContext("battle");
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
      p.input.jumpPressed = p.input.shootPressed = p.input.blockPressed = p.input.pausePressed = false;
    }
  }

  function startFromTitle(canFullscreen) {
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
    if (canFullscreen) {
      enterFullscreen();
    } else if (!document.fullscreenElement) {
      showToast(str("title.fullscreenBlocked"));
    }
  }

  // The icon row belongs to the menu and pause screens; the track widget only
  // shows once a match is running.
  function syncChrome() {
    const showIcons = world.state === "menu" || world.state === "paused";
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
    bullets = [];
    particles = [];
    fields = [];
    bolts = [];
    world.weather = [];
    world.lightningTimer = level.lightning ? level.lightning.period : 0;
    world.lightningFlash = 0;
    world.tideLevel = level.tide ? level.tide.min : world.height + 100;
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
      p.ammo = p.stats.maxAmmo;
      p.reloadTimer = 0; p.fireTimer = 0;
      p.blockTimer = 0; p.blockCooldown = 0; p.echoTimer = 0;
      p.activeCooldown = 0; p.teleWasInside = false;
      p.poisonTimer = 0; p.burnTimer = 0; p.chillTimer = 0;
      p.teleCooldown = 0;
      p.hazardGrace = 0;
      p.guardianCharges = p.stats.guardian;
      p.roundRevives = p.stats.revives;
      p.trail = [];
      p.spawnGrace = 1.6;
    });
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
  function drawCards(count, exclude = []) {
    const bag = CARDS.filter(c => !exclude.includes(c));
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

  // All losers draft simultaneously, each with their own hand + controls.
  function beginDraft(losers) {
    world.state = "draft";
    world.drafters = losers.map(p => ({
      player: p,
      options: drawCards(settings.draftCount),
      index: 0,
      picked: false
    }));
    world.draftBaseTitle = losers.length > 1 ? str("draft.titleMulti") : str("draft.titleSolo", { name: losers[0].name });
    world.draftTimer = 30;
    draftTitle.textContent = world.draftBaseTitle;
    renderDraftPanel();
    draftPanel.classList.remove("hidden");
    for (const d of world.drafters) {
      if (d.player.bot) {
        setTimeout(() => {
          if (world.state === "draft" && !d.picked) {
            d.index = Math.floor(Math.random() * d.options.length);
            confirmPick(d);
          }
        }, 700 + Math.random() * 900);
      }
    }
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
          <strong class="card-name">${c.name}</strong>
          <em class="card-tagline">${c.tagline}</em>
          <p class="card-desc">${c.description}</p>
          <div class="stat-list">${c.effects.map(s => `<span>${s}</span>`).join("")}</div>
          <span class="card-pip flip">${rar.name[0]}</span>
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
    d.player.cards.push(c);
    c.apply(d.player);
    d.player.hp = d.player.stats.maxHp;
    d.player.ammo = d.player.stats.maxAmmo;
    sfx("card");
    pulse(d.player, 0.5, 150);
    refreshDraftSelection(d);
    showToast(str("draft.picked", { name: d.player.name, card: c.name }));
    if (world.drafters.every(x => x.picked)) {
      setTimeout(() => {
        if (world.state === "draft") {
          draftPanel.classList.add("hidden");
          world.state = "playing";
          buildHud();
          resetRound();
        }
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
    input.jump ||= button(pad, 0) || dUp;
    input.shoot ||= button(pad, 2) || button(pad, 5) || button(pad, 7);
    input.block ||= button(pad, 1) || button(pad, 3) || button(pad, 4) || button(pad, 6);
    input.pause ||= button(pad, 9);
    input.menuPressed ||= buttonEdge(pad, 9);
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
    let best = null, bestD = Infinity;
    for (const p of players) {
      if (!p.alive || p === bot) continue;
      const d = Math.hypot(p.x - bot.x, p.y - bot.y);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
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
      if (pads.some(pad => pad.buttons.some((_, i) => buttonEdge(pad, i)))) startFromTitle(false);
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
    if (world.state !== "playing") { updateParticles(dt); return; }

    updateWeather(dt);
    if (world.roundFreeze > 0) {
      world.roundFreeze -= dt;
      updateParticles(dt);
      return;
    }

    const step = Math.min(dt, 1 / 45);
    world.lastStep = step;
    updateArena(step);
    updatePlayers(step);
    updateBullets(step);
    updateFields(step);
    updateParticles(step);
    updateBolts(step);
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
  function updatePlayers(dt) {
    const level = currentLevel();
    const plats = activePlatforms(level, world.time);
    const wind = windForce();
    for (const p of players) {
      if (!p.alive) continue;
      p.fireTimer = Math.max(0, p.fireTimer - dt);
      p.blockCooldown = Math.max(0, p.blockCooldown - dt);
      p.blockTimer = Math.max(0, p.blockTimer - dt);
      p.activeCooldown = Math.max(0, p.activeCooldown - dt);
      p.spawnGrace = Math.max(0, p.spawnGrace - dt);
      p.hazardGrace = Math.max(0, p.hazardGrace - dt);
      p.teleCooldown = Math.max(0, p.teleCooldown - dt);
      p.blinkClock += dt;

      if (p.echoTimer > 0) {
        p.echoTimer -= dt;
        if (p.echoTimer <= 0) {
          p.blockTimer = Math.max(p.blockTimer, p.stats.blockDuration * 0.8);
          if (p.stats.blockPush) fields.push({ type: "push", owner: p, x: p.x, y: p.y, r: 200, life: 0.18, force: 840 });
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
        if (Math.random() < dt * 20) puffOne(p.x + rand(-14, 14), p.y - rand(0, 20), "#ff9e3d");
      }
      if (p.chillTimer > 0) p.chillTimer -= dt;
      if (p.stats.regen > 0) p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.regen * dt);

      if (p.reloadTimer > 0) {
        p.reloadTimer -= dt;
        if (p.reloadTimer <= 0) {
          p.ammo = p.stats.maxAmmo;
          puff(p.x, p.y, "#ffffff", 8);
        }
      }

      const chillMul = p.chillTimer > 0 ? 0.55 : 1;
      const adrenalineMul = p.stats.adrenaline > 0 && p.hp / p.stats.maxHp < 0.35 ? 1 + p.stats.adrenaline : 1;
      let speed = p.stats.speed * chillMul * adrenalineMul;
      // syrup zones
      for (const z of level.zones || []) {
        if (circleRect(p, z)) { speed *= 0.45; break; }
      }

      const move = clamp(p.input.move, -1, 1);
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

      if (p.input.jumpPressed && p.jumpsLeft > 0) {
        p.vy = -p.stats.jump * (p.chillTimer > 0 ? 0.75 : 1);
        p.jumpsLeft -= 1;
        p.grounded = false;
        p.groundPlatform = null;
        pulse(p, 0.12, 25);
        sfx("jump");
        puff(p.x, p.y + p.stats.radius, "#ffffff", 10);
      }

      if (p.input.blockPressed && !tryActive(p)) tryBlock(p);
      if (p.input.shoot) tryShoot(p);

      p.vy += levelGravity() * dt;
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

      // tide drowning
      if (level.tide && p.y > world.tideLevel + 10) {
        p.vy -= levelGravity() * dt * 0.7; // buoyancy
        p.vx *= 0.94;
        hurtRaw(p, 16 * dt, null);
        if (Math.random() < dt * 10) puffOne(p.x + rand(-12, 12), p.y - 20, "#7fe8d0");
      }

      // world bounds kill; hazards sting and launch instead
      if (p.x < -80 || p.x > world.width + 80 || p.y > world.height + 120) hurt(p, 999, null, 0, -1);
      if (settings.hazards) {
        for (const h of level.hazards) {
          if (circleRect(p, h)) { hazardHit(p, h); break; }
        }
      }
    }
  }

  function collidePlayer(p, plats) {
    const r = p.stats.radius;
    if (p.x < r) { p.x = r; p.vx = Math.abs(p.vx) * 0.46; }
    if (p.x > world.width - r) { p.x = world.width - r; p.vx = -Math.abs(p.vx) * 0.46; }
    if (p.y < r) { p.y = r; p.vy = Math.abs(p.vy) * 0.42; }
    for (const platform of plats) {
      const overlap = playerPlatformOverlap(p, platform);
      if (!overlap) continue;
      if (overlap.side === "top") {
        p.y -= overlap.amount;
        p.vy = Math.min(0, p.vy);
        p.grounded = true;
        p.groundPlatform = platform;
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
    if (p.vy >= 0 && vertical && vertical.side === "top" && vertical.amount < r * 1.4) return vertical;
    if (p.vy < 0 && vertical && vertical.side === "bottom" && vertical.amount < r * 1.1) return vertical;
    return overlaps[0] || vertical;
  }

  // ----------------------------------------------------------------- combat
  function tryBlock(p) {
    if (p.blockCooldown > 0) return;
    p.blockTimer = p.stats.blockDuration;
    p.blockCooldown = p.stats.blockCooldown;
    pulse(p, 0.32, 95);
    sfx("block");
    burst(p.x, p.y, "#ffffff", 14, 240);
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
    if (p.stats.blockPush) fields.push({ type: "push", owner: p, x: p.x, y: p.y, r: 190, life: 0.18, force: 1000 });
    if (p.stats.stormBlock) {
      for (const q of players) {
        if (!q.alive || q === p || q.spawnGrace > 0) continue;
        const d = Math.hypot(q.x - p.x, q.y - p.y);
        if (d < 260) {
          boltVisual(p.x, p.y, q.x, q.y, "#ffe95e", 0.25);
          hurt(q, 30, p, q.x - p.x, q.y - p.y - 120);
        }
      }
      world.shake = Math.max(world.shake, 8);
      sfx("chain");
    }
    if (p.stats.echoBlock) p.echoTimer = 0.19;
  }

  function tryActive(p) {
    if (!p.stats.active || p.activeCooldown > 0) return false;
    p.activeCooldown = p.stats.activeCooldown;
    pulse(p, 0.75, 170);
    sfx("mythic");
    burst(p.x, p.y, "#ff4d8f", 30, 480);
    const aim = Math.atan2(p.aimY, p.aimX);
    if (p.stats.active === "starfall") {
      const tx = clamp(p.x + p.aimX * 420, 120, world.width - 120);
      for (let i = 0; i < 5; i += 1) {
        const sx = tx + (i - 2) * 80 + rand(-25, 25);
        bullets.push({
          owner: p, x: sx, y: -40 - i * 60, prevX: sx, prevY: -40, ox: sx, oy: -40,
          vx: rand(-40, 40), vy: 900 + rand(0, 250),
          r: 15, damage: 34, life: 3, gravity: 500, drag: 1, restitution: 0.5,
          bounces: 0, explosive: 1.2, homing: 0, pierce: 0, poison: 0, burn: 1,
          chain: 0, shards: 0, grow: 0, golden: false, isShard: true,
          color: "#ff9e3d", meteor: true, hitIds: new Set()
        });
      }
      showToast(str("toast.starfall", { name: p.name }));
    } else if (p.stats.active === "eventHorizon") {
      fields.push({
        type: "blackhole", owner: p,
        x: clamp(p.x + p.aimX * 320, 150, world.width - 150),
        y: clamp(p.y + p.aimY * 260, 150, world.height - 150),
        r: 300, life: 3, force: -950, dps: 16
      });
      showToast(str("toast.eventHorizon", { name: p.name }));
    } else if (p.stats.active === "chronoshift") {
      const past = p.trail[0];
      if (past) {
        burst(p.x, p.y, "#8fd8ff", 24, 380);
        p.x = past.x; p.y = past.y;
        p.vx = 0; p.vy = 0;
        p.hp = Math.min(p.stats.maxHp, p.hp + 35);
        p.spawnGrace = Math.max(p.spawnGrace, 0.4);
        burst(p.x, p.y, "#8fd8ff", 24, 380);
        sfx("teleport");
      }
      showToast(str("toast.chronoshift", { name: p.name }));
    }
    return true;
  }

  function tryShoot(p) {
    if (p.fireTimer > 0 || p.reloadTimer > 0 || p.ammo <= 0) return;
    p.fireTimer = p.stats.fireDelay;
    const golden = p.stats.goldenShot && p.ammo === p.stats.maxAmmo;
    p.ammo -= 1;
    sfx(golden ? "golden" : "shoot");
    const rageMul = p.stats.rage > 0 ? 1 + p.stats.rage * (1 - clamp(p.hp / p.stats.maxHp, 0, 1)) : 1;
    const baseAngle = Math.atan2(p.aimY, p.aimX);
    const pellets = p.stats.pellets;
    // Rigged characters fire from the actual barrel tip; everyone else keeps
    // the old fixed offset along the aim.
    const muz = window.ROUNDERS.rig
      ? window.ROUNDERS.rig.muzzle(p.character, p.stats.radius, p.aimX, p.aimY, 0, p.facing || 0)
      : null;
    for (let i = 0; i < pellets; i += 1) {
      const spread = (i - (pellets - 1) / 2) * p.stats.spread + rand(-0.018, 0.018);
      const a = baseAngle + spread;
      const speed = p.stats.bulletSpeed * rand(0.94, 1.05);
      bullets.push({
        owner: p,
        x: p.x + (muz ? muz.x : Math.cos(a) * 34),
        y: p.y + (muz ? muz.y : Math.sin(a) * 34),
        prevX: p.x, prevY: p.y, ox: p.x, oy: p.y,
        vx: Math.cos(a) * speed + p.vx * 0.18,
        vy: Math.sin(a) * speed + p.vy * 0.08,
        r: (6 + Math.min(9, p.stats.damage / 20)) * p.stats.bulletSize,
        damage: p.stats.damage * rageMul * (golden ? (pellets > 1 ? 2 : 3) : 1),
        life: 2.7,
        gravity: p.stats.bulletGravity,
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
        grow: p.stats.grow,
        golden,
        isShard: false,
        hitIds: new Set(),
        color: golden ? "#ffd700" : p.color
      });
    }
    p.vx -= Math.cos(baseAngle) * 70;
    p.vy -= Math.sin(baseAngle) * 20;
    pulse(p, 0.18, 45);
    if (p.ammo <= 0) p.reloadTimer = p.stats.reload;
  }

  function updateBullets(dt) {
    const level = currentLevel();
    const plats = activePlatforms(level, world.time);
    const wind = windForce();
    for (const b of bullets) {
      if (b.homing) {
        const target = nearestEnemy(b);
        if (target) {
          const dx = target.x - b.x, dy = target.y - b.y;
          const mag = Math.hypot(dx, dy) || 1;
          b.vx += (dx / mag) * b.homing * 520 * dt;
          b.vy += (dy / mag) * b.homing * 520 * dt;
        }
      }
      b.prevX = b.x; b.prevY = b.y;
      b.vy += b.gravity * dt;
      if (wind) b.vx += wind * 0.9 * dt;
      const drag = Math.pow(b.drag, dt * 60);
      b.vx *= drag; b.vy *= drag;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      particles.push({
        x: b.x, y: b.y, vx: rand(-16, 16), vy: rand(-16, 16),
        life: 0.16, maxLife: 0.16, r: b.golden ? 3 : 2,
        color: b.burn ? "#ff9e3d" : b.color
      });

      for (const platform of plats) {
        if (circleRect(b, platform)) {
          if (b.bounces > 0) {
            bounceBullet(b, platform);
            b.bounces -= 1;
            sfx("block");
          } else {
            b.life = -1;
            explodeBullet(b);
          }
        }
      }

      for (const p of players) {
        if (!p.alive || p === b.owner || p.spawnGrace > 0 || b.hitIds.has(p.id)) continue;
        const d = Math.hypot(p.x - b.x, p.y - b.y);
        if (d < p.stats.radius + b.r) {
          if (p.blockTimer > 0) {
            // parry: reflect the bullet back
            const mag = Math.hypot(b.vx, b.vy) || 1;
            b.owner = p;
            b.hitIds = new Set();
            b.vx = -(b.vx / mag) * p.stats.bulletSpeed * 1.05;
            b.vy = -(b.vy / mag) * p.stats.bulletSpeed * 1.05;
            b.color = p.color;
            b.x += b.vx * dt * 2;
            b.y += b.vy * dt * 2;
            pulse(p, 0.22, 70);
            sfx("parry");
          } else {
            const travel = Math.hypot(b.x - b.ox, b.y - b.oy);
            const growBonus = b.grow ? 1 + Math.min(1, travel / 900) : 1;
            const damage = b.damage * growBonus;
            hurt(p, damage, b.owner, b.vx, b.vy);
            if (b.owner && b.owner.alive && b.owner.stats.lifesteal) {
              b.owner.hp = Math.min(b.owner.stats.maxHp, b.owner.hp + damage * b.owner.stats.lifesteal);
            }
            if (b.poison) {
              p.poisonTimer = Math.max(p.poisonTimer, 3);
              p.poisonDps = Math.max(p.poisonDps, (9 + b.damage * 0.1) * b.poison);
              p.poisonAttacker = b.owner;
            }
            if (b.burn) {
              p.burnTimer = Math.max(p.burnTimer, 2.5);
              p.burnDps = Math.max(p.burnDps, (8 + b.damage * 0.1) * b.burn);
              p.burnAttacker = b.owner;
            }
            if (b.chill) {
              p.chillTimer = Math.max(p.chillTimer, 2);
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
    if (best) {
      boltVisual(victim.x, victim.y, best.x, best.y, "#ffe95e", 0.22);
      hurt(best, damage * 0.55 * b.chain, b.owner, best.x - victim.x, best.y - victim.y);
      sfx("chain");
    } else {
      // duel fallback: the arc doubles back on the victim for a smaller zap
      boltVisual(victim.x, victim.y - 80, victim.x, victim.y, "#ffe95e", 0.18);
      hurtRaw(victim, damage * 0.25 * b.chain, b.owner);
      sfx("chain");
    }
  }

  function explodeBullet(b) {
    if (b.explosive) {
      fields.push({ type: "push", owner: b.owner, x: b.x, y: b.y, r: 95 + b.explosive * 20, life: 0.14, force: 760 });
      for (const p of players) {
        if (!p.alive || p === b.owner || b.hitIds.has(p.id)) continue;
        const radius = 105 + b.explosive * 12;
        const d = Math.hypot(p.x - b.x, p.y - b.y);
        if (d < radius) hurt(p, (1 - d / radius) * (26 + b.explosive * 9), b.owner, p.x - b.x, p.y - b.y);
      }
      world.shake = Math.max(world.shake, 9);
      sfx("boom");
    }
    if (b.shards && !b.isShard) {
      for (let i = 0; i < b.shards; i += 1) {
        const a = -Math.PI / 2 + (i - (b.shards - 1) / 2) * 0.55 + rand(-0.1, 0.1);
        bullets.push({
          owner: b.owner, x: b.x, y: b.y - 4, prevX: b.x, prevY: b.y, ox: b.x, oy: b.y,
          vx: Math.cos(a) * 520 + rand(-60, 60), vy: Math.sin(a) * 520,
          r: Math.max(4, b.r * 0.55), damage: b.damage * 0.4, life: 0.9,
          gravity: 1500, drag: 0.997, restitution: 0.6,
          bounces: 0, explosive: 0, homing: 0, pierce: 0,
          poison: b.poison, burn: b.burn, chill: 0, chain: 0, shards: 0, grow: 0,
          golden: false, isShard: true, hitIds: new Set(), color: b.color
        });
      }
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
  }

  function updateFields(dt) {
    for (const f of fields) {
      f.life -= dt;
      if (f.type === "lightning-warn") {
        if (f.life <= 0) resolveLightningStrike(f.x);
        continue;
      }
      for (const p of players) {
        if (!p.alive || p === f.owner) continue;
        const dx = p.x - f.x, dy = p.y - f.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < f.r) {
          const t = 1 - d / f.r;
          if (f.type === "blackhole") {
            p.vx += (dx / d) * f.force * t * dt;
            p.vy += (dy / d) * f.force * t * dt;
            hurtRaw(p, f.dps * t * dt, f.owner);
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

  // hurt with knockback, blockable
  // Touching a hazard hurts and launches the player clear rather than killing:
  // damage first (so guardian/revive rules still apply at low HP), then a hard
  // upward bounce away from the hazard, with a grace window so one dip into
  // lava reads as one hit.
  function hazardHit(p, h) {
    if (!p.alive || p.hazardGrace > 0 || p.spawnGrace > 0) return;
    p.hazardGrace = 0.9;
    hurtRaw(p, 25, null);
    if (!p.alive) return;
    const cx = h.x + h.w / 2;
    p.vy = -Math.max(980, Math.abs(p.vy) * 0.6 + 760);
    p.vx += (p.x < cx ? -1 : 1) * 180;
    p.y = Math.min(p.y, h.y - p.stats.radius * 0.35);
    sfx("hit");
    pulse(p, 0.4, 150);
    world.shake = Math.max(world.shake, 7);
    burst(p.x, p.y + p.stats.radius, currentLevel().palette.hazard || "#ff6a3d", 18, 420);
  }

  function hurt(p, amount, attacker, kx, ky) {
    if (!p.alive || p.blockTimer > 0 || p.spawnGrace > 0) return;
    const mag = Math.hypot(kx, ky) || 1;
    const kb = 1 - clamp(p.stats.kbResist, 0, 0.9);
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
    }
    applyDamage(p, amount, attacker);
  }

  // direct damage: no knockback, no thorns (used by DoTs, fields, thorns itself)
  function hurtRaw(p, amount, attacker) {
    if (!p.alive || p.spawnGrace > 0) return;
    applyDamage(p, amount, attacker);
  }

  function applyDamage(p, amount, attacker) {
    const lethal = p.hp - amount <= 0;
    if (lethal && p.guardianCharges > 0 && amount < 500) {
      p.guardianCharges -= 1;
      p.hp = p.stats.maxHp * 0.25;
      p.spawnGrace = Math.max(p.spawnGrace, 0.5);
      burst(p.x, p.y, "#ffd700", 36, 480);
      showToast(str("toast.guardianSave", { name: p.name }));
      sfx("mythic");
      return;
    }
    p.hp -= amount;
    if (p.hp <= 0) {
      if (p.roundRevives > 0) {
        p.roundRevives -= 1;
        p.hp = p.stats.maxHp * 0.5;
        p.spawnGrace = 0.75;
        p.vy = -760;
        showToast(str("toast.revive", { name: p.name }));
        burst(p.x, p.y, "#ff9e3d", 48, 620);
        sfx("mythic");
      } else {
        p.alive = false;
        p.hp = 0;
        burst(p.x, p.y, p.color, 70, 760);
        world.shake = Math.max(world.shake, 12);
        if (attacker) {
          pulse(attacker, 0.35, 130);
          if (attacker.stats.killHeal && attacker.alive) {
            attacker.hp = attacker.stats.maxHp;
            burst(attacker.x, attacker.y, "#74f08b", 24, 380);
          }
        }
      }
    }
  }

  function checkRoundEnd() {
    if (world.state !== "playing") return;
    const alive = players.filter(p => p.alive);
    if (alive.length === 1) endRound(alive[0]);
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
      if (d < bestD && d < 650) { bestD = d; best = p; }
    }
    return best;
  }

  function circleRect(c, r) {
    const cx = clamp(c.x, r.x, r.x + r.w);
    const cy = clamp(c.y, r.y, r.y + r.h);
    return Math.hypot(c.x - cx, c.y - cy) <= (c.r || (c.stats && c.stats.radius) || 0);
  }

  // ------------------------------------------------------------------- menus
  function updateMenuControls(pads) {
    const controls = visibleControls();
    if (!controls.length) return;
    world.menuIndex = clamp(world.menuIndex, 0, controls.length - 1);
    const nav = menuNav(pads);
    if (nav) {
      const focused = controls[world.menuIndex];
      const onValue = focused && (focused.matches("input[type='range']") || focused.matches("select"));
      // left/right tunes a slider or dropdown; anything else moves the cursor
      if (onValue && nav.x) adjustMenuControl(focused, nav.x);
      else moveFocusSpatial({ x: nav.x, y: nav.y }, controls);
    }
    if (menuConfirm(pads)) {
      const target = controls[world.menuIndex];
      if (target) {
        if (target.matches("input[type='checkbox']")) {
          target.checked = !target.checked;
          target.dispatchEvent(new Event("change"));
        } else if (!target.matches("select")) {
          target.click();
        }
      }
    }
    if (menuBack(pads)) {
      if (world.state === "settings") closePanel(settingsPanel);
      else if (world.state === "how") closePanel(howPanel);
      else if (world.state === "paused") togglePause(false);
    }
  }

  function visibleControls() {
    const panel = world.state === "settings" ? settingsPanel : world.state === "how" ? howPanel : world.state === "paused" ? pausePanel : menu;
    const roots = [panel];
    // the icon row is part of the menu and pause screens
    if (!iconBar.classList.contains("hidden")) roots.push(iconBar);
    const out = [];
    for (const root of roots) {
      for (const el of root.querySelectorAll("button, input, select")) {
        if (!el.disabled && el.offsetParent !== null) out.push(el);
      }
    }
    return out;
  }

  function setMenuIndex(index, controls = visibleControls()) {
    if (!controls.length) return;
    world.menuIndex = (index + controls.length) % controls.length;
    // clear the cursor everywhere: a panel we navigated away from would
    // otherwise keep a stale highlight on one of its hidden buttons
    for (const el of document.querySelectorAll(".controller-focus")) el.classList.remove("controller-focus");
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
    let best = -1, bestScore = Infinity;
    controls.forEach((el, i) => {
      if (el === current) return;
      const r = el.getBoundingClientRect();
      const vx = r.left + r.width / 2 - ax;
      const vy = r.top + r.height / 2 - ay;
      const along = vx * dir.x + vy * dir.y;
      if (along <= 6) return;                       // must lie that way
      const across = Math.abs(vx * -dir.y + vy * dir.x);
      if (across > along * 2 + 90) return;          // and roughly in line
      const score = along + across * 2.2;
      if (score < bestScore) { bestScore = score; best = i; }
    });
    if (best >= 0) setMenuIndex(best, controls);
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
    if (world.state === "menu") {
      // In the lobby A locks your character first; once you're ready it confirms
      // the focused button. Start always confirms.
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
      el.selectedIndex = clamp(el.selectedIndex + dir, 0, el.options.length - 1);
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
      duckMusic(true);
      sfx("card");
    } else if (!shouldPause && world.state === "paused") {
      world.state = "playing";
      pausePanel.classList.add("hidden");
      duckMusic(false);
    }
  }

  function duckMusic(quiet) {
    world.musicDucked = quiet;
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
    hud.innerHTML = "";
    hudRefs = [];
    duckMusic(false);
    setMusicContext("menu");
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
          `<span style="--rcol:${RARITIES[c.rarity].color}">${c.name}</span>`).join("") +
          (p.cards.length > 3 ? `<span class="more">${escapeHtml(str("hud.more", { count: p.cards.length - 3 }))}</span>` : "") ||
          `<span class="none">${escapeHtml(str("hud.noCards"))}</span>`;
      }
      const activeReady = p.stats.active && p.activeCooldown <= 0;
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
      drawBullets();
      drawPlayersAll();
      drawTide(level);
      drawParticles();
      drawBoltsAll();
      if (world.lightningFlash > 0) {
        ctx.fillStyle = `rgba(255,244,200,${world.lightningFlash * 1.4})`;
        ctx.fillRect(0, 0, world.width, world.height);
      }
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

  function drawPlatforms(level) {
    const pal = level.palette;
    const t = world.time;
    for (const p of level.platforms) {
      const alpha = phaseAlpha(p, t);
      drawPlatform(p, pal, alpha, p.ice, p.conveyor);
    }
    for (const m of level.movers || []) {
      const ph = (m.phase || 0) * Math.PI * 2;
      const s = (Math.sin((t / m.period) * Math.PI * 2 + ph) + 1) / 2;
      drawPlatform({ ...m, x: m.x + m.dx * s, y: m.y + m.dy * s }, pal, 1, m.ice, m.conveyor, true);
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

  function drawHazard(h, pal) {
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
  function drawPlayersAll() {
    for (const p of players) {
      if (!p.alive) continue;
      const r = p.stats.radius;
      ctx.save();
      ctx.translate(p.x, p.y);

      // shadow
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.beginPath();
      ctx.ellipse(0, r + 9, r * 0.95, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // body (the lean is cosmetic, so the gauges below stay upright)
      ctx.save();
      ctx.rotate(clamp(p.vx / 1400, -0.4, 0.4));
      drawCharacter(ctx, p.character, r, {
        t: world.time + p.botSeed,
        aimX: p.aimX, aimY: p.aimY, facing: p.facing,
        blink: p.blinkClock % 4 > 3.8
      });
      if (p.chillTimer > 0) {
        ctx.fillStyle = "rgba(140,220,255,0.3)";
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      }
      if (p.burnTimer > 0) {
        ctx.fillStyle = "rgba(255,120,40,0.22)";
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();

      drawHealthRing(p, r);
      drawAmmoPips(p, r);

      if (p.blockTimer > 0 || p.spawnGrace > 0) {
        ctx.strokeStyle = p.blockTimer > 0 ? "#ffffff" : "rgba(255,255,255,0.45)";
        ctx.lineWidth = p.blockTimer > 0 ? 7 : 3;
        ctx.beginPath();
        ctx.arc(0, 0, r + 15 + Math.sin(performance.now() / 45) * 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      // active ability ready
      if (p.stats.active && p.activeCooldown <= 0) {
        ctx.strokeStyle = "rgba(255,77,143,0.8)";
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 8]);
        ctx.lineDashOffset = -world.time * 40;
        ctx.beginPath();
        ctx.arc(0, 0, r + 21, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();

      // name tag
      ctx.fillStyle = hexAlpha(p.color, 0.9);
      ctx.font = "700 15px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(p.name, p.x, p.y - r - 24);
    }
  }

  // Health reads as a ring hugging the fighter: a dark track with the player's
  // colour drawn clockwise from the top, so a glance at the body tells you both
  // who they are and how close they are to going down.
  function drawHealthRing(p, r) {
    const ringR = r + 8;
    const frac = clamp(p.hp / p.stats.maxHp, 0, 1);
    ctx.lineWidth = 5;
    ctx.lineCap = "butt";
    ctx.strokeStyle = "rgba(10,8,18,0.55)";
    ctx.beginPath();
    ctx.arc(0, 0, ringR, 0, Math.PI * 2);
    ctx.stroke();
    if (frac <= 0) return;
    // the last sliver flashes so a nearly-dead fighter is unmissable
    const low = frac < 0.28;
    ctx.strokeStyle = low
      ? `rgba(255,90,110,${0.72 + 0.28 * Math.abs(Math.sin(world.time * 9))})`
      : p.color;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(0, 0, ringR, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.stroke();
    ctx.lineCap = "butt";
  }

  // Ammo sits on the weapon side as a little fan of rounds that empties as you
  // fire; while reloading the fan refills left-to-right.
  function drawAmmoPips(p, r) {
    const n = Math.max(1, Math.round(p.stats.maxAmmo));
    if (n > 14) return;                       // absurd magazines would ring the body
    const aim = Math.atan2(p.aimY, p.aimX);
    const step = Math.min(0.19, 1.5 / n);
    const pipR = r + 20;
    const reloading = p.reloadTimer > 0;
    const filled = reloading
      ? (1 - clamp(p.reloadTimer / Math.max(0.01, p.stats.reload), 0, 1)) * n
      : p.ammo;
    for (let i = 0; i < n; i += 1) {
      const a = aim + (i - (n - 1) / 2) * step;
      const x = Math.cos(a) * pipR;
      const y = Math.sin(a) * pipR;
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

  function drawBullets() {
    for (const b of bullets) {
      ctx.save();
      if (b.golden) {
        ctx.shadowColor = "#ffd700";
        ctx.shadowBlur = 16;
      }
      if (b.meteor) {
        ctx.shadowColor = "#ff9e3d";
        ctx.shadowBlur = 20;
      }
      ctx.fillStyle = b.color;
      ctx.strokeStyle = "#15121c";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (b.homing) {
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r + 5, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawFields() {
    for (const f of fields) {
      if (f.type === "lightning-warn") continue;
      if (f.type === "blackhole") {
        const a = clamp(f.life / 3, 0, 1);
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(world.time * 3);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, f.r * 0.6);
        g.addColorStop(0, "rgba(10,5,20,0.95)");
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

  function boltVisual(x1, y1, x2, y2, color, life) {
    const points = [];
    const segs = 8;
    for (let i = 0; i <= segs; i += 1) {
      const t = i / segs;
      points.push({
        x: x1 + (x2 - x1) * t + (i > 0 && i < segs ? rand(-26, 26) : 0),
        y: y1 + (y2 - y1) * t + (i > 0 && i < segs ? rand(-26, 26) : 0)
      });
    }
    bolts.push({ points, life, maxLife: life, color });
  }

  function updateBolts(dt) {
    for (const b of bolts) b.life -= dt;
    bolts = bolts.filter(b => b.life > 0);
  }

  function drawBoltsAll() {
    for (const b of bolts) {
      const a = clamp(b.life / b.maxLife, 0, 1);
      ctx.strokeStyle = hexAlpha(b.color, a);
      ctx.lineWidth = 4 * a + 1;
      ctx.lineJoin = "round";
      ctx.beginPath();
      b.points.forEach((pt, i) => i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
      ctx.stroke();
    }
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
    for (const p of particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 360 * dt;
    }
    particles = particles.filter(p => p.life > 0);
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
    return settings.musicVolume * (world.musicDucked ? 0.22 : 1);
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
    const next = wrapTrack(index + 1);
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
    if (musicState.context === "battle") playTrack(randomBattleTrack());
    else playTrack(musicState.index, true);
  }

  // Any track except the title theme, and never the one just played.
  function randomBattleTrack() {
    const pool = [];
    for (let i = 0; i < MUSIC.tracks.length; i++) {
      if (i === MUSIC.titleIndex) continue;
      if (i === musicState.index) continue;
      pool.push(i);
    }
    if (!pool.length) return wrapTrack(MUSIC.titleIndex + 1);
    return pool[Math.floor(Math.random() * pool.length)];
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
    applyMusicVolume();
    renderNowPlaying();
    if (settings.music) musicAudio.play().catch(() => {});
    warmNextTrack(index);
  }

  // "menu" keeps the title theme; "battle" rolls a fresh non-title track.
  function setMusicContext(context) {
    const changed = musicState.context !== context;
    musicState.context = context;
    if (context === "battle") { playTrack(randomBattleTrack()); return; }
    if (changed || !musicState.started) playTrack(MUSIC.titleIndex);
    else startMusic();
  }

  function skipTrack(step) {
    ensureAudio();
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
    else if (name === "bounce") { tone(240, 0.12, "sine", 0.09, now, 620); }
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
    titleScreen.addEventListener("pointerdown", () => startFromTitle(true));

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

  async function enterFullscreen() {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    } catch {
      showToast(str("toast.fullscreenBlocked"));
    }
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      showToast("Fullscreen is blocked by this browser");
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
      startFromTitle(true);
      e.preventDefault();
      return;
    }
    if (e.code === "KeyM") toggleMusic();
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Enter", "NumpadEnter", "Slash"].includes(e.code)) e.preventDefault();
  });
  addEventListener("keyup", e => keys.delete(e.code));
  addEventListener("blur", () => { keys.clear(); pressed.clear(); });
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

  applyStrings();
  bindUi();
  renderLobby();
  syncMusicButtons();
  renderNowPlaying();
  requestAnimationFrame(tick);
})();
