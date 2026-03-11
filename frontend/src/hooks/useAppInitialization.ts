import { useState, useEffect } from 'react';
import { initDB } from '../db/dbconfig.js';
import { SyncManager } from '../services/syncManager.js';
import { IDB } from '../db/idbHelper.js';
import { AuthService } from '../services/authService.js';

export function useAppInitialization(isAuthenticated: boolean) {
  const [isDbReady, setIsDbReady] = useState(false);

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

  return { isDbReady };
}
