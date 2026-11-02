import type { ReactNode } from 'react';
import { Check, CircleAlert, Lightbulb, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DataList({ items, tone = 'default', empty = 'No items identified.' }: {
  items: string[]; tone?: 'default' | 'positive' | 'warning' | 'danger'; empty?: string;
}) {
  if (!items?.length) return <p className="text-xs italic text-slate-600">{empty}</p>;
  const Icon = tone === 'positive' ? Check : tone === 'warning' ? Lightbulb : tone === 'danger' ? ShieldAlert : CircleAlert;
  return <ul className="space-y-2.5">{items.map((item, index) => <li key={`${index}-${item}`} className="flex items-start gap-2.5 text-xs leading-5 text-slate-400">
    <Icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', tone === 'positive' ? 'text-emerald-500' : tone === 'warning' ? 'text-amber-500' : tone === 'danger' ? 'text-rose-500' : 'text-indigo-400')} />
    <span>{item}</span>
  </li>)}</ul>;
}

export function MetricCard({ label, value, detail, icon }: { label: string; value: ReactNode; detail?: string; icon?: ReactNode }) {
  return <div className="rounded-xl border border-white/[0.075] bg-card p-4 shadow-card">
    <div className="flex items-center justify-between gap-3"><p className="text-[11px] font-medium text-slate-500">{label}</p>{icon && <span className="text-slate-600">{icon}</span>}</div>
    <div className="metric-value mt-3">{value}</div>
    {detail && <p className="mt-1.5 text-[10px] leading-4 text-slate-600">{detail}</p>}
  </div>;
}

export function ScoreRing({ value, label, size = 'md', tone = 'indigo' }: {
  value: number; label?: string; size?: 'sm' | 'md' | 'lg'; tone?: 'indigo' | 'risk';
}) {
  const dimensions = size === 'lg' ? 'h-36 w-36' : size === 'sm' ? 'h-16 w-16' : 'h-24 w-24';
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const color = tone === 'risk' ? value >= 70 ? '#fb7185' : value >= 40 ? '#fbbf24' : '#34d399' : '#818cf8';
  return <div className={cn('relative shrink-0', dimensions)} role="img" aria-label={`${label || 'Score'}: ${value}`}>
    <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90"><circle cx="50" cy="50" r={radius} fill="none" stroke="#1e293b" strokeWidth="7" /><circle cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - Math.max(0, Math.min(100, value)) / 100)} /></svg>
    <div className="absolute inset-0 flex flex-col items-center justify-center"><span className={cn('font-display font-semibold tracking-tight text-slate-100', size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-sm' : 'text-xl')}>{Math.round(value)}</span>{label && <span className="mt-0.5 text-[9px] uppercase tracking-wider text-slate-500">{label}</span>}</div>
  </div>;
}
