import type { ReactNode } from 'react';
import { AlertCircle, ArrowRight, Inbox, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ErrorState({ title = 'Unable to load this workspace', message, onRetry }: {
  title?: string; message: string; onRetry?: () => void;
}) {
  return <div role="alert" className="flex flex-col items-center rounded-xl border border-rose-500/15 bg-rose-500/[0.035] px-6 py-10 text-center">
    <div className="mb-4 rounded-xl bg-rose-500/10 p-3 text-rose-400"><AlertCircle className="h-5 w-5" /></div>
    <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
    <p className="mt-2 max-w-lg text-xs leading-5 text-slate-500">{message}</p>
    {onRetry && <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}><RefreshCw className="h-3.5 w-3.5" />Try again</Button>}
  </div>;
}

export function EmptyState({ icon, title, description, action }: {
  icon?: ReactNode; title: string; description: string; action?: ReactNode;
}) {
  return <div className="flex flex-col items-center rounded-xl border border-dashed border-white/[0.1] bg-white/[0.012] px-6 py-12 text-center">
    <div className="mb-4 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 text-slate-500">{icon || <Inbox className="h-5 w-5" />}</div>
    <h3 className="text-sm font-semibold text-slate-300">{title}</h3>
    <p className="mt-2 max-w-md text-xs leading-5 text-slate-500">{description}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>;
}

export function NextStep({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-1.5">{children}<ArrowRight className="h-3.5 w-3.5" /></span>;
}
