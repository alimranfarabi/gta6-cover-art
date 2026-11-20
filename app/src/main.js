// Vice Nights editor: photo slots, panel assignment, click-and-drag crop,
// caption editing, post sizes and PNG export. A `?shot=` query sets up a
// fixed scene for a screenshot instead (./shots.js).
import { SIZES, defaultState, drawCover, panelRects, hitPanel, photoOverflow } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const state = defaultState();
const photos = [null, null, null];
const SAMPLES = ['pier', 'boulevard'];

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function redraw() {
  const size = SIZES[state.size];
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  drawCover(canvas, state, photos);
}

function syncPanelControls() {
  const panel = state.panels[state.selected];
  document.getElementById('zoom').value = String(panel.zoom);
  document.getElementById('ox').value = String(panel.ox);
  document.getElementById('oy').value = String(panel.oy);
  document.querySelectorAll('#panels button').forEach((b, i) => {
    b.classList.toggle('on', i === state.selected);
    b.setAttribute('aria-pressed', String(i === state.selected));
  });
}

function buildSlots() {
  const host = document.getElementById('slots');
  photos.forEach((_, i) => {
    const row = document.createElement('div');
    row.className = 'slot';
    row.innerHTML = `<span class="name">Photo ${i + 1}</span>`;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.id = `photo-${i}`;
    input.setAttribute('aria-label', `Photo ${i + 1} file`);
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      photos[i] = await loadImage(URL.createObjectURL(file));
      redraw();
      status.textContent = `Photo ${i + 1} loaded.`;
    });
    const sample = document.createElement('button');
    sample.type = 'button';
    sample.className = 'sample';
    sample.textContent = 'Sample';
    sample.addEventListener('click', async () => {
      photos[i] = await loadImage(`samples/${SAMPLES[i % SAMPLES.length]}.jpg`);
      redraw();
      status.textContent = `Photo ${i + 1} set to a sample.`;
    });
    row.append(input, sample);
    host.append(row);
  });
}

function buildPanelButtons() {
  const host = document.getElementById('panels');
  state.panels.forEach((panel, i) => {
    const wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.gap = '4px';
    wrap.style.flex = '1';
    const pick = document.createElement('button');
    pick.type = 'button';
    pick.textContent = `Panel ${i + 1}`;
    pick.addEventListener('click', () => {
      state.selected = i;
      syncPanelControls();
      redraw();
    });
    const select = document.createElement('select');
    select.setAttribute('aria-label', `Photo for panel ${i + 1}`);
    [0, 1, 2].forEach((n) => {
      const opt = document.createElement('option');
      opt.value = String(n);
      opt.textContent = `Photo ${n + 1}`;
      select.append(opt);
    });
    select.value = String(panel.photo);
    select.addEventListener('change', () => {
      panel.photo = Number(select.value);
      redraw();
    });
    wrap.append(pick, select);
    host.append(wrap);
  });
}

document.getElementById('sizes').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-size]');
  if (!btn) return;
  state.size = btn.dataset.size;
  document.querySelectorAll('#sizes button').forEach((b) => {
    b.classList.toggle('on', b === btn);
    b.setAttribute('aria-pressed', String(b === btn));
  });
  redraw();
});

document.getElementById('zoom').addEventListener('input', (e) => {
  state.panels[state.selected].zoom = Number(e.target.value);
  redraw();
});
document.getElementById('ox').addEventListener('input', (e) => {
  state.panels[state.selected].ox = Number(e.target.value);
  redraw();
});
document.getElementById('oy').addEventListener('input', (e) => {
  state.panels[state.selected].oy = Number(e.target.value);
  redraw();
});
document.getElementById('center').addEventListener('click', () => {
  const panel = state.panels[state.selected];
  panel.zoom = 1;
  panel.ox = 0;
  panel.oy = 0;
  syncPanelControls();
  redraw();
});
document.getElementById('title').addEventListener('input', (e) => {
  state.title = e.target.value;
  redraw();
});
document.getElementById('tagline').addEventListener('input', (e) => {
  state.tagline = e.target.value;
  redraw();
});
document.getElementById('grade').addEventListener('input', (e) => {
  state.grade = Number(e.target.value);
  redraw();
});

document.getElementById('export').addEventListener('click', () => {
  const size = SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCover(off, state, photos);
  off.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-nights-${size.w}x${size.h}.png`;
    a.click();
    status.textContent = `Saved vice-nights-${size.w}x${size.h}.png`;
  }, 'image/png');
});

// Drag to pan the selected panel's photo; scroll over the preview to zoom it.
let drag = null;
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * canvas.width,
    y: ((e.clientY - r.top) / r.height) * canvas.height,
  };
}
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const hit = hitPanel(canvas, state, p.x, p.y);
  if (hit >= 0) {
    state.selected = hit;
    syncPanelControls();
    redraw();
    const rects = panelRects(canvas, state);
    drag = { panel: hit, x: p.x, y: p.y, rect: rects[hit] };
    canvas.setPointerCapture(e.pointerId);
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const panel = state.panels[drag.panel];
  const img = photos[panel.photo];
  if (img) {
    const over = photoOverflow(drag.rect, img, panel.zoom);
    if (over.overX > 0) panel.ox = Math.max(-0.5, Math.min(0.5, panel.ox + (p.x - drag.x) / over.overX));
    if (over.overY > 0) panel.oy = Math.max(-0.5, Math.min(0.5, panel.oy + (p.y - drag.y) / over.overY));
  }
  drag.x = p.x;
  drag.y = p.y;
  syncPanelControls();
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const panel = state.panels[state.selected];
  panel.zoom = Math.max(1, Math.min(3, panel.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
  syncPanelControls();
  redraw();
}, { passive: false });

buildSlots();
buildPanelButtons();
syncPanelControls();

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), {
    loadSample: loadImage,
    apply: async (sample, opts) => {
      state.size = opts.size ?? 'square';
      state.title = opts.title;
      state.tagline = opts.tagline;
      photos[0] = sample;
      photos[1] = await loadImage(opts.other ?? `samples/${SAMPLES[1]}.jpg`);
      photos[2] = sample;
      state.panels.forEach((panel, i) => {
        panel.ox = opts.ox?.[i] ?? 0;
        panel.oy = opts.oy?.[i] ?? 0;
      });
      syncPanelControls();
      redraw();
    },
  });
} else {
  redraw();
  document.fonts.ready.then(redraw);
}
