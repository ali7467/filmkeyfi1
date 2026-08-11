import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { sanitizeText, validateUrl, rateLimit, safeErrorResponse } from '../../shared/security.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    let { username, phone, avatar, full_name } = body || {};

    // Rate limit: 10 güncelleme / dakika
    const rl = await rateLimit(base44, 'profile:' + user.id, user.id, 10, 60000);
    if (!rl.allowed) return Response.json({ error: 'çok hızlı güncelleme' }, { status: 429 });

    const me = await base44.asServiceRole.entities.User.get(user.id);

    const updates = {};
    if (username !== undefined) {
      const u = sanitizeText(username, 40);
      if (u) updates.username = u;
    }
    if (phone !== undefined) {
      const p = sanitizeText(phone, 20).replace(/[^\d+\-\s()]/g, '');
      if (p) updates.phone = p;
    }
    if (avatar !== undefined) {
      if (avatar === '') {
        updates.avatar = '';
      } else {
        const a = validateUrl(avatar);
        if (a) updates.avatar = a;
      }
    }
    // Moderator'ün full_name'i kilitli — backend seviyesinde değiştirilemez
    if (full_name !== undefined && me.role !== 'moderator') {
      const fn = sanitizeText(full_name, 60);
      if (fn) updates.full_name = fn;
    }

    if (Object.keys(updates).length > 0) {
      await base44.asServiceRole.entities.User.update(user.id, updates);
    }
    return Response.json({ ok: true });
  } catch (e) {
    return safeErrorResponse(e);
  }
}