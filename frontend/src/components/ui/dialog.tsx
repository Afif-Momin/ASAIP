import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export function Dialog({ open, onClose, title, description, children, className }: {
  open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab' && ref.current) {
        const focusable = ref.current.querySelectorAll<HTMLElement>('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => ref.current?.querySelector<HTMLElement>('input, button')?.focus(), 20);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previous?.focus();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="presentation">
      <button className="absolute inset-0 cursor-default bg-slate-900/40 animate-fade-in" onClick={onClose} aria-label="Close dialog" />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="dialog-title" className={cn('relative w-full max-w-md animate-fade-up rounded-xl border bg-card p-5 shadow-raised', className)}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="dialog-title" className="text-[17px] font-semibold text-foreground">{title}</h2>
            {description && <p className="mt-1.5 text-[14px] leading-6 text-muted-foreground">{description}</p>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close"><X className="h-4 w-4" /></Button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
