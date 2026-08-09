import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import VideoPlayer from '@/components/player/VideoPlayer';
import ChatOverlay from '@/components/player/ChatOverlay';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import { useCurrentUser, membershipActive } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Users, MessageSquare, Mic, MicOff, X, Crown, Copy, AlertCircle } from 'lucide-react';

export default function WatchParty() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: ul } = useCurrentUser();
  const { toast } = useToast();
  const [room, setRoom] = useState(null);
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [syncState, setSyncState] = useState({ is_playing: false, current_time: 0, last_sync: null });
  const joinedRef = useRef(false);
  const lastUpdateRef = useRef(0);
  const playerWrapRef = useRef(null);
  const touchStart = useRef({ x: 0, y: 0 });

  const voice = useVoiceChat({ roomId: id, user, participants: room?.participants, voiceEnabled: !!room?.voice_enabled });

  // load room
  useEffect(() => {
    base44.entities.Room.get(id).then(async (r) => {
      setRoom(r);
      setSyncState({ is_playing: r.is_playing, current_time: r.current_time, last_sync: r.last_sync });
      if (r.movie_id) base44.entities.Movie.get(r.movie_id).then(setMovie).catch(() => {});
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  // join
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

  // subscribe to room updates
  useEffect(() => {
    const unsub = base44.entities.Room.subscribe((ev) => {
      if (ev.type === 'update' && ev.data?.id === id) {
        setRoom(ev.data);
        setSyncState({ is_playing: ev.data.is_playing, current_time: ev.data.current_time, last_sync: ev.data.last_sync });
      }
    });
    return unsub;
  }, [id]);

  // leave on unmount
  useEffect(() => {
    return () => {
      if (!user || !room) return;
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
    if (Date.now() - lastUpdateRef.current < 800) return;
    lastUpdateRef.current = Date.now();
    await base44.entities.Room.update(id, { ...patch, last_sync: new Date().toISOString() }).catch(() => {});
  };

  const onPlayPause = (playing) => updateRoom({ is_playing: playing });
  const onTimeUpdate = (t) => updateRoom({ current_time: t });
  const onSeek = (t) => updateRoom({ current_time: t, is_playing: true });

  const toggleChat = async () => {
    if (!isOwner) { setChatOpen(!chatOpen); return; }
    const ne = !room.chat_enabled;
    await base44.entities.Room.update(id, { chat_enabled: ne }).catch(() => {});
  };

  const toggleVoice = async () => {
    if (!isOwner) { toast({ title: 'Sesli sohbeti sadece oda sahibi açabilir', variant: 'destructive' }); return; }
    const ne = !room.voice_enabled;
    await base44.entities.Room.update(id, { voice_enabled: ne }).catch(() => {});
  };

  const removeUser = async (uid) => {
    if (!isOwner) return;
    const participants = (room.participants || []).filter((p) => p.user_id !== uid);
    await base44.entities.Room.update(id, { participants }).catch(() => {});
    base44.entities.RoomMessage.create({ room_id: id, user_id: user.id, user_name: user.username, text: `Bir kullanıcı odadan çıkarıldı.`, type: 'system' }).catch(() => {});
  };

  const closeRoom = async () => {
    await base44.entities.Room.update(id, { status: 'closed' }).catch(() => {});
    navigate('/');
  };

  const copyLink = () => { navigator.clipboard.writeText(window.location.href); toast({ title: 'Oda linki kopyalandı' }); };

  const onTouchStart = (e) => { const t = e.touches[0]; touchStart.current = { x: t.clientX, y: t.clientY }; };
  const onTouchEnd = (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      if (dx < 0) setChatOpen(true);
      else setChatOpen(false);
    }
  };

  if (ul || loading) return <div className="h-[60vh] flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!room) return <p className="p-6">Oda bulunamadı.</p>;
  if (room.status === 'closed') return <div className="p-10 text-center"><p className="text-xl font-bold mb-2">Oda kapatıldı</p><Link to="/" className="text-primary">Ana sayfaya dön</Link></div>;
  if (!membershipActive(user)) return <div className="p-10 text-center"><p className="mb-4">Watch Party için aktif üyelik gerekli.</p><Link to="/profil" className="text-primary">Üyeliğim</Link></div>;

  const src = movie?.video_url || movie?.hls_url || movie?.external_url || '';
  const chatEnabled = room.chat_enabled;

  return (
    <div className="px-4 sm:px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2"><Crown className="w-5 h-5 text-amber-400" /> {room.name}</h1>
          <p className="text-sm text-muted-foreground">{room.movie_title} · <button onClick={copyLink} className="inline-flex items-center gap-1 hover:text-foreground"><Copy className="w-3 h-3" /> Linki kopyala</button></p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-sm bg-secondary px-3 py-1.5 rounded-lg"><Users className="w-4 h-4" /> {room.participants?.length || 0}/{room.max_users}</span>
          <button onClick={toggleChat} className={`p-2 rounded-lg ${chatEnabled ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`} title="Sohbet"><MessageSquare className="w-5 h-5" /></button>
          <button onClick={toggleVoice} className={`p-2 rounded-lg ${room.voice_enabled ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground'}`} title="Sesli sohbet"><Mic className="w-5 h-5" /></button>
          {isOwner && <button onClick={closeRoom} className="p-2 rounded-lg bg-destructive/20 text-destructive" title="Odayı kapat"><X className="w-5 h-5" /></button>}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-4">
        <div>
          <div ref={playerWrapRef} className="relative rounded-xl overflow-hidden" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            {src ? <VideoPlayer src={src} title={room.movie_title} syncState={syncState} isOwner={isOwner} onPlayPause={onPlayPause} onTimeUpdate={onTimeUpdate} onSeek={onSeek} fullscreenRef={playerWrapRef} /> :
              <div className="aspect-video bg-card border border-border rounded-xl flex items-center justify-center text-muted-foreground">Video kaynağı yok</div>}

            {/* Mobil / fullscreen sohbet paneli (wrapper içinde, fullscreen'de görünür) */}
            {chatOpen && (
              <div className="lg:hidden absolute inset-y-0 right-0 w-[80%] max-w-xs z-30 shadow-2xl border-l border-border rounded-l-xl overflow-hidden">
                <ChatOverlay roomId={id} chatEnabled={chatEnabled} isOwner={isOwner} onClose={() => setChatOpen(false)} />
              </div>
            )}
          </div>

          {!isOwner && <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><Crown className="w-3 h-3 text-amber-400" /> Senkronizasyon oda sahibi tarafından kontrol edilir.</p>}

          {/* Participants */}
          <div className="mt-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2"><Users className="w-4 h-4" /> Katılımcılar ({room.participants?.length || 0})</h3>
            <div className="flex flex-wrap gap-2">
              {room.participants?.map((p) => (
                <div key={p.user_id} className={`flex items-center gap-2 bg-card border rounded-lg pl-1.5 pr-3 py-1.5 ${voice.speaking && p.user_id === user.id ? 'border-primary' : 'border-border'}`}>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold">{(p.name || '?')[0]}</div>
                  <span className="text-sm">{p.name}{p.user_id === room.owner_id && <Crown className="w-3 h-3 text-amber-400 inline ml-1" />}</span>
                  {p.user_id === user.id && (voice.muted ? <MicOff className="w-3.5 h-3.5 text-red-400" /> : <Mic className="w-3.5 h-3.5 text-green-400" />)}
                  {isOwner && p.user_id !== user.id && <button onClick={() => removeUser(p.user_id)} className="text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button>}
                </div>
              ))}
            </div>
          </div>

          {/* Sesli sohbet kontrolleri */}
          {room.voice_enabled && (
            <div className="mt-4 p-4 rounded-xl bg-card border border-border">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Mic className="w-4 h-4 text-accent" /> Sesli Sohbet</h3>
              {voice.error && <p className="text-sm text-destructive flex items-center gap-1 mb-3"><AlertCircle className="w-4 h-4" /> {voice.error}</p>}
              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={voice.toggleMute} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${voice.muted ? 'bg-destructive/20 text-destructive' : 'bg-green-500/20 text-green-400'}`}>
                  {voice.muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />} {voice.muted ? 'Susturuldu' : 'Konuşuyor'}
                </button>
                <span className="text-xs text-muted-foreground">{voice.active ? 'Bağlı' : 'Bağlanıyor...'}</span>
                {voice.speaking && <span className="text-xs text-green-400 font-medium">🔊 Konuşuyor</span>}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Sola kaydır: sohbet aç · Sağa kaydır: sohbet kapat</p>
            </div>
          )}
        </div>

        {/* Masaüstü sohbet paneli */}
        <div className="hidden lg:block h-[60vh] rounded-xl overflow-hidden border border-border">
          <ChatOverlay roomId={id} chatEnabled={chatEnabled} isOwner={isOwner} onClose={() => setChatOpen(false)} />
        </div>
      </div>

      {/* Mobil sohbet açma butonu */}
      {!chatOpen && (
        <button onClick={() => setChatOpen(true)} className="lg:hidden fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
          <MessageSquare className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}