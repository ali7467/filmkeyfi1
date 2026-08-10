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
    const { name, movie_id, movie_title, password, max_users, chat_enabled, voice_enabled } = body || {};
    if (!name || !movie_id) return Response.json({ error: 'isim ve film gerekli' }, { status: 400 });

    const owner_name = user.username || user.full_name || 'Kullanıcı';
    const salt = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
    const hashed = password ? (salt + ':' + await sha256Hex(salt, password)) : '';

    const room = await base44.asServiceRole.entities.Room.create({
      name, movie_id, movie_title: movie_title || '',
      owner_id: user.id, owner_name,
      password: hashed,
      max_users: Number(max_users) || 10,
      chat_enabled: chat_enabled !== false,
      voice_enabled: !!voice_enabled,
      is_playing: false, current_time: 0, status: 'active',
      participants: [{ user_id: user.id, name: owner_name, avatar: user.avatar || '', muted: false, speaking: false }]
    });
    await base44.asServiceRole.entities.RoomMessage.create({
      room_id: room.id, user_id: user.id, user_name: owner_name,
      text: `${owner_name} odaya katıldı.`, type: 'system'
    });
    return Response.json({ id: room.id });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}