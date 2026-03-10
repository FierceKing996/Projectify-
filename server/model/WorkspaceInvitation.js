const mongoose = require('mongoose');
const crypto = require('crypto');

const WorkspaceInvitationSchema = new mongoose.Schema({
    workspaceId: { type: String, required: true }, // clientId of workspace
    inviterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    inviteeEmail: { type: String, required: true, lowercase: true },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'declined'],
        default: 'pending'
    },
    token: {
        type: String,
        unique: true,
        default: () => crypto.randomUUID()
    },
    createdAt: { type: Date, default: Date.now }
});

// Indexes for fast lookups
WorkspaceInvitationSchema.index({ token: 1 });
WorkspaceInvitationSchema.index({ inviteeEmail: 1, status: 1 });
WorkspaceInvitationSchema.index({ workspaceId: 1, status: 1 });

module.exports = mongoose.model('WorkspaceInvitation', WorkspaceInvitationSchema);
