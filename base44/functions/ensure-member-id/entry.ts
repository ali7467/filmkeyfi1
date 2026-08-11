import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const me = await base44.asServiceRole.entities.User.get(user.id);
    if (me.member_id) return Response.json({ member_id: me.member_id });
    let id = null;
    for (let i = 0; i < 12; i++) {
      const candidate = String(Math.floor(10000000 + Math.random() * 90000000));
      const existing = await base44.asServiceRole.entities.User.filter({ member_id: candidate }, null, 1);
      if (!existing || existing.length === 0) { id = candidate; break; }
    }
    if (!id) return Response.json({ error: 'üye no oluşturulamadı' }, { status: 500 });
    await base44.asServiceRole.entities.User.update(user.id, { member_id: id });
    return Response.json({ member_id: id });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}