import { useMemo, useRef, useState } from 'react';
import {
  Background, BackgroundVariant, Controls, Handle, MarkerType, MiniMap, Panel, Position,
  ReactFlow, ReactFlowProvider, useReactFlow,
  type Edge, type Node, type NodeProps,
} from '@xyflow/react';
import html2canvas from 'html2canvas';
import {
  CheckCircle2, Code2, Database, FileCode2, GitBranch, ImageDown, Layers3,
  Maximize2, MousePointer2, Network, Server, ShieldCheck, TrendingUp, XCircle,
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
  return <div className={`relative w-[200px] rounded-xl border bg-white px-4 py-3 shadow-card transition ${selected ? 'border-primary ring-2 ring-primary/25' : 'border-slate-300'}`}>
    <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-2 !border-white !bg-slate-400" />
    <span className="absolute bottom-3 left-0 top-3 w-0.5 rounded-full" style={{ backgroundColor: color }} />
    <div className="flex items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} /><p className="truncate text-[13px] font-semibold text-foreground">{data.label}</p></div>
    <p className="mt-1 truncate pl-4 text-[12px] capitalize text-muted-foreground">{data.componentType}</p>
    <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-2 !border-white !bg-slate-400" />
  </div>;
}
const nodeTypes = { architecture: ArchitectureNode };

