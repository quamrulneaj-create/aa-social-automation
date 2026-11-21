// ===== shared helpers (prepended to every Code node by build.js) =====
const ENV = {
  SUPABASE_URL: ($env.SUPABASE_URL || 'https://kwqyqklvvfwnrtkqruex.supabase.co').replace(/\/$/, ''),
  SUPABASE_KEY: $env.SUPABASE_SERVICE_KEY,
  LLM_BASE_URL: ($env.LLM_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, ''),
  LLM_API_KEY: $env.LLM_API_KEY,
  LLM_MODEL: $env.LLM_MODEL || 'anthropic/claude-sonnet-4.5',
  RENDER_URL: ($env.RENDER_URL || '').replace(/\/$/, ''),
  RENDER_TOKEN: $env.RENDER_TOKEN,
  GRAPH: 'https://graph.facebook.com/' + ($env.GRAPH_VERSION || 'v21.0'),
  TIKTOK_CLIENT_KEY: $env.TIKTOK_CLIENT_KEY,
  TIKTOK_CLIENT_SECRET: $env.TIKTOK_CLIENT_SECRET,
  TIKTOK_PRIVACY: $env.TIKTOK_PRIVACY || 'SELF_ONLY',
  YT_CLIENT_ID: $env.YT_CLIENT_ID,
  YT_CLIENT_SECRET: $env.YT_CLIENT_SECRET,
  YT_PRIVACY: $env.YT_PRIVACY || 'public',
  REEL_RATIO: Number($env.AA_REEL_RATIO || 0.5),
  DRY_RUN: String($env.AA_DRY_RUN || '').toLowerCase() === 'true',
};
const http = this.helpers.httpRequest.bind(this.helpers);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// HTTP wrapper: never throws on status; throws a readable error on non-2xx.
async function call(opts) {
  const res = await http({ json: true, timeout: 120000, ...opts, returnFullResponse: true, ignoreHttpStatusErrors: true });
  const code = res.statusCode || res.status || 0;
  let body = res.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { /* keep text */ } }
  if (code < 200 || code >= 300) {
    const msg = body && (body.error?.message || body.error?.error_user_msg || body.message || body.error_description || JSON.stringify(body));
    const err = new Error(`${opts.method || 'GET'} ${String(opts.url).split('?')[0]} -> ${code}: ${String(msg).slice(0, 400)}`);
    err.status = code;
    throw err;
  }
  return body;
}

// Supabase REST
async function sb(method, path, body, extraHeaders = {}) {
  return call({
    method, url: `${ENV.SUPABASE_URL}/rest/v1/${path}`, body,
    headers: {
      apikey: ENV.SUPABASE_KEY, Authorization: `Bearer ${ENV.SUPABASE_KEY}`,
      'Content-Type': 'application/json', Prefer: 'return=representation', ...extraHeaders,
    },
  });
}
const rpc = (fn, args = {}) => sb('POST', `rpc/${fn}`, args);

// Brand guardrails: no emoji, no banned claims.
const EMOJI_RE = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}\u{20E3}]/gu;
const BANNED = [
  /\bguarantee(d|s)?\b/i, /100\s*%/, /১০০\s*%/, /#1(?!\d)/, /\bnumber\s*one\b/i, /\bno\.?\s*1\b/i,
  /\bnishchit\b/i, /\bsure\s*chance\b/i, /নিশ্চিত/, /গ্যারান্টি/, /গ্যারেন্টি/, /শতভাগ/,
  /\bfull\s*mock\s*test\b/i,
];
function stripEmoji(s) { return String(s ?? '').replace(EMOJI_RE, '').replace(/[ \t]{2,}/g, ' ').replace(/ +\n/g, '\n').trim(); }
function deepStrip(v) {
  if (typeof v === 'string') return stripEmoji(v);
  if (Array.isArray(v)) return v.map(deepStrip);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deepStrip(x)]));
  return v;
}
function bannedHits(v) {
  const text = JSON.stringify(v);
  return BANNED.filter((re) => re.test(text)).map((re) => re.source);
}
function fullCaption(content) {
  const tags = (content.hashtags || []).map((t) => '#' + String(t).replace(/^#/, '').replace(/\s+/g, '')).filter((t) => t.length > 1);
  return stripEmoji(content.caption + (tags.length ? '\n\n' + tags.join(' ') : ''));
}
// ===== end shared helpers =====
