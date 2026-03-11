const Project = require('../model/Project');
const Task = require('../model/tasks');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const sseManager = require('../service/sseManager');

exports.createProject = catchAsync(async (req, res, next) => {
    const payload = {
        title: req.body.title,
        workspaceId: req.body.workspaceId
    };

    if (Array.isArray(req.body.sections) && req.body.sections.length > 0) {
        payload.sections = req.body.sections;
    }

    const newProject = await Project.create(payload);

    res.status(201).json({
        status: 'success',
        data: { project: newProject }
    });

    // Broadcast to collaborators
    sseManager.broadcast(req.body.workspaceId, 'project_created', { project: newProject }, req.user?._id?.toString());
});

exports.getWorkspaceProjects = catchAsync(async (req, res, next) => {
    const { workspaceId } = req.params;

    const projects = await Project.find({ workspaceId, isDeleted: false });

    res.status(200).json({
        status: 'success',
        results: projects.length,
        data: { projects }
    });
});

exports.updateProjectSections = catchAsync(async (req, res, next) => {
    // Used when moving COLUMNS or Renaming them
    const { projectId } = req.params;
    const { sections } = req.body;

    const project = await Project.findByIdAndUpdate(
        projectId,
        { sections },
        { new: true, runValidators: true }
    );

    if (!project) return next(new AppError('No project found', 404));

    res.status(200).json({ status: 'success', data: { project } });

    // Broadcast to collaborators
    sseManager.broadcast(project.workspaceId, 'project_updated', { project }, req.user?._id?.toString());
});

exports.deleteProject = catchAsync(async (req, res, next) => {
    // Soft delete project
    const project = await Project.findByIdAndUpdate(req.params.projectId, { isDeleted: true });

    if (!project) return next(new AppError('No project found', 404));

    // Optional: Soft delete all tasks in this project too
    await Task.updateMany({ projectId: project._id }, { isDeleted: true });

    res.status(204).json({ status: 'success', data: null });

    // Broadcast to collaborators
    sseManager.broadcast(project.workspaceId, 'project_deleted', { projectId: req.params.projectId }, req.user?._id?.toString());
});