function FitControl() {
  const { fitView } = useReactFlow();
  return <Panel position="top-right"><Button size="sm" variant="secondary" onClick={() => fitView({ padding: 0.18, duration: 350 })}><Maximize2 className="h-4 w-4" />Fit to screen</Button></Panel>;
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
    type: 'smoothstep', animated: false, style: { stroke: '#94a3b8', strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b', width: 16, height: 16 },
  })), [architecture]);
  const types = useMemo(() => [...new Set((architecture?.diagram.nodes || []).map((node) => node.type))], [architecture]);

  const exportPng = async () => {
    if (!diagramRef.current || !architecture) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(diagramRef.current, { backgroundColor: '#ffffff', scale: 2, useCORS: true, logging: false });
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('The browser could not create a PNG.')), 'image/png'));
      saveBlob(blob, `${architecture.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-diagram.png`);
      toast('Diagram saved as a PNG image.');
    } catch (err) { toast(getErrorMessage(err, 'PNG export failed. Try the SVG export instead.'), 'error'); }
    finally { setExporting(false); }
  };
  const exportSvg = () => {
    if (!architecture) return;
    try { exportDiagramSvg(architecture); toast('Diagram saved as an SVG file.'); }
    catch (err) { toast(getErrorMessage(err), 'error'); }
  };

  return <ModuleState><div className="space-y-5 animate-fade-up">
    <PageHeader eyebrow="Architecture explorer" title={selectedProject?.name || 'Architecture explorer'} description="Look at how each option is put together, follow the connections, and read the reasoning behind the choice." actions={<><Button variant="outline" size="sm" onClick={exportSvg} disabled={!architecture?.diagram.nodes.length}><FileCode2 className="h-4 w-4" />SVG</Button><Button variant="secondary" size="sm" loading={exporting} onClick={exportPng} disabled={!architecture?.diagram.nodes.length}><ImageDown className="h-4 w-4" />PNG</Button></>} />
    <WorkspaceSelectors />

    <div className="grid gap-3 md:grid-cols-3">{selectedProject?.architectures.map((item, index) => <button key={item.id} onClick={() => { selectArchitecture(item.id); setSelectedNode(null); }} className={`rounded-xl border p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${item.id === architecture?.id ? 'border-primary bg-primary/[0.06]' : 'bg-card hover:border-slate-400'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[12px] font-semibold ${item.id === architecture?.id ? 'text-primary' : 'text-muted-foreground'}`}>Option {index + 1}</span>
        <Badge tone={item.complexity.toLowerCase().includes('high') ? 'amber' : 'default'}>{item.complexity} complexity</Badge>
      </div>
      <h2 className="mt-2 text-[14px] font-semibold text-foreground">{item.name}</h2>
      <p className="mt-1.5 line-clamp-2 text-[13px] leading-5 text-muted-foreground">{item.description}</p>
    </button>)}</div>

    {architecture && <div className="flex items-center gap-1 border-b" role="tablist" aria-label="Architecture view">{([
      { id: 'diagram', label: 'System diagram', icon: Network },
      { id: 'details', label: 'Architecture details', icon: Layers3 },
    ] as const).map((item) => <button key={item.id} role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)} className={`relative flex items-center gap-2 px-4 py-3 text-[14px] font-medium transition ${tab === item.id ? 'text-primary' : 'text-slate-500 hover:text-foreground'}`}><item.icon className="h-4 w-4" />{item.label}{tab === item.id && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-t bg-primary" />}</button>)}</div>}

    {architecture && tab === 'diagram' && (architecture.diagram.nodes.length ? <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className="overflow-hidden rounded-xl border bg-white shadow-card">
        <div ref={diagramRef} className="h-[560px] w-full sm:h-[620px]">
          <ReactFlowProvider><ReactFlow key={architecture.id} nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.18 }} minZoom={0.25} maxZoom={1.8} onNodeClick={(_, node) => setSelectedNode(architecture.diagram.nodes.find((item) => item.id === node.id) || null)} onPaneClick={() => setSelectedNode(null)} colorMode="light" proOptions={{ hideAttribution: false }}>
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#d5d0c6" />
            <Controls position="bottom-left" showInteractive={false} />
            <MiniMap position="bottom-right" pannable zoomable nodeColor={(node) => nodeColor((node.data as FlowNodeData).componentType)} maskColor="rgba(240, 238, 232, 0.7)" className="!hidden sm:!block" />
            <FitControl />
            <Panel position="top-left"><div className="pointer-events-none rounded-lg border bg-white/95 px-3 py-2 shadow-card"><p className="text-[13px] font-medium text-foreground">{architecture.name}</p><p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted-foreground"><MousePointer2 className="h-3 w-3" />Click a component for details</p></div></Panel>
          </ReactFlow></ReactFlowProvider>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t px-4 py-3"><span className="text-[12px] font-medium text-muted-foreground">Component types:</span>{types.map((type) => <span key={type} className="inline-flex items-center gap-1.5 text-[12px] capitalize text-slate-600"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: nodeColor(type) }} />{type}</span>)}</div>
      </section>
      <aside className="space-y-4">
        <section className="rounded-xl border bg-card p-5 shadow-card">
          <h2 className="section-title">Component details</h2>
          {selectedNode ? <div className="mt-4 animate-fade-in">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-slate-50" style={{ color: nodeColor(selectedNode.type) }}><Server className="h-4 w-4" /></span>
            <h3 className="mt-3 text-[15px] font-semibold text-foreground">{selectedNode.label}</h3>
            <Badge className="mt-2 capitalize">{selectedNode.type}</Badge>
            <p className="mt-3 text-[14px] leading-6 text-slate-700">{selectedNode.description || 'This component has no description yet.'}</p>
            <p className="mt-4 border-t pt-3 text-[13px] text-muted-foreground">{architecture.diagram.edges.filter((edge) => edge.source === selectedNode.id || edge.target === selectedNode.id).length} direct connection(s)</p>
          </div> : <div className="py-8 text-center"><MousePointer2 className="mx-auto h-5 w-5 text-slate-300" /><p className="mt-3 text-[14px] leading-6 text-muted-foreground">Click any box in the diagram to read what it does and what it connects to.</p></div>}
        </section>
        <section className="rounded-xl border bg-card p-5 shadow-card">
          <h2 className="section-title">Why this pattern was chosen</h2>
          <p className="mt-3 text-[14px] font-medium text-foreground capitalize">{architecture.pattern}</p>
          <p className="mt-2 text-[14px] leading-6 text-slate-700">{architecture.suitability_explanation}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-4">
            <div><p className="text-[13px] text-muted-foreground">Build cost</p><p className="mt-1 text-[14px] font-semibold text-foreground">{formatINR(architecture.initial_development_cost)}</p></div>
            <div><p className="text-[13px] text-muted-foreground">Monthly infra</p><p className="mt-1 text-[14px] font-semibold text-foreground">{formatINR(architecture.monthly_infrastructure_cost)}</p></div>
          </div>
        </section>
      </aside>
    </div> : <EmptyState icon={<Network className="h-5 w-5" />} title="This option has no diagram" description="No components were returned for it. You can still read the stack, strategies, and trade-offs in the details tab." action={<Button variant="secondary" onClick={() => setTab('details')}>Open architecture details</Button>} />)}
    {architecture && tab === 'details' && <ArchitectureDetails architecture={architecture} />}
  </div></ModuleState>;
}

