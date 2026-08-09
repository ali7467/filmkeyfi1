import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Trash2, DoorClosed, MessageSquareOff, MicOff, UserMinus, Users, Crown } from 'lucide-react';

export default function AdminRooms() {
  const { user: admin } = useCurrentUser();
  const { toast } = useToast();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);

  const load = () => { base44.entities.Room.list(500).then((r) => { setRooms(r); setLoading(false); }).catch(() => setLoading(false)); };
  useEffect(load, []);
  const log = async (action, target) => { await base44.entities.AdminLog.create({ admin_id: admin?.id, admin_name: admin?.username, action, target }).catch(() => {}); };

  const close = async (r) => { await base44.entities.Room.update(r.id, { status: 'closed' }); await log('Oda kapatıldı', r.name); toast({ title: 'Kapatıldı' }); load(); };
  const toggleChat = async (r) => { await base44.entities.Room.update(r.id, { chat_enabled: !r.chat_enabled }); await log('Sohbet durumu değişti', r.name); load(); };
  const toggleVoice = async (r) => { await base44.entities.Room.update(r.id, { voice_enabled: !r.voice_enabled }); await log('Sesli sohbet durumu değişti', r.name); load(); };
  const del = async () => { await base44.entities.Room.delete(confirm.id); await log('Oda silindi', confirm.name); toast({ title: 'Silindi' }); setConfirm(null); load(); };
  const kick = async (r, uid) => { const p = (r.participants || []).filter((x) => x.user_id !== uid); await base44.entities.Room.update(r.id, { participants: p }); toast({ title: 'Kullanıcı çıkarıldı' }); load(); };

  if (loading) return <p className="text-muted-foreground">Yükleniyor...</p>;
  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-4">Odalar</h1>
      {rooms.length === 0 ? <p className="text-muted-foreground text-sm">Oda yok.</p> :
        <div className="space-y-2">
          {rooms.map((r) => (
            <div key={r.id} className="bg-card border border-border rounded-xl p-3">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{r.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.movie_title || 'İçerik yok'}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${r.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{r.status === 'active' ? 'Aktif' : 'Kapalı'}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mb-2">
                <span className="inline-flex items-center gap-1"><Crown className="w-3.5 h-3.5 text-amber-400" /> {r.owner_name || '-'}</span>
                <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {r.participants?.length || 0}/{r.max_users}</span>
                <span>{r.chat_enabled ? '💬 Sohbet açık' : '🚫 Sohbet kapalı'}</span>
                <span>{r.voice_enabled ? '🎙️ Sesli açık' : '🔇 Sesli kapalı'}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                <button onClick={() => toggleChat(r)} className="px-2.5 py-1.5 rounded bg-secondary text-xs inline-flex items-center gap-1" title="Sohbet"><MessageSquareOff className="w-3.5 h-3.5" /> Sohbet</button>
                <button onClick={() => toggleVoice(r)} className="px-2.5 py-1.5 rounded bg-secondary text-xs inline-flex items-center gap-1" title="Ses"><MicOff className="w-3.5 h-3.5" /> Ses</button>
                {r.status === 'active' && <button onClick={() => close(r)} className="px-2.5 py-1.5 rounded bg-amber-500/20 text-amber-400 text-xs inline-flex items-center gap-1" title="Kapat"><DoorClosed className="w-3.5 h-3.5" /> Kapat</button>}
                <button onClick={() => setConfirm(r)} className="px-2.5 py-1.5 rounded bg-red-500/20 text-red-400 text-xs inline-flex items-center gap-1" title="Sil"><Trash2 className="w-3.5 h-3.5" /> Sil</button>
              </div>
            </div>
          ))}
        </div>}
      <ConfirmDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)} title="Odayı sil?" description={`${confirm?.name} silinecek.`} onConfirm={del} />
    </div>
  );
}