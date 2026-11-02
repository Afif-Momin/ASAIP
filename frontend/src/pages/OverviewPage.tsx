import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Box, CheckCircle2, ChevronRight, CircleDollarSign, Clock3,
  FileText, FolderKanban, Layers3, Plus, ScanSearch, ShieldCheck, Sparkles,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { averageScore, formatDate, formatNumber } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MetricCard } from '@/components/common/DataDisplay';
import { ErrorState } from '@/components/common/States';
import { PageSkeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { engineLabel } from '@/lib/utils';

export default function OverviewPage() {
  const { projects, loading, error, refreshProjects, selectProject, selectArchitecture } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();
  const architectures = useMemo(() => projects.flatMap((project) => project.architectures.map((architecture) => ({ ...architecture, projectName: project.name }))), [projects]);
  const average = architectures.length ? architectures.reduce((sum, architecture) => sum + averageScore(architecture.scores), 0) / architectures.length : 0;
  const recentProjects = useMemo(() => [...projects].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)).slice(0, 4), [projects]);
  const recentAnalyses = useMemo(() => [...architectures].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, 4), [architectures]);
  const openProject = (id: number, path = '/explorer') => { selectProject(id); navigate(path); };
  const openDemo = () => {
    const demo = projects.find((project) => project.name.toLowerCase() === 'smart e-commerce platform');
    if (!demo) { toast('The seeded Smart E-Commerce Platform was not found. Start the backend with demo data enabled.', 'error'); return; }
    selectProject(demo.id);
    navigate(demo.architectures.length ? '/explorer' : '/projects');
    toast('Smart E-Commerce Platform opened.', 'info');
  };
  if (loading && !projects.length) return <PageSkeleton />;
  if (error && !projects.length) return <ErrorState message={error} onRetry={() => refreshProjects().catch(() => undefined)} />;

  return <div className="space-y-7 animate-fade-up">
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.075] bg-[#0d121c] px-5 py-6 shadow-card sm:px-7 sm:py-7">
      <div className="pointer-events-none absolute inset-0 subtle-grid opacity-50" />
      <div className="relative flex flex-col justify-between gap-7 xl:flex-row xl:items-center">
        <div className="max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/[0.07] px-2.5 py-1 text-[10px] font-medium text-indigo-300"><Sparkles className="h-3 w-3" />Architecture decisions, made explainable</div>
          <h1 className="text-balance font-display text-[27px] font-semibold leading-[1.18] tracking-[-0.04em] text-slate-100 sm:text-[32px]">Turn requirements into architecture<br className="hidden sm:block" /> you can defend.</h1>
          <p className="mt-3 max-w-xl text-[13px] leading-6 text-slate-500">Analyze trade-offs, expose design risks, model cloud costs, and chart a practical evolution path—all from one shared requirements workspace.</p>
          <div className="mt-5 flex flex-wrap gap-2.5"><Button onClick={() => navigate('/projects/new')}><Plus className="h-4 w-4" />Create new architecture</Button><Button variant="secondary" onClick={openDemo}><Box className="h-4 w-4" />Quick-start demo</Button></div>
        </div>
        <div className="w-full max-w-md rounded-xl border border-white/[0.07] bg-[#0a0f17]/90 p-4">
          <p className="panel-title mb-4">Intelligence pipeline</p>
          <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2">
            {[{ icon: FileText, label: 'Requirements' }, { icon: Layers3, label: 'Alternatives' }, { icon: CheckCircle2, label: 'Decision' }].map((step, index) => <div key={step.label} className="contents"><div className="flex flex-col items-center gap-2 text-center"><div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${index === 1 ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300' : 'border-white/[0.08] bg-white/[0.025] text-slate-400'}`}><step.icon className="h-4 w-4" /></div><span className="text-[9px] font-medium text-slate-500">{step.label}</span></div>{index < 2 && <ChevronRight className="mb-5 h-4 w-4 text-slate-700" />}</div>)}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-[9px] text-slate-600"><span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" />Risk-aware</span><span className="inline-flex items-center gap-1.5"><CircleDollarSign className="h-3 w-3" />Cost-aware</span><span className="inline-flex items-center gap-1.5"><ScanSearch className="h-3 w-3" />Explainable</span></div>
        </div>
      </div>
    </section>

    {error && <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] px-4 py-3 text-xs text-amber-200">Some workspace data could not be refreshed: {error}</div>}
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Projects analyzed" value={formatNumber(projects.length)} detail="Persisted architecture workspaces" icon={<FolderKanban className="h-4 w-4" />} />
      <MetricCard label="Recommendations generated" value={formatNumber(architectures.length)} detail="Saved architecture alternatives" icon={<Layers3 className="h-4 w-4" />} />
      <MetricCard label="Average architecture score" value={architectures.length ? `${average.toFixed(1)}/10` : '—'} detail="Across all seven decision criteria" icon={<ScanSearch className="h-4 w-4" />} />
      <MetricCard label="Requirements analyses" value={formatNumber(projects.filter((project) => project.requirements_analysis).length)} detail="Structured requirement assessments" icon={<FileText className="h-4 w-4" />} />
    </section>

    <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
      <section className="rounded-xl border border-white/[0.075] bg-card shadow-card">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4"><div><h2 className="font-display text-sm font-semibold text-slate-200">Recent projects</h2><p className="mt-1 text-[10px] text-slate-600">Continue where you left off</p></div><Link to="/projects" className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-400 hover:text-indigo-300">View all<ArrowRight className="h-3 w-3" /></Link></div>
        <div className="divide-y divide-white/[0.055]">
          {!recentProjects.length && <div className="px-5 py-10 text-center"><p className="text-xs text-slate-500">No projects yet. Your first analysis will appear here.</p><Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/projects/new')}>Create project</Button></div>}
          {recentProjects.map((project) => <button key={project.id} onClick={() => openProject(project.id, project.architectures.length ? '/explorer' : '/projects')} className="group flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-white/[0.02] focus:outline-none focus-visible:bg-white/[0.03]">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-slate-500"><FolderKanban className="h-4 w-4" /></div>
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-300 group-hover:text-slate-100">{project.name}</p><p className="mt-1 truncate text-[10px] text-slate-600">{project.domain} · Updated {formatDate(project.updated_at)}</p></div>
            <Badge tone={project.architectures.length ? 'indigo' : 'default'}>{project.architectures.length} architecture{project.architectures.length === 1 ? '' : 's'}</Badge><ChevronRight className="h-3.5 w-3.5 text-slate-700 group-hover:text-slate-400" />
          </button>)}
        </div>
      </section>

      <section className="rounded-xl border border-white/[0.075] bg-card shadow-card">
        <div className="border-b border-white/[0.06] px-5 py-4"><h2 className="font-display text-sm font-semibold text-slate-200">Recent architecture analyses</h2><p className="mt-1 text-[10px] text-slate-600">Latest generated alternatives</p></div>
        <div className="divide-y divide-white/[0.055]">
          {!recentAnalyses.length && <div className="px-5 py-10 text-center text-xs leading-5 text-slate-600">Generated architecture analyses will appear here with their actual analysis mode.</div>}
          {recentAnalyses.map((architecture) => {
            const engine = engineLabel(architecture.analysis_mode);
            return <button key={architecture.id} onClick={() => { selectProject(architecture.project_id); selectArchitecture(architecture.id); navigate('/explorer'); }} className="group block w-full px-5 py-4 text-left transition hover:bg-white/[0.02] focus:outline-none focus-visible:bg-white/[0.03]">
              <div className="flex items-center justify-between gap-3"><p className="truncate text-xs font-medium text-slate-300">{architecture.name}</p><Badge tone={engine.tone === 'demo' ? 'cyan' : engine.tone === 'ai' ? 'violet' : 'default'}>{engine.label}</Badge></div>
              <p className="mt-1.5 flex items-center gap-1.5 truncate text-[10px] text-slate-600"><Clock3 className="h-3 w-3" />{architecture.projectName} · {formatDate(architecture.created_at)}</p>
            </button>;
          })}
        </div>
      </section>
    </div>
  </div>;
}
