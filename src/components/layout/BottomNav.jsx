import { Link, useLocation } from 'react-router-dom';
import { Home, Film, Plus, MessageCircle, User, DoorOpen } from 'lucide-react';

const items = [
  { label: 'Ana Sayfa', path: '/', icon: Home },
  { label: 'Filmler', path: '/filmler', icon: Film },
  { label: 'Oda Kur', path: '/oda-kur', icon: Plus },
  { label: 'Odalar', path: '/acik-odalar', icon: DoorOpen },
  { label: 'Sohbet', path: '/destek', icon: MessageCircle },
  { label: 'Profil', path: '/profil', icon: User },
];

export default function BottomNav() {
  const location = useLocation();
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 glass border-t border-border">
      <div className="grid grid-cols-6 h-16">
        {items.map(({ label, path, icon: Icon }) => {
          const active = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
          return (
            <Link key={path} to={path} className="flex flex-col items-center justify-center gap-0.5 relative">
              {active && <span className="absolute top-0 h-1 w-8 rounded-full bg-primary" />}
              <Icon className={`w-5 h-5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-[10px] ${active ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}