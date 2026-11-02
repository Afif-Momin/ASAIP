import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Braces, Check, CheckCircle2, ClipboardList, Cloud,
  FileSearch, Gauge, Layers3, Lightbulb, ListChecks, PencilLine, Rocket,
  ShieldAlert, Sparkles, Users, WandSparkles,
} from 'lucide-react';
import { api, getErrorMessage } from '@/services/api';
import { useApp } from '@/context/AppContext';
import type { ProjectPayload, RequirementsAnalysis } from '@/types';
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
type View = 'form' | 'analysis' | 'generating';
type AnalysisTab = 'overview' | 'requirements' | 'risks';

export default function NewProjectPage() {
  const [form, setForm] = useState<ProjectPayload>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [view, setView] = useState<View>('form');
  const [createdProjectId, setCreatedProjectId] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<RequirementsAnalysis | null>(null);
  const [analysisTab, setAnalysisTab] = useState<AnalysisTab>('overview');
  const [busy, setBusy] = useState(false);
  const { refreshProjects, selectProject, selectArchitecture } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();
  const update = <K extends keyof ProjectPayload>(key: K, value: ProjectPayload[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => { const next = { ...current }; delete next[key]; return next; });
  };
  const validate = () => {
    const next: Record<string, string> = {};
    if (form.name.trim().length < 3) next.name = 'Use at least 3 characters for the project name.';
    if (form.description.trim().length < 30) next.description = 'Describe the system in at least 30 characters.';
    if (!form.target_users.trim()) next.target_users = 'Identify the people or systems using this application.';
    if (form.concurrent_users < 1) next.concurrent_users = 'Expected concurrent users must be at least 1.';
    if (form.daily_requests < 1) next.daily_requests = 'Expected daily requests must be at least 1.';
    if (form.functional_requirements.trim().length < 10) next.functional_requirements = 'Add the core capabilities this system must provide.';
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
    if (!validate()) { toast('Review the highlighted requirements before continuing.', 'error'); return; }
    setBusy(true);
    try {
      const project = createdProjectId
        ? await api.projects.update(createdProjectId, form)
        : await api.projects.create(form);
      setCreatedProjectId(project.id);
      selectProject(project.id);
      const result = await api.requirements.analyze(project.id);
      setAnalysis(result);
      setAnalysisTab('overview');
      setView('analysis');
      await refreshProjects();
      toast('Requirements analyzed. Review the findings before generating alternatives.');
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
      toast(`${architectures.length} architecture alternatives generated.`);
      navigate('/explorer');
    } catch (err) {
      setView('analysis');
      toast(getErrorMessage(err), 'error');
    }
  };
  const step = view === 'form' ? 1 : view === 'analysis' ? 2 : 3;
  const engine = engineLabel(analysis?.analysis_mode);

  return <div className="mx-auto max-w-6xl space-y-6 animate-fade-up">
    <PageHeader eyebrow="Requirements intelligence" title={view === 'form' ? createdProjectId ? 'Edit system requirements' : 'New architecture project' : view === 'analysis' ? 'Review requirements analysis' : 'Generating architecture alternatives'} description={view === 'form' ? 'Describe your system in natural language, then add the constraints and quality attributes that should drive architectural decisions.' : view === 'analysis' ? 'Validate the extracted requirements, constraints, and open questions before committing to architecture generation.' : 'ASAIP is evaluating suitable patterns, technology stacks, diagrams, and decision scores.'} actions={view === 'form' ? <Button variant="secondary" onClick={() => { setForm(demoForm); setErrors({}); setCreatedProjectId(null); setAnalysis(null); toast('Demo requirements loaded. Nothing has been saved yet.', 'info'); }}><WandSparkles className="h-4 w-4" />Load demo requirements</Button> : undefined} />

    <div className="flex items-center" aria-label={`Workflow step ${step} of 3`}>
      {[{ number: 1, label: 'Requirements' }, { number: 2, label: 'Analysis' }, { number: 3, label: 'Architectures' }].map((item, index) => <div key={item.number} className="contents"><div className="flex items-center gap-2"><span className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-semibold ${step > item.number ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : step === item.number ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300' : 'border-white/10 text-slate-600'}`}>{step > item.number ? <Check className="h-3 w-3" /> : item.number}</span><span className={`text-[10px] font-medium ${step === item.number ? 'text-slate-300' : 'text-slate-600'}`}>{item.label}</span></div>{index < 2 && <div className={`mx-3 h-px flex-1 ${step > item.number ? 'bg-emerald-500/25' : 'bg-white/[0.07]'}`} />}</div>)}
    </div>

    {view === 'form' && <form onSubmit={analyze} className="space-y-5" noValidate>
      <section className="rounded-xl border border-white/[0.075] bg-card p-5 shadow-card sm:p-6">
        <div className="mb-5 flex items-start gap-3"><div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-400"><ClipboardList className="h-4 w-4" /></div><div><h2 className="font-display text-sm font-semibold text-slate-200">System overview</h2><p className="mt-1 text-[11px] text-slate-600">Start with the problem, not a preferred architecture.</p></div></div>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Project name" required error={errors.name}><Input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Smart E-Commerce Platform" maxLength={120} /></Field>
          <Field label="Application domain" required><Select value={form.domain} onChange={(e) => update('domain', e.target.value)}>{domains.map((domain) => <option key={domain}>{domain}</option>)}</Select></Field>
          <Field label="Natural-language project description" required error={errors.description} className="md:col-span-2" hint="Minimum 30 characters"><Textarea value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Describe what you want to build, who it serves, and the outcomes that matter…" className="min-h-32" /></Field>
          <Field label="Target users" required error={errors.target_users} className="md:col-span-2"><Input value={form.target_users} onChange={(e) => update('target_users', e.target.value)} placeholder="e.g. 50,000 customers, operations teams, and support staff" /></Field>
        </div>
      </section>

      <section className="rounded-xl border border-white/[0.075] bg-card p-5 shadow-card sm:p-6">
        <div className="mb-5 flex items-start gap-3"><div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400"><Gauge className="h-4 w-4" /></div><div><h2 className="font-display text-sm font-semibold text-slate-200">Workload & growth</h2><p className="mt-1 text-[11px] text-slate-600">Realistic estimates are enough for this proof of concept.</p></div></div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Expected concurrent users" required error={errors.concurrent_users}><Input type="number" min="1" value={form.concurrent_users} onChange={(e) => update('concurrent_users', Number(e.target.value))} /></Field>
          <Field label="Expected daily requests" required error={errors.daily_requests}><Input type="number" min="1" value={form.daily_requests} onChange={(e) => update('daily_requests', Number(e.target.value))} /></Field>
          <Field label="Expected future growth"><Input value={form.growth} onChange={(e) => update('growth', e.target.value)} placeholder="e.g. 5x over 24 months" /></Field>
          <Field label="Availability requirement"><Select value={form.availability} onChange={(e) => update('availability', e.target.value)}><option>99%</option><option>99.5%</option><option>99.9%</option><option>99.95%</option><option>99.99%</option></Select></Field>
          <Field label="Monthly / project budget (INR)" error={errors.budget}><Input type="number" min="0" value={form.budget} onChange={(e) => update('budget', Number(e.target.value))} /></Field>
          <Field label="Development team size"><Input type="number" min="1" value={form.team_size} onChange={(e) => update('team_size', Number(e.target.value))} /></Field>
        </div>
      </section>

      <section className="rounded-xl border border-white/[0.075] bg-card p-5 shadow-card sm:p-6">
        <div className="mb-5 flex items-start gap-3"><div className="rounded-lg bg-violet-500/10 p-2 text-violet-400"><ListChecks className="h-4 w-4" /></div><div><h2 className="font-display text-sm font-semibold text-slate-200">Requirements</h2><p className="mt-1 text-[11px] text-slate-600">Use sentences or semicolon-separated items. The analyzer will structure them.</p></div></div>
        <div className="grid gap-5 lg:grid-cols-2">
          <Field label="Functional requirements" required error={errors.functional_requirements} hint="What the system does"><Textarea value={form.functional_requirements} onChange={(e) => update('functional_requirements', e.target.value)} placeholder="User registration; product search; payment processing; order tracking; admin reporting…" /></Field>
          <Field label="Non-functional requirements" required error={errors.non_functional_requirements} hint="How well it must perform"><Textarea value={form.non_functional_requirements} onChange={(e) => update('non_functional_requirements', e.target.value)} placeholder="Secure authentication; sub-second reads; high availability; maintainability; audit logging…" /></Field>
        </div>
      </section>

      <section className="rounded-xl border border-white/[0.075] bg-card p-5 shadow-card sm:p-6">
        <div className="mb-5 flex items-start gap-3"><div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400"><Cloud className="h-4 w-4" /></div><div><h2 className="font-display text-sm font-semibold text-slate-200">Delivery constraints</h2><p className="mt-1 text-[11px] text-slate-600">Ground recommendations in your team and operating environment.</p></div></div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Preferred programming languages"><Input value={form.preferred_languages} onChange={(e) => update('preferred_languages', e.target.value)} placeholder="TypeScript, Python" /></Field>
          <Field label="Preferred cloud provider"><Select value={form.cloud_provider} onChange={(e) => update('cloud_provider', e.target.value)}><option>AWS</option><option>Azure</option><option>GCP</option><option>On-premises</option><option>No preference</option></Select></Field>
          <Field label="Data sensitivity level"><Select value={form.data_sensitivity} onChange={(e) => update('data_sensitivity', e.target.value)}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></Select></Field>
          <Field label="Deployment preference" className="lg:col-span-2"><Input value={form.deployment_preference} onChange={(e) => update('deployment_preference', e.target.value)} placeholder="Cloud, on-premises, hybrid, containers…" /></Field>
        </div>
      </section>
      <div className="sticky bottom-3 z-10 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#111722]/95 p-3 shadow-2xl backdrop-blur-md">
        <p className="hidden text-[10px] text-slate-600 sm:block">Saved to the backend before analysis · No API keys in your browser</p><Button type="submit" loading={busy} size="lg">{createdProjectId ? 'Save & re-analyze requirements' : 'Save & analyze requirements'}<ArrowRight className="h-4 w-4" /></Button>
      </div>
    </form>}

    {view === 'analysis' && analysis && <div className="space-y-5">
      <section className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.035] p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><Badge tone={engine.tone === 'demo' ? 'cyan' : engine.tone === 'ai' ? 'violet' : 'default'}>{engine.label}</Badge><Badge tone="green"><CheckCircle2 className="h-3 w-3" />Analysis complete</Badge></div><h2 className="mt-4 font-display text-base font-semibold text-slate-200">Structured requirements summary</h2><p className="mt-2 max-w-4xl text-xs leading-6 text-slate-400">{analysis.summary}</p></div><Button variant="outline" size="sm" onClick={() => setView('form')}><PencilLine className="h-3.5 w-3.5" />Edit requirements</Button></div>
      </section>
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-white/[0.07] bg-white/[0.02] p-1" role="tablist" aria-label="Requirements analysis views">{([{ id: 'overview', label: 'Overview', icon: FileSearch }, { id: 'requirements', label: 'Requirements', icon: Braces }, { id: 'risks', label: 'Risks & questions', icon: ShieldAlert }] as const).map((tab) => <button key={tab.id} role="tab" aria-selected={analysisTab === tab.id} onClick={() => setAnalysisTab(tab.id)} className={`flex h-8 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 text-[11px] font-medium transition ${analysisTab === tab.id ? 'bg-slate-800 text-slate-200 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}><tab.icon className="h-3.5 w-3.5" />{tab.label}</button>)}</div>
      {analysisTab === 'overview' && <div className="grid gap-4 md:grid-cols-2"><AnalysisCard title="Technical constraints" icon={<Gauge className="h-4 w-4" />} items={analysis.constraints} /><AnalysisCard title="Missing requirements" icon={<Lightbulb className="h-4 w-4" />} items={analysis.missing_requirements} tone="warning" /><AnalysisCard title="Potential risks" icon={<ShieldAlert className="h-4 w-4" />} items={analysis.risks} tone="danger" /><AnalysisCard title="Questions to resolve" icon={<Users className="h-4 w-4" />} items={analysis.questions} /></div>}
      {analysisTab === 'requirements' && <div className="grid gap-4 lg:grid-cols-2"><AnalysisCard title={`Functional requirements · ${analysis.functional_requirements.length}`} icon={<ListChecks className="h-4 w-4" />} items={analysis.functional_requirements} tone="positive" /><AnalysisCard title={`Non-functional requirements · ${analysis.non_functional_requirements.length}`} icon={<Gauge className="h-4 w-4" />} items={analysis.non_functional_requirements} tone="positive" /></div>}
      {analysisTab === 'risks' && <div className="grid gap-4 md:grid-cols-2"><AnalysisCard title="Potential risks" icon={<ShieldAlert className="h-4 w-4" />} items={analysis.risks} tone="danger" /><AnalysisCard title="Questions to resolve" icon={<Users className="h-4 w-4" />} items={analysis.questions} /><AnalysisCard title="Missing requirements" icon={<Lightbulb className="h-4 w-4" />} items={analysis.missing_requirements} tone="warning" /><AnalysisCard title="Technical constraints" icon={<Gauge className="h-4 w-4" />} items={analysis.constraints} /></div>}
      <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-white/[0.075] bg-card p-5 sm:flex-row"><div><h3 className="text-sm font-semibold text-slate-200">Ready to explore architecture options?</h3><p className="mt-1 text-[11px] text-slate-600">Generate at least three suitable alternatives—not a default microservices answer.</p></div><Button size="lg" onClick={generate}><Layers3 className="h-4 w-4" />Generate architectures<ArrowRight className="h-4 w-4" /></Button></div>
    </div>}

    {view === 'generating' && <section className="flex min-h-[440px] flex-col items-center justify-center rounded-xl border border-white/[0.075] bg-card px-6 text-center shadow-card" role="status">
      <div className="relative mb-6"><div className="absolute inset-0 animate-ping rounded-2xl bg-indigo-500/10" /><div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-500/25 bg-indigo-500/10 text-indigo-300"><Sparkles className="h-6 w-6" /></div></div>
      <h2 className="font-display text-lg font-semibold text-slate-200">Designing your architecture alternatives</h2><p className="mt-2 max-w-md text-xs leading-6 text-slate-500">Evaluating patterns, recommending technology, mapping infrastructure, and scoring trade-offs. This can take a moment with an AI provider.</p>
      <div className="mt-7 grid w-full max-w-xl gap-2 sm:grid-cols-3">{['Select suitable patterns', 'Map components & stack', 'Score decision criteria'].map((label, index) => <div key={label} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-[10px] text-slate-500"><Rocket className={`mx-auto mb-2 h-3.5 w-3.5 ${index === 0 ? 'text-indigo-400' : 'text-slate-600'}`} />{label}</div>)}</div>
    </section>}
  </div>;
}

function AnalysisCard({ title, icon, items, tone = 'default' }: { title: string; icon: React.ReactNode; items: string[]; tone?: 'default' | 'positive' | 'warning' | 'danger' }) {
  return <section className="rounded-xl border border-white/[0.075] bg-card p-5 shadow-card"><div className="mb-4 flex items-center gap-2 text-slate-400">{icon}<h3 className="text-xs font-semibold text-slate-300">{title}</h3></div><DataList items={items || []} tone={tone} /></section>;
}
