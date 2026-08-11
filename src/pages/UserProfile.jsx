import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useCurrentUser, membershipActive } from '@/lib/useCurrentUser';
import { Image } from '@/components/ui/image';
import { ArrowLeft, Crown, Hash } from 'lucide-react';

export default function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: me } = useCurrentUser();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    base44.functions.invoke('user-profile', { user_id: id })
      .then((res) => setProfile(res.data))
      .catch((e) => setErr(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const isSelf = me?.id === id;

  return (
    <div className="px-4 sm:px-6 py-6 max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="w-4 h-4" /> Geri</button>
      {err ? <p className="text-center text-destructive py-10">{err}</p> : profile && (
        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center text-center">
          {profile.avatar ? <Image src={profile.avatar} className="w-28 h-28 rounded-full object-cover" fittingType="fill" /> :
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-4xl font-bold">{(profile.username || profile.full_name || '?')[0]}</div>}
          <h1 className="text-2xl font-extrabold mt-4 flex items-center gap-2">{profile.username || profile.full_name || 'Kullanıcı'} {(profile.role === 'admin' || profile.role === 'moderator') && <Crown className="w-5 h-5 text-amber-400" />}</h1>
          {profile.full_name && profile.username && <p className="text-sm text-muted-foreground">{profile.full_name}</p>}
          <div className="mt-4 inline-flex items-center gap-2 bg-secondary/60 rounded-full px-4 py-2">
            <Hash className="w-4 h-4 text-primary" />
            <span className="font-mono text-lg font-bold tracking-wider">{profile.member_id}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Üye No</p>
          {profile.created_date && <p className="text-xs text-muted-foreground mt-3">Katılım: {new Date(profile.created_date).toLocaleDateString('tr-TR')}</p>}
          {isSelf && <Link to="/profil" className="mt-5 bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-semibold">Profili Düzenle</Link>}
        </div>
      )}
    </div>
  );
}