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
// Verified AdmissionArena pages. Posts may only link to these; each post gets the most relevant one.
const SITE = 'https://admissionarena.com';
const LINKS = {
  en: {
    'IELTS overview, plans, speaking practice': '/ielts',
    'IELTS writing mistakes, essay check': '/tools/ielts-writing-checker',
    'IELTS writing Task 1': '/tools/ielts-writing-task-1-checker',
    'IELTS writing Task 2': '/tools/ielts-writing-task-2-checker',
    'IELTS writing practice test': '/tools/ielts-writing-practice-test',
    'IELTS reading practice test': '/tools/ielts-reading-practice-test',
    'IELTS reading true/false/not given': '/tools/ielts-reading-true-false-not-given-practice',
    'IELTS reading matching headings': '/tools/ielts-reading-matching-headings-practice',
    'IELTS listening practice test': '/tools/ielts-listening-practice-test',
    'IELTS band score calculator': '/tools/ielts-band-score-calculator',
    'English test score converter (IELTS/TOEFL/PTE/Duolingo)': '/tools/english-test-score-converter',
    'visa interview practice (F-1, UK)': '/visa-prep',
    'student visa document checklist': '/tools/student-visa-document-checklist',
    'statement of purpose / SOP': '/tools/statement-of-purpose-generator',
    'admission chance': '/tools/admission-chance-calculator',
    'cost of studying abroad, budget': '/tools/cost-of-studying-abroad-calculator',
    'scholarships': '/tools/scholarship-eligibility-checker',
    'student loan EMI': '/tools/student-loan-emi-calculator',
    'cheapest universities': '/tools/cheapest-universities-for-international-students',
    'universities accepting low GPA': '/tools/universities-accepting-low-gpa',
    'universities without application fee': '/tools/universities-without-application-fee',
    'CGPA to percentage': '/tools/cgpa-to-percentage',
    'all free tools': '/tools',
    'study in USA': '/destinations/study-in-usa-from-bangladesh',
    'study in UK': '/destinations/study-in-uk-from-bangladesh',
    'study in Canada': '/destinations/study-in-canada-from-bangladesh',
    'study in Australia': '/destinations/study-in-australia-from-bangladesh',
    'study in Germany': '/destinations/study-in-germany-from-bangladesh',
    'study in Japan': '/destinations/study-in-japan-from-bangladesh',
    'study in China': '/destinations/study-in-china-from-bangladesh',
    'study in Malaysia': '/destinations/study-in-malaysia-from-bangladesh',
    'study in Turkiye': '/destinations/study-in-turkey-from-bangladesh',
    'study in Malta': '/destinations/study-in-malta-from-bangladesh',
    'study in Cyprus': '/destinations/study-in-cyprus-from-bangladesh',
    'creator / affiliate program': '/creators',
    'about us, trust, our promise': '/about',
    'free consultation, talk to an advisor': '/contact',
  },
  bn: {
    'IELTS overview, plans, speaking practice': '/bn/ielts',
    'IELTS writing mistakes, essay check': '/bn/tools/ielts-writing-checker',
    'IELTS writing Task 1': '/bn/tools/ielts-writing-task-1-checker',
    'IELTS writing Task 2': '/bn/tools/ielts-writing-task-2-checker',
    'IELTS writing practice test': '/bn/tools/ielts-writing-practice-test',
    'IELTS reading practice': '/bn/tools/ielts-reading-practice',
    'IELTS band score calculator': '/bn/tools/ielts-band-score-calculator',
    'English test score converter': '/bn/tools/english-test-score-converter',
    'visa interview practice (F-1, UK)': '/bn/visa-prep',
    'student visa document checklist': '/bn/tools/student-visa-document-checklist',
    'admission chance': '/bn/tools/admission-chance-calculator',
    'cost of studying abroad, budget': '/bn/tools/cost-of-studying-abroad-calculator',
    'scholarships': '/bn/tools/scholarship-eligibility-checker',
    'student loan EMI': '/bn/tools/student-loan-emi-calculator',
    'cheapest universities': '/bn/tools/cheapest-universities-for-international-students',
    'CGPA to percentage': '/bn/tools/cgpa-to-percentage',
    'all free tools': '/bn/tools',
    'study in USA': '/bn/destinations/study-in-usa-from-bangladesh',
    'study in UK': '/bn/destinations/study-in-uk-from-bangladesh',
    'study in Canada': '/bn/destinations/study-in-canada-from-bangladesh',
    'study in Australia': '/bn/destinations/study-in-australia-from-bangladesh',
    'study in Germany': '/bn/destinations/study-in-germany-from-bangladesh',
    'study in Japan': '/bn/destinations/study-in-japan-from-bangladesh',
    'study in China': '/bn/destinations/study-in-china-from-bangladesh',
    'study in Malaysia': '/bn/destinations/study-in-malaysia-from-bangladesh',
    'study in Turkiye': '/bn/destinations/study-in-turkey-from-bangladesh',
    'study in Malta': '/bn/destinations/study-in-malta-from-bangladesh',
    'study in Cyprus': '/bn/destinations/study-in-cyprus-from-bangladesh',
    'creator / affiliate program': '/bn/creators',
    'about us, trust, our promise': '/bn/about',
    'free consultation, talk to an advisor': '/bn/contact',
  },
};
const HOME = { en: SITE, bn: SITE + '/bn' };
function linkMenu(lang) { return Object.entries(LINKS[lang] || LINKS.en).map(([k, v]) => `- ${k}: ${SITE}${v}`).join('\n'); }
function allowedLink(lang, url) {
  const path = String(url || '').trim().replace(/^(https?:\/\/)?(www\.)?admissionarena\.com/i, '').replace(/[).,]+$/, '').replace(/\/$/, '');
  const mine = LINKS[lang] || LINKS.en;
  if (Object.values(mine).includes(path)) return SITE + path;
  // A page from the other language: use this language's version of the same page.
  for (const other of Object.keys(LINKS)) {
    const key = Object.keys(LINKS[other]).find((k) => LINKS[other][k] === path);
    if (key && mine[key]) return SITE + mine[key];
  }
  return null;
}
// Put exactly one link in the caption: the chosen one. Any other admissionarena.com URL is replaced.
const URL_RE = /(https?:\/\/)?(www\.)?admissionarena\.com[^\s)]*/gi;
function setCaptionLink(caption, link) {
  let c = String(caption || '');
  let first = true;
  c = c.replace(URL_RE, () => { if (first) { first = false; return link; } return ''; });
  c = c.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return first ? c + '\n\n' + link : c;
}
// Live check before posting: a link that does not answer 200 is swapped for the home page.
const linkCache = {};
async function linkOk(url) {
  if (url in linkCache) return linkCache[url];
  let ok = false;
  try {
    const r = await http({ method: 'GET', url, json: false, timeout: 15000, returnFullResponse: true, ignoreHttpStatusErrors: true,
      headers: { 'User-Agent': 'Mozilla/5.0 (AdmissionArena link check)' } });
    ok = (r.statusCode || r.status) >= 200 && (r.statusCode || r.status) < 400;
  } catch (e) { ok = false; }
  linkCache[url] = ok;
  return ok;
}
async function fixBrokenLinks(text, lang) {
  const urls = [...new Set((String(text).match(URL_RE) || []).map((u) => (u.startsWith('http') ? u : 'https://' + u)))];
  let out = String(text);
  const fixed = [];
  for (const u of urls) {
    if (await linkOk(u)) continue;
    const home = HOME[lang] || SITE;
    out = out.split(u).join(home).split(u.replace(/^https:\/\//, '')).join(home);
    fixed.push(u);
  }
  return { text: out, fixed };
}
// ===== end shared helpers =====
