import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { room_id, text } = body || {};
    if (!room_id || !text || typeof text !== 'string') {
      return Response.json({ error: 'invalid' }, { status: 400 });
    }
    if (text.length > 1000) return Response.json({ error: 'mesaj çok uzun' }, { status: 400 });

    // rate limit: 15 messages per 30s per user
    const key = 'chat:' + user.id;
    const rl = await base44.asServiceRole.entities.RateLimit.filter({ key });
    const now = Date.now();
    const rec = rl[0];
    const windowMs = 30000;
    const start = rec?.window_start ? new Date(rec.window_start).getTime() : 0;
    if (!rec || now - start > windowMs) {
      if (!rec) {
        await base44.asServiceRole.entities.RateLimit.create({
          key, user_id: user.id, count: 1, window_start: new Date().toISOString()
        });
      } else {
        await base44.asServiceRole.entities.RateLimit.update(rec.id, {
          count: 1, window_start: new Date().toISOString()
        });
      }
    } else {
      if (rec.count >= 15) {
        await base44.asServiceRole.entities.SecurityLog.create({
          action: 'chat_rate_limit', user_id: user.id, user_email: user.email,
          detail: room_id, level: 'warning'
        });
        return Response.json({ error: 'çok hızlı mesaj gönderiyorsunuz' }, { status: 429 });
      }
      await base44.asServiceRole.entities.RateLimit.update(rec.id, { count: rec.count + 1 });
    }

    // sanitize: strip html tags and javascript: schemes
    const clean = text.replace(/<[^>]*>/g, '').replace(/javascript:/gi, '').slice(0, 1000);
    const name = user.username || user.full_name || 'Kullanıcı';
    await base44.asServiceRole.entities.RoomMessage.create({
      room_id, user_id: user.id, user_name: name, user_avatar: user.avatar || '',
      text: clean, type: 'user'
    });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}