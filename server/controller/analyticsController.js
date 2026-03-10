const Task = require('../model/tasks');
const Workspace = require('../model/Workspace');
const User = require('../model/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const mongoose = require('mongoose');

exports.getWorkspaceAnalytics = catchAsync(async (req, res, next) => {
    const { workspaceId } = req.params;

    // 1. Get Workspace & Member Stats
    const workspace = await Workspace.findOne({ clientId: workspaceId, isDeleted: false });
    if (!workspace) return next(new AppError('Workspace not found', 404));

    const memberIds = workspace.members.map(m => m.userId);
    // Include the owner as well if not already in members
    if (!memberIds.some(id => id.toString() === workspace.userId.toString())) {
        memberIds.push(workspace.userId);
    }

    const totalMembers = memberIds.length;

    // An active user is one who sent a heartbeat in the last 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const onlineMembers = await User.countDocuments({
        _id: { $in: memberIds },
        lastActiveAt: { $gt: twoMinutesAgo }
    });

    // 2. Task Analytics: Using Mongoose Aggregation Pipeline
    const analytics = await Task.aggregate([
        {
            $match: {
                workspaceId: workspaceId,
                isDeleted: false
            }
        },
        {
            $group: {
                _id: "$assignedTo",
                totalTasks: { $sum: 1 },
                completedTasks: {
                    $sum: { $cond: [{ $eq: ["$completed", true] }, 1, 0] }
                },
                totalCompletionTimeStr: {
                    $sum: {
                        $cond: [
                            { $and: [{ $eq: ["$completed", true] }, { $ne: ["$completedAt", null] }] },
                            { $subtract: ["$completedAt", "$createdAt"] },
                            0
                        ]
                    }
                }
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "user"
            }
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                _id: 1,
                username: { $ifNull: ["$user.username", "Unassigned"] },
                totalTasks: 1,
                completedTasks: 1,
                // Avoid division by zero
                avgCompletionTimeMs: {
                    $cond: [
                        { $gt: ["$completedTasks", 0] },
                        { $divide: ["$totalCompletionTimeStr", "$completedTasks"] },
                        0
                    ]
                }
            }
        },
        { $sort: { completedTasks: -1 } } // Sort by completed tasks (Leaderboard)
    ]);

    // 3. Compute overall workspace stats
    let totalWorkspaceTasks = 0;
    let totalWorkspaceCompletedTasks = 0;
    let sumOfAllAvgTime = 0;
    let usersWithCompletedTasks = 0;

    analytics.forEach(stat => {
        totalWorkspaceTasks += stat.totalTasks;
        totalWorkspaceCompletedTasks += stat.completedTasks;
        if (stat.completedTasks > 0) {
            sumOfAllAvgTime += stat.avgCompletionTimeMs;
            usersWithCompletedTasks += 1;
        }
    });

    const overallAvgCompletionTimeMs = usersWithCompletedTasks > 0
        ? sumOfAllAvgTime / usersWithCompletedTasks
        : 0;

    res.status(200).json({
        status: 'success',
        data: {
            overview: {
                totalMembers,
                onlineMembers,
                totalTasks: totalWorkspaceTasks,
                completedTasks: totalWorkspaceCompletedTasks,
                overallAvgCompletionTimeMs
            },
            userAnalytics: analytics // Directly fuels the Leaderboard & Graphs
        }
    });
});
