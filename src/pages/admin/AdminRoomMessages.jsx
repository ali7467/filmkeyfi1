import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Image } from '@/components/ui/image';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import UserBadge from '@/components/admin/UserBadge';
import { Trash2, Search, Send, Users, Crown, ChevronLeft, ChevronRight, Download, Copy, MoreVertical, Calendar, Hash, UserCircle, Shield } from 'lucide-react';

const PAGE_SIZE = 8;

function roomNumber(r, idx, page) {
  return '#' + (1000 + (idx + 1 + (page - 1) * PAGE_SIZE));
}

export default function AdminRoomMessages() {
  const { user: admin } = useCurrentUser();
  const { toast } = useToast();
  const [rooms, setRooms] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [owner, setOwner] = useState(null);
  const [participantProfiles, setParticipantProfiles] = useState({});
  const [confirm, setConfirm] = useState(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('messages');
  const [page, setPage] = useState(1);
  const [input, setInput] = useState('');
  const [menuMsg, setMenuMsg] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => { base44.entities.Room.list(200).then(setRooms).catch(() => {}); }, []);
  useEffect(() => {
    if (!active) return;
    setOwner(null);
    base44.functions.invoke('user-profile', { user_id: active.owner_id }).then(setOwner).catch(() => {});
    base44.entities.RoomMessage.filter({ room_id: active.id }, 'created_date', 500).then(setMessages).catch(() => {});
    const pIds = [...new Set((active.participants || []).map((p) => p.user_id))];
    Promise.all(pIds.map((pid) => base44.functions.invoke('user-profile', { user_id: pid }).catch(() => null))).then((ps) => setParticipantProfiles(Object.fromEntries(pIds.map((pid, i) => [pid, ps[i]]))));
    setTab('messages');
  }, [active?.id]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  const log = async (action, target) => { await base44.entities.AdminLog.create({ admin_id: admin?.id, admin_name: admin?.username, action, target }).catch(() => {}); };
  const del = async () => { await base44.entities.RoomMessage.delete(confirm.id); await log('Mesaj silindi', active?.name); toast({ title: 'Silindi' }); setConfirm(null); setMenuMsg(null); setMessages((p) => p.filter((m) => m.id !== confirm.id)); };
  const delAll = async () => { await base44.entities.RoomMessage.deleteMany({ room_id: active.id }); await log('Tüm oda mesajları silindi', active?.name); setMessages([]); setConfirmAll(false); toast({ title: 'Tüm mesajlar silindi' }); };

  const send = async () => {
    const text = input.trim(); if (!text || !active) return;
    try {
      const msg = await base44.entities.RoomMessage.create({ room_id: active.id, user_id: admin.id, user_name: admin.username || admin.full_name || 'Admin', user_avatar: admin.avatar || '', text, type: 'user' });
      setMessages((p) => [...p, msg]); setInput('');
    } catch (e) { toast({ title: 'Gönderilemedi', variant: 'destructive' }); }
  };

  const copyRoomNo = () => { if (!active) return; const num = roomNumber(active, 0, page); navigator.clipboard?.writeText(num); toast({ title: 'Kopyalandı', description: num }); };

  const exportMessages = () => {
    if (!active || messages.length === 0) { toast({ title: 'Dışa aktarılacak mesaj yok' }); return; }
    const lines = messages.map((m) => {
      const t = new Date(m.created_date).toLocaleString('tr-TR');
      return m.type === 'system' ? `[${t}] SİSTEM: ${m.text}` : `[${t}] ${m.user_name}: ${m.text}`;
    });
    const blob = new Blob([`Oda: ${active.name}\nOda Sahibi: ${active.owner_name || '-'}\nOluşturulma: ${new Date(active.created_date).toLocaleString('tr-TR')}\n\n${lines.join('\n')}`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${active.name.replace(/\s+/g, '_')}_mesajlar.txt`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Dışa aktarıldı' });
  };

  const filtered = rooms.filter((r) => r.name?.toLowerCase().includes(search.toLowerCase()) || r.owner_name?.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedRooms = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Oda Mesajları</h1>
          <p className="text-sm text-muted-foreground">Odaları seçerek mesaj geçmişlerini görüntüleyin ve yönetin.</p>
        </div>
        <button onClick={exportMessages} className="inline-flex items-center gap-1.5 bg-secondary px-4 py-2 rounded-lg text-sm font-semibold shrink-0"><Download className="w-4 h-4" /> Dışa Aktar</button>
      </div>

      <div className="grid lg:grid-cols-[300px_1fr] gap-4 h-[calc(100vh-200px)]">
        {/* Sol: Oda Listesi */}
        <div className="bg-card border border-border rounded-2xl p-4 flex flex-col min-h-0">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Oda ara..." className="w-full bg-secondary/60 rounded-full pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
            {pagedRooms.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Oda yok.</p>}
            {pagedRooms.map((r, idx) => (
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
                <button key={i} onClick={() => setPage(i + 1)} className={`w-7 h-7 rounded-full text-xs font-medium border ${page === i + 1 ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:bg-secondary'}`}>{i + 1}</button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-secondary disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
            </div>
          )}
        </div>

        {/* Sağ: Sohbet Penceresi */}
        <div className="bg-card border border-border rounded-2xl flex flex-col min-h-0 overflow-hidden">
          {!active ? <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Görüntülemek için bir oda seçin.</div> : (
            <>
              {/* Room Header */}
              <div className="p-4 border-b border-border">
                <div className="flex items-start gap-3">
                  <Link to={`/kullanici/${active.owner_id}`} className="shrink-0">
                    {owner?.avatar ? <Image src={owner.avatar} className="w-14 h-14 rounded-full object-cover" fittingType="fill" /> : <span className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xl font-bold">{(active.owner_name || '?')[0]}</span>}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{active.name}</p>
                      <button onClick={copyRoomNo} className="text-muted-foreground hover:text-foreground shrink-0"><Copy className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 mt-2">
                      <div><p className="text-[10px] text-muted-foreground mb-0.5">Oda Sahibi</p><UserBadge userId={active.owner_id} name={active.owner_name || '-'} avatar={owner?.avatar} memberId={owner?.member_id} size="sm" /></div>
                      <InfoItem icon={Hash} label="Oda Numarası" value={roomNumber(active, 0, page)} />
                      <InfoItem icon={Calendar} label="Oluşturulma" value={new Date(active.created_date).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <div><p className="text-[10px] text-muted-foreground">Durum</p><span className={`text-xs px-2 py-0.5 rounded-full ${active.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{active.status === 'active' ? 'Aktif' : 'Kapalı'}</span></div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <div><p className="text-[10px] text-muted-foreground">Katılımcı</p><p className="text-xs font-medium">{active.participants?.length || 0}</p></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border">
                <button onClick={() => setTab('messages')} className={`flex-1 py-2.5 text-sm font-medium relative ${tab === 'messages' ? 'text-foreground' : 'text-muted-foreground'}`}>Mesajlar{messages.length > 0 && <span className="ml-1 text-xs text-muted-foreground">({messages.length})</span>}{tab === 'messages' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}</button>
                <button onClick={() => setTab('participants')} className={`flex-1 py-2.5 text-sm font-medium relative ${tab === 'participants' ? 'text-foreground' : 'text-muted-foreground'}`}>Katılımcılar ({active.participants?.length || 0}){tab === 'participants' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}</button>
                <button onClick={() => setTab('info')} className={`flex-1 py-2.5 text-sm font-medium relative ${tab === 'info' ? 'text-foreground' : 'text-muted-foreground'}`}>Oda Bilgileri{tab === 'info' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}</button>
              </div>

              {/* İçerik */}
              {tab === 'participants' ? (
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {(active.participants || []).length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Katılımcı yok.</p> :
                    (active.participants || []).map((p) => {
                      const prof = participantProfiles[p.user_id];
                      return <div key={p.user_id} className="p-2 rounded-lg hover:bg-secondary/40"><UserBadge userId={p.user_id} name={p.name} avatar={p.avatar || prof?.avatar} memberId={prof?.member_id} size="md" isOwner={p.user_id === active.owner_id} /></div>;
                    })}
                </div>
              ) : tab === 'info' ? (
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  <DetailRow label="Oda Adı" value={active.name} />
                  <DetailRow label="Oda Numarası" value={roomNumber(active, 0, page)} />
                  <DetailRow label="Oda Sahibi" value={active.owner_name || '-'} />
                  <DetailRow label="Film" value={active.movie_title || '-'} />
                  <DetailRow label="Durum" value={active.status === 'active' ? 'Aktif' : 'Kapalı'} />
                  <DetailRow label="Katılımcı" value={`${active.participants?.length || 0}/${active.max_users || 10}`} />
                  <DetailRow label="Şifreli" value={active.password ? 'Evet' : 'Hayır'} />
                  <DetailRow label="Sohbet" value={active.chat_enabled ? 'Açık' : 'Kapalı'} />
                  <DetailRow label="Sesli" value={active.voice_enabled ? 'Açık' : 'Kapalı'} />
                  <DetailRow label="Oluşturulma" value={new Date(active.created_date).toLocaleString('tr-TR')} />
                  {messages.length > 0 && <button onClick={() => setConfirmAll(true)} className="mt-3 inline-flex items-center gap-1.5 bg-red-500/20 text-red-400 px-4 py-2 rounded-lg text-sm font-semibold"><Trash2 className="w-4 h-4" /> Tüm Mesajları Sil</button>}
                </div>
              ) : (
                <>
                  <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3" onClick={() => menuMsg && setMenuMsg(null)}>
                    {messages.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">Mesaj yok.</p> :
                      <>
                        <div className="flex items-center gap-3 my-2"><div className="flex-1 h-px bg-border" /><span className="text-xs text-muted-foreground">Bugün</span><div className="flex-1 h-px bg-border" /></div>
                        {messages.map((m) => (
                          m.type === 'system' ? (
                            <div key={m.id} className="flex items-center justify-center gap-1.5">
                              <span className="text-xs text-muted-foreground">{m.text}</span>
                              <Users className="w-3.5 h-3.5 text-green-500" />
                              <span className="text-xs text-muted-foreground">{new Date(m.created_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          ) : (
                            <div key={m.id} className="flex gap-2.5 group relative">
                              <Link to={`/kullanici/${m.user_id}`} className="shrink-0">
                                {m.user_avatar ? <Image src={m.user_avatar} className="w-8 h-8 rounded-full object-cover" fittingType="fill" /> : <span className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold">{(m.user_name || '?')[0]}</span>}
                              </Link>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <Link to={`/kullanici/${m.user_id}`} className="text-sm font-semibold text-primary hover:underline">{m.user_name}</Link>
                                  {m.user_id === active.owner_id && <Crown className="w-3 h-3 text-amber-400" />}
                                </div>
                                <p className="text-sm mt-0.5 break-words">{m.text}</p>
                              </div>
                              <span className="text-xs text-muted-foreground shrink-0 self-start mt-1">{new Date(m.created_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                              <div className="relative shrink-0">
                                <button onClick={() => setMenuMsg(menuMsg === m.id ? null : m.id)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><MoreVertical className="w-4 h-4" /></button>
                                {menuMsg === m.id && (
                                  <div className="absolute right-0 top-7 z-20 bg-popover border border-border rounded-lg shadow-xl py-1 w-32">
                                    <button onClick={() => { setConfirm(m); setMenuMsg(null); }} className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-1.5"><Trash2 className="w-3 h-3" /> Sil</button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        ))}
                      </>
                    }
                  </div>
                  {/* Mesaj Input */}
                  <div className="p-3 border-t border-border">
                    <div className="flex items-center gap-2 bg-secondary/60 rounded-full pl-4 pr-1.5 py-1.5 border border-border focus-within:ring-2 focus-within:ring-ring">
                      <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); if (e.key === 'Escape') setMenuMsg(null); }} placeholder="Mesaj yazın..." className="flex-1 bg-transparent text-sm outline-none" />
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

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <div className="min-w-0"><p className="text-[10px] text-muted-foreground">{label}</p><p className="text-xs font-medium truncate">{value}</p></div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return <div className="flex justify-between text-sm py-2 border-b border-border last:border-0"><span className="text-muted-foreground">{label}</span><span className="font-medium text-right">{value}</span></div>;
}