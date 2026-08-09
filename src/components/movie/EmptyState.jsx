import { Image } from '@/components/ui/image';

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-4">
      {Icon && <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4"><Icon className="w-8 h-8 text-muted-foreground" /></div>}
      <h3 className="text-lg font-bold mb-1">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex gap-3 overflow-hidden px-4 sm:px-6 pb-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="w-[150px] sm:w-[180px] shrink-0 rounded-xl bg-card border border-border overflow-hidden">
          <div className="aspect-[2/3] bg-secondary animate-pulse" />
          <div className="p-2.5 space-y-2">
            <div className="h-3 bg-secondary rounded animate-pulse w-3/4" />
            <div className="h-2 bg-secondary rounded animate-pulse w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}