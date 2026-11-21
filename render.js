// AdmissionArena render engine: branded statics (JPG) + reels (MP4) + Drive video intake.
// Built from render-service/templates.js + server.js.
// AdmissionArena brand templates. Minimal, big type, one idea per frame.
// Colors: navy background, white type, gold accent (from the brand logo).

const NAVY = '#0B1F3A';
const NAVY_2 = '#12305A';
const GOLD = '#D4A537';
const WHITE = '#FFFFFF';
const MUTED = '#B9C6DA';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Simplified logo mark: white arch, graduation cap on top, gold door.
// Set LOGO_URL to use the official logo file instead.
function logoMark(size = 64) {
  return `
<svg width="${size}" height="${size}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-label="AdmissionArena logo">
  <path d="M10 58 V30 A22 22 0 0 1 54 30 V58" fill="none" stroke="${WHITE}" stroke-width="5" stroke-linecap="round"/>
  <path d="M24 58 V40 A8 8 0 0 1 40 40 V58 Z" fill="${GOLD}"/>
  <path d="M32 2 L50 9 L32 16 L14 9 Z" fill="${WHITE}"/>
  <path d="M22 12 V17 C26 21 38 21 42 17 V12" fill="none" stroke="${WHITE}" stroke-width="3"/>
</svg>`;
}

function logoBlock(opts = {}) {
  const size = opts.size || 64;
  const mark = process.env.LOGO_URL
    ? `<img src="${esc(process.env.LOGO_URL)}" style="height:${size}px;width:auto" alt="AdmissionArena logo">`
    : logoMark(size);
  return `
<div class="logo">
  ${mark}
  <div class="logo-text">
    <div class="logo-name">AdmissionArena</div>
    <div class="logo-tag">Study Abroad, Smarter.</div>
  </div>
</div>`;
}

function baseCss(w, h, lang) {
  const font = lang === 'bn'
    ? `'Noto Sans Bengali', 'Hind Siliguri', 'Noto Sans', sans-serif`
    : `'Inter', 'Noto Sans', 'Helvetica Neue', Arial, sans-serif`;
  return `
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: ${w}px; height: ${h}px; }
body {
  background: radial-gradient(120% 80% at 80% 0%, ${NAVY_2} 0%, ${NAVY} 60%);
  color: ${WHITE}; font-family: ${font};
  -webkit-font-smoothing: antialiased; overflow: hidden;
}
.frame { position: absolute; inset: 0; padding: 88px 84px; display: flex; flex-direction: column; }
.logo { display: flex; align-items: center; gap: 18px; }
.logo-name { font-family: 'Inter','Noto Sans',sans-serif; font-weight: 800; font-size: 34px; letter-spacing: -0.5px; }
.logo-tag { font-family: 'Inter','Noto Sans',sans-serif; font-size: 20px; color: ${GOLD}; margin-top: 2px; }
.eyebrow { color: ${GOLD}; font-weight: 700; font-size: 30px; letter-spacing: ${lang === 'bn' ? '0' : '3px'}; text-transform: ${lang === 'bn' ? 'none' : 'uppercase'}; }
.rule { width: 96px; height: 6px; background: ${GOLD}; border-radius: 3px; }
.headline { font-weight: 800; letter-spacing: ${lang === 'bn' ? '0' : '-2px'}; line-height: ${lang === 'bn' ? 1.35 : 1.05}; }
.body { color: ${MUTED}; line-height: ${lang === 'bn' ? 1.6 : 1.4}; }
.points { list-style: none; display: flex; flex-direction: column; gap: 22px; }
.points li { display: flex; gap: 20px; align-items: flex-start; font-size: 38px; line-height: ${lang === 'bn' ? 1.5 : 1.3}; }
.points li::before { content: ''; flex: 0 0 14px; height: 14px; margin-top: ${lang === 'bn' ? 22 : 16}px; background: ${GOLD}; border-radius: 50%; }
.cta { display: inline-flex; align-self: flex-start; align-items: center; gap: 14px; background: ${GOLD}; color: ${NAVY};
  font-weight: 800; font-size: 32px; padding: 22px 34px; border-radius: 14px; font-family: 'Inter','Noto Sans','Noto Sans Bengali',sans-serif; }
.url { font-family: 'Inter','Noto Sans',sans-serif; color: ${WHITE}; opacity: .85; font-size: 28px; }
.spacer { flex: 1; }
`;
}

