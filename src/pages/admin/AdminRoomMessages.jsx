import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Image } from '@/components/ui/image';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Trash2, Search, Send, Users, Crown, LogIn, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 8;

export default function AdminRoomMessages() {
  const { user: admin } = useCurrentUser();
  const { toast } = useToast();
  const [rooms, setRooms] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [owner, setOwner] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('messages');
  const [page, setPage] = useState(1);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => { base44.entities.Room.list(200).then(setRooms).catch(() => {}); }, []);
  useEffect(() => {
    if (!active) return;
    setOwner(null);
    base44.functions.invoke('user-profile', { user_id: active.owner_id }).then(setOwner).catch(() => {});
    base44.entities.RoomMessage.filter({ room_id: active.id }, 'created_date', 500).then(setMessages).catch(() => {});
    setTab('messages');
  }, [active?.id]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  const log = async (action, target) => { await base44.entities.AdminLog.create({ admin_id: admin?.id, admin_name: admin?.username, action, target }).catch(() => {}); };
  const del = async () => { await base44.entities.RoomMessage.delete(confirm.id); await log('Mesaj silindi', active?.name); toast({ title: 'Silindi' }); setConfirm(null); setMessages((p) => p.filter((m) => m.id !== confirm.id)); };
  const delAll = async () => { await base44.entities.RoomMessage.deleteMany({ room_id: active.id }); await log('Tüm oda mesajları silindi', active?.name); setMessages([]); setConfirmAll(false); toast({ title: 'Tüm mesajlar silindi' }); };

  const send = async () => {
    const text = input.trim(); if (!text || !active) return;
    try {
      const msg = await base44.entities.RoomMessage.create({ room_id: active.id, user_id: admin.id, user_name: admin.username || admin.full_name || 'Admin', user_avatar: admin.avatar || '', text, type: 'user' });
      setMessages((p) => [...p, msg]); setInput('');
    } catch (e) { toast({ title: 'Gönderilemedi', variant: 'destructive' }); }
  };

  const filtered = rooms.filter((r) => r.name?.toLowerCase().includes(search.toLowerCase()) || r.owner_name?.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedRooms = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1">Oda Mesajları</h1>
      <p className="text-sm text-muted-foreground mb-4">Oda sohbetlerini ve katılımcıları görüntüleyin.</p>

      <div className="grid lg:grid-cols-[300px_1fr] gap-4 h-[calc(100vh-180px)]">
        {/* Sol: Oda Listesi */}
        <div className="bg-card border border-border rounded-2xl p-4 flex flex-col min-h-0">
          <h2 className="font-semibold mb-3">Odalar</h2>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Oda ara..." className="w-full bg-secondary/60 rounded-full pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
            {pagedRooms.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Oda yok.</p>}
            {pagedRooms.map((r) => (
              <button key={r.id} onClick={() => setActive(r)} className={`w-full text-left p-3 rounded-xl border transition-colors ${active?.id === r.id ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80'}`}>
                <div className="flex items-center gap-2.5">
                  {r.owner_name ? <span className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-bold shrink-0">{r.owner_name[0]}</span> : <span className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0"><Users className="w-4 h-4" /></span>}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.owner_name ? `${r.owner_name} (Oda Sahibi)` : 'Oda Sahibi yok'}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="inline-flex items-center gap-1 text-xs"><span className={`w-2 h-2 rounded-full ${r.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} /> {r.status === 'active' ? 'Aktif' : 'Kapalı'}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Users className="w-3 h-3" /> {r.participants?.length || 0}</span>
                </div>
              </button>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 mt-3 pt-3 border-t border-border">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-secondary disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i + 1)} className={`w-7 h-7 rounded-full text-xs font-medium ${page === i + 1 ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}>{i + 1}</button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-secondary disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
            </div>
          )}
        </div>

        {/* Sağ: Sohbet Penceresi */}
        <div className="bg-card border border-border rounded-2xl flex flex-col min-h-0 overflow-hidden">
          {!active ? <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Görüntülemek için bir oda seçin.</div> : (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 p-4 border-b border-border">
                <Link to={`/kullanici/${active.owner_id}`} className="shrink-0">
                  {owner?.avatar ? <Image src={owner.avatar} className="w-10 h-10 rounded-full object-cover" fittingType="fill" /> : <span className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold">{(active.owner_name || '?')[0]}</span>}
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{active.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{active.owner_name || owner?.username || 'Kullanıcı'} (Oda Sahibi)</p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs"><span className={`w-2 h-2 rounded-full ${active.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} /> {active.status === 'active' ? 'Aktif' : 'Kapalı'}</span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Users className="w-3.5 h-3.5" /> {active.participants?.length || 0}</span>
                {messages.length > 0 && <button onClick={() => setConfirmAll(true)} className="inline-flex items-center gap-1 text-xs text-destructive hover:bg-destructive/10 px-2.5 py-1.5 rounded-lg shrink-0"><Trash2 className="w-3.5 h-3.5" /> Tümünü Sil</button>}
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border">
                <button onClick={() => setTab('participants')} className={`flex-1 py-2.5 text-sm font-medium relative ${tab === 'participants' ? 'text-foreground' : 'text-muted-foreground'}`}>Katılımcılar
                  {tab === 'participants' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
                <button onClick={() => setTab('messages')} className={`flex-1 py-2.5 text-sm font-medium relative ${tab === 'messages' ? 'text-foreground' : 'text-muted-foreground'}`}>Mesajlar{messages.length > 0 && <span className="ml-1 text-xs text-muted-foreground">({messages.length})</span>}
                  {tab === 'messages' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
              </div>

              {/* İçerik */}
              {tab === 'participants' ? (
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {(active.participants || []).length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Katılımcı yok.</p> :
                    (active.participants || []).map((p) => (
                      <div key={p.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/40">
                        <Link to={`/kullanici/${p.user_id}`} className="shrink-0">
                          {p.avatar ? <Image src={p.avatar} className="w-9 h-9 rounded-full object-cover" fittingType="fill" /> : <span className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-bold">{(p.name || '?')[0]}</span>}
                        </Link>
                        <Link to={`/kullanici/${p.user_id}`} className="flex-1 min-w-0 hover:underline">
                          <p className="text-sm font-medium truncate">{p.name}{p.user_id === active.owner_id && <Crown className="w-3.5 h-3.5 text-amber-400 inline ml-1" />}</p>
                        </Link>
                      </div>
                    ))}
                </div>
              ) : (
                <>
                  <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">Mesaj yok.</p> :
                      messages.map((m) => (
                        m.type === 'system' ? (
                          <div key={m.id} className="flex items-center justify-center gap-2 group">
                            <span className="bg-secondary/60 rounded-full px-3 py-1.5 text-xs text-muted-foreground inline-flex items-center gap-1.5"><LogIn className="w-3 h-3" /> {m.text} · {new Date(m.created_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                            <button onClick={() => setConfirm(m)} className="opacity-0 group-hover:opacity-100 p-1 rounded bg-red-500/20 text-red-400"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        ) : (
                          <div key={m.id} className="flex gap-2.5 group">
                            <Link to={`/kullanici/${m.user_id}`} className="shrink-0">
                              {m.user_avatar ? <Image src={m.user_avatar} className="w-8 h-8 rounded-full object-cover" fittingType="fill" /> : <span className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold">{(m.user_name || '?')[0]}</span>}
                            </Link>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <Link to={`/kullanici/${m.user_id}`} className="text-sm font-semibold text-primary hover:underline">{m.user_name}</Link>
                                <span className="text-xs text-muted-foreground">{new Date(m.created_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p className="text-sm mt-0.5 break-words">{m.text}</p>
                            </div>
                            <button onClick={() => setConfirm(m)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded bg-red-500/20 text-red-400 self-start shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        )
                      ))}
                  </div>
                  {/* Mesaj Input */}
                  <div className="p-3 border-t border-border">
                    <div className="flex items-center gap-2 bg-secondary/60 rounded-full pl-4 pr-1.5 py-1.5 border border-border focus-within:ring-2 focus-within:ring-ring">
                      <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Mesaj yazın..." className="flex-1 bg-transparent text-sm outline-none" />
                      <button onClick={send} className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0"><Send className="w-4 h-4" /></button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <ConfirmDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)} title="Mesajı sil?" onConfirm={del} />
      <ConfirmDialog open={confirmAll} onOpenChange={(o) => !o && setConfirmAll(false)} title="Tüm mesajları sil?" description="Bu odadaki tüm mesajlar kalıcı olarak silinecek." confirmText="Tümünü Sil" onConfirm={delAll} />
    </div>
  );
}