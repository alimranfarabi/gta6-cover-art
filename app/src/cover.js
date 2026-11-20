// Vice Nights cover renderer: draws a multi-panel GTA 6-style poster onto a
// canvas — a Vice City sunset sky (striped neon sun, skyline, palms), three
// angled white-bordered photo panels, and bold original lettering (Anton
// title, Pacifico tagline). All art is drawn here; no Rockstar artwork,
// logo or font is used anywhere.

export const SIZES = {
  square: { w: 1080, h: 1080, label: '1080 × 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 × 1350' },
  wide: { w: 1920, h: 1080, label: '1920 × 1080' },
};

/** A fresh cover state: three panels, each holding a photo slot, a zoom and an offset. */
export function defaultState() {
  return {
    size: 'square',
    title: 'SUNSET HEIST',
    tagline: 'a neon story',
    grade: 0.8,
    selected: 0,
    panels: [
      { photo: 0, zoom: 1, ox: 0, oy: 0 },
      { photo: 1, zoom: 1, ox: 0, oy: 0 },
      { photo: 0, zoom: 1, ox: 0, oy: 0 },
    ],
  };
}

/** Deterministic random numbers, so every export of the same state matches. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Panel rectangles (fractions of the cover) for each post size. */
export function layoutFor(size) {
  if (size === 'portrait') {
    return [
      { x: 0.05, y: 0.035, w: 0.90, h: 0.50, rot: -1.6 },
      { x: 0.05, y: 0.565, w: 0.435, h: 0.175, rot: 1.8 },
      { x: 0.515, y: 0.565, w: 0.435, h: 0.175, rot: -1.8 },
    ];
  }
  if (size === 'wide') {
    return [
      { x: 0.03, y: 0.055, w: 0.45, h: 0.63, rot: -1.8 },
      { x: 0.51, y: 0.055, w: 0.44, h: 0.30, rot: 1.8 },
      { x: 0.51, y: 0.385, w: 0.44, h: 0.30, rot: -1.2 },
    ];
  }
  return [
    { x: 0.04, y: 0.05, w: 0.56, h: 0.60, rot: -2.2 },
    { x: 0.615, y: 0.065, w: 0.345, h: 0.28, rot: 2.6 },
    { x: 0.63, y: 0.375, w: 0.33, h: 0.27, rot: -1.4 },
  ];
}

/** Panel rectangles in canvas pixels, for hit-testing and drawing. */
export function panelRects(canvas, state) {
  const { width: w, height: h } = canvas;
  return layoutFor(state.size).map((p) => ({
    x: p.x * w, y: p.y * h, w: p.w * w, h: p.h * h, rot: p.rot,
    cx: (p.x + p.w / 2) * w, cy: (p.y + p.h / 2) * h,
  }));
}

/** Which panel (index, or -1) the canvas point (px, py) falls inside. */
export function hitPanel(canvas, state, px, py) {
  const rects = panelRects(canvas, state);
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    const a = (-r.rot * Math.PI) / 180;
    const dx = px - r.cx;
    const dy = py - r.cy;
    const lx = dx * Math.cos(a) - dy * Math.sin(a);
    const ly = dx * Math.sin(a) + dy * Math.cos(a);
    if (Math.abs(lx) <= r.w / 2 && Math.abs(ly) <= r.h / 2) return i;
  }
  return -1;
}

function drawStripedSun(ctx, w, h) {
  // The sun sits low, behind the title: its glow lights the lettering and
  // its striped top cap rises above the skyline.
  const cx = w * 0.5;
  const cy = h * 0.85;
  const r = w * 0.21;
  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.1);
  glow.addColorStop(0, 'rgba(255, 190, 90, 0.55)');
  glow.addColorStop(0.5, 'rgba(255, 110, 80, 0.22)');
  glow.addColorStop(1, 'rgba(255, 110, 80, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - r * 2.2, cy - r * 2.2, r * 4.4, r * 4.4);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const sun = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  sun.addColorStop(0, '#fff6c8');
  sun.addColorStop(0.55, '#ffb347');
  sun.addColorStop(1, '#ff5e62');
  ctx.fillStyle = sun;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.fillStyle = 'rgba(43, 15, 63, 0.9)';
  let y = cy - r * 0.55;
  let gap = r * 0.045;
  while (y < cy + r) {
    ctx.fillRect(cx - r, y, r * 2, gap * 0.55);
    y += gap;
    gap *= 1.35;
  }
  ctx.restore();
}

