import { useState } from 'react';

// Import engines
import { AuthService } from './services/authService.js';
import { WorkspaceService } from './services/workspaceService.js';
import { ProjectService } from './services/projectService';
import Auth from './components/Auth';

// Import UI Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import WorkspaceModal from './components/WorkspaceModal';
import AdminDashboard from './components/AdminDashboard';
import KanbanBoard from './components/KanbanBoard';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import CalendarView from './components/CalendarView';
import ActivityLog from './components/ActivityLog';
import TemplateChooser from './components/TemplateChooser';
import { OnboardingService } from './services/onboardingService';

// Import Custom Hooks
import { useCollaboration } from './hooks/useCollaboration';
import { useTasks } from './hooks/useTasks';
import { useRealTimeSync } from './hooks/useRealTimeSync';
import { useAppInitialization } from './hooks/useAppInitialization';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(AuthService.isAuthenticated());
  const [userName, setUserName] = useState(localStorage.getItem('agency_user') || 'User');

  // ⚡ KANBAN STATE
  const [currentProject, setCurrentProject] = useState<any>(null);

  const [searchQuery, setSearchQuery] = useState('');

  const [user, setUser] = useState<any>(() => {
    try {
      // Use the safe getter we fixed earlier
      return AuthService.getUser() || {};
    } catch (e) {
      return {};
    }
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [currentWorkspace, setCurrentWorkspace] = useState({
    id: 'default-personal',
    title: 'Personal'
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'kanban' | 'analytics' | 'calendar' | 'activity'>('kanban');
  const [isSettingUpTemplate, setIsSettingUpTemplate] = useState(false);
  const [templateError, setTemplateError] = useState('');
  const isLocalPersonalWorkspace = currentWorkspace?.id === 'default-personal';

  // --- CUSTOM HOOKS ---
  const { isDbReady } = useAppInitialization(isAuthenticated);
  
  const { workspaceMembers } = useCollaboration(
    isAuthenticated,
    currentWorkspace,
    isLocalPersonalWorkspace,
    setSidebarRefreshTrigger
  );

  const { tasks, setTasks, loadTasks, handleTaskCreate } = useTasks(
    currentProject,
    currentWorkspace
  );

  useRealTimeSync(
    isAuthenticated,
    currentWorkspace,
    currentProject,
    isLocalPersonalWorkspace,
    loadTasks,
    setTasks,
    setSidebarRefreshTrigger,
    setCurrentProject
  );

  // --- DELETE HANDLERS ---
  const handleWorkspaceDelete = async (wsId: string) => {
    try {
      await WorkspaceService.deleteWorkspace(wsId);
      // If deleted workspace was the current one, reset
      if (currentWorkspace.id === wsId) {
        setCurrentWorkspace({ id: 'default-personal', title: 'Personal' });
        setCurrentProject(null);
        setTasks([]);
      }
      setSidebarRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Failed to delete workspace', err);
    }
  };

  const handleProjectDelete = async (projectId: string, _wsId: string) => {
    try {
      await ProjectService.deleteProject(projectId);
      // If deleted project was the current one, clear the board
      if (currentProject?._id === projectId) {
        setCurrentProject(null);
        setTasks([]);
      }
      setSidebarRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Failed to delete project', err);
    }
  };

  // --- AUTH SCREENS ---
  if (!isAuthenticated) {
    return <Auth onLogin={() => {
      // Just read what AuthService saved. Do NOT overwrite.
      const freshUser = AuthService.getUser();
      setUser(freshUser);
      setUserName(freshUser?.username || 'User');
      setIsAuthenticated(true);
    }} />;
  }

  if (isAuthenticated && !user?.role) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#111] text-gray-400">
        Verifying Access...
      </div>
    );
  }

  if (user?.role === 'superadmin') {
    return <AdminDashboard onLogout={() => {
      AuthService.logout();
      setIsAuthenticated(false);
      setUser({});
    }} />;
  }

  if (!isDbReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1A1A1A] text-[#00ff88]">
        Initializing System...
      </div>
    );
  }

  if (user?.onboardingCompleted === false) {
    return (
      <TemplateChooser
        error={templateError}
        isSubmitting={isSettingUpTemplate}
        onSelect={async (templateId) => {
          setTemplateError('');
          setIsSettingUpTemplate(true);

          try {
            const { workspace, project, user: updatedUser } = await OnboardingService.createStarterBoard(templateId);
            setCurrentWorkspace(workspace);
            setCurrentProject(project);
            setTasks([]);
            setCurrentView('kanban');
            setUser(updatedUser);
            setUserName(updatedUser?.username || 'User');
            setSidebarRefreshTrigger(prev => prev + 1);
          } catch (err: any) {
            setTemplateError(err.message || 'Failed to set up your starter board.');
          } finally {
            setIsSettingUpTemplate(false);
          }
        }}
      />
    );
  }
  // Filter by search query AND selected label
  const filteredTasks = tasks.filter((task: any) => {
    const matchesSearch = task.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLabel = !selectedLabel || (task.labels && task.labels.includes(selectedLabel));
    return matchesSearch && matchesLabel;
  });

  const allLabels = Array.from(new Set(tasks.flatMap((task: any) => task.labels || [])));

  // --- Compute user's role in current workspace ---
  const currentUserId = user?._id || user?.id;
  const currentMember = workspaceMembers.find((m: any) => m._id === currentUserId);
  const userRole = currentMember?.role || 'owner'; // default to owner if members not loaded yet
  const isAdmin = userRole === 'owner';
  // --- MAIN RENDER ---
  return (
    // 1. Change app-container to have a white background and full height
    <div className="app-container flex h-screen bg-white">

      <Sidebar
        isCollapsed={isSidebarCollapsed}
        toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        currentWorkspaceId={currentWorkspace.id}
        setCurrentWorkspace={setCurrentWorkspace}
        openModal={() => setIsModalOpen(true)}
        refreshTrigger={sidebarRefreshTrigger}
        currentProjectId={currentProject?._id}
        onProjectSelect={setCurrentProject}
        labels={allLabels as string[]}
        selectedLabel={selectedLabel}
        onLabelSelect={(label) => setSelectedLabel(selectedLabel === label ? null : label)}
        onWorkspaceDelete={handleWorkspaceDelete}
        onProjectDelete={handleProjectDelete}
        userRole={userRole}
        currentView={currentView}
        setCurrentView={setCurrentView}
      />

      {/* 2. Change dashboard to have a light gray background (bg-gray-50) */}
      <main className="dashboard flex-1 flex flex-col overflow-hidden bg-gray-50">
        <Header
          username={userName}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          tasks={tasks}
          workspaceMembers={workspaceMembers}
        />

        {/* SWITCH: Show Kanban, Analytics, Calendar OR Empty State */}
        {currentView === 'activity' ? (
          <ActivityLog />
        ) : currentView === 'analytics' ? (
          <AnalyticsDashboard workspaceId={currentWorkspace.id} />
        ) : currentView === 'calendar' ? (
          <CalendarView tasks={tasks} currentUserId={currentUserId} isAdmin={isAdmin} />
        ) : currentProject ? (
          <KanbanBoard
            project={currentProject}
            tasks={filteredTasks}
            onTaskCreate={handleTaskCreate}
            onTaskUpdate={loadTasks}
            isAdmin={isAdmin}
            workspaceMembers={workspaceMembers}
          />
        ) : (
          // 3. Updated Empty State (Light Theme)
          <div className="flex h-full items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="mb-4">
                {/* Professional Icon for Empty State */}
                <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-900 mb-1">No Project Selected</p>
              <p className="text-sm text-gray-500">Select a project from the sidebar to view its board.</p>
            </div>
          </div>
        )}

      </main>

      {isModalOpen && (
        <WorkspaceModal closeModal={() => setIsModalOpen(false)}
          onWorkspaceAdded={() => setSidebarRefreshTrigger(prev => prev + 1)}
        />
      )}

    </div>
  );
}

export default App;
