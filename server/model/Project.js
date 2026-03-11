const mongoose = require('mongoose');

const DEFAULT_SECTIONS = [
    { id: 'todo', title: 'To Do', order: 0, isCompleted: false },
    { id: 'in-progress', title: 'In Progress', order: 1, isCompleted: false },
    { id: 'done', title: 'Done', order: 2, isCompleted: true }
];

const sectionSchema = new mongoose.Schema({
    id: { type: String, required: true }, // e.g., "todo", "done" (UUID from frontend)
    title: { type: String, required: true },
    order: { type: Number, default: 0 },
    isCompleted: { type: Boolean, default: false }
});

const projectSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: [true, 'A project must have a title'],
        trim: true 
    },
    workspaceId: {
        type: String, // Storing Client ID (UUID) for easier sync
        required: [true, 'A project must belong to a workspace']
    },
    sections: {
        type: [sectionSchema],
        default: DEFAULT_SECTIONS
    },
    isDeleted: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

// Compound index to ensure quick lookups of projects within a workspace
projectSchema.index({ workspaceId: 1, isDeleted: 1 });

const Project = mongoose.model('Project', projectSchema);
module.exports = Project;
module.exports.DEFAULT_SECTIONS = DEFAULT_SECTIONS;
