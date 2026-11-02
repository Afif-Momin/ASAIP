import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, CircleDollarSign, GitBranch, Layers3, PackagePlus, Play, Route, Sparkles } from 'lucide-react';
import { api, getErrorMessage } from '@/services/api';
import { useApp } from '@/context/AppContext';
import type { EvolutionAnalysis } from '@/types';
import { formatINR } from '@/lib/format';
import { ModuleState } from '@/components/common/ModuleState';
import { PageHeader } from '@/components/common/PageHeader';
import { WorkspaceSelectors } from '@/components/common/WorkspaceSelectors';
import { EmptyState, ErrorState } from '@/components/common/States';
import { DataList } from '@/components/common/DataDisplay';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';

export default function EvolutionPage() {
  const { selectedArchitecture } = useApp();
  const [analysis, setAnalysis] = useState<EvolutionAnalysis | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  useEffect(() => { setAnalysis(null); setError(null); }, [selectedArchitecture?.id]);
  const run = async () => {
    if (!selectedArchitecture) return;
    setRunning(true); setError(null);
    try { const result = await api.evolution.analyze(selectedArchitecture.id); setAnalysis(result); toast('Tailored evolution roadmap generated.'); }
    catch (err) { const message = getErrorMessage(err); setError(message); toast(message, 'error'); }
    finally { setRunning(false); }
  };
  return <ModuleState><div className="space-y-6 animate-fade-up">
    <PageHeader eyebrow="Practical modernization path" title="Architecture Evolution" description="See how the system can evolve in deliberate stages as requirements and growth change—without adopting distributed complexity before it earns its place." actions={<Button onClick={run} loading={running}><Route className="h-4 w-4" />{analysis ? 'Regenerate roadmap' : 'Generate roadmap'}</Button>} />
    <WorkspaceSelectors />
    {error && <ErrorState title="Evolution analysis failed" message={error} onRetry={run} />}
    {!analysis && !running && <EmptyState icon={<GitBranch className="h-5 w-5" />} title="Chart a tailored evolution path" description={`Generate stage-by-stage changes for ${selectedArchitecture?.name || 'the selected architecture'}, grounded in its requirements and growth projections.`} action={<Button onClick={run}><Play className="h-4 w-4" />Generate evolution roadmap</Button>} />}
    {running && <div className="flex min-h-60 items-center justify-center rounded-xl border border-white/[0.075] bg-card text-xs text-slate-500" role="status"><span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-slate-800 border-t-indigo-400" />Planning architecture stages, triggers, and cost impact…</div>}
    {analysis && !running && <>
      <section className="rounded-xl border border-indigo-500/15 bg-indigo-500/[0.025] p-5"><h2 className="flex items-center gap-2 text-xs font-semibold text-indigo-300"><Sparkles className="h-4 w-4" />Evolution strategy</h2><p className="mt-3 max-w-5xl text-xs leading-6 text-slate-400">{analysis.summary}</p></section>
      <div className="relative space-y-5 before:absolute before:bottom-8 before:left-[19px] before:top-8 before:w-px before:bg-gradient-to-b before:from-indigo-500/50 before:via-violet-500/30 before:to-cyan-500/20 sm:before:left-[27px]">{analysis.stages.map((stage, index) => <article key={`${stage.stage}-${stage.name}`} className="relative grid gap-4 pl-12 sm:pl-16">
        <div className="absolute left-0 top-5 flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-500/30 bg-[#101624] font-display text-xs font-semibold text-indigo-300 shadow-glow sm:h-14 sm:w-14 sm:text-sm">{String(stage.stage).padStart(2, '0')}</div>
        <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-card shadow-card">
          <div className="flex flex-col justify-between gap-4 border-b border-white/[0.06] p-5 sm:flex-row sm:items-start"><div><div className="flex items-center gap-2"><Badge tone={index === 0 ? 'green' : index === analysis.stages.length - 1 ? 'cyan' : 'indigo'}>Stage {stage.stage}</Badge>{index < analysis.stages.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-slate-700" />}</div><h2 className="mt-3 font-display text-base font-semibold text-slate-200">{stage.name}</h2><p className="mt-2 max-w-4xl text-xs leading-5 text-slate-500">{stage.description}</p></div><div className="flex shrink-0 gap-2"><Badge tone={stage.complexity.toLowerCase().includes('high') ? 'amber' : 'default'}>{stage.complexity} complexity</Badge><Badge tone={stage.cost_impact > 0 ? 'violet' : 'green'}><CircleDollarSign className="h-3 w-3" />{stage.cost_impact > 0 ? '+' : ''}{formatINR(stage.cost_impact)}</Badge></div></div>
          <div className="grid gap-6 p-5 lg:grid-cols-2"><StageSection title="Architecture changes" icon={<Layers3 className="h-3.5 w-3.5" />} items={stage.changes} /><StageSection title="Why evolve now" icon={<GitBranch className="h-3.5 w-3.5" />} items={stage.reasons} tone="warning" /><StageSection title="New components" icon={<PackagePlus className="h-3.5 w-3.5" />} items={stage.new_components} /><StageSection title="Expected benefits" icon={<CheckCircle2 className="h-3.5 w-3.5" />} items={stage.benefits} tone="positive" /></div>
        </section>
      </article>)}</div>
    </>}
  </div></ModuleState>;
}
function StageSection({ title, icon, items, tone = 'default' }: { title: string; icon: React.ReactNode; items: string[]; tone?: 'default' | 'positive' | 'warning' }) {
  return <div><h3 className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{icon}{title}</h3><DataList items={items || []} tone={tone} /></div>;
}
