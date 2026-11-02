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
    try { const result = await api.scalability.analyze(selectedArchitecture.id); setAnalysis(result); toast('Scalability scenarios generated.'); }
    catch (err) { const message = getErrorMessage(err); setError(message); toast(message, 'error'); }
    finally { setRunning(false); }
  };
  return <ModuleState><div className="space-y-6 animate-fade-up">
    <PageHeader eyebrow="Demand & growth modeling" title="Scalability Analysis" description="Understand how the selected architecture responds to current load, 5× growth, and 10× growth—including bottlenecks, risks, and cost impact." actions={<Button onClick={run} loading={running}><TrendingUp className="h-4 w-4" />{analysis ? 'Re-run analysis' : 'Analyze scalability'}</Button>} />
    <WorkspaceSelectors />
    {error && <ErrorState title="Scalability analysis failed" message={error} onRetry={run} />}
    {!analysis && !running && <EmptyState icon={<TrendingUp className="h-5 w-5" />} title="Model the architecture under growth" description={`Generate three backend-driven demand scenarios for ${selectedArchitecture?.name || 'this architecture'}. The frontend does not prefill projected costs or scaling behavior.`} action={<Button onClick={run}><Play className="h-4 w-4" />Analyze scalability</Button>} />}
    {running && <div className="flex min-h-60 items-center justify-center rounded-xl border border-white/[0.075] bg-card text-xs text-slate-500" role="status"><span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-slate-800 border-t-indigo-400" />Modeling infrastructure changes and performance risks…</div>}
    {analysis && !running && <>
      <section className="rounded-xl border border-indigo-500/15 bg-indigo-500/[0.025] p-5"><h2 className="flex items-center gap-2 text-xs font-semibold text-indigo-300"><Zap className="h-4 w-4" />How the architecture evolves under load</h2><p className="mt-3 text-xs leading-6 text-slate-400">{analysis.explanation}</p></section>
      <section className="rounded-xl border border-white/[0.075] bg-card p-5 shadow-card"><div><h2 className="font-display text-sm font-semibold text-slate-200">Infrastructure cost vs. projected load</h2><p className="mt-1 text-[10px] text-slate-600">Estimated monthly cost at each demand scenario</p></div><div className="mt-4 h-80"><ResponsiveContainer width="100%" height="100%"><LineChart data={analysis.scenarios} margin={{ top: 15, right: 20, left: 15, bottom: 5 }}><CartesianGrid stroke="#202939" vertical={false} /><XAxis dataKey="name" tickLine={false} axisLine={false} /><YAxis yAxisId="cost" tickFormatter={formatCompactINR} tickLine={false} axisLine={false} /><YAxis yAxisId="users" orientation="right" tickFormatter={(value) => `${Number(value) / 1000}k`} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ background: '#111722', border: '1px solid #293244', borderRadius: 8, fontSize: 11 }} formatter={(value, name) => name === 'estimated_monthly_cost' ? [formatINR(Number(value)), 'Monthly cost'] : [formatNumber(Number(value)), 'Expected users']} /><Line yAxisId="cost" type="monotone" dataKey="estimated_monthly_cost" stroke="#818cf8" strokeWidth={2.5} dot={{ fill: '#818cf8', strokeWidth: 3, r: 4, stroke: '#111722' }} /><Line yAxisId="users" type="monotone" dataKey="expected_users" stroke="#22d3ee" strokeWidth={1.5} strokeDasharray="5 5" dot={{ fill: '#22d3ee', r: 3 }} /></LineChart></ResponsiveContainer></div><div className="flex justify-center gap-5 text-[9px] text-slate-500"><span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-indigo-400" />Monthly infrastructure</span><span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-cyan-400" />Expected users</span></div></section>
      <div className="grid gap-4 xl:grid-cols-3">{analysis.scenarios.map((scenario, index) => <article key={scenario.name} className="rounded-xl border border-white/[0.075] bg-card p-5 shadow-card"><div className="flex items-center justify-between"><Badge tone={index === 0 ? 'green' : index === 1 ? 'indigo' : 'violet'}>{scenario.name}</Badge><span className="text-[9px] uppercase tracking-wider text-slate-700">Scenario {index + 1}</span></div><div className="mt-5 grid grid-cols-2 gap-4"><div><p className="flex items-center gap-1.5 text-[9px] text-slate-600"><Users className="h-3 w-3" />Expected users</p><p className="mt-1.5 font-display text-lg font-semibold text-slate-200">{formatNumber(scenario.expected_users)}</p></div><div><p className="flex items-center gap-1.5 text-[9px] text-slate-600"><Activity className="h-3 w-3" />Requests / second</p><p className="mt-1.5 font-display text-lg font-semibold text-slate-200">{formatNumber(scenario.requests_per_second)}</p></div></div><div className="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"><p className="text-[9px] text-slate-600">Estimated monthly cost</p><p className="mt-1 text-sm font-semibold text-indigo-300">{formatINR(scenario.estimated_monthly_cost)}</p></div><ScenarioSection icon={<ServerCog className="h-3.5 w-3.5" />} title="Infrastructure changes"><DataList items={scenario.infrastructure_changes} /></ScenarioSection><ScenarioSection icon={<Gauge className="h-3.5 w-3.5" />} title="Scaling strategy"><p className="text-[11px] leading-5 text-slate-500">{scenario.scaling_strategy}</p></ScenarioSection><ScenarioSection icon={<AlertTriangle className="h-3.5 w-3.5" />} title="Potential bottlenecks"><DataList items={scenario.bottlenecks} tone="warning" /></ScenarioSection><ScenarioSection icon={<ArrowUpRight className="h-3.5 w-3.5" />} title="Performance risks"><DataList items={scenario.performance_risks} tone="danger" /></ScenarioSection></article>)}</div>
    </>}
  </div></ModuleState>;
}
function ScenarioSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return <div className="mt-5 border-t border-white/[0.055] pt-4"><h3 className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{icon}{title}</h3>{children}</div>;
}
