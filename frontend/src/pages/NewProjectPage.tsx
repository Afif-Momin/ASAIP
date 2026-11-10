import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Check, CheckCircle2, ClipboardList, Clock, Gauge, Layers3, Lightbulb, ListChecks,
  PencilLine, ShieldAlert, Users, WandSparkles,
} from 'lucide-react';
import { api, getErrorMessage } from '@/services/api';
import { useApp } from '@/context/AppContext';
import type { PlatformConfig, ProjectPayload, RequirementsAnalysis } from '@/types';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/common/PageHeader';
import { DataList } from '@/components/common/DataDisplay';
import { useToast } from '@/components/ui/toast';
import { engineLabel } from '@/lib/utils';

const initialForm: ProjectPayload = {
  name: '', description: '', domain: 'E-commerce', target_users: '', concurrent_users: 1000,
  daily_requests: 100000, functional_requirements: '', non_functional_requirements: '', budget: 1000000,
  team_size: 4, preferred_languages: '', cloud_provider: 'AWS', data_sensitivity: 'Medium',
  availability: '99.9%', growth: '5x over 24 months', deployment_preference: 'Cloud',
};
const demoForm: ProjectPayload = {
  name: 'Smart E-Commerce Platform',
  description: 'Develop an e-commerce platform for 50,000 registered users. The platform should support product browsing, user authentication, payment integration, inventory management, order tracking, and admin analytics. It must be scalable, secure, maintainable, and cost-efficient.',
  domain: 'E-commerce', target_users: '50,000 registered customers, support staff, and operations administrators',
  concurrent_users: 5000, daily_requests: 2000000,
  functional_requirements: 'Product catalog and search; shopping cart; secure user authentication; payment integration; order management and tracking; inventory management; admin dashboard and sales analytics; customer notifications.',
  non_functional_requirements: 'High availability; secure payment and customer data handling; responsive under peak traffic; scalable infrastructure; maintainable modular code; cost-efficient cloud deployment; auditability and observability.',
  budget: 2500000, team_size: 6, preferred_languages: 'TypeScript, Python', cloud_provider: 'AWS',
  data_sensitivity: 'High', availability: '99.9%', growth: '10x over 24 months', deployment_preference: 'Cloud-native containers',
};
const domains = ['E-commerce', 'Healthcare', 'FinTech', 'Education', 'SaaS', 'Social Media', 'IoT', 'AI/ML Applications', 'Custom'];
const stepNames = ['Describe your system', 'Review the analysis', 'Architecture options'];
type View = 'form' | 'analysis' | 'generating';
type AnalysisTab = 'summary' | 'requirements' | 'risks';

