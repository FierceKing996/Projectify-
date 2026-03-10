const express = require('express');
const analyticsController = require('../controller/analyticsController');
const { protect } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(protect);

router.route('/workspace/:workspaceId')
    .get(requireAdmin((req) => req.params.workspaceId), analyticsController.getWorkspaceAnalytics);

module.exports = router;
