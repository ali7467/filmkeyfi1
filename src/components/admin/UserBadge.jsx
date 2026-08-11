import { Link } from 'react-router-dom';
import { Image } from '@/components/ui/image';
import { Copy, Crown } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function UserBadge({ userId, name, avatar, memberId, size = 'sm', showCopy = true, isOwner = false, className = '' }) {
  const { toast } = useToast();
  const copy = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (memberId && memberId !== '-') {
      navigator.clipboard?.writeText(memberId);
      toast({ title: 'Üye No kopyalandı', description: `#${memberId}` });
    }
  };
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-14 h-14 text-xl' };
  return (
    <Link to={userId ? `/kullanici/${userId}` : '#'} className={`inline-flex items-center gap-2 min-w-0 group hover:opacity-90 ${className}`}>
      {avatar ? <Image src={avatar} className={`${sizes[size]} rounded-full object-cover shrink-0`} fittingType="fill" /> : <span className={`${sizes[size]} rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold shrink-0`}>{(name || '?')[0]}</span>}
      <div className="min-w-0">
        <p className="font-medium text-sm truncate inline-flex items-center gap-1">{name}{isOwner && <Crown className="w-3 h-3 text-amber-400" />}</p>
        {memberId && memberId !== '-' && <div className="flex items-center gap-1"><span className="text-xs text-muted-foreground">#{memberId}</span>{showCopy && <button onClick={copy} className="text-muted-foreground hover:text-primary shrink-0" title="Üye No kopyala"><Copy className="w-3 h-3" /></button>}</div>}
      </div>
    </Link>
  );
}