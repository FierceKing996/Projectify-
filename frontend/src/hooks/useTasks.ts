import { useState, useEffect, useCallback } from 'react';
import { TaskService } from '../services/taskService';

export function useTasks(currentProject: any, currentWorkspace: any) {
  const [tasks, setTasks] = useState<any[]>([]);

  // --- ⚡ 1. DEFINE LOAD TASKS ---
  const loadTasks = useCallback(async () => {
    if (!currentProject) return;
    try {
      // Fetch all tasks for this workspace
      const allTasks = await TaskService.getTasks(currentWorkspace.id);

      // Filter client-side for the current project
      const projectTasks = allTasks.filter((t: any) => t.projectId === currentProject._id);
      setTasks(projectTasks);
    } catch (err) {
      console.error("Failed to load tasks", err);
    }
  }, [currentProject, currentWorkspace]);

  // --- ⚡ 2. USE EFFECT TO LOAD ---
  useEffect(() => {
    if (currentProject) {
      loadTasks();
    } else {
      setTasks([]);
    }

    // Auto-refresh when internet comes back
    const handleOnline = () => {
      console.log("Back online! Refreshing tasks...");
      setTimeout(() => loadTasks(), 2000); // Wait 2s for SyncManager to finish uploading
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [currentProject, loadTasks]);

  // --- ⚡ 3. HANDLE CREATE TASK ---
  const handleTaskCreate = async (sectionId: string, content: string, assignedTo?: string | null) => {
    if (!currentProject || !currentWorkspace) return;
    
    const targetSection = currentProject.sections?.find((section: any) => section.id === sectionId);
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

  return { tasks, setTasks, loadTasks, handleTaskCreate };
}