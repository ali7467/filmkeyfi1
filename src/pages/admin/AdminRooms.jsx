import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Trash2, DoorClosed, MessageSquareOff, MicOff, UserMinus } from 'lucide-react';

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
  const toggleChat = async (r) => { await base44.entities.Room.update(r.id, { chat_enabled: !r.chat_enabled }); await log('Chat durumu değişti', r.name); load(); };
  const toggleVoice = async (r) => { await base44.entities.Room.update(r.id, { voice_enabled: !r.voice_enabled }); await log('Sesli sohbet durumu değişti', r.name); load(); };
  const del = async () => { await base44.entities.Room.delete(confirm.id); await log('Oda silindi', confirm.name); toast({ title: 'Silindi' }); setConfirm(null); load(); };
  const kick = async (r, uid) => { const p = (r.participants || []).filter((x) => x.user_id !== uid); await base44.entities.Room.update(r.id, { participants: p }); toast({ title: 'Kullanıcı çıkarıldı' }); load(); };

  if (loading) return <p className="text-muted-foreground">Yükleniyor...</p>;
  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-4">Odalar</h1>
      {rooms.length === 0 ? <p className="text-muted-foreground text-sm">Oda yok.</p> :
        <div className="overflow-x-auto bg-card border border-border rounded-xl">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase"><tr><th className="text-left p-3">Oda</th><th className="text-left p-3">İçerik</th><th className="text-left p-3">Sahip</th><th className="text-left p-3">Kullanıcı</th><th className="text-left p-3">Durum</th><th className="text-left p-3">Chat/Ses</th><th className="text-right p-3">İşlem</th></tr></thead>
            <tbody>
              {rooms.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3 text-muted-foreground">{r.movie_title}</td>
                  <td className="p-3">{r.owner_name}</td>
                  <td className="p-3">{r.participants?.length || 0}/{r.max_users}</td>
                  <td className="p-3"><span className={`text-xs px-2 py-1 rounded ${r.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{r.status}</span></td>
                  <td className="p-3 text-xs">{r.chat_enabled ? '💬' : '🚫'} / {r.voice_enabled ? '🎙️' : '🔇'}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => toggleChat(r)} className="p-1.5 rounded bg-secondary" title="Chat"><MessageSquareOff className="w-4 h-4" /></button>
                      <button onClick={() => toggleVoice(r)} className="p-1.5 rounded bg-secondary" title="Ses"><MicOff className="w-4 h-4" /></button>
                      {r.status === 'active' && <button onClick={() => close(r)} className="p-1.5 rounded bg-amber-500/20 text-amber-400" title="Kapat"><DoorClosed className="w-4 h-4" /></button>}
                      <button onClick={() => setConfirm(r)} className="p-1.5 rounded bg-red-500/20 text-red-400" title="Sil"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
      <ConfirmDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)} title="Odayı sil?" description={`${confirm?.name} silinecek.`} onConfirm={del} />
    </div>
  );
}