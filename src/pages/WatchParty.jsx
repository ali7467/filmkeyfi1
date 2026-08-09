import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import VideoPlayer from '@/components/player/VideoPlayer';
import ChatOverlay from '@/components/player/ChatOverlay';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import { useCurrentUser, membershipActive } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Mic, MicOff, AlertCircle, Crown, X } from 'lucide-react';

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
  const [syncState, setSyncState] = useState({ is_playing: false, current_time: 0, last_sync: null });
  const joinedRef = useRef(false);
  const lastUpdateRef = useRef(0);
  const playerWrapRef = useRef(null);
  const touchStart = useRef({ x: 0, y: 0 });

  const voice = useVoiceChat({ roomId: id, user, participants: room?.participants, voiceEnabled: !!room?.voice_enabled });

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
    joinedRef.current = true;
    const me = { user_id: user.id, name: user.username || user.full_name, avatar: user.avatar || '', muted: false, speaking: false };
    const exists = room.participants?.some((p) => p.user_id === user.id);
    if (!exists) {
      const participants = [...(room.participants || []), me];
      base44.entities.Room.update(id, { participants }).catch(() => {});
      base44.entities.RoomMessage.create({ room_id: id, user_id: user.id, user_name: me.name, text: `${me.name} odaya katıldı.`, type: 'system' }).catch(() => {});
    }
  }, [user?.id, room?.id]);

  useEffect(() => {
    const unsub = base44.entities.Room.subscribe((ev) => {
      if (ev.type === 'update' && ev.data?.id === id) {
        setRoom(ev.data);
        setSyncState({ is_playing: ev.data.is_playing, current_time: ev.data.current_time, last_sync: ev.data.last_sync });
      }
    });
    return unsub;
  }, [id]);

  useEffect(() => {
    return () => {
      if (!user) return;
      base44.entities.Room.get(id).then((r) => {
        if (!r) return;
        const participants = (r.participants || []).filter((p) => p.user_id !== user.id);
        let owner_id = r.owner_id;
        if (r.owner_id === user.id && participants.length > 0) owner_id = participants[0].user_id;
        base44.entities.Room.update(id, { participants, owner_id, owner_name: participants[0]?.name || r.owner_name }).catch(() => {});
        base44.entities.RoomMessage.create({ room_id: id, user_id: user.id, user_name: user.username || user.full_name, text: `${user.username || user.full_name} odadan ayrıldı.`, type: 'system' }).catch(() => {});
      }).catch(() => {});
    };
  }, []);

  const isOwner = user?.id === room?.owner_id;

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
    if (!isOwner) { toast({ title: 'Sesli sohbeti sadece oda sahibi açabilir', variant: 'destructive' }); return; }
    await base44.entities.Room.update(id, { voice_enabled: !room.voice_enabled }).catch(() => {});
  };

  const removeUser = async (uid) => {
    if (!isOwner) return;
    const participants = (room.participants || []).filter((p) => p.user_id !== uid);
    await base44.entities.Room.update(id, { participants }).catch(() => {});
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

  const src = movie?.video_url || movie?.hls_url || movie?.external_url || '';
  const chatEnabled = room.chat_enabled;

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden" style={{ touchAction: 'pan-y', overscrollBehavior: 'none' }}>
      {/* Üst kontrol çubuğu */}
      <div className="flex items-center gap-2 px-3 py-2 bg-background/95 border-b border-border shrink-0 z-20" style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top))' }}>
        <button onClick={() => navigate(-1)} className="px-3 py-1.5 rounded-lg bg-secondary text-sm font-semibold shrink-0">GERİ</button>
        <h1 className="flex-1 min-w-0 text-center font-bold truncate px-2 text-sm sm:text-base">{room.name}</h1>
        <button onClick={() => setShowViewers(!showViewers)} className="px-3 py-1.5 rounded-lg bg-secondary text-sm font-semibold shrink-0">İZLEYİCİ {room.participants?.length || 0}</button>
        <button onClick={() => setChatOpen(!chatOpen)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold shrink-0 ${chatOpen ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>SOHBET</button>
      </div>

      {/* Video + sohbet alanı */}
      <div ref={playerWrapRef} className="flex-1 flex min-h-0 relative" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className={`flex items-center justify-center bg-black ${chatOpen ? 'flex-1 min-w-0' : 'flex-1 min-w-0'}`}>
          {src ? <VideoPlayer src={src} title={room.movie_title} syncState={syncState} isOwner={isOwner} onPlayPause={onPlayPause} onTimeUpdate={onTimeUpdate} onSeek={onSeek} fullscreenRef={playerWrapRef} /> :
            <div className="text-muted-foreground text-sm p-6 text-center">Video kaynağı yok</div>}
        </div>

        {chatOpen && (
          <div className="w-[300px] max-w-[42%] border-l border-border bg-card flex flex-col shrink-0">
            <ChatOverlay roomId={id} chatEnabled={chatEnabled} isOwner={isOwner} onClose={() => setChatOpen(false)} />
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
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold shrink-0">{(p.name || '?')[0]}</div>
                  <span className="flex-1 truncate">{p.name}{p.user_id === room.owner_id && <Crown className="w-3 h-3 text-amber-400 inline ml-1" />}</span>
                  {isOwner && p.user_id !== user.id && <button onClick={() => removeUser(p.user_id)} className="text-xs text-destructive">Çıkar</button>}
                </div>
              ))}
            </div>
            <button onClick={toggleVoice} className={`w-full mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold ${room.voice_enabled ? 'bg-accent text-accent-foreground' : 'bg-secondary'}`}>{room.voice_enabled ? 'SESLİ KAPAT' : 'SESLİ AÇ'}</button>
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
          {voice.speaking && <span className="text-xs text-green-400 font-medium">🔊 Konuşuyor</span>}
        </div>
      )}
    </div>
  );
}