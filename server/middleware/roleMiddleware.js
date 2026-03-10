const Workspace = require('../model/Workspace');
const AppError = require('../utils/AppError');
const mongoose = require('mongoose');

/**
 * Middleware factory: ensures current user is the workspace owner (admin).
 * Extracts workspaceId from req.body.workspaceId or a custom getter function.
 */
const requireAdmin = (getWorkspaceId) => {
    return async (req, res, next) => {
        try {
            const workspaceId = typeof getWorkspaceId === 'function'
                ? await getWorkspaceId(req)
                : req.body.workspaceId;

            if (!workspaceId) {
                return next(new AppError('Workspace ID is required', 400));
            }

            // Build safe query — only use _id if it's a valid ObjectId
            const orConditions = [{ clientId: workspaceId }];
            if (mongoose.isValidObjectId(workspaceId)) {
                orConditions.push({ _id: workspaceId });
            }

            const workspace = await Workspace.findOne({
                $or: orConditions,
                isDeleted: false
            });

            if (!workspace) {
                return next(new AppError('Workspace not found', 404));
            }

            const isOwner = workspace.userId.toString() === req.user._id.toString();
            if (!isOwner) {
                return next(new AppError('Only the workspace admin can perform this action', 403));
            }

            // Attach workspace to request for downstream use
            req.workspace = workspace;
            next();
        } catch (err) {
            next(err);
        }
    };
};

module.exports = { requireAdmin };
