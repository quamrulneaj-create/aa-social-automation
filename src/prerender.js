// ===== AA prerender: render the next few items before they are due =====
const claimed = await rpc('aa_claim_render', { p_limit: 3, p_horizon_minutes: 180 });
const out = [];
for (const c of claimed || []) {
  try {
    const url = await renderContent(c);
    out.push({ json: { id: c.id, slot_at: c.slot_at, format: c.format, ok: true, url } });
  } catch (e) {
    await markRenderFailed(c, e);
    out.push({ json: { id: c.id, ok: false, error: String(e.message || e) } });
  }
}
return out.length ? out : [{ json: { rendered: 0 } }];
