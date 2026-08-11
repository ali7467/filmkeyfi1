import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import Navbar from '@/components/layout/Navbar';
import BottomNav from '@/components/layout/BottomNav';

export default function AppLayout() {
  const { pathname } = useLocation();
  const { user } = useCurrentUser();
  const isRoom = pathname.startsWith('/oda/');

  // Gerçek zamanlı askıya alma tespiti
  useEffect(() => {
    if (!user) return;
    const unsub = base44.entities.Notification.subscribe((ev) => {
      if (ev.type === 'create' && ev.data?.user_id === user.id && ev.data?.type === 'suspended') {
        base44.auth.logout();
        window.location.href = '/login?banned=1';
      }
    });
    return unsub;
  }, [user?.id]);

  if (isRoom) {
    return <div className="min-h-screen bg-background"><Outlet /></div>;
  }
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16 pb-20 lg:pb-8 max-w-[1600px] mx-auto">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}