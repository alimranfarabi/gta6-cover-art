// Fixed scenes for screenshots: ?shot=editor shows the page with sample
// photos loaded; ?shot=cover shows the exported cover alone, at the size
// named by `size` (square, portrait or wide). `photo` picks the sample
// (samples/<photo>.jpg), `caption` the title and `tag` the tagline.
// window.__shotReady is set once the scene is painted.
export async function runShot(shot, query, hooks) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const photo = query.get('photo') ?? 'pier';
  const sample = await hooks.loadSample(`samples/${photo}.jpg`);
  const num = (key, fallback) => {
    const v = Number(query.get(key));
    return Number.isFinite(v) ? v : fallback;
  };
  await hooks.apply(sample, {
    size: query.get('size') ?? 'square',
    title: (query.get('caption') ?? 'Sunset Heist').toUpperCase(),
    tagline: query.get('tag') ?? 'a neon story',
    other: `samples/${photo === 'pier' ? 'boulevard' : 'pier'}.jpg`,
    ox: [num('ox0', 0), num('ox1', 0), num('ox2', 0)],
    oy: [num('oy0', 0), num('oy1', 0), num('oy2', 0)],
  });
  await document.fonts.ready;
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
