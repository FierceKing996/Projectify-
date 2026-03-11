import { useEffect } from 'react';
import { IDB } from '../db/idbHelper.js';

export function useRealTimeSync(
  isAuthenticated: boolean,
  currentWorkspace: { id: string, title?: string } | null,
  currentProject: any,
  isLocalPersonalWorkspace: boolean,
  loadTasks: () => void,
  setTasks: React.Dispatch<React.SetStateAction<any[]>>,
  setSidebarRefreshTrigger: React.Dispatch<React.SetStateAction<number>>,
  setCurrentProject: React.Dispatch<React.SetStateAction<any>>
) {
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
  }, [isAuthenticated, currentWorkspace, currentProject, isLocalPersonalWorkspace, loadTasks, setTasks, setSidebarRefreshTrigger, setCurrentProject]);
}
