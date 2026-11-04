import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastTone = 'success' | 'error' | 'info';
interface Toast { id: number; message: string; tone: ToastTone }
interface ToastContextValue { toast: (message: string, tone?: ToastTone) => void }
const ToastContext = createContext<ToastContextValue | null>(null);
let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => setToasts((items) => items.filter((item) => item.id !== id)), []);
  const toast = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = ++nextId;
    setToasts((items) => [...items.slice(-3), { id, message, tone }]);
    window.setTimeout(() => dismiss(id), tone === 'error' ? 7000 : 4200);
  }, [dismiss]);
  const value = useMemo(() => ({ toast }), [toast]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2" aria-live="polite" aria-atomic="false">
        {toasts.map((item) => {
          const Icon = item.tone === 'success' ? CheckCircle2 : item.tone === 'error' ? CircleAlert : Info;
          return <div key={item.id} className={cn('pointer-events-auto flex items-start gap-3 rounded-xl border bg-card p-3.5 text-[14px] text-foreground shadow-raised animate-slide-in', item.tone === 'success' ? 'border-emerald-600/30' : item.tone === 'error' ? 'border-red-600/30' : 'border-primary/30')} role={item.tone === 'error' ? 'alert' : 'status'}>
            <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', item.tone === 'success' ? 'text-success' : item.tone === 'error' ? 'text-danger' : 'text-primary')} />
            <p className="flex-1 leading-6">{item.message}</p>
            <button onClick={() => dismiss(item.id)} className="rounded p-0.5 text-slate-500 hover:bg-slate-100 hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary" aria-label="Dismiss notification"><X className="h-3.5 w-3.5" /></button>
          </div>;
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
