// ===========================================================================
// Rounders — UI TEXT CONFIG
// ===========================================================================
// Every piece of text shown on the menus and during a match lives here, so all
// wording can be tuned in one place. Edit the right-hand side of any line and
// reload — nothing else needs to change.
//
//  • {braces} are placeholders the game fills in (e.g. {name}, {arena}).
//  • Entries ending in "Html" may contain HTML tags such as <b> or <kbd>.
//  • Character names/blurbs live in js/characters.js, card text in js/cards.js
//    and arena names in js/levels.js — those are content data, not UI chrome.
// ===========================================================================
(() => {
  "use strict";
  window.ROUNDERS = window.ROUNDERS || {};

  window.ROUNDERS.STRINGS = {

    // ---------------------------------------------------------------- TITLE
    title: {
      eyebrow: "1–8 player arena brawler",
      tagline: "Round shooters. Power cards. Arenas with attitude.",
      pressStart: "PRESS START"
    },

    // ------------------------------------------------------- CHARACTER SELECT
    menu: {
      eyebrow: "1–8 player arena brawler",
      tagline: "Losers power-up, winners sweat. Last dot standing takes the round.",

      // shown inside an empty slot
      slotJoinPrompt: "Press A to join",
      slotOpenTitle: "Open Slot",

      // shown inside a taken slot
      slotChoosing: "◀ ▶ choose · shoot to lock in",
      slotReady: "✓ Ready",
      slotBot: "Bot",
      botRemove: "✕ remove",

      // second line on every empty slot except the first (hidden in co-op)
      slotBotPrompt: "(Y to add bot)",
      slotEvil: "Evil Bot",

      // appears once two or more fighters are in
      startMatch: "Start Match",

      lobbyFull: "Lobby is full",
      needPlayers: "Need at least 2 fighters — join up or add a bot"
    },

    // ------------------------------------------------------------ ICON BUTTONS
    // Tooltips / screen-reader labels for the icon row in the bottom right.
    icons: {
      instructions: "How to Play",
      soundOn: "Sound on — click to mute",
      soundOff: "Sound muted — click to unmute",
      settings: "Settings",
      fullscreen: "Fullscreen"
    },

    // ---------------------------------------------------------------- PAUSE
    pause: {
      title: "Game Paused",
      resume: "Resume",
      settings: "Settings",
      quit: "Quit to Menu"
    },

    // -------------------------------------------------------------- SETTINGS
    settings: {
      title: "Settings",
      groupMatch: "Match",
      groupCards: "Choose Cards",
      groupRarity: "Card Rarity Rates",
      groupVisuals: "Visuals",
      groupFeel: "Feel",
      arena: "Arena",
      arenaRandom: "🎲 Random every round",
      scoreLimit: "Rounds to Win",
      draftCount: "Cards Per Draft",
      botDifficulty: "Bot Difficulty",
      coop: "Cooperative Mode",
      proceduralCharacters: "Use Procedural Characters",
      haptics: "Controller Haptics",
      screenShake: "Screen Shake",
      musicVolume: "Music Volume",
      common: "Common",
      uncommon: "Uncommon",
      rare: "Rare",
      epic: "Epic",
      legendary: "Legendary",
      mythic: "Mythic",
      difficultyEasy: "Easy",
      difficultyNormal: "Normal",
      difficultyHard: "Hard",
      back: "Back",

      // ---- Choose Cards (the button row + the card grid window)
      chooseCards: "Choose Cards…",
      reset: "Reset",
      cardsTitle: "Choose Cards",
      cardCount: "{on} of {total} cards enabled",
      cardNoneWarning: "Nothing is enabled — drafts fall back to the full set.",
      cardsAll: "All",
      cardsNone: "None",
      cardsInvert: "Invert",
      cardPickerHintHtml: "<b>A</b> / click toggles a card · <b>X</b> or a rarity heading toggles that whole rarity · <b>LB</b> <b>RB</b> jump between rarities · hold a direction to move fast",
      rarityToggle: "{rarity} — {on}/{total}",
      rarityHint: "toggles this whole rarity on or off"
    },

    // ----------------------------------------------------------- HOW TO PLAY
    how: {
      title: "How to Play",
      back: "Back",

      // labels on the controller diagram
      padTriggersLeft: "LT / LB",
      padTriggersLeftUse: " — Block",
      padStickLeft: "Left stick",
      padStickLeftUse: " — Move",
      padDpad: "D-pad",
      padDpadUse: " — Navigate",
      padTriggersRight: "RT / RB",
      padTriggersRightUse: " — Shoot",
      padB: "B",
      padBUse: " — Block · Back",
      padA: "A",
      padAUse: " — Jump · Confirm",
      padY: "Y",
      padYUse: " — Mythic ability",
      padStickRight: "Right stick",
      padStickRightUse: " — Aim",
      padView: "⧉ View",
      padViewUse: " — Back",
      padMenu: "☰ Menu",
      padMenuUse: " — Pause · Confirm",
      padNoteHtml: "Hold <tspan class=\"k\">LT / LB / B</tspan> to block · <tspan class=\"k\">Y</tspan> fires your Mythic ability when the pink ring is spinning",

      joiningTitle: "Joining",
      joiningHtml: "Any controller button takes a slot. On the keyboard, <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> joins as player 1 and the <kbd>◀</kbd><kbd>▲</kbd><kbd>▼</kbd><kbd>▶</kbd> arrow keys join as player 2. Then <kbd>◀</kbd> <kbd>▶</kbd> picks your fighter, shoot or <b>A</b> locks in, <b>B</b> un-readies.",

      keyboard1Title: "Keyboard 1",
      keyboard1Html: "<kbd>A</kbd><kbd>D</kbd> move · <kbd>W</kbd> jump · <kbd>F</kbd> shoot · <kbd>G</kbd> block",
      keyboard2Title: "Keyboard 2",
      keyboard2Html: "<kbd>◀</kbd><kbd>▶</kbd> move · <kbd>▲</kbd> jump · <kbd>/</kbd> shoot · <kbd>.</kbd> block",

      loopTitle: "The Loop",
      loopHtml: "Last one standing wins the round. The players furthest behind draft a power card — at the same time, and every screen that locks in folds away so the ones still choosing take the space. With three or more fighters the round's runner-up is offered <b>Photo Finish</b> in place of one of their cards: half a round win, banked on the spot. First to the score limit takes the match.",

      blockingTitle: "Blocking",
      blockingHtml: "A well-timed block reflects bullets back at the shooter. Cards can make blocks dash, teleport, echo, or explode.",

      wallTitle: "Wall Jumping",
      wallHtml: "Jump while touching a wall to kick off it — up and away. Wall kicks are free (they don't spend an air jump), so you can climb a wall by steering back into it and jumping again. Sliding down a wall is slowed too, giving you time to line the next kick up.",

      pausingTitle: "Pausing",
      pausingHtml: "<kbd>Esc</kbd>, <kbd>P</kbd> or the <b>Menu</b> button pauses. From there you can resume, open settings, or quit to the menu.",

      menusTitle: "Menus",
      menusHtml: "Every menu is controller-driven. The <b>D-pad</b> moves between controls (and scrolls a long panel), <b>A</b> confirms, <b>B</b> goes back. On a dropdown, <b>◀</b> <b>▶</b> cycle the value and <b>A</b> steps it. <b>LB</b> / <b>RB</b> cycle through the corner icons — how to play, sound, settings, fullscreen — and stepping off either end drops the selection again."
    },

    // ---------------------------------------------------------------- DRAFT
    draft: {
      titleSolo: "{name} drafts",
      titleMulti: "Draft — {count} picking at once",
      autoPick: "{title} — auto-pick in {seconds}s",
      rowPrompt: "◀ ▶ browse · shoot to pick",
      rowLocked: "Locked in!",
      picked: "{name} picked {card}"
    },

    // ------------------------------------------------------- ROUNDS & MATCH
    round: {
      kicker: "Round {number}",
      winner: "{name} wins the round",
      winnerTeam: "{team} win the round",
      teamPlayers: "The Players",
      teamEvil: "The Evil Bots",
      subSolo: "{name} drafts a new power…",
      subMulti: "The fallen draft new powers…",
      subTwo: "The two furthest behind draft new powers…",
      subRunnerUp: "{name} came second — half a round win is on the table…",
      subEvil: "The Evil Bots grow stronger…",
      ready: "READY",
      fight: "FIGHT!",
      matchWon: "{name} takes the match! Enter / Start for rematch.",
      matchWonTeam: "{team} take the match! Enter / Start for rematch.",
      victory: "VICTORY",
      championName: "{name} WINS",
      championTeam: "{team} WIN",
      championSub: "Champion of the arena — Enter / Start for a rematch",
      nobodySurvived: "Nobody survived. Rerolling the arena…"
    },

    // ------------------------------------------------------------- IN MATCH
    hud: {
      score: "★ {score}/{limit}",
      reloading: "reloading…",
      noCards: "no cards yet",
      more: "+{count}"
    },

    // --------------------------------------------------------------- TOASTS
    toast: {
      controllerDetected: "{name} detected — press a button to join",
      controllerReconnected: "Controller reconnected — welcome back, {name}",
      controllerLost: "Controller disconnected",
      fullscreenBlocked: "This browser blocked fullscreen",
      soundOn: "Sound on",
      soundOff: "Sound muted",
      guardianSave: "{name}'s Guardian Halo saves them!",
      revive: "{name} rises from the ashes!",
      starfall: "{name} calls STARFALL PROTOCOL",
      eventHorizon: "{name} opens the EVENT HORIZON",
      chronoshift: "{name} rewinds with CHRONOSHIFT"
    }
  };

  // str("menu.startMatch") → "Start Match"
  // str("draft.picked", { name: "Vex", card: "Cannonball" })
  window.ROUNDERS.str = function str(path, vars) {
    let value = path.split(".").reduce((o, k) => (o == null ? o : o[k]), window.ROUNDERS.STRINGS);
    if (typeof value !== "string") return path;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) value = value.split(`{${k}}`).join(String(v));
    }
    return value;
  };
})();
