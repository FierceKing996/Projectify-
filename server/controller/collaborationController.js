const Workspace = require('../model/Workspace');
const WorkspaceInvitation = require('../model/WorkspaceInvitation');
const User = require('../model/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const emailService = require('../service/emailService');

const FRONTEND_URL = 'http://localhost:5173';

// 1. Invite a user to a workspace
exports.inviteUser = catchAsync(async (req, res, next) => {
    const { clientId } = req.params;
    const { email } = req.body;

    if (!email) return next(new AppError('Please provide an email address', 400));

    // Find the workspace
    const workspace = await Workspace.findOne({ clientId, isDeleted: false });
    if (!workspace) return next(new AppError('Workspace not found', 404));

    // Verify ownership or membership
    const isOwner = workspace.userId.toString() === req.user._id.toString();
    const isMember = workspace.members.some(m => m.userId.toString() === req.user._id.toString());
    if (!isOwner && !isMember) return next(new AppError('You do not have access to this workspace', 403));

    // Check if already a member
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
        const alreadyMember = workspace.members.some(m => m.userId.toString() === existingUser._id.toString());
        if (alreadyMember || workspace.userId.toString() === existingUser._id.toString()) {
            return next(new AppError('This user is already a member of this workspace', 400));
        }
    }

    // Check for existing pending invitation
    const existingInvite = await WorkspaceInvitation.findOne({
        workspaceId: clientId,
        inviteeEmail: email.toLowerCase(),
        status: 'pending'
    });
    if (existingInvite) {
        return next(new AppError('An invitation has already been sent to this email', 400));
    }

    // Create invitation
    const invitation = await WorkspaceInvitation.create({
        workspaceId: clientId,
        inviterId: req.user._id,
        inviteeEmail: email.toLowerCase()
    });

    // Send email
    const acceptLink = `${FRONTEND_URL}?invite=${invitation.token}`;
    try {
        await emailService.sendInvitationEmail(
            email,
            req.user.username,
            workspace.title,
            acceptLink
        );
    } catch (err) {
        console.error('Email send failed, but invitation was created:', err.message);
    }

    res.status(201).json({
        status: 'success',
        message: `Invitation sent to ${email}`,
        data: { invitation }
    });
});

// 2. Accept an invitation (public route — token acts as auth)
exports.acceptInvitation = catchAsync(async (req, res, next) => {
    const { token } = req.params;

    const invitation = await WorkspaceInvitation.findOne({ token, status: 'pending' });
    if (!invitation) return next(new AppError('Invalid or expired invitation', 404));

    // Find the invitee user by email
    const invitee = await User.findOne({ email: invitation.inviteeEmail });
    if (!invitee) {
        return res.status(200).json({
            status: 'pending_signup',
            message: 'Please sign up first, then use this invite link again.',
            data: { email: invitation.inviteeEmail }
        });
    }

    // Add to workspace members
    const workspace = await Workspace.findOne({ clientId: invitation.workspaceId, isDeleted: false });
    if (!workspace) return next(new AppError('Workspace no longer exists', 404));

    // Prevent duplicate
    const alreadyMember = workspace.members.some(m => m.userId.toString() === invitee._id.toString());
    if (!alreadyMember) {
        workspace.members.push({ userId: invitee._id, role: 'member' });
        await workspace.save();
    }

    // Mark invitation as accepted
    invitation.status = 'accepted';
    await invitation.save();

    res.status(200).json({
        status: 'success',
        message: `You have joined workspace "${workspace.title}"!`,
        data: { workspace: { clientId: workspace.clientId, title: workspace.title } }
    });
});

// 3. Get workspace members
exports.getMembers = catchAsync(async (req, res, next) => {
    const { clientId } = req.params;
    console.log('[DEBUG getMembers] Looking up clientId:', clientId);

    const workspace = await Workspace.findOne({ clientId, isDeleted: false })
        .populate('members.userId', 'username email lastActiveAt')
        .populate('userId', 'username email lastActiveAt');

    console.log('[DEBUG getMembers] Found workspace:', workspace ? workspace.clientId : 'NOT FOUND');
    if (!workspace) return next(new AppError('Workspace not found', 404));

    // Verify access
    const isOwner = workspace.userId._id.toString() === req.user._id.toString();
    const isMember = workspace.members.some(m => m.userId._id.toString() === req.user._id.toString());
    if (!isOwner && !isMember) return next(new AppError('Access denied', 403));

    // Build members list (owner + non-owner members, deduplicated)
    const now = Date.now();
    const ONLINE_THRESHOLD = 60 * 1000; // 60 seconds
    const ownerId = workspace.userId._id.toString();

    const owner = {
        _id: workspace.userId._id,
        username: workspace.userId.username,
        email: workspace.userId.email,
        role: 'owner',
        isOnline: (now - new Date(workspace.userId.lastActiveAt).getTime()) < ONLINE_THRESHOLD
    };

    // Filter out the owner from members array to prevent duplicates
    const nonOwnerMembers = workspace.members
        .filter(m => m.userId._id.toString() !== ownerId)
        .map(m => ({
            _id: m.userId._id,
            username: m.userId.username,
            email: m.userId.email,
            role: m.role,
            joinedAt: m.joinedAt,
            isOnline: (now - new Date(m.userId.lastActiveAt).getTime()) < ONLINE_THRESHOLD
        }));

    res.status(200).json({
        status: 'success',
        data: { members: [owner, ...nonOwnerMembers] }
    });
});

// 4. Heartbeat — update lastActiveAt
exports.heartbeat = catchAsync(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user._id, { lastActiveAt: new Date() });

    res.status(200).json({ status: 'success' });
});

// 5. Get pending invitations for a workspace
exports.getPendingInvitations = catchAsync(async (req, res, next) => {
    const { clientId } = req.params;

    const invitations = await WorkspaceInvitation.find({
        workspaceId: clientId,
        status: 'pending'
    }).populate('inviterId', 'username');

    res.status(200).json({
        status: 'success',
        data: { invitations }
    });
});
