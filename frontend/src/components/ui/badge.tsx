import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'default' | 'indigo' | 'cyan' | 'green' | 'amber' | 'rose' | 'violet';
const tones: Record<Tone, string> = {
  default: 'border-slate-300 bg-slate-100 text-slate-700',
  indigo: 'border-primary/25 bg-primary/10 text-primary',
  cyan: 'border-teal-600/25 bg-teal-50 text-teal-800',
  green: 'border-emerald-600/25 bg-emerald-50 text-emerald-800',
  amber: 'border-amber-600/25 bg-amber-50 text-amber-800',
  rose: 'border-red-600/25 bg-red-50 text-red-800',
  violet: 'border-indigo-500/25 bg-indigo-50 text-indigo-800',
};
export function Badge({ className, tone = 'default', ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium leading-5', tones[tone], className)} {...props} />;
}
