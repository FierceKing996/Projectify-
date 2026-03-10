import { IDB } from '../db/idbHelper.js';
import { AuthService } from './authService.js';
import { TaskService } from './taskService.js'; // NEW: Import TaskService for the batch route

const API_URL = 'http://localhost:5000/api/tasks';

export const SyncManager = {
    isSyncing: false,
    retryDelay: 1000,
    maxDelay: 30000,

    init() {
        console.log(" SyncManager: Initialized");

        // 1. Standard Online Event
        window.addEventListener('online', () => {
            console.log(" Event: Online - Syncing...");
            this.retryDelay = 1000;
            this.processQueue();
        });

        // 2. Tab Focus Event (Catches cases where 'online' event missed)
        window.addEventListener('focus', () => {
            if (navigator.onLine) {
                console.log(" Event: Focus - Checking Queue...");
                this.processQueue();
            }
        });

        // 3. Immediate Check
        if (navigator.onLine) this.processQueue();
    },

    async processQueue() {
        if (this.isSyncing || !navigator.onLine) return;

        const queue = await IDB.getAll('syncQueue');
        if (queue.length === 0) return;

        this.isSyncing = true;
        console.log(` Processing ${queue.length} offline items...`);

        try {
            //  1. THE SORTER: Separate batchable items from non-batchable items
            const taskUpserts = queue.filter(item => item.action === 'CREATE' || item.action === 'UPDATE');
            const otherActions = queue.filter(item => item.action !== 'CREATE' && item.action !== 'UPDATE');

            //  2. PROCESS THE BATCH (All creates and updates at once)
            if (taskUpserts.length > 0) {
                console.log(` Batching ${taskUpserts.length} task updates into a single API call...`);

                // Extract payloads and ensure clientIds exist
                const tasksToBatch = taskUpserts.map(item => {
                    if (item.action === 'CREATE' && !item.payload.clientId) {
                        item.payload.clientId = item.payload.id;
                    }
                    return item.payload;
                });

                // Send the massive array to the server
                await TaskService.syncBatch(tasksToBatch);

                // Clean up the DB for everything in the batch
                for (const item of taskUpserts) {
                    await IDB.delete('syncQueue', item.id);
                    const task = await IDB.get('tasks', item.id);
                    if (task) {
                        await IDB.put('tasks', { ...task, synced: true });
                    }
                }
                console.log(' Task Batch Sync complete!');
            }

            //  3. PROCESS THE REST (Deletes, Workspaces)
            for (const item of otherActions) {
                await this.syncItem(item);
                console.log(` Synced: ${item.action} ${item.id}`);
                await IDB.delete('syncQueue', item.id);
            }

            // 4. FINISH UP
            window.dispatchEvent(new CustomEvent('task-synced'));
            this.retryDelay = 1000;

        } catch (err) {
            console.warn(` Sync Error (${this.retryDelay}ms backoff):`, err);
            // Wait and try again if the server is still unreachable
            const jitter = Math.floor(Math.random() * (this.retryDelay * 0.2));
            const finalDelay = this.retryDelay + jitter;
            setTimeout(() => this.processQueue(), this.finalDelay);
            this.retryDelay = Math.min(this.retryDelay * 2, this.maxDelay);
        } finally {
            this.isSyncing = false;
        }
    },

    async syncItem(item) {
        let url = API_URL;
        let options = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AuthService.getToken()}`
            }
        };

        // Ensure payload has clientId if it's a CREATE action
        if (item.action === 'CREATE' && !item.payload.clientId) {
            item.payload.clientId = item.payload.id;
        }

        switch (item.action) {
            case 'CREATE':
                options.method = 'POST';
                options.body = JSON.stringify(item.payload);
                break;
            case 'UPDATE':
                url = `${API_URL}/${item.payload.id}`;
                options.method = 'PUT';
                options.body = JSON.stringify(item.payload);
                break;
            case 'DELETE':
                url = `${API_URL}/${item.id}`;
                options.method = 'DELETE';
                break;
            case 'CREATE_WORKSPACE':
                url = 'http://localhost:5000/api/workspaces';
                options.method = 'POST';
                options.body = JSON.stringify({ ...item.payload, clientId: item.payload.id });
                break;
            case 'DELETE_WORKSPACE':
                url = `http://localhost:5000/api/workspaces/${item.id}`;
                options.method = 'DELETE';
                break;
            case 'CREATE_ARCHIVE':
                url = 'http://localhost:5000/api/archives';
                options.method = 'POST';
                options.body = JSON.stringify(item.payload);
                break;
            case 'DELETE_ARCHIVE':
                url = `http://localhost:5000/api/archives/${item.payload.id}`;
                options.method = 'DELETE';
                break;
            default:
                throw new Error(`Unknown Action: ${item.action}`);
        }

        const response = await fetch(url, options);
        if (!response.ok) {
            // If deleting and it's 404, we consider it done
            if (item.action === 'DELETE' && response.status === 404) return;
            throw new Error(`Server Status: ${response.status}`);
        }
    }
};