import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import MovieCard from '@/components/movie/MovieCard';
import EmptyState, { SkeletonRow } from '@/components/movie/EmptyState';
import { Film } from 'lucide-react';

export default function Browse({ type, title }) {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [genre, setGenre] = useState('Tümü');

  useEffect(() => {
    base44.entities.Movie.filter({ published: true, type }, '-views', 300)
      .then((r) => { setMovies(r); setLoading(false); })
      .catch(() => setLoading(false));
  }, [type]);

  const genres = ['Tümü', ...new Set(movies.flatMap((m) => m.genres || []))];
  const filtered = genre === 'Tümü' ? movies : movies.filter((m) => m.genres?.includes(genre));

  return (
    <div className="px-4 sm:px-6 py-6">
      <h1 className="text-2xl sm:text-3xl font-extrabold mb-4">{title}</h1>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 mb-4">
        {genres.map((g) => (
          <button key={g} onClick={() => setGenre(g)} className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${genre === g ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>{g}</button>
        ))}
      </div>
      {loading ? <SkeletonRow /> :
       filtered.length === 0 ? <EmptyState icon={Film} title="İçerik bulunamadı" description="Bu kategoride henüz içerik yok." /> :
       <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
         {filtered.map((m) => <div key={m.id} className="w-full"><MovieCard movie={m} /></div>)}
       </div>}
    </div>
  );
}