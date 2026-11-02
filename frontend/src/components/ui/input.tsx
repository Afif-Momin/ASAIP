import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const fieldStyles = 'w-full rounded-lg border border-white/[0.09] bg-[#0c111b] px-3 text-[13px] text-slate-200 shadow-sm outline-none transition placeholder:text-slate-600 hover:border-white/[0.14] focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/15 disabled:cursor-not-allowed disabled:opacity-50';

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
  label: string; hint?: string; error?: string; required?: boolean; children: React.ReactNode; className?: string;
}) {
  return (
    <label className={cn('flex flex-col gap-2', className)}>
      <span className="flex items-center justify-between gap-2 text-xs font-medium text-slate-300">
        <span>{label}{required && <span className="ml-1 text-indigo-400" aria-hidden="true">*</span>}</span>
        {hint && <span className="text-[10px] font-normal text-slate-600">{hint}</span>}
      </span>
      {children}
      {error && <span role="alert" className="text-[11px] text-rose-400">{error}</span>}
    </label>
  );
}
