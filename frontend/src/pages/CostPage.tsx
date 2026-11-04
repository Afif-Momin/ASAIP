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
import { chartGridColor, seriesColor, chartTooltipStyle as tooltipStyle } from '@/lib/charts';

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
        toast(`Priced all ${results.length} options on ${provider}.`);
      } else {
        const result = await api.cost.estimate(selectedArchitecture.id, provider);
        setEstimate(result); setEstimates((current) => ({ ...current, [result.architecture_id]: result }));
        toast(`${provider} estimate updated.`);
      }
    } catch (err) { const message = getErrorMessage(err); setError(message); toast(message, 'error'); }
    finally { setRunning(false); }
  };
  const comparisonData = useMemo(() => selectedProject?.architectures.filter((architecture) => estimates[architecture.id]).map((architecture) => ({ name: architecture.name, monthly: estimates[architecture.id].monthly_cost, annual: estimates[architecture.id].annual_cost })) || [], [selectedProject, estimates]);
  const overBudget = !!estimate && estimate.budget_utilization > 100;
  return <ModuleState><div className="space-y-6 animate-fade-up">
    <PageHeader eyebrow="What it will cost to run" title="Cost estimate" description="See the likely monthly and yearly infrastructure spend in Indian rupees, compare your options on the same provider, and read the suggestions for bringing the number down." actions={<><Button variant="outline" onClick={() => calculate(true)} loading={running} disabled={!selectedProject?.architectures.length}><Layers3 className="h-4 w-4" />Price all options</Button><Button onClick={() => calculate()} loading={running} disabled={!selectedArchitecture}><CircleDollarSign className="h-4 w-4" />{estimate ? 'Recalculate' : 'Estimate cost'}</Button></>} />
    <WorkspaceSelectors />

    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-end sm:justify-between">
      <label className="w-full space-y-1.5 sm:w-80">
        <span className="flex items-center gap-1.5 field-label"><Cloud className="h-4 w-4 text-slate-400" />Which cloud to price against</span>
        <Select aria-label="Cloud provider" value={provider} onChange={(event) => setProvider(event.target.value as CloudProvider)}><option value="AWS">Amazon Web Services (AWS)</option><option value="Azure">Microsoft Azure</option><option value="GCP">Google Cloud Platform</option></Select>
      </label>
      <p className="max-w-2xl text-[13px] leading-5 text-muted-foreground">These are illustrative figures based on fixed pricing assumptions — not live quotes. Real bills depend on your region, traffic and negotiated discounts.</p>
    </div>

    {error && <ErrorState title="The estimate did not complete" message={error} onRetry={() => calculate()} />}
    {!estimate && !running && <EmptyState icon={<ReceiptIndianRupee className="h-5 w-5" />} title="Nothing priced for this selection yet" description={`Ask ASAIP for a ${provider} estimate for ${selectedArchitecture?.name || 'the architecture you selected'}, or price every option to compare them side by side.`} action={<Button onClick={() => calculate()}>Calculate {provider} estimate</Button>} />}
    {running && <div className="flex min-h-52 items-center justify-center gap-3 rounded-xl border bg-card text-[14px] text-muted-foreground" role="status"><span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />Applying {provider} pricing assumptions…</div>}

    {estimate && !running && <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="One-time setup" value={formatINR(estimate.setup_cost)} detail="Building and launching it" icon={<WalletCards className="h-4 w-4" />} />
        <MetricCard label="Every month" value={formatINR(estimate.monthly_cost)} detail={`Running it on ${estimate.provider}`} icon={<Coins className="h-4 w-4" />} />
        <MetricCard label="Over a year" value={formatINR(estimate.annual_cost)} detail="Twelve months of infrastructure" icon={<ReceiptIndianRupee className="h-4 w-4" />} />
        <MetricCard label="Share of your budget" value={`${estimate.budget_utilization.toFixed(1)}%`} detail={overBudget ? 'Above the budget you entered' : 'Within the budget you entered'} icon={<Gauge className="h-4 w-4" />} />
      </section>

      <section className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[14px]"><span className="font-medium text-foreground">How much of your stated budget this uses</span><span className={overBudget ? 'font-semibold text-danger' : 'font-semibold text-success'}>{formatINR(selectedProject?.budget || 0)} budget</span></div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full transition-all duration-500 ${overBudget ? 'bg-danger' : estimate.budget_utilization > 80 ? 'bg-warning' : 'bg-success'}`} style={{ width: `${Math.min(100, Math.max(0, estimate.budget_utilization))}%` }} /></div>
        <p className="mt-2.5 text-[13px] text-muted-foreground">{overBudget ? 'This option would exceed your budget on infrastructure alone — the suggestions further down are worth acting on.' : 'The backend calculates this from your project budget and the estimated monthly cost.'}</p>
      </section>

      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="panel p-5">
          <h2 className="section-title">Where the monthly money goes</h2>
          <p className="section-hint">Each slice is one part of the infrastructure.</p>
          <div className="h-72"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={estimate.breakdown} dataKey="monthly_cost" nameKey="component" innerRadius={62} outerRadius={92} paddingAngle={2} stroke="#ffffff">{estimate.breakdown.map((item, index) => <Cell key={item.component} fill={seriesColor(index)} />)}</Pie><Tooltip contentStyle={tooltipStyle} formatter={(value) => [formatINR(Number(value)), 'Per month']} /></PieChart></ResponsiveContainer></div>
          <div className="mt-3 grid grid-cols-2 gap-2">{estimate.breakdown.map((item, index) => <span key={item.component} className="flex items-center gap-2 truncate text-[13px] text-muted-foreground"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: seriesColor(index) }} />{item.component}</span>)}</div>
        </section>
        <section className="panel overflow-hidden">
          <div className="p-5"><h2 className="section-title">Line by line</h2><p className="section-hint">The assumption behind each monthly figure.</p></div>
          <div className="max-h-[390px] overflow-auto border-t border-border"><table className="w-full text-left">
            <thead className="sticky top-0 bg-muted/70 text-[12px] text-muted-foreground backdrop-blur"><tr><th className="px-5 py-3 font-medium">Component</th><th className="px-5 py-3 font-medium">Pricing assumption</th><th className="px-5 py-3 text-right font-medium">Per month</th></tr></thead>
            <tbody className="divide-y divide-border">{estimate.breakdown.map((item) => <tr key={item.component}><td className="px-5 py-3.5 text-[14px] font-medium text-foreground">{item.component}</td><td className="max-w-md px-5 py-3.5 text-[13px] leading-5 text-muted-foreground">{item.details}</td><td className="whitespace-nowrap px-5 py-3.5 text-right text-[14px] text-foreground">{formatINR(item.monthly_cost)}</td></tr>)}</tbody>
            <tfoot><tr className="border-t border-border bg-muted/40"><td colSpan={2} className="px-5 py-4 text-[14px] font-semibold text-foreground">Estimated monthly total</td><td className="whitespace-nowrap px-5 py-4 text-right text-[15px] font-semibold text-primary">{formatINR(estimate.monthly_cost)}</td></tr></tfoot>
          </table></div>
        </section>
      </div>

      <section className="panel p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div><h2 className="section-title">Compare the monthly cost of each option</h2><p className="section-hint">Only estimates actually returned by the backend for {provider} appear here.</p></div>
          {comparisonData.length < (selectedProject?.architectures.length || 0) && <Button size="sm" variant="outline" onClick={() => calculate(true)} loading={running}>Price every option</Button>}
        </div>
        {comparisonData.length ? <div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={comparisonData} margin={{ top: 10, right: 10, left: 10, bottom: 30 }}><CartesianGrid stroke={chartGridColor} vertical={false} /><XAxis dataKey="name" tickLine={false} axisLine={{ stroke: '#ded9cf' }} interval={0} angle={-10} textAnchor="end" height={70} tick={{ fontSize: 12, fill: '#3d4a56' }} /><YAxis tickFormatter={formatCompactINR} tickLine={false} axisLine={false} /><Tooltip contentStyle={tooltipStyle} formatter={(value) => [formatINR(Number(value)), 'Per month']} /><Bar dataKey="monthly" radius={[6, 6, 0, 0]} maxBarSize={54}>{comparisonData.map((entry, index) => <Cell key={entry.name} fill={seriesColor(index)} />)}</Bar></BarChart></ResponsiveContainer></div> : <p className="mt-5 text-[14px] text-muted-foreground">Price every option to fill in this comparison.</p>}
      </section>

      <section className="panel p-5">
        <h2 className="flex items-center gap-2 section-title"><Lightbulb className="h-4 w-4 text-warning" />Ways to bring the cost down</h2>
        <div className="mt-4 grid gap-x-8 gap-y-3 md:grid-cols-2"><DataList items={estimate.optimization_suggestions} tone="warning" /></div>
      </section>
      <p className="flex items-start gap-2.5 rounded-xl border border-amber-600/25 bg-amber-50 px-4 py-3.5 text-[13px] leading-6 text-amber-900"><Info className="mt-1 h-4 w-4 shrink-0" />{estimate.disclaimer || 'Illustrative estimates based on configurable pricing assumptions. Actual cloud costs may vary by region, usage, and provider pricing.'}</p>
    </>}
  </div></ModuleState>;
}
