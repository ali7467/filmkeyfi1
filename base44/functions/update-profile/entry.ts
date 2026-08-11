import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { username, phone, avatar, full_name } = body || {};

    const me = await base44.asServiceRole.entities.User.get(user.id);

    const updates = {};
    if (username !== undefined) updates.username = username;
    if (phone !== undefined) updates.phone = phone;
    if (avatar !== undefined) updates.avatar = avatar;
    // Moderator'ün full_name'i kilitli — backend seviyesinde değiştirilemez
    if (full_name !== undefined && me.role !== 'moderator') updates.full_name = full_name;

    if (Object.keys(updates).length > 0) {
      await base44.asServiceRole.entities.User.update(user.id, updates);
    }
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}