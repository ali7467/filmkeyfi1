import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

async function sha256Hex(salt, pw) {
  const data = new TextEncoder().encode(salt + pw);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { action, room_id, password, target_id } = body || {};
    if (!room_id || !['join', 'leave', 'kick', 'set-password', 'toggle-hidden', 'toggle-voice'].includes(action)) {
      return Response.json({ error: 'invalid request' }, { status: 400 });
    }
    const name = user.username || user.full_name || 'Kullanıcı';
    const room = await base44.asServiceRole.entities.Room.get(room_id);
    if (!room) return Response.json({ error: 'oda bulunamadı' }, { status: 404 });
    if (room.status === 'closed') return Response.json({ error: 'closed' }, { status: 403 });

    const me = await base44.asServiceRole.entities.User.get(user.id);
    const isAdmin = me.role === 'admin';
    const isMod = me.role === 'admin' || me.role === 'moderator';
    const isOwner = room.owner_id === user.id;
    const ghost = isAdmin && !isOwner;

    if (action === 'join') {
      if (me.membership_status !== 'active' && !isMod) {
        await base44.asServiceRole.entities.SecurityLog.create({
          action: 'room_join_denied', user_id: user.id, user_email: user.email,
          detail: 'membership inactive', level: 'warning'
        });
        return Response.json({ error: 'üyelik aktif değil' }, { status: 403 });
      }
      // Admin ghost mode: görünmez katılım
      if (ghost) return Response.json({ ok: true, ghost: true });
      const participants = room.participants || [];
      const already = participants.some((p) => p.user_id === user.id);
      if (!already && room.password && !isOwner && !isMod) {
        const [salt, hash] = room.password.split(':');
        if (!password || !salt || hash !== await sha256Hex(salt, password)) {
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
    }

    if (action === 'kick') {
      if (!isOwner && !isMod) return Response.json({ error: 'yetkisiz' }, { status: 403 });
      const targetUser = await base44.asServiceRole.entities.User.get(target_id).catch(() => null);
      const targetIsMod = targetUser?.role === 'admin' || targetUser?.role === 'moderator';
      if (targetIsMod && !isMod) return Response.json({ error: 'yetkili kullanıcı atılamaz' }, { status: 403 });
      const participants = (room.participants || []).filter((p) => p.user_id !== target_id);
      const targetName = (room.participants || []).find((p) => p.user_id === target_id)?.name || 'Kullanıcı';
      if (participants.length === 0) {
        await base44.asServiceRole.entities.Room.update(room_id, { participants, status: 'closed' });
        await base44.asServiceRole.entities.RoomMessage.create({
          room_id, user_id: target_id, user_name: targetName,
          text: `${targetName} odadan atıldı. Oda kapandı.`, type: 'system'
        });
        return Response.json({ ok: true, closed: true });
      }
      await base44.asServiceRole.entities.Room.update(room_id, { participants });
      await base44.asServiceRole.entities.RoomMessage.create({
        room_id, user_id: target_id, user_name: targetName,
        text: `${targetName} odadan atıldı.`, type: 'system'
      });
      return Response.json({ ok: true });
    }

    if (action === 'set-password') {
      if (!isOwner && !isMod) return Response.json({ error: 'yetkisiz' }, { status: 403 });
      if (!password) {
        await base44.asServiceRole.entities.Room.update(room_id, { password: '' });
        return Response.json({ ok: true });
      }
      const salt = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
      const hash = await sha256Hex(salt, password);
      await base44.asServiceRole.entities.Room.update(room_id, { password: `${salt}:${hash}` });
      return Response.json({ ok: true });
    }

    if (action === 'toggle-hidden') {
      if (!isOwner && !isMod) return Response.json({ error: 'yetkisiz' }, { status: 403 });
      await base44.asServiceRole.entities.Room.update(room_id, { hidden: !room.hidden });
      return Response.json({ ok: true, hidden: !room.hidden });
    }

    if (action === 'toggle-voice') {
      if (!isOwner && !isMod) return Response.json({ error: 'yetkisiz' }, { status: 403 });
      await base44.asServiceRole.entities.Room.update(room_id, { voice_enabled: !room.voice_enabled });
      return Response.json({ ok: true, voice_enabled: !room.voice_enabled });
    }

    // leave
    if (ghost) return Response.json({ ok: true });
    const participants = (room.participants || []).filter((p) => p.user_id !== user.id);
    if (participants.length === 0) {
      await base44.asServiceRole.entities.Room.update(room_id, { participants, status: 'closed' });
      await base44.asServiceRole.entities.RoomMessage.create({
        room_id, user_id: user.id, user_name: name,
        text: `${name} odadan ayrıldı. Oda kapandı.`, type: 'system'
      });
      return Response.json({ ok: true, closed: true });
    }
    let owner_id = room.owner_id;
    let owner_name = room.owner_name;
    if (isOwner && participants.length > 0) {
      owner_id = participants[0].user_id;
      owner_name = participants[0].name;
    }
    await base44.asServiceRole.entities.Room.update(room_id, { participants, owner_id, owner_name });
    await base44.asServiceRole.entities.RoomMessage.create({
      room_id, user_id: user.id, user_name: name,
      text: `${name} odadan ayrıldı.`, type: 'system'
    });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}