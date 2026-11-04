import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const fieldStyles = 'w-full rounded-lg border border-slate-300 bg-white px-3 text-[14px] text-foreground shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(fieldStyles, 'h-10', className)} {...props} />
));
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(fieldStyles, 'min-h-28 resize-y py-2.5 leading-6', className)} {...props} />
));
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select ref={ref} className={cn(fieldStyles, 'h-10 appearance-none pr-9', className)} {...props}>{children}</select>
    <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-500" aria-hidden="true" />
  </div>
));
Select.displayName = 'Select';

export function Field({ label, hint, error, required, children, className }: {
  label: string; hint?: string; error?: string; required?: boolean; children: ReactNode; className?: string;
}) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="field-label">
          {label}
          {required && <span className="ml-1 text-[12px] font-normal text-muted-foreground">(required)</span>}
        </span>
        {hint && <span className="text-[12px] text-muted-foreground">{hint}</span>}
      </span>
      {children}
      {error && <span role="alert" className="text-[13px] text-danger">{error}</span>}
    </label>
  );
}
