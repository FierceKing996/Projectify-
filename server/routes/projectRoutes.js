const express = require('express');
const projectController = require('../controller/projectController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');
const Project = require('../model/Project');

const router = express.Router();

// Protect all routes
router.use(authMiddleware.protect);

// Create project (admin only — workspaceId comes from req.body)
router.route('/')
    .post(requireAdmin((req) => req.body.workspaceId), projectController.createProject);

// Update sections & delete project (admin only — look up workspaceId from project)
router.route('/:projectId')
    .patch(requireAdmin(async (req) => {
        const project = await Project.findById(req.params.projectId);
        return project?.workspaceId;
    }), projectController.updateProjectSections)
    .delete(requireAdmin(async (req) => {
        const project = await Project.findById(req.params.projectId);
        return project?.workspaceId;
    }), projectController.deleteProject);

// Get all projects for a specific workspace (all members can view)
router.route('/workspace/:workspaceId')
    .get(projectController.getWorkspaceProjects);

module.exports = router;