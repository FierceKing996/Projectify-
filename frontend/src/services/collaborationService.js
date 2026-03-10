import { AuthService } from './authService.js';

const API_URL = 'http://localhost:5000/api/collaboration';

export const CollaborationService = {

    // 1. Invite a user to a workspace
    async inviteUser(workspaceClientId, email) {
        const res = await fetch(`${API_URL}/workspaces/${workspaceClientId}/invite`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AuthService.getToken()}`
            },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to send invitation');
        return data;
    },

    // 2. Get workspace members with presence
    async getMembers(workspaceClientId) {
        const res = await fetch(`${API_URL}/workspaces/${workspaceClientId}/members`, {
            headers: {
                'Authorization': `Bearer ${AuthService.getToken()}`
            }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to fetch members');
        return data.data.members;
    },

    // 3. Send heartbeat for presence tracking
    async sendHeartbeat() {
        try {
            await fetch(`${API_URL}/heartbeat`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AuthService.getToken()}`
                }
            });
        } catch (err) {
            // Silently fail — not critical
            console.warn('Heartbeat failed:', err.message);
        }
    },

    // 4. Accept an invitation via token
    async acceptInvite(token) {
        const res = await fetch(`${API_URL}/invitations/accept/${token}`);
        const data = await res.json();
        if (!res.ok && data.status !== 'pending_signup') {
            throw new Error(data.message || 'Failed to accept invitation');
        }
        return data;
    },

    // 5. Get pending invitations for a workspace
    async getPendingInvitations(workspaceClientId) {
        const res = await fetch(`${API_URL}/workspaces/${workspaceClientId}/invitations`, {
            headers: {
                'Authorization': `Bearer ${AuthService.getToken()}`
            }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to fetch invitations');
        return data.data.invitations;
    }
};
