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
    try { const blob = await api.reports.pdf(selectedProject.id); saveBlob(blob, `${slugify(selectedProject.name)}-architecture-report.pdf`); toast('PDF report downloaded.'); }
    catch (err) { toast(getErrorMessage(err, 'The backend could not build the PDF report.'), 'error'); }
    finally { setBusy(null); }
  };
  const exportJson = async () => {
    if (!selectedProject) return;
    setBusy('json');
    try { const data = await api.reports.json(selectedProject.id); saveJson(data, `${slugify(selectedProject.name)}-architecture-data.json`); toast('Project data exported as JSON.'); }
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
    <PageHeader eyebrow="Take the work with you" title="Reports and exports" description="Download the project as a formatted report or as raw data, and export the system diagram as an image. Everything is built from the analysis already saved on the backend." />
    <WorkspaceSelectors />
    {selectedProject && <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <div className="panel overflow-hidden">
        <div className="border-b p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-primary"><FileText className="h-4 w-4" /><span className="text-[12px] font-semibold uppercase tracking-wide">Architecture report</span></div>
              <h2 className="mt-3 text-[21px] font-semibold text-foreground">{selectedProject.name}</h2>
              <p className="mt-1.5 text-[13px] text-muted-foreground">{selectedProject.domain} · Last updated {formatDate(selectedProject.updated_at)}</p>
            </div>
            <Badge tone="indigo">ASAIP</Badge>
          </div>
          <p className="mt-4 line-clamp-3 text-[14px] leading-6 text-slate-600">{selectedProject.description}</p>
        </div>
        <div className="grid grid-cols-3 divide-x border-b">{[{ label: 'Options generated', value: String(selectedProject.architectures.length) }, { label: 'Requirements analysis', value: selectedProject.requirements_analysis ? 'Done' : 'Not yet run' }, { label: 'Budget you entered', value: formatINR(selectedProject.budget) }].map((item) => <div key={item.label} className="p-4"><p className="text-[12px] text-muted-foreground">{item.label}</p><p className="mt-1.5 truncate text-[15px] font-semibold text-foreground">{item.value}</p></div>)}</div>
        <div className="p-5 sm:p-6">
          <h3 className="section-title">What is inside</h3>
          <p className="section-hint">Sections generated from this project’s saved data.</p>
          <div className="mt-4 grid gap-x-5 gap-y-2.5 sm:grid-cols-2">{reportSections.map((section, index) => <div key={section} className="flex items-center gap-2.5 text-[14px] text-slate-700">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-success"><Check className="h-3 w-3" /></span>
            <span className="w-5 shrink-0 text-[12px] text-muted-foreground">{index + 1}</span>{section}
          </div>)}</div>
        </div>
      </div>
      <div className="space-y-4">
        <section className="panel p-5">
          <h2 className="section-title">Project report</h2>
          <p className="section-hint">Both files are produced by the backend from your saved analysis.</p>
          <div className="mt-5 space-y-3">
            <button onClick={exportPdf} disabled={busy !== null} className="group flex w-full items-center gap-3 rounded-xl border border-primary/25 bg-primary/[0.05] p-4 text-left transition hover:bg-primary/[0.09] disabled:opacity-50">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">{busy === 'pdf' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}</span>
              <span className="flex-1"><span className="block text-[15px] font-semibold text-foreground">Download the PDF report</span><span className="mt-1 block text-[13px] leading-5 text-muted-foreground">Ready to hand in or present</span></span>
              <Download className="h-4 w-4 text-slate-400 group-hover:text-primary" />
            </button>
            <button onClick={exportJson} disabled={busy !== null} className="group flex w-full items-center gap-3 rounded-xl border bg-white p-4 text-left transition hover:bg-muted/40 disabled:opacity-50">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700">{busy === 'json' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileJson2 className="h-4 w-4" />}</span>
              <span className="flex-1"><span className="block text-[15px] font-semibold text-foreground">Export the raw data (JSON)</span><span className="mt-1 block text-[13px] leading-5 text-muted-foreground">Every project field and analysis result</span></span>
              <Download className="h-4 w-4 text-slate-400 group-hover:text-primary" />
            </button>
          </div>
        </section>
        <section className="panel p-5">
          <h2 className="flex items-center gap-2 section-title"><Network className="h-4 w-4 text-primary" />System diagram</h2>
          <p className="mt-2 text-[14px] leading-6 text-muted-foreground">{selectedArchitecture ? `Save the diagram for ${selectedArchitecture.name} as an image you can drop into slides or a report.` : 'Pick a project that has generated options to export its diagram.'}</p>
          {selectedArchitecture ? <div className="mt-4 grid grid-cols-2 gap-2"><Button variant="secondary" loading={busy === 'png'} disabled={busy !== null || !selectedArchitecture.diagram.nodes.length} onClick={() => exportDiagram('png')}><ImageDown className="h-3.5 w-3.5" />PNG image</Button><Button variant="outline" loading={busy === 'svg'} disabled={busy !== null || !selectedArchitecture.diagram.nodes.length} onClick={() => exportDiagram('svg')}><Network className="h-3.5 w-3.5" />SVG vector</Button></div>
            : <div className="mt-4"><EmptyState title="No architecture selected" description="Generate your options first, then come back to export the diagram." /></div>}
        </section>
        <p className="flex items-start gap-2.5 rounded-xl border border-emerald-600/25 bg-emerald-50 px-4 py-3.5 text-[13px] leading-6 text-emerald-900"><ShieldCheck className="mt-1 h-4 w-4 shrink-0" />Nothing is invented in the browser. If an analysis has not been run, the report says so rather than filling in a plausible-looking number.</p>
      </div>
    </section>}
  </div></ModuleState>;
}
