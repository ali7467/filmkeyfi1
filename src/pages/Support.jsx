import { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { MessageCircle, Send, Paperclip, Headset } from 'lucide-react';

const CATS = ['Genel', 'Teknik Sorun', 'Üyelik', 'Ödeme', 'İçerik Talebi', 'Diğer'];

export default function Support() {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [tickets, setTickets] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ subject: '', category: 'Genel', message: '' });
  const endRef = useRef(null);

  const load = () => {
    if (!user) return;
    base44.entities.SupportTicket.filter({ user_id: user.id }, '-created_date', 50).then(async (t) => {
      setTickets(t);
      if (t.length > 0 && !active) setActive(t[0]);
    }).catch(() => {});
  };
  useEffect(load, [user?.id]);

  useEffect(() => {
    if (!active) return;
    const fetchMsgs = () => base44.entities.SupportMessage.filter({ ticket_id: active.id }, 'created_date', 200).then((m) => {
      setMessages(m); setTimeout(() => endRef.current?.scrollIntoView(), 50);
    }).catch(() => {});
    fetchMsgs();
    const unsub = base44.entities.SupportMessage.subscribe((ev) => {
      if (ev.type === 'create' && ev.data?.ticket_id === active.id) {
        setMessages((p) => p.some((m) => m.id === ev.data.id) ? p : [...p, ev.data]);
        setTimeout(() => endRef.current?.scrollIntoView(), 50);
      }
      if (ev.type === 'delete' && ev.data?.ticket_id === active.id) {
        setMessages((p) => p.filter((m) => m.id !== ev.data.id));
      }
    });
    // Admin kapatma/silme işlemlerini yakalamak için polling
    const interval = setInterval(() => {
      base44.entities.SupportTicket.get(active.id).then((t) => {
        if (t?.status === 'closed') {
          setMessages([]);
          setActive(null);
          load();
        }
      }).catch(() => {});
      fetchMsgs();
    }, 4000);
    return () => { unsub(); clearInterval(interval); };
  }, [active?.id]);

  const create = async (e) => {
    e.preventDefault();
    if (!form.subject || !form.message) return;
    try {
      const t = await base44.entities.SupportTicket.create({ user_id: user.id, user_name: user.username || user.full_name, subject: form.subject, category: form.category, status: 'new' });
      await base44.entities.SupportMessage.create({ ticket_id: t.id, owner_id: user.id, user_id: user.id, sender: 'user', text: form.message });
      await base44.entities.Notification.create({ user_id: 'admin', title: 'Yeni destek talebi', body: `${user.username}: ${form.subject}`, type: 'support' }).catch(() => {});
      setForm({ subject: '', category: 'Genel', message: '' }); setShowNew(false); setActive(t);
      load();
      toast({ title: 'Destek talebi oluşturuldu' });
    } catch (err) { toast({ title: 'Hata', variant: 'destructive' }); }
  };

  const send = (e) => {
    e.preventDefault();
    if (!text.trim() || !active) return;
    base44.entities.SupportMessage.create({ ticket_id: active.id, owner_id: user.id, user_id: user.id, sender: 'user', text: text.trim() }).catch(() => {});
    setText('');
  };

  const onFile = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    try { const { file_url } = await base44.integrations.Core.UploadFile({ file: f }); await base44.entities.SupportMessage.create({ ticket_id: active.id, owner_id: user.id, user_id: user.id, sender: 'user', text: 'Dosya paylaştı', file_url }); }
    catch { toast({ title: 'Yükleme hatası', variant: 'destructive' }); }
  };

  return (
    <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-extrabold flex items-center gap-2"><Headset className="w-6 h-6 text-primary" /> Destek / Sohbet</h1>
        <button onClick={() => setShowNew(!showNew)} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold">Yeni Talep</button>
      </div>

      {showNew && (
        <form onSubmit={create} className="bg-card border border-border rounded-xl p-4 space-y-3 mb-4">
          <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Konu" className="w-full bg-secondary/60 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" required />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-secondary/60 rounded-lg px-3 py-2.5 text-sm outline-none">
            {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Mesajınız..." rows={3} className="w-full bg-secondary/60 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" required />
          <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold">Gönder</button>
        </form>
      )}

      <div className="grid sm:grid-cols-[260px_1fr] gap-4 h-[calc(100vh-180px)] sm:h-[60vh]">
        <div className="overflow-y-auto space-y-2 pr-1 max-h-[25vh] sm:max-h-none">
          {tickets.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">Henüz destek konuşmanız bulunmuyor.</p> :
            tickets.map((t) => (
              <button key={t.id} onClick={() => setActive(t)} className={`w-full text-left p-3 rounded-lg border ${active?.id === t.id ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}>
                <p className="font-medium text-sm truncate">{t.subject}</p>
                <p className="text-xs text-muted-foreground">{t.category} · {t.status}</p>
              </button>
            ))}
        </div>
        <div className="flex flex-col bg-card border border-border rounded-xl overflow-hidden">
          {active ? (
            <>
              <div className="px-4 py-3 border-b border-border"><p className="font-semibold">{active.subject}</p><p className="text-xs text-muted-foreground">{active.category}</p></div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm overflow-hidden ${m.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                      {m.file_url && <img src={m.file_url} alt="foto" className="rounded-lg max-w-full max-h-48 object-cover mb-1" />}
                      {m.text && m.text !== 'Dosya paylaştı' && m.text !== '📷 Fotoğraf' && <p>{m.text}</p>}
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <form onSubmit={send} className="p-3 border-t border-border flex items-center gap-2">
                <label className="p-2 rounded-lg hover:bg-secondary cursor-pointer"><Paperclip className="w-5 h-5" /><input type="file" className="hidden" onChange={onFile} /></label>
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Mesaj yazın..." className="flex-1 bg-secondary/60 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                <button type="submit" className="p-2.5 rounded-full bg-primary text-primary-foreground"><Send className="w-4 h-4" /></button>
              </form>
            </>
          ) : <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm"><MessageCircle className="w-8 h-8 mb-2" /><p>Bir konuşma seçin veya yeni talep oluşturun.</p></div>}
        </div>
      </div>
    </div>
  );
}