// Fit headline size to text length so short lines hit hard and long lines still fit.
function headlineSize(text, base, lang) {
  const n = String(text || '').length;
  const k = lang === 'bn' ? 0.9 : 1;
  if (n <= 18) return Math.round(base * 1.25 * k);
  if (n <= 32) return Math.round(base * k);
  if (n <= 55) return Math.round(base * 0.8 * k);
  if (n <= 80) return Math.round(base * 0.66 * k);
  return Math.round(base * 0.55 * k);
}

// Feed static, 1080x1350 (4:5) — works on Facebook, Instagram, TikTok photo.
function staticHtml(d) {
  const lang = d.lang === 'bn' ? 'bn' : 'en';
  const W = 1080, H = 1350;
  const points = Array.isArray(d.points) ? d.points.slice(0, 4) : [];
  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><style>${baseCss(W, H, lang)}</style></head>
<body><div class="frame">
  ${logoBlock({ size: 64 })}
  <div style="height:90px"></div>
  ${d.eyebrow ? `<div class="eyebrow">${esc(d.eyebrow)}</div><div style="height:28px"></div>` : ''}
  <div class="headline" style="font-size:${headlineSize(d.headline, 104, lang)}px">${esc(d.headline)}</div>
  <div style="height:40px"></div>
  <div class="rule"></div>
  <div style="height:40px"></div>
  ${points.length
    ? `<ul class="points">${points.map(p => `<li><span>${esc(p)}</span></li>`).join('')}</ul>`
    : `<div class="body" style="font-size:40px">${esc(d.body || '')}</div>`}
  <div class="spacer"></div>
  ${d.cta ? `<div class="cta">${esc(d.cta)}</div><div style="height:22px"></div>` : ''}
  <div class="url">${esc(d.url || 'admissionarena.com')}</div>
</div></body></html>`;
}

// Reel slide, 1080x1920 (9:16). Big centered statement, logo top, progress bar bottom.
function slideHtml(s, i, total, d) {
  const lang = d.lang === 'bn' ? 'bn' : 'en';
  const W = 1080, H = 1920;
  const isLast = i === total - 1;
  const bar = Array.from({ length: total }, (_, k) =>
    `<div style="flex:1;height:8px;border-radius:4px;background:${k <= i ? GOLD : 'rgba(255,255,255,.18)'}"></div>`).join('');
  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><style>${baseCss(W, H, lang)}
.frame { padding: 140px 90px 170px; }
</style></head>
<body><div class="frame">
  ${logoBlock({ size: 72 })}
  <div class="spacer"></div>
  ${i === 0 && d.eyebrow ? `<div class="eyebrow">${esc(d.eyebrow)}</div><div style="height:34px"></div>` : ''}
  <div class="headline" style="font-size:${headlineSize(s.text, 120, lang)}px">${esc(s.text)}</div>
  ${s.sub ? `<div style="height:40px"></div><div class="body" style="font-size:46px">${esc(s.sub)}</div>` : ''}
  ${isLast && d.cta ? `<div style="height:60px"></div><div class="cta" style="font-size:40px;padding:28px 40px">${esc(d.cta)}</div>` : ''}
  <div class="spacer"></div>
  <div class="url" style="font-size:34px;margin-bottom:34px">${esc(d.url || 'admissionarena.com')}</div>
  <div style="display:flex;gap:10px">${bar}</div>
</div></body></html>`;
}



// AdmissionArena render service
// POST /render/static  {lang, eyebrow, headline, points[]|body, cta, url}         -> {url, path, width, height}
// POST /render/reel    {lang, eyebrow, slides:[{text, sub}], cta, url, music_url?} -> {url, path, duration}
// POST /ingest       {url, name}  downloads a finished video (e.g. public Drive link), checks it,
//                    hosts it and returns 3 preview frames for captioning -> {url, frames[], duration, width, height}
// GET  /media/<file>   serves rendered files (point TikTok URL-prefix verification here)
// GET  /health
// Auth: header "x-render-token: <RENDER_TOKEN>" on /render/*

const http = require('http');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { chromium } = require('playwright');

