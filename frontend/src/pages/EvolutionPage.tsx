import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, CircleDollarSign, GitBranch, Layers3, PackagePlus, Play, Route } from 'lucide-react';
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
    try { const result = await api.evolution.analyze(selectedArchitecture.id); setAnalysis(result); toast('Roadmap ready.'); }
    catch (err) { const message = getErrorMessage(err); setError(message); toast(message, 'error'); }
    finally { setRunning(false); }
  };
  return <ModuleState><div className="space-y-6 animate-fade-up">
    <PageHeader eyebrow="How it can grow over time" title="Evolution roadmap" description="Start simple and upgrade only when the pressure is real. This roadmap shows the stages you could move through, what triggers each step, and what each step costs." actions={<Button onClick={run} loading={running}><Route className="h-4 w-4" />{analysis ? 'Build it again' : 'Build the roadmap'}</Button>} />
    <WorkspaceSelectors />
    {error && <ErrorState title="The roadmap did not generate" message={error} onRetry={run} />}
    {!analysis && !running && <EmptyState icon={<GitBranch className="h-5 w-5" />} title={`Plan the next few years for ${selectedArchitecture?.name || 'this architecture'}`} description="ASAIP works out stage-by-stage changes from your requirements and growth projections — no complexity until it is actually needed." action={<Button onClick={run}><Play className="h-4 w-4" />Build the roadmap</Button>} />}
    {running && <div className="flex min-h-60 items-center justify-center gap-3 rounded-xl border bg-card text-[14px] text-muted-foreground" role="status"><span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />Working out the stages, what triggers them, and what they cost…</div>}
    {analysis && !running && <>
      <section className="panel border-primary/25 bg-primary/[0.04] p-5">
        <h2 className="flex items-center gap-2 section-title"><Route className="h-4 w-4 text-primary" />The thinking behind this path</h2>
        <p className="mt-3 max-w-5xl text-[14px] leading-6 text-slate-700">{analysis.summary}</p>
      </section>

      <div className="relative space-y-5 before:absolute before:bottom-8 before:left-[19px] before:top-8 before:w-px before:bg-border sm:before:left-[27px]">
        {analysis.stages.map((stage, index) => <article key={`${stage.stage}-${stage.name}`} className="relative grid gap-4 pl-12 sm:pl-16">
          <div className="absolute left-0 top-5 flex h-10 w-10 items-center justify-center rounded-xl border bg-card text-[13px] font-semibold text-primary sm:h-14 sm:w-14 sm:text-[15px]">{index + 1}</div>
          <section className="panel overflow-hidden">
            <div className="flex flex-col justify-between gap-4 border-b p-5 sm:flex-row sm:items-start">
              <div>
                <div className="flex items-center gap-2"><Badge tone={index === 0 ? 'green' : index === analysis.stages.length - 1 ? 'cyan' : 'indigo'}>Stage {stage.stage}</Badge>{index < analysis.stages.length - 1 && <ArrowRight className="h-4 w-4 text-slate-400" />}</div>
                <h2 className="mt-3 text-[17px] font-semibold text-foreground">{stage.name}</h2>
                <p className="mt-2 max-w-4xl text-[14px] leading-6 text-muted-foreground">{stage.description}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Badge tone={stage.complexity.toLowerCase().includes('high') ? 'amber' : 'default'}>{stage.complexity} to build</Badge>
                <Badge tone={stage.cost_impact > 0 ? 'violet' : 'green'}><CircleDollarSign className="h-3 w-3" />{stage.cost_impact > 0 ? '+' : ''}{formatINR(stage.cost_impact)} per month</Badge>
              </div>
            </div>
            <div className="grid gap-6 p-5 lg:grid-cols-2">
              <StageSection title="What changes" icon={<Layers3 className="h-4 w-4" />} items={stage.changes} />
              <StageSection title="What pushes you to do it" icon={<GitBranch className="h-4 w-4" />} items={stage.reasons} tone="warning" />
              <StageSection title="New pieces added" icon={<PackagePlus className="h-4 w-4" />} items={stage.new_components} />
              <StageSection title="What you get for it" icon={<CheckCircle2 className="h-4 w-4" />} items={stage.benefits} tone="positive" />
            </div>
          </section>
        </article>)}
      </div>
    </>}
  </div></ModuleState>;
}
function StageSection({ title, icon, items, tone = 'default' }: { title: string; icon: React.ReactNode; items: string[]; tone?: 'default' | 'positive' | 'warning' }) {
  return <div><h3 className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-foreground">{icon}{title}</h3><DataList items={items || []} tone={tone} /></div>;
}
