const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema(
    {
        workspaceId: {
            type: String,
            required: true,
            index: true
        },
        actorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        actorName: {
            type: String,
            required: true,
            trim: true
        },
        action: {
            type: String,
            required: true,
            enum: [
                'task_created',
                'task_updated',
                'task_moved',
                'task_completed',
                'task_reopened',
                'task_assigned',
                'task_unassigned',
                'task_deleted'
            ]
        },
        entityType: {
            type: String,
            default: 'task'
        },
        entityId: {
            type: String,
            default: null
        },
        message: {
            type: String,
            required: true,
            trim: true
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    { timestamps: true }
);

ActivityLogSchema.index({ workspaceId: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
