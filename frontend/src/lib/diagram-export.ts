import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Architecture, ArchitectureDiagram } from '@/types';
import { saveBlob } from '@/services/api';
import { slugify } from '@/lib/utils';
import {
  NODE_H, NODE_W, componentIcon, componentLabel, computeTierBands, edgeVisual, nodeColor,
} from '@/lib/diagram';

const escapeXml = (value: string) => value.replace(/[<>&'"]/g, (char) => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
}[char] || char));

const iconCache = new Map<string, string>();
function iconInner(type: string): string {
  const cached = iconCache.get(type);
  if (cached !== undefined) return cached;
  const markup = renderToStaticMarkup(createElement(componentIcon(type), { size: 24, strokeWidth: 2 }));
  const inner = markup.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  iconCache.set(type, inner);
  return inner;
}

const EDGE_MARKER: Record<string, string> = { sync: '#64748b', async: '#ea580c', data: '#059669' };

export function architectureToSvg(diagram: ArchitectureDiagram, title = 'ASAIP architecture') {
  const nodes = diagram.nodes.map((node) => ({
    ...node,
    x: Number.isFinite(node.position?.x) ? node.position.x : 0,
    y: Number.isFinite(node.position?.y) ? node.position.y : 0,
  }));
  const bands = computeTierBands(diagram.nodes);
  const minX = Math.min(0, ...bands.map((band) => band.x), ...nodes.map((node) => node.x)) - 40;
  const minY = Math.min(0, ...bands.map((band) => band.y), ...nodes.map((node) => node.y)) - 64;
  const maxX = Math.max(900, ...bands.map((band) => band.x + band.width), ...nodes.map((node) => node.x + NODE_W)) + 40;
  const maxY = Math.max(400, ...bands.map((band) => band.y + band.height), ...nodes.map((node) => node.y + NODE_H)) + 40;
  const width = maxX - minX;
  const height = maxY - minY;
  const byId = new Map(nodes.map((node) => [node.id, node]));

  const bandSvg = bands.map((band) =>
    `<g><rect x="${band.x}" y="${band.y}" width="${band.width}" height="${band.height}" rx="16" fill="${band.tint}" stroke="${band.border}"/><text x="${band.x + 14}" y="${band.y + 24}" fill="#475569" font-size="12" font-weight="600" letter-spacing="0.5">${escapeXml(band.label.toUpperCase())}</text></g>`
  ).join('');

  const edges = diagram.edges.map((edge) => {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (!source || !target) return '';
    const visual = edgeVisual(edge.kind);
    const x1 = source.x + NODE_W;
    const y1 = source.y + NODE_H / 2;
    const x2 = target.x;
    const y2 = target.y + NODE_H / 2;
    const mx = (x1 + x2) / 2;
    const dash = visual.dash ? ` stroke-dasharray="${visual.dash}"` : '';
    const label = edge.label ? `<text x="${mx}" y="${(y1 + y2) / 2 - 7}" fill="#475569" font-size="11" text-anchor="middle" stroke="#ffffff" stroke-width="3" paint-order="stroke">${escapeXml(edge.label)}</text>` : '';
    return `<path d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}" fill="none" stroke="${visual.stroke}" stroke-width="1.8"${dash} marker-end="url(#arrow-${edge.kind || 'sync'})"/>${label}`;
  }).join('');

  const nodeSvg = nodes.map((node) => {
    const color = nodeColor(node.type);
    const label = escapeXml(node.label.length > 23 ? `${node.label.slice(0, 22)}…` : node.label);
    const chipY = node.y + (NODE_H - 36) / 2;
    return `<g><rect x="${node.x}" y="${node.y}" width="${NODE_W}" height="${NODE_H}" rx="12" fill="#ffffff" stroke="#e2e8f0"/><rect x="${node.x}" y="${node.y}" width="4" height="${NODE_H}" rx="2" fill="${color}"/><rect x="${node.x + 14}" y="${chipY}" width="36" height="36" rx="9" fill="${color}1a"/><svg x="${node.x + 22}" y="${chipY + 8}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconInner(node.type)}</svg><text x="${node.x + 62}" y="${node.y + 40}" fill="#1d2b38" font-size="14" font-weight="600">${label}</text><text x="${node.x + 62}" y="${node.y + 59}" fill="${color}" font-size="11" font-weight="500">${escapeXml(componentLabel(node.type))}</text></g>`;
  }).join('');

  const markers = Object.entries(EDGE_MARKER).map(([kind, color]) =>
    `<marker id="arrow-${kind}" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="${color}"/></marker>`
  ).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}"><defs>${markers}</defs><rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="#ffffff"/><text x="${minX + 30}" y="${minY + 40}" fill="#1d2b38" font-family="Inter,Arial,sans-serif" font-size="20" font-weight="600">${escapeXml(title)}</text><g font-family="Inter,Arial,sans-serif">${bandSvg}${edges}${nodeSvg}</g></svg>`;
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