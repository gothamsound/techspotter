// Source peek: render the region of the original PDF around an anchor to
// a PNG data URL, with the anchored line highlighted. Entirely local; the
// document handle lives in memory for the session. Crops are cached by
// anchor so repeat hovers are instant.

const SCALE = 2.2;
const PAD_X = 60;
const PAD_Y = 34;

const cache = new Map();
let cacheDoc = null;

export async function renderPeek(doc, anchor) {
  if (cacheDoc !== doc) {
    cache.clear();
    cacheDoc = doc;
  }
  const key = `${anchor.page}:${anchor.bbox.join(',')}`;
  if (cache.has(key)) return cache.get(key);

  const page = await doc.getPage(anchor.page);
  const vp = page.getViewport({ scale: SCALE });
  const canvas = document.createElement('canvas');
  canvas.width = vp.width;
  canvas.height = vp.height;
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;

  const [x0, y0, x1, y1] = anchor.bbox;
  const cx = Math.max(0, (x0 - PAD_X) * SCALE);
  const cw = Math.min(vp.width, (x1 + PAD_X) * SCALE) - cx;
  const cyTop = Math.max(0, vp.height - (y1 + PAD_Y) * SCALE);
  const ch = Math.min(vp.height, vp.height - (y0 - PAD_Y) * SCALE) - cyTop;

  const out = document.createElement('canvas');
  out.width = cw;
  out.height = ch;
  const ctx = out.getContext('2d');
  ctx.drawImage(canvas, cx, cyTop, cw, ch, 0, 0, cw, ch);

  ctx.strokeStyle = 'rgba(86,185,216,.95)';
  ctx.lineWidth = 2;
  ctx.strokeRect(
    x0 * SCALE - cx - 4,
    vp.height - y1 * SCALE - cyTop - 3,
    (x1 - x0) * SCALE + 8,
    (y1 - y0) * SCALE + 6,
  );

  const url = out.toDataURL('image/png');
  cache.set(key, url);
  return url;
}
