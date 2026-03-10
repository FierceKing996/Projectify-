const Task = require('../model/tasks');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const mongoose = require('mongoose');
const { sendTaskNotification } = require('../service/sqsService');
const sseManager = require('../service/sseManager');
exports.getTasks = catchAsync(async (req, res, next) => {
    // Return all tasks with populated user info
    const tasks = await Task.find({ isDeleted: false })
        .populate('assignedTo', 'username email')
        .populate('userId', 'username email');
    res.status(200).json({ status: 'success', results: tasks.length, data: { tasks } });
});

exports.createTask = catchAsync(async (req, res, next) => {
    // 1. Log the body to verify data is coming in
    console.log("Creating Task Payload:", req.body);

    const { content, clientId, priority, sectionId, projectId, workspaceId, labels, reminderAt, description, subtasks, assignedTo } = req.body;

    // 2. Validate essential fields
    if (!content || !workspaceId || !projectId) {
        return next(new AppError('Missing required fields (content, workspaceId, projectId)', 400));
    }

    const newTask = await Task.create({
        content,
        clientId,
        priority: priority || 'Medium',
        sectionId: sectionId || 'todo',
        projectId,
        workspaceId,
        labels: labels || [],
        reminderAt: reminderAt || null,
        description: description || '',
        subtasks: subtasks || [],
        assignedTo: assignedTo || null,
        userId: req.user ? req.user._id : null,
        isDeleted: false // Explicitly set false
    });

    res.status(201).json({ status: 'success', data: { task: newTask } });

    // Broadcast to collaborators
    sseManager.broadcast(workspaceId, 'task_created', { task: newTask }, req.user?._id?.toString());
});

exports.updateTask = catchAsync(async (req, res, next) => {
    const { clientId } = req.params;

    // ⚡ FIX: Search by clientId string OR _id (if valid)
    // This prevents the "Cast to ObjectId failed" crash
    const query = {
        $or: [
            { clientId: clientId },
            ...(mongoose.isValidObjectId(clientId) ? [{ _id: clientId }] : [])
        ]
    };

    const task = await Task.findOne(query);

    if (!task) {
        return next(new AppError('No task found with that ID', 404));
    }

    // Handle completedAt tracking
    if (req.body.completed !== undefined) {
        if (req.body.completed && !task.completed) {
            req.body.completedAt = new Date();
        } else if (!req.body.completed && task.completed) {
            req.body.completedAt = null;
        }
    }

    // Update fields
    Object.assign(task, req.body);
    await task.save();

    res.status(200).json({ status: 'success', data: { task } });

    // Broadcast to collaborators
    sseManager.broadcast(task.workspaceId, 'task_updated', { task }, req.user?._id?.toString());
});

exports.deleteTask = catchAsync(async (req, res, next) => {
    const { clientId } = req.params;

    // ⚡ FIX: Gracefully handle if a temp ID somehow reaches here
    if (clientId.startsWith('temp-')) {
        return res.status(200).json({ status: 'success', message: 'Ignored temp ID' });
    }

    // Try finding by clientId (string) OR _id (ObjectId)
    // We use findOneAndUpdate to avoid casting errors if clientId is just a random string
    const task = await Task.findOneAndUpdate(
        {
            $or: [
                { clientId: clientId },
                // Only search by _id if it looks like a valid ObjectId (24 hex chars)
                ...(mongoose.isValidObjectId(clientId) ? [{ _id: clientId }] : [])
            ]
        },
        { isDeleted: true },
        { new: true }
    );

    if (!task) {
        return next(new AppError('No task found to delete', 404));
    }

    res.status(204).json({ status: 'success', data: null });

    // Broadcast to collaborators
    sseManager.broadcast(task.workspaceId, 'task_deleted', { taskId: clientId }, req.user?._id?.toString());
});

exports.moveTask = catchAsync(async (req, res, next) => {
    const { taskId } = req.params;
    const { sectionId, order, completed } = req.body;

    const task = await Task.findOne({ $or: [{ clientId: taskId }, { _id: taskId }] });
    if (!task) return next(new AppError('Task not found', 404));

    task.sectionId = sectionId;
    if (order !== undefined) task.order = order;

    if (completed !== undefined) {
        if (completed && !task.completed) {
            task.completedAt = new Date();
        } else if (!completed && task.completed) {
            task.completedAt = null;
        }
        task.completed = completed;
    }

    await task.save();

    if (!task) return next(new AppError('Task not found', 404));

    res.status(200).json({ status: 'success', data: { task } });

    // Broadcast to collaborators
    sseManager.broadcast(task.workspaceId, 'task_moved', { task }, req.user?._id?.toString());
});

// Batch Sync (For SyncManager)
exports.syncBatch = catchAsync(async (req, res, next) => {
    const { tasks } = req.body;
    if (!tasks || tasks.length === 0) return res.status(200).json({ status: 'success' });

    const operations = tasks
        .filter(t => t && t.clientId) // ⚡ SAFETY: Skip invalid/empty task objects
        .map(task => {
            // ⚡ MUST remove _id to prevent MongoDB "Modifying immutable field '_id'" errors
            const { _id, id, ...updateData } = task;
            updateData.isDeleted = false;

            if (task.completed && !task.completedAt) {
                updateData.completedAt = new Date();
            } else if (task.completed === false) {
                updateData.completedAt = null;
            }

            return {
                updateOne: {
                    filter: { clientId: task.clientId },
                    update: { $set: updateData },
                    upsert: true // Create if doesn't exist
                }
            };
        });

    try {
        await Task.bulkWrite(operations);
        res.status(200).json({ status: 'success', message: 'Batch synced' });
    } catch (err) {
        console.error("🔥 BATCH SYNC ERROR:", err);
        return res.status(500).json({ status: 'error', message: err.message });
    }
});