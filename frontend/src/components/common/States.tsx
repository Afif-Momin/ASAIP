import type { ReactNode } from 'react';
import { AlertCircle, ArrowRight, Inbox, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ErrorState({ title = 'We could not load this part of the workspace', message, onRetry }: {
  title?: string; message: string; onRetry?: () => void;
}) {
  return <div role="alert" className="flex flex-col items-center rounded-xl border border-red-600/25 bg-red-50 px-6 py-10 text-center">
    <div className="mb-4 rounded-xl bg-red-100 p-3 text-danger"><AlertCircle className="h-5 w-5" /></div>
    <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
    <p className="mt-2 max-w-lg text-[14px] leading-6 text-slate-700">{message}</p>
    {onRetry && <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}><RefreshCw className="h-4 w-4" />Try again</Button>}
  </div>;
}

export function EmptyState({ icon, title, description, action }: {
  icon?: ReactNode; title: string; description: string; action?: ReactNode;
}) {
  return <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
    <div className="mb-4 rounded-xl border bg-slate-50 p-3 text-slate-500">{icon || <Inbox className="h-5 w-5" />}</div>
    <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
    <p className="mt-2 max-w-md text-[14px] leading-6 text-muted-foreground">{description}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>;
}

export function NextStep({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-1.5">{children}<ArrowRight className="h-4 w-4" /></span>;
}
