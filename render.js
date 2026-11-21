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

// Official logo (square, includes the wordmark). Set LOGO_FILE to its path, or LOGO_URL.
let LOGO_DATA = null;
try {
  const f = process.env.LOGO_FILE || require('path').join(__dirname, 'logo.jpg');
  const fs = require('fs');
  if (fs.existsSync(f)) LOGO_DATA = 'data:image/jpeg;base64,' + fs.readFileSync(f).toString('base64');
  else LOGO_DATA = require('./logo');
} catch (e) { /* fall back to the drawn mark */ }

function logoBlock(opts = {}) {
  const size = opts.size || 64;
  if (LOGO_DATA) {
    const px = opts.big || Math.round(size * 2);
    return `<div class="logo"><img src="${LOGO_DATA}" alt="AdmissionArena logo" style="height:${px}px;width:${px}px;border-radius:${Math.round(px * 0.12)}px;box-shadow:0 0 0 2px rgba(255,255,255,.12)"></div>`;
  }
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
  ${logoBlock({ size: 64, big: 150 })}
  <div style="height:60px"></div>
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
  ${logoBlock({ size: 72, big: 190 })}
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


// ---------- v2: photo-led, high-impact layouts ----------
function hl(text, highlight) {
  const t = esc(text);
  const h = String(highlight || '').trim();
  if (!h) return t;
  const i = t.toLowerCase().indexOf(esc(h).toLowerCase());
  if (i < 0) return t;
  const e = esc(h);
  return t.slice(0, i) + `<span class="hl">${t.slice(i, i + e.length)}</span>` + t.slice(i + e.length);
}

function v2Css(w, h, lang) {
  return baseCss(w, h, lang) + `
.hl { color: ${GOLD}; }
.photo { position: absolute; left: 0; right: 0; top: 0; background-size: cover; background-position: center 30%; }
.shade { position: absolute; left: 0; right: 0; }
.pill { display: inline-block; background: ${GOLD}; color: ${NAVY}; font-weight: 800; font-size: 28px; padding: 12px 24px; border-radius: 999px;
  letter-spacing: ${lang === 'bn' ? '0' : '2px'}; text-transform: ${lang === 'bn' ? 'none' : 'uppercase'}; box-shadow: 0 8px 24px rgba(0,0,0,.35); }
.num { flex: 0 0 52px; height: 52px; border-radius: 14px; background: rgba(212,165,55,.16); border: 2px solid ${GOLD}; color: ${GOLD};
  font-family: 'Inter','Noto Sans',sans-serif; font-weight: 800; font-size: 26px; display: flex; align-items: center; justify-content: center; }
.row { display: flex; gap: 22px; align-items: center; font-size: 36px; line-height: ${lang === 'bn' ? 1.45 : 1.25}; }
.arrow { font-family: 'Inter',sans-serif; margin-left: 6px; }
.glass { background: rgba(11,31,58,.55); border: 1px solid rgba(255,255,255,.14); border-radius: 26px; padding: 34px 38px; backdrop-filter: blur(6px); }
`;
}

// Feed static v2, 1080x1350: photo on top 55%, content below.
function staticPhotoHtml(d) {
  const lang = d.lang === 'bn' ? 'bn' : 'en';
  const W = 1080, H = 1350, PH = 740;
  const points = Array.isArray(d.points) ? d.points.slice(0, 3) : [];
  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><style>${v2Css(W, H, lang)}</style></head>
<body>
  <div class="photo" style="height:${PH}px;background-image:url('${d.photo}')"></div>
  <div class="shade" style="top:0;height:220px;background:linear-gradient(180deg,rgba(11,31,58,.75),rgba(11,31,58,0))"></div>
  <div class="shade" style="top:${PH - 380}px;height:381px;background:linear-gradient(180deg,rgba(11,31,58,0),${NAVY} 92%)"></div>
  <div style="position:absolute;inset:0;padding:56px 72px 64px;display:flex;flex-direction:column">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      ${logoBlock({ size: 60, big: 130 })}
      ${d.eyebrow ? `<div class="pill">${esc(d.eyebrow)}</div>` : ''}
    </div>
    <div style="height:${PH - 330}px"></div>
    <div class="headline" style="font-size:${headlineSize(d.headline, 92, lang)}px;text-shadow:0 4px 24px rgba(0,0,0,.45)">${hl(d.headline, d.highlight)}</div>
    <div style="height:34px"></div>
    <div style="display:flex;flex-direction:column;gap:18px">
      ${points.map((p, i) => `<div class="row"><div class="num">${i + 1}</div><div>${esc(p)}</div></div>`).join('')}
    </div>
    <div class="spacer"></div>
    ${d.cta ? `<div class="cta">${esc(d.cta)}<span class="arrow">&rarr;</span></div><div style="height:18px"></div>` : ''}
    <div class="url">${esc(d.url || 'admissionarena.com')}</div>
  </div>
</body></html>`;
}

// Reel slide v2, 1080x1920. Slide 1: full photo + hook. Others: blurred photo + glass card.
function slidePhotoHtml(s, i, total, d) {
  const lang = d.lang === 'bn' ? 'bn' : 'en';
  const W = 1080, H = 1920;
  const first = i === 0, last = i === total - 1;
  const bar = Array.from({ length: total }, (_, k) =>
    `<div style="flex:1;height:8px;border-radius:4px;background:${k <= i ? GOLD : 'rgba(255,255,255,.25)'}"></div>`).join('');
  const bg = first && d.transparent
    ? `<div class="shade" style="top:0;height:${H}px;background:linear-gradient(180deg,rgba(11,31,58,.55) 0%,rgba(11,31,58,0) 28%,rgba(11,31,58,.25) 55%,rgba(11,31,58,.95) 90%)"></div>`
    : first
    ? `<div class="photo" style="height:${H}px;background-image:url('${d.photo}')"></div>
       <div class="shade" style="top:0;height:${H}px;background:linear-gradient(180deg,rgba(11,31,58,.55) 0%,rgba(11,31,58,.05) 30%,rgba(11,31,58,.35) 55%,${NAVY} 88%)"></div>`
    : `<div class="photo" style="height:${H}px;background-image:url('${d.photo}');filter:blur(28px) brightness(.55);transform:scale(1.15)"></div>
       <div class="shade" style="top:0;height:${H}px;background:rgba(11,31,58,.45)"></div>`;
  const body = first
    ? `<div class="spacer"></div>
       ${d.eyebrow ? `<div><span class="pill">${esc(d.eyebrow)}</span></div><div style="height:30px"></div>` : ''}
       <div class="headline" style="font-size:${headlineSize(s.text, 128, lang)}px;text-shadow:0 6px 30px rgba(0,0,0,.5)">${hl(s.text, d.highlight)}</div>
       ${s.sub ? `<div style="height:30px"></div><div class="body" style="font-size:46px;color:#E6ECF5">${esc(s.sub)}</div>` : ''}
       <div style="height:90px"></div>`
    : `<div class="spacer"></div>
       <div class="glass">
         <div style="font-family:'Inter',sans-serif;color:${GOLD};font-weight:800;font-size:34px;margin-bottom:22px">${String(i).padStart(2, '0')}</div>
         <div class="headline" style="font-size:${headlineSize(s.text, 108, lang)}px">${hl(s.text, d.highlight)}</div>
         ${s.sub ? `<div style="height:30px"></div><div class="body" style="font-size:44px;color:#E6ECF5">${esc(s.sub)}</div>` : ''}
         ${last && d.cta ? `<div style="height:50px"></div><div class="cta" style="font-size:40px;padding:28px 40px">${esc(d.cta)}<span class="arrow">&rarr;</span></div>` : ''}
       </div>
       <div class="spacer"></div>`;
  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><style>${v2Css(W, H, lang)}${first && d.transparent ? 'html,body{background:transparent !important}' : ''}</style></head>
<body>${bg}
  <div style="position:absolute;inset:0;padding:120px 80px 150px;display:flex;flex-direction:column">
    ${logoBlock({ size: 72, big: 170 })}
    ${body}
    <div class="url" style="font-size:34px;margin-bottom:30px">${esc(d.url || 'admissionarena.com')}</div>
    <div style="display:flex;gap:10px">${bar}</div>
  </div>
</body></html>`;
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

async function shoot(html, width, height, outPath, type, transparent = false) {
  const b = await browser();
  const page = await b.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  try {
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.screenshot({ path: outPath, type, quality: type === 'jpeg' ? 92 : undefined, fullPage: false, omitBackground: transparent });
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

// AI photo (Gemini image model). Returns a data: URI or null; posts still render without it.
const IMG_KEY = process.env.IMAGE_API_KEY || process.env.GEMINI_API_KEY || '';
const IMG_MODEL = process.env.IMAGE_MODEL || 'gemini-2.5-flash-image';
const PHOTO_STYLE = 'Photorealistic, natural light, shallow depth of field, editorial photography, authentic and hopeful mood. ' +
  'People are young South Asian (Bangladeshi) students, modestly dressed, diverse genders. No text, no letters, no logos, no watermarks in the image.';
async function genPhoto(prompt, aspect) {
  if (!IMG_KEY || !prompt) return null;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${IMG_MODEL}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': IMG_KEY },
      body: JSON.stringify({ contents: [{ parts: [{ text: `${prompt}. ${PHOTO_STYLE}` }] }],
        generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: aspect } } }),
      signal: AbortSignal.timeout(90000),
    });
    const j = await res.json();
    const part = (j.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData || p.inline_data);
    const data = part && (part.inlineData || part.inline_data);
    if (!data) { console.error('image: no image returned', JSON.stringify(j).slice(0, 300)); return null; }
    return `data:${data.mimeType || data.mime_type || 'image/png'};base64,${data.data}`;
  } catch (e) { console.error('image failed:', e.message); return null; }
}

