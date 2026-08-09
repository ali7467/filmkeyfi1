import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { DoorOpen, Users, Lock, Crown, Loader2 } from 'lucide-react';

export default function OpenRooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Room.filter({ status: 'active' }, '-created_date', 200).then((r) => { setRooms(r); setLoading(false); }).catch(() => setLoading(false));
    const unsub = base44.entities.Room.subscribe((ev) => {
      if (ev.type === 'create' && ev.data?.status === 'active') setRooms((p) => [ev.data, ...p.filter((x) => x.id !== ev.data.id)]);
      if (ev.type === 'update') setRooms((p) => p.map((x) => (x.id === ev.data.id ? ev.data : x)).filter((x) => x.status === 'active'));
      if (ev.type === 'delete') setRooms((p) => p.filter((x) => x.id !== ev.id));
    });
    return unsub;
  }, []);

  return (
    <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-extrabold mb-1 flex items-center gap-2"><DoorOpen className="w-6 h-6 text-primary" /> Açık Odalar</h1>
      <p className="text-sm text-muted-foreground mb-6">Aktif Watch Party odalarına katıl.</p>
      {loading ? <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div> :
       rooms.length === 0 ? (
         <div className="text-center py-20 text-muted-foreground">
           <DoorOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
           <p className="mb-2">Açık oda yok.</p>
           <Link to="/oda-kur" className="text-primary text-sm hover:underline">İlk odayı sen kur</Link>
         </div>
       ) : (
         <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
           {rooms.map((r) => (
             <Link key={r.id} to={`/oda/${r.id}`} className="bg-card border border-border rounded-xl p-4 hover:border-primary transition-colors">
               <div className="flex items-center justify-between mb-2">
                 <h3 className="font-bold truncate">{r.name}</h3>
                 {r.password && <Lock className="w-4 h-4 text-amber-400 shrink-0" />}
               </div>
               <p className="text-sm text-muted-foreground truncate mb-3">{r.movie_title || 'İçerik seçilmedi'}</p>
               <div className="flex items-center justify-between text-xs text-muted-foreground">
                 <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {r.participants?.length || 0}/{r.max_users}</span>
                 <span className="inline-flex items-center gap-1"><Crown className="w-3.5 h-3.5 text-amber-400" /> {r.owner_name || 'Anonim'}</span>
               </div>
             </Link>
           ))}
         </div>
       )}
    </div>
  );
}