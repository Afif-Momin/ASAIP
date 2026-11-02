import { useEffect, useMemo, useState } from 'react';
import { AlertOctagon, ArrowUpRight, CheckCircle2, ChevronDown, CircleAlert, Clock3, Component, Lightbulb, ShieldCheck, Sparkles, Wrench } from 'lucide-react';
import { api, getErrorMessage } from '@/services/api';
import { useApp } from '@/context/AppContext';
import type { CriticReview } from '@/types';
import { ModuleState } from '@/components/common/ModuleState';
import { PageHeader } from '@/components/common/PageHeader';
import { WorkspaceSelectors } from '@/components/common/WorkspaceSelectors';
import { EmptyState, ErrorState } from '@/components/common/States';
import { ScoreRing } from '@/components/common/DataDisplay';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/format';
import { useToast } from '@/components/ui/toast';
import { engineLabel } from '@/lib/utils';

const severities = ['All', 'Critical', 'High', 'Medium', 'Low'];
export default function CriticPage() {
  const { selectedArchitecture } = useApp();
  const [review, setReview] = useState<CriticReview | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [severity, setSeverity] = useState('All');
  const [expanded, setExpanded] = useState<number[]>([]);
  const { toast } = useToast();
  useEffect(() => { setReview(null); setError(null); setSeverity('All'); setExpanded([]); }, [selectedArchitecture?.id]);
  const runReview = async () => {
    if (!selectedArchitecture) return;
    setRunning(true); setError(null);
    try {
      const result = await api.critic.review(selectedArchitecture.id);
      setReview(result); setExpanded(result.issues.map((_, index) => index));
      toast(`Fresh review complete: ${result.issues.length} finding${result.issues.length === 1 ? '' : 's'}.`);
    } catch (err) { const message = getErrorMessage(err); setError(message); toast(message, 'error'); }
    finally { setRunning(false); }
  };
  const filtered = useMemo(() => review?.issues.filter((issue) => severity === 'All' || issue.severity.toLowerCase() === severity.toLowerCase()) || [], [review, severity]);
  const engine = engineLabel(review?.analysis_mode);
  return <ModuleState><div className="space-y-6 animate-fade-up">
    <PageHeader eyebrow="Independent design review" title="Architecture Critic" description="Challenge the recommendation. Run a fresh review to expose failure modes, security gaps, operational risks, and unnecessary complexity—with concrete fixes." actions={<Button onClick={runReview} loading={running} disabled={!selectedArchitecture}><ShieldCheck className="h-4 w-4" />{review ? 'Run fresh review' : 'Run architecture review'}</Button>} />
    <WorkspaceSelectors />
    {error && <ErrorState title="Architecture review failed" message={error} onRetry={runReview} />}
    {!review && !running && <EmptyState icon={<ShieldCheck className="h-5 w-5" />} title={`Review ${selectedArchitecture?.name || 'this architecture'}`} description="The critic evaluates the selected architecture on demand. Findings are not prefilled or inferred in the browser; run a review to retrieve actual backend analysis." action={<Button onClick={runReview}><Sparkles className="h-4 w-4" />Run architecture review</Button>} />}
    {running && <section className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-white/[0.075] bg-card text-center" role="status"><div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-800 border-t-indigo-400" /><h2 className="mt-5 text-sm font-semibold text-slate-300">Challenging the design…</h2><p className="mt-2 max-w-md text-xs leading-5 text-slate-600">Inspecting components and strategies for reliability, security, scalability, cost, and maintainability risks.</p></section>}
    {review && !running && <>
      <section className="grid gap-5 rounded-xl border border-white/[0.075] bg-card p-5 shadow-card md:grid-cols-[auto_1fr] md:items-center sm:p-6">
        <div className="flex justify-center"><ScoreRing value={review.risk_score} label="Risk / 100" size="lg" tone="risk" /></div>
        <div><div className="flex flex-wrap items-center gap-2"><Badge tone={review.risk_score >= 70 ? 'rose' : review.risk_score >= 40 ? 'amber' : 'green'}>{review.risk_score >= 70 ? 'Elevated design risk' : review.risk_score >= 40 ? 'Moderate design risk' : 'Managed design risk'}</Badge><Badge tone={engine.tone === 'demo' ? 'cyan' : engine.tone === 'ai' ? 'violet' : 'default'}>{engine.label}</Badge></div><h2 className="mt-4 font-display text-base font-semibold text-slate-200">Review summary</h2><p className="mt-2 max-w-4xl text-xs leading-6 text-slate-400">{review.summary}</p><p className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-600"><Clock3 className="h-3 w-3" />Reviewed {formatDateTime(review.reviewed_at)} · {review.issues.length} findings</p></div>
      </section>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{severities.slice(1).map((level) => { const count = review.issues.filter((issue) => issue.severity.toLowerCase() === level.toLowerCase()).length; return <button key={level} onClick={() => setSeverity(severity === level ? 'All' : level)} className={`rounded-xl border p-4 text-left transition ${severity === level ? 'border-indigo-500/35 bg-indigo-500/[0.06]' : 'border-white/[0.07] bg-card hover:border-white/[0.14]'}`}><div className="flex items-center justify-between"><SeverityBadge severity={level} /><span className="font-display text-xl font-semibold text-slate-200">{count}</span></div><p className="mt-2 text-[9px] text-slate-600">{count ? `Show ${level.toLowerCase()} priority findings` : `No ${level.toLowerCase()} findings`}</p></button>; })}</div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-display text-sm font-semibold text-slate-200">Actionable findings</h2><p className="mt-1 text-[10px] text-slate-600">Every issue includes impact, remediation, and expected improvement.</p></div><div className="flex gap-1 overflow-x-auto rounded-lg border border-white/[0.07] p-1">{severities.map((item) => <button key={item} onClick={() => setSeverity(item)} className={`rounded-md px-3 py-1.5 text-[10px] font-medium ${severity === item ? 'bg-slate-800 text-slate-200' : 'text-slate-600 hover:text-slate-300'}`}>{item}</button>)}</div></div>
      {!filtered.length ? <EmptyState icon={<CheckCircle2 className="h-5 w-5" />} title={`No ${severity.toLowerCase()} findings`} description="The fresh review did not identify issues at this severity. Choose another filter to inspect the remaining findings." action={<Button variant="outline" onClick={() => setSeverity('All')}>Show all findings</Button>} /> : <div className="space-y-3">{filtered.map((issue) => {
        const originalIndex = review.issues.indexOf(issue);
        const isOpen = expanded.includes(originalIndex);
        return <article key={`${originalIndex}-${issue.title}`} className="overflow-hidden rounded-xl border border-white/[0.075] bg-card shadow-card">
          <button className="flex w-full items-start gap-3 p-5 text-left hover:bg-white/[0.015] sm:items-center" onClick={() => setExpanded((current) => isOpen ? current.filter((index) => index !== originalIndex) : [...current, originalIndex])} aria-expanded={isOpen}>
            <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:mt-0 ${issue.severity.toLowerCase() === 'critical' || issue.severity.toLowerCase() === 'high' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}><AlertOctagon className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-slate-200">{issue.title}</span><SeverityBadge severity={issue.severity} /></span><span className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-600"><Component className="h-3 w-3" />{issue.affected_component}</span></span><ChevronDown className={`h-4 w-4 shrink-0 text-slate-600 transition ${isOpen ? 'rotate-180' : ''}`} />
          </button>
          {isOpen && <div className="border-t border-white/[0.06] px-5 py-5 animate-fade-in"><div className="grid gap-5 lg:grid-cols-2"><Finding icon={<CircleAlert className="h-3.5 w-3.5" />} title="What the critic found" text={issue.explanation} /><Finding icon={<ArrowUpRight className="h-3.5 w-3.5" />} title="Why it matters" text={issue.why_it_matters} /></div><div className="mt-5 grid gap-4 rounded-lg border border-emerald-500/10 bg-emerald-500/[0.025] p-4 lg:grid-cols-2"><Finding icon={<Wrench className="h-3.5 w-3.5" />} title="Recommended fix" text={issue.recommended_fix} /><Finding icon={<Lightbulb className="h-3.5 w-3.5" />} title="Expected improvement" text={issue.expected_improvement} /></div></div>}
        </article>;
      })}</div>}
    </>}
  </div></ModuleState>;
}
function SeverityBadge({ severity }: { severity: string }) {
  const normalized = severity.toLowerCase();
  return <Badge tone={normalized === 'critical' || normalized === 'high' ? 'rose' : normalized === 'medium' ? 'amber' : 'default'}>{severity}</Badge>;
}
function Finding({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div><h3 className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{icon}{title}</h3><p className="mt-2 text-[11px] leading-5 text-slate-400">{text}</p></div>;
}
