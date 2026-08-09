import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Check, X, Ban, Trash2, KeyRound, Eye } from 'lucide-react';

export default function AdminUsers({ pendingOnly = false }) {
  const { user: admin } = useCurrentUser();
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [detail, setDetail] = useState(null);

  const load = () => {
    base44.entities.User.list(500).then((u) => {
      setUsers(pendingOnly ? u.filter((x) => x.membership_status === 'pending') : u);
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(load, []);

  const log = async (action, target) => { await base44.entities.AdminLog.create({ admin_id: admin?.id, admin_name: admin?.username || admin?.full_name, action, target }).catch(() => {}); };
  const notify = async (uid, title, body) => { await base44.entities.Notification.create({ user_id: uid, title, body, type: 'info' }).catch(() => {}); };

  const approve = async (u) => {
    const start = new Date(); const end = new Date(); end.setDate(end.getDate() + 30);
    await base44.asServiceRole.entities.User.update(u.id, { membership_status: 'active', membership_start: start.toISOString(), membership_end: end.toISOString() });
    await notify(u.id, 'Üyeliğiniz onaylandı', 'Premium içeriklere erişebilirsiniz.');
    await log('Üyelik onaylandı', u.email);
    toast({ title: 'Onaylandı' }); load();
  };
  const reject = async (u) => {
    await base44.asServiceRole.entities.User.update(u.id, { membership_status: 'blocked' });
    await notify(u.id, 'Üyelik talebi reddedildi', 'Lütfen destek ile iletişime geçin.');
    await log('Üyelik reddedildi', u.email);
    toast({ title: 'Reddedildi' }); load();
  };
  const block = async (u) => { await base44.asServiceRole.entities.User.update(u.id, { membership_status: 'blocked' }); await log('Kullanıcı engellendi', u.email); toast({ title: 'Engellendi' }); load(); };
  const activate = async (u) => { await base44.asServiceRole.entities.User.update(u.id, { membership_status: 'active' }); await log('Kullanıcı aktif edildi', u.email); toast({ title: 'Aktif edildi' }); load(); };
  const resetPass = async (u) => { await notify(u.id, 'Şifre sıfırlama', 'Şifrenizi sıfırlamak için giriş sayfasındaki "Şifremi Unuttum" bağlantısını kullanın.'); await log('Şifre sıfırlama isteği', u.email); toast({ title: 'Sıfırlama bağlantısı gönderildi' }); };
  const del = async (u) => { await base44.asServiceRole.entities.User.delete(u.id); await log('Kullanıcı silindi', u.email); toast({ title: 'Silindi' }); setConfirm(null); load(); };
  const extend = async (u) => { const end = new Date(u.membership_end || new Date()); end.setDate(end.getDate() + 30); await base44.asServiceRole.entities.User.update(u.id, { membership_end: end.toISOString() }); await notify(u.id, 'Üyeliğiniz uzatıldı', '30 gün eklendi.'); await log('Üyelik uzatıldı', u.email); toast({ title: '30 gün uzatıldı' }); load(); };

  if (loading) return <p className="text-muted-foreground">Yükleniyor...</p>;

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-4">{pendingOnly ? 'Kayıt Kontrol' : 'Kullanıcı Yönetimi'}</h1>
      {users.length === 0 ? <p className="text-muted-foreground text-sm">{pendingOnly ? 'Onay bekleyen kayıt yok.' : 'Kullanıcı yok.'}</p> :
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="bg-card border border-border rounded-xl p-3 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold shrink-0">{(u.username || u.full_name || '?')[0]}</div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{u.username || u.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${u.membership_status === 'active' ? 'bg-green-500/20 text-green-400' : u.membership_status === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>{u.membership_status}</span>
              <span className="text-xs text-muted-foreground">{u.membership_end ? new Date(u.membership_end).toLocaleDateString('tr-TR') : '-'}</span>
              <div className="flex gap-1 flex-wrap">
                {pendingOnly ? <>
                  <button onClick={() => approve(u)} className="p-2 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30" title="Onayla"><Check className="w-4 h-4" /></button>
                  <button onClick={() => reject(u)} className="p-2 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30" title="Reddet"><X className="w-4 h-4" /></button>
                </> : <>
                  <button onClick={() => setDetail(u)} className="p-2 rounded bg-secondary hover:bg-secondary/70" title="Detay"><Eye className="w-4 h-4" /></button>
                  {u.membership_status === 'active' ? <button onClick={() => block(u)} className="p-2 rounded bg-amber-500/20 text-amber-400" title="Engelle"><Ban className="w-4 h-4" /></button> : <button onClick={() => activate(u)} className="p-2 rounded bg-green-500/20 text-green-400" title="Aktif et"><Check className="w-4 h-4" /></button>}
                  <button onClick={() => extend(u)} className="px-2 rounded bg-blue-500/20 text-blue-400 text-xs font-bold" title="Üyelik uzat">+30</button>
                  <button onClick={() => resetPass(u)} className="p-2 rounded bg-purple-500/20 text-purple-400" title="Şifre sıfırla"><KeyRound className="w-4 h-4" /></button>
                </>}
                <button onClick={() => setConfirm(u)} className="p-2 rounded bg-red-500/20 text-red-400" title="Sil"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>}

      {detail && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-card border border-border rounded-xl p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-3">{detail.username || detail.full_name}</h3>
            <div className="space-y-1.5 text-sm">
              <p><span className="text-muted-foreground">E-posta:</span> {detail.email}</p>
              <p><span className="text-muted-foreground">Telefon:</span> {detail.phone || '-'}</p>
              <p><span className="text-muted-foreground">Rol:</span> {detail.role}</p>
              <p><span className="text-muted-foreground">Durum:</span> {detail.membership_status}</p>
              <p><span className="text-muted-foreground">Başlangıç:</span> {detail.membership_start ? new Date(detail.membership_start).toLocaleDateString('tr-TR') : '-'}</p>
              <p><span className="text-muted-foreground">Bitiş:</span> {detail.membership_end ? new Date(detail.membership_end).toLocaleDateString('tr-TR') : '-'}</p>
            </div>
            <button onClick={() => setDetail(null)} className="mt-4 bg-secondary px-4 py-2 rounded-lg text-sm w-full">Kapat</button>
          </div>
        </div>
      )}
      <ConfirmDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)} title="Kullanıcıyı sil?" description={`${confirm?.email} kalıcı olarak silinecek.`} onConfirm={() => del(confirm)} />
    </div>
  );
}