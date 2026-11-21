// ===== render helper (shared by prerender + publisher) =====
async function renderContent(c) {
  if (!ENV.RENDER_URL) throw new Error('RENDER_URL not set');
  const endpoint = c.format === 'reel' ? 'reel' : 'static';
  const out = await call({
    method: 'POST', url: `${ENV.RENDER_URL}/render/${endpoint}`, timeout: 180000,
    headers: { 'x-render-token': ENV.RENDER_TOKEN, 'Content-Type': 'application/json' },
    body: { ...c.payload, lang: c.lang },
  });
  if (!out || !out.url) throw new Error('render returned no url');
  await sb('PATCH', `aa_content?id=eq.${c.id}`, { media_url: out.url, status: 'rendered', error: null, updated_at: new Date().toISOString() });
  return out.url;
}
async function markRenderFailed(c, e) {
  await sb('PATCH', `aa_content?id=eq.${c.id}`, { status: 'render_failed', error: String(e.message || e).slice(0, 500), updated_at: new Date().toISOString() });
}
