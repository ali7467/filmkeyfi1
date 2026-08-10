import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { action, room_id, password } = body || {};
    if (!room_id || !['join', 'leave'].includes(action)) {
      return Response.json({ error: 'invalid request' }, { status: 400 });
    }
    const name = user.username || user.full_name || 'Kullanıcı';
    const room = await base44.asServiceRole.entities.Room.get(room_id);
    if (!room) return Response.json({ error: 'oda bulunamadı' }, { status: 404 });
    if (room.status === 'closed') return Response.json({ error: 'closed' }, { status: 403 });

    if (action === 'join') {
      const me = await base44.asServiceRole.entities.User.get(user.id);
      if (me.membership_status !== 'active') {
        await base44.asServiceRole.entities.SecurityLog.create({
          action: 'room_join_denied', user_id: user.id, user_email: user.email,
          detail: 'membership inactive', level: 'warning'
        });
        return Response.json({ error: 'üyelik aktif değil' }, { status: 403 });
      }
      const participants = room.participants || [];
      const already = participants.some((p) => p.user_id === user.id);
      if (!already && room.password && room.owner_id !== user.id) {
        if (!password || room.password !== password) {
          await base44.asServiceRole.entities.SecurityLog.create({
            action: 'room_password_failed', user_id: user.id, user_email: user.email,
            detail: room_id, level: 'warning'
          });
          return Response.json({ error: 'hatalı şifre', needsPassword: true }, { status: 403 });
        }
      }
      if (!already) {
        if (participants.length >= (room.max_users || 10)) {
          return Response.json({ error: 'oda dolu' }, { status: 403 });
        }
        participants.push({ user_id: user.id, name, avatar: user.avatar || '', muted: false, speaking: false });
        await base44.asServiceRole.entities.Room.update(room_id, { participants });
        await base44.asServiceRole.entities.RoomMessage.create({
          room_id, user_id: user.id, user_name: name,
          text: `${name} odaya katıldı.`, type: 'system'
        });
      }
      return Response.json({ ok: true });
    } else {
      const participants = (room.participants || []).filter((p) => p.user_id !== user.id);
      let owner_id = room.owner_id;
      let owner_name = room.owner_name;
      if (room.owner_id === user.id && participants.length > 0) {
        owner_id = participants[0].user_id;
        owner_name = participants[0].name;
      }
      await base44.asServiceRole.entities.Room.update(room_id, { participants, owner_id, owner_name });
      await base44.asServiceRole.entities.RoomMessage.create({
        room_id, user_id: user.id, user_name: name,
        text: `${name} odadan ayrıldı.`, type: 'system'
      });
      return Response.json({ ok: true });
    }
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}