import type { ReactNode } from 'react';

export function PageHeader({ eyebrow, title, description, actions }: {
  eyebrow?: string; title: string; description: string; actions?: ReactNode;
}) {
  return <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
    <div className="max-w-3xl">
      {eyebrow && <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-400">{eyebrow}</p>}
      <h1 className="font-display text-[25px] font-semibold leading-tight tracking-[-0.035em] text-slate-100 sm:text-[28px]">{title}</h1>
      <p className="mt-2 text-[13px] leading-6 text-slate-500">{description}</p>
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </header>;
}
