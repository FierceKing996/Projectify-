import { useState, useEffect } from 'react';

// Import engines
import { initDB } from './db/dbconfig.js';
import { SyncManager } from './services/syncManager.js';
import { AuthService } from './services/authService.js';
import { IDB } from './db/idbHelper.js';
import { TaskService } from './services/taskService';
import { WorkspaceService } from './services/workspaceService.js';
import { ProjectService } from './services/projectService';
import { CollaborationService } from './services/collaborationService.js';
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

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(AuthService.isAuthenticated());
  const [userName, setUserName] = useState(localStorage.getItem('agency_user') || 'User');

  // ⚡ KANBAN STATE
  const [currentProject, setCurrentProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState('');

  const [user, setUser] = useState<any>(() => {
    try {
      // Use the safe getter we fixed earlier
      return AuthService.getUser() || {};
    } catch (e) {
      return {};
    }
  });

  const [isDbReady, setIsDbReady] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [currentWorkspace, setCurrentWorkspace] = useState({
    id: 'default-personal',
    title: 'Personal'
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);
  const [currentView, setCurrentView] = useState<'kanban' | 'analytics' | 'calendar' | 'activity'>('kanban');
  const [isSettingUpTemplate, setIsSettingUpTemplate] = useState(false);
  const [templateError, setTemplateError] = useState('');
  const isLocalPersonalWorkspace = currentWorkspace?.id === 'default-personal';

  // --- COLLABORATION: Heartbeat every 30s ---
  useEffect(() => {
    if (!isAuthenticated) return;
    // Send heartbeat immediately
    CollaborationService.sendHeartbeat();
    const interval = setInterval(() => {
      CollaborationService.sendHeartbeat();
    }, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // --- COLLABORATION: Fetch workspace members & presence ---
  useEffect(() => {
    if (!isAuthenticated || !currentWorkspace?.id || isLocalPersonalWorkspace) return;
    // Reset immediately to prevent stale avatars from stacking
    setWorkspaceMembers([]);
    const fetchMembers = async () => {
      try {
        const members = await CollaborationService.getMembers(currentWorkspace.id);
        setWorkspaceMembers(members);
      } catch {
        setWorkspaceMembers([]);
      }
    };
    fetchMembers();
    // Poll presence every 30s
    const presenceInterval = setInterval(fetchMembers, 30000);
    return () => clearInterval(presenceInterval);
  }, [isAuthenticated, currentWorkspace, isLocalPersonalWorkspace]);

  // --- COLLABORATION: Handle invite token in URL ---
  useEffect(() => {
    if (!isAuthenticated) return;
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get('invite');
    if (inviteToken) {
      CollaborationService.acceptInvite(inviteToken)
        .then((data: any) => {
          if (data.status === 'success') {
            alert(`🎉 ${data.message}`);
            setSidebarRefreshTrigger(prev => prev + 1);
          } else if (data.status === 'pending_signup') {
            alert(data.message);
          }
          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch((err: Error) => {
          console.error('Failed to accept invite:', err.message);
          window.history.replaceState({}, document.title, window.location.pathname);
        });
    }
  }, [isAuthenticated]);

  // --- ⚡ 1. DEFINE LOAD TASKS (The Missing Piece) ---
  const loadTasks = async () => {
    if (!currentProject) return;
    try {
      // Fetch all tasks for this workspace
      const allTasks = await TaskService.getTasks(currentWorkspace.id);

      // Filter client-side for the current project
      // (Later we can optimize this to fetch only project tasks from backend)
      const projectTasks = allTasks.filter((t: any) => t.projectId === currentProject._id);
      setTasks(projectTasks);
    } catch (err) {
      console.error("Failed to load tasks", err);
    }
  };

  // --- ⚡ 2. USE EFFECT TO LOAD ---
  useEffect(() => {
    if (currentProject) {
      loadTasks();
    }

    // ⚡ NEW: Auto-refresh when internet comes back
    const handleOnline = () => {
      console.log("Back online! Refreshing tasks...");
      setTimeout(() => loadTasks(), 2000); // Wait 2s for SyncManager to finish uploading
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [currentProject, currentWorkspace]); // Reload if project OR workspace changes

  // --- 📡 SSE: Real-time task sync for shared workspaces ---
  useEffect(() => {
    if (!isAuthenticated || !currentWorkspace?.id || isLocalPersonalWorkspace) return;

    const token = localStorage.getItem('agency_token');
    const eventSource = new EventSource(
      `http://localhost:5000/api/collaboration/workspaces/${currentWorkspace.id}/events?token=${token}`
    );

    eventSource.onmessage = (event) => {
      try {
        const { type, data } = JSON.parse(event.data);
        if (['task_created', 'task_updated', 'task_moved'].includes(type)) {
          console.log(`📡 SSE: Received ${type}, refreshing tasks...`);
          loadTasks();
        } else if (type === 'task_deleted' && data?.taskId) {
          console.log(`📡 SSE: Task deleted (${data.taskId}), removing locally...`);
          // Remove from React state immediately
          setTasks(prev => prev.filter(t =>
            t.clientId !== data.taskId && t._id !== data.taskId && t.id !== data.taskId
          ));

          // Bulletproof IDB remove: find exact local task first
          IDB.getAll('tasks').then((allTasks: any[]) => {
            const localTask = allTasks.find(t =>
              t.id === data.taskId || t._id === data.taskId || t.clientId === data.taskId
            );
            if (localTask) {
              IDB.delete('tasks', localTask.id).catch(() => { });
            }
          });
        } else if (['project_created', 'project_updated', 'project_deleted'].includes(type) && data) {
          console.log(`📡 SSE: Received ${type}, refreshing projects...`);
          // Force sidebar to refetch projects
          setSidebarRefreshTrigger(prev => prev + 1);

          // If the current project was updated (e.g., sections moved/renamed), update state
          if (type === 'project_updated' && currentProject && currentProject._id === data.project._id) {
            setCurrentProject(data.project);
            // Also optionally update IDB local copy if you cache projects locally
            // ProjectService/IDB sync for projects might be lighter weight
          }

          // If the current project was deleted, deselect it
          if (type === 'project_deleted' && currentProject && currentProject._id === data.projectId) {
            setCurrentProject(null);
            setTasks([]);
          }
        }
      } catch (err) {
        console.warn('SSE parse error:', err);
      }
    };

    eventSource.onerror = () => {
      console.warn('📡 SSE connection error, will auto-reconnect...');
    };

    return () => {
      eventSource.close();
      console.log('📡 SSE connection closed');
    };
  }, [isAuthenticated, currentWorkspace, currentProject, isLocalPersonalWorkspace]);

  // --- ⚡ 3. HANDLE CREATE TASK ---
  const handleTaskCreate = async (sectionId: string, content: string, assignedTo?: string | null) => {
    const targetSection = currentProject?.sections?.find((section: any) => section.id === sectionId);
    const isCompleted = Boolean(targetSection?.isCompleted) || sectionId.toLowerCase().includes('done');
    const tempId = `temp-${Date.now()}`;
    const newTask = {
      clientId: tempId,
      content,
      sectionId,
      projectId: currentProject._id,
      workspaceId: currentWorkspace.id,
      priority: 'Medium',
      order: tasks.length,
      completed: isCompleted,
      completedAt: isCompleted ? new Date().toISOString() : null,
      assignedTo: assignedTo || null
    };

    // Optimistic Update (Show it immediately)
    setTasks(prev => [...prev, newTask]);

    try {
      // Sync to Backend
      await TaskService.addTask(newTask);
      // Refresh to get the real ID from server
      loadTasks();
    } catch (err) {
      console.error("Failed to create task", err);
    }
  };

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

  // --- INITIALIZATION ---
  useEffect(() => {
    if (!isAuthenticated) return;

    const startupSequence = async () => {
      try {
        await initDB();
        SyncManager.init();

        // Try to fetch archives if online
        if (navigator.onLine) {
          try {
            const res = await fetch('http://localhost:5000/api/archives', {
              headers: { 'Authorization': `Bearer ${AuthService.getToken()}` }
            });
            if (res.ok) {
              const { data } = await res.json();
              for (const arc of data.archives) {
                await IDB.put('archives', { ...arc, type: 'AES-GCM' });
              }
            }
          } catch (err) { console.warn("Offline: Could not fetch cloud archives."); }
        }
        setIsDbReady(true);
        console.log("App Online");
      } catch (error) {
        console.error("Critical System Failure: DB Init", error);
      }
    };

    startupSequence();
  }, [isAuthenticated]);

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
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLabel = !selectedLabel || (task.labels && task.labels.includes(selectedLabel));
    return matchesSearch && matchesLabel;
  });

  const allLabels = Array.from(new Set(tasks.flatMap(task => task.labels || [])));

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
        labels={allLabels}
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

        {/* 4. Removed Footer to match the clean reference image */}
        {/* <Footer workspaceId={currentWorkspace.id} onLogout={() => setIsAuthenticated(false)} /> */}
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
