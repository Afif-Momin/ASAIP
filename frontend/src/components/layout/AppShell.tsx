import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BarChart3, Bell, BookOpenCheck, ChartNoAxesCombined, ChevronRight,
  CircleDollarSign, FileOutput, FolderKanban, GitCompareArrows, Layers3,
  Menu, Network, Plus, Settings, ShieldCheck, TrendingUp, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { Select } from '@/components/ui/input';

const navigation = [
  { section: 'Workspace', items: [
    { to: '/', label: 'Overview', icon: BarChart3 },
    { to: '/projects/new', label: 'New Architecture Project', icon: Plus },
    { to: '/projects', label: 'My Projects', icon: FolderKanban },
  ] },
  { section: 'Architecture intelligence', items: [
    { to: '/explorer', label: 'Architecture Explorer', icon: Network },
    { to: '/comparison', label: 'Comparison & Decisions', icon: GitCompareArrows },
    { to: '/critic', label: 'Architecture Critic', icon: ShieldCheck },
    { to: '/cost', label: 'Cost Estimator', icon: CircleDollarSign },
    { to: '/scalability', label: 'Scalability', icon: TrendingUp },
    { to: '/evolution', label: 'Evolution Roadmap', icon: ChartNoAxesCombined },
  ] },
  { section: 'Output', items: [
    { to: '/reports', label: 'Reports', icon: FileOutput },
    { to: '/settings', label: 'Settings', icon: Settings },
  ] },
];
const pageNames: Record<string, string> = Object.fromEntries(navigation.flatMap((group) => group.items).map((item) => [item.to, item.label]));

function Brand() {
  return <NavLink to="/" className="flex h-16 items-center gap-3 px-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500">
    <span className="relative flex h-8 w-8 items-center justify-center rounded-[10px] bg-indigo-500 shadow-[0_5px_20px_rgba(99,102,241,.25)]"><Layers3 className="h-[18px] w-[18px] text-white" /><span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-[#0b0f17] bg-cyan-300" /></span>
    <span><span className="block font-display text-[15px] font-bold tracking-[0.13em] text-slate-100">ASAIP</span><span className="block text-[8px] font-medium uppercase tracking-[0.13em] text-slate-600">Architecture intelligence</span></span>
  </NavLink>;
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { projects, error } = useApp();
  return <div className="flex h-full flex-col bg-[#0b0f17]">
    <Brand />
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-5 pt-3" aria-label="Main navigation">
      {navigation.map((group) => <div key={group.section}>
        <p className="mb-2 px-2.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-700">{group.section}</p>
        <div className="space-y-0.5">{group.items.map((item) => <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={onNavigate} className={({ isActive }) => cn('group relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-[11.5px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500', isActive ? 'bg-indigo-500/[0.11] text-indigo-200' : 'text-slate-500 hover:bg-white/[0.035] hover:text-slate-300')}>
          {({ isActive }) => <><item.icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-indigo-400' : 'text-slate-600 group-hover:text-slate-400')} strokeWidth={1.8} /><span className="truncate">{item.label}</span>{isActive && <span className="absolute -left-3 h-4 w-0.5 rounded-r bg-indigo-400" />}</>}
        </NavLink>)}</div>
      </div>)}
    </nav>
    <div className="m-3 rounded-lg border border-white/[0.06] bg-white/[0.018] p-3">
      <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400"><span className={cn('h-1.5 w-1.5 rounded-full', error ? 'bg-rose-400' : 'bg-emerald-400')} />{error ? 'API needs attention' : 'Workspace connected'}</div>
      <p className="mt-1.5 text-[9px] leading-4 text-slate-600">{projects.length} saved project{projects.length === 1 ? '' : 's'} · Data from backend</p>
    </div>
  </div>;
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { projects, selectedProjectId, selectProject, loading } = useApp();
  const title = pageNames[location.pathname] || 'ASAIP Workspace';
  return <div className="min-h-screen bg-background">
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-white/[0.065] lg:block"><SidebarContent /></aside>
    {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><button className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} aria-label="Close navigation" /><aside className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] border-r border-white/10 shadow-2xl animate-fade-in"><SidebarContent onNavigate={() => setMobileOpen(false)} /><button onClick={() => setMobileOpen(false)} className="absolute right-3 top-5 rounded p-1 text-slate-500 hover:text-white" aria-label="Close navigation"><X className="h-4 w-4" /></button></aside></div>}
    <div className="lg:pl-60">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/[0.06] bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <button className="rounded-lg p-2 text-slate-400 hover:bg-white/5 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
        <div className="hidden items-center gap-2 text-[11px] sm:flex"><span className="text-slate-600">ASAIP</span><ChevronRight className="h-3 w-3 text-slate-700" /><span className="font-medium text-slate-300">{title}</span></div>
        <div className="ml-auto flex items-center gap-2">
          {projects.length > 0 && <div className="w-40 sm:w-56"><Select aria-label="Active project" className="h-8 border-transparent bg-white/[0.035] text-[11px]" value={selectedProjectId ?? ''} disabled={loading} onChange={(event) => selectProject(Number(event.target.value))}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</Select></div>}
          <NavLink to="/reports" className="rounded-lg p-2 text-slate-600 transition hover:bg-white/5 hover:text-slate-300" aria-label="Reports and exports"><Bell className="h-4 w-4" /></NavLink>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8"><Outlet /></main>
      <footer className="mx-auto flex max-w-[1600px] flex-col gap-2 px-6 pb-6 pt-2 text-[9px] text-slate-700 sm:flex-row sm:items-center sm:justify-between lg:px-8"><span>ASAIP · Explainable architecture decisions</span><span className="inline-flex items-center gap-1.5"><BookOpenCheck className="h-3 w-3" />Actual analysis data · INR estimates</span></footer>
    </div>
  </div>;
}
