// AdmissionArena social automation runner (GitHub Actions)
//   node run.js content   -> write the next 24h of AI posts, queue Drive reels, clean old media
//   node run.js publish   -> render what is coming up, post everything that is due
// Settings come from environment variables (GitHub Secrets / Variables).
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const tasks = require('./tasks');

function toQuery(qs) {
  if (!qs) return '';
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(qs)) if (v !== undefined && v !== null) p.append(k, String(v));
  const s = p.toString();
  return s ? '?' + s : '';
}

// Minimal stand-in for n8n's this.helpers.httpRequest, built on fetch.
async function httpRequest(o) {
  const headers = { ...(o.headers || {}) };
  let body = o.body;
  const isBin = body instanceof Uint8Array || Buffer.isBuffer(body);
  if (body !== undefined && body !== null && typeof body === 'object' && !isBin && o.json !== false) {
    body = JSON.stringify(body);
    if (!Object.keys(headers).some((h) => h.toLowerCase() === 'content-type')) headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(o.url + toQuery(o.qs), {
    method: o.method || 'GET', headers, body: ['GET', 'HEAD'].includes(o.method || 'GET') ? undefined : body,
    signal: AbortSignal.timeout(o.timeout || 120000), redirect: 'follow',
  });
  let out;
  if (o.encoding === 'arraybuffer') out = Buffer.from(await res.arrayBuffer());
  else {
    const text = await res.text();
    out = text;
    if (o.json !== false && text) { try { out = JSON.parse(text); } catch (e) { out = text; } }
  }
  if (!o.ignoreHttpStatusErrors && !res.ok) {
    const err = new Error(`HTTP ${res.status} ${o.url}: ${typeof out === 'string' ? out.slice(0, 300) : JSON.stringify(out).slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  if (o.returnFullResponse) return { statusCode: res.status, headers: Object.fromEntries(res.headers.entries()), body: out };
  return out;
}

async function runTask(name) {
  const t0 = Date.now();
  try {
    const out = await new AsyncFunction('$env', tasks[name]).call({ helpers: { httpRequest } }, process.env);
    console.log(`\n=== ${name} (${((Date.now() - t0) / 1000).toFixed(0)}s)\n` + JSON.stringify(out.map((x) => x.json), null, 1).slice(0, 20000));
    return true;
  } catch (e) {
    console.error(`\n=== ${name} FAILED: ${e.message}`);
    return false;
  }
}

// Delete media older than KEEP_DAYS from the storage bucket (keeps the free plan small).
async function cleanup() {
  const url = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_KEY;
  const bucket = process.env.STORAGE_BUCKET || 'aa-media';
  const days = Number(process.env.KEEP_DAYS || 5);
  const h = { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/json' };
  const cutoff = Date.now() - days * 86400e3;
  let removed = 0;
  for (let i = 0; i < 20; i++) {
    const list = await fetch(`${url}/storage/v1/object/list/${bucket}`, { method: 'POST', headers: h,
      body: JSON.stringify({ prefix: '', limit: 1000, offset: 0, sortBy: { column: 'created_at', order: 'asc' } }) }).then((r) => r.json());
    const old = (Array.isArray(list) ? list : []).filter((f) => f.created_at && new Date(f.created_at).getTime() < cutoff).map((f) => f.name);
    if (!old.length) break;
    await fetch(`${url}/storage/v1/object/${bucket}`, { method: 'DELETE', headers: h, body: JSON.stringify({ prefixes: old }) });
    removed += old.length;
    if (old.length < 1000) break;
  }
  console.log(`\n=== cleanup: removed ${removed} old media files`);
}

(async () => {
  const mode = process.argv[2];
  process.env.RENDER_URL = process.env.RENDER_URL || 'http://127.0.0.1:8080';
  process.env.RENDER_TOKEN = process.env.RENDER_TOKEN || require('crypto').randomBytes(16).toString('hex');
  if (!process.env.STORAGE_BUCKET) process.env.STORAGE_BUCKET = 'aa-media';
  const render = require('./render');
  await render.start(8080);
  let ok = true;
  if (mode === 'content') {
    ok = (await runTask('generator')) && ok;
    ok = (await runTask('drive_ingest')) && ok;
    await cleanup().catch((e) => console.error('cleanup failed:', e.message));
  } else if (mode === 'publish') {
    ok = (await runTask('prerender')) && ok;
    ok = (await runTask('publisher')) && ok;
  } else if (tasks[mode]) {
    ok = await runTask(mode);
  } else {
    console.error('usage: node run.js content|publish|generator|drive_ingest|prerender|publisher');
    ok = false;
  }
  await render.stop();
  process.exit(ok ? 0 : 1);
})();
