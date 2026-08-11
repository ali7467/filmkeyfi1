import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr;
}

export function useAdminNotifications() {
  const notifiedRef = useRef(new Set());

  useEffect(() => {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'default') {
      try { Notification.requestPermission(); } catch {}
    }

    const notify = (title, body) => {
      if (Notification.permission === 'granted') {
        try {
          const n = new Notification(title, { body, icon: '/favicon.ico' });
          setTimeout(() => n.close(), 8000);
        } catch {}
      }
    };

    // Service Worker kaydet + push subscribe (uygulama kapalıyken bildirim)
    const setupPush = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (existing) return;
        const keyRes = await base44.functions.invoke('web-push', { action: 'get-key' });
        if (!keyRes?.publicKey) return;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyRes.publicKey)
        });
        await base44.functions.invoke('web-push', { action: 'subscribe', subscription: sub });
      } catch {}
    };
    setupPush();

    // Tab açıkken de anlık bildirim (fallback)
    const unsubTickets = base44.entities.SupportTicket.subscribe((ev) => {
      if (ev.type === 'create' && !notifiedRef.current.has(ev.data.id)) {
        notifiedRef.current.add(ev.data.id);
        notify('🎫 Yeni Destek Talebi', ev.data.subject || 'Yeni bir destek talebi açıldı');
      }
    });

    const unsubMessages = base44.entities.SupportMessage.subscribe((ev) => {
      if (ev.type === 'create' && ev.data?.sender === 'user' && !notifiedRef.current.has(ev.data.id)) {
        notifiedRef.current.add(ev.data.id);
        notify('💬 Yeni Destek Mesajı', (ev.data.text || 'Yeni mesaj').slice(0, 100));
      }
    });

    const unsubUsers = base44.entities.User.subscribe((ev) => {
      if (ev.type === 'create' && !notifiedRef.current.has(ev.data.id)) {
        notifiedRef.current.add(ev.data.id);
        notify('👤 Yeni Üye Kaydı', ev.data.email || ev.data.full_name || 'Yeni bir üye kayıt oldu');
      }
    });

    return () => {
      unsubTickets?.();
      unsubMessages?.();
      unsubUsers?.();
    };
  }, []);
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}