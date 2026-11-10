import {
  Activity, Cog, Database, Gauge, Globe, HardDrive, Inbox, KeyRound, Monitor,
  Plug, Search, Server, ShieldCheck, Split, Users, Zap, type LucideIcon,
} from 'lucide-react';
import type { DiagramNode } from '@/types';

// Geometry mirrored from backend/app/services/diagram_layout.py so the explorer, SVG/PNG
// export, and PDF report all place components identically.
export const NODE_W = 220;
export const NODE_H = 88;
export const COLUMN_PITCH = 350;
export const ROW_SLOT = 128;

export const CANONICAL_TYPES = [
  'client', 'frontend', 'cdn', 'loadbalancer', 'gateway', 'service', 'function',
  'worker', 'database', 'cache', 'queue', 'storage', 'search', 'monitoring',
  'secrets', 'external',
] as const;
export type ComponentType = (typeof CANONICAL_TYPES)[number];

export interface ComponentMeta { label: string; color: string; icon: LucideIcon }

// Palette mirrored in backend/app/services/report_generator.py for PDF parity.
const COMPONENT_META: Record<string, ComponentMeta> = {
  client: { label: 'Client', color: '#0d9488', icon: Users },
  frontend: { label: 'Frontend', color: '#0891b2', icon: Monitor },
  cdn: { label: 'CDN', color: '#6366f1', icon: Globe },
  loadbalancer: { label: 'Load balancer', color: '#7c3aed', icon: Split },
  gateway: { label: 'API gateway', color: '#8b5cf6', icon: ShieldCheck },
  service: { label: 'Service', color: '#2563eb', icon: Server },
  function: { label: 'Function', color: '#3b82f6', icon: Zap },
  worker: { label: 'Worker', color: '#1e40af', icon: Cog },
  database: { label: 'Database', color: '#047857', icon: Database },
  cache: { label: 'Cache', color: '#15803d', icon: Gauge },
  queue: { label: 'Queue / stream', color: '#ea580c', icon: Inbox },
  storage: { label: 'Object storage', color: '#059669', icon: HardDrive },
  search: { label: 'Search index', color: '#10b981', icon: Search },
  monitoring: { label: 'Observability', color: '#db2777', icon: Activity },
  secrets: { label: 'Identity & secrets', color: '#e11d48', icon: KeyRound },
  external: { label: 'External system', color: '#d97706', icon: Plug },
};
const FALLBACK_META: ComponentMeta = { label: 'Service', color: '#2563eb', icon: Server };

export function componentMeta(type: string): ComponentMeta {
  return COMPONENT_META[(type || '').toLowerCase()] ?? FALLBACK_META;
}
export function nodeColor(type: string): string {
  return componentMeta(type).color;
}
export function componentIcon(type: string): LucideIcon {
  return componentMeta(type).icon;
}
export function componentLabel(type: string): string {
  return componentMeta(type).label;
}

export interface TierMeta { id: string; label: string; tint: string; border: string }
export const TIERS: TierMeta[] = [
  { id: 'client', label: 'Client & presentation', tint: '#f0fdfa', border: '#99f6e4' },
  { id: 'edge', label: 'Edge & delivery', tint: '#f5f3ff', border: '#ddd6fe' },
  { id: 'application', label: 'Application', tint: '#eff6ff', border: '#bfdbfe' },
  { id: 'integration', label: 'Async & integration', tint: '#fffbeb', border: '#fde68a' },
  { id: 'data', label: 'Data & storage', tint: '#ecfdf5', border: '#a7f3d0' },
  { id: 'operations', label: 'Observability & security', tint: '#fff1f2', border: '#fecdd3' },
];
export function tierMeta(id?: string): TierMeta | undefined {
  return TIERS.find((tier) => tier.id === id);
}

export type EdgeKind = 'sync' | 'async' | 'data';
export interface EdgeVisual { stroke: string; dash?: string; animated: boolean; label: string }
const EDGE_VISUALS: Record<EdgeKind, EdgeVisual> = {
  sync: { stroke: '#64748b', animated: false, label: 'Request / response' },
  async: { stroke: '#ea580c', dash: '6 4', animated: true, label: 'Async event / queue' },
  data: { stroke: '#059669', dash: '2 4', animated: false, label: 'Data read / write' },
};
export function edgeVisual(kind?: string): EdgeVisual {
  return EDGE_VISUALS[(kind as EdgeKind) ?? 'sync'] ?? EDGE_VISUALS.sync;
}
export const EDGE_KINDS: EdgeKind[] = ['sync', 'async', 'data'];

export interface TierBand {
  id: string; label: string; tint: string; border: string;
  x: number; y: number; width: number; height: number;
}

// The backend lays out one left-to-right column per tier; derive a labelled swimlane band
// for each tier present so the explorer and exports show the same architectural layers.
export function computeTierBands(nodes: DiagramNode[]): TierBand[] {
  if (!nodes.length) return [];
  const groups = new Map<string, DiagramNode[]>();
  for (const node of nodes) {
    const tier = node.tier || 'application';
    const group = groups.get(tier);
    if (group) group.push(node);
    else groups.set(tier, [node]);
  }
  const ys = nodes.map((node) => node.position?.y ?? 0);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const order = [
    ...TIERS.map((tier) => tier.id),
    ...[...groups.keys()].filter((id) => !TIERS.some((tier) => tier.id === id)),
  ];
  const bands: TierBand[] = [];
  for (const id of order) {
    const group = groups.get(id);
    if (!group) continue;
    const meta = tierMeta(id) ?? { id, label: id, tint: '#f8fafc', border: '#e2e8f0' };
    const x = Math.min(...group.map((node) => node.position?.x ?? 0));
    bands.push({
      id, label: meta.label, tint: meta.tint, border: meta.border,
      x: x - 30, y: minY - 66, width: NODE_W + 60, height: maxY - minY + NODE_H + 98,
    });
  }
  return bands;
}