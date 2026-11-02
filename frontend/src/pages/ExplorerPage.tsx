import { useMemo, useRef, useState } from 'react';
import {
  Background, BackgroundVariant, Controls, Handle, MarkerType, MiniMap, Panel,
  Position, ReactFlow, ReactFlowProvider, useReactFlow,
  type Edge, type Node, type NodeProps,
} from '@xyflow/react';
import html2canvas from 'html2canvas';
import {
  Box, CheckCircle2, Code2, Database, FileCode2, GitBranch,
  ImageDown, Info, Layers3, Maximize2, MousePointer2, Network, Server, ShieldCheck,
  TrendingUp, XCircle,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getErrorMessage, saveBlob } from '@/services/api';
import { exportDiagramSvg, nodeColor } from '@/lib/diagram-export';
import { formatINR } from '@/lib/format';
import { ModuleState } from '@/components/common/ModuleState';
import { PageHeader } from '@/components/common/PageHeader';
import { WorkspaceSelectors } from '@/components/common/WorkspaceSelectors';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataList } from '@/components/common/DataDisplay';
import { EmptyState } from '@/components/common/States';
import { useToast } from '@/components/ui/toast';
import type { Architecture, DiagramNode } from '@/types';

interface FlowNodeData extends Record<string, unknown> { label: string; componentType: string; description: string }
type FlowNode = Node<FlowNodeData, 'architecture'>;

