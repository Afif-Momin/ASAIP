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
      toast(`“${deleteProject.name}” was deleted.`, 'info');
      setDeleteProject(null);
    } catch (err) { toast(getErrorMessage(err), 'error'); }
    finally { setBusy(false); }
  };
  if (loading && !projects.length) return <PageSkeleton />;
  if (error && !projects.length) return <ErrorState message={error} onRetry={() => refreshProjects().catch(() => undefined)} />;

  return <div className="space-y-6 animate-fade-up">
    <PageHeader eyebrow="Everything you have saved" title="Your projects" description="Open previous work, give a project a clearer name, jump straight into comparing its options, or remove projects you no longer need." actions={<Button onClick={() => navigate('/projects/new')}><Plus className="h-4 w-4" />New project</Button>} />
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center">
      <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input aria-label="Search projects" className="pl-9" placeholder="Search by name, domain or description…" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      <p className="px-2 text-[13px] text-muted-foreground">Showing {filtered.length} of {projects.length} project{projects.length === 1 ? '' : 's'}</p>
    </div>
    {!projects.length ? <EmptyState icon={<FolderKanban className="h-5 w-5" />} title="You have no projects yet" description="Create your first one — your requirements, analyses and recommendations are saved on the backend so you can pick up where you left off." action={<Button onClick={() => navigate('/projects/new')}>Create a project</Button>} /> : !filtered.length ? <EmptyState icon={<Search className="h-5 w-5" />} title="Nothing matches that search" description={`No project matches “${search}”. Try a different name or domain.`} action={<Button variant="outline" onClick={() => setSearch('')}>Clear the search</Button>} /> : <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {filtered.map((project) => <article key={project.id} className="flex min-h-[250px] flex-col rounded-xl border bg-card p-5 shadow-card transition duration-200 hover:border-slate-300 hover:shadow-raised">
        <div className="flex items-start justify-between gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/[0.08] text-primary"><FolderKanban className="h-4 w-4" /></div><Badge tone={project.architectures.length ? 'indigo' : 'default'}>{project.architectures.length ? `${project.architectures.length} options generated` : 'Still at the requirements stage'}</Badge></div>
        <h2 className="mt-4 truncate text-[16px] font-semibold text-foreground">{project.name}</h2>
        <p className="mt-2 line-clamp-2 text-[14px] leading-6 text-muted-foreground">{project.description}</p>
        <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[13px]">
          <div className="flex items-center gap-1.5 text-muted-foreground"><CalendarDays className="h-4 w-4" /><dt className="sr-only">Last updated</dt><dd>{formatDate(project.updated_at)}</dd></div>
          <dd className="text-right text-slate-700">{project.domain}</dd>
          <dd className="text-muted-foreground">{project.cloud_provider}</dd>
          <dd className="text-right text-slate-700">{formatINR(project.budget)} budget</dd>
        </dl>
        <div className="mt-auto flex flex-wrap items-center gap-1 border-t pt-4">
          <Button size="sm" variant="secondary" onClick={() => open(project)}>{project.architectures.length ? 'Open' : 'Continue'}<ArrowUpRight className="h-3.5 w-3.5" /></Button>
          {project.architectures.length > 1 && <Button size="sm" variant="ghost" onClick={() => open(project, '/comparison')} aria-label={`Compare the options for ${project.name}`}><GitCompareArrows className="h-3.5 w-3.5" />Compare</Button>}
          <div className="ml-auto flex">
            <Button size="icon" variant="ghost" aria-label={`Rename ${project.name}`} onClick={() => { setRenameProject(project); setName(project.name); }}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button size="icon" variant="ghost" className="hover:text-danger" aria-label={`Delete ${project.name}`} onClick={() => setDeleteProject(project)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      </article>)}
    </div>}
    <Dialog open={Boolean(renameProject)} onClose={() => !busy && setRenameProject(null)} title="Rename this project" description="The saved project is updated, not just the label on screen.">
      <label className="space-y-1.5"><span className="field-label">Project name</span><Input autoFocus value={name} maxLength={120} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') submitRename(); }} /></label>
      <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" onClick={() => setRenameProject(null)} disabled={busy}>Cancel</Button><Button loading={busy} disabled={!name.trim()} onClick={submitRename}>Save name</Button></div>
    </Dialog>
    <Dialog open={Boolean(deleteProject)} onClose={() => !busy && setDeleteProject(null)} title="Delete this project?" description={`“${deleteProject?.name}” and everything in it — its architectures, analyses and comparisons — will be removed for good. You cannot undo this.`}>
      <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setDeleteProject(null)} disabled={busy}>Keep it</Button><Button variant="danger" loading={busy} onClick={confirmDelete}><Trash2 className="h-4 w-4" />Delete for good</Button></div>
    </Dialog>
  </div>;
}