function ArchitectureDetails({ architecture }: { architecture: Architecture }) {
  const stackLabels = { frontend: 'Frontend', backend: 'Backend', database: 'Database', api: 'API communication', authentication: 'Authentication', deployment: 'Deployment' };
  return <div className="space-y-5 animate-fade-in">
    <section className="rounded-xl border bg-card p-5 shadow-card sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row">
        <div>
          <Badge tone="indigo">{architecture.pattern}</Badge>
          <h2 className="mt-3 text-[18px] font-semibold text-foreground">{architecture.name}</h2>
          <p className="mt-2 max-w-4xl text-[14px] leading-6 text-slate-700">{architecture.description}</p>
        </div>
        <Badge tone={architecture.complexity.toLowerCase().includes('high') ? 'amber' : 'green'} className="self-start">{architecture.complexity} complexity</Badge>
      </div>
    </section>

    <section>
      <h2 className="section-title mb-3 flex items-center gap-2"><Code2 className="h-4 w-4 text-slate-400" />Recommended technology stack</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{(Object.keys(stackLabels) as Array<keyof typeof stackLabels>).map((key) => <div key={key} className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2 text-slate-500">{key === 'database' ? <Database className="h-4 w-4" /> : key === 'authentication' ? <ShieldCheck className="h-4 w-4" /> : key === 'deployment' ? <GitBranch className="h-4 w-4" /> : <Code2 className="h-4 w-4" />}<h3 className="text-[13px] font-semibold text-foreground">{stackLabels[key]}</h3></div>
        <div className="mt-3 flex flex-wrap gap-1.5">{architecture.technology_stack[key]?.length ? architecture.technology_stack[key].map((tech) => <Badge key={tech} tone="indigo">{tech}</Badge>) : <span className="text-[13px] text-muted-foreground">Not specified</span>}</div>
      </div>)}</div>
    </section>

    <div className="grid gap-4 lg:grid-cols-3">
      <StrategyCard title="How it scales" icon={<TrendingUp className="h-4 w-4" />} text={architecture.scalability_strategy} />
      <StrategyCard title="How it stays secure" icon={<ShieldCheck className="h-4 w-4" />} text={architecture.security_strategy} />
      <StrategyCard title="How easy to maintain" icon={<Code2 className="h-4 w-4" />} text={architecture.maintainability_assessment} />
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-xl border bg-card p-5"><h3 className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-success"><CheckCircle2 className="h-4 w-4" />What works well</h3><DataList items={architecture.advantages} tone="positive" /></section>
      <section className="rounded-xl border bg-card p-5"><h3 className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-danger"><XCircle className="h-4 w-4" />What to watch out for</h3><DataList items={architecture.disadvantages} tone="danger" /></section>
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-xl border bg-card p-5"><h3 className="mb-4 text-[14px] font-semibold text-foreground">The trade-offs you accept</h3><DataList items={architecture.tradeoffs} tone="warning" /></section>
      <section className="rounded-xl border bg-card p-5"><h3 className="mb-4 text-[14px] font-semibold text-foreground">Best suited for</h3><DataList items={architecture.recommended_use_cases} /></section>
    </div>

    <section className="rounded-xl border bg-card p-5 shadow-card">
      <h3 className="text-[14px] font-semibold text-foreground">Does this fit your project — and why</h3>
      <p className="mt-2 text-[14px] leading-6 text-slate-700">{architecture.suitability_explanation}</p>
      <div className="mt-5 border-t pt-4">
        <h4 className="mb-3 text-[13px] font-semibold text-muted-foreground">Infrastructure components</h4>
        <div className="flex flex-wrap gap-2">{architecture.infrastructure_components.map((component) => <Badge key={component}>{component}</Badge>)}</div>
      </div>
    </section>
  </div>;
}

function StrategyCard({ title, icon, text }: { title: string; icon: React.ReactNode; text: string }) {
  return <section className="rounded-xl border bg-card p-5"><div className="flex items-center gap-2 text-primary">{icon}<h3 className="text-[14px] font-semibold text-foreground">{title}</h3></div><p className="mt-3 text-[14px] leading-6 text-slate-700">{text}</p></section>;
}
