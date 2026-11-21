// ===== AA Drive ingest: post the ready-made reels from Google Drive =====
// English files -> English Facebook pages only. Bangla files -> Bangla Facebook page only.
// A file is "done" once it is in aa_content (source_id = Drive file id). Files inside a
// subfolder whose name contains "posted" are skipped (move already-posted reels there).

const FOLDER_ID = $env.DRIVE_FOLDER_ID || '1uQmVcdSeZFCs_HbNkWQJdQVKhpm7bTd7';
const API_KEY = $env.GOOGLE_API_KEY;
const PER_DAY = Number($env.DRIVE_PER_DAY || 8);          // Drive reels per language per day
const PLATFORMS = String($env.DRIVE_PLATFORMS || 'facebook').split(',').map((s) => s.trim());
const STEP_H = Math.max(1, Math.floor(18 / PER_DAY));      // spread over 7am-1am Dhaka; 8/day -> every 2 hours
const MINUTE = 15;                                          // Drive reels go out at :15 (+ channel offset)

// ---- Drive listing (public "anyone with the link" folder + API key) ----
async function listChildren(folderId) {
  const out = [];
  let pageToken;
  do {
    const qs = { q: `'${folderId}' in parents and trashed = false`, key: API_KEY, pageSize: 1000,
      fields: 'nextPageToken, files(id, name, mimeType, size, createdTime)', supportsAllDrives: true, includeItemsFromAllDrives: true };
    if (pageToken) qs.pageToken = pageToken;
    const r = await call({ method: 'GET', url: 'https://www.googleapis.com/drive/v3/files', qs });
    out.push(...(r.files || []));
    pageToken = r.nextPageToken;
  } while (pageToken);
  return out;
}
async function listVideos(folderId, folderName = '', depth = 0) {
  if (depth > 3) return [];
  const kids = await listChildren(folderId);
  const vids = [];
  for (const k of kids) {
    if (k.mimeType === 'application/vnd.google-apps.folder') {
      if (/posted|done|archive/i.test(k.name)) continue;
      vids.push(...(await listVideos(k.id, k.name, depth + 1)));
    } else if (/^video\//.test(k.mimeType)) {
      vids.push({ ...k, folder: folderName });
    }
  }
  return vids;
}

// ---- language from file name ----
function langFromName(name) {
  const n = name.replace(/\.[a-z0-9]+$/i, '');
  if (/(^|[_\-\s])(EN|ENG|English)([_\-\s]|$)/i.test(n)) return 'en';
  if (/(^|[_\-\s])(BN|BD|Bangla|Bengali|Bhul)([_\-\s]|$)/i.test(n) || /[ঀ-৿]/.test(n)) return 'bn';
  return null;
}
function seriesKey(f) { return f.folder + '|' + f.name.replace(/_?\d+.*$/, ''); }
function seqNum(name) { const m = name.match(/_(\d{1,3})_/); return m ? Number(m[1]) : 999; }

// ---- what is already on each page (Graph API, page token) ----
const pageReelsCache = {};
async function pageReels(ch) {
  if (pageReelsCache[ch.key]) return pageReelsCache[ch.key];
  const list = [];
  if (ch.platform === 'facebook' && ch.account_id && ch.access_token) {
    let url = `${ENV.GRAPH}/${ch.account_id}/videos`;
    let qs = { fields: 'id,description,length,created_time', limit: 100, access_token: ch.access_token };
    for (let page = 0; page < 5 && url; page++) {
      try {
        const r = await call({ method: 'GET', url, qs });
        list.push(...(r.data || []));
        url = r.paging && r.paging.next; qs = undefined;
      } catch (e) { break; }
    }
  }
  pageReelsCache[ch.key] = list;
  return list;
}
// Candidates = page videos with (almost) the same length; if lengths are unknown, the latest 25.
async function lookalikes(chs, duration) {
  const out = [];
  for (const ch of chs) {
    const vids = await pageReels(ch);
    const withLen = vids.filter((v) => typeof v.length === 'number');
    const near = withLen.length ? withLen.filter((v) => Math.abs(v.length - duration) <= 0.6) : vids.slice(0, 25);
    near.forEach((v) => out.push({ channel: ch.key, id: v.id, text: String(v.description || '').replace(/\s+/g, ' ').slice(0, 220) }));
  }
  return out;
}

