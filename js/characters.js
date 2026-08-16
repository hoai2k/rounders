// Rounders — 12 playable characters. All roughly circular with a signature
// weapon sticking out. Fully procedural rendering (crest + face + weapon), with
// automatic upgrade to generated art at assets/images/characters/<id>.png.
(() => {
  "use strict";
  window.ROUNDERS = window.ROUNDERS || {};

  // crest: shape drawn on top of the body. weapon: barrel style. eyes: expression.
  const CHARACTERS = [
    { id: "pip", name: "Pip", title: "the cheerful rookie", blurb: "Wide-eyed, cork-loaded, unreasonably optimistic.",
      color: "#ff9838", dark: "#c96a12", accent: "#7ed957", crest: "sprout", eyes: "wide", weapon: "peashooter" },
    { id: "bolt", name: "Bolt", title: "the livewire", blurb: "Runs on static, excitement, and poor impulse control.",
      color: "#3fa8ff", dark: "#1d6fc0", accent: "#ffe14d", crest: "bolt", eyes: "wink", weapon: "tesla" },
    { id: "mochi", name: "Mochi", title: "the soft menace", blurb: "Looks like dessert. Fights like a landlord.",
      color: "#ffa8c8", dark: "#d76a95", accent: "#fff0f6", crest: "ears", eyes: "smug", weapon: "bubble" },
    { id: "gruff", name: "Gruff", title: "the old guard", blurb: "Has seen every trick. Invented several of them.",
      color: "#647d3f", dark: "#3d4d26", accent: "#c9a86a", crest: "horns", eyes: "stern", weapon: "blunderbuss" },
    { id: "nova", name: "Nova", title: "the star child", blurb: "Speaks softly and carries a small supernova.",
      color: "#8a5cf5", dark: "#5a35b8", accent: "#ffd9fb", crest: "visor", eyes: "calm", weapon: "raygun" },
    { id: "fizz", name: "Fizz", title: "the shaken soda", blurb: "Do not shake. Too late. Way too late.",
      color: "#8fdc3f", dark: "#5aa31d", accent: "#eaffd0", crest: "cap", eyes: "dizzy", weapon: "spray" },
    { id: "ember", name: "Ember", title: "the hothead", blurb: "Every problem looks flammable if you squint.",
      color: "#ff5540", dark: "#b82a1c", accent: "#ffd166", crest: "flame", eyes: "fierce", weapon: "flare" },
    { id: "glacia", name: "Glacia", title: "the cold shoulder", blurb: "Chill until provoked. Then absolute zero.",
      color: "#bfe7ff", dark: "#6fa8cc", accent: "#eaf9ff", crest: "icicles", eyes: "halflid", weapon: "frost" },
    { id: "shade", name: "Shade", title: "the silent bet", blurb: "You won't hear the shot. You'll hear the scoreboard.",
      color: "#4a4a5e", dark: "#26262f", accent: "#8f7bff", crest: "band", eyes: "slit", weapon: "kunai" },
    { id: "duke", name: "Duke", title: "the dueling dandy", blurb: "Duels at dawn, brunch at nine.",
      color: "#f2e2b8", dark: "#c0a35e", accent: "#caa43c", crest: "tophat", eyes: "monocle", weapon: "longrifle" },
    { id: "sprocket", name: "Sprocket", title: "the wind-up wonder", blurb: "Fully wound and warranty-void.",
      color: "#b5642c", dark: "#6e3a14", accent: "#ffd98f", crest: "key", eyes: "led", weapon: "rivet" },
    { id: "luna", name: "Luna", title: "the moth queen", blurb: "Drawn to victory like it's the last lit lamp.",
      color: "#3fc9b0", dark: "#238a77", accent: "#d7c2ff", crest: "antennae", eyes: "glow", weapon: "prism" }
  ];

  const images = new Map();
  for (const ch of CHARACTERS) {
    const img = new Image();
    img.onload = () => images.set(ch.id, img);
    img.onerror = () => {};
    img.src = `assets/images/characters/${ch.id}.png`;
  }

  function hasImage(id) { return images.has(id); }
  function getImage(id) { return images.get(id) || null; }

  // Draws the character centered at (0,0) with body radius r.
  // opts: { t (seconds), aimX, aimY, blink (bool), color (override body color) }
  function drawCharacter(ctx, ch, r, opts = {}) {
    const t = opts.t || 0;
    const aimX = opts.aimX ?? 1;
    const aimY = opts.aimY ?? 0;
    const body = opts.color || ch.color;
    const wob = Math.sin(t * 8.5) * r * 0.04;

    const img = images.get(ch.id);
    if (img && opts.useImage !== false) {
      const s = r * 2.5;
      ctx.save();
      if (aimX < 0) ctx.scale(-1, 1);
      ctx.drawImage(img, -s / 2, -s / 2 + wob, s, s);
      ctx.restore();
      return;
    }

    // --- body (weapon and face drawn on top)
    ctx.save();
    ctx.fillStyle = body;
    ctx.strokeStyle = "#1c1a24";
    ctx.lineWidth = Math.max(3, r * 0.16);
    ctx.beginPath();
    ctx.ellipse(0, wob, r * 0.98, r * 1.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // sheen
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.beginPath();
    ctx.ellipse(-r * 0.32, -r * 0.42 + wob, r * 0.32, r * 0.2, -0.5, 0, Math.PI * 2);
    ctx.fill();
    // belly shade
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.beginPath();
    ctx.ellipse(0, r * 0.55 + wob, r * 0.62, r * 0.3, 0, 0, Math.PI);
    ctx.fill();

    drawCrest(ctx, ch, r, t, wob);
    drawWeapon(ctx, ch, r, aimX, aimY);
    drawFace(ctx, ch, r, aimX, aimY, wob, opts.blink);
    ctx.restore();
  }

  function drawCrest(ctx, ch, r, t, wob) {
    const a = ch.accent, d = ch.dark;
    ctx.save();
    ctx.translate(0, wob);
    ctx.lineWidth = Math.max(2.5, r * 0.1);
    ctx.strokeStyle = "#1c1a24";
    switch (ch.crest) {
      case "sprout": {
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.95);
        ctx.quadraticCurveTo(r * 0.05, -r * 1.3, r * 0.02, -r * 1.35);
        ctx.stroke();
        ctx.fillStyle = a;
        leaf(ctx, r * 0.02, -r * 1.38, r * 0.34, -0.7); ctx.fill(); ctx.stroke();
        leaf(ctx, r * 0.02, -r * 1.38, r * 0.3, 2.4); ctx.fill(); ctx.stroke();
        break;
      }
      case "bolt": {
        ctx.fillStyle = a;
        ctx.beginPath();
        ctx.moveTo(-r * 0.1, -r * 1.45); ctx.lineTo(r * 0.24, -r * 1.28); ctx.lineTo(r * 0.02, -r * 1.18);
        ctx.lineTo(r * 0.3, -r * 0.9); ctx.lineTo(-r * 0.18, -r * 1.05); ctx.lineTo(0, -r * 1.18);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      }
      case "ears": {
        ctx.fillStyle = ch.color;
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(s * r * 0.3, -r * 0.85);
          ctx.lineTo(s * r * 0.72, -r * 1.35);
          ctx.lineTo(s * r * 0.82, -r * 0.72);
          ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = a;
          ctx.beginPath();
          ctx.moveTo(s * r * 0.44, -r * 0.9);
          ctx.lineTo(s * r * 0.66, -r * 1.18);
          ctx.lineTo(s * r * 0.7, -r * 0.82);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = ch.color;
        }
        break;
      }
      case "horns": {
        ctx.fillStyle = a;
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(s * r * 0.45, -r * 0.75);
          ctx.quadraticCurveTo(s * r * 1.2, -r * 1.05, s * r * 1.05, -r * 0.35);
          ctx.quadraticCurveTo(s * r * 0.95, -r * 0.7, s * r * 0.58, -r * 0.52);
          ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        break;
      }
      case "visor": {
        ctx.fillStyle = "rgba(255,217,251,0.65)";
        star(ctx, 0, -r * 0.28, r * 0.85, r * 0.45, 5, t * 0.4);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = r * 0.05;
        ctx.stroke();
        break;
      }
      case "cap": {
        ctx.fillStyle = "#e8e8e8";
        ctx.beginPath();
        ctx.ellipse(0, -r * 1.02, r * 0.5, r * 0.16, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = ch.dark;
        ctx.fillRect(-r * 0.5, -r * 1.2, r, r * 0.18);
        ctx.strokeRect(-r * 0.5, -r * 1.2, r, r * 0.18);
        // bubbles inside
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        for (let i = 0; i < 4; i += 1) {
          const bx = Math.sin(t * 1.6 + i * 2.1) * r * 0.4;
          const by = ((t * 0.35 + i * 0.27) % 1) * -r * 1.1 + r * 0.6;
          ctx.beginPath(); ctx.arc(bx, by, r * (0.06 + (i % 3) * 0.03), 0, Math.PI * 2); ctx.fill();
        }
        break;
      }
      case "flame": {
        const f = 1 + Math.sin(t * 11) * 0.08;
        ctx.fillStyle = a;
        ctx.beginPath();
        ctx.moveTo(-r * 0.32, -r * 0.82);
        ctx.quadraticCurveTo(-r * 0.25, -r * 1.5 * f, 0, -r * 1.15);
        ctx.quadraticCurveTo(r * 0.12, -r * 1.65 * f, r * 0.26, -r * 1.05);
        ctx.quadraticCurveTo(r * 0.42, -r * 1.3 * f, r * 0.38, -r * 0.78);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#ff5540";
        ctx.beginPath();
        ctx.moveTo(-r * 0.12, -r * 0.85);
        ctx.quadraticCurveTo(-r * 0.05, -r * 1.25 * f, r * 0.1, -r * 0.85);
        ctx.closePath(); ctx.fill();
        break;
      }
      case "icicles": {
        ctx.fillStyle = "#eaf9ff";
        for (const [sx, h] of [[-0.5, 0.35], [-0.2, 0.55], [0.12, 0.42], [0.42, 0.3]]) {
          ctx.beginPath();
          ctx.moveTo(sx * r - r * 0.12, -r * 0.85);
          ctx.lineTo(sx * r, -r * (0.85 + h));
          ctx.lineTo(sx * r + r * 0.12, -r * 0.85);
          ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        break;
      }
      case "band": {
        ctx.fillStyle = ch.dark;
        ctx.fillRect(-r * 0.95, -r * 0.55, r * 1.9, r * 0.26);
        ctx.strokeRect(-r * 0.95, -r * 0.55, r * 1.9, r * 0.26);
        // tails
        ctx.fillStyle = ch.dark;
        ctx.beginPath();
        ctx.moveTo(-r * 0.9, -r * 0.45);
        ctx.quadraticCurveTo(-r * 1.5, -r * 0.2 + Math.sin(t * 4) * r * 0.1, -r * 1.35, r * 0.15);
        ctx.lineTo(-r * 1.1, -r * 0.05);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      }
      case "tophat": {
        ctx.fillStyle = "#26262f";
        ctx.beginPath();
        ctx.ellipse(0, -r * 0.92, r * 0.62, r * 0.14, -0.06, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.fillRect(-r * 0.38, -r * 1.5, r * 0.76, r * 0.6);
        ctx.strokeRect(-r * 0.38, -r * 1.5, r * 0.76, r * 0.6);
        ctx.fillStyle = ch.accent;
        ctx.fillRect(-r * 0.38, -r * 1.06, r * 0.76, r * 0.14);
        break;
      }
      case "key": {
        ctx.save();
        ctx.translate(0, -r * 1.25);
        ctx.rotate(t * 2.2);
        ctx.strokeStyle = "#1c1a24";
        ctx.fillStyle = a;
        ctx.fillRect(-r * 0.08, -r * 0.05, r * 0.16, r * 0.45);
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.ellipse(s * r * 0.28, 0, r * 0.24, r * 0.13, 0, 0, Math.PI * 2);
          ctx.fill(); ctx.stroke();
        }
        ctx.restore();
        ctx.beginPath(); ctx.moveTo(0, -r * 0.85); ctx.lineTo(0, -r * 1.1); ctx.stroke();
        break;
      }
      case "antennae": {
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(s * r * 0.2, -r * 0.9);
          ctx.quadraticCurveTo(s * r * 0.55, -r * 1.5, s * r * 0.85, -r * 1.35 + Math.sin(t * 3 + s) * r * 0.06);
          ctx.stroke();
          ctx.fillStyle = a;
          ctx.beginPath();
          ctx.arc(s * r * 0.85, -r * 1.35 + Math.sin(t * 3 + s) * r * 0.06, r * 0.12, 0, Math.PI * 2);
          ctx.fill(); ctx.stroke();
        }
        // small wings
        ctx.fillStyle = "rgba(215,194,255,0.55)";
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.ellipse(s * r * 0.9, -r * 0.1, r * 0.42, r * 0.72, s * (0.5 + Math.sin(t * 9) * 0.12), 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
    }
    ctx.restore();
  }

  function drawFace(ctx, ch, r, aimX, aimY, wob, blink) {
    const fx = aimX * r * 0.16, fy = aimY * r * 0.14 + wob;
    ctx.save();
    ctx.translate(fx, fy);
    const eye = (x, open = 1, w = r * 0.18) => {
      ctx.fillStyle = "#1c1a24";
      ctx.beginPath();
      ctx.ellipse(x, -r * 0.22, w * 0.5, Math.max(r * 0.02, r * 0.24 * open * 0.5), 0, 0, Math.PI * 2);
      ctx.fill();
      if (open > 0.4) {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(x + w * 0.12, -r * 0.28, r * 0.045, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    const b = blink ? 0.08 : 1;
    switch (ch.eyes) {
      case "wide": eye(-r * 0.3, b, r * 0.24); eye(r * 0.3, b, r * 0.24); smile(ctx, r, 0.5); break;
      case "wink": eye(-r * 0.3, b); eye(r * 0.3, 0.12); smile(ctx, r, 0.6); break;
      case "smug": eye(-r * 0.3, b * 0.55); eye(r * 0.3, b * 0.55); smile(ctx, r, 0.35, r * 0.14); break;
      case "stern": brow(ctx, -r * 0.3, r, 0.24); brow(ctx, r * 0.3, r, -0.24); eye(-r * 0.3, b * 0.7); eye(r * 0.3, b * 0.7); frown(ctx, r); break;
      case "calm": eye(-r * 0.3, b * 0.8); eye(r * 0.3, b * 0.8); smile(ctx, r, 0.4); break;
      case "dizzy": spiralEye(ctx, -r * 0.3, r); spiralEye(ctx, r * 0.3, r); smile(ctx, r, 0.7); break;
      case "fierce": brow(ctx, -r * 0.3, r, 0.35); brow(ctx, r * 0.3, r, -0.35); eye(-r * 0.3, b); eye(r * 0.3, b); grin(ctx, r); break;
      case "halflid": eye(-r * 0.3, b * 0.5); eye(r * 0.3, b * 0.5); flat(ctx, r); break;
      case "slit": {
        ctx.fillStyle = ch.accent;
        ctx.beginPath();
        ctx.ellipse(-r * 0.28, -r * 0.22, r * 0.16, r * 0.05, 0, 0, Math.PI * 2);
        ctx.ellipse(r * 0.28, -r * 0.22, r * 0.16, r * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "monocle": {
        eye(-r * 0.3, b * 0.8); eye(r * 0.3, b);
        ctx.strokeStyle = "#caa43c";
        ctx.lineWidth = r * 0.06;
        ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.22, r * 0.24, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(r * 0.5, -r * 0.1); ctx.lineTo(r * 0.56, r * 0.2); ctx.stroke();
        mustache(ctx, r); break;
      }
      case "led": {
        ctx.fillStyle = ch.accent;
        ctx.fillRect(-r * 0.42, -r * 0.34, r * 0.26, r * 0.22);
        ctx.fillRect(r * 0.16, -r * 0.34, r * 0.26, r * 0.22);
        ctx.strokeStyle = "#1c1a24"; ctx.lineWidth = r * 0.05;
        ctx.strokeRect(-r * 0.42, -r * 0.34, r * 0.26, r * 0.22);
        ctx.strokeRect(r * 0.16, -r * 0.34, r * 0.26, r * 0.22);
        smile(ctx, r, 0.45); break;
      }
      case "glow": {
        ctx.fillStyle = ch.accent;
        ctx.shadowColor = ch.accent; ctx.shadowBlur = r * 0.3;
        ctx.beginPath();
        ctx.arc(-r * 0.28, -r * 0.22, r * 0.11 * b + r * 0.01, 0, Math.PI * 2);
        ctx.arc(r * 0.28, -r * 0.22, r * 0.11 * b + r * 0.01, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        smile(ctx, r, 0.4); break;
      }
      default: eye(-r * 0.3, b); eye(r * 0.3, b); smile(ctx, r, 0.5);
    }
    ctx.restore();
  }

  function smile(ctx, r, k, offset = 0) {
    ctx.strokeStyle = "#1c1a24";
    ctx.lineWidth = Math.max(2, r * 0.08);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(offset, r * 0.1, r * 0.3, Math.PI * (0.5 - k / 2), Math.PI * (0.5 + k / 2));
    ctx.stroke();
  }
  function frown(ctx, r) {
    ctx.strokeStyle = "#1c1a24"; ctx.lineWidth = Math.max(2, r * 0.08); ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(0, r * 0.45, r * 0.28, Math.PI * 1.25, Math.PI * 1.75); ctx.stroke();
  }
  function flat(ctx, r) {
    ctx.strokeStyle = "#1c1a24"; ctx.lineWidth = Math.max(2, r * 0.08); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-r * 0.14, r * 0.24); ctx.lineTo(r * 0.14, r * 0.24); ctx.stroke();
  }
  function grin(ctx, r) {
    ctx.fillStyle = "#1c1a24";
    ctx.beginPath(); ctx.arc(0, r * 0.14, r * 0.26, 0.15, Math.PI - 0.15); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillRect(-r * 0.18, r * 0.16, r * 0.12, r * 0.08);
  }
  function brow(ctx, x, r, tilt) {
    ctx.strokeStyle = "#1c1a24"; ctx.lineWidth = Math.max(2.5, r * 0.09); ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - r * 0.16, -r * 0.42 - tilt * r * 0.12);
    ctx.lineTo(x + r * 0.16, -r * 0.42 + tilt * r * 0.12);
    ctx.stroke();
  }
  function mustache(ctx, r) {
    ctx.strokeStyle = "#8a6a30"; ctx.lineWidth = r * 0.07; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, r * 0.08); ctx.quadraticCurveTo(-r * 0.2, r * 0.14, -r * 0.34, r * 0.02);
    ctx.moveTo(0, r * 0.08); ctx.quadraticCurveTo(r * 0.2, r * 0.14, r * 0.34, r * 0.02);
    ctx.stroke();
  }
  function spiralEye(ctx, x, r) {
    ctx.strokeStyle = "#1c1a24"; ctx.lineWidth = Math.max(2, r * 0.06);
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 4; a += 0.3) {
      const rr = (a / (Math.PI * 4)) * r * 0.16;
      const px = x + Math.cos(a) * rr, py = -r * 0.22 + Math.sin(a) * rr;
      if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  function leaf(ctx, x, y, size, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(size * 0.6, -size * 0.5, size, 0);
    ctx.quadraticCurveTo(size * 0.6, size * 0.5, 0, 0);
    ctx.restore();
  }
  function star(ctx, x, y, ro, ri, points, rot = 0) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i += 1) {
      const rr = i % 2 === 0 ? ro : ri;
      const a = rot + (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  // Weapon sticks out toward aim. Drawn rotated; base at body edge.
  function drawWeapon(ctx, ch, r, aimX, aimY) {
    const angle = Math.atan2(aimY, aimX);
    ctx.save();
    ctx.rotate(angle);
    if (aimX < 0) ctx.scale(1, -1); // keep asymmetric weapons upright when aiming left
    ctx.translate(r * 0.55, 0);
    ctx.lineWidth = Math.max(2, r * 0.08);
    ctx.strokeStyle = "#1c1a24";
    const L = r * 1.5; // barrel length
    switch (ch.weapon) {
      case "peashooter": {
        ctx.fillStyle = "#a0713d";
        rr(ctx, 0, -r * 0.16, L * 0.8, r * 0.32, r * 0.12); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#7ed957"; // cork
        ctx.beginPath(); ctx.arc(L * 0.82, 0, r * 0.17, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        break;
      }
      case "tesla": {
        ctx.fillStyle = "#2b6fb0";
        rr(ctx, 0, -r * 0.14, L * 0.62, r * 0.28, r * 0.08); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ch.accent;
        for (let i = 0; i < 3; i += 1) {
          ctx.beginPath(); ctx.arc(L * (0.3 + i * 0.2), 0, r * (0.2 - i * 0.03), 0, Math.PI * 2);
          ctx.globalAlpha = 0.9 - i * 0.25; ctx.fill(); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        break;
      }
      case "bubble": {
        ctx.fillStyle = "#e07ba5";
        rr(ctx, 0, -r * 0.18, L * 0.55, r * 0.36, r * 0.16); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.beginPath(); ctx.arc(L * 0.68, 0, r * 0.24, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.stroke();
        break;
      }
      case "blunderbuss": {
        ctx.fillStyle = "#8f6a3a";
        rr(ctx, 0, -r * 0.14, L * 0.5, r * 0.28, r * 0.08); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#c9a86a";
        ctx.beginPath();
        ctx.moveTo(L * 0.5, -r * 0.14);
        ctx.lineTo(L * 0.95, -r * 0.34);
        ctx.lineTo(L * 0.95, r * 0.34);
        ctx.lineTo(L * 0.5, r * 0.14);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      }
      case "raygun": {
        ctx.fillStyle = "#d8d8e8";
        rr(ctx, 0, -r * 0.13, L * 0.75, r * 0.26, r * 0.13); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ch.accent;
        for (const fx of [0.25, 0.5]) {
          ctx.beginPath(); ctx.ellipse(L * fx, 0, r * 0.06, r * 0.24, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
        ctx.fillStyle = "#ff5b8d";
        ctx.beginPath(); ctx.arc(L * 0.8, 0, r * 0.14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        break;
      }
      case "spray": {
        ctx.fillStyle = "#5aa31d";
        rr(ctx, 0, -r * 0.2, L * 0.45, r * 0.4, r * 0.1); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#eaffd0";
        rr(ctx, L * 0.45, -r * 0.1, L * 0.4, r * 0.2, r * 0.08); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(L * 0.2, -r * 0.2); ctx.lineTo(L * 0.2, -r * 0.45); ctx.stroke(); // pump
        break;
      }
      case "flare": {
        ctx.fillStyle = "#b82a1c";
        rr(ctx, 0, -r * 0.18, L * 0.55, r * 0.36, r * 0.1); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ch.accent;
        ctx.beginPath(); ctx.arc(L * 0.62, 0, r * 0.16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        break;
      }
      case "frost": {
        ctx.fillStyle = "#9fd4ef";
        rr(ctx, 0, -r * 0.12, L * 0.62, r * 0.24, r * 0.06); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#eaf9ff";
        for (const [dy, len] of [[-0.16, 0.22], [0, 0.36], [0.16, 0.22]]) {
          ctx.beginPath();
          ctx.moveTo(L * 0.6, dy * r - r * 0.07);
          ctx.lineTo(L * (0.62 + len), dy * r);
          ctx.lineTo(L * 0.6, dy * r + r * 0.07);
          ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        break;
      }
      case "kunai": {
        ctx.fillStyle = "#33333f";
        rr(ctx, 0, -r * 0.12, L * 0.5, r * 0.24, r * 0.05); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#b9b9cc";
        ctx.beginPath();
        ctx.moveTo(L * 0.5, -r * 0.1); ctx.lineTo(L * 0.92, 0); ctx.lineTo(L * 0.5, r * 0.1);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      }
      case "longrifle": {
        ctx.fillStyle = "#f5efdc";
        rr(ctx, 0, -r * 0.1, L * 1.05, r * 0.2, r * 0.06); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ch.accent;
        rr(ctx, L * 0.15, -r * 0.13, L * 0.16, r * 0.26, r * 0.04); ctx.fill(); ctx.stroke();
        break;
      }
      case "rivet": {
        ctx.fillStyle = "#7a7a85";
        rr(ctx, 0, -r * 0.2, L * 0.6, r * 0.4, r * 0.08); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#ffd98f";
        for (const fy of [-0.12, 0.12]) {
          ctx.beginPath(); ctx.arc(L * 0.3, fy * r, r * 0.05, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = "#5b5b66";
        rr(ctx, L * 0.6, -r * 0.12, L * 0.28, r * 0.24, r * 0.05); ctx.fill(); ctx.stroke();
        break;
      }
      case "prism": {
        ctx.fillStyle = "#8a63d2";
        rr(ctx, 0, -r * 0.1, L * 0.5, r * 0.2, r * 0.06); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "rgba(215,194,255,0.9)";
        ctx.beginPath();
        ctx.moveTo(L * 0.5, 0); ctx.lineTo(L * 0.72, -r * 0.3); ctx.lineTo(L * 0.94, 0); ctx.lineTo(L * 0.72, r * 0.3);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = Math.max(1.5, r * 0.04);
        ctx.beginPath();
        ctx.moveTo(L * 0.72, -r * 0.3); ctx.lineTo(L * 0.72, r * 0.3);
        ctx.stroke();
        break;
      }
    }
    ctx.restore();
  }

  function rr(ctx, x, y, w, h, rad) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, rad);
  }

  window.ROUNDERS.CHARACTERS = CHARACTERS;
  window.ROUNDERS.drawCharacter = drawCharacter;
  window.ROUNDERS.characterImage = { has: hasImage, get: getImage };
})();
