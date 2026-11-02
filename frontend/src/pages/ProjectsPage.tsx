import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, FolderKanban, GitCompareArrows, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { api, getErrorMessage } from '@/services/api';
import { formatDate, formatINR } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { EmptyState, ErrorState } from '@/components/common/States';
import { PageSkeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/common/PageHeader';
import { useToast } from '@/components/ui/toast';
import type { Project } from '@/types';

export default function ProjectsPage() {
  const { projects, loading, error, refreshProjects, selectProject } = useApp();
  const [search, setSearch] = useState('');
  const [renameProject, setRenameProject] = useState<Project | null>(null);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const filtered = useMemo(() => projects.filter((project) => `${project.name} ${project.domain} ${project.description}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)), [projects, search]);

  const open = (project: Project, path = '/explorer') => { selectProject(project.id); navigate(project.architectures.length || path !== '/explorer' ? path : '/projects/new'); };
  const submitRename = async () => {
    if (!renameProject || !name.trim()) return;
    setBusy(true);
    try {
      await api.projects.update(renameProject.id, { name: name.trim() });
      await refreshProjects();
      toast('Project renamed.');
      setRenameProject(null);
    } catch (err) { toast(getErrorMessage(err), 'error'); }
    finally { setBusy(false); }
  };
  const confirmDelete = async () => {
    if (!deleteProject) return;
    setBusy(true);
    try {
      await api.projects.remove(deleteProject.id);
      await refreshProjects();
      toast(`“${deleteProject.name}” deleted.`, 'info');
      setDeleteProject(null);
    } catch (err) { toast(getErrorMessage(err), 'error'); }
    finally { setBusy(false); }
  };
  if (loading && !projects.length) return <PageSkeleton />;
  if (error && !projects.length) return <ErrorState message={error} onRetry={() => refreshProjects().catch(() => undefined)} />;

  return <div className="space-y-6 animate-fade-up">
    <PageHeader eyebrow="Project management" title="My architecture projects" description="Reopen saved work, refine project names, compare alternatives, and manage your architecture workspace." actions={<Button onClick={() => navigate('/projects/new')}><Plus className="h-4 w-4" />New project</Button>} />
    <div className="flex flex-col gap-3 rounded-xl border border-white/[0.07] bg-card p-3 sm:flex-row sm:items-center">
      <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-600" /><Input aria-label="Search projects" className="pl-9" placeholder="Search by project, domain, or description…" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      <p className="px-2 text-[10px] text-slate-600">{filtered.length} of {projects.length} project{projects.length === 1 ? '' : 's'}</p>
    </div>
    {!projects.length ? <EmptyState icon={<FolderKanban className="h-5 w-5" />} title="No saved projects" description="Create your first architecture project. Requirements, analyses, and recommendations will be persisted by the backend." action={<Button onClick={() => navigate('/projects/new')}>Create project</Button>} /> : !filtered.length ? <EmptyState icon={<Search className="h-5 w-5" />} title="No matching projects" description={`No projects match “${search}”. Try a different name or domain.`} action={<Button variant="outline" onClick={() => setSearch('')}>Clear search</Button>} /> : <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {filtered.map((project) => <article key={project.id} className="group flex min-h-[250px] flex-col rounded-xl border border-white/[0.075] bg-card p-5 shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-indigo-500/20">
        <div className="flex items-start justify-between gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-500/15 bg-indigo-500/[0.07] text-indigo-400"><FolderKanban className="h-4 w-4" /></div><Badge tone={project.architectures.length ? 'indigo' : 'default'}>{project.architectures.length ? `${project.architectures.length} alternatives` : 'Requirements draft'}</Badge></div>
        <h2 className="mt-4 truncate font-display text-[15px] font-semibold text-slate-200">{project.name}</h2>
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{project.description}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-[10px] text-slate-600"><span>{project.domain}</span><span className="text-right">{formatINR(project.budget)} budget</span><span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3 w-3" />{formatDate(project.updated_at)}</span><span className="text-right">{project.cloud_provider}</span></div>
        <div className="mt-auto flex items-center gap-1 border-t border-white/[0.06] pt-4">
          <Button size="sm" variant="secondary" onClick={() => open(project)}>{project.architectures.length ? 'Reopen' : 'Continue'}<ArrowUpRight className="h-3.5 w-3.5" /></Button>
          {project.architectures.length > 1 && <Button size="sm" variant="ghost" onClick={() => open(project, '/comparison')} aria-label={`Compare ${project.name} architectures`}><GitCompareArrows className="h-3.5 w-3.5" />Compare</Button>}
          <div className="ml-auto flex"><Button size="icon" variant="ghost" aria-label={`Rename ${project.name}`} onClick={() => { setRenameProject(project); setName(project.name); }}><Pencil className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" className="hover:text-rose-400" aria-label={`Delete ${project.name}`} onClick={() => setDeleteProject(project)}><Trash2 className="h-3.5 w-3.5" /></Button></div>
        </div>
      </article>)}
    </div>}
    <Dialog open={Boolean(renameProject)} onClose={() => !busy && setRenameProject(null)} title="Rename project" description="This updates the saved project, not just its display label.">
      <label className="space-y-2 text-xs font-medium text-slate-300">Project name<Input autoFocus value={name} maxLength={120} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') submitRename(); }} /></label>
      <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" onClick={() => setRenameProject(null)} disabled={busy}>Cancel</Button><Button loading={busy} disabled={!name.trim()} onClick={submitRename}>Save name</Button></div>
    </Dialog>
    <Dialog open={Boolean(deleteProject)} onClose={() => !busy && setDeleteProject(null)} title="Delete architecture project?" description={`“${deleteProject?.name}” and all of its architectures and analyses will be permanently removed. This cannot be undone.`}>
      <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setDeleteProject(null)} disabled={busy}>Keep project</Button><Button variant="danger" loading={busy} onClick={confirmDelete}><Trash2 className="h-4 w-4" />Delete permanently</Button></div>
    </Dialog>
  </div>;
}
