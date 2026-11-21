// ===== AA publisher: post everything that is due to Facebook, Instagram, TikTok =====

// ---- Facebook ----
async function fbPhoto(ch, mediaUrl, caption) {
  const r = await call({ method: 'POST', url: `${ENV.GRAPH}/${ch.account_id}/photos`,
    body: { url: mediaUrl, message: caption, published: true, access_token: ch.access_token } });
  return r.post_id || r.id;
}
async function fbReel(ch, mediaUrl, caption) {
  const start = await call({ method: 'POST', url: `${ENV.GRAPH}/${ch.account_id}/video_reels`,
    body: { upload_phase: 'start', access_token: ch.access_token } });
  const videoId = start.video_id;
  const uploadUrl = start.upload_url || `https://rupload.facebook.com/video-upload/${ENV.GRAPH.split('/').pop()}/${videoId}`;
  await call({ method: 'POST', url: uploadUrl, headers: { Authorization: `OAuth ${ch.access_token}`, file_url: mediaUrl } });
  // Facebook needs a moment to fetch the hosted file before finish succeeds.
  let lastErr;
  for (let i = 0; i < 6; i++) {
    try {
      await call({ method: 'POST', url: `${ENV.GRAPH}/${ch.account_id}/video_reels`,
        body: { upload_phase: 'finish', video_id: videoId, video_state: 'PUBLISHED', description: caption, access_token: ch.access_token } });
      return videoId;
    } catch (e) { lastErr = e; await sleep(10000); }
  }
  throw lastErr;
}

// ---- Instagram ----
async function igPublish(ch, params, maxWaitMs) {
  const c = await call({ method: 'POST', url: `${ENV.GRAPH}/${ch.account_id}/media`, body: { ...params, access_token: ch.access_token } });
  const t0 = Date.now();
  while (true) {
    const s = await call({ method: 'GET', url: `${ENV.GRAPH}/${c.id}`, qs: { fields: 'status_code,status', access_token: ch.access_token } });
    if (s.status_code === 'FINISHED') break;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error(`IG container ${s.status_code}: ${s.status || ''}`);
    if (Date.now() - t0 > maxWaitMs) throw new Error('IG container still processing, will retry');
    await sleep(5000);
  }
  const p = await call({ method: 'POST', url: `${ENV.GRAPH}/${ch.account_id}/media_publish`, body: { creation_id: c.id, access_token: ch.access_token } });
  return p.id;
}
const igPhoto = (ch, url, caption) => igPublish(ch, { image_url: url, caption }, 60000);
const igReel = (ch, url, caption) => igPublish(ch, { media_type: 'REELS', video_url: url, caption, share_to_feed: true }, 240000);

