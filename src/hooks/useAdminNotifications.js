import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

export function useAdminNotifications() {
  const notifiedRef = useRef(new Set());

  useEffect(() => {
    if (!('Notification' in window)) return;

    // Auto-request permission on mount (desktop browsers)
    if (Notification.permission === 'default') {
      try { Notification.requestPermission(); } catch {}
    }

    const notify = (title, body) => {
      if (Notification.permission === 'granted') {
        try {
          const n = new Notification(title, { body, icon: '/favicon.ico', tag: title + Date.now() });
          setTimeout(() => n.close(), 8000);
        } catch {}
      }
    };

    // Yeni destek talebi
    const unsubTickets = base44.entities.SupportTicket.subscribe((ev) => {
      if (ev.type === 'create' && !notifiedRef.current.has(ev.data.id)) {
        notifiedRef.current.add(ev.data.id);
        notify('🎫 Yeni Destek Talebi', ev.data.subject || 'Yeni bir destek talebi açıldı');
      }
    });

    // Kullanıcıdan yeni destek mesajı
    const unsubMessages = base44.entities.SupportMessage.subscribe((ev) => {
      if (ev.type === 'create' && ev.data?.sender === 'user' && !notifiedRef.current.has(ev.data.id)) {
        notifiedRef.current.add(ev.data.id);
        notify('💬 Yeni Destek Mesajı', (ev.data.text || 'Yeni mesaj').slice(0, 100));
      }
    });

    // Yeni üye kaydı
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