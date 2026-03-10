const Workspace = require('../model/Workspace');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// 1. Get All Workspaces (owned + shared)
exports.getWorkspaces = catchAsync(async (req, res, next) => {
    console.log('[DEBUG getWorkspaces] userId:', req.user.userId, '_id:', req.user._id);
    const workspaces = await Workspace.find({
        $or: [
            { userId: req.user.userId },
            { 'members.userId': req.user.userId }
        ],
        isDeleted: false
    });
    console.log('[DEBUG getWorkspaces] Found:', workspaces.length, 'workspaces, clientIds:', workspaces.map(w => w.clientId));

    res.status(200).json({
        status: 'success',
        results: workspaces.length,
        data: {
            workspaces
        }
    });
});

// 2. Create Workspace
exports.createWorkspace = catchAsync(async (req, res, next) => {
    const newWorkspace = await Workspace.create({
        ...req.body,
        userId: req.user.userId,
        members: [{ userId: req.user.userId, role: 'owner' }]
    });

    res.status(201).json({
        status: 'success',
        data: {
            workspace: newWorkspace
        }
    });
});

// 3. Delete Workspace (Soft Delete)
exports.deleteWorkspace = catchAsync(async (req, res, next) => {
    const { clientId } = req.params;
    const userId = req.user.userId;

    const ws = await Workspace.findOneAndUpdate(
        { clientId, userId },
        { isDeleted: true, updatedAt: new Date() },
        { new: true }
    );

    if (!ws) return next(new AppError('No workspace found with that ID', 404));

    res.status(200).json({ status: 'success', message: 'Workspace deleted' });
});