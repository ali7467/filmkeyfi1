import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { DoorOpen, Users, Lock, Loader2 } from 'lucide-react';
import { Image } from '@/components/ui/image';

export default function OpenRooms() {
  const [rooms, setRooms] = useState([]);
  const [movies, setMovies] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [r, m] = await Promise.all([
          base44.entities.Room.filter({ status: 'active' }, '-created_date', 200).catch(() => []),
          base44.entities.Movie.list(500).catch(() => []),
        ]);
        setRooms(r.filter((x) => !x.hidden && (x.participants?.length || 0) > 0));
        const map = {}; m.forEach((mv) => { map[mv.id] = mv; });
        setMovies(map);
      } finally { setLoading(false); }
    };
    load();
    const unsub = base44.entities.Room.subscribe((ev) => {
      if (ev.type === 'create' && ev.data?.status === 'active' && !ev.data.hidden && (ev.data.participants?.length || 0) > 0) setRooms((p) => [ev.data, ...p.filter((x) => x.id !== ev.data.id)]);
      if (ev.type === 'update') setRooms((p) => p.map((x) => (x.id === ev.data.id ? ev.data : x)).filter((x) => x.status === 'active' && !x.hidden && (x.participants?.length || 0) > 0));
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
         <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
           {rooms.map((r, i) => {
             const mv = movies[r.movie_id];
             return (
               <div key={r.id} className="flex flex-col items-center">
                 <div className="relative w-36 h-36 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-primary/40 shadow-lg group">
                   {mv?.poster ? <Image src={mv.poster} className="w-full h-full" fittingType="fill" /> :
                     <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-3xl">🎬</div>}
                   <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />
                   {r.password && <span className="absolute top-1 right-1 bg-black/70 rounded-full p-1.5"><Lock className="w-3.5 h-3.5 text-amber-400" /></span>}
                   <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">Oda {i + 1}</span>
                   <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1"><Users className="w-3 h-3" /> {r.participants?.length || 0}/{r.max_users}</div>
                 </div>
                 <p className="mt-2 text-sm font-semibold text-center truncate max-w-full">{r.name}</p>
                 <p className="text-xs text-muted-foreground truncate max-w-full mb-2">{r.movie_title || mv?.title || 'İçerik'}</p>
                 <Link to={`/oda/${r.id}`} className="bg-primary text-primary-foreground text-sm font-semibold px-5 py-1.5 rounded-full hover:bg-primary/90">Katıl</Link>
               </div>
             );
           })}
         </div>
       )}
    </div>
  );
}