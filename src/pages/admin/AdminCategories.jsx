import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Trash2, Plus } from 'lucide-react';

export default function AdminCategories() {
  const { user: admin } = useCurrentUser();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const [name, setName] = useState('');

  const load = () => { base44.entities.Category.list(100).then(setItems).catch(() => {}); };
  useEffect(load, []);
  const add = async (e) => { e.preventDefault(); if (!name.trim()) return; await base44.entities.Category.create({ name: name.trim(), slug: name.trim().toLowerCase() }); setName(''); load(); };
  const del = async () => { await base44.entities.Category.delete(confirm.id); toast({ title: 'Silindi' }); setConfirm(null); load(); };

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-4">Kategoriler</h1>
      <form onSubmit={add} className="flex gap-2 mb-4"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Kategori adı" className="flex-1 bg-secondary/60 rounded-lg px-3 py-2 text-sm outline-none border border-border" /><button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1"><Plus className="w-4 h-4" /> Ekle</button></form>
      <div className="grid sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {items.map((c) => <div key={c.id} className="bg-card border border-border rounded-lg p-3 flex justify-between items-center"><span className="text-sm font-medium">{c.name}</span><button onClick={() => setConfirm(c)} className="p-1.5 rounded bg-red-500/20 text-red-400"><Trash2 className="w-4 h-4" /></button></div>)}
      </div>
      <ConfirmDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)} title="Kategoriyi sil?" onConfirm={del} />
    </div>
  );
}