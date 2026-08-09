import { Outlet } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import BottomNav from '@/components/layout/BottomNav';

export default function AppLayout() {
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