import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Send, X, Smile, Trash2, MessageSquareOff } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';

const EMOJIS = ['😀', '😂', '😍', '🔥', '👍', '👏', '😱', '😢', '🎬', '🍿', '❤️', '🎉'];

export default function ChatOverlay({ roomId, chatEnabled, isOwner, onClose }) {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  const load = () => {
    base44.entities.RoomMessage.filter({ room_id: roomId }, 'created_date', 200)
      .then((r) => { setMessages(r); setLoading(false); requestAnimationFrame(scrollToBottom); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const unsub = base44.entities.RoomMessage.subscribe((ev) => {
      if (ev.type === 'create') {
        setMessages((prev) => prev.some((m) => m.id === ev.data.id) ? prev : [...prev, ev.data]);
        setTimeout(scrollToBottom, 50);
      }
    });
    return unsub;
  }, [roomId]);

  const send = (e) => {
    e?.preventDefault();
    if (!text.trim() || !user) return;
    base44.functions.invoke('send-room-message', { room_id: roomId, text: text.trim() }).catch((err) => toast({ title: 'Mesaj gönderilemedi', description: err.response?.data?.error || err.message, variant: 'destructive' }));
    setText(''); setShowEmoji(false);
  };

  const del = async (id) => {
    try { await base44.entities.RoomMessage.delete(id); setMessages((p) => p.filter((m) => m.id !== id)); }
    catch (err) { toast({ title: 'Silinemedi', variant: 'destructive' }); }
  };

  const clearAll = async () => {
    if (!confirm('Sohbetin tüm mesajlarını silmek istediğinize emin misiniz?')) return;
    try { await base44.functions.invoke('clear-room-messages', { room_id: roomId }); setMessages([]); toast({ title: 'Tüm mesajlar silindi' }); }
    catch (err) { toast({ title: 'Silinemedi', description: err.response?.data?.error || err.message, variant: 'destructive' }); }
  };

  if (!chatEnabled) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
        <MessageSquareOff className="w-10 h-10 mb-3" />
        <p className="font-semibold">Sohbet kapalı</p>
        <p className="text-sm">Oda sahibi sohbeti kapatmış.</p>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col bg-card/95 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border gap-2">
        <h3 className="font-bold flex items-center gap-2">💬 Sohbet <span className="text-xs text-muted-foreground font-normal">({messages.length})</span></h3>
        <div className="flex items-center gap-1.5">
          {isOwner && <button onClick={clearAll} className="px-2 py-1 rounded-lg bg-destructive/20 text-destructive text-xs font-semibold">TÜMÜNÜ SİL</button>}
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary"><X className="w-5 h-5" /></button>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
        {loading ? <p className="text-center text-sm text-muted-foreground py-8">Yükleniyor...</p> :
         messages.length === 0 ? <p className="text-center text-sm text-muted-foreground py-8">Henüz mesaj yok. İlk mesajı sen at! 🍿</p> :
         messages.map((m) => (
           <div key={m.id} className={`flex gap-2 group ${m.type === 'system' ? 'justify-center' : ''}`}>
             {m.type === 'system' ? (
               <span className="text-xs text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">{m.text}</span>
             ) : (
               <>
                 <Link to={`/kullanici/${m.user_id}`} className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent shrink-0 flex items-center justify-center text-xs font-bold">{(m.user_name || '?')[0]}</Link>
                 <div className="min-w-0 flex-1">
                   <div className="flex items-center gap-2">
                     <Link to={`/kullanici/${m.user_id}`} className="text-xs font-semibold truncate hover:underline">{m.user_name}{user?.id === m.user_id && ' (Sen)'}</Link>
                   </div>
                   <p className="text-sm break-words bg-secondary/50 rounded-lg px-2.5 py-1.5 inline-block">{m.text}</p>
                 </div>
                 {(isOwner || user?.id === m.user_id) && (
                   <button onClick={() => del(m.id)} className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive" title={isOwner && user?.id !== m.user_id ? 'Sahip: herkesten sil' : 'Sil'}><Trash2 className="w-3.5 h-3.5" /></button>
                 )}
               </>
             )}
           </div>
         ))}
         </div>
      {showEmoji && (
        <div className="px-3 py-2 border-t border-border flex flex-wrap gap-1">
          {EMOJIS.map((e) => <button key={e} onClick={() => setText((t) => t + e)} className="text-xl hover:bg-secondary rounded p-1">{e}</button>)}
        </div>
      )}
      <form onSubmit={send} className="p-3 border-t border-border flex items-center gap-2">
        <button type="button" onClick={() => setShowEmoji(!showEmoji)} className="p-2 rounded-lg hover:bg-secondary"><Smile className="w-5 h-5" /></button>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Mesaj yazın..." className="flex-1 bg-secondary/60 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <button type="submit" disabled={!text.trim()} className="p-2.5 rounded-full bg-primary text-primary-foreground disabled:opacity-50"><Send className="w-4 h-4" /></button>
      </form>
    </div>
  );
}