const PORT = Number(process.env.PORT || 8080);
const TOKEN = process.env.RENDER_TOKEN || '';
const MEDIA_DIR = process.env.MEDIA_DIR || path.join(__dirname, 'media');
const PUBLIC_BASE = (process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const KEEP_DAYS = Number(process.env.KEEP_DAYS || 14);
const SLIDE_SECONDS = Number(process.env.SLIDE_SECONDS || 3.6);
const FADE = 0.4;

fs.mkdirSync(MEDIA_DIR, { recursive: true });

// Optional: put finished files in Supabase Storage (public bucket) instead of serving them from here.
const SB_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const BUCKET = process.env.STORAGE_BUCKET || '';
const TYPES_OUT = { '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4' };
async function publishFile(name) {
  const local = path.join(MEDIA_DIR, name);
  if (!(SB_URL && SB_KEY && BUCKET)) return `${PUBLIC_BASE}/media/${name}`;
  const buf = await fsp.readFile(local);
  const res = await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${name}`, {
    method: 'POST', body: buf,
    headers: { Authorization: `Bearer ${SB_KEY}`, apikey: SB_KEY, 'Content-Type': TYPES_OUT[path.extname(name)] || 'application/octet-stream', 'x-upsert': 'true', 'cache-control': 'max-age=604800' },
  });
  if (!res.ok) throw new Error(`storage upload failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  await fsp.rm(local, { force: true });
  return `${SB_URL}/storage/v1/object/public/${BUCKET}/${name}`;
}

// Brand rule: no emoji anywhere in visuals.
const EMOJI_RE = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}]/gu;
function clean(v) {
  if (typeof v === 'string') return v.replace(EMOJI_RE, '').replace(/\s{2,}/g, ' ').trim();
  if (Array.isArray(v)) return v.map(clean);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clean(x)]));
  return v;
}

let browserPromise;
function browser() {
  if (!browserPromise) browserPromise = chromium.launch({ args: ['--no-sandbox', '--font-render-hinting=none'] });
  return browserPromise;
}

async function shoot(html, width, height, outPath, type) {
  const b = await browser();
  const page = await b.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  try {
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.screenshot({ path: outPath, type, quality: type === 'jpeg' ? 92 : undefined, fullPage: false });
  } finally {
    await page.close();
  }
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: 1024 * 1024 * 20 }, (err, stdout, stderr) => {
      if (err) reject(new Error(`${cmd} failed: ${stderr.slice(-800)}`));
      else resolve(stdout);
    });
  });
}

function newName(ext) {
  const d = new Date().toISOString().slice(0, 10);
  return `${d}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
}

async function renderStatic(d) {
  d = clean(d);
  const name = newName('jpg'); // Instagram publishing accepts JPEG only
  const out = path.join(MEDIA_DIR, name);
  await shoot(staticHtml(d), 1080, 1350, out, 'jpeg');
  return { url: await publishFile(name), path: name, width: 1080, height: 1350 };
}

async function renderReel(d) {
  d = clean(d);
  const slides = (d.slides || []).filter(s => s && s.text).slice(0, 7);
  if (slides.length < 2) throw new Error('reel needs at least 2 slides');
  const tmp = await fsp.mkdtemp(path.join(require('os').tmpdir(), 'aa-reel-'));
  try {
    const pngs = [];
    for (let i = 0; i < slides.length; i++) {
      const p = path.join(tmp, `s${i}.png`);
      await shoot(slideHtml(slides[i], i, slides.length, d), 1080, 1920, p, 'png');
      pngs.push(p);
    }
    // First slide (the hook) is shorter, last slide (CTA) a bit longer.
    const durs = slides.map((_, i) => (i === 0 ? 2.8 : i === slides.length - 1 ? SLIDE_SECONDS + 0.8 : SLIDE_SECONDS));
    const fps = 30;
    const args = ['-y'];
    pngs.forEach(p => args.push('-i', p));
    let musicIdx = -1;
    if (d.music_url) { musicIdx = pngs.length; args.push('-i', d.music_url); }
    else { args.push('-f', 'lavfi', '-t', '60', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100'); musicIdx = pngs.length; }

    const parts = [];
    pngs.forEach((_, i) => {
      const frames = Math.round((durs[i] + FADE) * fps);
      parts.push(`[${i}:v]scale=1188:2112,zoompan=z='min(zoom+0.0006,1.06)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=${fps},format=yuv420p,setsar=1[v${i}]`);
    });
    let last = 'v0';
    let offset = 0;
    for (let i = 1; i < pngs.length; i++) {
      offset += durs[i - 1];
      const outLbl = i === pngs.length - 1 ? 'vout' : `x${i}`;
      parts.push(`[${last}][v${i}]xfade=transition=fade:duration=${FADE}:offset=${offset.toFixed(2)}[${outLbl}]`);
      last = outLbl;
    }
    const total = durs.reduce((a, b) => a + b, 0) + FADE;
    parts.push(`[${musicIdx}:a]atrim=0:${total.toFixed(2)},afade=t=out:st=${Math.max(0, total - 1).toFixed(2)}:d=1,volume=${d.music_url ? 0.6 : 1}[aout]`);

    const name = newName('mp4');
    const out = path.join(MEDIA_DIR, name);
    args.push('-filter_complex', parts.join(';'), '-map', '[vout]', '-map', '[aout]',
      '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'medium', '-crf', '25', '-maxrate', '3M', '-bufsize', '6M', '-r', String(fps),
      '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-ar', '44100',
      '-movflags', '+faststart', '-t', total.toFixed(2), out);
    await run('ffmpeg', args);
    return { url: await publishFile(name), path: name, duration: Number(total.toFixed(2)) };
  } finally {
    await fsp.rm(tmp, { recursive: true, force: true });
  }
}

