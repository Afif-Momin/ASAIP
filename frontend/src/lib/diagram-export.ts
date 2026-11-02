import type { Architecture, ArchitectureDiagram } from '@/types';
import { saveBlob } from '@/services/api';
import { slugify } from '@/lib/utils';

const escapeXml = (value: string) => value.replace(/[<>&'\"]/g, (char) => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
}[char] || char));

const typeColors: Record<string, string> = {
  client: '#38bdf8', frontend: '#818cf8', gateway: '#a78bfa', service: '#6366f1',
  backend: '#6366f1', database: '#34d399', cache: '#fbbf24', queue: '#fb7185',
  storage: '#2dd4bf', monitoring: '#f472b6', cloud: '#94a3b8', default: '#818cf8',
};

export function nodeColor(type: string) {
  const key = type.toLowerCase();
  return typeColors[Object.keys(typeColors).find((name) => key.includes(name)) || 'default'];
}

export function architectureToSvg(diagram: ArchitectureDiagram, title = 'ASAIP architecture') {
  const nodeWidth = 190;
  const nodeHeight = 76;
  const nodes = diagram.nodes.map((node) => ({
    ...node,
    x: Number.isFinite(node.position?.x) ? node.position.x : 0,
    y: Number.isFinite(node.position?.y) ? node.position.y : 0,
  }));
  const minX = Math.min(0, ...nodes.map((node) => node.x)) - 60;
  const minY = Math.min(0, ...nodes.map((node) => node.y)) - 90;
  const maxX = Math.max(900, ...nodes.map((node) => node.x + nodeWidth)) + 60;
  const maxY = Math.max(600, ...nodes.map((node) => node.y + nodeHeight)) + 60;
  const width = maxX - minX;
  const height = maxY - minY;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const edges = diagram.edges.map((edge) => {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (!source || !target) return '';
    const x1 = source.x + nodeWidth / 2;
    const y1 = source.y + nodeHeight / 2;
    const x2 = target.x + nodeWidth / 2;
    const y2 = target.y + nodeHeight / 2;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#475569" stroke-width="2" marker-end="url(#arrow)"/><text x="${(x1+x2)/2}" y="${(y1+y2)/2-8}" fill="#94a3b8" font-size="11" text-anchor="middle">${escapeXml(edge.label || '')}</text>`;
  }).join('');
  const nodeSvg = nodes.map((node) => {
    const color = nodeColor(node.type);
    const label = escapeXml(node.label.length > 27 ? `${node.label.slice(0, 26)}…` : node.label);
    return `<g><rect x="${node.x}" y="${node.y}" width="${nodeWidth}" height="${nodeHeight}" rx="12" fill="#111827" stroke="${color}" stroke-opacity=".65"/><rect x="${node.x}" y="${node.y}" width="4" height="${nodeHeight}" rx="2" fill="${color}"/><circle cx="${node.x+24}" cy="${node.y+26}" r="6" fill="${color}"/><text x="${node.x+40}" y="${node.y+31}" fill="#f1f5f9" font-size="14" font-weight="600">${label}</text><text x="${node.x+20}" y="${node.y+55}" fill="#94a3b8" font-size="11">${escapeXml(node.type)}</text></g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#64748b"/></marker></defs><rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="#090d15"/><text x="${minX+30}" y="${minY+42}" fill="#f8fafc" font-family="Inter,Arial,sans-serif" font-size="20" font-weight="600">${escapeXml(title)}</text><g font-family="Inter,Arial,sans-serif">${edges}${nodeSvg}</g></svg>`;
}

export function exportDiagramSvg(architecture: Architecture) {
  const svg = architectureToSvg(architecture.diagram, architecture.name);
  saveBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `${slugify(architecture.name)}-diagram.svg`);
}

export async function exportDiagramPng(architecture: Architecture) {
  const svg = architectureToSvg(architecture.diagram, architecture.name);
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Could not render the architecture diagram.'));
      image.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = image.width * 2;
    canvas.height = image.height * 2;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas export is not supported in this browser.');
    context.scale(2, 2);
    context.drawImage(image, 0, 0);
    const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('PNG export failed.')), 'image/png'));
    saveBlob(png, `${slugify(architecture.name)}-diagram.png`);
  } finally {
    URL.revokeObjectURL(url);
  }
}
