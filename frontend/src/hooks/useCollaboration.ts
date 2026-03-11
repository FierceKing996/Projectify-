import { useState, useEffect } from 'react';
import { CollaborationService } from '../services/collaborationService.js';

export function useCollaboration(
  isAuthenticated: boolean,
  currentWorkspace: { id: string, title?: string } | null,
  isLocalPersonalWorkspace: boolean,
  setSidebarRefreshTrigger: React.Dispatch<React.SetStateAction<number>>
) {
  const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);

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
  }, [isAuthenticated, setSidebarRefreshTrigger]);

  return { workspaceMembers, setWorkspaceMembers };
}
