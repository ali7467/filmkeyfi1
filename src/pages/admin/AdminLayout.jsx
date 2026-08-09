import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { LayoutDashboard, UserCheck, Users, Film, FolderTree, DoorOpen, MessageSquare, LifeBuoy, Package, CreditCard, RefreshCw, Bell, BarChart3, Settings, LogOut, Menu, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const nav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/kayit', label: 'Kayıt Kontrol', icon: UserCheck },
  { to: '/admin/kullanicilar', label: 'Kullanıcılar', icon: Users },
  { to: '/admin/filmler', label: 'Filmler', icon: Film },
  { to: '/admin/film-ekle', label: 'Film Yükle', icon: Film },
  { to: '/admin/kategoriler', label: 'Kategoriler', icon: FolderTree },
  { to: '/admin/odalar', label: 'Odalar', icon: DoorOpen },
  { to: '/admin/oda-mesajlari', label: 'Oda Mesajları', icon: MessageSquare },
  { to: '/admin/destek', label: 'Destek Mesajları', icon: LifeBuoy },
  { to: '/admin/paketler', label: 'Paketler', icon: Package },
  { to: '/admin/odemeler', label: 'Ödemeler', icon: CreditCard },
  { to: '/admin/yenilemeler', label: 'Yenileme Talepleri', icon: RefreshCw },
  { to: '/admin/bildirimler', label: 'Bildirimler', icon: Bell },
  { to: '/admin/raporlar', label: 'Raporlar', icon: BarChart3 },
  { to: '/admin/ayalar', label: 'Ayarlar', icon: Settings },
];

export default function AdminLayout() {
  const { user, loading } = useCurrentUser();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) navigate('/');
  }, [user, loading]);

  if (loading) return <div className="h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user || user.role !== 'admin') return null;

  const logout = () => base44.auth.logout('/login');

  return (
    <div className="min-h-screen bg-background flex">
      <aside className={`fixed lg:sticky top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-4 flex items-center justify-between">
          <Link to="/admin" className="text-lg font-extrabold"><span className="text-gradient">FILM</span>KEYFİ <span className="text-xs text-muted-foreground font-normal">Admin</span></Link>
          <button onClick={() => setOpen(false)} className="lg:hidden p-1"><X className="w-5 h-5" /></button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent'}`}>
              <n.icon className="w-4 h-4" /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <Link to="/" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent">Siteye Dön</Link>
          <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-sidebar-accent"><LogOut className="w-4 h-4" /> Çıkış</button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="flex-1 min-w-0">
        <header className="lg:hidden sticky top-0 z-20 glass border-b border-border h-14 flex items-center px-4">
          <button onClick={() => setOpen(true)}><Menu className="w-6 h-6" /></button>
          <span className="ml-3 font-bold">Admin Panel</span>
        </header>
        <div className="p-4 sm:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}