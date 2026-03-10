const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['owner', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now }
}, { _id: false });

const WorkspaceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    clientId: { type: String, required: true, unique: true }, // Sync ID

    title: { type: String, required: true },
    color: { type: String, default: '#666666' },

    members: { type: [memberSchema], default: [] },

    isDeleted: { type: Boolean, default: false },
    updatedAt: { type: Date, default: Date.now }
});

// Index for fast lookups
WorkspaceSchema.index({ userId: 1, clientId: 1 });
WorkspaceSchema.index({ 'members.userId': 1 });

module.exports = mongoose.model('Workspace', WorkspaceSchema);