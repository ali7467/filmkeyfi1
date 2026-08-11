import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import VideoPlayer from '@/components/player/VideoPlayer';
import ChatOverlay from '@/components/player/ChatOverlay';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import { useCurrentUser, membershipActive } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Mic, MicOff, AlertCircle, Crown, X, MessageSquare, Eye, EyeOff, Lock, Unlock } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

export default function WatchParty() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: ul } = useCurrentUser();
  const { toast } = useToast();
  const [room, setRoom] = useState(null);
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [needPassword, setNeedPassword] = useState(false);
  const [pwInput, setPwInput] = useState('');
  const [pwSetInput, setPwSetInput] = useState('');
  const [showPwSet, setShowPwSet] = useState(false);
  const [showPwRemoveConfirm, setShowPwRemoveConfirm] = useState(false);
  const [syncState, setSyncState] = useState({ is_playing: false, current_time: 0, last_sync: null });
  const [unread, setUnread] = useState(0);
  const joinedRef = useRef(false);
  const ghostRef = useRef(false);
  const kickedRef = useRef(false);
  const lastUpdateRef = useRef(0);
  const playerWrapRef = useRef(null);
  const touchStart = useRef({ x: 0, y: 0 });
  const speakingRef = useRef(false);
  const lastSpeakingSync = useRef(0);

  const updateMySpeaking = (speaking) => {
    if (speakingRef.current === speaking) return;
    speakingRef.current = speaking;
    const now = Date.now();
    if (now - lastSpeakingSync.current < 600) return;
    lastSpeakingSync.current = now;
    if (!room || !user) return;
    const participants = (room.participants || []).map((p) => p.user_id === user.id ? { ...p, speaking } : p);
    base44.entities.Room.update(id, { participants }).catch(() => {});
  };

  const voice = useVoiceChat({ roomId: id, user, participants: room?.participants, voiceEnabled: !!room?.voice_enabled, onSpeakingChange: updateMySpeaking });

  useEffect(() => {
    base44.entities.Room.get(id).then(async (r) => {
      setRoom(r);
      setSyncState({ is_playing: r.is_playing, current_time: r.current_time, last_sync: r.last_sync });
      if (r.movie_id) base44.entities.Movie.get(r.movie_id).then(setMovie).catch(() => {});
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!user || !room || joinedRef.current) return;
    if (room.password && room.owner_id !== user.id && user.role !== 'admin' && !room.participants?.some((p) => p.user_id === user.id)) {
      setNeedPassword(true);
      return;
    }
    joinedRef.current = true;
    base44.functions.invoke('room-presence', { action: 'join', room_id: id })
      .then((res) => { if (res?.ghost) ghostRef.current = true; })
      .catch((e) => toast({ title: 'Katılım başarısız', description: e.response?.data?.error || e.message, variant: 'destructive' }));
  }, [user?.id, room?.id]);

  const submitPassword = async () => {
    try {
      await base44.functions.invoke('room-presence', { action: 'join', room_id: id, password: pwInput });
      joinedRef.current = true; setNeedPassword(false); setPwInput('');
    } catch (e) {
      toast({ title: 'Hatalı şifre', description: e.response?.data?.error || e.message, variant: 'destructive' });
    }
  };

  useEffect(() => {
    const unsub = base44.entities.Room.subscribe((ev) => {
      if (ev.type === 'update' && ev.data?.id === id) {
        setRoom(ev.data);
        setSyncState({ is_playing: ev.data.is_playing, current_time: ev.data.current_time, last_sync: ev.data.last_sync });
      }
    });
    return unsub;
  }, [id]);

  // Sohbet kapalıyken gelen mesajlar için okunmamış sayacı
  useEffect(() => {
    if (chatOpen) { setUnread(0); return; }
    const unsub = base44.entities.RoomMessage.subscribe((ev) => {
      if (ev.type === 'create' && ev.data?.room_id === id && ev.data?.type !== 'system') setUnread((u) => u + 1);
    });
    return unsub;
  }, [chatOpen, id]);

  // Atılma tespiti: katılımcı listesinden çıkarıldıysa yönlendir
  useEffect(() => {
    if (!user || !joinedRef.current || !room || room.owner_id === user.id || isMod || ghostRef.current) return;
    const stillIn = (room.participants || []).some((p) => p.user_id === user.id);
    if (!stillIn) {
      kickedRef.current = true;
      toast({ title: 'Odadan atıldınız', variant: 'destructive' });
      navigate('/');
    }
  }, [room?.participants, user?.id]);

  const leaveRoom = async () => {
    if (!user || !joinedRef.current || kickedRef.current) return;
    joinedRef.current = false;
    try { await base44.functions.invoke('room-presence', { action: 'leave', room_id: id }); } catch {}
  };

  const handleBack = async () => { await leaveRoom(); navigate(-1); };

  useEffect(() => {
    return () => { leaveRoom(); };
  }, []);

  const isOwner = user?.id === room?.owner_id;
  const isMod = user?.role === 'admin' || user?.role === 'moderator';
  const canMod = isOwner || isMod;

  const updateRoom = async (patch) => {
    if (!isOwner) return;
    if (Date.now() - lastUpdateRef.current < 700) return;
    lastUpdateRef.current = Date.now();
    await base44.entities.Room.update(id, { ...patch, last_sync: new Date().toISOString() }).catch(() => {});
  };

  const onPlayPause = (playing) => updateRoom({ is_playing: playing });
  const onTimeUpdate = (t) => updateRoom({ current_time: t });
  const onSeek = (t) => updateRoom({ current_time: t, is_playing: true });

  const toggleVoice = async () => {
    if (!canMod) { toast({ title: 'Yetkiniz yok', variant: 'destructive' }); return; }
    await base44.entities.Room.update(id, { voice_enabled: !room.voice_enabled }).catch(() => {});
  };

  const toggleHidden = async () => {
    if (!canMod) return;
    try { await base44.entities.Room.update(id, { hidden: !room.hidden }); toast({ title: room.hidden ? 'Oda artık görünür' : 'Oda gizlendi' }); }
    catch (e) { toast({ title: 'İşlem başarısız', variant: 'destructive' }); }
  };

  const savePassword = async (override) => {
    if (!canMod) return;
    const pw = (override !== undefined ? override : pwSetInput).trim();
    try {
      await base44.functions.invoke('room-presence', { action: 'set-password', room_id: id, password: pw });
      toast({ title: pw ? 'Oda şifresi güncellendi' : 'Oda şifresi kaldırıldı' });
      setShowPwSet(false); setPwSetInput('');
    } catch (e) { toast({ title: 'İşlem başarısız', description: e.response?.data?.error || e.message, variant: 'destructive' }); }
  };

  const removeUser = async (uid) => {
    if (!canMod) return;
    try { await base44.functions.invoke('room-presence', { action: 'kick', room_id: id, target_id: uid }); toast({ title: 'Kullanıcı odadan çıkarıldı' }); }
    catch (e) { toast({ title: 'Çıkarılamadı', description: e.response?.data?.error || e.message, variant: 'destructive' }); }
    setShowViewers(false);
  };

  const onTouchStart = (e) => { const t = e.touches[0]; touchStart.current = { x: t.clientX, y: t.clientY }; };
  const onTouchEnd = (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) setChatOpen(true);
      else setChatOpen(false);
    }
  };

  if (ul || loading) return <div className="h-screen flex items-center justify-center bg-background"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!room) return <div className="p-6">Oda bulunamadı.</div>;
  if (room.status === 'closed') return <div className="p-10 text-center"><p className="text-xl font-bold mb-2">Oda kapatıldı</p><Link to="/" className="text-primary">Ana sayfaya dön</Link></div>;
  if (!membershipActive(user)) return <div className="p-10 text-center"><p className="mb-4">Watch Party için aktif üyelik gerekli.</p><Link to="/profil" className="text-primary">Üyeliğim</Link></div>;

  if (needPassword) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-6">
        <div className="bg-card border border-border rounded-xl p-5 w-full max-w-xs">
          <h2 className="font-bold mb-1">Şifreli Oda</h2>
          <p className="text-sm text-muted-foreground mb-3">Bu oda şifre korumalı. Katılmak için şifreyi girin.</p>
          <input value={pwInput} onChange={(e) => setPwInput(e.target.value)} type="password" placeholder="Oda şifresi" className="w-full bg-secondary/60 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring mb-3" />
          <div className="flex gap-2">
            <button onClick={() => navigate(-1)} className="flex-1 bg-secondary py-2 rounded-lg text-sm">Geri</button>
            <button onClick={submitPassword} className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-semibold">Katıl</button>
          </div>
        </div>
      </div>
    );
  }

  const src = movie?.video_url || movie?.hls_url || movie?.external_url || '';
  const chatEnabled = room.chat_enabled;

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden" style={{ touchAction: 'pan-y', overscrollBehavior: 'none' }}>
      {/* Üst kontrol çubuğu */}
      <div className="flex items-center gap-2 px-3 py-2 bg-background/95 border-b border-border shrink-0 z-20" style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top))' }}>
        <button onClick={handleBack} className="px-3 py-1.5 rounded-lg bg-secondary text-sm font-semibold shrink-0">GERİ</button>
        <h1 className="flex-1 min-w-0 text-center font-bold truncate px-2 text-sm sm:text-base">{room.name}</h1>
        <button onClick={() => setShowViewers(!showViewers)} className="px-3 py-1.5 rounded-lg bg-secondary text-sm font-semibold shrink-0">İZLEYİCİ {room.participants?.length || 0}</button>
        <button onClick={() => setChatOpen(!chatOpen)} className={`relative p-2 rounded-lg shrink-0 ${chatOpen ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`} title="Sohbet"><MessageSquare className="w-5 h-5" />
          {!chatOpen && unread > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">{unread > 99 ? '99+' : unread}</span>}
        </button>
      </div>

      {/* Video + sohbet alanı */}
      <div ref={playerWrapRef} className="flex-1 flex min-h-0 relative" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className={`flex items-center justify-center bg-black ${chatOpen ? 'flex-1 min-w-0' : 'flex-1 min-w-0'}`}>
          {src ? <VideoPlayer src={src} title={room.movie_title} syncState={syncState} isOwner={isOwner} onPlayPause={onPlayPause} onTimeUpdate={onTimeUpdate} onSeek={onSeek} fullscreenRef={playerWrapRef} watermark={user} /> :
            <div className="text-muted-foreground text-sm p-6 text-center">Video kaynağı yok</div>}
        </div>

        {chatOpen && (
          <div className="w-[300px] max-w-[42%] min-h-0 border-l border-border bg-card flex flex-col shrink-0">
            <ChatOverlay roomId={id} chatEnabled={chatEnabled} isOwner={canMod} onClose={() => setChatOpen(false)} />
          </div>
        )}

        {showViewers && (
          <div className="absolute top-2 right-2 bg-card border border-border rounded-xl p-3 z-30 w-56 max-h-[70%] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-sm">İzleyiciler</p>
              <button onClick={() => setShowViewers(false)} className="text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-1.5">
              {room.participants?.map((p) => (
                <div key={p.user_id} className="flex items-center gap-2 text-sm">
                  <Link to={`/kullanici/${p.user_id}`} className={`w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold shrink-0 transition-transform ${p.speaking ? 'speaking-glow scale-110' : ''}`}>{(p.name || '?')[0]}</Link>
                  <Link to={`/kullanici/${p.user_id}`} className="flex-1 truncate hover:underline">{p.name}{p.user_id === room.owner_id && <Crown className="w-3 h-3 text-amber-400 inline ml-1" />}</Link>
                  {p.speaking && <span className="text-[10px] text-green-400 font-semibold">🔊</span>}
                  {canMod && p.user_id !== user.id && <button onClick={() => removeUser(p.user_id)} className="text-xs text-destructive">Çıkar</button>}
                </div>
              ))}
            </div>
            <button onClick={toggleVoice} className={`w-full mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold ${room.voice_enabled ? 'bg-accent text-accent-foreground' : 'bg-secondary'}`}>{room.voice_enabled ? 'SESLİ KAPAT' : 'SESLİ AÇ'}</button>
            {canMod && (
              <div className="flex gap-1.5 mt-2">
                <button onClick={toggleHidden} className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-secondary text-xs font-semibold" title="Gizle/Göster">{room.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}{room.hidden ? 'GÖSTER' : 'GİZLE'}</button>
                <button onClick={() => { if (room.password) setShowPwRemoveConfirm(true); else { setShowPwSet(!showPwSet); setPwSetInput(''); } }} className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-secondary text-xs font-semibold" title="Şifre">{room.password ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}{room.password ? 'ŞİFRE KALDIR' : 'ŞİFRE KOY'}</button>
              </div>
            )}
            {canMod && showPwSet && (
              <div className="mt-2 flex gap-1.5">
                <input value={pwSetInput} onChange={(e) => setPwSetInput(e.target.value)} type="password" placeholder="Yeni şifre (boş=kaldır)" className="flex-1 min-w-0 bg-secondary/60 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring" />
                <button onClick={savePassword} className="px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shrink-0">KAYDET</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sesli sohbet kontrolü */}
      {room.voice_enabled && (
        <div className="shrink-0 px-3 py-2 bg-background/95 border-t border-border flex items-center gap-3 flex-wrap" style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}>
          {voice.error && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {voice.error}</p>}
          <button onClick={voice.toggleMute} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${voice.muted ? 'bg-destructive/20 text-destructive' : 'bg-green-500/20 text-green-400'}`}>
            {voice.muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />} {voice.muted ? 'SUSTURULDU' : 'KONUŞUYOR'}
          </button>
          <span className="text-xs text-muted-foreground">{voice.active ? 'Bağlı' : 'Bağlanıyor...'}</span>
          {(room.participants || []).filter((p) => p.speaking).map((p) => (
            <Link key={p.user_id} to={`/kullanici/${p.user_id}`} className="inline-flex items-center gap-1.5 bg-green-500/15 text-green-400 px-2 py-1 rounded-full text-xs font-medium hover:bg-green-500/25">
              <span className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[10px] font-bold speaking-glow">{(p.name || '?')[0]}</span>
              {p.name} konuşuyor
            </Link>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={showPwRemoveConfirm}
        onOpenChange={setShowPwRemoveConfirm}
        title="Şifre kaldırılsın mı?"
        description="Oda şifresini kaldırırsanız oda herkese açık hale gelir."
        confirmText="Kaldır"
        onConfirm={() => savePassword('')}
      />
    </div>
  );
}