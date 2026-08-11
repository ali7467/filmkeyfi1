import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { user_id } = body || {};
    if (!user_id) return Response.json({ error: 'user_id gerekli' }, { status: 400 });
    const u = await base44.asServiceRole.entities.User.get(user_id);
    if (!u) return Response.json({ error: 'kullanıcı bulunamadı' }, { status: 404 });
    return Response.json({
      username: u.username || '',
      full_name: u.full_name || '',
      avatar: u.avatar || '',
      member_id: u.member_id || '-',
      role: u.role || '',
      created_date: u.created_date || null
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}