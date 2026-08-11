import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { waitUntil } from 'base44:runtime';
import { sendPushToAll } from '../../shared/webPush.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, ticket_id, name, email, subject, text, file_url } = body || {};

    if (action === 'create') {
      if (!text && !file_url) return Response.json({ error: 'eksik bilgi' }, { status: 400 });
      const guestId = 'guest:' + (email ? email.toLowerCase().trim() : Math.random().toString(36).slice(2, 10));
      const displayName = name || 'Misafir';
      const ticket = await base44.asServiceRole.entities.SupportTicket.create({
        user_id: guestId,
        user_name: displayName,
        subject: subject || 'Canlı Destek',
        category: 'Genel',
        status: 'new'
      });
      await base44.asServiceRole.entities.SupportMessage.create({
        ticket_id: ticket.id,
        owner_id: guestId,
        user_id: guestId,
        sender: 'user',
        text: text || '📷 Fotoğraf',
        file_url: file_url || ''
      });
      // Admin'e push bildirimi gönder (arka planda, yanıtı geciktirme)
      waitUntil(sendPushToAll(base44, '🎫 Yeni Destek Talebi', (text || 'Yeni destek talebi').slice(0, 100), '/admin/destek'));
      return Response.json({ ticket_id: ticket.id });
    }

    if (action === 'send') {
      if (!ticket_id || (!text && !file_url)) return Response.json({ error: 'eksik bilgi' }, { status: 400 });
      const ticket = await base44.asServiceRole.entities.SupportTicket.get(ticket_id).catch(() => null);
      const ownerId = ticket?.user_id || 'guest';
      await base44.asServiceRole.entities.SupportMessage.create({
        ticket_id,
        owner_id: ownerId,
        user_id: ownerId,
        sender: 'user',
        text: text || '📷 Fotoğraf',
        file_url: file_url || ''
      });
      // Admin'e push bildirimi gönder (arka planda)
      waitUntil(sendPushToAll(base44, '💬 Yeni Destek Mesajı', (text || 'Yeni mesaj').slice(0, 100), '/admin/destek'));
      return Response.json({ ok: true });
    }

    if (action === 'poll') {
      if (!ticket_id) return Response.json({ error: 'eksik bilgi' }, { status: 400 });
      const messages = await base44.asServiceRole.entities.SupportMessage.filter({ ticket_id }, 'created_date', 200);
      let ticket_status = 'active';
      try {
        const ticket = await base44.asServiceRole.entities.SupportTicket.get(ticket_id);
        ticket_status = ticket?.status || 'active';
      } catch {}
      return Response.json({ messages, ticket_status });
    }

    return Response.json({ error: 'geçersiz işlem' }, { status: 400 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}