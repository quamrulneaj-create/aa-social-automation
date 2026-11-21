// ===== AA content generator =====
// Fills every missing hourly slot in the next 24h, per language, then queues posts per channel.
// Safe to run any time (idempotent): it only creates slots that don't exist yet.

const HOURS_AHEAD = 24;

const PILLARS = {
  ielts_mistakes: { w: 3, brief: 'IELTS mistake series. One common mistake, why it costs band score, the exact fix. Label the series as "IELTS Mistakes, Part N" / "IELTS ভুল, পর্ব N" (never use the # symbol).', url: { en: '/tools/ielts-writing-checker', bn: '/bn/tools/ielts-writing-checker' } },
  ielts_tips: { w: 3, brief: 'One practical IELTS technique (Reading, Writing, Listening or Speaking) a student can use today. CTA goes to the free Reading/Writing practice test. Never mention a "full mock test".', url: { en: '/tools/ielts-writing-practice-test', bn: '/bn/tools/ielts-writing-practice-test' } },
  visa_prep: { w: 2, brief: 'Student visa interview prep: US F-1 or UK credibility interview. One question officers ask, what weak answers look like, what a credible answer contains. Point to the AI visa interview practice.', url: { en: '/visa-prep', bn: '/bn/visa-prep' } },
  destinations: { w: 2, brief: 'One rarely-changing fact or decision framework about studying in one of: USA, UK, Canada, Australia, Germany, Japan, China, Malaysia, Türkiye, Malta, Cyprus. No fees, deadlines or numbers that change yearly.', url: { en: '/tools', bn: '/bn/tools' } },
  tools: { w: 2, brief: 'Spotlight ONE free AdmissionArena tool and the problem it solves in 30 seconds. Pick from: Admission Chance Calculator, Cost of Studying Abroad Calculator, Scholarship Eligibility Checker, IELTS Band Score Calculator, CGPA to Percentage, Cheapest Universities finder.', url: { en: '/tools', bn: '/bn/tools' } },
  creators: { w: 2, brief: 'Recruit content creators (students, teachers, study-abroad creators) to the free AdmissionArena Creator Program: free to join, earn 40% commission on paid IELTS plans their audience buys. Mention only "40%", never per-sale money amounts. Address individual creators, not institutes.', url: { en: '/creators', bn: '/bn/creators' } },
  trust: { w: 1, brief: 'Why students and parents can trust AdmissionArena: source-backed data, honest advice, no false promises, transparent costs. Brand promise: "Serve with love. Grow with integrity."', url: { en: '/about', bn: '/bn/about' } },
  service: { w: 1, brief: 'Free expert guidance: what to bring to a study-abroad consultation and what a good advisor should tell you. Invite them to book.', url: { en: '/contact', bn: '/bn/contact' } },
};

const VOICE = `You write social posts for AdmissionArena (admissionarena.com): IELTS practice with AI feedback, visa interview practice, free study-abroad tools and expert guidance for students in Bangladesh, South Asia and Africa.

VOICE: Alex Hormozi meets Steve Jobs.
- Hormozi: open with a hook that challenges what most students believe. Be specific and concrete. Give away the real answer, not a teaser. Short punchy sentences. "Most students do X. Do Y instead." Clear single call to action.
- Jobs: one idea per post. Radical simplicity. Plain words, no jargon. Confident and calm, never hype. Rule of three when listing.

HARD RULES (breaking any = rejected):
- No emoji anywhere. No emoticons.
- Never use: guarantee, guaranteed, 100%, #1, number one, sure chance, nishchit, নিশ্চিত, গ্যারান্টি, শতভাগ, "full mock test".
- No promises of scores, admission or visas. No invented statistics or percentages. No fees, dates or rules that change often.
- Hashtags: 3 to 5, plain words, no "#1".
- Bangla posts: natural spoken Bangla in "তুমি" tone; keep terms like IELTS, Band, Task 2, visa, F-1 in English.
- English posts: simple global English.`;