function ArchitectureNode({ data, selected }: NodeProps<FlowNode>) {
  const color = nodeColor(data.componentType);
  return <div className={`relative w-[190px] rounded-xl border bg-[#111722] px-4 py-3 shadow-xl transition ${selected ? 'border-indigo-400 ring-2 ring-indigo-500/20' : 'border-slate-700/80'}`}>
    <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-2 !border-[#111722] !bg-slate-500" />
    <span className="absolute bottom-3 left-0 top-3 w-0.5 rounded-full" style={{ backgroundColor: color }} />
    <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}55` }} /><p className="truncate text-xs font-semibold text-slate-200">{data.label}</p></div>
    <p className="mt-1.5 truncate text-[9px] uppercase tracking-wider text-slate-500">{data.componentType}</p>
    <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-2 !border-[#111722] !bg-slate-500" />
  </div>;
}
const nodeTypes = { architecture: ArchitectureNode };

function FitControl() {
  const { fitView } = useReactFlow();
  return <Panel position="top-right"><Button size="sm" variant="secondary" onClick={() => fitView({ padding: 0.18, duration: 350 })}><Maximize2 className="h-3.5 w-3.5" />Fit view</Button></Panel>;
}

export default function ExplorerPage() {
  const { selectedProject, selectedArchitecture, selectArchitecture } = useApp();
  const [tab, setTab] = useState<'diagram' | 'details'>('diagram');
  const [selectedNode, setSelectedNode] = useState<DiagramNode | null>(null);
  const [exporting, setExporting] = useState(false);
  const diagramRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const architecture = selectedArchitecture;
  const nodes = useMemo<FlowNode[]>(() => (architecture?.diagram.nodes || []).map((node, index) => ({
    id: node.id, type: 'architecture', position: node.position || { x: (index % 3) * 250, y: Math.floor(index / 3) * 160 },
    data: { label: node.label, componentType: node.type, description: node.description },
  })), [architecture]);
  const edges = useMemo<Edge[]>(() => (architecture?.diagram.edges || []).map((edge) => ({
    id: edge.id, source: edge.source, target: edge.target, label: edge.label,
    type: 'smoothstep', animated: false, style: { stroke: '#475569', strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b', width: 16, height: 16 },
  })), [architecture]);
  const types = useMemo(() => [...new Set((architecture?.diagram.nodes || []).map((node) => node.type))], [architecture]);

  const exportPng = async () => {
    if (!diagramRef.current || !architecture) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(diagramRef.current, { backgroundColor: '#090d15', scale: 2, useCORS: true, logging: false });
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('The browser could not create a PNG.')), 'image/png'));
      saveBlob(blob, `${architecture.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-diagram.png`);
      toast('Architecture diagram exported as PNG.');
    } catch (err) { toast(getErrorMessage(err, 'PNG export failed. Try SVG export instead.'), 'error'); }
    finally { setExporting(false); }
  };
  const exportSvg = () => {
    if (!architecture) return;
    try { exportDiagramSvg(architecture); toast('Architecture diagram exported as SVG.'); }
    catch (err) { toast(getErrorMessage(err), 'error'); }
  };

  return <ModuleState><div className="space-y-5 animate-fade-up">
    <PageHeader eyebrow="Interactive architecture explorer" title={selectedProject?.name || 'Architecture Explorer'} description="Inspect generated system components, trace their connections, and understand the reasoning behind each architecture alternative." actions={<><Button variant="outline" size="sm" onClick={exportSvg} disabled={!architecture?.diagram.nodes.length}><FileCode2 className="h-3.5 w-3.5" />SVG</Button><Button variant="secondary" size="sm" loading={exporting} onClick={exportPng} disabled={!architecture?.diagram.nodes.length}><ImageDown className="h-3.5 w-3.5" />Export PNG</Button></>} />
    <WorkspaceSelectors />
    <div className="grid gap-3 md:grid-cols-3">{selectedProject?.architectures.map((item, index) => <button key={item.id} onClick={() => { selectArchitecture(item.id); setSelectedNode(null); }} className={`rounded-xl border p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${item.id === architecture?.id ? 'border-indigo-500/40 bg-indigo-500/[0.065] shadow-glow' : 'border-white/[0.07] bg-card hover:border-white/[0.14]'}`}>
      <div className="flex items-center justify-between gap-2"><span className={`text-[9px] font-semibold uppercase tracking-wider ${item.id === architecture?.id ? 'text-indigo-400' : 'text-slate-600'}`}>Alternative {String(index + 1).padStart(2, '0')}</span><Badge tone={item.complexity.toLowerCase().includes('high') ? 'amber' : 'default'}>{item.complexity} complexity</Badge></div>
      <h2 className="mt-2.5 text-xs font-semibold text-slate-200">{item.name}</h2><p className="mt-1.5 line-clamp-2 text-[10px] leading-4 text-slate-600">{item.description}</p>
    </button>)}</div>
    {architecture && <div className="flex items-center gap-1 border-b border-white/[0.07]" role="tablist" aria-label="Architecture view">{([{ id: 'diagram', label: 'System diagram', icon: Network }, { id: 'details', label: 'Architecture details', icon: Layers3 }] as const).map((item) => <button key={item.id} role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)} className={`relative flex items-center gap-2 px-4 py-3 text-[11px] font-medium transition ${tab === item.id ? 'text-indigo-300' : 'text-slate-500 hover:text-slate-300'}`}><item.icon className="h-3.5 w-3.5" />{item.label}{tab === item.id && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-t bg-indigo-400" />}</button>)}</div>}

    {architecture && tab === 'diagram' && (architecture.diagram.nodes.length ? <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
      <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#090d15] shadow-card">
        <div ref={diagramRef} className="h-[560px] w-full sm:h-[620px]">
          <ReactFlowProvider><ReactFlow key={architecture.id} nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.18 }} minZoom={0.25} maxZoom={1.8} onNodeClick={(_, node) => setSelectedNode(architecture.diagram.nodes.find((item) => item.id === node.id) || null)} onPaneClick={() => setSelectedNode(null)} colorMode="dark" proOptions={{ hideAttribution: false }}>
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#273244" />
            <Controls position="bottom-left" showInteractive={false} />
            <MiniMap position="bottom-right" pannable zoomable nodeColor={(node) => nodeColor((node.data as FlowNodeData).componentType)} maskColor="rgba(4,7,12,.78)" className="!hidden sm:!block" />
            <FitControl />
            <Panel position="top-left"><div className="pointer-events-none rounded-lg border border-white/[0.07] bg-[#0d121c]/90 px-3 py-2"><p className="text-[10px] font-medium text-slate-300">{architecture.name}</p><p className="mt-0.5 flex items-center gap-1 text-[8px] text-slate-600"><MousePointer2 className="h-2.5 w-2.5" />Select a component for details</p></div></Panel>
          </ReactFlow></ReactFlowProvider>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/[0.06] px-4 py-3"><span className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">Component legend</span>{types.map((type) => <span key={type} className="inline-flex items-center gap-1.5 text-[9px] capitalize text-slate-500"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: nodeColor(type) }} />{type}</span>)}</div>
      </section>
      <aside className="space-y-4">
        <section className="rounded-xl border border-white/[0.075] bg-card p-5 shadow-card"><div className="flex items-center gap-2 text-slate-500"><Box className="h-4 w-4" /><h2 className="panel-title">Component details</h2></div>{selectedNode ? <div className="mt-5 animate-fade-in"><span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08]" style={{ color: nodeColor(selectedNode.type) }}><Server className="h-4 w-4" /></span><h3 className="mt-4 text-sm font-semibold text-slate-200">{selectedNode.label}</h3><Badge className="mt-2 capitalize">{selectedNode.type}</Badge><p className="mt-4 text-xs leading-6 text-slate-500">{selectedNode.description || 'No component description was provided.'}</p><div className="mt-5 border-t border-white/[0.06] pt-4 text-[10px] text-slate-600">{architecture.diagram.edges.filter((edge) => edge.source === selectedNode.id || edge.target === selectedNode.id).length} direct connection(s)</div></div> : <div className="py-10 text-center"><MousePointer2 className="mx-auto h-5 w-5 text-slate-700" /><p className="mt-3 text-xs leading-5 text-slate-600">Select any node in the diagram to inspect its role and connections.</p></div>}</section>
        <section className="rounded-xl border border-white/[0.075] bg-card p-5 shadow-card"><div className="flex items-center gap-2 text-slate-500"><Info className="h-4 w-4" /><h2 className="panel-title">Pattern summary</h2></div><p className="mt-4 text-xs font-medium text-slate-300">{architecture.pattern}</p><p className="mt-2 text-[11px] leading-5 text-slate-500">{architecture.suitability_explanation}</p><div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-4"><div><p className="text-[9px] text-slate-600">Initial build</p><p className="mt-1 text-xs font-medium text-slate-300">{formatINR(architecture.initial_development_cost)}</p></div><div><p className="text-[9px] text-slate-600">Monthly infra</p><p className="mt-1 text-xs font-medium text-slate-300">{formatINR(architecture.monthly_infrastructure_cost)}</p></div></div></section>
      </aside>
    </div> : <EmptyState icon={<Network className="h-5 w-5" />} title="No diagram data returned" description="This architecture does not include diagram nodes. Review its technology and trade-offs in Architecture details." action={<Button variant="outline" onClick={() => setTab('details')}>View architecture details</Button>} />)}
    {architecture && tab === 'details' && <ArchitectureDetails architecture={architecture} />}
  </div></ModuleState>;
}

function ArchitectureDetails({ architecture }: { architecture: Architecture }) {
  const stackLabels = { frontend: 'Frontend', backend: 'Backend', database: 'Database', api: 'API communication', authentication: 'Authentication', deployment: 'Deployment' };
  return <div className="space-y-5 animate-fade-in">
    <section className="rounded-xl border border-white/[0.075] bg-card p-5 shadow-card sm:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div><Badge tone="indigo">{architecture.pattern}</Badge><h2 className="mt-3 font-display text-lg font-semibold text-slate-200">{architecture.name}</h2><p className="mt-2 max-w-4xl text-xs leading-6 text-slate-500">{architecture.description}</p></div><Badge tone={architecture.complexity.toLowerCase().includes('high') ? 'amber' : 'green'} className="self-start">{architecture.complexity} complexity</Badge></div></section>
    <section><h2 className="panel-title mb-3 flex items-center gap-2"><Code2 className="h-3.5 w-3.5" />Recommended technology stack</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{(Object.keys(stackLabels) as Array<keyof typeof stackLabels>).map((key) => <div key={key} className="rounded-xl border border-white/[0.07] bg-card p-4"><div className="flex items-center gap-2 text-slate-500">{key === 'database' ? <Database className="h-3.5 w-3.5" /> : key === 'authentication' ? <ShieldCheck className="h-3.5 w-3.5" /> : key === 'deployment' ? <GitBranch className="h-3.5 w-3.5" /> : <Code2 className="h-3.5 w-3.5" />}<h3 className="text-[10px] font-semibold uppercase tracking-wider">{stackLabels[key]}</h3></div><div className="mt-3 flex flex-wrap gap-1.5">{architecture.technology_stack[key]?.length ? architecture.technology_stack[key].map((tech) => <Badge key={tech} tone="indigo">{tech}</Badge>) : <span className="text-[10px] text-slate-600">Not specified</span>}</div></div>)}</div></section>
    <div className="grid gap-4 lg:grid-cols-3"><StrategyCard title="Scalability strategy" icon={<TrendingUp className="h-4 w-4" />} text={architecture.scalability_strategy} /><StrategyCard title="Security strategy" icon={<ShieldCheck className="h-4 w-4" />} text={architecture.security_strategy} /><StrategyCard title="Maintainability" icon={<Code2 className="h-4 w-4" />} text={architecture.maintainability_assessment} /></div>
    <div className="grid gap-4 lg:grid-cols-2"><section className="rounded-xl border border-white/[0.075] bg-card p-5"><h3 className="mb-4 flex items-center gap-2 text-xs font-semibold text-emerald-300"><CheckCircle2 className="h-4 w-4" />Advantages</h3><DataList items={architecture.advantages} tone="positive" /></section><section className="rounded-xl border border-white/[0.075] bg-card p-5"><h3 className="mb-4 flex items-center gap-2 text-xs font-semibold text-rose-300"><XCircle className="h-4 w-4" />Disadvantages</h3><DataList items={architecture.disadvantages} tone="danger" /></section></div>
    <div className="grid gap-4 lg:grid-cols-2"><section className="rounded-xl border border-white/[0.075] bg-card p-5"><h3 className="mb-4 text-xs font-semibold text-slate-300">Key trade-offs</h3><DataList items={architecture.tradeoffs} tone="warning" /></section><section className="rounded-xl border border-white/[0.075] bg-card p-5"><h3 className="mb-4 text-xs font-semibold text-slate-300">Recommended use cases</h3><DataList items={architecture.recommended_use_cases} /></section></div>
    <section className="rounded-xl border border-indigo-500/15 bg-indigo-500/[0.025] p-5"><h3 className="text-xs font-semibold text-indigo-300">Why this architecture fits—or does not</h3><p className="mt-3 text-xs leading-6 text-slate-400">{architecture.suitability_explanation}</p><div className="mt-5 border-t border-indigo-500/10 pt-4"><h4 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Infrastructure components</h4><div className="flex flex-wrap gap-2">{architecture.infrastructure_components.map((component) => <Badge key={component}>{component}</Badge>)}</div></div></section>
  </div>;
}
function StrategyCard({ title, icon, text }: { title: string; icon: React.ReactNode; text: string }) {
  return <section className="rounded-xl border border-white/[0.075] bg-card p-5"><div className="flex items-center gap-2 text-indigo-400">{icon}<h3 className="text-xs font-semibold text-slate-300">{title}</h3></div><p className="mt-3 text-[11px] leading-5 text-slate-500">{text}</p></section>;
}
