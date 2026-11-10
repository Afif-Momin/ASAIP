import { useMemo, useRef, useState } from 'react';
import {
  Background, BackgroundVariant, Controls, Handle, MarkerType, MiniMap, Panel, Position,
  ReactFlow, ReactFlowProvider, useReactFlow,
  type Edge, type Node, type NodeProps,
} from '@xyflow/react';
import html2canvas from 'html2canvas';
import {
  CheckCircle2, Code2, Database, FileCode2, GitBranch, ImageDown, Layers3,
  Maximize2, MousePointer2, Network, ShieldCheck, TrendingUp, XCircle,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getErrorMessage, saveBlob } from '@/services/api';
import { exportDiagramSvg } from '@/lib/diagram-export';
import {
  EDGE_KINDS, componentMeta, computeTierBands, edgeVisual, nodeColor, tierMeta,
} from '@/lib/diagram';
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

interface FlowNodeData extends Record<string, unknown> {
  label: string; componentType: string; description: string; tier?: string;
}
type FlowNode = Node<FlowNodeData, 'architecture'>;

function ArchitectureNode({ data, selected }: NodeProps<FlowNode>) {
  const meta = componentMeta(data.componentType);
  const Icon = meta.icon;
  return <div
    className={`relative flex h-[88px] w-[220px] items-center gap-3 rounded-xl border bg-white px-3.5 shadow-card transition ${selected ? 'border-primary ring-2 ring-primary/25' : 'border-slate-200'}`}
    style={{ borderLeftColor: meta.color, borderLeftWidth: 4 }}
  >
    <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-2 !border-white !bg-slate-400" />
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}>
      <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[13px] font-semibold leading-tight text-foreground">{data.label}</span>
      <span className="mt-1 block truncate text-[11px] font-medium" style={{ color: meta.color }}>{meta.label}</span>
    </span>
    <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-2 !border-white !bg-slate-400" />
  </div>;
}

interface TierZoneData extends Record<string, unknown> { label: string; tint: string; border: string }
function TierZoneNode({ data }: NodeProps) {
  const zone = data as TierZoneData;
  return <div className="relative h-full w-full rounded-2xl border" style={{ backgroundColor: zone.tint, borderColor: zone.border }}>
    <span className="absolute left-3 top-2.5 rounded-md bg-white/85 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600 shadow-sm">{zone.label}</span>
  </div>;
}

const nodeTypes = { architecture: ArchitectureNode, tierZone: TierZoneNode };

function FitControl() {
  const { fitView } = useReactFlow();
  return <Panel position="top-right"><Button size="sm" variant="secondary" onClick={() => fitView({ padding: 0.16, duration: 350 })}><Maximize2 className="h-4 w-4" />Fit to screen</Button></Panel>;
}

