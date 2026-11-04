import type { CSSProperties } from 'react';

/** Muted, print-friendly palette for the light theme charts. */
export const seriesColors = ['#276582', '#4f8a5b', '#a8681f', '#6b5b95', '#b4413d', '#2c7a7b', '#7a6a53'];

export const seriesColor = (index: number) => seriesColors[index % seriesColors.length];

export const chartTooltipStyle = {
  background: '#ffffff', border: '1px solid #ded9cf', borderRadius: 10, fontSize: 13,
  color: '#1d2b38', boxShadow: '0 6px 20px rgba(23,35,48,.10)', padding: '8px 12px',
} as CSSProperties;

export const chartGridColor = '#e6e2da';
export const chartAxisColor = '#55636f';