// ---- caption with vision (frames from the video) ----
async function captionFor(file, lang, frames, candidates = []) {
  const langName = lang === 'bn' ? 'Bangla (natural spoken, "তুমি" tone; keep IELTS, Band, visa, F-1 in English)' : 'English';
  const text = `This is an AdmissionArena short video reel. File name: "${file.name}" (folder "${file.folder}").
The images are frames from the video. Read the on-screen text to understand the topic.

Write the Facebook caption in ${langName}.
Voice: Alex Hormozi meets Steve Jobs. First line is a hook that challenges what most students believe. One idea. Short lines. Give real value. Calm confidence, no hype.
Rules: no emoji. Never use guarantee, guaranteed, 100%, #1, number one, sure chance, nishchit, নিশ্চিত, গ্যারান্টি, শতভাগ, "full mock test". No promises of scores, visas or admission. No invented statistics. If it is about the Creator Program, mention only "40%" commission, never money amounts.
End with one clear call to action. Pick the ONE page most relevant to this exact video (a Germany video gets the Germany guide, a visa documents video gets the document checklist). Choose ONLY from this list and copy it exactly:
${linkMenu(lang)}

${candidates.length ? `
These videos are ALREADY on our Facebook pages and have about the same length. Compare their captions with this video's on-screen text. If this is the same video (same topic and same script), list its channel keys in already_posted_on; if not sure, leave it empty.
${candidates.map((c) => `- channel=${c.channel} id=${c.id}: ${c.text}`).join('\n')}
` : ''}
Return ONLY JSON: {"already_posted_on": ["channel keys or empty"], "video_language": "en" | "bn" | "unsure", "pillar": "ielts_mistakes|ielts_tips|visa_prep|destinations|tools|creators|trust|service", "hook": "max 12 words", "link": "one link from the list, exact", "caption": "50-120 words (the link is added automatically)", "hashtags": ["3 to 5 words without #"]}`;
  const body = await call({
    method: 'POST', url: `${ENV.LLM_BASE_URL}/chat/completions`, timeout: 180000,
    headers: { Authorization: `Bearer ${ENV.LLM_API_KEY}`, 'Content-Type': 'application/json', 'X-Title': 'AdmissionArena Drive Reels' },
    body: { model: ENV.LLM_MODEL, temperature: 0.7, max_tokens: 1200, messages: [{ role: 'user', content: [
      { type: 'text', text }, ...frames.map((u) => ({ type: 'image_url', image_url: { url: u } })) ] }] },
  });
  const out = body.choices?.[0]?.message?.content || '';
  const m = out.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('caption: no JSON from LLM');
  return deepStrip(JSON.parse(m[0]));
}

// ---- main ----
if (!API_KEY) throw new Error('GOOGLE_API_KEY not set');
const files = await listVideos(FOLDER_ID);
const done = await sb('GET', 'aa_content?select=source_id&source=eq.drive&limit=10000');
const doneIds = new Set(done.map((d) => d.source_id));
const YT_FROM_DRIVE = ($env.YT_SOURCE || 'drive') === 'drive';
const channels = (await sb('GET', 'aa_channels?select=*'))
  .filter((c) => PLATFORMS.includes(c.platform) || (c.platform === 'youtube' && YT_FROM_DRIVE));
// Daily caps (YouTube API quota): count what is already scheduled per channel per Dhaka day
const dhakaDay = (t) => new Date(new Date(t).getTime() + 6 * 3600e3).toISOString().slice(0, 10);
const perDay = {};
{
  const ex = await sb('GET', `aa_posts?select=channel_key,scheduled_at&status=neq.skipped&scheduled_at=gte.${new Date(Date.now() - 86400e3).toISOString()}`);
  ex.forEach((p) => { const k = `${p.channel_key}|${dhakaDay(p.scheduled_at)}`; perDay[k] = (perDay[k] || 0) + 1; });
}
function underCap(ch, at) {
  if (!ch.max_per_day) return true;
  const k = `${ch.key}|${dhakaDay(at)}`;
  if ((perDay[k] || 0) >= ch.max_per_day) return false;
  perDay[k] = (perDay[k] || 0) + 1;
  return true;
}

// Already-scheduled Drive slots in the next 26h, per language
const horizonStart = new Date();
const horizonEnd = new Date(Date.now() + 26 * 3600e3);
const sched = await sb('GET', `aa_content?select=slot_at,lang&source=eq.drive&slot_at=gte.${horizonStart.toISOString()}&slot_at=lte.${horizonEnd.toISOString()}`);
const taken = new Set(sched.map((s) => `${s.lang}|${new Date(s.slot_at).toISOString()}`));

function freeSlots(lang) {
  const out = [];
  const t = new Date(); t.setUTCMinutes(0, 0, 0);
  for (let h = 1; h <= 24; h++) {
    const s = new Date(t.getTime() + h * 3600e3);
    // Dhaka hour decides the spacing; skip 1am-7am Dhaka when few people scroll
    const dh = (s.getUTCHours() + 6) % 24;
    if (dh >= 1 && dh < 7) continue;
    if (((dh - 7 + 24) % 24) % STEP_H !== 0) continue;
    s.setUTCMinutes(MINUTE);
    if (!taken.has(`${lang}|${s.toISOString()}`)) out.push(s.toISOString());
  }
  return out;
}

const pending = files.filter((f) => !doneIds.has(f.id));
const report = { total_files: files.length, already_done: files.length - pending.length, scheduled: [], already_on_page: [], skipped: [] };

