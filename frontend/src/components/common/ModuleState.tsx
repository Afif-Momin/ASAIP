import { useNavigate } from 'react-router-dom';
import { FolderPlus, Layers3 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { EmptyState, ErrorState } from './States';
import { PageSkeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export function ModuleState({ children, requireArchitecture = true }: { children: React.ReactNode; requireArchitecture?: boolean }) {
  const { loading, error, projects, selectedProject, selectedArchitecture, refreshProjects } = useApp();
  const navigate = useNavigate();
  if (loading && !projects.length) return <PageSkeleton />;
  if (error && !projects.length) return <ErrorState message={error} onRetry={() => refreshProjects().catch(() => undefined)} />;
  if (!projects.length) return <EmptyState
    icon={<FolderPlus className="h-5 w-5" />}
    title="You have not created a project yet"
    description="Start by describing the system you have in mind. ASAIP saves your requirements on the backend, then turns them into architecture options you can compare."
    action={<Button onClick={() => navigate('/projects/new')}>Describe a system</Button>} />;
  if (!selectedProject) return <EmptyState
    title="Pick a project to continue"
    description={`You have ${projects.length} saved project${projects.length === 1 ? '' : 's'}. Choose one in the Project selector below, or open My Projects to see them all.`}
    action={<Button variant="secondary" onClick={() => navigate('/projects')}>Open My Projects</Button>} />;
  if (requireArchitecture && !selectedProject.architectures.length) return <EmptyState
    icon={<Layers3 className="h-5 w-5" />}
    title={`${selectedProject.name} has no architecture options yet`}
    description="This module works on generated alternatives. Run architecture generation for this project first, then come back here."
    action={<Button onClick={() => navigate('/projects/new')}>Go to the requirements workflow</Button>} />;
  if (requireArchitecture && !selectedArchitecture) return <EmptyState
    title="Choose which alternative to analyse"
    description={`${selectedProject.name} has ${selectedProject.architectures.length} architecture options. Pick one above and this module will run against it.`} />;
  return <>{children}</>;
}
