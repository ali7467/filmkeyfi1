import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Trash2, Trash } from 'lucide-react';

export default function AdminRoomMessages() {
  const { user: admin } = useCurrentUser();
  const { toast } = useToast();
  const [rooms, setRooms] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [owner, setOwner] = useState(null);

  useEffect(() => { base44.entities.Room.list(200).then(setRooms).catch(() => {}); }, []);
  useEffect(() => {
    if (!active) return;
    setOwner(null);
    base44.functions.invoke('user-profile', { user_id: active.owner_id }).then(setOwner).catch(() => {});
    base44.entities.RoomMessage.filter({ room_id: active.id }, 'created_date', 500).then(setMessages).catch(() => {});
  }, [active?.id]);
  const log = async (action, target) => { await base44.entities.AdminLog.create({ admin_id: admin?.id, admin_name: admin?.username, action, target }).catch(() => {}); };
  const del = async () => { await base44.entities.RoomMessage.delete(confirm.id); await log('Mesaj silindi', active?.name); toast({ title: 'Silindi' }); setConfirm(null); setMessages((p) => p.filter((m) => m.id !== confirm.id)); };
  const delAll = async () => {
    await base44.entities.RoomMessage.deleteMany({ room_id: active.id });
    await log('Tüm oda mesajları silindi', active?.name);
    setMessages([]); setConfirmAll(false); toast({ title: 'Tüm mesajlar silindi' });
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-4">Oda Mesajları</h1>
      <div className="grid sm:grid-cols-[240px_1fr] gap-4">
        <div className="space-y-2 overflow-y-auto max-h-[60vh]">
          {rooms.map((r) => (
            <button key={r.id} onClick={() => setActive(r)} className={`w-full text-left p-3 rounded-lg border ${active?.id === r.id ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}>
              <p className="text-sm font-medium truncate">{r.name}</p>
              <p className="text-xs text-muted-foreground truncate">{r.owner_name ? `${r.owner_name} odası` : 'Odası'}</p>
              <p className="text-xs text-muted-foreground">{r.status === 'active' ? 'Aktif' : 'Kapalı'}</p>
            </button>
          ))}
        </div>
        <div className="bg-card border border-border rounded-xl p-4 max-h-[60vh] overflow-y-auto">
          {!active ? <p className="text-muted-foreground text-sm">Oda seçin.</p> : (
            <>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
                <div className="flex items-center gap-2 min-w-0">
                  <Link to={`/kullanici/${active.owner_id}`} className="shrink-0">
                    {owner?.avatar ? <img src={owner.avatar} className="w-8 h-8 rounded-full object-cover" alt="" /> : <span className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold">{(active.owner_name || '?')[0]}</span>}
                  </Link>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{active.name}</p>
                    <Link to={`/kullanici/${active.owner_id}`} className="text-xs text-muted-foreground hover:text-foreground truncate block">{active.owner_name || owner?.username || 'Kullanıcı'} odası</Link>
                  </div>
                </div>
                {messages.length > 0 && <button onClick={() => setConfirmAll(true)} className="inline-flex items-center gap-1 text-xs text-destructive hover:bg-destructive/10 px-2 py-1 rounded-lg shrink-0"><Trash className="w-3.5 h-3.5" /> Tümünü Sil</button>}
              </div>
              {messages.length === 0 ? <p className="text-muted-foreground text-sm">Mesaj yok.</p> :
              <div className="space-y-2">{messages.map((m) => (
                <div key={m.id} className="flex justify-between gap-2 border-b border-border last:border-0 pb-2">
                  <div className="flex gap-2 min-w-0">
                    {m.type !== 'system' && (
                      <Link to={`/kullanici/${m.user_id}`} className="shrink-0">
                        {m.user_avatar ? <img src={m.user_avatar} className="w-7 h-7 rounded-full object-cover" alt="" /> : <span className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[10px] font-bold">{(m.user_name || '?')[0]}</span>}
                      </Link>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm">{m.type === 'system' ? <span className="text-muted-foreground">🔔 Sistem</span> : <Link to={`/kullanici/${m.user_id}`} className="font-semibold hover:underline">{m.user_name}</Link>} <span className="text-xs text-muted-foreground">{new Date(m.created_date).toLocaleString('tr-TR')}</span></p>
                      <p className="text-sm text-muted-foreground">{m.type === 'system' ? m.text : m.text}</p>
                    </div>
                  </div>
                  <button onClick={() => setConfirm(m)} className="p-1.5 rounded bg-red-500/20 text-red-400 self-start shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}</div>}
            </>
          )}
        </div>
      </div>
      <ConfirmDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)} title="Mesajı sil?" onConfirm={del} />
      <ConfirmDialog open={confirmAll} onOpenChange={(o) => !o && setConfirmAll(false)} title="Tüm mesajları sil?" description="Bu odadaki tüm mesajlar kalıcı olarak silinecek." onConfirm={delAll} />
    </div>
  );
}