export default function ExplorerPage() {
  const { selectedProject, selectedArchitecture, selectArchitecture } = useApp();
  const [tab, setTab] = useState<'diagram' | 'details'>('diagram');
  const [selectedNode, setSelectedNode] = useState<DiagramNode | null>(null);
  const [exporting, setExporting] = useState(false);
  const diagramRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const architecture = selectedArchitecture;

  const nodes = useMemo<Node[]>(() => {
    const diagramNodes = architecture?.diagram.nodes ?? [];
    const zones: Node[] = computeTierBands(diagramNodes).map((band) => ({
      id: `tier-${band.id}`, type: 'tierZone', position: { x: band.x, y: band.y },
      data: { label: band.label, tint: band.tint, border: band.border },
      style: { width: band.width, height: band.height },
      selectable: false, draggable: false, connectable: false, focusable: false, zIndex: -1,
    }));
    const components: Node[] = diagramNodes.map((node) => ({
      id: node.id, type: 'architecture', position: node.position,
      data: { label: node.label, componentType: node.type, description: node.description, tier: node.tier },
    }));
    return [...zones, ...components];
  }, [architecture]);

  const edges = useMemo<Edge[]>(() => (architecture?.diagram.edges ?? []).map((edge) => {
    const visual = edgeVisual(edge.kind);
    return {
      id: edge.id, source: edge.source, target: edge.target, label: edge.label,
      type: 'smoothstep', animated: visual.animated,
      style: { stroke: visual.stroke, strokeWidth: 1.6, strokeDasharray: visual.dash },
      markerEnd: { type: MarkerType.ArrowClosed, color: visual.stroke, width: 16, height: 16 },
      labelStyle: { fill: '#475569', fontSize: 11, fontWeight: 500 },
      labelBgStyle: { fill: '#ffffff', fillOpacity: 0.9 },
      labelBgPadding: [4, 2] as [number, number], labelBgBorderRadius: 4,
    };
  }), [architecture]);

  const types = useMemo(() => [...new Set((architecture?.diagram.nodes ?? []).map((node) => node.type))], [architecture]);
  const selectedMeta = selectedNode ? componentMeta(selectedNode.type) : null;
  const selectedTier = selectedNode ? tierMeta(selectedNode.tier) : null;
  const SelectedIcon = selectedMeta?.icon;

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
          <ReactFlowProvider><ReactFlow key={architecture.id} nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.16 }} minZoom={0.2} maxZoom={1.8} onNodeClick={(_, node) => setSelectedNode(node.type === 'architecture' ? architecture.diagram.nodes.find((item) => item.id === node.id) || null : null)} onPaneClick={() => setSelectedNode(null)} colorMode="light" proOptions={{ hideAttribution: false }}>
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#d5d0c6" />
            <Controls position="bottom-left" showInteractive={false} />
            <MiniMap position="bottom-right" pannable zoomable nodeColor={(node) => node.type === 'tierZone' ? '#e2e8f0' : nodeColor((node.data as FlowNodeData).componentType)} maskColor="rgba(240, 238, 232, 0.7)" className="!hidden sm:!block" />
            <FitControl />
            <Panel position="top-left"><div className="pointer-events-none rounded-lg border bg-white/95 px-3 py-2 shadow-card"><p className="text-[13px] font-medium text-foreground">{architecture.name}</p><p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted-foreground"><MousePointer2 className="h-3 w-3" />Click a component for details</p></div></Panel>
          </ReactFlow></ReactFlowProvider>
        </div>
        <div className="space-y-2.5 border-t px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2"><span className="text-[12px] font-semibold text-muted-foreground">Components:</span>{types.map((type) => { const meta = componentMeta(type); const Icon = meta.icon; return <span key={type} className="inline-flex items-center gap-1.5 text-[12px] text-slate-600"><Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />{meta.label}</span>; })}</div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2"><span className="text-[12px] font-semibold text-muted-foreground">Connections:</span>{EDGE_KINDS.map((kind) => { const visual = edgeVisual(kind); return <span key={kind} className="inline-flex items-center gap-1.5 text-[12px] text-slate-600"><svg width="26" height="8" aria-hidden="true"><line x1="0" y1="4" x2="26" y2="4" stroke={visual.stroke} strokeWidth="2" strokeDasharray={visual.dash} /></svg>{visual.label}</span>; })}</div>
          <p className="text-[12px] leading-5 text-muted-foreground">Read left to right: requests enter at the client and edge layers, flow through application logic, and reach data stores. Coloured bands group each architectural layer. Click any component to read what it does.</p>
        </div>
      </section>
      <aside className="space-y-4">
        <section className="rounded-xl border bg-card p-5 shadow-card">
          <h2 className="section-title">Component details</h2>
          {selectedNode && selectedMeta && SelectedIcon ? <div className="mt-4 animate-fade-in">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${selectedMeta.color}1a`, color: selectedMeta.color }}><SelectedIcon className="h-5 w-5" /></span>
            <h3 className="mt-3 text-[15px] font-semibold text-foreground">{selectedNode.label}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium" style={{ backgroundColor: `${selectedMeta.color}1a`, color: selectedMeta.color }}><SelectedIcon className="h-3 w-3" />{selectedMeta.label}</span>
              {selectedTier && <Badge>{selectedTier.label}</Badge>}
            </div>
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