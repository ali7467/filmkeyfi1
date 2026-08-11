import webPush from 'npm:web-push@3.6.1';

export async function getVapidKeys(base44) {
  let existing = await base44.asServiceRole.entities.AppConfig.filter({ key: 'vapid_keys' });
  if (!existing || existing.length === 0) {
    const keys = webPush.generateVAPIDKeys();
    await base44.asServiceRole.entities.AppConfig.create({
      key: 'vapid_keys',
      value: JSON.stringify(keys)
    });
    return keys;
  }
  return JSON.parse(existing[0].value);
}

export async function getVapidPublicKey(base44) {
  const keys = await getVapidKeys(base44);
  return keys.publicKey;
}

export async function sendPushToAll(base44, title, body, url) {
  try {
    const keys = await getVapidKeys(base44);
    webPush.setVapidDetails('mailto:admin@filmkeyfi.com', keys.publicKey, keys.privateKey);
    const subs = await base44.asServiceRole.entities.PushSubscription.list(500);
    if (!subs || subs.length === 0) return 0;
    const payload = JSON.stringify({ title, body, url });
    await Promise.all(subs.map((s) =>
      webPush.sendNotification({
        endpoint: s.endpoint,
        keys: { p256dh: s.p256dh, auth: s.auth }
      }, payload).catch(() => null)
    ));
    return subs.length;
  } catch (e) {
    return 0;
  }
}