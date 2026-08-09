import MovieCard from '@/components/movie/MovieCard';

export default function ContentRow({ title, movies }) {
  if (!movies?.length) return null;
  return (
    <section className="mb-8">
      <h2 className="text-lg sm:text-xl font-bold px-4 sm:px-6 mb-3">{title}</h2>
      <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 sm:px-6 pb-2">
        {movies.map((m) => <MovieCard key={m.id} movie={m} />)}
      </div>
    </section>
  );
}