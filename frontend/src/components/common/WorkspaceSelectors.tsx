import { FolderKanban, Layers3 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { engineLabel } from '@/lib/utils';

export function WorkspaceSelectors({ architecture = true, compact = false }: { architecture?: boolean; compact?: boolean }) {
  const { projects, selectedProject, selectedArchitecture, selectedProjectId, selectedArchitectureId, selectProject, selectArchitecture } = useApp();
  const engine = engineLabel(selectedArchitecture?.analysis_mode || selectedProject?.requirements_analysis?.analysis_mode);
  return <div className={`flex flex-col gap-3 rounded-xl border bg-white ${compact ? 'p-3' : 'p-4'} lg:flex-row lg:items-end`}>
    <label className="min-w-0 flex-1 space-y-1.5">
      <span className="flex items-center gap-1.5 text-[13px] font-medium text-foreground"><FolderKanban className="h-4 w-4 text-slate-400" />Project</span>
      <Select aria-label="Select project" value={selectedProjectId ?? ''} onChange={(event) => selectProject(event.target.value ? Number(event.target.value) : null)}>
        <option value="" disabled>Select a project</option>
        {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
      </Select>
    </label>
    {architecture && <label className="min-w-0 flex-1 space-y-1.5">
      <span className="flex items-center gap-1.5 text-[13px] font-medium text-foreground"><Layers3 className="h-4 w-4 text-slate-400" />Architecture option</span>
      <Select aria-label="Select architecture" value={selectedArchitectureId ?? ''} disabled={!selectedProject?.architectures.length} onChange={(event) => selectArchitecture(event.target.value ? Number(event.target.value) : null)}>
        {!selectedProject?.architectures.length && <option value="">No architectures generated yet</option>}
        {selectedProject?.architectures.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </Select>
    </label>}
    {(selectedProject || selectedArchitecture) && <div className="lg:pb-1">
      <Badge tone={engine.tone === 'ai' ? 'violet' : engine.tone === 'demo' ? 'cyan' : 'default'}>{engine.label}</Badge>
      <p className="mt-1.5 text-[12px] text-muted-foreground">Where this result came from</p>
    </div>}
  </div>;
}
