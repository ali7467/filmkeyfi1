import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Users, Lock, MessageSquare, Mic } from 'lucide-react';

export default function CreateRoom() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [movies, setMovies] = useState([]);
  const [form, setForm] = useState({ name: '', movie_id: '', password: '', max_users: 10, chat_enabled: true, voice_enabled: false });

  useEffect(() => {
    base44.entities.Movie.filter({ published: true }, '-views', 100).then(setMovies).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.movie_id) { toast({ title: 'Oda adı ve içerik seçin', variant: 'destructive' }); return; }
    const movie = movies.find((m) => m.id === form.movie_id);
    try {
      const room = await base44.entities.Room.create({
        ...form, max_users: Number(form.max_users),
        movie_title: movie?.title || '', owner_id: user.id, owner_name: user.username || user.full_name,
        is_playing: false, current_time: 0, status: 'active',
        participants: [{ user_id: user.id, name: user.username || user.full_name, avatar: user.avatar || '', muted: false, speaking: false }]
      });
      await base44.entities.RoomMessage.create({ room_id: room.id, user_id: user.id, user_name: user.username || user.full_name, text: `${user.username || user.full_name} odaya katıldı.`, type: 'system' });
      toast({ title: 'Oda oluşturuldu' });
      navigate(`/oda/${room.id}`);
    } catch (err) { toast({ title: 'Hata', description: err.message, variant: 'destructive' }); }
  };

  const field = "w-full bg-secondary/60 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring border border-border";

  return (
    <div className="px-4 sm:px-6 py-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-extrabold mb-1 flex items-center gap-2"><Users className="w-6 h-6 text-primary" /> Oda Kur</h1>
      <p className="text-sm text-muted-foreground mb-6">Arkadaşlarınla birlikte izlemek için bir Watch Party odası oluştur.</p>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-sm font-medium block mb-1.5">Oda Adı</label>
          <input className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Örn: Cuma Gecesi Sineması" required />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1.5">Film / Dizi Seç</label>
          <select className={field} value={form.movie_id} onChange={(e) => setForm({ ...form, movie_id: e.target.value })} required>
            <option value="">İçerik seçin...</option>
            {movies.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1.5 flex items-center gap-1"><Lock className="w-4 h-4" /> Şifre (opsiyonel)</label>
            <input className={field} type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Boş = şifresiz" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Maks. Kullanıcı</label>
            <input className={field} type="number" min={2} max={50} value={form.max_users} onChange={(e) => setForm({ ...form, max_users: e.target.value })} />
          </div>
        </div>
        <div className="flex gap-3">
          <label className={`flex-1 flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${form.chat_enabled ? 'border-primary bg-primary/10' : 'border-border bg-secondary/40'}`}>
            <input type="checkbox" checked={form.chat_enabled} onChange={(e) => setForm({ ...form, chat_enabled: e.target.checked })} className="accent-primary" />
            <MessageSquare className="w-4 h-4" /> <span className="text-sm">Sohbet açık</span>
          </label>
          <label className={`flex-1 flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${form.voice_enabled ? 'border-accent bg-accent/10' : 'border-border bg-secondary/40'}`}>
            <input type="checkbox" checked={form.voice_enabled} onChange={(e) => setForm({ ...form, voice_enabled: e.target.checked })} className="accent-accent" />
            <Mic className="w-4 h-4" /> <span className="text-sm">Sesli sohbet</span>
          </label>
        </div>
        <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-lg">Odayı Oluştur</button>
      </form>
    </div>
  );
}