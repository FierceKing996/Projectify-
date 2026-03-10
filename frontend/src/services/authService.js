import { IDB } from '../db/idbHelper.js'; //

const API_URL = 'http://localhost:5000/api/auth';

export const AuthService = {
    async login(username, password) {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (res.ok) {
            // ⚡ WIPE LOCAL CACHE FOR A CLEAN SLATE!
            await IDB.clear('workspaces');
            await IDB.clear('tasks');
            await IDB.clear('syncQueue');
            const userObj = data.data?.user || data.user;
            const token = data.token;
            debugger;
            localStorage.setItem('agency_token', token);
            localStorage.setItem('agency_user', userObj.username);
            localStorage.setItem('agency_user_obj', JSON.stringify(userObj));
            return userObj;
        }
        throw new Error(data.message || 'Login failed');
    },

    async signup(username, password, email) {
        const res = await fetch(`${API_URL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, email })
        });
        const data = await res.json();

        if (res.ok) {
            // ⚡ WIPE LOCAL CACHE FOR A CLEAN SLATE!
            await IDB.clear('workspaces');
            await IDB.clear('tasks');
            await IDB.clear('syncQueue');
            const userObj = data.data?.user || data.user;
            console.log(JSON.stringify(userObj));
            const token = data.token;

            localStorage.setItem('agency_token', token);
            localStorage.setItem('agency_user', userObj.username);
            localStorage.setItem('agency_user_obj', JSON.stringify(userObj));

            return userObj;
        }
        throw new Error(data.message || 'Signup failed');
    },

    logout() {
        localStorage.removeItem('agency_token');
        localStorage.removeItem('agency_user');
        localStorage.removeItem('agency_user_obj');
    },

    getToken() {
        return localStorage.getItem('agency_token');
    },

    isAuthenticated() {
        return !!this.getToken();
    },
    getUser() {
        const userStr = localStorage.getItem('agency_user_obj');

        // 1. Guard against bad values explicitly
        if (!userStr || userStr === 'undefined' || userStr === 'null') {
            return null;
        }

        // 2. Try/Catch to prevent crashes if JSON is broken
        try {
            return JSON.parse(userStr);
        } catch (e) {
            console.warn("Corrupt user data found. Clearing.");
            localStorage.removeItem('agency_user_obj');
            return null;
        }
    }
};