async function probe(file) {
  const out = await run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', file]);
  const j = JSON.parse(out);
  const v = (j.streams || []).find((s) => s.codec_type === 'video');
  if (!v) throw new Error('file has no video stream');
  return { duration: Number(j.format.duration || 0), width: v.width, height: v.height };
}

async function ingest(d) {
  if (!d.url) throw new Error('url required');
  const res = await fetch(d.url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  const type = res.headers.get('content-type') || '';
  if (type.includes('text/html')) throw new Error('download returned a web page, not a video (is the file shared "anyone with the link"?)');
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 200 * 1024 * 1024) throw new Error('video larger than 200MB');
  const base = newName('mp4').replace(/\.mp4$/, '');
  const file = path.join(MEDIA_DIR, `${base}.mp4`);
  await fsp.writeFile(file, buf);
  let info;
  try { info = await probe(file); } catch (e) { await fsp.rm(file, { force: true }); throw e; }
  const frames = [];
  for (const [i, pct] of [0.12, 0.5, 0.88].entries()) {
    const fp = path.join(MEDIA_DIR, `${base}-f${i}.jpg`);
    await run('ffmpeg', ['-v', 'error', '-y', '-ss', (info.duration * pct).toFixed(2), '-i', file, '-frames:v', '1', '-vf', 'scale=540:-2', '-q:v', '5', fp]);
    frames.push('data:image/jpeg;base64,' + (await fsp.readFile(fp)).toString('base64'));
    await fsp.rm(fp, { force: true });
  }
  return { url: await publishFile(`${base}.mp4`), path: `${base}.mp4`, frames, ...info };
}

async function cleanup() {
  const cutoff = Date.now() - KEEP_DAYS * 86400e3;
  for (const f of await fsp.readdir(MEDIA_DIR)) {
    const p = path.join(MEDIA_DIR, f);
    const st = await fsp.stat(p).catch(() => null);
    if (st && st.mtimeMs < cutoff) await fsp.rm(p, { force: true });
  }
}
if (require.main === module) setInterval(() => cleanup().catch(() => {}), 6 * 3600e3);

function send(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

const TYPES = { '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4' };

// Simple queue so heavy renders run one at a time.
let chain = Promise.resolve();
function queued(fn) { const p = chain.then(fn, fn); chain = p.catch(() => {}); return p; }

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, { ok: true });

    if (req.method === 'GET' && url.pathname.startsWith('/media/')) {
      const name = path.basename(url.pathname);
      const p = path.join(MEDIA_DIR, name);
      const st = await fsp.stat(p).catch(() => null);
      if (!st) return send(res, 404, { error: 'not found' });
      res.writeHead(200, {
        'content-type': TYPES[path.extname(name)] || 'application/octet-stream',
        'content-length': st.size, 'cache-control': 'public, max-age=604800',
      });
      return fs.createReadStream(p).pipe(res);
    }

    if (req.method === 'POST' && url.pathname.startsWith('/render/')) {
      if (!TOKEN || req.headers['x-render-token'] !== TOKEN) return send(res, 401, { error: 'unauthorized' });
      const body = clean(await readBody(req));
      if (url.pathname === '/render/static') return send(res, 200, await queued(() => renderStatic(body)));
      if (url.pathname === '/render/reel') return send(res, 200, await queued(() => renderReel(body)));
    }
    if (req.method === 'POST' && url.pathname === '/ingest') {
      if (!TOKEN || req.headers['x-render-token'] !== TOKEN) return send(res, 401, { error: 'unauthorized' });
      const b = await readBody(req);
      return send(res, 200, await queued(() => ingest(b)));
    }
    send(res, 404, { error: 'not found' });
  } catch (e) {
    send(res, 500, { error: String(e.message || e) });
  }
});

function start(port = PORT) {
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}
async function stop() { server.close(); if (browserPromise) (await browserPromise).close(); }

if (require.main === module) {
  server.listen(PORT, () => console.log(`aa-render listening on ${PORT}`));
}

module.exports = { renderStatic, renderReel, ingest, clean, server, start, stop };