export default function NewProjectPage() {
  const [form, setForm] = useState<ProjectPayload>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [view, setView] = useState<View>('form');
  const [createdProjectId, setCreatedProjectId] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<RequirementsAnalysis | null>(null);
  const [analysisTab, setAnalysisTab] = useState<AnalysisTab>('summary');
  const [busy, setBusy] = useState(false);
  const [config, setConfig] = useState<PlatformConfig | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const { refreshProjects, selectProject, selectArchitecture } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();
  useEffect(() => { api.system.config().then(setConfig).catch(() => setConfig(null)); }, []);
  useEffect(() => {
    if (view !== 'generating') { setElapsed(0); return; }
    setElapsed(0);
    const timer = window.setInterval(() => setElapsed((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(timer);
  }, [view]);
  const update = <K extends keyof ProjectPayload>(key: K, value: ProjectPayload[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => { const next = { ...current }; delete next[key]; return next; });
  };
  const validate = () => {
    const next: Record<string, string> = {};
    if (form.name.trim().length < 3) next.name = 'Use at least 3 characters for the project name.';
    if (form.description.trim().length < 30) next.description = 'Describe the system in at least 30 characters.';
    if (!form.target_users.trim()) next.target_users = 'Say who will actually use this system.';
    if (form.concurrent_users < 1) next.concurrent_users = 'Expected concurrent users must be at least 1.';
    if (form.daily_requests < 1) next.daily_requests = 'Expected daily requests must be at least 1.';
    if (form.functional_requirements.trim().length < 10) next.functional_requirements = 'List the things the system must do.';
    if (form.non_functional_requirements.trim().length < 10) next.non_functional_requirements = 'Add quality needs such as security, speed, or availability.';
    if (form.budget < 0) next.budget = 'Budget cannot be negative.';
    if (form.team_size < 1) next.team_size = 'Team size must be at least 1.';
    setErrors(next);
    if (Object.keys(next).length) {
      document.querySelector<HTMLElement>('[role="alert"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    return true;
  };
  const analyze = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!validate()) { toast('Please fix the highlighted fields first.', 'error'); return; }
    setBusy(true);
    try {
      const project = createdProjectId
        ? await api.projects.update(createdProjectId, form)
        : await api.projects.create(form);
      setCreatedProjectId(project.id);
      selectProject(project.id);
      const result = await api.requirements.analyze(project.id);
      setAnalysis(result);
      setAnalysisTab('summary');
      setView('analysis');
      await refreshProjects();
      toast('Requirements analysed. Have a look before generating architectures.');
    } catch (err) { toast(getErrorMessage(err), 'error'); }
    finally { setBusy(false); }
  };
  const generate = async () => {
    if (!createdProjectId) return;
    setView('generating');
    try {
      const architectures = await api.architectures.generate(createdProjectId);
      await refreshProjects();
      selectProject(createdProjectId);
      selectArchitecture(architectures[0]?.id ?? null);
      toast(`${architectures.length} architecture options ready.`);
      navigate('/explorer');
    } catch (err) {
      setView('analysis');
      toast(getErrorMessage(err), 'error');
    }
  };
  const step = view === 'form' ? 0 : view === 'analysis' ? 1 : 2;
  const engine = engineLabel(analysis?.analysis_mode);
  const liveAi = analysis?.analysis_mode === 'ai';
  const modelName = config?.ai_model;

  return <div className="mx-auto max-w-5xl space-y-6 animate-fade-up">
    <PageHeader
      eyebrow={`Step ${step + 1} of 3 · ${stepNames[step]}`}
      title={view === 'form' ? createdProjectId ? 'Edit your requirements' : 'Tell ASAIP about your system' : view === 'analysis' ? 'Does this read like your system?' : 'Building your architecture options'}
      description={view === 'form'
        ? 'Describe the problem and the constraints. Do not worry about picking an architecture yet — that is what the next step is for.'
        : view === 'analysis'
          ? 'Check the extracted requirements, the gaps we found, and the open questions. Edit anything that looks wrong, then generate the architectures.'
          : 'ASAIP is choosing patterns that fit your workload, team, and budget, and scoring each one against seven criteria.'}
      actions={view === 'form' ? <Button variant="secondary" onClick={() => { setForm(demoForm); setErrors({}); setCreatedProjectId(null); setAnalysis(null); toast('Sample requirements loaded. Nothing is saved until you submit.', 'info'); }}><WandSparkles className="h-4 w-4" />Fill with a sample</Button> : undefined}
    />

    <ol className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-label={`Workflow step ${step + 1} of 3`}>
      {stepNames.map((label, index) => <li key={label} className="flex items-center gap-2">
        <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-[12px] font-semibold ${index < step ? 'border-success/30 bg-emerald-50 text-success' : index === step ? 'border-primary bg-primary text-primary-foreground' : 'border-slate-300 bg-white text-slate-400'}`}>{index < step ? <Check className="h-3.5 w-3.5" /> : index + 1}</span>
        <span className={`text-[13px] ${index === step ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{label}</span>
        {index < stepNames.length - 1 && <span className="ml-2 hidden h-px w-8 bg-slate-200 sm:block" />}
      </li>)}
    </ol>

    {view === 'form' && <form onSubmit={analyze} className="space-y-5" noValidate>
      <section className="rounded-xl border bg-card p-5 shadow-card sm:p-6">
        <h2 className="section-title flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" />About the system</h2>
        <p className="section-hint">Start with the problem you are solving, not with a technology you already like.</p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Field label="Project name" required error={errors.name}><Input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Smart E-Commerce Platform" maxLength={120} /></Field>
          <Field label="What kind of system is it?"><Select value={form.domain} onChange={(e) => update('domain', e.target.value)}>{domains.map((domain) => <option key={domain}>{domain}</option>)}</Select></Field>
          <Field label="Describe the system in your own words" required error={errors.description} hint="at least 30 characters" className="md:col-span-2"><Textarea value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="What should it do, who is it for, and what outcome matters most?" className="min-h-32" /></Field>
          <Field label="Who will use it?" required error={errors.target_users} className="md:col-span-2"><Input value={form.target_users} onChange={(e) => update('target_users', e.target.value)} placeholder="e.g. 50,000 customers, operations teams, and support staff" /></Field>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-card sm:p-6">
        <h2 className="section-title flex items-center gap-2"><Gauge className="h-4 w-4 text-primary" />Load, budget, and team</h2>
        <p className="section-hint">Rough numbers are fine for a proof of concept — they only steer which patterns make sense.</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Users online at the same time" required error={errors.concurrent_users}><Input type="number" min="1" value={form.concurrent_users} onChange={(e) => update('concurrent_users', Number(e.target.value))} /></Field>
          <Field label="Requests per day" required error={errors.daily_requests}><Input type="number" min="1" value={form.daily_requests} onChange={(e) => update('daily_requests', Number(e.target.value))} /></Field>
          <Field label="How much do you expect to grow?"><Input value={form.growth} onChange={(e) => update('growth', e.target.value)} placeholder="e.g. 5x over 24 months" /></Field>
          <Field label="Availability target"><Select value={form.availability} onChange={(e) => update('availability', e.target.value)}><option>99%</option><option>99.5%</option><option>99.9%</option><option>99.95%</option><option>99.99%</option></Select></Field>
          <Field label="Monthly budget (INR)" error={errors.budget}><Input type="number" min="0" value={form.budget} onChange={(e) => update('budget', Number(e.target.value))} /></Field>
          <Field label="People available to build it"><Input type="number" min="1" value={form.team_size} onChange={(e) => update('team_size', Number(e.target.value))} /></Field>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-card sm:p-6">
        <h2 className="section-title flex items-center gap-2"><ListChecks className="h-4 w-4 text-primary" />Requirements</h2>
        <p className="section-hint">Write one item per line, or separate them with semicolons. ASAIP structures them for you.</p>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <Field label="What the system must do" required error={errors.functional_requirements} hint="functional"><Textarea value={form.functional_requirements} onChange={(e) => update('functional_requirements', e.target.value)} placeholder="User registration; product search; payment processing; order tracking; admin reporting" /></Field>
          <Field label="How well it must do it" required error={errors.non_functional_requirements} hint="non-functional"><Textarea value={form.non_functional_requirements} onChange={(e) => update('non_functional_requirements', e.target.value)} placeholder="Secure authentication; sub-second reads; high availability; easy maintenance; audit logging" /></Field>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-card sm:p-6">
        <h2 className="section-title flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Delivery constraints</h2>
        <p className="section-hint">Recommendations are grounded in your team, languages, and operating environment.</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Languages you prefer"><Input value={form.preferred_languages} onChange={(e) => update('preferred_languages', e.target.value)} placeholder="TypeScript, Python" /></Field>
          <Field label="Preferred cloud"><Select value={form.cloud_provider} onChange={(e) => update('cloud_provider', e.target.value)}><option>AWS</option><option>Azure</option><option>GCP</option><option>On-premises</option><option>No preference</option></Select></Field>
          <Field label="How sensitive is the data?"><Select value={form.data_sensitivity} onChange={(e) => update('data_sensitivity', e.target.value)}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></Select></Field>
          <Field label="How do you want to deploy it?" className="lg:col-span-2"><Input value={form.deployment_preference} onChange={(e) => update('deployment_preference', e.target.value)} placeholder="Cloud, on-premises, hybrid, containers" /></Field>
        </div>
      </section>

      <div className="sticky bottom-3 z-10 flex flex-col items-start justify-between gap-3 rounded-xl border bg-card p-4 shadow-raised sm:flex-row sm:items-center">
        <p className="text-[13px] leading-5 text-muted-foreground">Saving to the backend happens before analysis. Your browser never holds an API key.</p>
        <Button type="submit" loading={busy} size="lg">{createdProjectId ? 'Save changes and analyse again' : 'Save and analyse requirements'}<ArrowRight className="h-4 w-4" /></Button>
      </div>
    </form>}

    {view === 'analysis' && analysis && <div className="space-y-5">
      <section className="rounded-xl border bg-card p-5 shadow-card sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={engine.tone === 'demo' ? 'cyan' : engine.tone === 'ai' ? 'violet' : 'default'}>{engine.label}</Badge>
              <Badge tone="green"><CheckCircle2 className="h-3.5 w-3.5" />Analysis complete</Badge>
            </div>
            <h2 className="mt-3 text-[17px] font-semibold text-foreground">What ASAIP understood</h2>
            <p className="mt-2 max-w-4xl text-[14px] leading-6 text-slate-700">{analysis.summary}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setView('form')}><PencilLine className="h-3.5 w-3.5" />Edit requirements</Button>
        </div>
      </section>

      <div className="flex gap-1 overflow-x-auto rounded-lg border bg-slate-100 p-1" role="tablist" aria-label="Requirements analysis views">
        {([
          { id: 'summary', label: 'Constraints and gaps', icon: Gauge },
          { id: 'requirements', label: 'Requirement list', icon: ListChecks },
          { id: 'risks', label: 'Risks and questions', icon: ShieldAlert },
        ] as const).map((tab) => <button key={tab.id} role="tab" aria-selected={analysisTab === tab.id} onClick={() => setAnalysisTab(tab.id)} className={`flex h-9 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 text-[13px] font-medium transition ${analysisTab === tab.id ? 'bg-white text-foreground shadow-card' : 'text-slate-600 hover:text-foreground'}`}><tab.icon className="h-4 w-4" />{tab.label}</button>)}
      </div>

      {analysisTab === 'summary' && <div className="grid gap-4 md:grid-cols-2">
        <AnalysisCard title="Constraints we must respect" icon={<Gauge className="h-4 w-4" />} items={analysis.constraints} />
        <AnalysisCard title="Still missing from your brief" icon={<Lightbulb className="h-4 w-4" />} items={analysis.missing_requirements} tone="warning" empty="Nothing obviously missing — a good sign." />
      </div>}
      {analysisTab === 'requirements' && <div className="grid gap-4 lg:grid-cols-2">
        <AnalysisCard title={`What the system must do (${analysis.functional_requirements.length})`} icon={<ListChecks className="h-4 w-4" />} items={analysis.functional_requirements} tone="positive" />
        <AnalysisCard title={`How well it must do it (${analysis.non_functional_requirements.length})`} icon={<Gauge className="h-4 w-4" />} items={analysis.non_functional_requirements} tone="positive" />
      </div>}
      {analysisTab === 'risks' && <div className="grid gap-4 md:grid-cols-2">
        <AnalysisCard title="Risks worth planning for" icon={<ShieldAlert className="h-4 w-4" />} items={analysis.risks} tone="danger" />
        <AnalysisCard title="Questions to answer with the group" icon={<Users className="h-4 w-4" />} items={analysis.questions} />
      </div>}

      <div className="flex flex-col items-start justify-between gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-[15px] font-semibold text-foreground">Ready for architecture options?</h3>
          <p className="mt-1 text-[13px] leading-5 text-muted-foreground">You will get at least three genuinely different proposals — not an automatic microservices answer.</p>
        </div>
        <Button size="lg" onClick={generate}><Layers3 className="h-4 w-4" />Generate architectures<ArrowRight className="h-4 w-4" /></Button>
      </div>
    </div>}

    {view === 'generating' && <section className="flex min-h-[380px] flex-col items-center justify-center rounded-xl border bg-card px-6 text-center shadow-card" role="status" aria-live="polite">
      <span className="mb-5 h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
      <h2 className="text-[17px] font-semibold text-foreground">Designing your architecture options</h2>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Badge tone={liveAi ? 'violet' : 'cyan'}>{liveAi ? 'Live AI' : 'Built-in engine'}</Badge>
        {liveAi && modelName && <Badge>{modelName}</Badge>}
        <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground"><Clock className="h-3.5 w-3.5" />{elapsed}s elapsed</span>
      </div>
      <p className="mt-3 max-w-lg text-[14px] leading-6 text-muted-foreground">{liveAi
        ? 'Each option is designed separately by the AI model. Free models usually take 30–90 seconds, and ASAIP automatically tries backup models if one is busy. This page opens the explorer as soon as the options are ready.'
        : 'The built-in engine is choosing patterns, mapping components, and scoring each option against your requirements. This completes in a moment.'}</p>
      <ul className="mt-6 grid w-full max-w-xl gap-2 text-left sm:grid-cols-3">
        {['Matching patterns to your load and team', 'Drawing the components and connections', 'Scoring cost, scale, and maintainability'].map((label) => <li key={label} className="rounded-lg border bg-slate-50 p-3 text-[13px] leading-5 text-slate-700">{label}</li>)}
      </ul>
    </section>}
  </div>;
}

function AnalysisCard({ title, icon, items, tone = 'default', empty }: {
  title: string; icon: React.ReactNode; items: string[]; tone?: 'default' | 'positive' | 'warning' | 'danger'; empty?: string;
}) {
  return <section className="rounded-xl border bg-card p-5 shadow-card">
    <h3 className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-foreground"><span className="text-slate-400">{icon}</span>{title}</h3>
    <DataList items={items || []} tone={tone} empty={empty} />
  </section>;
}
