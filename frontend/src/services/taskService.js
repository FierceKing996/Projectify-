import { IDB } from '../db/idbHelper.js';
import { SyncManager } from './syncManager.js';
import { AuthService } from './authService.js';

const API_URL = 'http://localhost:5000/api/tasks';

export const TaskService = {

    // 1. GET TASKS (Updated to use workspaceId)
    async getTasks(workspaceId) {
        if (navigator.onLine) {
            try {
                // Fetch tasks from Express backend
                const response = await fetch(API_URL, {
                    headers: {
                        'Authorization': `Bearer ${AuthService.getToken()}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`Server returned status: ${response.status}`);
                }

                const data = await response.json();
                const serverTasks = data.data ? data.data.tasks : data;

                if (Array.isArray(serverTasks)) {
                    // 1. Gather all IDs sent by the server
                    const serverTaskIds = new Set(serverTasks.map(t => t.clientId || t.id || t._id));

                    // 2. Find local synced tasks for this workspace
                    const allLocalTasks = await IDB.getAll('tasks');
                    for (const localTask of allLocalTasks) {
                        // If it's in this workspace, implies it's synced perfectly before, but is MISSING from server now:
                        // That means it was deleted on the server! We must wipe it locally.
                        if (localTask.workspaceId === workspaceId && localTask.synced && !serverTaskIds.has(localTask.id)) {
                            console.log(`🧹 Hydration: Removing stale deleted task ${localTask.id} from local IDB`);
                            await IDB.delete('tasks', localTask.id).catch(() => { });
                        }
                    }

                    // 3. Save all server tasks
                    for (const task of serverTasks) {
                        // FIX: Ensure MongoDB's _id or clientId is properly mapped to IndexedDB's 'id'
                        const safeTask = {
                            ...task,
                            id: task.clientId || task.id || task._id,
                            synced: true
                        };

                        await IDB.put('tasks', safeTask);
                    }
                    console.log(" Local database perfectly hydrated from server.");
                }
            } catch (err) {

                console.error(' Hydration Error:', err.message);
            }
        }

        // ALWAYS return the tasks from IndexedDB
        const localTasks = await IDB.getAll('tasks', 'workspaceId', workspaceId);

        const visibleTasks = localTasks.filter(t => !t.isDeleted);
        return visibleTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    async syncBatch(tasksArray) {
        const token = AuthService.getToken();

        const response = await fetch(`${API_URL}/batch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ tasks: tasksArray })
        });

        if (!response.ok) {
            throw new Error(`Batch sync failed with status: ${response.status}`);
        }

        return await response.json();
    },

    // 2. ADD TASK (Updated to use workspaceId)
    async addTask(taskData) {
        const newTask = {
            ...taskData,
            id: taskData.clientId, // Force ID to match
            synced: false,
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            isDeleted: false
        };

        // Save locally first for instant UI
        await IDB.put('tasks', newTask);

        // Try Online Sync
        if (navigator.onLine) {
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${AuthService.getToken()}`
                    },
                    body: JSON.stringify(newTask)
                });

                if (response.ok) {
                    const responseData = await response.json();

                    // ⚡ THE FIX: Get the REAL task from MongoDB (which includes the _id)
                    const realServerTask = responseData.data.task;

                    // Overwrite the temporary local task with the real one
                    await IDB.put('tasks', {
                        ...realServerTask,
                        id: realServerTask.clientId,
                        synced: true
                    });

                    return realServerTask;
                }
            } catch (err) {
                console.warn('Offline: Task saved locally.');
            }
        }

        // Offline? Queue it.
        await this.addToSyncQueue({
            id: newTask.id,
            action: 'CREATE',
            payload: newTask
        });

        return newTask;
    },

    // 3. DELETE TASK
    async deleteTask(taskId) {
        // 1. BULLETPROOF LOCAL DELETE: Find the exact task in the cache first
        const allTasks = await IDB.getAll('tasks');
        const localTask = allTasks.find(t =>
            t.id === taskId || t._id === taskId || t.clientId === taskId
        );

        if (localTask) {
            // Tell IndexedDB to delete using the exact key it knows about
            await IDB.delete('tasks', localTask.id);
            console.log("Locally deleted task:", localTask.id);
        }

        // 2. Safety Check for temp tasks
        if (taskId.toString().startsWith('temp-')) {
            const queue = await IDB.getAll('syncQueue');
            const queuedItem = queue.find(q => q.id === taskId);
            if (queuedItem) await IDB.delete('syncQueue', queuedItem.id);
            return;
        }

        // 3. Server Delete
        if (navigator.onLine) {
            try {
                await fetch(`${API_URL}/${taskId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${AuthService.getToken()}` }
                });
                console.log("Server deleted task:", taskId);
            } catch (err) {
                console.error("Server delete failed, but local is gone.", err);
            }
        } else {
            await SyncManager.addToQueue({
                type: 'DELETE_TASK',
                payload: { taskId }
            });
        }
    },

    // 4. UPDATE TASK
    async updateTask(taskId, updates) {
        // A. Local Update
        const tasks = await IDB.getAll('tasks');
        // Find by either ID type to be safe
        const task = tasks.find(t => t.id === taskId || t._id === taskId || t.clientId === taskId);

        if (task) {
            await IDB.put('tasks', { ...task, ...updates });
        }

        // B. If it's still a temp task, don't hit the server yet
        if (taskId.toString().startsWith('temp-')) return;

        // C. Server Update - Use the taskId directly in the URL
        if (navigator.onLine) {
            await fetch(`${API_URL}/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AuthService.getToken()}`
                },
                body: JSON.stringify(updates)
            });
        } else {
            await SyncManager.addToQueue({
                type: 'UPDATE_TASK',
                payload: { taskId, updates }
            });
        }
    },



    async moveTask(taskId, sectionId, order, completed) {
        // 1. Optimistic UI update (update Local DB immediately)
        // ... (You can add IDB logic here if you want offline support for moving)

        // 2. Send to Server
        const res = await fetch(`${API_URL}/${taskId}/move`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AuthService.getToken()}`
            },
            body: JSON.stringify({ sectionId, order, completed })
        });
        return await res.json();
    },

    // HELPER: SMART QUEUE
    async addToSyncQueue(newItem) {
        const queue = await IDB.getAll('syncQueue');
        const existingCreate = queue.find(q => q.id === newItem.id && q.action === 'CREATE');

        if (existingCreate) {
            if (newItem.action === 'DELETE') {
                await IDB.delete('syncQueue', existingCreate.id);
            } else {
                existingCreate.payload = { ...newItem.payload, clientId: newItem.id };
                await IDB.put('syncQueue', existingCreate);
            }
        } else {
            await IDB.put('syncQueue', newItem);
        }
        SyncManager.processQueue();
    }
};