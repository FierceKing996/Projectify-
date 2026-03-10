const express = require('express');
const router = express.Router();
const collaborationController = require('../controller/collaborationController');
const { protect } = require('../middleware/authMiddleware');
const sseManager = require('../service/sseManager');
const jwt = require('jsonwebtoken');
const User = require('../model/User');

const JWT_SECRET = 'agency-os-super-secret-key-2026-secure';

// Public route — token-based auth
router.get('/invitations/accept/:token', collaborationController.acceptInvitation);

// SSE endpoint — BEFORE protect middleware (EventSource can't send headers)
// Auth is done manually via query param token
router.get('/workspaces/:clientId/events', async (req, res) => {
    const { clientId } = req.params;
    const token = req.query.token;

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return res.status(401).json({ message: 'User not found' });

        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.flushHeaders();

        // Send initial connection confirmation
        res.write(`data: ${JSON.stringify({ type: 'connected', data: { workspaceId: clientId } })}\n\n`);

        // Register this connection
        sseManager.addConnection(clientId, res, user._id.toString());
    } catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
    }
});

// Protected routes
router.use(protect);

// Workspace collaboration
router.post('/workspaces/:clientId/invite', collaborationController.inviteUser);
router.get('/workspaces/:clientId/members', collaborationController.getMembers);
router.get('/workspaces/:clientId/invitations', collaborationController.getPendingInvitations);

// Presence
router.post('/heartbeat', collaborationController.heartbeat);

module.exports = router;
