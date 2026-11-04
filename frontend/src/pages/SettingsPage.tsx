import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, CheckCircle2, CloudCog, ExternalLink, Globe2, Info, KeyRound, RefreshCw, Server, ShieldCheck, XCircle } from 'lucide-react';
import { API_URL, api, getErrorMessage } from '@/services/api';
import { useApp } from '@/context/AppContext';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { engineLabel } from '@/lib/utils';
import type { PlatformConfig } from '@/types';

type Connection = { state: 'checking' | 'online' | 'offline'; message?: string; latency?: number };

const providerNames: Record<PlatformConfig['ai_provider'], string> = {
  demo: 'Built-in analysis engine (no AI service used)',
  openrouter: 'OpenRouter',
  anthropic: 'Anthropic',
};

export default function SettingsPage() {
  const { projects, refreshProjects } = useApp();
  const [connection, setConnection] = useState<Connection>({ state: 'checking' });
  const [config, setConfig] = useState<PlatformConfig | null>(null);
  const checkConnection = useCallback(async () => {
    const started = performance.now();
    setConnection({ state: 'checking' });
    try {
      await api.projects.list();
      setConnection({ state: 'online', latency: Math.round(performance.now() - started) });
      await refreshProjects();
      try { setConfig(await api.system.config()); } catch { setConfig(null); }
    } catch (err) { setConnection({ state: 'offline', message: getErrorMessage(err) }); setConfig(null); }
  }, [refreshProjects]);
  useEffect(() => { checkConnection(); }, [checkConnection]);
  const modes = useMemo(() => [...new Set(projects.flatMap((project) => [project.requirements_analysis?.analysis_mode, ...project.architectures.map((architecture) => architecture.analysis_mode)].filter((mode): mode is string => Boolean(mode))))], [projects]);
  const usingLiveAi = Boolean(config?.ai_configured);

  return <div className="mx-auto max-w-5xl space-y-6 animate-fade-up">
    <PageHeader eyebrow="How this workspace is set up" title="Settings and connection" description="Check that the workspace can reach the backend and see which analysis engine is answering your requests. Nothing here holds a secret — AI credentials live only on the server." actions={<Button variant="outline" onClick={checkConnection} loading={connection.state === 'checking'}><RefreshCw className="h-4 w-4" />Check again</Button>} />

    <section className="panel p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div className="flex items-start gap-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${connection.state === 'online' ? 'bg-emerald-50 text-success' : connection.state === 'offline' ? 'bg-red-50 text-danger' : 'bg-muted text-slate-400'}`}><Server className="h-5 w-5" /></div>
          <div>
            <div className="flex flex-wrap items-center gap-2"><h2 className="section-title">Backend connection</h2>{connection.state === 'online' ? <Badge tone="green"><CheckCircle2 className="h-3 w-3" />Connected</Badge> : connection.state === 'offline' ? <Badge tone="rose"><XCircle className="h-3 w-3" />Not reachable</Badge> : <Badge><Activity className="h-3 w-3 animate-pulse" />Checking</Badge>}</div>
            <p className="mt-2 text-[14px] leading-6 text-muted-foreground">{connection.state === 'online' ? `The projects endpoint answered${connection.latency !== undefined ? ` in ${connection.latency} ms` : ''} — everything you analyze will be saved.` : connection.state === 'offline' ? connection.message : 'Testing the connection…'}</p>
          </div>
        </div>
        <a href={`${API_URL}/docs`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[14px] font-medium text-primary hover:underline">See the API reference<ExternalLink className="h-4 w-4" /></a>
      </div>
      {connection.state === 'offline' && <div className="mt-5 rounded-lg border border-red-600/25 bg-red-50 p-4">
        <p className="text-[14px] font-semibold text-danger">What to do</p>
        <p className="mt-1.5 text-[14px] leading-6 text-amber-900">Start the FastAPI backend on port 8000, make sure it allows this frontend address, then press “Check again”. Without it, no projects or analyses can be loaded or saved.</p>
      </div>}
    </section>

    <div className="grid gap-5 lg:grid-cols-2">
      <section className="panel p-5">
        <h2 className="flex items-center gap-2 section-title"><Globe2 className="h-4 w-4 text-primary" />Where the frontend points</h2>
        <dl className="mt-4 divide-y">{rows.map((row) => <SettingRow key={row.label} {...row} />)}</dl>
        <p className="mt-4 text-[13px] leading-5 text-muted-foreground">Set <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px]">VITE_API_URL</code> before starting the dev server and restart Vite after changing it. This address is public browser configuration, not a secret.</p>
      </section>

      <section className="panel p-5">
        <h2 className="flex items-center gap-2 section-title"><CloudCog className="h-4 w-4 text-primary" />Which engine is answering</h2>
        {config ? <div className="mt-4 space-y-3">
          <div className={`rounded-lg border p-4 ${usingLiveAi ? 'border-indigo-500/25 bg-indigo-50' : 'border-border bg-muted/40'}`}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={usingLiveAi ? 'violet' : 'cyan'}>{usingLiveAi ? 'Live AI is on' : 'Built-in engine only'}</Badge>
              {config.ai_model && <span className="text-[13px] text-muted-foreground">{config.ai_model}</span>}
            </div>
            <p className="mt-2.5 text-[14px] leading-6 text-slate-700">{providerNames[config.ai_provider]}</p>
            <p className="mt-1.5 text-[13px] leading-5 text-muted-foreground">{usingLiveAi ? 'New analyses are produced by the configured AI service. Anything generated earlier keeps the mode it was created with.' : 'New analyses use ASAIP’s deterministic rules. They work offline and are always labelled as engine results — never presented as AI output.'}</p>
          </div>
          {config.provider_error && <div className="rounded-lg border border-red-600/25 bg-red-50 p-4">
            <p className="text-[14px] font-semibold text-danger">The selected AI provider is not ready</p>
            <p className="mt-1.5 text-[14px] leading-6 text-amber-900">{config.provider_error}</p>
            <p className="mt-2 text-[13px] leading-5 text-amber-800">ASAIP will not quietly switch to the built-in engine and call it AI. Set the key in the backend environment, or change <code className="font-mono text-[12px]">AI_PROVIDER</code> to <code className="font-mono text-[12px]">demo</code> on purpose.</p>
          </div>}
        </div> : <p className="mt-4 text-[14px] leading-6 text-muted-foreground">{connection.state === 'offline' ? 'Unavailable while the backend is offline.' : 'Reading the backend configuration…'}</p>}
        <div className="mt-4 border-t pt-4">
          <p className="text-[13px] font-medium text-foreground">Modes recorded on your saved analyses</p>
          {modes.length ? <div className="mt-2.5 flex flex-wrap gap-2">{modes.map((mode) => { const engine = engineLabel(mode); return <Badge key={mode} tone={engine.tone === 'demo' ? 'cyan' : engine.tone === 'ai' ? 'violet' : 'default'}>{engine.label}</Badge>; })}</div>
            : <p className="mt-2 text-[13px] leading-5 text-muted-foreground">Run a requirements or architecture analysis and the mode the backend reports will appear here.</p>}
          <p className="mt-3.5 flex items-start gap-2 text-[13px] leading-5 text-muted-foreground"><Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />ASAIP never relabels a deterministic result as “AI”. Every analysis carries the mode that produced it, and this workspace displays it as-is.</p>
        </div>
      </section>
    </div>

    <section className="panel p-5">
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-emerald-50 p-2.5 text-success"><KeyRound className="h-4 w-4" /></div>
        <div>
          <h2 className="section-title">AI keys stay on the server</h2>
          <p className="mt-2 max-w-3xl text-[14px] leading-6 text-slate-700">There is deliberately no place to paste an API key in the browser. Set <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px]">OPENROUTER_API_KEY</code> or <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px]">ANTHROPIC_API_KEY</code> in the backend environment file. The frontend only talks to ASAIP’s own endpoints and never sees a provider credential.</p>
          <p className="mt-3 flex items-center gap-2 text-[13px] font-medium text-success"><ShieldCheck className="h-4 w-4" />No provider keys in browser storage, bundles or network traffic</p>
        </div>
      </div>
    </section>
  </div>;
}
const rows = [
  { label: 'Backend address in use', value: API_URL, mono: true },
  { label: 'Set with the variable', value: 'VITE_API_URL', mono: true },
  { label: 'Usual local address', value: 'http://localhost:8000', mono: true },
  { label: 'Frontend dev server port', value: '5173', mono: true },
  { label: 'Costs are shown in', value: 'Indian rupees (INR)', mono: false },
];
function SettingRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="flex flex-col justify-between gap-1 py-2.5 sm:flex-row sm:items-center"><dt className="text-[13px] text-muted-foreground">{label}</dt><dd className={`break-all text-[14px] text-foreground ${mono ? 'font-mono text-[13px]' : ''}`}>{value}</dd></div>;
}