function weightedPillarCycle() {
  const out = [];
  for (const [k, p] of Object.entries(PILLARS)) for (let i = 0; i < p.w; i++) out.push(k);
  // interleave so the same pillar doesn't run back to back
  const res = [];
  const buckets = {};
  out.forEach((k) => (buckets[k] = (buckets[k] || 0) + 1));
  while (res.length < out.length) {
    for (const k of Object.keys(PILLARS)) if (buckets[k] > 0) { res.push(k); buckets[k]--; }
  }
  return res;
}

function hourSlots() {
  const now = new Date();
  const first = new Date(now);
  first.setUTCMinutes(0, 0, 0);
  first.setUTCHours(first.getUTCHours() + 1);
  return Array.from({ length: HOURS_AHEAD }, (_, i) => new Date(first.getTime() + i * 3600e3));
}

async function llm(messages) {
  const body = await call({
    method: 'POST', url: `${ENV.LLM_BASE_URL}/chat/completions`, timeout: 240000,
    headers: { Authorization: `Bearer ${ENV.LLM_API_KEY}`, 'Content-Type': 'application/json', 'X-Title': 'AdmissionArena Social' },
    body: { model: ENV.LLM_MODEL, temperature: 0.8, max_tokens: 12000, messages },
  });
  const text = body.choices?.[0]?.message?.content || '';
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) throw new Error('LLM returned no JSON array');
  return JSON.parse(m[0]);
}

function buildPrompt(lang, specs, recentHooks) {
  const langName = lang === 'bn' ? 'Bangla' : 'English';
  const lines = specs.map((s, i) => `${i + 1}. slot=${s.slot} pillar=${s.pillar} format=${s.format}\n   brief: ${PILLARS[s.pillar].brief}\n   default link: ${SITE}${PILLARS[s.pillar].url[lang]}`);
  return `Write ${specs.length} ${langName} posts, one per line item below.

${lines.join('\n')}

LINKS: every post ends with ONE link, the page most relevant to that exact post (a Germany post links the Germany guide, a scholarship post links the scholarship checker). Choose ONLY from this list, copy it exactly:
${linkMenu(lang)}

Do NOT repeat these recent hooks:
${recentHooks.slice(0, 60).map((h) => '- ' + h).join('\n') || '- (none)'}

Return ONLY a JSON array, one object per item, same order:
{
  "slot": "<copy slot>", "pillar": "<copy>", "format": "<copy>",
  "hook": "max 12 words, the scroll-stopping first line",
  "eyebrow": "max 4 words topic label",
  "headline": "static only: max 14 words",
  "points": ["static only: exactly 3 items, max 8 words each"],
  "slides": [{"text": "reel only: max 9 words", "sub": "optional, max 14 words"}],
  "cta": "max 5 words",
  "highlight": "2 to 4 words copied exactly from the headline (static) or slide 1 (reel) to colour gold: the most important words",
  "motion_prompt": "reel only: one short sentence of natural movement for the photo as a 5-second video clip (e.g. 'she looks up from her notes and smiles, slow camera push-in')",
  "image_prompt": "one sentence describing a realistic photo for this post: young Bangladeshi/South Asian student(s) in a scene that matches the topic (e.g. studying IELTS at a desk, passport at an airport, on a German campus, graduation). No text in the image.",
  "link": "the single most relevant link from the LINKS list, copied exactly",
  "caption": "60-140 words. Line 1 = hook. Short lines. Real value. End with the CTA (the link is added automatically).",
  "hashtags": ["3 to 5 words without #"]
}
For reels: 4 to 6 slides. Slide 1 is the hook. Last slide is the CTA. Each slide one thought.`;
}

