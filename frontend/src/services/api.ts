import axios, { AxiosError } from 'axios';
import type {
  Architecture,
  ArchitectureWeights,
  CloudProvider,
  Comparison,
  CostEstimate,
  CriticReview,
  EvolutionAnalysis,
  PlatformConfig,
  Project,
  ProjectPayload,
  RequirementsAnalysis,
  ScalabilityAnalysis,
} from '@/types';

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

export const http = axios.create({
  baseURL: API_URL,
  timeout: 120_000,
  headers: { 'Content-Type': 'application/json' },
});

export const api = {
  system: {
    health: async () => (await http.get<{ status: string; service: string; version: string }>('/api/health')).data,
    config: async () => (await http.get<PlatformConfig>('/api/config')).data,
  },
  projects: {
    list: async () => (await http.get<Project[]>('/api/projects')).data,
    get: async (id: number) => (await http.get<Project>(`/api/projects/${id}`)).data,
    create: async (data: ProjectPayload) => (await http.post<Project>('/api/projects', data)).data,
    update: async (id: number, data: Partial<ProjectPayload>) =>
      (await http.put<Project>(`/api/projects/${id}`, data)).data,
    remove: async (id: number) => (await http.delete(`/api/projects/${id}`)).data,
  },
  requirements: {
    analyze: async (projectId: number) =>
      (await http.post<RequirementsAnalysis>(`/api/projects/${projectId}/analyze-requirements`)).data,
  },
  architectures: {
    generate: async (projectId: number) =>
      (await http.post<Architecture[]>(`/api/projects/${projectId}/generate-architectures`)).data,
    list: async (projectId: number) =>
      (await http.get<Architecture[]>(`/api/projects/${projectId}/architectures`)).data,
    get: async (id: number) => (await http.get<Architecture>(`/api/architectures/${id}`)).data,
  },
  comparison: {
    get: async (projectId: number) =>
      (await http.get<Comparison>(`/api/projects/${projectId}/comparison`)).data,
    run: async (projectId: number, weights: ArchitectureWeights) =>
      (await http.post<Comparison>(`/api/projects/${projectId}/compare`, weights)).data,
  },
  critic: {
    review: async (architectureId: number) =>
      (await http.post<CriticReview>(`/api/architectures/${architectureId}/review`, {})).data,
  },
  cost: {
    estimate: async (architectureId: number, provider: CloudProvider) =>
      (await http.post<CostEstimate>(`/api/architectures/${architectureId}/estimate-cost`, { provider })).data,
  },
  scalability: {
    analyze: async (architectureId: number) =>
      (await http.post<ScalabilityAnalysis>(`/api/architectures/${architectureId}/analyze-scalability`, {})).data,
  },
  evolution: {
    analyze: async (architectureId: number) =>
      (await http.post<EvolutionAnalysis>(`/api/architectures/${architectureId}/evolution`, {})).data,
  },
  reports: {
    pdf: async (projectId: number) =>
      (await http.post<Blob>(`/api/projects/${projectId}/export-report`, { format: 'pdf' }, { responseType: 'blob' })).data,
    json: async (projectId: number) =>
      (await http.get<unknown>(`/api/projects/${projectId}/export-json`)).data,
  },
};

interface FastApiError { detail?: string | Array<{ msg?: string; loc?: Array<string | number> }> }

export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(error)) {
    const err = error as AxiosError<FastApiError>;
    if (err.code === 'ECONNABORTED') return 'The analysis is taking longer than expected. Please try again.';
    if (!err.response) return `Cannot reach the ASAIP API at ${API_URL}. Start the backend and check your connection.`;
    const detail = err.response.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map((item) => item.msg).filter(Boolean).join('; ') || fallback;
    if (err.response.status === 404) return 'The requested analysis or project was not found.';
    if (err.response.status >= 500) return 'The backend could not complete this request. Check the server logs and try again.';
  }
  return error instanceof Error ? error.message : fallback;
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function saveJson(data: unknown, filename: string) {
  saveBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), filename);
}
