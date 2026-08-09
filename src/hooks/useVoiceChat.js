import { useEffect, useRef, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

/**
 * Gerçek zamanlı WebRTC sesli sohbet (mesh network).
 * Sinyalleme VoiceSignal entity'si üzerinden yapılır.
 */
export function useVoiceChat({ roomId, user, participants, voiceEnabled }) {
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [active, setActive] = useState(false);
  const [error, setError] = useState('');
  const localStreamRef = useRef(null);
  const peersRef = useRef({});
  const initiatedRef = useRef(new Set());
  const mutedRef = useRef(false);
  const audioCtxRef = useRef(null);
  const rafRef = useRef(null);
  const participantsRef = useRef(participants);
  participantsRef.current = participants;

  const sendSignal = useCallback((toId, type, data) => {
    base44.entities.VoiceSignal.create({
      room_id: roomId,
      from_id: user.id,
      to_id: toId,
      type,
      data: JSON.stringify(data)
    }).catch(() => {});
  }, [roomId, user?.id]);

  const createPeer = useCallback((otherId) => {
    if (peersRef.current[otherId]) return peersRef.current[otherId];
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current[otherId] = pc;
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => pc.addTrack(t, localStreamRef.current));
    }
    pc.onicecandidate = (e) => { if (e.candidate) sendSignal(otherId, 'ice', e.candidate); };
    pc.ontrack = (e) => {
      const audio = new Audio();
      audio.srcObject = e.streams[0];
      audio.autoplay = true;
      audio.setAttribute('playsinline', 'true');
      audio.play().catch(() => {});
    };
    return pc;
  }, [sendSignal]);

  const startCall = useCallback(async () => {
    if (!localStreamRef.current || !user) return;
    const others = (participantsRef.current || []).map((p) => p.user_id).filter((uid) => uid !== user.id);
    for (const otherId of others) {
      if (user.id < otherId && !initiatedRef.current.has(otherId)) {
        initiatedRef.current.add(otherId);
        const pc = createPeer(otherId);
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendSignal(otherId, 'offer', offer);
        } catch {}
      }
    }
  }, [user, createPeer, sendSignal]);

  const handleSignal = useCallback(async (s) => {
    const pc = peersRef.current[s.from_id] || createPeer(s.from_id);
    let payload;
    try { payload = JSON.parse(s.data); } catch { return; }
    try {
      if (s.type === 'offer') {
        await pc.setRemoteDescription(payload);
        const ans = await pc.createAnswer();
        await pc.setLocalDescription(ans);
        sendSignal(s.from_id, 'answer', ans);
      } else if (s.type === 'answer') {
        await pc.setRemoteDescription(payload);
      } else if (s.type === 'ice') {
        await pc.addIceCandidate(payload);
      }
    } catch {}
  }, [createPeer, sendSignal]);

  // Sinyal aboneliği
  useEffect(() => {
    if (!voiceEnabled || !user || !roomId) return;
    const unsub = base44.entities.VoiceSignal.subscribe((ev) => {
      if (ev.type === 'create' && ev.data?.to_id === user.id) handleSignal(ev.data);
    });
    return unsub;
  }, [voiceEnabled, user?.id, roomId, handleSignal]);

  // Mikrofon başlat / temizle
  useEffect(() => {
    if (!voiceEnabled || !roomId || !user) return;
    let cancelled = false;
    setError('');
    navigator.mediaDevices?.getUserMedia({ audio: true, video: false })
      .then(async (stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        localStreamRef.current = stream;
        setActive(true);
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = ctx;
        const srcNode = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        srcNode.connect(analyser);
        const buf = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(buf);
          const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
          setSpeaking(avg > 18 && !mutedRef.current);
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
        await startCall();
      })
      .catch((e) => setError(e?.message || 'Mikrofon izni reddedildi'));
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      audioCtxRef.current?.close().catch(() => {});
      Object.values(peersRef.current).forEach((pc) => { try { pc.close(); } catch {} });
      peersRef.current = {};
      initiatedRef.current.clear();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setActive(false);
      setSpeaking(false);
      base44.entities.VoiceSignal.deleteMany({ room_id: roomId, from_id: user.id }).catch(() => {});
    };
  }, [voiceEnabled, roomId, user?.id]);

  // Yeni katılımcılar geldiğinde bağlan
  useEffect(() => {
    if (active) startCall();
  }, [participants, active]);

  const toggleMute = useCallback(() => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
  }, []);

  return { muted, speaking, active, error, toggleMute };
}