/**
 * SSE (Server-Sent Events) Manager
 * Tracks active connections per workspace and broadcasts task change events.
 * This is NOT WebSockets — it's standard HTTP kept open for server-to-client push.
 */

// Map: workspaceId -> Set of { res, userId }
const workspaceConnections = new Map();

/**
 * Add a client connection to a workspace's listener pool
 */
function addConnection(workspaceId, res, userId) {
    if (!workspaceConnections.has(workspaceId)) {
        workspaceConnections.set(workspaceId, new Set());
    }
    const conn = { res, userId };
    workspaceConnections.get(workspaceId).add(conn);

    // Clean up on disconnect
    res.on('close', () => {
        const conns = workspaceConnections.get(workspaceId);
        if (conns) {
            conns.delete(conn);
            if (conns.size === 0) workspaceConnections.delete(workspaceId);
        }
        console.log(`📡 SSE client disconnected from workspace ${workspaceId} (${conns?.size || 0} remaining)`);
    });

    console.log(`📡 SSE client connected to workspace ${workspaceId} (${workspaceConnections.get(workspaceId).size} total)`);
}

/**
 * Broadcast a task change event to all clients listening on a workspace
 * Optionally exclude the user who made the change (they already see it locally)
 */
function broadcast(workspaceId, eventType, data, excludeUserId = null) {
    const conns = workspaceConnections.get(workspaceId);
    if (!conns || conns.size === 0) return;

    const payload = JSON.stringify({ type: eventType, data });

    for (const conn of conns) {
        // Skip the user who made the change — they already see it
        if (excludeUserId && conn.userId === excludeUserId) continue;

        try {
            conn.res.write(`data: ${payload}\n\n`);
        } catch (err) {
            console.error('SSE write error:', err.message);
        }
    }
}

module.exports = { addConnection, broadcast };