function normalise(item, spec, lang) {
  const x = deepStrip(item || {});
  const link = allowedLink(lang, x.link) || SITE + PILLARS[spec.pillar].url[lang];
  const url = link.replace(/^https:\/\//, '');
  const payload = {
    lang, eyebrow: String(x.eyebrow || '').slice(0, 40), cta: String(x.cta || '').slice(0, 40), url,
    highlight: String(x.highlight || '').slice(0, 60),
    image_prompt: String(x.image_prompt || '').slice(0, 400),
  };
  if (spec.format === 'reel' && spec.motion) { payload.motion = true; payload.motion_prompt = String(x.motion_prompt || '').slice(0, 300); }
  if (spec.format === 'static') {
    payload.headline = String(x.headline || x.hook || '').slice(0, 120);
    payload.points = (Array.isArray(x.points) ? x.points : []).slice(0, 3).map((p) => String(p).slice(0, 70));
  } else {
    payload.slides = (Array.isArray(x.slides) ? x.slides : []).slice(0, 6)
      .map((s) => ({ text: String(s.text || '').slice(0, 90), sub: s.sub ? String(s.sub).slice(0, 120) : undefined }))
      .filter((s) => s.text);
  }
  const caption = String(x.caption || '').trim() ? setCaptionLink(x.caption, link) : '';
  return {
    slot_at: spec.slot, lang, format: spec.format, pillar: spec.pillar,
    hook: String(x.hook || payload.headline || '').slice(0, 140),
    payload, caption,
    hashtags: (Array.isArray(x.hashtags) ? x.hashtags : []).slice(0, 5).map((h) => String(h).replace(/[#\s]/g, '')).filter(Boolean),
  };
}

function valid(row) {
  if (!row.hook || !row.caption || row.caption.length < 40) return 'missing hook/caption';
  if (row.format === 'static' && (!row.payload.headline || row.payload.points.length < 2)) return 'static needs headline + points';
  if (row.format === 'reel' && row.payload.slides.length < 3) return 'reel needs 3+ slides';
  const hits = bannedHits({ p: row.payload, c: row.caption, h: row.hashtags });
  if (hits.length) return 'banned words: ' + hits.join(', ');
  return null;
}

// ---- main ----
const slots = hourSlots();
const from = slots[0].toISOString();
const to = new Date(slots[slots.length - 1].getTime() + 1000).toISOString();

const channels = await sb('GET', 'aa_channels?select=*');
const langs = [...new Set(channels.map((c) => c.lang))];
const existing = await sb('GET', `aa_content?select=slot_at,lang&status=neq.rejected&source=eq.ai&slot_at=gte.${from}&slot_at=lte.${to}`);
const have = new Set(existing.map((e) => `${e.lang}|${new Date(e.slot_at).toISOString()}`));
const recent = await sb('GET', `aa_content?select=hook,lang,pillar&order=created_at.desc&limit=400&created_at=gte.${new Date(Date.now() - 10 * 86400e3).toISOString()}`);
const pillarCountRecent = {};
recent.forEach((r) => (pillarCountRecent[r.pillar] = (pillarCountRecent[r.pillar] || 0) + 1));

const cycle = weightedPillarCycle();
const results = { created: 0, rejected: [], posts: 0, langs: {} };

// Higgsfield video intros: only a few reels per language per Dhaka day (each clip costs credits).
const HF_PER_DAY = Number($env.HF_REELS_PER_DAY || 4);
const dDay = (t) => new Date(new Date(t).getTime() + 6 * 3600e3).toISOString().slice(0, 10);
const motionUsed = {};
if (HF_PER_DAY > 0 && $env.HF_API_KEY_ID) {
  const m = await sb('GET', `aa_content?select=slot_at,lang&payload->>motion=eq.true&slot_at=gte.${new Date(Date.now() - 86400e3).toISOString()}`);
  m.forEach((r) => { const k = `${r.lang}|${dDay(r.slot_at)}`; motionUsed[k] = (motionUsed[k] || 0) + 1; });
}
function takeMotion(lang, slot) {
  if (!(HF_PER_DAY > 0 && $env.HF_API_KEY_ID)) return false;
  const dh = (new Date(slot).getUTCHours() + 6) % 24;
  if (dh < 9 || dh > 23) return false; // spend clips on busy hours
  const k = `${lang}|${dDay(slot)}`;
  if ((motionUsed[k] || 0) >= HF_PER_DAY) return false;
  motionUsed[k] = (motionUsed[k] || 0) + 1;
  return true;
}

const jobs = [];
for (const lang of langs) {
  const missing = slots.filter((s) => !have.has(`${lang}|${s.toISOString()}`));
  if (!missing.length) continue;
  const offset = recent.filter((r) => r.lang === lang).length; // rotate where the cycle starts
  const specs = missing.map((s, i) => {
    const h = s.getUTCHours();
    const reel = ENV.REEL_RATIO >= 1 ? true : ENV.REEL_RATIO <= 0 ? false : ((h + (lang === 'bn' ? 1 : 0)) % Math.round(1 / ENV.REEL_RATIO) === 0);
    return { slot: s.toISOString(), pillar: cycle[(offset + i) % cycle.length], format: reel ? 'reel' : 'static', motion: reel && takeMotion(lang, s.toISOString()) };
  });
  const hooks = recent.filter((r) => r.lang === lang).map((r) => r.hook);
  for (let i = 0; i < specs.length; i += 8) jobs.push({ lang, specs: specs.slice(i, i + 8), hooks });
}

const batches = await Promise.all(jobs.map(async (job) => {
  try {
    const items = await llm([{ role: 'system', content: VOICE }, { role: 'user', content: buildPrompt(job.lang, job.specs, job.hooks) }]);
    return { job, items };
  } catch (e) {
    return { job, error: String(e.message || e) };
  }
}));

const rows = [];
for (const b of batches) {
  if (b.error) { results.rejected.push({ lang: b.job.lang, reason: b.error, count: b.job.specs.length }); continue; }
  b.job.specs.forEach((spec, i) => {
    const item = b.items.find((it) => it && it.slot === spec.slot) || b.items[i];
    const row = normalise(item, spec, b.job.lang);
    const why = valid(row);
    if (why) results.rejected.push({ lang: b.job.lang, slot: spec.slot, reason: why });
    else rows.push(row);
  });
}

let inserted = [];
if (rows.length && !ENV.DRY_RUN) inserted = await sb('POST', 'aa_content', rows);
else inserted = rows.map((r, i) => ({ ...r, id: `dry-${i}` }));
results.created = inserted.length;

// Daily caps (e.g. TikTok): count what is already scheduled per channel per Dhaka calendar day.
const dhakaDay = (t) => new Date(new Date(t).getTime() + 6 * 3600e3).toISOString().slice(0, 10);
const perDay = {};
if (channels.some((c) => c.max_per_day)) {
  const ex = await sb('GET', `aa_posts?select=channel_key,scheduled_at&status=neq.skipped&scheduled_at=gte.${new Date(Date.now() - 86400e3).toISOString()}`);
  ex.forEach((p) => { const k = `${p.channel_key}|${dhakaDay(p.scheduled_at)}`; perDay[k] = (perDay[k] || 0) + 1; });
}
inserted.sort((a, b) => (a.format === b.format ? 0 : a.format === 'reel' ? -1 : 1)); // capped channels get reels first

const posts = [];
for (const c of inserted) {
  for (const ch of channels.filter((x) => x.lang === c.lang)) {
    if (ch.pillar_filter && ch.pillar_filter.length && !ch.pillar_filter.includes(c.pillar)) continue;
    if (ch.formats && !ch.formats.includes(c.format)) continue;
    if (ch.platform === 'youtube' && ($env.YT_SOURCE || 'drive') === 'drive') continue; // YouTube gets the Drive reels
    if (ch.max_per_day) {
      const day = dhakaDay(c.slot_at);
      const k = `${ch.key}|${day}`;
      if ((perDay[k] || 0) >= ch.max_per_day) continue;
      perDay[k] = (perDay[k] || 0) + 1;
    }
    const at = new Date(new Date(c.slot_at).getTime() + (ch.offset_minutes || 0) * 60e3).toISOString();
    posts.push({ content_id: c.id, channel_key: ch.key, scheduled_at: at });
  }
}
if (posts.length && !ENV.DRY_RUN) await sb('POST', 'aa_posts?on_conflict=content_id,channel_key', posts, { Prefer: 'resolution=ignore-duplicates,return=minimal' });
results.posts = posts.length;
for (const r of inserted) results.langs[r.lang] = (results.langs[r.lang] || 0) + 1;

return [{ json: results }];
