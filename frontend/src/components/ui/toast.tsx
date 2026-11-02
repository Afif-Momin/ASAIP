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
          return <div key={item.id} className={cn('pointer-events-auto flex items-start gap-3 rounded-xl border bg-[#121823]/95 p-3.5 text-xs text-slate-200 shadow-2xl backdrop-blur-md animate-slide-in', item.tone === 'success' ? 'border-emerald-500/25' : item.tone === 'error' ? 'border-rose-500/25' : 'border-indigo-500/25')} role={item.tone === 'error' ? 'alert' : 'status'}>
            <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', item.tone === 'success' ? 'text-emerald-400' : item.tone === 'error' ? 'text-rose-400' : 'text-indigo-400')} />
            <p className="flex-1 leading-5">{item.message}</p>
            <button onClick={() => dismiss(item.id)} className="rounded p-0.5 text-slate-500 hover:bg-white/5 hover:text-white focus:outline-none focus:ring-1 focus:ring-indigo-400" aria-label="Dismiss notification"><X className="h-3.5 w-3.5" /></button>
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
