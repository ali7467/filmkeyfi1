import { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Send } from 'lucide-react';

export default function AdminSupport() {
  const { user: admin } = useCurrentUser();
  const { toast } = useToast();
  const [tickets, setTickets] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const endRef = useRef(null);

  const load = () => { base44.entities.SupportTicket.list(200).then((t) => { setTickets(t); if (!active && t.length) setActive(t[0]); }).catch(() => {}); };
  useEffect(load, []);
  useEffect(() => {
    if (!active) return;
    base44.entities.SupportMessage.filter({ ticket_id: active.id }, 'created_date', 200).then((m) => { setMessages(m); setTimeout(() => endRef.current?.scrollIntoView(), 50); }).catch(() => {});
    const unsub = base44.entities.SupportMessage.subscribe((ev) => { if (ev.type === 'create' && ev.data?.ticket_id === active.id) { setMessages((p) => [...p, ev.data]); setTimeout(() => endRef.current?.scrollIntoView(), 50); } });
    return unsub;
  }, [active?.id]);

  const send = (e) => {
    e.preventDefault();
    if (!text.trim() || !active) return;
    base44.entities.SupportMessage.create({ ticket_id: active.id, owner_id: active.user_id, user_id: admin.id, sender: 'admin', text: text.trim() }).catch(() => {});
    base44.entities.SupportTicket.update(active.id, { status: 'answered' }).catch(() => {});
    base44.entities.Notification.create({ user_id: active.user_id, title: 'Destek mesajınıza cevap verildi', body: active.subject, type: 'support', link: '/destek' }).catch(() => {});
    setText(''); load();
  };

  const setStatus = async (s) => { await base44.entities.SupportTicket.update(active.id, { status: s }); load(); };

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-4">Destek Mesajları</h1>
      <div className="grid sm:grid-cols-[260px_1fr] gap-4 h-[60vh]">
        <div className="overflow-y-auto space-y-2">
          {tickets.map((t) => (
            <button key={t.id} onClick={() => setActive(t)} className={`w-full text-left p-3 rounded-lg border ${active?.id === t.id ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}>
              <p className="font-medium text-sm truncate">{t.subject}</p>
              <p className="text-xs text-muted-foreground">{t.user_name} · <span className={t.status === 'new' ? 'text-amber-400' : t.status === 'answered' ? 'text-green-400' : ''}>{t.status}</span></p>
            </button>
          ))}
        </div>
        <div className="flex flex-col bg-card border border-border rounded-xl overflow-hidden">
          {active ? <>
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div><p className="font-semibold">{active.subject}</p><p className="text-xs text-muted-foreground">{active.user_name} · {active.category}</p></div>
              <select value={active.status} onChange={(e) => setStatus(e.target.value)} className="bg-secondary rounded-lg px-2 py-1 text-xs">
                <option value="new">Yeni</option><option value="reviewing">İnceleniyor</option><option value="answered">Cevaplandı</option><option value="closed">Kapatıldı</option>
              </select>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.map((m) => <div key={m.id} className={`flex ${m.sender === 'admin' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.sender === 'admin' ? 'bg-accent text-accent-foreground' : 'bg-secondary'}`}>{m.text}</div></div>)}
              <div ref={endRef} />
            </div>
            <form onSubmit={send} className="p-3 border-t border-border flex items-center gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Cevap yazın..." className="flex-1 bg-secondary/60 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              <button type="submit" className="p-2.5 rounded-full bg-primary text-primary-foreground"><Send className="w-4 h-4" /></button>
            </form>
          </> : <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Talep seçin.</div>}
        </div>
      </div>
    </div>
  );
}