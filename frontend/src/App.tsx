import { Route, Routes, useNavigate } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import OverviewPage from '@/pages/OverviewPage';
import NewProjectPage from '@/pages/NewProjectPage';
import ProjectsPage from '@/pages/ProjectsPage';
import ExplorerPage from '@/pages/ExplorerPage';
import ComparisonPage from '@/pages/ComparisonPage';
import CriticPage from '@/pages/CriticPage';
import CostPage from '@/pages/CostPage';
import ScalabilityPage from '@/pages/ScalabilityPage';
import EvolutionPage from '@/pages/EvolutionPage';
import ReportsPage from '@/pages/ReportsPage';
import SettingsPage from '@/pages/SettingsPage';

function NotFoundPage() {
  const navigate = useNavigate();
  return <div className="flex min-h-[60vh] flex-col items-center justify-center text-center"><div className="rounded-2xl border border-white/[0.07] bg-card p-3 text-slate-500"><Compass className="h-6 w-6" /></div><p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-400">404 · Route not found</p><h1 className="mt-2 font-display text-2xl font-semibold text-slate-200">This workspace doesn’t exist.</h1><p className="mt-2 text-xs text-slate-600">Return to the architecture intelligence overview.</p><Button className="mt-5" variant="outline" onClick={() => navigate('/')}><ArrowLeft className="h-4 w-4" />Back to overview</Button></div>;
}

export default function App() {
  return <Routes><Route element={<AppShell />}><Route index element={<OverviewPage />} /><Route path="projects/new" element={<NewProjectPage />} /><Route path="projects" element={<ProjectsPage />} /><Route path="explorer" element={<ExplorerPage />} /><Route path="comparison" element={<ComparisonPage />} /><Route path="critic" element={<CriticPage />} /><Route path="cost" element={<CostPage />} /><Route path="scalability" element={<ScalabilityPage />} /><Route path="evolution" element={<EvolutionPage />} /><Route path="reports" element={<ReportsPage />} /><Route path="settings" element={<SettingsPage />} /><Route path="*" element={<NotFoundPage />} /></Route></Routes>;
}
