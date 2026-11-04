import type { ReactNode } from 'react';
import { Check, CircleAlert, Lightbulb, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DataList({ items, tone = 'default', empty = 'Nothing was identified for this section.' }: {
  items: string[]; tone?: 'default' | 'positive' | 'warning' | 'danger'; empty?: string;
}) {
  if (!items?.length) return <p className="text-sm italic text-muted-foreground">{empty}</p>;
  const Icon = tone === 'positive' ? Check : tone === 'warning' ? Lightbulb : tone === 'danger' ? ShieldAlert : CircleAlert;
  return <ul className="space-y-2.5">{items.map((item, index) => <li key={`${index}-${item}`} className="flex items-start gap-2.5">
    <Icon className={cn('mt-1 h-4 w-4 shrink-0', tone === 'positive' ? 'text-success' : tone === 'warning' ? 'text-warning' : tone === 'danger' ? 'text-danger' : 'text-primary')} />
    <span className="text-[14px] leading-6 text-slate-700">{item}</span>
  </li>)}</ul>;
}

export function MetricCard({ label, value, detail, icon }: { label: string; value: ReactNode; detail?: string; icon?: ReactNode }) {
  return <div className="rounded-xl border bg-card p-4 shadow-card">
    <div className="flex items-center justify-between gap-3"><p className="text-[13px] font-medium text-muted-foreground">{label}</p>{icon && <span className="text-slate-400">{icon}</span>}</div>
    <div className="stat-value mt-2.5">{value}</div>
    {detail && <p className="mt-1.5 text-[13px] leading-5 text-muted-foreground">{detail}</p>}
  </div>;
}

export function ScoreRing({ value, label, size = 'md', tone = 'indigo' }: {
  value: number; label?: string; size?: 'sm' | 'md' | 'lg'; tone?: 'indigo' | 'risk';
}) {
  const dimensions = size === 'lg' ? 'h-36 w-36' : size === 'sm' ? 'h-16 w-16' : 'h-24 w-24';
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const color = tone === 'risk' ? value >= 70 ? '#b91c1c' : value >= 40 ? '#b45309' : '#047857' : '#276582';
  return <div className={cn('relative shrink-0', dimensions)} role="img" aria-label={`${label || 'Score'}: ${value}`}>
    <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90"><circle cx="50" cy="50" r={radius} fill="none" stroke="#e6e2da" strokeWidth="7" /><circle cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - Math.max(0, Math.min(100, value)) / 100)} /></svg>
    <div className="absolute inset-0 flex flex-col items-center justify-center"><span className={cn('font-semibold text-foreground', size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-base' : 'text-xl')}>{Math.round(value)}</span>{label && <span className="mt-0.5 text-[12px] text-muted-foreground">{label}</span>}</div>
  </div>;
}