function drawSkyline(ctx, w, h, rng) {
  const base = h * 0.985;
  const top = h * 0.80;
  ctx.fillStyle = '#1c0b33';
  let x = -w * 0.02;
  while (x < w * 1.02) {
    const bw = w * (0.04 + rng() * 0.07);
    const bh = top + rng() * (base - top) * 0.55;
    ctx.fillRect(x, bh, bw, base - bh);
    if (rng() > 0.5) {
      const aw = bw * 0.3;
      ctx.fillRect(x + bw * 0.35, bh - h * 0.02, aw, h * 0.02);
    }
    ctx.fillStyle = 'rgba(255, 209, 102, 0.85)';
    const cols = Math.max(1, Math.floor(bw / (w * 0.022)));
    const rows = Math.max(1, Math.floor((base - bh) / (h * 0.035)));
    for (let c = 0; c < cols; c++) {
      for (let rr = 0; rr < rows; rr++) {
        if (rng() > 0.62) {
          ctx.fillRect(x + w * 0.008 + c * w * 0.022, bh + h * 0.012 + rr * h * 0.035, w * 0.008, h * 0.012);
        }
      }
    }
    ctx.fillStyle = '#1c0b33';
    x += bw + w * 0.008;
  }
}

function drawPalm(ctx, x, y, s, lean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean);
  ctx.scale(s, s);
  ctx.strokeStyle = '#160829';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(14, -70, 34, -128);
  ctx.stroke();
  ctx.fillStyle = '#160829';
  const fronds = 7;
  for (let i = 0; i < fronds; i++) {
    const a = (-Math.PI * 0.95) + (i / (fronds - 1)) * Math.PI * 0.9;
    ctx.save();
    ctx.translate(34, -128);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(52, -16, 96, 10);
    ctx.quadraticCurveTo(50, 4, 0, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/** How far a photo overflows its panel (canvas px), for panning: offsets are fractions of this overflow. */
export function photoOverflow(rect, img, zoom) {
  const inner = rect.w * 0.018;
  const iw = rect.w - inner * 2;
  const ih = rect.h - inner * 2;
  const base = Math.max(iw / img.naturalWidth, ih / img.naturalHeight) * zoom;
  return {
    iw, ih,
    overX: Math.max(0, img.naturalWidth * base - iw),
    overY: Math.max(0, img.naturalHeight * base - ih),
  };
}

function drawPanelPhoto(ctx, rect, img, panel, grade) {
  const inner = rect.w * 0.018;
  const iw = rect.w - inner * 2;
  const ih = rect.h - inner * 2;
  ctx.save();
  ctx.translate(rect.cx, rect.cy);
  ctx.rotate((rect.rot * Math.PI) / 180);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = rect.w * 0.03;
  ctx.shadowOffsetY = rect.w * 0.012;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.beginPath();
  ctx.rect(-iw / 2, -ih / 2, iw, ih);
  ctx.clip();
  if (img) {
    ctx.filter = 'saturate(1.28) contrast(1.07) brightness(1.03)';
    const base = Math.max(iw / img.naturalWidth, ih / img.naturalHeight) * panel.zoom;
    const pw = img.naturalWidth * base;
    const ph = img.naturalHeight * base;
    // Offsets are fractions of the overflow, so ±0.5 always reaches an edge.
    const overX = Math.max(0, pw - iw);
    const overY = Math.max(0, ph - ih);
    ctx.drawImage(img, -pw / 2 + panel.ox * overX, -ph / 2 + panel.oy * overY, pw, ph);
    ctx.filter = 'none';
  } else {
    const g = ctx.createLinearGradient(0, -ih / 2, 0, ih / 2);
    g.addColorStop(0, '#3a1f5e');
    g.addColorStop(1, '#7a2b6e');
    ctx.fillStyle = g;
    ctx.fillRect(-iw / 2, -ih / 2, iw, ih);
  }
  if (grade > 0) {
    const tint = ctx.createLinearGradient(0, -ih / 2, 0, ih / 2);
    tint.addColorStop(0, `rgba(255, 46, 136, ${0.16 * grade})`);
    tint.addColorStop(0.6, `rgba(255, 122, 61, ${0.10 * grade})`);
    tint.addColorStop(1, `rgba(120, 30, 120, ${0.22 * grade})`);
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = tint;
    ctx.fillRect(-iw / 2, -ih / 2, iw, ih);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}

function fitFont(ctx, text, maxWidth, startSize, family, weight = 400) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

function drawTitle(ctx, w, h, state) {
  const title = (state.title || '').trim().toUpperCase();
  const tagline = (state.tagline || '').trim();
  const zoneTop = h * (state.size === 'portrait' ? 0.775 : 0.74);
  const zoneBottom = h * 0.965;
  ctx.save();
  ctx.translate(w / 2, (zoneTop + zoneBottom) / 2);
  ctx.rotate((-1.4 * Math.PI) / 180);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (title) {
    const maxW = w * 0.92;
    const size = fitFont(ctx, title, maxW, h * 0.115, "'Anton', 'Arial Black', sans-serif");
    const y = tagline ? -size * 0.28 : 0;
    ctx.font = `${size}px 'Anton', 'Arial Black', sans-serif`;
    ctx.fillStyle = '#ff2e88';
    ctx.fillText(title, size * 0.045, y + size * 0.045);
    ctx.lineWidth = Math.max(4, size * 0.055);
    ctx.strokeStyle = '#1a0b2e';
    ctx.lineJoin = 'round';
    ctx.strokeText(title, 0, y);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, 0, y);
    if (tagline) {
      const tSize = fitFont(ctx, tagline, maxW * 0.8, h * 0.042, "'Pacifico', cursive");
      ctx.font = `${tSize}px 'Pacifico', cursive`;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = tSize * 0.25;
      ctx.shadowOffsetY = tSize * 0.08;
      ctx.fillStyle = '#ffe45e';
      ctx.fillText(tagline, 0, size * 0.38);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    }
  }
  ctx.restore();
}

/** Draws the whole cover onto `canvas` (at the canvas's own size) from `state` and `photos` (images by slot). */
export function drawCover(canvas, state, photos) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const rng = mulberry32(20261120);
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#2b0f3f');
  sky.addColorStop(0.34, '#7a1e6e');
  sky.addColorStop(0.55, '#c62b7e');
  sky.addColorStop(0.72, '#ff6e4a');
  sky.addColorStop(0.86, '#ffb37a');
  sky.addColorStop(1, '#ffd9a0');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  drawStripedSun(ctx, w, h);
  drawSkyline(ctx, w, h, rng);
  const palmScale = w / 1080;
  drawPalm(ctx, w * 0.015, h * 0.99, palmScale * 1.15, -0.10);
  drawPalm(ctx, w * 0.985, h * 0.99, palmScale * 0.95, 0.12);
  const rects = panelRects(canvas, state);
  state.panels.forEach((panel, i) => {
    drawPanelPhoto(ctx, rects[i], photos[panel.photo] ?? null, panel, state.grade);
  });
  drawTitle(ctx, w, h, state);
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(20, 5, 30, 0)');
  vig.addColorStop(1, 'rgba(20, 5, 30, 0.32)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  const grain = mulberry32(7);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  for (let i = 0; i < 1400; i++) {
    ctx.fillRect(grain() * w, grain() * h, 1.6, 1.6);
  }
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = Math.max(2, w * 0.003);
  ctx.strokeRect(w * 0.012, h * 0.012, w * 0.976, h * 0.976);
}