async function renderStatic(d) {
  d = clean(d);
  if (!d.photo && d.image_prompt) d.photo = await genPhoto(d.image_prompt, '4:5');
  const name = newName('jpg'); // Instagram publishing accepts JPEG only
  const out = path.join(MEDIA_DIR, name);
  await shoot(d.photo ? staticPhotoHtml(d) : staticHtml(d), 1080, 1350, out, 'jpeg');
  return { url: await publishFile(name), path: name, width: 1080, height: 1350 };
}

// ---- Higgsfield: turn the reel's AI photo into a short moving video for the hook ----
const HF_ID = process.env.HF_API_KEY_ID || '';
const HF_SECRET = process.env.HF_API_KEY_SECRET || '';
const HF_BASE = (process.env.HF_BASE_URL || 'https://api.higgsfield.ai').replace(/\/$/, '');
const HF_MODEL = process.env.HF_VIDEO_MODEL || '/kling-video/v2.5-turbo/standard/image-to-video';
const HF_DURATION = Number(process.env.HF_DURATION || 5);
const HF_TIMEOUT_MS = Number(process.env.HF_TIMEOUT_MS || 6 * 60e3);
const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));

async function hfImageToVideo(imageUrl, prompt, outPath) {
  if (!HF_ID || !HF_SECRET) return null;
  const auth = { Authorization: `Key ${HF_ID}:${HF_SECRET}`, 'Content-Type': 'application/json' };
  try {
    const sub = await fetch(HF_BASE + HF_MODEL, {
      method: 'POST', headers: { ...auth, 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({ prompt, image_url: imageUrl, duration: HF_DURATION }), signal: AbortSignal.timeout(60000),
    }).then((r) => r.json());
    if (!sub.request_id) { console.error('higgsfield submit failed:', JSON.stringify(sub).slice(0, 300)); return null; }
    const statusUrl = sub.status_url || `${HF_BASE}/requests/${sub.request_id}/status`;
    const t0 = Date.now();
    let st = {};
    for (let i = 0; Date.now() - t0 < HF_TIMEOUT_MS; i++) {
      await sleepMs(Math.min(3000 + i * 1000, 10000));
      st = await fetch(statusUrl, { headers: auth, signal: AbortSignal.timeout(30000) }).then((r) => r.json()).catch(() => ({}));
      if (['completed', 'failed', 'nsfw', 'canceled'].includes(st.status)) break;
    }
    const url = st.status === 'completed' && st.video && st.video.url;
    if (!url) { console.error('higgsfield not completed:', st.status, JSON.stringify(st.error || '').slice(0, 200)); return null; }
    const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
    if (!res.ok) return null;
    await fsp.writeFile(outPath, Buffer.from(await res.arrayBuffer()));
    return outPath;
  } catch (e) { console.error('higgsfield failed:', e.message); return null; }
}

// Needs a public image URL, so it only runs when Supabase Storage is configured.
async function makeIntro(d, tmp) {
  if (!HF_ID || !HF_SECRET || !d.photo || !(SB_URL && SB_KEY && BUCKET)) return null;
  const m = String(d.photo).match(/^data:image\/(\w+);base64,(.+)$/);
  if (!m) return null;
  const name = newName(m[1] === 'jpeg' ? 'jpg' : 'png');
  await fsp.writeFile(path.join(MEDIA_DIR, name), Buffer.from(m[2], 'base64'));
  const imageUrl = await publishFile(name);
  const prompt = d.motion_prompt || 'Subtle natural motion, slow cinematic camera push-in, the students move and react naturally, realistic, no text';
  const file = await hfImageToVideo(imageUrl, prompt, path.join(tmp, 'intro.mp4'));
  if (!file) return null;
  const info = await probe(file).catch(() => null);
  return info && info.duration > 1 ? { file, duration: info.duration } : null;
}

async function renderReel(d) {
  d = clean(d);
  if (!d.photo && d.image_prompt) d.photo = await genPhoto(d.image_prompt, '9:16');
  const slides = (d.slides || []).filter(s => s && s.text).slice(0, 7);
  if (slides.length < 2) throw new Error('reel needs at least 2 slides');
  const tmp = await fsp.mkdtemp(path.join(require('os').tmpdir(), 'aa-reel-'));
  try {
    const intro = d.motion ? await makeIntro(d, tmp) : null;
    const pngs = [];
    for (let i = 0; i < slides.length; i++) {
      const p = path.join(tmp, `s${i}.png`);
      if (i === 0 && intro) await shoot(slidePhotoHtml(slides[i], i, slides.length, { ...d, transparent: true }), 1080, 1920, p, 'png', true);
      else await shoot(d.photo ? slidePhotoHtml(slides[i], i, slides.length, d) : slideHtml(slides[i], i, slides.length, d), 1080, 1920, p, 'png');
      pngs.push(p);
    }
    // First slide (the hook) is shorter, last slide (CTA) a bit longer. With a video intro the hook plays over the clip.
    const durs = slides.map((_, i) => (i === 0 ? (intro ? Math.min(intro.duration, 6) - FADE : 2.8) : i === slides.length - 1 ? SLIDE_SECONDS + 0.8 : SLIDE_SECONDS));
    const fps = 30;
    const args = ['-y'];
    pngs.forEach(p => args.push('-i', p));
    let musicIdx = -1;
    if (d.music_url) { musicIdx = pngs.length; args.push('-i', d.music_url); }
    else { args.push('-f', 'lavfi', '-t', '60', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100'); musicIdx = pngs.length; }

    let introIdx = -1;
    if (intro) { introIdx = musicIdx + 1; args.push('-i', intro.file); }

    const parts = [];
    pngs.forEach((_, i) => {
      const frames = Math.round((durs[i] + FADE) * fps);
      if (i === 0 && intro) {
        const len = (durs[0] + FADE).toFixed(2);
        parts.push(`[${introIdx}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=${fps},tpad=stop_mode=clone:stop_duration=3,trim=0:${len},setpts=PTS-STARTPTS[bgv]`);
        parts.push(`[0:v]format=rgba[ov0]`);
        parts.push(`[bgv][ov0]overlay=0:0:format=auto,format=yuv420p,setsar=1,settb=AVTB[v0]`);
      } else {
        parts.push(`[${i}:v]scale=1188:2112,zoompan=z='min(zoom+0.0006,1.06)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=${fps},format=yuv420p,setsar=1,settb=AVTB[v${i}]`);
      }
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
    return { url: await publishFile(name), path: name, duration: Number(total.toFixed(2)), motion: !!intro };
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
