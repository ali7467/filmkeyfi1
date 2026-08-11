import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, ticket_id, name, email, subject, text } = body || {};

    if (action === 'create') {
      if (!name || !email || !text) return Response.json({ error: 'eksik bilgi' }, { status: 400 });
      const guestId = 'guest:' + email.toLowerCase().trim();
      const ticket = await base44.asServiceRole.entities.SupportTicket.create({
        user_id: guestId,
        user_name: name + ' (Misafir)',
        subject: subject || 'Giriş Sayfası - Canlı Destek',
        category: 'Genel',
        status: 'new'
      });
      await base44.asServiceRole.entities.SupportMessage.create({
        ticket_id: ticket.id,
        owner_id: guestId,
        user_id: guestId,
        sender: 'user',
        text
      });
      return Response.json({ ticket_id: ticket.id });
    }

    if (action === 'send') {
      if (!ticket_id || !text) return Response.json({ error: 'eksik bilgi' }, { status: 400 });
      await base44.asServiceRole.entities.SupportMessage.create({
        ticket_id,
        owner_id: 'guest',
        user_id: 'guest',
        sender: 'user',
        text
      });
      return Response.json({ ok: true });
    }

    if (action === 'poll') {
      if (!ticket_id) return Response.json({ error: 'eksik bilgi' }, { status: 400 });
      const messages = await base44.asServiceRole.entities.SupportMessage.filter({ ticket_id }, 'created_date', 200);
      return Response.json({ messages });
    }

    return Response.json({ error: 'geçersiz işlem' }, { status: 400 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}