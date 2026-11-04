import type { ReactNode } from 'react';

export function PageHeader({ eyebrow, title, description, actions }: {
  eyebrow?: string; title: string; description: string; actions?: ReactNode;
}) {
  return <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
    <div className="max-w-3xl">
      {eyebrow && <p className="mb-1.5 text-[13px] font-medium text-primary">{eyebrow}</p>}
      <h1 className="text-balance text-[24px] font-semibold leading-tight text-foreground sm:text-[26px]">{title}</h1>
      <p className="mt-2 text-[15px] leading-6 text-muted-foreground">{description}</p>
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </header>;
}
