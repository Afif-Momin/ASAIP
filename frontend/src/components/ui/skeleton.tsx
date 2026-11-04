import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse-soft rounded-lg bg-slate-200', className)} aria-hidden="true" />;
}

export function PageSkeleton() {
  return <div className="space-y-6" role="status" aria-label="Loading content">
    <div className="space-y-3"><Skeleton className="h-4 w-28" /><Skeleton className="h-8 w-72" /><Skeleton className="h-5 w-full max-w-lg" /></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1,2,3,4].map((item) => <Skeleton key={item} className="h-32" />)}</div>
    <Skeleton className="h-72" />
  </div>;
}

export function InlineLoader({ label = 'Loading…' }: { label?: string }) {
  return <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-muted-foreground" role="status"><span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-primary" />{label}</div>;
}
