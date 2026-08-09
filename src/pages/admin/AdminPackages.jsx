import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Plus, Trash2, Edit, Power } from 'lucide-react';

const empty = { name: '', price: 0, quality: 'HD', devices: 1, features: '', watch_party: false, voice_chat: false, premium_content: false, active: true, duration_days: 30 };

export default function AdminPackages() {
  const { user: admin } = useCurrentUser();
  const { toast } = useToast();
  const [pkgs, setPkgs] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const load = () => { base44.entities.Package.list(50).then(setPkgs).catch(() => {}); };
  useEffect(load, []);
  const log = async (action, target) => { await base44.entities.AdminLog.create({ admin_id: admin?.id, admin_name: admin?.username, action, target }).catch(() => {}); };

  const save = async (e) => {
    e.preventDefault();
    const data = { ...form, price: Number(form.price), devices: Number(form.devices), features: form.features.split(',').map((s) => s.trim()).filter(Boolean) };
    try {
      if (editing === 'new') { await base44.entities.Package.create(data); await log('Paket eklendi', data.name); }
      else { await base44.entities.Package.update(editing, data); await log('Paket güncellendi', data.name); }
      toast({ title: 'Kaydedildi' }); setEditing(null); load();
    } catch (err) { toast({ title: 'Hata', variant: 'destructive' }); }
  };
  const del = async () => { await base44.entities.Package.delete(confirm.id); await log('Paket silindi', confirm.name); toast({ title: 'Silindi' }); setConfirm(null); load(); };
  const toggle = async (p) => { await base44.entities.Package.update(p.id, { active: !p.active }); load(); };

  const field = "w-full bg-secondary/60 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring border border-border";

  if (editing) return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-extrabold mb-4">{editing === 'new' ? 'Yeni Paket' : 'Paket Düzenle'}</h1>
      <form onSubmit={save} className="space-y-3">
        <input className={field} placeholder="Paket adı" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <div className="grid grid-cols-2 gap-3">
          <input className={field} type="number" placeholder="Fiyat (₺)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <input className={field} type="number" placeholder="Cihaz" value={form.devices} onChange={(e) => setForm({ ...form, devices: e.target.value })} />
        </div>
        <input className={field} placeholder="Kalite (HD/Full HD/4K)" value={form.quality} onChange={(e) => setForm({ ...form, quality: e.target.value })} />
        <input className={field} placeholder="Özellikler (virgülle)" value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} />
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.watch_party} onChange={(e) => setForm({ ...form, watch_party: e.target.checked })} className="accent-primary" /> Watch Party</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.voice_chat} onChange={(e) => setForm({ ...form, voice_chat: e.target.checked })} className="accent-primary" /> Sesli Sohbet</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.premium_content} onChange={(e) => setForm({ ...form, premium_content: e.target.checked })} className="accent-primary" /> Premium</label>
        </div>
        <div className="flex gap-2"><button type="submit" className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-semibold">Kaydet</button><button type="button" onClick={() => setEditing(null)} className="bg-secondary px-5 py-2 rounded-lg text-sm">İptal</button></div>
      </form>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4"><h1 className="text-2xl font-extrabold">Paketler</h1><button onClick={() => { setForm(empty); setEditing('new'); }} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1"><Plus className="w-4 h-4" /> Ekle</button></div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {pkgs.map((p) => (
          <div key={p.id} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2"><h3 className="font-bold">{p.name}</h3><span className={`text-xs px-2 py-0.5 rounded ${p.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{p.active ? 'Aktif' : 'Pasif'}</span></div>
            <p className="text-2xl font-extrabold mb-1">₺{p.price}<span className="text-sm font-normal text-muted-foreground">/ay</span></p>
            <p className="text-xs text-muted-foreground mb-2">{p.quality} · {p.devices} cihaz</p>
            <ul className="text-sm space-y-1 mb-3">{p.features?.map((f) => <li key={f} className="flex items-center gap-1">✓ {f}</li>)}{p.watch_party && <li>✓ Watch Party</li>}{p.voice_chat && <li>✓ Sesli Sohbet</li>}</ul>
            <div className="flex gap-1">
              <button onClick={() => { setForm({ ...p, features: (p.features || []).join(', ') }); setEditing(p.id); }} className="flex-1 p-1.5 rounded bg-secondary text-xs flex items-center justify-center gap-1"><Edit className="w-3 h-3" /> Düzenle</button>
              <button onClick={() => toggle(p)} className="p-1.5 rounded bg-secondary"><Power className="w-4 h-4" /></button>
              <button onClick={() => setConfirm(p)} className="p-1.5 rounded bg-red-500/20 text-red-400"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
      <ConfirmDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)} title="Paketi sil?" description={`${confirm?.name} silinecek.`} onConfirm={del} />
    </div>
  );
}