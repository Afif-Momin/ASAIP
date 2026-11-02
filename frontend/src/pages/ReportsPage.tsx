import { useState } from 'react';
import { Check, Download, FileJson2, FileText, ImageDown, LoaderCircle, Network, ShieldCheck } from 'lucide-react';
import { api, getErrorMessage, saveBlob, saveJson } from '@/services/api';
import { slugify } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { exportDiagramPng, exportDiagramSvg } from '@/lib/diagram-export';
import { formatDate, formatINR } from '@/lib/format';
import { ModuleState } from '@/components/common/ModuleState';
import { PageHeader } from '@/components/common/PageHeader';
import { WorkspaceSelectors } from '@/components/common/WorkspaceSelectors';
import { EmptyState } from '@/components/common/States';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';

type ExportKind = 'pdf' | 'json' | 'png' | 'svg' | null;
const reportSections = ['Executive Summary', 'Project Overview', 'Functional Requirements', 'Non-Functional Requirements', 'Architecture Alternatives', 'Recommended Architecture', 'Architecture Diagram', 'Technology Stack', 'Weighted Decision Matrix', 'Scalability Analysis', 'Security Analysis', 'Maintainability Analysis', 'Cloud Cost Estimation', 'Architecture Critic Findings', 'Architecture Trade-offs', 'Architecture Evolution Roadmap', 'Conclusion'];
export default function ReportsPage() {
  const { selectedProject, selectedArchitecture } = useApp();
  const [busy, setBusy] = useState<ExportKind>(null);
  const { toast } = useToast();
  const exportPdf = async () => {
    if (!selectedProject) return;
    setBusy('pdf');
    try { const blob = await api.reports.pdf(selectedProject.id); saveBlob(blob, `${slugify(selectedProject.name)}-architecture-report.pdf`); toast('PDF report generated and downloaded.'); }
    catch (err) { toast(getErrorMessage(err, 'The backend could not generate the PDF report.'), 'error'); }
    finally { setBusy(null); }
  };
  const exportJson = async () => {
    if (!selectedProject) return;
    setBusy('json');
    try { const data = await api.reports.json(selectedProject.id); saveJson(data, `${slugify(selectedProject.name)}-architecture-data.json`); toast('Actual project analysis exported as JSON.'); }
    catch (err) { toast(getErrorMessage(err), 'error'); }
    finally { setBusy(null); }
  };
  const exportDiagram = async (format: 'png' | 'svg') => {
    if (!selectedArchitecture) return;
    setBusy(format);
    try { if (format === 'png') await exportDiagramPng(selectedArchitecture); else exportDiagramSvg(selectedArchitecture); toast(`Diagram exported as ${format.toUpperCase()}.`); }
    catch (err) { toast(getErrorMessage(err), 'error'); }
    finally { setBusy(null); }
  };
  return <ModuleState requireArchitecture={false}><div className="space-y-6 animate-fade-up">
    <PageHeader eyebrow="Architecture deliverables" title="Reports & Exports" description="Generate professional deliverables from the selected project’s saved requirements, recommendations, and backend analysis—not browser placeholders." />
    <WorkspaceSelectors />
    {selectedProject && <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <div className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#0d121c] shadow-card">
        <div className="border-b border-white/[0.07] p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-indigo-400"><FileText className="h-4 w-4" /><span className="text-[9px] font-semibold uppercase tracking-[0.16em]">Architecture report</span></div><h2 className="mt-4 font-display text-xl font-semibold tracking-tight text-slate-100">{selectedProject.name}</h2><p className="mt-1 text-[10px] text-slate-600">{selectedProject.domain} · Last updated {formatDate(selectedProject.updated_at)}</p></div><Badge tone="indigo">ASAIP</Badge></div><p className="mt-4 line-clamp-3 text-xs leading-6 text-slate-500">{selectedProject.description}</p></div>
        <div className="grid grid-cols-3 divide-x divide-white/[0.06] border-b border-white/[0.06]">{[{ label: 'Alternatives', value: selectedProject.architectures.length }, { label: 'Requirements analysis', value: selectedProject.requirements_analysis ? 'Complete' : 'Pending' }, { label: 'Budget', value: formatINR(selectedProject.budget) }].map((item) => <div key={item.label} className="p-4"><p className="text-[9px] text-slate-600">{item.label}</p><p className="mt-1.5 truncate text-xs font-semibold text-slate-300">{item.value}</p></div>)}</div>
        <div className="p-5 sm:p-6"><h3 className="panel-title">Report contents</h3><div className="mt-4 grid gap-x-5 gap-y-2.5 sm:grid-cols-2">{reportSections.map((section, index) => <div key={section} className="flex items-center gap-2 text-[10px] text-slate-500"><span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500"><Check className="h-2.5 w-2.5" /></span><span className="mr-1 text-slate-700">{String(index + 1).padStart(2, '0')}</span>{section}</div>)}</div></div>
      </div>
      <div className="space-y-4">
        <section className="rounded-xl border border-white/[0.075] bg-card p-5 shadow-card"><h2 className="font-display text-sm font-semibold text-slate-200">Project report</h2><p className="mt-1 text-[10px] leading-4 text-slate-600">Exports are generated by the backend from saved analysis data.</p><div className="mt-5 space-y-3"><button onClick={exportPdf} disabled={busy !== null} className="group flex w-full items-center gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.055] p-4 text-left transition hover:bg-indigo-500/[0.09] disabled:opacity-50"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-300">{busy === 'pdf' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}</span><span className="flex-1"><span className="block text-xs font-semibold text-slate-200">Download PDF report</span><span className="mt-1 block text-[10px] text-slate-600">Professional architecture decision document</span></span><Download className="h-4 w-4 text-slate-600 group-hover:text-indigo-400" /></button><button onClick={exportJson} disabled={busy !== null} className="group flex w-full items-center gap-3 rounded-xl border border-white/[0.075] bg-white/[0.018] p-4 text-left transition hover:bg-white/[0.035] disabled:opacity-50"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-300">{busy === 'json' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileJson2 className="h-4 w-4" />}</span><span className="flex-1"><span className="block text-xs font-semibold text-slate-200">Export JSON data</span><span className="mt-1 block text-[10px] text-slate-600">Portable project and analysis payload</span></span><Download className="h-4 w-4 text-slate-600 group-hover:text-cyan-400" /></button></div></section>
        <section className="rounded-xl border border-white/[0.075] bg-card p-5 shadow-card"><div className="flex items-center gap-2"><Network className="h-4 w-4 text-violet-400" /><h2 className="font-display text-sm font-semibold text-slate-200">Architecture diagram</h2></div><p className="mt-2 text-[10px] leading-5 text-slate-600">{selectedArchitecture ? `Export ${selectedArchitecture.name} as a standalone visual asset.` : 'Select a project with generated architectures to export a diagram.'}</p>{selectedArchitecture ? <div className="mt-4 grid grid-cols-2 gap-2"><Button variant="secondary" loading={busy === 'png'} disabled={busy !== null || !selectedArchitecture.diagram.nodes.length} onClick={() => exportDiagram('png')}><ImageDown className="h-3.5 w-3.5" />PNG diagram</Button><Button variant="outline" loading={busy === 'svg'} disabled={busy !== null || !selectedArchitecture.diagram.nodes.length} onClick={() => exportDiagram('svg')}><Network className="h-3.5 w-3.5" />SVG diagram</Button></div> : <div className="mt-4"><EmptyState title="No architecture selected" description="Generate alternatives before exporting a diagram." /></div>}</section>
        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/10 bg-emerald-500/[0.025] px-4 py-3 text-[10px] leading-5 text-slate-600"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />No report content is fabricated in the browser. Missing analyses remain the backend’s responsibility to represent honestly.</div>
      </div>
    </section>}
  </div></ModuleState>;
}
