import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Box, CheckCircle2, ChevronRight, CircleAlert, Clock3, FileText, FolderKanban, Layers3,
  Plus, ScanSearch,
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

const steps = [
  { title: 'Describe the system', text: 'Write the requirements in plain language, the way you would explain them to a teammate.' },
  { title: 'Get three options', text: 'ASAIP proposes genuinely different architectures with diagrams, stacks, costs, and scores.' },
  { title: 'Defend your choice', text: 'Weight the criteria, stress-test with the critic, and export a report you can present.' },
];

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
    <section className="rounded-xl border bg-card p-5 shadow-card sm:p-7">
      <h1 className="text-balance text-[26px] font-semibold leading-tight text-foreground sm:text-[30px]">
        {projects.length ? 'Pick up where you left off.' : 'Let’s turn your requirements into an architecture you can defend.'}
      </h1>
      <p className="mt-2.5 max-w-2xl text-[15px] leading-6 text-muted-foreground">
        ASAIP reads a plain-language system description, proposes three different architectures with diagrams and INR cost estimates,
        then helps you compare them, find the weak points, and export a report.
      </p>
      <div className="mt-5 flex flex-wrap gap-2.5">
        <Button onClick={() => navigate('/projects/new')}><Plus className="h-4 w-4" />Start a new project</Button>
        <Button variant="secondary" onClick={openDemo}><Box className="h-4 w-4" />Open the sample project</Button>
      </div>
      <div className="mt-6 grid gap-4 border-t pt-5 sm:grid-cols-3">
        {steps.map((step, index) => <div key={step.title} className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[13px] font-semibold text-primary">{index + 1}</span>
          <span><span className="block text-[14px] font-semibold text-foreground">{step.title}</span><span className="mt-1 block text-[13px] leading-5 text-muted-foreground">{step.text}</span></span>
        </div>)}
      </div>
    </section>

    {error && <div className="flex items-start gap-2.5 rounded-xl border border-amber-600/25 bg-amber-50 px-4 py-3 text-[14px] leading-6 text-amber-900">
      <CircleAlert className="mt-1 h-4 w-4 shrink-0 text-warning" />
      <span>Some workspace data could not be refreshed: {error}</span>
      <button onClick={() => refreshProjects().catch(() => undefined)} className="ml-auto shrink-0 text-[13px] font-medium text-primary hover:underline">Retry</button>
    </div>}

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Projects you have saved" value={formatNumber(projects.length)} detail="Stored on the ASAIP backend" icon={<FolderKanban className="h-4 w-4" />} />
      <MetricCard label="Architecture options" value={formatNumber(architectures.length)} detail="Generated alternatives you can compare" icon={<Layers3 className="h-4 w-4" />} />
      <MetricCard label="Average score" value={architectures.length ? `${average.toFixed(1)} / 10` : '—'} detail="Across the seven decision criteria" icon={<ScanSearch className="h-4 w-4" />} />
      <MetricCard label="Requirements analysed" value={formatNumber(projects.filter((project) => project.requirements_analysis).length)} detail="Projects with a structured analysis" icon={<FileText className="h-4 w-4" />} />
    </section>

    <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
      <section className="overflow-hidden rounded-xl border bg-card shadow-card">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div><h2 className="section-title">Recent projects</h2><p className="section-hint">Open one to continue where you left off</p></div>
          <Link to="/projects" className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline">See all<ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
        <div className="divide-y">
          {!recentProjects.length && <div className="px-5 py-10 text-center"><p className="text-sm text-muted-foreground">Nothing here yet. Your first analysis will show up in this list.</p><Button variant="secondary" size="sm" className="mt-4" onClick={() => navigate('/projects/new')}>Create a project</Button></div>}
          {recentProjects.map((project) => <button key={project.id} onClick={() => openProject(project.id, project.architectures.length ? '/explorer' : '/projects')} className="group flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-slate-50 text-slate-500"><FolderKanban className="h-[18px] w-[18px]" /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-medium text-foreground">{project.name}</span>
              <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">{project.domain} · updated {formatDate(project.updated_at)}</span>
            </span>
            <Badge tone={project.architectures.length ? 'indigo' : 'default'}>{project.architectures.length ? `${project.architectures.length} option${project.architectures.length === 1 ? '' : 's'}` : 'Needs architectures'}</Badge>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-500" />
          </button>)}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border bg-card shadow-card">
        <div className="border-b px-5 py-4"><h2 className="section-title">Latest analyses</h2><p className="section-hint">The newest architecture options you generated</p></div>
        <div className="divide-y">
          {!recentAnalyses.length && <p className="px-5 py-10 text-center text-sm leading-6 text-muted-foreground">Generated architectures appear here, along with the engine that produced them.</p>}
          {recentAnalyses.map((architecture) => {
            const engine = engineLabel(architecture.analysis_mode);
            return <button key={architecture.id} onClick={() => { selectProject(architecture.project_id); selectArchitecture(architecture.id); navigate('/explorer'); }} className="group block w-full px-5 py-4 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50">
              <span className="flex items-center justify-between gap-3">
                <span className="truncate text-[14px] font-medium text-foreground">{architecture.name}</span>
                <Badge tone={engine.tone === 'demo' ? 'cyan' : engine.tone === 'ai' ? 'violet' : 'default'}>{engine.label}</Badge>
              </span>
              <span className="mt-1.5 flex items-center gap-1.5 truncate text-[13px] text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />{architecture.projectName} · {formatDate(architecture.created_at)}</span>
            </button>;
          })}
        </div>
      </section>
    </div>

    <section className="rounded-xl border bg-card p-5 shadow-card">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
        <p className="text-[14px] leading-6 text-slate-700">
          Every result says where it came from. Without an AI key, ASAIP uses its own deterministic demo engine and labels the output as such —
          it never pretends a live model was called.
        </p>
      </div>
    </section>
  </div>;
}
