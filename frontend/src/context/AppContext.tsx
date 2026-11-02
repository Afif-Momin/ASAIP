import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, getErrorMessage } from '@/services/api';
import type { Architecture, Project } from '@/types';

interface AppContextValue {
  projects: Project[];
  loading: boolean;
  error: string | null;
  selectedProjectId: number | null;
  selectedArchitectureId: number | null;
  selectedProject: Project | null;
  selectedArchitecture: Architecture | null;
  selectProject: (id: number | null) => void;
  selectArchitecture: (id: number | null) => void;
  refreshProjects: () => Promise<Project[]>;
}
const AppContext = createContext<AppContextValue | null>(null);

function storedNumber(key: string): number | null {
  try {
    const value = window.localStorage.getItem(key);
    return value ? Number(value) : null;
  } catch { return null; }
}
function storeNumber(key: string, value: number | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, String(value));
  } catch { /* Selection persistence is optional when storage is blocked. */ }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(() => storedNumber('asaip.selectedProject'));
  const [selectedArchitectureId, setSelectedArchitectureId] = useState<number | null>(() => storedNumber('asaip.selectedArchitecture'));

  const refreshProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.projects.list();
      setProjects(data);
      return data;
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      throw err;
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { refreshProjects().catch(() => undefined); }, [refreshProjects]);

  const selectedProject = useMemo(() => projects.find((project) => project.id === selectedProjectId) || null, [projects, selectedProjectId]);
  const selectedArchitecture = useMemo(() => selectedProject?.architectures.find((architecture) => architecture.id === selectedArchitectureId) || null, [selectedProject, selectedArchitectureId]);

  useEffect(() => {
    if (loading || !projects.length) return;
    if (!selectedProjectId || !projects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(projects[0].id);
      storeNumber('asaip.selectedProject', projects[0].id);
    }
  }, [projects, loading, selectedProjectId]);

  useEffect(() => {
    if (!selectedProject) {
      if (selectedArchitectureId !== null) setSelectedArchitectureId(null);
      return;
    }
    if (!selectedProject.architectures.some((architecture) => architecture.id === selectedArchitectureId)) {
      const next = selectedProject.architectures[0]?.id ?? null;
      setSelectedArchitectureId(next);
      storeNumber('asaip.selectedArchitecture', next);
    }
  }, [selectedProject, selectedArchitectureId]);

  const selectProject = useCallback((id: number | null) => {
    setSelectedProjectId(id);
    setSelectedArchitectureId(null);
    storeNumber('asaip.selectedProject', id);
    storeNumber('asaip.selectedArchitecture', null);
  }, []);
  const selectArchitecture = useCallback((id: number | null) => {
    setSelectedArchitectureId(id);
    storeNumber('asaip.selectedArchitecture', id);
  }, []);

  const value = useMemo<AppContextValue>(() => ({
    projects, loading, error, selectedProjectId, selectedArchitectureId, selectedProject, selectedArchitecture,
    selectProject, selectArchitecture, refreshProjects,
  }), [projects, loading, error, selectedProjectId, selectedArchitectureId, selectedProject, selectedArchitecture, selectProject, selectArchitecture, refreshProjects]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
