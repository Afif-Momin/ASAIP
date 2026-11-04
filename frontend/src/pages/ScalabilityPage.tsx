import { useEffect, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, AlertTriangle, ArrowUpRight, Gauge, Play, ServerCog, TrendingUp, Users, Zap } from 'lucide-react';
import { api, getErrorMessage } from '@/services/api';
import { useApp } from '@/context/AppContext';
import type { ScalabilityAnalysis } from '@/types';
import { formatCompactINR, formatINR, formatNumber } from '@/lib/format';
import { ModuleState } from '@/components/common/ModuleState';
import { PageHeader } from '@/components/common/PageHeader';
import { WorkspaceSelectors } from '@/components/common/WorkspaceSelectors';
import { EmptyState, ErrorState } from '@/components/common/States';
import { DataList } from '@/components/common/DataDisplay';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { chartGridColor, chartTooltipStyle as tooltipStyle, seriesColor } from '@/lib/charts';

export default function ScalabilityPage() {
  const { selectedArchitecture } = useApp();
  const [analysis, setAnalysis] = useState<ScalabilityAnalysis | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  useEffect(() => { setAnalysis(null); setError(null); }, [selectedArchitecture?.id]);
  const run = async () => {
    if (!selectedArchitecture) return;
    setRunning(true); setError(null);
    try { const result = await api.scalability.analyze(selectedArchitecture.id); setAnalysis(result); toast('Growth scenarios are ready.'); }
    catch (err) { const message = getErrorMessage(err); setError(message); toast(message, 'error'); }
    finally { setRunning(false); }
  };
  return <ModuleState><div className="space-y-6 animate-fade-up">
    <PageHeader eyebrow="What happens when you grow" title="Growth and scalability" description="See how the architecture you selected copes with the load you expect today, then at five times and ten times that size — including where it starts to strain and what that costs." actions={<Button onClick={run} loading={running}><TrendingUp className="h-4 w-4" />{analysis ? 'Run it again' : 'Model growth'}</Button>} />
    <WorkspaceSelectors />
    {error && <ErrorState title="The growth model did not complete" message={error} onRetry={run} />}
    {!analysis && !running && <EmptyState icon={<TrendingUp className="h-5 w-5" />} title="See how it copes with growth" description={`Ask ASAIP to model three demand scenarios for ${selectedArchitecture?.name || 'this architecture'}. Nothing is invented in the browser — the numbers come from the backend analysis.`} action={<Button onClick={run}><Play className="h-4 w-4" />Model growth</Button>} />}
    {running && <div className="flex min-h-60 items-center justify-center gap-3 rounded-xl border bg-card text-[14px] text-muted-foreground" role="status"><span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />Working out infrastructure changes and performance risks…</div>}
    {analysis && !running && <>
      <section className="panel border-primary/25 bg-primary/[0.04] p-5">
        <h2 className="flex items-center gap-2 section-title"><Zap className="h-4 w-4 text-primary" />How this design grows under load</h2>
        <p className="mt-3 text-[14px] leading-6 text-slate-700">{analysis.explanation}</p>
      </section>

      <section className="panel p-5">
        <h2 className="section-title">Cost and user growth together</h2>
        <p className="section-hint">Monthly infrastructure cost rises with the number of users you expect to serve.</p>
        <div className="mt-4 h-80"><ResponsiveContainer width="100%" height="100%"><LineChart data={analysis.scenarios} margin={{ top: 15, right: 20, left: 15, bottom: 5 }}><CartesianGrid stroke={chartGridColor} vertical={false} /><XAxis dataKey="name" tickLine={false} axisLine={{ stroke: '#ded9cf' }} tick={{ fontSize: 12, fill: '#3d4a56' }} /><YAxis yAxisId="cost" tickFormatter={formatCompactINR} tickLine={false} axisLine={false} /><YAxis yAxisId="users" orientation="right" tickFormatter={(value) => `${Number(value) / 1000}k`} tickLine={false} axisLine={false} /><Tooltip contentStyle={tooltipStyle} formatter={(value, name) => name === 'estimated_monthly_cost' ? [formatINR(Number(value)), 'Monthly cost'] : [formatNumber(Number(value)), 'Expected users']} /><Line yAxisId="cost" type="monotone" dataKey="estimated_monthly_cost" stroke={seriesColor(0)} strokeWidth={2.5} dot={{ fill: seriesColor(0), strokeWidth: 2, r: 4, stroke: '#ffffff' }} /><Line yAxisId="users" type="monotone" dataKey="expected_users" stroke={seriesColor(1)} strokeWidth={1.8} strokeDasharray="5 5" dot={{ fill: seriesColor(1), r: 3 }} /></LineChart></ResponsiveContainer></div>
        <div className="mt-2 flex justify-center gap-5 text-[13px] text-muted-foreground"><span className="flex items-center gap-1.5"><span className="h-0.5 w-5" style={{ background: seriesColor(0) }} />Monthly cost</span><span className="flex items-center gap-1.5"><span className="h-0.5 w-5 border-t-2 border-dashed" style={{ borderColor: seriesColor(1) }} />Expected users</span></div>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">{analysis.scenarios.map((scenario, index) => <article key={scenario.name} className="panel flex flex-col p-5">
        <div className="flex items-center justify-between gap-2"><Badge tone={index === 0 ? 'green' : index === 1 ? 'indigo' : 'violet'}>{scenario.name}</Badge><span className="text-[12px] text-muted-foreground">Scenario {index + 1}</span></div>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div><p className="flex items-center gap-1.5 text-[12px] text-muted-foreground"><Users className="h-4 w-4" />Users expected</p><p className="mt-1 text-[19px] font-semibold text-foreground">{formatNumber(scenario.expected_users)}</p></div>
          <div><p className="flex items-center gap-1.5 text-[12px] text-muted-foreground"><Activity className="h-4 w-4" />Requests per second</p><p className="mt-1 text-[19px] font-semibold text-foreground">{formatNumber(scenario.requests_per_second)}</p></div>
        </div>
        <div className="mt-4 rounded-lg border bg-muted/40 p-3"><p className="text-[12px] text-muted-foreground">Estimated cost per month</p><p className="mt-1 text-[16px] font-semibold text-primary">{formatINR(scenario.estimated_monthly_cost)}</p></div>
        <ScenarioSection icon={<ServerCog className="h-4 w-4" />} title="What you add to the infrastructure"><DataList items={scenario.infrastructure_changes} /></ScenarioSection>
        <ScenarioSection icon={<Gauge className="h-4 w-4" />} title="How you scale it"><p className="text-[14px] leading-6 text-slate-700">{scenario.scaling_strategy}</p></ScenarioSection>
        <ScenarioSection icon={<AlertTriangle className="h-4 w-4" />} title="Where it starts to strain"><DataList items={scenario.bottlenecks} tone="warning" /></ScenarioSection>
        <ScenarioSection icon={<ArrowUpRight className="h-4 w-4" />} title="Risks to performance"><DataList items={scenario.performance_risks} tone="danger" /></ScenarioSection>
      </article>)}</div>
    </>}
  </div></ModuleState>;
}
function ScenarioSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return <div className="mt-5 border-t border-border pt-4"><h3 className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-foreground">{icon}{title}</h3>{children}</div>;
}
