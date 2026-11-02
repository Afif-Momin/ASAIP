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
  if (!projects.length) return <EmptyState icon={<FolderPlus className="h-5 w-5" />} title="Start with your system requirements" description="Create a project to analyze requirements and generate architecture alternatives. Your work is saved by the backend." action={<Button onClick={() => navigate('/projects/new')}>Create architecture project</Button>} />;
  if (!selectedProject) return <EmptyState title="Select a project" description="Choose a project from the selector to continue." />;
  if (requireArchitecture && !selectedProject.architectures.length) return <EmptyState icon={<Layers3 className="h-5 w-5" />} title="No architecture alternatives yet" description={`Generate architecture alternatives for ${selectedProject.name} from its requirements analysis to use this module.`} action={<Button onClick={() => navigate('/projects/new')}>Open requirements workflow</Button>} />;
  if (requireArchitecture && !selectedArchitecture) return <EmptyState title="Select an architecture" description="Choose one of the generated alternatives to run this analysis." />;
  return <>{children}</>;
}
