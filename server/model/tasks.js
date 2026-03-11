const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    clientId: { type: String, unique: true, required: true }, // Offline ID

    workspaceId: { type: String, required: true },
    projectId: { type: String, required: true }, // Tasks now live in a Project
    sectionId: { type: String, required: true, default: 'todo' }, // Which column?

    content: { type: String, required: true },
    description: { type: String, default: '' },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },

    subtasks: [{
        id: { type: String, required: true },
        content: { type: String, required: true },
        completed: { type: Boolean, default: false }
    }],

    order: { type: Number, default: 0 },

    // We keep this for your Analytics Dashboard!
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    reminderAt: { type: Date, default: null },
    labels: [String],
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

// Add Indexes for performance and common queries
taskSchema.index({ workspaceId: 1, projectId: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ isDeleted: 1 });

const Task = mongoose.model('Task', taskSchema);
module.exports = Task;