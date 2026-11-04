import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, CheckCircle2, ChevronDown, CircleAlert, Clock3, Layers, Lightbulb, ShieldCheck, Wrench } from 'lucide-react';
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
      toast(result.issues.length ? `Review complete — ${result.issues.length} thing${result.issues.length === 1 ? '' : 's'} to look at.` : 'Review complete — nothing worth flagging.');
    } catch (err) { const message = getErrorMessage(err); setError(message); toast(message, 'error'); }
    finally { setRunning(false); }
  };
  const filtered = useMemo(() => review?.issues.filter((issue) => severity === 'All' || issue.severity.toLowerCase() === severity.toLowerCase()) || [], [review, severity]);
  const engine = engineLabel(review?.analysis_mode);
  return <ModuleState><div className="space-y-6 animate-fade-up">
    <PageHeader eyebrow="A second opinion on your design" title="Architecture review" description="Ask ASAIP to argue against the option you selected. It looks for things that could fail in production — security gaps, single points of failure, hidden cost and needless complexity — and explains how to fix each one." actions={<Button onClick={runReview} loading={running} disabled={!selectedArchitecture}><ShieldCheck className="h-4 w-4" />{review ? 'Run another review' : 'Review this architecture'}</Button>} />
    <WorkspaceSelectors />
    {error && <ErrorState title="The review did not finish" message={error} onRetry={runReview} />}
    {!review && !running && <EmptyState icon={<ShieldCheck className="h-5 w-5" />} title={`Have ${selectedArchitecture?.name || 'this architecture'} challenged`} description="Nothing is guessed in the browser — press the button and ASAIP runs a real review against the backend for the architecture you selected." action={<Button onClick={runReview}><ShieldCheck className="h-4 w-4" />Review this architecture</Button>} />}
    {running && <section className="flex min-h-72 flex-col items-center justify-center rounded-xl border bg-card text-center" role="status"><div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-primary" /><h2 className="mt-5 text-[15px] font-semibold text-foreground">Looking for what could go wrong…</h2><p className="mt-2 max-w-md text-[14px] leading-6 text-muted-foreground">Checking reliability, security, scalability, cost and maintainability across every component in the design.</p></section>}
    {review && !running && <>
      <section className="panel grid gap-5 p-5 md:grid-cols-[auto_1fr] md:items-center sm:p-6">
        <div className="flex justify-center"><ScoreRing value={review.risk_score} label="Risk out of 100" size="lg" tone="risk" /></div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={review.risk_score >= 70 ? 'rose' : review.risk_score >= 40 ? 'amber' : 'green'}>{review.risk_score >= 70 ? 'Worth taking seriously before you build' : review.risk_score >= 40 ? 'Some things to sort out' : 'Risk looks manageable'}</Badge>
            <Badge tone={engine.tone === 'ai' ? 'violet' : engine.tone === 'demo' ? 'cyan' : 'default'}>{engine.label}</Badge>
          </div>
          <h2 className="mt-4 text-[16px] font-semibold text-foreground">In plain words</h2>
          <p className="mt-2 max-w-4xl text-[14px] leading-6 text-slate-700">{review.summary}</p>
          <p className="mt-3 flex items-center gap-1.5 text-[13px] text-muted-foreground"><Clock3 className="h-4 w-4" />Reviewed {formatDateTime(review.reviewed_at)} · {review.issues.length} finding{review.issues.length === 1 ? '' : 's'}</p>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{severities.slice(1).map((level) => { const count = review.issues.filter((issue) => issue.severity.toLowerCase() === level.toLowerCase()).length; return <button key={level} onClick={() => setSeverity(severity === level ? 'All' : level)} aria-pressed={severity === level} className={`rounded-xl border p-4 text-left transition ${severity === level ? 'border-primary/40 bg-primary/[0.05] shadow-card' : 'border-border bg-card hover:border-slate-300'}`}>
        <div className="flex items-center justify-between"><SeverityBadge severity={level} /><span className="text-[22px] font-semibold leading-none text-foreground">{count}</span></div>
        <p className="mt-2.5 text-[13px] text-muted-foreground">{count ? `Show only ${level.toLowerCase()} findings` : `No ${level.toLowerCase()} findings`}</p>
      </button>; })}</div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 className="section-title">What to look at</h2><p className="section-hint">Each finding explains the problem, why it matters, and what to do about it.</p></div>
        <div className="flex gap-1 overflow-x-auto rounded-lg border bg-muted/40 p-1">{severities.map((item) => <button key={item} onClick={() => setSeverity(item)} aria-pressed={severity === item} className={`whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-medium ${severity === item ? 'bg-white text-foreground shadow-card' : 'text-muted-foreground hover:text-foreground'}`}>{item === 'All' ? 'All findings' : item}</button>)}</div>
      </div>

      {!filtered.length ? <EmptyState icon={<CheckCircle2 className="h-5 w-5" />} title={`No ${severity.toLowerCase()} findings`} description="This review did not flag anything at that level. Choose another filter to see the rest." action={<Button variant="outline" onClick={() => setSeverity('All')}>Show all findings</Button>} /> : <div className="space-y-3">{filtered.map((issue) => {
        const originalIndex = review.issues.indexOf(issue);
        const isOpen = expanded.includes(originalIndex);
        const serious = ['critical', 'high'].includes(issue.severity.toLowerCase());
        return <article key={`${originalIndex}-${issue.title}`} className="panel overflow-hidden">
          <button className="flex w-full items-start gap-3 p-5 text-left hover:bg-muted/30 sm:items-center" onClick={() => setExpanded((current) => isOpen ? current.filter((index) => index !== originalIndex) : [...current, originalIndex])} aria-expanded={isOpen}>
            <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:mt-0 ${serious ? 'bg-red-100 text-danger' : 'bg-amber-100 text-warning'}`}><CircleAlert className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="text-[15px] font-semibold text-foreground">{issue.title}</span><SeverityBadge severity={issue.severity} /></span><span className="mt-1.5 flex items-center gap-1.5 text-[13px] text-muted-foreground"><Layers className="h-4 w-4" />{issue.affected_component}</span></span>
            <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${isOpen ? 'rotate-180' : ''}`} />
          </button>
          {isOpen && <div className="divider border-t bg-muted/20 px-5 py-5 animate-fade-in">
            <div className="grid gap-5 lg:grid-cols-2">
              <Finding icon={<CircleAlert className="h-4 w-4" />} title="What we found" text={issue.explanation} />
              <Finding icon={<ArrowUpRight className="h-4 w-4" />} title="Why it matters" text={issue.why_it_matters} />
            </div>
            <div className="mt-5 grid gap-5 rounded-lg border border-primary/20 bg-white p-4 lg:grid-cols-2">
              <Finding icon={<Wrench className="h-4 w-4" />} title="What to do about it" text={issue.recommended_fix} />
              <Finding icon={<Lightbulb className="h-4 w-4" />} title="What you gain by fixing it" text={issue.expected_improvement} />
            </div>
          </div>}
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
  return <div><h3 className="flex items-center gap-2 text-[13px] font-semibold text-foreground">{icon}{title}</h3><p className="mt-1.5 text-[14px] leading-6 text-slate-700">{text}</p></div>;
}