// ---- TikTok ----
async function ttToken(ch) {
  const exp = ch.token_expires_at ? new Date(ch.token_expires_at).getTime() : 0;
  if (ch.refresh_token && exp - Date.now() < 15 * 60e3) {
    const f = { client_key: ENV.TIKTOK_CLIENT_KEY, client_secret: ENV.TIKTOK_CLIENT_SECRET, grant_type: 'refresh_token', refresh_token: ch.refresh_token };
    const form = Object.entries(f).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
    const t = await call({ method: 'POST', url: 'https://open.tiktokapis.com/v2/oauth/token/', json: false, body: form,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    const tok = typeof t === 'string' ? JSON.parse(t) : t;
    if (!tok.access_token) throw new Error('TikTok token refresh failed: ' + JSON.stringify(tok).slice(0, 300));
    ch.access_token = tok.access_token;
    await sb('PATCH', `aa_channels?key=eq.${ch.key}`, {
      access_token: tok.access_token, refresh_token: tok.refresh_token || ch.refresh_token,
      token_expires_at: new Date(Date.now() + (tok.expires_in || 86400) * 1000).toISOString() });
  }
  return ch.access_token;
}
function ttCheck(r) {
  if (r.error && r.error.code && r.error.code !== 'ok') throw new Error(`TikTok ${r.error.code}: ${r.error.message || ''}`);
  return r.data && r.data.publish_id;
}
async function ttVideo(ch, url, caption) {
  const token = await ttToken(ch);
  return ttCheck(await call({ method: 'POST', url: 'https://open.tiktokapis.com/v2/post/publish/video/init/',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' },
    body: { post_info: { title: caption.slice(0, 2200), privacy_level: ENV.TIKTOK_PRIVACY, disable_duet: false, disable_comment: false, disable_stitch: false, video_cover_timestamp_ms: 1000 },
            source_info: { source: 'PULL_FROM_URL', video_url: url } } }));
}
async function ttPhoto(ch, url, caption, hook) {
  const token = await ttToken(ch);
  return ttCheck(await call({ method: 'POST', url: 'https://open.tiktokapis.com/v2/post/publish/content/init/',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' },
    body: { post_info: { title: String(hook || '').slice(0, 90), description: caption.slice(0, 4000), privacy_level: ENV.TIKTOK_PRIVACY, disable_comment: false, auto_add_music: true },
            source_info: { source: 'PULL_FROM_URL', photo_cover_index: 0, photo_images: [url] },
            post_mode: 'DIRECT_POST', media_type: 'PHOTO' } }));
}

// ---- YouTube Shorts ----
async function ytToken(ch) {
  const exp = ch.token_expires_at ? new Date(ch.token_expires_at).getTime() : 0;
  if (ch.access_token && exp - Date.now() > 5 * 60e3) return ch.access_token;
  const f = { client_id: ENV.YT_CLIENT_ID, client_secret: ENV.YT_CLIENT_SECRET, grant_type: 'refresh_token', refresh_token: ch.refresh_token };
  const form = Object.entries(f).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  let t = await call({ method: 'POST', url: 'https://oauth2.googleapis.com/token', json: false, body: form,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  if (typeof t === 'string') t = JSON.parse(t);
  if (!t.access_token) throw new Error('YouTube token refresh failed');
  ch.access_token = t.access_token;
  await sb('PATCH', `aa_channels?key=eq.${ch.key}`, { access_token: t.access_token,
    token_expires_at: new Date(Date.now() + (t.expires_in || 3600) * 1000).toISOString() });
  return t.access_token;
}
async function ytShort(ch, mediaUrl, content) {
  const token = await ytToken(ch);
  const video = await http({ method: 'GET', url: mediaUrl, encoding: 'arraybuffer', json: false, timeout: 120000 });
  const bytes = Buffer.isBuffer(video) ? video : Buffer.from(video);
  let title = stripEmoji(content.hook || '').replace(/[<>]/g, '').slice(0, 90).trim();
  if (!/#shorts/i.test(title)) title = (title + ' #Shorts').slice(0, 100);
  const description = stripEmoji(fullCaption(content) + '\n\n#Shorts').replace(/[<>]/g, '').slice(0, 4900);
  const meta = {
    snippet: { title, description, tags: (content.hashtags || []).slice(0, 10), categoryId: '27', defaultLanguage: content.lang, defaultAudioLanguage: content.lang },
    status: { privacyStatus: ENV.YT_PRIVACY, selfDeclaredMadeForKids: false, containsSyntheticMedia: content.source !== 'drive' },
  };
  const init = await http({ method: 'POST', url: 'https://www.googleapis.com/upload/youtube/v3/videos', qs: { uploadType: 'resumable', part: 'snippet,status' },
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': 'video/mp4', 'X-Upload-Content-Length': String(bytes.length) },
    body: meta, json: true, returnFullResponse: true, ignoreHttpStatusErrors: true });
  const loc = init.headers && (init.headers.location || init.headers.Location);
  if (!loc) throw new Error(`YouTube upload init failed (${init.statusCode}): ${JSON.stringify(init.body).slice(0, 300)}`);
  const up = await call({ method: 'PUT', url: loc, body: bytes, json: false, timeout: 300000,
    headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(bytes.length) } });
  const v = typeof up === 'string' ? JSON.parse(up) : up;
  if (!v.id) throw new Error('YouTube upload returned no video id');
  return v.id;
}

async function publishOne(ch, content, mediaUrl) {
  const checked = await fixBrokenLinks(fullCaption(content), content.lang);
  const caption = checked.text;
  if (checked.fixed.length) content.caption = (await fixBrokenLinks(content.caption, content.lang)).text;
  if (bannedHits(caption).length) throw new Error('blocked by brand guardrail: ' + bannedHits(caption).join(', '));
  if (ENV.DRY_RUN) return `dry-run:${ch.platform}:${content.format}`;
  const reel = content.format === 'reel';
  if (ch.platform === 'facebook') return reel ? fbReel(ch, mediaUrl, caption) : fbPhoto(ch, mediaUrl, caption);
  if (ch.platform === 'instagram') return reel ? igReel(ch, mediaUrl, caption) : igPhoto(ch, mediaUrl, caption);
  if (ch.platform === 'tiktok') return reel ? ttVideo(ch, mediaUrl, caption) : ttPhoto(ch, mediaUrl, caption, content.hook);
  if (ch.platform === 'youtube') { if (!reel) throw new Error('YouTube takes reels only'); return ytShort(ch, mediaUrl, content); }
  throw new Error('unknown platform ' + ch.platform);
}

// ---- main ----
await rpc('aa_skip_stale');
const claimed = await rpc('aa_claim_due_posts', { p_limit: 12 });
const mediaByContent = {};
const results = [];

for (const item of claimed || []) {
  const { post, content, channel } = item;
  const now = new Date().toISOString();
  try {
    if (!channel.account_id || !(channel.access_token || (channel.platform === 'youtube' && channel.refresh_token))) throw new Error('channel missing account_id/access_token');
    let mediaUrl = mediaByContent[content.id] || content.media_url;
    if (!mediaUrl) {
      try { mediaUrl = await renderContent(content); }
      catch (e) { await markRenderFailed(content, e); throw e; }
    }
    mediaByContent[content.id] = mediaUrl;
    const remoteId = await publishOne(channel, content, mediaUrl);
    await sb('PATCH', `aa_posts?id=eq.${post.id}`, { status: 'published', remote_id: String(remoteId || ''), error: null, published_at: now, updated_at: now });
    results.push({ json: { post: post.id, channel: channel.key, format: content.format, ok: true, remote_id: remoteId } });
  } catch (e) {
    const msg = String(e.message || e).slice(0, 500);
    const status = post.attempts >= 3 ? 'failed' : 'retry';
    await sb('PATCH', `aa_posts?id=eq.${post.id}`, { status, error: msg, updated_at: now });
    results.push({ json: { post: post.id, channel: channel.key, ok: false, status, error: msg } });
  }
}
return results.length ? results : [{ json: { published: 0 } }];
