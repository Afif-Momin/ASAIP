import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, CheckCircle2, CloudCog, ExternalLink, Globe2, Info, KeyRound, RefreshCw, Server, ShieldCheck, XCircle } from 'lucide-react';
import { API_URL, api, getErrorMessage } from '@/services/api';
import { useApp } from '@/context/AppContext';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { engineLabel } from '@/lib/utils';

type Connection = { state: 'checking' | 'online' | 'offline'; message?: string; latency?: number };
export default function SettingsPage() {
  const { projects, refreshProjects } = useApp();
  const [connection, setConnection] = useState<Connection>({ state: 'checking' });
  const checkConnection = useCallback(async () => {
    const started = performance.now();
    setConnection({ state: 'checking' });
    try {
      await api.projects.list();
      setConnection({ state: 'online', latency: Math.round(performance.now() - started) });
      await refreshProjects();
    } catch (err) { setConnection({ state: 'offline', message: getErrorMessage(err) }); }
  }, [refreshProjects]);
  useEffect(() => { checkConnection(); }, [checkConnection]);
  const modes = useMemo(() => [...new Set(projects.flatMap((project) => [project.requirements_analysis?.analysis_mode, ...project.architectures.map((architecture) => architecture.analysis_mode)].filter((mode): mode is string => Boolean(mode))))], [projects]);
  return <div className="mx-auto max-w-5xl space-y-6 animate-fade-up">
    <PageHeader eyebrow="Workspace configuration" title="Settings & Connection" description="Inspect the active backend connection and analysis modes. Secrets and AI provider credentials remain server-side by design." actions={<Button variant="outline" onClick={checkConnection} loading={connection.state === 'checking'}><RefreshCw className="h-4 w-4" />Check connection</Button>} />
    <section className="rounded-xl border border-white/[0.075] bg-card p-5 shadow-card sm:p-6"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div className="flex items-start gap-4"><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${connection.state === 'online' ? 'border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-400' : connection.state === 'offline' ? 'border-rose-500/20 bg-rose-500/[0.07] text-rose-400' : 'border-white/10 bg-white/[0.025] text-slate-500'}`}><Server className="h-5 w-5" /></div><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-sm font-semibold text-slate-200">ASAIP API connection</h2>{connection.state === 'online' ? <Badge tone="green"><CheckCircle2 className="h-3 w-3" />Connected</Badge> : connection.state === 'offline' ? <Badge tone="rose"><XCircle className="h-3 w-3" />Unavailable</Badge> : <Badge><Activity className="h-3 w-3 animate-pulse" />Checking</Badge>}</div><p className="mt-2 text-xs text-slate-500">{connection.state === 'online' ? `GET /api/projects responded successfully${connection.latency !== undefined ? ` in ${connection.latency} ms` : ''}.` : connection.state === 'offline' ? connection.message : 'Testing the projects endpoint…'}</p></div></div><a href={`${API_URL}/docs`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[11px] font-medium text-indigo-400 hover:text-indigo-300">Open API documentation<ExternalLink className="h-3.5 w-3.5" /></a></div>{connection.state === 'offline' && <div className="mt-5 rounded-lg border border-rose-500/10 bg-rose-500/[0.025] p-4 text-[11px] leading-5 text-slate-500"><p className="font-medium text-rose-300">Action required</p><p className="mt-1">Start the FastAPI backend on port 8000, confirm CORS allows this frontend, then check the connection again. Project data cannot be loaded while the API is unavailable.</p></div>}</section>
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-xl border border-white/[0.075] bg-card p-5 shadow-card"><div className="flex items-center gap-2"><Globe2 className="h-4 w-4 text-indigo-400" /><h2 className="font-display text-sm font-semibold text-slate-200">Environment</h2></div><dl className="mt-5 divide-y divide-white/[0.055]"><SettingRow label="Backend base URL" value={API_URL} mono /><SettingRow label="Configuration variable" value="VITE_API_URL" mono /><SettingRow label="Default development URL" value="http://localhost:8000" mono /><SettingRow label="Frontend development port" value="5173" mono /></dl><p className="mt-5 text-[10px] leading-5 text-slate-600">Set VITE_API_URL in the frontend environment before starting Vite. Restart the dev server after changing it. The URL is public client configuration, not a secret.</p></section>
      <section className="rounded-xl border border-white/[0.075] bg-card p-5 shadow-card"><div className="flex items-center gap-2"><CloudCog className="h-4 w-4 text-violet-400" /><h2 className="font-display text-sm font-semibold text-slate-200">Analysis engine status</h2></div><div className="mt-5 rounded-lg border border-white/[0.06] bg-white/[0.018] p-4">{modes.length ? <><p className="text-[10px] text-slate-600">Modes reported by saved backend analyses</p><div className="mt-3 flex flex-wrap gap-2">{modes.map((mode) => { const engine = engineLabel(mode); return <Badge key={mode} tone={engine.tone === 'demo' ? 'cyan' : engine.tone === 'ai' ? 'violet' : 'default'}>{engine.label}</Badge>; })}</div></> : <><p className="text-xs font-medium text-slate-300">No analysis mode reported yet</p><p className="mt-2 text-[10px] leading-5 text-slate-600">Run a requirements or architecture analysis. Its backend-reported mode will appear here.</p></>}</div><div className="mt-4 flex items-start gap-2 text-[10px] leading-5 text-slate-600"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-400" />ASAIP never upgrades a deterministic fallback into an “AI” label. Each result carries its own analysis_mode, and the UI displays that value honestly.</div></section>
    </div>
    <section className="rounded-xl border border-white/[0.075] bg-card p-5 shadow-card"><div className="flex items-start gap-4"><div className="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-400"><KeyRound className="h-4 w-4" /></div><div><h2 className="font-display text-sm font-semibold text-slate-200">Credentials stay on the backend</h2><p className="mt-2 max-w-3xl text-xs leading-6 text-slate-500">There is intentionally no browser API-key editor. Configure Anthropic Claude or another provider in the backend environment. The frontend only calls ASAIP’s typed REST API and never receives provider credentials.</p><div className="mt-4 flex items-center gap-2 text-[10px] text-emerald-400"><ShieldCheck className="h-3.5 w-3.5" />No AI keys exposed in client storage or network configuration</div></div></div></section>
  </div>;
}
function SettingRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="flex flex-col justify-between gap-1 py-3 sm:flex-row sm:items-center"><dt className="text-[10px] text-slate-600">{label}</dt><dd className={`break-all text-[11px] text-slate-300 ${mono ? 'font-mono' : ''}`}>{value}</dd></div>;
}
