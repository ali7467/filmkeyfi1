import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { rateLimit, safeErrorResponse, logSecurity } from '../../shared/security.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { room_id } = body || {};
    if (!room_id) return Response.json({ error: 'room_id gerekli' }, { status: 400 });

    // Rate limit
    const rl = await rateLimit(base44, 'clear-msg:' + user.id, user.id, 10, 60000);
    if (!rl.allowed) return Response.json({ error: 'çok hızlı işlem' }, { status: 429 });

    const room = await base44.asServiceRole.entities.Room.get(room_id);
    if (!room) return Response.json({ error: 'oda bulunamadı' }, { status: 404 });

    // Yetki kontrolü — DB'den rol doğrula (frontend'ten gelen role güvenme)
    const me = await base44.asServiceRole.entities.User.get(user.id);
    const isMod = me.role === 'admin' || me.role === 'moderator';
    if (room.owner_id !== user.id && !isMod) {
      await logSecurity(base44, 'clear_msg_denied', user, room_id, 'warning');
      return Response.json({ error: 'yetkisiz' }, { status: 403 });
    }

    const res = await base44.asServiceRole.entities.RoomMessage.deleteMany({ room_id });
    await logSecurity(base44, 'room_messages_cleared', user, room_id, 'info');
    return Response.json({ deleted: res?.deleted_count ?? 0 });
  } catch (e) {
    return safeErrorResponse(e);
  }
}