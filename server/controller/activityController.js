const ActivityLog = require('../model/ActivityLog');
const Workspace = require('../model/Workspace');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

exports.getActivityLogs = catchAsync(async (req, res, next) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 250);
    const requestedWorkspaceId = req.query.workspaceId;

    const accessibleWorkspaces = await Workspace.find({
        isDeleted: false,
        $or: [{ userId: req.user._id }, { 'members.userId': req.user._id }]
    })
        .select('clientId title')
        .lean();

    const workspaceIds = accessibleWorkspaces.map((workspace) => workspace.clientId);
    if (workspaceIds.length === 0) {
        return res.status(200).json({
            status: 'success',
            results: 0,
            data: { activityLogs: [] }
        });
    }

    if (requestedWorkspaceId && !workspaceIds.includes(requestedWorkspaceId)) {
        return next(new AppError('You do not have access to this workspace activity', 403));
    }

    const workspaceTitleMap = accessibleWorkspaces.reduce((acc, workspace) => {
        acc[workspace.clientId] = workspace.title;
        return acc;
    }, {});

    const activityLogs = await ActivityLog.find({
        workspaceId: requestedWorkspaceId || { $in: workspaceIds }
    })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

    const enrichedLogs = activityLogs.map((log) => ({
        ...log,
        workspaceTitle: workspaceTitleMap[log.workspaceId] || 'Workspace'
    }));

    res.status(200).json({
        status: 'success',
        results: enrichedLogs.length,
        data: { activityLogs: enrichedLogs }
    });
});
