import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function engineLabel(mode?: string | null) {
  if (!mode) return { label: 'Analysis mode not reported', tone: 'neutral' as const };
  const normalized = mode.toLowerCase();
  if (normalized.includes('demo') || normalized.includes('fallback') || normalized.includes('deterministic')) {
    return { label: 'Demo engine result (no AI used)', tone: 'demo' as const };
  }
  if (normalized.includes('ai') || normalized.includes('claude') || normalized.includes('llm')) {
    return { label: 'Live AI result', tone: 'ai' as const };
  }
  return { label: `Analysis mode: ${mode}`, tone: 'neutral' as const };
}

/** Backend list fields arrive as string arrays; forms edit them as plain text. */
export function listToText(value: unknown): string {
  return Array.isArray(value) ? value.join('; ') : typeof value === 'string' ? value : '';
}

export function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'asaip-project';
}
