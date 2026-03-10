import { AuthService } from './authService.js';

const API_URL = 'http://localhost:5000/api/activity';

export const ActivityService = {
    async getLogs(limit = 100) {
        const response = await fetch(`${API_URL}?limit=${limit}`, {
            headers: {
                Authorization: `Bearer ${AuthService.getToken()}`
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Activity API not found. Restart the backend server and reload the app.');
            }

            throw new Error(`Failed to load activity logs (${response.status})`);
        }

        const data = await response.json();
        return data.data?.activityLogs || [];
    }
};
