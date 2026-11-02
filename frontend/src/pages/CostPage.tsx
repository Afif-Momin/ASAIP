import { useEffect, useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { CircleDollarSign, Cloud, Coins, Gauge, Info, Layers3, Lightbulb, ReceiptIndianRupee, WalletCards } from 'lucide-react';
import { api, getErrorMessage } from '@/services/api';
import { useApp } from '@/context/AppContext';
import type { CloudProvider, CostEstimate } from '@/types';
import { formatCompactINR, formatINR } from '@/lib/format';
import { ModuleState } from '@/components/common/ModuleState';
import { PageHeader } from '@/components/common/PageHeader';
import { WorkspaceSelectors } from '@/components/common/WorkspaceSelectors';
import { MetricCard, DataList } from '@/components/common/DataDisplay';
import { EmptyState, ErrorState } from '@/components/common/States';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';

const chartColors = ['#818cf8', '#22d3ee', '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#2dd4bf', '#94a3b8'];
export default function CostPage() {
  const { selectedProject, selectedArchitecture } = useApp();
  const [provider, setProvider] = useState<CloudProvider>('AWS');
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [estimates, setEstimates] = useState<Record<number, CostEstimate>>({});
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  useEffect(() => { setEstimates({}); setEstimate(null); setError(null); }, [provider]);
  useEffect(() => { setEstimate(selectedArchitecture ? estimates[selectedArchitecture.id] || null : null); setError(null); }, [selectedArchitecture?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const calculate = async (all = false) => {
    if (!selectedArchitecture || !selectedProject) return;
    setRunning(true); setError(null);
    try {
      if (all) {
        const results = await Promise.all(selectedProject.architectures.map((architecture) => api.cost.estimate(architecture.id, provider)));
        const next = Object.fromEntries(results.map((result) => [result.architecture_id, result]));
        setEstimates(next);
        setEstimate(next[selectedArchitecture.id] || null);
        toast(`${provider} estimates generated for all ${results.length} alternatives.`);
      } else {
        const result = await api.cost.estimate(selectedArchitecture.id, provider);
        setEstimate(result); setEstimates((current) => ({ ...current, [result.architecture_id]: result }));
        toast(`${provider} cost estimate updated.`);
      }
    } catch (err) { const message = getErrorMessage(err); setError(message); toast(message, 'error'); }
    finally { setRunning(false); }
  };
  const comparisonData = useMemo(() => selectedProject?.architectures.filter((architecture) => estimates[architecture.id]).map((architecture) => ({ name: architecture.name, monthly: estimates[architecture.id].monthly_cost, annual: estimates[architecture.id].annual_cost })) || [], [selectedProject, estimates]);
  return <ModuleState><div className="space-y-6 animate-fade-up">
    <PageHeader eyebrow="Cloud economics" title="Cloud Cost Estimator" description="Model infrastructure spend in INR, compare alternatives on the same provider, and identify practical cost optimizations." actions={<><Button variant="outline" onClick={() => calculate(true)} loading={running} disabled={!selectedProject?.architectures.length}><Layers3 className="h-4 w-4" />Estimate all</Button><Button onClick={() => calculate()} loading={running} disabled={!selectedArchitecture}><CircleDollarSign className="h-4 w-4" />{estimate ? 'Recalculate cost' : 'Estimate cost'}</Button></>} />
    <WorkspaceSelectors />
    <div className="flex flex-col gap-3 rounded-xl border border-white/[0.075] bg-card p-4 sm:flex-row sm:items-end sm:justify-between"><label className="w-full space-y-2 sm:w-72"><span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500"><Cloud className="h-3.5 w-3.5" />Cloud pricing assumptions</span><Select aria-label="Cloud provider" value={provider} onChange={(event) => setProvider(event.target.value as CloudProvider)}><option value="AWS">Amazon Web Services (AWS)</option><option value="Azure">Microsoft Azure</option><option value="GCP">Google Cloud Platform</option></Select></label><p className="max-w-2xl text-[10px] leading-5 text-slate-600">Illustrative estimates based on configurable pricing assumptions. Actual cloud costs may vary by region, usage, and provider pricing. These are not live cloud quotes.</p></div>
    {error && <ErrorState title="Cost estimation failed" message={error} onRetry={() => calculate()} />}
    {!estimate && !running && <EmptyState icon={<ReceiptIndianRupee className="h-5 w-5" />} title="No estimate for this selection" description={`Request a real ${provider} estimate for ${selectedArchitecture?.name || 'the selected architecture'}, or estimate every alternative to enable cost comparison.`} action={<Button onClick={() => calculate()}>Calculate {provider} estimate</Button>} />}
    {running && <div className="flex min-h-52 items-center justify-center rounded-xl border border-white/[0.075] bg-card text-xs text-slate-500" role="status"><span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-slate-800 border-t-indigo-400" />Applying {provider} pricing assumptions…</div>}
    {estimate && !running && <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Initial setup cost" value={formatINR(estimate.setup_cost)} detail="Estimated implementation and setup" icon={<WalletCards className="h-4 w-4" />} /><MetricCard label="Monthly infrastructure" value={formatINR(estimate.monthly_cost)} detail={`${estimate.provider} illustrative estimate`} icon={<Coins className="h-4 w-4" />} /><MetricCard label="Annual infrastructure" value={formatINR(estimate.annual_cost)} detail="Monthly estimate annualized" icon={<ReceiptIndianRupee className="h-4 w-4" />} /><MetricCard label="Budget utilization" value={`${estimate.budget_utilization.toFixed(1)}%`} detail={estimate.budget_utilization > 100 ? 'Above stated project budget' : 'Within stated project budget'} icon={<Gauge className="h-4 w-4" />} /></section>
      <section className="rounded-xl border border-white/[0.075] bg-card p-5"><div className="flex items-center justify-between gap-4 text-[11px]"><span className="font-medium text-slate-400">Budget consumption</span><span className={estimate.budget_utilization > 100 ? 'text-rose-400' : 'text-emerald-400'}>{formatINR(selectedProject?.budget || 0)} reference budget</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800"><div className={`h-full rounded-full transition-all duration-500 ${estimate.budget_utilization > 100 ? 'bg-rose-500' : estimate.budget_utilization > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, Math.max(0, estimate.budget_utilization))}%` }} /></div><p className="mt-2 text-[10px] text-slate-600">Budget utilization is returned by the cost service for the selected project and architecture.</p></section>
      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-xl border border-white/[0.075] bg-card p-5 shadow-card"><h2 className="font-display text-sm font-semibold text-slate-200">Monthly cost distribution</h2><p className="mt-1 text-[10px] text-slate-600">Breakdown by infrastructure component</p><div className="h-72"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={estimate.breakdown} dataKey="monthly_cost" nameKey="component" innerRadius={62} outerRadius={92} paddingAngle={3} stroke="none">{estimate.breakdown.map((item, index) => <Cell key={item.component} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip contentStyle={{ background: '#111722', border: '1px solid #293244', borderRadius: 8, fontSize: 11 }} formatter={(value) => [formatINR(Number(value)), 'Monthly']} /></PieChart></ResponsiveContainer></div><div className="grid grid-cols-2 gap-2">{estimate.breakdown.map((item, index) => <span key={item.component} className="flex items-center gap-1.5 truncate text-[9px] text-slate-500"><span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: chartColors[index % chartColors.length] }} />{item.component}</span>)}</div></section>
        <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-card shadow-card"><div className="border-b border-white/[0.06] p-5"><h2 className="font-display text-sm font-semibold text-slate-200">Component breakdown</h2><p className="mt-1 text-[10px] text-slate-600">Pricing assumptions and monthly estimates</p></div><div className="max-h-[390px] overflow-auto"><table className="w-full text-left"><thead className="bg-white/[0.018] text-[9px] uppercase tracking-wider text-slate-600"><tr><th className="px-5 py-3 font-medium">Component</th><th className="px-5 py-3 font-medium">Pricing detail</th><th className="px-5 py-3 text-right font-medium">Monthly</th></tr></thead><tbody className="divide-y divide-white/[0.055]">{estimate.breakdown.map((item) => <tr key={item.component}><td className="px-5 py-3.5 text-[11px] font-medium text-slate-300">{item.component}</td><td className="max-w-md px-5 py-3.5 text-[10px] leading-4 text-slate-600">{item.details}</td><td className="whitespace-nowrap px-5 py-3.5 text-right text-[11px] text-slate-300">{formatINR(item.monthly_cost)}</td></tr>)}</tbody><tfoot><tr className="border-t border-white/[0.08] bg-white/[0.018]"><td colSpan={2} className="px-5 py-4 text-[11px] font-semibold text-slate-300">Estimated monthly total</td><td className="whitespace-nowrap px-5 py-4 text-right text-xs font-semibold text-indigo-300">{formatINR(estimate.monthly_cost)}</td></tr></tfoot></table></div></section>
      </div>
      <section className="rounded-xl border border-white/[0.075] bg-card p-5 shadow-card"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="font-display text-sm font-semibold text-slate-200">Architecture cost comparison</h2><p className="mt-1 text-[10px] text-slate-600">Actual estimates retrieved for {provider}; no browser-generated values</p></div>{comparisonData.length < (selectedProject?.architectures.length || 0) && <Button size="sm" variant="outline" onClick={() => calculate(true)} loading={running}>Estimate all alternatives</Button>}</div>{comparisonData.length ? <div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={comparisonData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}><CartesianGrid stroke="#202939" vertical={false} /><XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} angle={-10} textAnchor="end" height={60} /><YAxis tickFormatter={formatCompactINR} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ background: '#111722', border: '1px solid #293244', borderRadius: 8, fontSize: 11 }} formatter={(value) => [formatINR(Number(value)), 'Monthly cost']} /><Bar dataKey="monthly" radius={[5, 5, 0, 0]} maxBarSize={52}>{comparisonData.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}</Bar></BarChart></ResponsiveContainer></div> : <p className="mt-5 text-xs text-slate-600">Estimate all alternatives to populate this comparison.</p>}</section>
      <section className="rounded-xl border border-white/[0.075] bg-card p-5 shadow-card"><h2 className="flex items-center gap-2 text-xs font-semibold text-slate-300"><Lightbulb className="h-4 w-4 text-amber-400" />Cost optimization suggestions</h2><div className="mt-4 grid gap-x-8 gap-y-3 md:grid-cols-2"><DataList items={estimate.optimization_suggestions} tone="warning" /></div></section>
      <div className="flex items-start gap-2 rounded-lg border border-amber-500/10 bg-amber-500/[0.025] px-4 py-3 text-[10px] leading-5 text-slate-600"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />{estimate.disclaimer || 'Illustrative estimates based on configurable pricing assumptions. Actual cloud costs may vary by region, usage, and provider pricing.'}</div>
    </>}
  </div></ModuleState>;
}