for (const lang of ['en', 'bn']) {
  const slots = freeSlots(lang).slice(0, Math.max(0, PER_DAY - sched.filter((s) => s.lang === lang).length));
  if (!slots.length) continue;
  // Candidates: known-language files first, then unknown ones (decided by the video's own text)
  const known = pending.filter((f) => langFromName(f.name) === lang);
  // Round-robin across series so topics alternate, in episode order inside each series
  const bySeries = {};
  known.sort((a, b) => seqNum(a.name) - seqNum(b.name)).forEach((f) => (bySeries[seriesKey(f)] = bySeries[seriesKey(f)] || []).push(f));
  const queues = Object.values(bySeries);
  const ordered = [];
  while (queues.some((q) => q.length)) for (const q of queues) if (q.length) ordered.push(q.shift());
  ordered.push(...pending.filter((f) => !langFromName(f.name))); // no language in the name: the video's text decides

  let si = 0;
  for (const f of ordered) {
    if (si >= slots.length) break;
    try {
      const dl = `https://drive.usercontent.google.com/download?id=${f.id}&export=download`;
      const media = await call({ method: 'POST', url: `${ENV.RENDER_URL}/ingest`, timeout: 180000,
        headers: { 'x-render-token': ENV.RENDER_TOKEN, 'Content-Type': 'application/json' }, body: { url: dl, name: f.name } });
      const langGuess = langFromName(f.name) || lang;
      const candidates = await lookalikes(channels.filter((ch) => ch.lang === langGuess), media.duration || 0);
      const cap = await captionFor(f, langGuess, media.frames || [], candidates);
      const validKeys = new Set(candidates.map((c) => c.channel));
      const postedOn = (Array.isArray(cap.already_posted_on) ? cap.already_posted_on : []).filter((k) => validKeys.has(k));
      const vlang = langFromName(f.name) || (['en', 'bn'].includes(cap.video_language) ? cap.video_language : null);
      if (!vlang) { report.skipped.push({ file: f.name, reason: 'language unclear: rename with _EN_ or _BN_' }); continue; }
      if (vlang !== lang) { report.skipped.push({ file: f.name, reason: `detected ${vlang}; goes in the ${vlang} queue` }); continue; }
      const row = {
        slot_at: slots[si], lang, format: 'reel', pillar: cap.pillar || 'trust', hook: String(cap.hook || f.name).slice(0, 140),
        payload: { lang, source: 'drive', frames: media.frames, duration: media.duration },
        caption: setCaptionLink(cap.caption, allowedLink(lang, cap.link) || HOME[lang]),
        hashtags: (cap.hashtags || []).slice(0, 5).map((h) => String(h).replace(/[#\s]/g, '')).filter(Boolean),
        media_url: media.url, status: 'rendered', source: 'drive', source_id: f.id, source_name: f.name,
      };
      if (String(cap.caption || '').trim().length < 30) throw new Error('caption too short');
      const hits = bannedHits({ c: row.caption, h: row.hashtags, k: row.hook });
      if (hits.length) throw new Error('caption has banned words: ' + hits.join(', '));
      const targets = channels.filter((ch) => ch.lang === lang && !postedOn.includes(ch.key) && ch.platform !== 'youtube');
      const ytTargets = channels.filter((ch) => ch.lang === lang && ch.platform === 'youtube' && underCap(ch, slots[si]));
      if (!targets.length && !ytTargets.length) {
        // Already on every page for this language: remember it so it is never checked again.
        if (!ENV.DRY_RUN) await sb('POST', 'aa_content', { ...row, slot_at: new Date().toISOString(), status: 'rejected', error: 'already posted on ' + postedOn.join(', ') });
        report.already_on_page.push({ file: f.name, channels: postedOn });
        continue;
      }
      if (ENV.DRY_RUN) { report.scheduled.push({ file: f.name, lang, slot: row.slot_at, hook: row.hook, skip_channels: postedOn, dry_run: true }); si++; continue; }
      const [c] = await sb('POST', 'aa_content', row);
      const posts = [...targets, ...ytTargets].map((ch) => ({
        content_id: c.id, channel_key: ch.key, scheduled_at: new Date(new Date(c.slot_at).getTime() + (ch.offset_minutes || 0) * 60e3).toISOString() }));
      if (posts.length) await sb('POST', 'aa_posts?on_conflict=content_id,channel_key', posts, { Prefer: 'resolution=ignore-duplicates,return=minimal' });
      report.scheduled.push({ file: f.name, lang, slot: row.slot_at, channels: posts.map((p) => p.channel_key), already_on: postedOn, hook: row.hook });
      si++;
    } catch (e) {
      report.skipped.push({ file: f.name, reason: String(e.message || e).slice(0, 300) });
    }
  }
}
const justDone = new Set(report.scheduled.map((x) => x.file));
const left = pending.filter((f) => !justDone.has(f.name));
report.remaining = { en: left.filter((f) => langFromName(f.name) === 'en').length, bn: left.filter((f) => langFromName(f.name) === 'bn').length,
  unknown_language: left.filter((f) => !langFromName(f.name)).length };
return [{ json: report }];
