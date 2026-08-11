import { useEffect, useRef, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' }
  ]
};

/**
 * Gerçek zamanlı WebRTC sesli sohbet (mesh network).
 * Sinyalleme VoiceSignal entity'si üzerinden yapılır.
 * Kararlı bağlantı için: ICE buffering, bağlantı durumu izleme,
 * otomatik yeniden bağlanma ve ayrılan katılımcı temizliği.
 */
export function useVoiceChat({ roomId, user, participants, voiceEnabled, onSpeakingChange }) {
  const [muted, setMuted] = useState(false);
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [active, setActive] = useState(false);
  const [error, setError] = useState('');
  const localStreamRef = useRef(null);
  const peersRef = useRef({});          // { [otherId]: RTCPeerConnection }
  const pendingIceRef = useRef({});      // { [otherId]: candidate[] }
  const initiatedRef = useRef(new Set());
  const mutedRef = useRef(false);
  const remoteMutedRef = useRef(false);
  const audioCtxRef = useRef(null);
  const rafRef = useRef(null);
  const participantsRef = useRef(participants);
  participantsRef.current = participants;
  const userRef = useRef(user);
  userRef.current = user;
  const roomIdRef = useRef(roomId);
  roomIdRef.current = roomId;
  const onSpeakingRef = useRef(onSpeakingChange);
  onSpeakingRef.current = onSpeakingChange;

  // --- Sinyal gönderme ---
  const sendSignal = useCallback((toId, type, data) => {
    base44.entities.VoiceSignal.create({
      room_id: roomIdRef.current,
      from_id: userRef.current.id,
      to_id: toId,
      type,
      data: JSON.stringify(data)
    }).catch(() => {});
  }, []);

  // --- Peer bağlantısı oluştur / kapat ---
  const closePeer = useCallback((otherId) => {
    const pc = peersRef.current[otherId];
    if (pc) {
      try { pc.close(); } catch {}
      delete peersRef.current[otherId];
    }
    delete pendingIceRef.current[otherId];
    initiatedRef.current.delete(otherId);
  }, []);

  const createPeer = useCallback((otherId) => {
    if (peersRef.current[otherId]) return peersRef.current[otherId];
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current[otherId] = pc;
    pendingIceRef.current[otherId] = [];

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => pc.addTrack(t, localStreamRef.current));
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal(otherId, 'ice', e.candidate);
    };

    // ICE bağlantı durumu izleme — koparsa yeniden bağlan
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        // Kısa bekleme sonra yeniden dene
        setTimeout(() => {
          if (peersRef.current[otherId] === pc && pc.iceConnectionState !== 'connected') {
            try { pc.restartIce(); } catch {}
            // Tekrar offer gönder
            if (userRef.current.id < otherId) {
              initiateOffer(otherId);
            }
          }
        }, 1500);
      }
    };

    pc.ontrack = (e) => {
      let audio = pc._audioEl;
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        audio.setAttribute('playsinline', 'true');
        pc._audioEl = audio;
      }
      audio.srcObject = e.streams[0];
      audio.play().catch(() => {});
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        closePeer(otherId);
        // Yeniden bağlanmayı dene
        setTimeout(() => {
          if (localStreamRef.current && participantsRef.current?.some((p) => p.user_id === otherId)) {
            initiateOffer(otherId);
          }
        }, 2000);
      }
    };

    return pc;
  }, [sendSignal, closePeer]);

  // --- Offer başlat (düşük ID'li kullanıcı başlatır) ---
  const initiateOffer = useCallback(async (otherId) => {
    if (!localStreamRef.current || !userRef.current) return;
    if (userRef.current.id >= otherId) return;
    let pc = peersRef.current[otherId];
    if (!pc || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
      pc = createPeer(otherId);
    }
    initiatedRef.current.add(otherId);
    try {
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      sendSignal(otherId, 'offer', offer);
    } catch {}
  }, [createPeer, sendSignal]);

  // --- Sinyal işleme ---
  const handleSignal = useCallback(async (s) => {
    let pc = peersRef.current[s.from_id];
    if (!pc) {
      // Karşıdan offer/answer geldiyse peer oluştur
      if (s.type === 'offer') {
        pc = createPeer(s.from_id);
      } else {
        // ice/answer ama peer yok — eski sinyal, yoksay
        return;
      }
    }

    let payload;
    try { payload = JSON.parse(s.data); } catch { return; }

    try {
      if (s.type === 'offer') {
        await pc.setRemoteDescription(payload);
        // Bekleyen ICE candidate'ları uygula
        const pending = pendingIceRef.current[s.from_id] || [];
        for (const c of pending) {
          try { await pc.addIceCandidate(c); } catch {}
        }
        pendingIceRef.current[s.from_id] = [];
        const ans = await pc.createAnswer();
        await pc.setLocalDescription(ans);
        sendSignal(s.from_id, 'answer', ans);
      } else if (s.type === 'answer') {
        if (pc.signalingState !== 'stable') {
          await pc.setRemoteDescription(payload);
          const pending = pendingIceRef.current[s.from_id] || [];
          for (const c of pending) {
            try { await pc.addIceCandidate(c); } catch {}
          }
          pendingIceRef.current[s.from_id] = [];
        }
      } else if (s.type === 'ice') {
        if (pc.remoteDescription) {
          try { await pc.addIceCandidate(payload); } catch {}
        } else {
          // Remote description henüz yok — buffer'la
          if (!pendingIceRef.current[s.from_id]) pendingIceRef.current[s.from_id] = [];
          pendingIceRef.current[s.from_id].push(payload);
        }
      }
    } catch {}
  }, [createPeer, sendSignal]);

  // Sinyal aboneliği — stabilize refs ile sabit
  useEffect(() => {
    if (!voiceEnabled || !user || !roomId) return;
    const unsub = base44.entities.VoiceSignal.subscribe((ev) => {
      if (ev.type === 'create' && ev.data?.to_id === user.id) handleSignal(ev.data);
    });
    return unsub;
  }, [voiceEnabled, user?.id, roomId, handleSignal]);

  // --- Tüm peer'lara bağlan ---
  const connectToAll = useCallback(async () => {
    if (!localStreamRef.current || !userRef.current) return;
    const others = (participantsRef.current || [])
      .map((p) => p.user_id)
      .filter((uid) => uid !== userRef.current.id);
    for (const otherId of others) {
      if (userRef.current.id < otherId) {
        await initiateOffer(otherId);
      }
    }
  }, [initiateOffer]);

  // --- Mikrofon başlat / temizle ---
  useEffect(() => {
    if (!voiceEnabled || !roomId || !user) return;
    let cancelled = false;
    setError('');
    navigator.mediaDevices?.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false })
      .then(async (stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        localStreamRef.current = stream;
        setActive(true);
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = ctx;
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        const srcNode = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.6;
        srcNode.connect(analyser);
        const buf = new Uint8Array(analyser.frequencyBinCount);
        let speakingFrames = 0;
        const tick = () => {
          analyser.getByteFrequencyData(buf);
          const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
          const isSpeaking = avg > 18 && !mutedRef.current;
          if (isSpeaking) speakingFrames++;
          else speakingFrames = 0;
          // En az 3 frame konuşma tespit edince aktif say (titreşımı azalt)
          setSpeaking(speakingFrames > 2);
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
        await connectToAll();
      })
      .catch((e) => setError(e?.message || 'Mikrofon izni reddedildi'));
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      audioCtxRef.current?.close().catch(() => {});
      Object.keys(peersRef.current).forEach((id) => closePeer(id));
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setActive(false);
      setSpeaking(false);
      base44.entities.VoiceSignal.deleteMany({ room_id: roomId, from_id: user.id }).catch(() => {});
    };
  }, [voiceEnabled, roomId, user?.id, connectToAll, closePeer]);

  // --- Katılımcı değişikliklerini izle: yeni gelenlere bağlan, ayrılanları temizle ---
  const participantIdsKey = (participants || []).map((p) => p.user_id).filter(Boolean).sort().join(',');
  useEffect(() => {
    if (!active) return;
    const currentIds = new Set((participants || []).map((p) => p.user_id).filter((uid) => uid !== user?.id));
    // Ayrılan katılımcıların peer'larını kapat
    Object.keys(peersRef.current).forEach((otherId) => {
      if (!currentIds.has(otherId)) {
        closePeer(otherId);
      }
    });
    // Yeni katılımcılara bağlan
    connectToAll();
  }, [participantIdsKey, active, connectToAll, closePeer]);

  // Speaking değişimi
  useEffect(() => { onSpeakingRef.current?.(speaking); }, [speaking]);

  // Uzaktan susturma zorunluluğu — oda sahibi/admin susturduğunda mikrofonu gerçekten kapat
  useEffect(() => {
    if (!user) return;
    const myParticipant = (participants || []).find((p) => p.user_id === user.id);
    const isRemoteMuted = !!myParticipant?.muted;
    if (isRemoteMuted !== remoteMutedRef.current) {
      remoteMutedRef.current = isRemoteMuted;
      setRemoteMuted(isRemoteMuted);
      const effectiveMuted = isRemoteMuted || mutedRef.current;
      localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !effectiveMuted));
    }
  }, [participants, user?.id]);

  const toggleMute = useCallback(() => {
    // Uzaktan susturulmuşsa kendi mikrofonunu açamaz
    if (remoteMutedRef.current) return;
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
  }, []);

  return { muted, remoteMuted, speaking, active, error, toggleMute };
}