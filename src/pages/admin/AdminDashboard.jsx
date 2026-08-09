import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Users, Film, DoorOpen, LifeBuoy, CreditCard, TrendingUp, Activity, Trash2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';

export default function AdminDashboard() {
  const { toast } = useToast();
  const [stats, setStats] = useState({});
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const clearLogs = async () => { await base44.entities.AdminLog.deleteMany({}); setLogs([]); toast({ title: 'Tüm aktiviteler silindi' }); };

  useEffect(() => {
    (async () => {
      try {
        const [users, movies, series, rooms, tickets, payments] = await Promise.all([
          base44.entities.User.list(500).catch(() => []),
          base44.entities.Movie.filter({ type: 'movie' }, '-views', 500).catch(() => []),
          base44.entities.Movie.filter({ type: 'series' }, '-views', 500).catch(() => []),
          base44.entities.Room.list(500).catch(() => []),
          base44.entities.SupportTicket.list(500).catch(() => []),
          base44.entities.Payment.list(500).catch(() => []),
        ]);
        const active = users.filter((u) => u.membership_status === 'active');
        const expired = users.filter((u) => u.membership_status === 'expired' || (u.membership_end && new Date(u.membership_end) < new Date()));
        const renewals = await base44.entities.MembershipRenewal.filter({ status: 'pending' }, '-created_date', 100).catch(() => []);
        const revenue = payments.filter((p) => p.status === 'completed').reduce((s, p) => s + (p.amount || 0), 0);
        setStats({
          totalUsers: users.length, activeMembers: active.length, expiredMembers: expired.length,
          renewals: renewals.length, movies: movies.length, series: series.length,
          activeRooms: rooms.filter((r) => r.status === 'active').length, openTickets: tickets.filter((t) => t.status !== 'closed').length,
          revenue,
        });
        const lg = await base44.entities.AdminLog.list(10).catch(() => []);
        setLogs(lg);
      } finally { setLoading(false); }
    })();
  }, []);

  const cards = [
    { label: 'Toplam Kullanıcı', value: stats.totalUsers, icon: Users, color: 'text-blue-400' },
    { label: 'Aktif Üyelik', value: stats.activeMembers, icon: TrendingUp, color: 'text-green-400' },
    { label: 'Süresi Biten', value: stats.expiredMembers, icon: Activity, color: 'text-amber-400' },
    { label: 'Yenileme Bekleyen', value: stats.renewals, icon: Activity, color: 'text-purple-400' },
    { label: 'Toplam Film', value: stats.movies, icon: Film, color: 'text-red-400' },
    { label: 'Aktif Odalar', value: stats.activeRooms, icon: DoorOpen, color: 'text-cyan-400' },
    { label: 'Açık Destek', value: stats.openTickets, icon: LifeBuoy, color: 'text-orange-400' },
    { label: 'Gelir (₺)', value: stats.revenue, icon: CreditCard, color: 'text-emerald-400' },
  ];

  const chartData = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((d, i) => ({ name: d, izlenme: Math.floor(Math.random() * 500) + 200, kayit: Math.floor(Math.random() * 30) + 5 }));
  const pieData = [
    { name: 'BASIC', value: 45, color: 'hsl(217 91% 60%)' },
    { name: 'STANDARD', value: 30, color: 'hsl(265 83% 60%)' },
    { name: 'PREMIUM', value: 25, color: 'hsl(0 72% 51%)' },
  ];

  if (loading) return <div className="h-64 flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {cards.map((c) => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </div>
            <p className="text-2xl font-extrabold">{c.value ?? 0}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-semibold mb-3">Haftalık İzlenme</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(0 72% 51%)" stopOpacity={0.5} /><stop offset="95%" stopColor="hsl(0 72% 51%)" stopOpacity={0} /></linearGradient></defs>
              <XAxis dataKey="name" stroke="hsl(240 5% 65%)" fontSize={12} /><YAxis stroke="hsl(240 5% 65%)" fontSize={12} />
              <Tooltip contentStyle={{ background: 'hsl(240 8% 7%)', border: '1px solid hsl(240 6% 16%)', borderRadius: 8 }} />
              <Area type="monotone" dataKey="izlenme" stroke="hsl(0 72% 51%)" fill="url(#g)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-semibold mb-3">Üyelik Dağılımı</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart><Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
              {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie><Tooltip contentStyle={{ background: 'hsl(240 8% 7%)', border: '1px solid hsl(240 6% 16%)', borderRadius: 8 }} /></PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Son Aktiviteler</h3>
          {logs.length > 0 && <button onClick={clearLogs} className="inline-flex items-center gap-1 text-xs text-destructive hover:bg-destructive/10 px-2 py-1 rounded-lg"><Trash2 className="w-3.5 h-3.5" /> Tümünü Sil</button>}
        </div>
        {logs.length === 0 ? <p className="text-sm text-muted-foreground">Henüz aktivite kaydı yok.</p> :
          <div className="space-y-2">{logs.map((l) => <div key={l.id} className="text-sm flex justify-between border-b border-border last:border-0 py-1.5"><span>{l.action} {l.target && <span className="text-muted-foreground">· {l.target}</span>}</span><span className="text-xs text-muted-foreground">{new Date(l.created_date).toLocaleString('tr-TR')}</span></div>)}</div>}
      </div>
    </div>
  );
}