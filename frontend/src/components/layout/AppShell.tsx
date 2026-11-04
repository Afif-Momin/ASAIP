import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BarChart3, ChevronRight, CircleAlert, CircleDollarSign, FileOutput, FolderKanban,
  GitCompareArrows, Layers3, Menu, Network, Plus, Route, Settings, ShieldCheck, TrendingUp, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { Select } from '@/components/ui/input';

const navigation = [
  { group: 'Your workspace', items: [
    { to: '/', label: 'Overview', icon: BarChart3, hint: 'See everything you have analysed so far.' },
    { to: '/projects/new', label: 'New project', icon: Plus, hint: 'Describe a system and get options.' },
    { to: '/projects', label: 'My projects', icon: FolderKanban, hint: 'Reopen, rename, or delete saved work.' },
  ] },
  { group: 'Analysis', items: [
    { to: '/explorer', label: 'System designs', icon: Network, hint: 'Diagrams, technology choices, and trade-offs.' },
    { to: '/comparison', label: 'Compare options', icon: GitCompareArrows, hint: 'Say what matters most and see the ranking.' },
    { to: '/critic', label: 'Design review', icon: ShieldCheck, hint: 'Find the weak points before a reviewer does.' },
    { to: '/cost', label: 'Cost estimate', icon: CircleDollarSign, hint: 'Illustrative INR running costs per option.' },
    { to: '/scalability', label: 'Growth analysis', icon: TrendingUp, hint: 'What happens at 5x and 10x the demand.' },
    { to: '/evolution', label: 'Evolution roadmap', icon: Route, hint: 'A staged path as the system grows.' },
  ] },
  { group: 'Deliverables', items: [
    { to: '/reports', label: 'Reports and exports', icon: FileOutput, hint: 'PDF, JSON, and diagram files.' },
    { to: '/settings', label: 'Settings', icon: Settings, hint: 'Backend connection and analysis engine.' },
  ] },
];
const allItems = navigation.flatMap((section) => section.items);
const pageNames: Record<string, string> = Object.fromEntries(allItems.map((item) => [item.to, item.label]));

function Brand() {
  return <NavLink to="/" className="flex h-16 items-center gap-3 px-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Layers3 className="h-5 w-5" /></span>
    <span>
      <span className="block text-[15px] font-semibold text-foreground">ASAIP</span>
      <span className="block text-[12px] text-muted-foreground">Architecture intelligence</span>
    </span>
  </NavLink>;
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { projects, error } = useApp();
  return <div className="flex h-full flex-col bg-white">
    <Brand />
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6 pt-2" aria-label="Main navigation">
      {navigation.map((section) => <div key={section.group}>
        <h2 className="mb-1.5 px-3 text-[13px] font-semibold text-muted-foreground">{section.group}</h2>
        <ul className="space-y-0.5">{section.items.map((item) => <li key={item.to}>
          <NavLink to={item.to} end={item.to === '/'} onClick={onNavigate} title={item.hint} className={({ isActive }) => cn(
            'flex h-10 items-center gap-3 rounded-lg px-3 text-[14px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            isActive ? 'bg-primary/10 font-medium text-primary' : 'text-slate-600 hover:bg-slate-100 hover:text-foreground',
          )}>
            {({ isActive }) => <><item.icon className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-primary' : 'text-slate-400')} strokeWidth={1.9} /><span className="truncate">{item.label}</span></>}
          </NavLink>
        </li>)}</ul>
      </div>)}
    </nav>
    <div className="m-3 rounded-lg border bg-slate-50 p-3">
      <p className="flex items-center gap-2 text-[13px] font-medium text-foreground">
        <span className={cn('h-2 w-2 shrink-0 rounded-full', error ? 'bg-danger' : 'bg-success')} />
        {error ? 'Backend needs attention' : 'Backend connected'}
      </p>
      <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
        {projects.length} saved project{projects.length === 1 ? '' : 's'} · all data comes from the ASAIP API
      </p>
    </div>
  </div>;
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { projects, selectedProjectId, selectProject, loading, error } = useApp();
  const title = pageNames[location.pathname] || 'ASAIP';
  return <div className="min-h-screen bg-background">
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r bg-white lg:block"><SidebarContent /></aside>
    {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden">
      <button className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />
      <aside className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] border-r bg-white shadow-raised animate-fade-in">
        <SidebarContent onNavigate={() => setMobileOpen(false)} />
        <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-5 rounded p-1 text-slate-500 hover:text-foreground" aria-label="Close navigation"><X className="h-4 w-4" /></button>
      </aside>
    </div>}
    <div className="lg:pl-64">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-white px-4 sm:px-6 lg:px-8">
        <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
        <div className="hidden items-center gap-1.5 text-[13px] text-muted-foreground sm:flex">
          <span>ASAIP</span><ChevronRight className="h-3.5 w-3.5 text-slate-300" /><span className="font-medium text-foreground">{title}</span>
        </div>
        <p className="text-[15px] font-semibold text-foreground sm:hidden">{title}</p>
        <div className="ml-auto flex items-center gap-2">
          {projects.length > 0 && <div className="w-44 sm:w-64">
            <Select aria-label="Active project" className="h-9 text-[13px]" value={selectedProjectId ?? ''} disabled={loading} onChange={(event) => selectProject(Number(event.target.value))}>
              <option value="" disabled>Active project</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </Select>
          </div>}
          {error && <span className="inline-flex items-center gap-1.5 rounded-md border border-red-600/25 bg-red-50 px-2 py-1 text-[12px] font-medium text-danger"><CircleAlert className="h-3.5 w-3.5" />API offline</span>}
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1440px] p-4 sm:p-6 lg:p-8"><Outlet /></main>
      <footer className="mx-auto flex max-w-[1440px] flex-col gap-1.5 px-4 pb-8 pt-2 text-[12px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <span>ASAIP · a proof of concept for explainable architecture decisions</span>
        <span>Costs are illustrative INR estimates, never live cloud quotes.</span>
      </footer>
    </div>
  </div>;
}
