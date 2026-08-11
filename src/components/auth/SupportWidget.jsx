import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Headset, Send, X, Loader2 } from "lucide-react";

export default function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(() => localStorage.getItem("guest_name") || "");
  const [email, setEmail] = useState("");
  const [ticketId, setTicketId] = useState(() => localStorage.getItem("guest_ticket_id") || "");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);

  const needsInfo = !ticketId;

  const poll = async (tid) => {
    const id = tid || ticketId;
    if (!id) return;
    try {
      const res = await base44.functions.invoke("guest-support", { action: "poll", ticket_id: id });
      // Admin sohbeti kapattıysa → kullanıcı tarafını sıfırla
      if (res.ticket_status === "closed") {
        localStorage.removeItem("guest_ticket_id");
        setTicketId("");
        setMessages([]);
        return;
      }
      setMessages(res.messages || []);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch {}
  };

  useEffect(() => {
    if (open && ticketId) poll();
  }, [open, ticketId]);

  useEffect(() => {
    if (!open || !ticketId) return;
    const interval = setInterval(() => poll(), 4000);
    return () => clearInterval(interval);
  }, [open, ticketId]);

  const createTicket = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim() || !text.trim()) return;
    setLoading(true);
    const msgText = text.trim();
    // Optimistic mesaj — kullanıcı mesajını anında görsün
    setMessages([{ id: "temp-" + Date.now(), sender: "user", text: msgText }]);
    try {
      const res = await base44.functions.invoke("guest-support", {
        action: "create", name: name.trim(), email: email.trim(), text: msgText
      });
      localStorage.setItem("guest_ticket_id", res.ticket_id);
      localStorage.setItem("guest_name", name.trim());
      setTicketId(res.ticket_id);
      setText("");
      // ticketId state henüz güncellenmedi → direkt ID ile poll et
      poll(res.ticket_id);
    } catch (err) {
      setError("Mesaj gönderilemedi");
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || !ticketId) return;
    const msg = text.trim();
    setMessages((p) => [...p, { id: "temp-" + Date.now(), sender: "user", text: msg }]);
    setText("");
    try {
      await base44.functions.invoke("guest-support", { action: "send", ticket_id: ticketId, text: msg });
    } catch {
      setError("Mesaj gönderilemedi");
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-[#e50914] hover:bg-[#f6121d] text-white shadow-lg shadow-red-900/50 flex items-center justify-center transition-transform hover:scale-110"
        title="Canlı Destek"
      >
        {open ? <X className="w-6 h-6" /> : <Headset className="w-6 h-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-[340px] max-w-[calc(100vw-2.5rem)] bg-[#141414] border border-[#2a2a2a] rounded-2xl shadow-2xl flex flex-col" style={{ height: "440px" }}>
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#e50914] flex items-center justify-center">
              <Headset className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Canlı Destek</p>
              <p className="text-[10px] text-green-400">● Çevrimiçi</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 && needsInfo && (
              <p className="text-xs text-[#a0a0a0] text-center mt-4 px-2">
                Merhaba! Sorunuz mu var? Bilgilerinizi girin, ekibimiz size yardımcı olsun.
              </p>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.sender === "user" ? "bg-[#e50914] text-white" : "bg-[#2a2a2a] text-white"}`}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-[#2a2a2a] p-3">
            {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
            {needsInfo ? (
              <form onSubmit={createTicket} className="space-y-2">
                <input
                  value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Adınız" className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#555] outline-none focus:border-[#e50914]"
                  required
                />
                <input
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  type="email" placeholder="E-postanız" className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#555] outline-none focus:border-[#e50914]"
                  required
                />
                <textarea
                  value={text} onChange={(e) => setText(e.target.value)}
                  placeholder="Mesajınız..." rows={2} className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#555] outline-none focus:border-[#e50914] resize-none"
                  required
                />
                <button type="submit" disabled={loading} className="w-full bg-[#e50914] hover:bg-[#f6121d] text-white rounded-lg py-2 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Gönder</>}
                </button>
              </form>
            ) : (
              <form onSubmit={send} className="flex items-center gap-2">
                <input
                  value={text} onChange={(e) => setText(e.target.value)}
                  placeholder="Mesaj yazın..." className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-full px-4 py-2 text-sm text-white placeholder:text-[#555] outline-none focus:border-[#e50914]"
                />
                <button type="submit" className="p-2.5 rounded-full bg-[#e50914] text-white shrink-0">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}