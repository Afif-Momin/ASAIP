import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, PolarAngleAxis, PolarGrid, PolarRadiusAxis,
  Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Check, GitCompareArrows, Info, RotateCcw, Scale, SlidersHorizontal } from 'lucide-react';
import { api, getErrorMessage } from '@/services/api';
import { useApp } from '@/context/AppContext';
import type { ArchitectureWeights, Comparison, ScoreKey } from '@/types';
import { ModuleState } from '@/components/common/ModuleState';
import { PageHeader } from '@/components/common/PageHeader';
import { WorkspaceSelectors } from '@/components/common/WorkspaceSelectors';
import { EmptyState, ErrorState } from '@/components/common/States';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { InlineLoader } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { chartGridColor, seriesColor, chartTooltipStyle as tooltipStyle } from '@/lib/charts';
const criteria: Array<{ key: ScoreKey; label: string; short: string; question: string }> = [
  { key: 'scalability', label: 'Handles growth', short: 'Growth', question: 'How easily it absorbs more users and traffic' },
  { key: 'security', label: 'Protects data', short: 'Security', question: 'How well it defends sensitive information' },
  { key: 'maintainability', label: 'Easy to maintain', short: 'Maintain', question: 'How simple it is to change over time' },
  { key: 'cost_efficiency', label: 'Runs affordably', short: 'Cost', question: 'How well it stays inside your budget' },
  { key: 'reliability', label: 'Stays available', short: 'Uptime', question: 'How consistently it stays online' },
  { key: 'performance', label: 'Stays fast', short: 'Speed', question: 'How quickly it responds' },
  { key: 'development_complexity', label: 'Easy to build', short: 'Dev ease', question: 'How achievable it is for your team size' },
];
const defaults: ArchitectureWeights = { scalability: 20, security: 20, maintainability: 15, cost_efficiency: 20, reliability: 10, performance: 10, development_complexity: 5 };

