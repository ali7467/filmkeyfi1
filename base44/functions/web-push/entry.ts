import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getVapidPublicKey, sendPushToAll } from '../../shared/webPush.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, subscription, title, body: msgBody, url } = body || {};

    if (action === 'get-key') {
      const publicKey = await getVapidPublicKey(base44);
      return Response.json({ publicKey });
    }

    if (action === 'subscribe') {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      if (!subscription || !subscription.endpoint) return Response.json({ error: 'eksik bilgi' }, { status: 400 });
      const existing = await base44.asServiceRole.entities.PushSubscription.filter({ endpoint: subscription.endpoint });
      if (!existing || existing.length === 0) {
        await base44.asServiceRole.entities.PushSubscription.create({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys?.p256dh || '',
          auth: subscription.keys?.auth || ''
        });
      }
      return Response.json({ ok: true });
    }

    if (action === 'send') {
      const sent = await sendPushToAll(base44, title || 'FILMKEYFİ', msgBody || '', url || '/');
      return Response.json({ ok: true, sent });
    }

    return Response.json({ error: 'geçersiz işlem' }, { status: 400 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}