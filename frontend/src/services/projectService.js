import { AuthService } from './authService';

const API_URL = 'http://localhost:5000/api/projects';

export const ProjectService = {
    async createProject(title, workspaceId) {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AuthService.getToken()}`
            },
            body: JSON.stringify({ title, workspaceId })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || `Failed to create project (${res.status})`);
        }
        const data = await res.json();
        return data.data.project;
    },

    async getProjects(workspaceId) {
        const res = await fetch(`${API_URL}/workspace/${workspaceId}`, {
            headers: { 'Authorization': `Bearer ${AuthService.getToken()}` }
        });
        const data = await res.json();
        return data.data.projects;
    },

    async updateSections(projectId, sections) {
        const res = await fetch(`${API_URL}/${projectId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AuthService.getToken()}`
            },
            body: JSON.stringify({ sections })
        });
        const data = await res.json();
        return data.data.project;
    },

    async deleteProject(projectId) {
        await fetch(`${API_URL}/${projectId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${AuthService.getToken()}` }
        });
    }
};