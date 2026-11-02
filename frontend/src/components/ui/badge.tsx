import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'default' | 'indigo' | 'cyan' | 'green' | 'amber' | 'rose' | 'violet';
const tones: Record<Tone, string> = {
  default: 'border-slate-700/70 bg-slate-800/60 text-slate-400',
  indigo: 'border-indigo-500/20 bg-indigo-500/10 text-indigo-300',
  cyan: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300',
  green: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
  amber: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
  rose: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
  violet: 'border-violet-500/20 bg-violet-500/10 text-violet-300',
};
export function Badge({ className, tone = 'default', ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium leading-4 tracking-[0.01em]', tones[tone], className)} {...props} />;
}