export default function ComparisonPage() {
  const { selectedProject } = useApp();
  const [weights, setWeights] = useState<ArchitectureWeights>(defaults);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const total = criteria.reduce((sum, criterion) => sum + (Number(weights[criterion.key]) || 0), 0);

  const loadComparison = async () => {
    if (!selectedProject) return;
    setLoading(true); setError(null);
    try {
      const data = await api.comparison.get(selectedProject.id);
      setComparison(data); setWeights(data.weights);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) setComparison(null);
      else setError(getErrorMessage(err));
    } finally { setLoading(false); }
  };
  useEffect(() => {
    setComparison(null); setError(null); setWeights(defaults);
    if (selectedProject?.architectures.length) loadComparison();
    // Project identity controls which saved comparison is loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject?.id]);

  const normalize = () => {
    const sum = total;
    if (sum <= 0) { setWeights(defaults); return; }
    const normalized = Object.fromEntries(criteria.map((criterion) => [criterion.key, Math.floor((weights[criterion.key] / sum) * 100)])) as ArchitectureWeights;
    normalized.cost_efficiency += 100 - criteria.reduce((acc, criterion) => acc + normalized[criterion.key], 0);
    setWeights(normalized);
    toast('Priorities rebalanced to add up to 100%.', 'info');
  };
  const run = async () => {
    if (!selectedProject || total !== 100) return;
    setRunning(true); setError(null);
    try {
      const result = await api.comparison.run(selectedProject.id, weights);
      setComparison(result);
      toast('Ranking recalculated with your priorities.');
    } catch (err) { const message = getErrorMessage(err); setError(message); toast(message, 'error'); }
    finally { setRunning(false); }
  };
  const winner = comparison?.results.find((result) => result.architecture_id === comparison.recommended_architecture_id) || comparison?.results[0];
  const radarData = useMemo(() => criteria.map((criterion) => {
    const row: Record<string, string | number> = { criterion: criterion.short };
    comparison?.results.forEach((result) => { row[result.architecture_name] = result.scores[criterion.key]; });
    return row;
  }), [comparison]);
  const barData = useMemo(() => comparison?.results.map((result) => ({ name: result.architecture_name, score: Number(result.weighted_score.toFixed(2)), rank: result.rank })) || [], [comparison]);

  return <ModuleState><div className="space-y-6 animate-fade-up">
    <PageHeader eyebrow="Compare your options" title="Side-by-side comparison" description="Tell us what matters most for your project, then recalculate the ranking. Every score and every weight is shown, so you can see exactly why an option comes first." actions={<Button onClick={run} loading={running} disabled={total !== 100 || !selectedProject?.architectures.length}><GitCompareArrows className="h-4 w-4" />Recalculate ranking</Button>} />
    <WorkspaceSelectors architecture={false} />

    <section className="panel p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 section-title"><SlidersHorizontal className="h-4 w-4 text-primary" />What matters most to you?</h2>
          <p className="section-hint max-w-2xl">Move each slider to say how much that priority counts. The numbers must add up to 100% before you can recalculate.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-lg border px-3 py-1.5 text-[13px] font-semibold ${total === 100 ? 'border-success/25 bg-success/[0.07] text-success' : 'border-danger/25 bg-danger/[0.06] text-danger'}`}>{total}% of 100%</span>
          <Button size="sm" variant="outline" onClick={normalize}><Scale className="h-3.5 w-3.5" />Make it total 100</Button>
          <Button size="sm" variant="ghost" onClick={() => setWeights(defaults)} aria-label="Reset to default priorities"><RotateCcw className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {criteria.map((criterion) => <label key={criterion.key} className="block rounded-lg border border-border bg-muted/30 p-3.5">
          <span className="flex items-start justify-between gap-3">
            <span className="min-w-0"><span className="field-label block">{criterion.label}</span><span className="mt-0.5 block text-[12px] leading-4 text-muted-foreground">{criterion.question}</span></span>
            <span className="flex shrink-0 items-center gap-1"><Input type="number" min="0" max="100" aria-label={`${criterion.label} weight`} className="h-8 w-16 px-2 text-right" value={weights[criterion.key]} onChange={(event) => setWeights((current) => ({ ...current, [criterion.key]: Math.max(0, Math.min(100, Number(event.target.value))) }))} /><span className="text-[12px] text-muted-foreground">%</span></span>
          </span>
          <input type="range" min="0" max="100" step="1" aria-label={`${criterion.label} weight slider`} value={weights[criterion.key]} onChange={(event) => setWeights((current) => ({ ...current, [criterion.key]: Number(event.target.value) }))} className="mt-3 h-1.5 w-full cursor-pointer accent-primary" />
        </label>)}
      </div>
      {total !== 100 && <p role="alert" className="mt-4 text-[13px] text-danger">You need to add {Math.abs(100 - total)} more percentage points {total < 100 ? 'up' : 'down'} — or use “Make it total 100”.</p>}
    </section>

    {error && <ErrorState message={error} onRetry={loadComparison} />}
    {loading ? <InlineLoader label="Loading your saved comparison…" /> : !comparison ? <EmptyState icon={<GitCompareArrows className="h-5 w-5" />} title="No ranking calculated yet" description="Set your priorities above and run the comparison. ASAIP sends your weights to the backend and ranks this project’s actual alternatives." action={<Button disabled={total !== 100} loading={running} onClick={run}>Calculate the ranking</Button>} /> : <>
      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/[0.08] text-primary"><Check className="h-6 w-6" /></div>
          <div className="flex-1">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-primary">Ranks highest with your priorities</p>
            <h2 className="mt-1 text-[19px] font-semibold text-foreground">{winner?.architecture_name}</h2>
            <p className="mt-2 max-w-3xl text-[14px] leading-6 text-slate-600">{comparison.explanation}</p>
          </div>
          <div className="shrink-0 rounded-xl border border-border bg-muted/50 px-5 py-3 text-center">
            <p className="stat-value">{winner?.weighted_score.toFixed(2)}</p>
            <p className="mt-1 text-[12px] text-muted-foreground">out of 10</p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="panel p-5">
          <h2 className="section-title">How each option scores per priority</h2>
          <p className="section-hint">Higher reaches further out, on a scale of 1 to 10.</p>
          <div className="mt-3 h-[330px]"><ResponsiveContainer width="100%" height="100%"><RadarChart data={radarData} outerRadius="70%"><PolarGrid stroke="#ded9cf" /><PolarAngleAxis dataKey="criterion" tick={{ fill: '#55636f', fontSize: 12 }} /><PolarRadiusAxis domain={[0, 10]} tick={{ fill: '#a3a398', fontSize: 11 }} axisLine={false} /><Tooltip contentStyle={tooltipStyle} />{comparison.results.map((result, index) => <Radar key={result.architecture_id} name={result.architecture_name} dataKey={result.architecture_name} stroke={seriesColor(index)} fill={seriesColor(index)} fillOpacity={0.10} strokeWidth={2} />)}</RadarChart></ResponsiveContainer></div>
          <ChartLegend names={comparison.results.map((result) => result.architecture_name)} />
        </section>
        <section className="panel p-5">
          <h2 className="section-title">Overall ranking</h2>
          <p className="section-hint">Each option’s final score after your priorities are applied.</p>
          <div className="mt-3 h-[330px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={barData} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 0 }}><CartesianGrid stroke={chartGridColor} horizontal={false} /><XAxis type="number" domain={[0, 10]} tickLine={false} axisLine={{ stroke: '#ded9cf' }} /><YAxis type="category" dataKey="name" width={130} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#3d4a56' }} /><Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value} out of 10`, 'Final score']} cursor={{ fill: 'rgba(39,101,130,.05)' }} /><Bar dataKey="score" radius={[0, 6, 6, 0]} maxBarSize={30}>{barData.map((entry, index) => <Cell key={entry.name} fill={seriesColor(index)} />)}<LabelList dataKey="score" position="right" style={{ fill: '#3d4a56', fontSize: 12 }} /></Bar></BarChart></ResponsiveContainer></div>
          <p className="mt-2 flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-[13px] leading-5 text-muted-foreground"><Info className="mt-0.5 h-4 w-4 shrink-0" />Final score = each priority score multiplied by its weight, added together and divided by 100.</p>
        </section>
      </div>

      <section className="panel overflow-hidden">
        <div className="divider p-5"><h2 className="section-title">Full score breakdown</h2><p className="section-hint">The raw score for every priority, plus the final result and rank.</p></div>
        <div className="overflow-x-auto border-t border-border"><table className="w-full min-w-[850px] border-collapse text-left">
          <thead><tr className="bg-muted/40 text-[12px] text-muted-foreground"><th className="px-5 py-3 font-medium">Priority (weight)</th>{comparison.results.map((result) => <th key={result.architecture_id} className="px-4 py-3 font-medium"><span className="block max-w-48 truncate text-foreground">{result.architecture_name}</span></th>)}</tr></thead>
          <tbody className="divide-y divide-border">
            {criteria.map((criterion) => <tr key={criterion.key}><td className="px-5 py-3 text-[14px] text-slate-700">{criterion.label}<span className="ml-2 text-[12px] text-primary">{weights[criterion.key]}%</span></td>{comparison.results.map((result) => <td key={result.architecture_id} className="px-4 py-3 text-[14px] text-slate-700">{result.scores[criterion.key].toFixed(1)}<span className="ml-1 text-[12px] text-muted-foreground">/10</span></td>)}</tr>)}
            <tr className="bg-primary/[0.04]"><td className="px-5 py-4 text-[14px] font-semibold text-primary">Final score</td>{comparison.results.map((result) => <td key={result.architecture_id} className="px-4 py-4 text-[16px] font-semibold text-foreground">{result.weighted_score.toFixed(2)}</td>)}</tr>
            <tr><td className="px-5 py-4 text-[14px] font-semibold text-slate-700">Position</td>{comparison.results.map((result) => <td key={result.architecture_id} className="px-4 py-4"><Badge tone={result.rank === 1 ? 'green' : 'default'}>{result.rank === 1 ? 'Top choice' : `Number ${result.rank}`}</Badge></td>)}</tr>
          </tbody>
        </table></div>
      </section>

      <div className="grid gap-3 md:grid-cols-3">{[...comparison.results].sort((a, b) => a.rank - b.rank).map((result, index) => <div key={result.architecture_id} className={`rounded-xl border p-4 ${result.rank === 1 ? 'border-success/30 bg-success/[0.04]' : 'border-border bg-card'}`}>
        <div className="flex items-center justify-between gap-2"><span className="min-w-0 truncate text-[14px] font-medium text-foreground">{result.architecture_name}</span>{result.rank === 1 ? <Check className="h-4 w-4 shrink-0 text-success" /> : <span className="shrink-0 text-[13px] text-muted-foreground">#{result.rank}</span>}</div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${result.weighted_score * 10}%`, background: seriesColor(index) }} /></div>
        <p className="mt-2 text-[13px] text-muted-foreground">{result.weighted_score.toFixed(2)} out of 10 overall</p>
      </div>)}</div>
    </>}
  </div></ModuleState>;
}
function ChartLegend({ names }: { names: string[] }) {
  return <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2">{names.map((name, index) => <span key={name} className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground"><span className="h-2.5 w-2.5 rounded-full" style={{ background: seriesColor(index) }} />{name}</span>)}</div>;
}
