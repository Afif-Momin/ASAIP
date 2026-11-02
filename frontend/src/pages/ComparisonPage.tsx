import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Bar, BarChart, CartesianGrid, Cell, PolarAngleAxis, PolarGrid, Radar,
  RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Award, Check, GitCompareArrows, Info, RotateCcw, Scale, SlidersHorizontal, Trophy } from 'lucide-react';
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

const criteria: Array<{ key: ScoreKey; label: string; short: string }> = [
  { key: 'scalability', label: 'Scalability', short: 'Scale' }, { key: 'security', label: 'Security', short: 'Security' },
  { key: 'maintainability', label: 'Maintainability', short: 'Maintain' }, { key: 'cost_efficiency', label: 'Cost Efficiency', short: 'Cost' },
  { key: 'reliability', label: 'Reliability', short: 'Reliability' }, { key: 'performance', label: 'Performance', short: 'Speed' },
  { key: 'development_complexity', label: 'Development Complexity', short: 'Dev ease' },
];
const defaults: ArchitectureWeights = { scalability: 20, security: 20, maintainability: 15, cost_efficiency: 20, reliability: 10, performance: 10, development_complexity: 5 };
const colors = ['#818cf8', '#22d3ee', '#a78bfa', '#34d399', '#fbbf24'];

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
    const difference = 100 - criteria.reduce((acc, criterion) => acc + normalized[criterion.key], 0);
    normalized.cost_efficiency += difference;
    setWeights(normalized);
    toast('Weights normalized to 100%.', 'info');
  };
  const run = async () => {
    if (!selectedProject || total !== 100) return;
    setRunning(true); setError(null);
    try {
      const result = await api.comparison.run(selectedProject.id, weights);
      setComparison(result);
      toast('Decision matrix recalculated with your weights.');
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
    <PageHeader eyebrow="Weighted decision analysis" title="Comparison & Decision Matrix" description="Make the trade-off explicit. Adjust what matters most, recalculate weighted scores, and inspect why an architecture wins." actions={<Button onClick={run} loading={running} disabled={total !== 100 || !selectedProject?.architectures.length}><GitCompareArrows className="h-4 w-4" />Run comparison</Button>} />
    <WorkspaceSelectors architecture={false} />
    <section className="rounded-xl border border-white/[0.075] bg-card p-5 shadow-card">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="flex items-center gap-2 font-display text-sm font-semibold text-slate-200"><SlidersHorizontal className="h-4 w-4 text-indigo-400" />Decision criteria weights</h2><p className="mt-1 text-[10px] text-slate-600">Scores use a 1–10 scale. Weights must total exactly 100%.</p></div><div className="flex items-center gap-2"><span className={`rounded-lg border px-3 py-2 text-xs font-semibold ${total === 100 ? 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300' : 'border-rose-500/20 bg-rose-500/[0.06] text-rose-300'}`}>{total}% / 100%</span><Button size="sm" variant="outline" onClick={normalize}><Scale className="h-3.5 w-3.5" />Normalize</Button><Button size="sm" variant="ghost" onClick={() => setWeights(defaults)} aria-label="Reset default weights"><RotateCcw className="h-3.5 w-3.5" /></Button></div></div>
      <div className="mt-5 grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{criteria.map((criterion) => <label key={criterion.key} className="rounded-lg border border-white/[0.055] bg-white/[0.015] p-3"><span className="flex items-center justify-between gap-3"><span className="text-[10px] font-medium text-slate-400">{criterion.label}</span><span className="flex items-center gap-1"><Input type="number" min="0" max="100" aria-label={`${criterion.label} weight`} className="h-7 w-16 px-2 text-right text-[11px]" value={weights[criterion.key]} onChange={(event) => setWeights((current) => ({ ...current, [criterion.key]: Math.max(0, Math.min(100, Number(event.target.value))) }))} /><span className="text-[10px] text-slate-600">%</span></span></span><input type="range" min="0" max="100" step="1" aria-label={`${criterion.label} weight slider`} value={weights[criterion.key]} onChange={(event) => setWeights((current) => ({ ...current, [criterion.key]: Number(event.target.value) }))} className="mt-3 h-1 w-full cursor-pointer accent-indigo-500" /></label>)}</div>
      {total !== 100 && <p role="alert" className="mt-4 text-[11px] text-rose-400">Adjust weights by {Math.abs(100 - total)} percentage points {total < 100 ? 'up' : 'down'}, or use Normalize.</p>}
    </section>
    {error && <ErrorState message={error} onRetry={loadComparison} />}
    {loading ? <InlineLoader label="Loading saved comparison…" /> : !comparison ? <EmptyState icon={<GitCompareArrows className="h-5 w-5" />} title="No comparison calculated yet" description="Set your priorities above, then run the comparison. ASAIP will send the weights to the backend and rank this project’s actual alternatives." action={<Button disabled={total !== 100} loading={running} onClick={run}>Calculate weighted ranking</Button>} /> : <>
      <section className="relative overflow-hidden rounded-xl border border-indigo-500/20 bg-indigo-500/[0.04] p-5 sm:p-6"><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/[0.07] text-amber-300"><Trophy className="h-5 w-5" /></div><div className="flex-1"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-400">Recommended architecture</p><h2 className="mt-1.5 font-display text-lg font-semibold text-slate-100">{winner?.architecture_name}</h2><p className="mt-2 text-xs leading-6 text-slate-400">{comparison.explanation}</p></div><div className="shrink-0 rounded-xl border border-white/[0.08] bg-black/10 px-5 py-3 text-center"><p className="font-display text-2xl font-semibold text-slate-100">{winner?.weighted_score.toFixed(2)}</p><p className="mt-1 text-[9px] uppercase tracking-wider text-slate-600">Weighted score / 10</p></div></div></section>
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-xl border border-white/[0.075] bg-card p-5 shadow-card"><div><h2 className="font-display text-sm font-semibold text-slate-200">Criteria profile</h2><p className="mt-1 text-[10px] text-slate-600">Architecture scores across all seven criteria</p></div><div className="mt-3 h-[330px]"><ResponsiveContainer width="100%" height="100%"><RadarChart data={radarData} outerRadius="70%"><PolarGrid stroke="#273244" /><PolarAngleAxis dataKey="criterion" tick={{ fill: '#718096', fontSize: 10 }} /><Tooltip contentStyle={{ background: '#111722', border: '1px solid #293244', borderRadius: 8, fontSize: 11 }} />{comparison.results.map((result, index) => <Radar key={result.architecture_id} name={result.architecture_name} dataKey={result.architecture_name} stroke={colors[index % colors.length]} fill={colors[index % colors.length]} fillOpacity={0.09} strokeWidth={1.8} />)}</RadarChart></ResponsiveContainer></div><ChartLegend names={comparison.results.map((result) => result.architecture_name)} /></section>
        <section className="rounded-xl border border-white/[0.075] bg-card p-5 shadow-card"><div><h2 className="font-display text-sm font-semibold text-slate-200">Weighted ranking</h2><p className="mt-1 text-[10px] text-slate-600">Overall score after applying your priorities</p></div><div className="mt-3 h-[330px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={barData} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}><CartesianGrid stroke="#202939" horizontal={false} /><XAxis type="number" domain={[0, 10]} tickLine={false} axisLine={false} /><YAxis type="category" dataKey="name" width={115} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} /><Tooltip contentStyle={{ background: '#111722', border: '1px solid #293244', borderRadius: 8, fontSize: 11 }} formatter={(value) => [`${value} / 10`, 'Weighted score']} /><Bar dataKey="score" radius={[0, 5, 5, 0]} maxBarSize={28}>{barData.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}</Bar></BarChart></ResponsiveContainer></div><div className="flex items-center gap-2 rounded-lg bg-white/[0.02] p-3 text-[10px] leading-4 text-slate-600"><Info className="h-3.5 w-3.5 shrink-0" />Weighted Score = Σ (criterion score × criterion weight) / 100</div></section>
      </div>
      <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-card shadow-card"><div className="border-b border-white/[0.06] p-5"><h2 className="font-display text-sm font-semibold text-slate-200">Weighted decision matrix</h2><p className="mt-1 text-[10px] text-slate-600">Raw criterion scores, final weighted score, and rank</p></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] border-collapse text-left"><thead><tr className="bg-white/[0.018] text-[9px] uppercase tracking-wider text-slate-600"><th className="px-5 py-3 font-medium">Criterion / weight</th>{comparison.results.map((result) => <th key={result.architecture_id} className="px-4 py-3 font-medium"><span className="block max-w-40 truncate normal-case tracking-normal text-slate-300">{result.architecture_name}</span></th>)}</tr></thead><tbody className="divide-y divide-white/[0.055]">{criteria.map((criterion) => <tr key={criterion.key}><td className="px-5 py-3 text-[11px] text-slate-400">{criterion.label}<span className="ml-2 text-[9px] text-indigo-400">{weights[criterion.key]}%</span></td>{comparison.results.map((result) => <td key={result.architecture_id} className="px-4 py-3 text-xs text-slate-300">{result.scores[criterion.key].toFixed(1)}<span className="ml-1 text-[9px] text-slate-700">/10</span></td>)}</tr>)}<tr className="bg-indigo-500/[0.025]"><td className="px-5 py-4 text-[11px] font-semibold text-indigo-300">Weighted score</td>{comparison.results.map((result) => <td key={result.architecture_id} className="px-4 py-4 font-display text-sm font-semibold text-slate-100">{result.weighted_score.toFixed(2)}</td>)}</tr><tr><td className="px-5 py-4 text-[11px] font-semibold text-slate-400">Overall rank</td>{comparison.results.map((result) => <td key={result.architecture_id} className="px-4 py-4"><Badge tone={result.rank === 1 ? 'green' : 'default'}>{result.rank === 1 && <Award className="h-3 w-3" />}#{result.rank}</Badge></td>)}</tr></tbody></table></div></section>
      <div className="grid gap-3 md:grid-cols-3">{[...comparison.results].sort((a, b) => a.rank - b.rank).map((result) => <div key={result.architecture_id} className={`rounded-xl border p-4 ${result.rank === 1 ? 'border-emerald-500/20 bg-emerald-500/[0.025]' : 'border-white/[0.07] bg-card'}`}><div className="flex items-center justify-between"><span className="text-xs font-medium text-slate-300">{result.architecture_name}</span>{result.rank === 1 ? <Check className="h-4 w-4 text-emerald-400" /> : <span className="text-[10px] text-slate-600">Rank #{result.rank}</span>}</div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${result.weighted_score * 10}%` }} /></div><p className="mt-2 text-[10px] text-slate-600">{result.weighted_score.toFixed(2)} weighted architecture score</p></div>)}</div>
    </>}
  </div></ModuleState>;
}
function ChartLegend({ names }: { names: string[] }) {
  return <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">{names.map((name, index) => <span key={name} className="inline-flex items-center gap-1.5 text-[9px] text-slate-500"><span className="h-1.5 w-1.5 rounded-full" style={{ background: colors[index % colors.length] }} />{name}</span>)}</div>;
}
