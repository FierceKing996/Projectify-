const ActivityLog = require('../model/ActivityLog');
const Project = require('../model/Project');
const User = require('../model/User');

const DEFAULT_SECTION_TITLES = {
    todo: 'To Do',
    'in-progress': 'In Progress',
    done: 'Done'
};

const normalizeId = (value) => (value ? value.toString() : null);

const getActorName = (actor) => actor?.username || 'Someone';

const getTaskLabel = (content = '') => {
    const trimmed = content.trim();
    if (!trimmed) return 'Untitled task';
    return trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed;
};

const getSectionTitle = async (projectId, sectionId) => {
    if (!sectionId) return 'another section';
    if (!projectId) return DEFAULT_SECTION_TITLES[sectionId] || sectionId;

    const project = await Project.findById(projectId).select('sections').lean();
    const matchedSection = project?.sections?.find((section) => section.id === sectionId);

    return matchedSection?.title || DEFAULT_SECTION_TITLES[sectionId] || sectionId;
};

const getTargetUserName = async (userId) => {
    const normalizedUserId = normalizeId(userId);
    if (!normalizedUserId) return null;

    const user = await User.findById(normalizedUserId).select('username').lean();
    return user?.username || 'Unknown user';
};

const createActivity = async ({
    workspaceId,
    actor,
    action,
    entityId,
    message,
    metadata = {}
}) => {
    if (!workspaceId || !actor?._id || !message) return null;

    return ActivityLog.create({
        workspaceId,
        actorId: actor._id,
        actorName: getActorName(actor),
        action,
        entityId: entityId || null,
        message,
        metadata
    });
};

exports.logTaskCreated = async ({ task, actor }) =>
    createActivity({
        workspaceId: task.workspaceId,
        actor,
        action: 'task_created',
        entityId: task.clientId || task._id?.toString(),
        message: `${getActorName(actor)} added task "${getTaskLabel(task.content)}"`,
        metadata: {
            projectId: task.projectId,
            sectionId: task.sectionId,
            taskContent: task.content
        }
    });

exports.logTaskUpdated = async ({ task, actor }) =>
    createActivity({
        workspaceId: task.workspaceId,
        actor,
        action: 'task_updated',
        entityId: task.clientId || task._id?.toString(),
        message: `${getActorName(actor)} updated task "${getTaskLabel(task.content)}"`,
        metadata: {
            projectId: task.projectId,
            taskContent: task.content
        }
    });

exports.logTaskAssignmentChanged = async ({ task, actor, assignedTo }) => {
    const assignedUserName = await getTargetUserName(assignedTo);
    const isAssigned = !!normalizeId(assignedTo);

    return createActivity({
        workspaceId: task.workspaceId,
        actor,
        action: isAssigned ? 'task_assigned' : 'task_unassigned',
        entityId: task.clientId || task._id?.toString(),
        message: isAssigned
            ? `${getActorName(actor)} assigned task "${getTaskLabel(task.content)}" to ${assignedUserName}`
            : `${getActorName(actor)} unassigned task "${getTaskLabel(task.content)}"`,
        metadata: {
            projectId: task.projectId,
            taskContent: task.content,
            assignedTo: normalizeId(assignedTo),
            assignedUserName
        }
    });
};

exports.logTaskCompletionChanged = async ({ task, actor, completed }) =>
    createActivity({
        workspaceId: task.workspaceId,
        actor,
        action: completed ? 'task_completed' : 'task_reopened',
        entityId: task.clientId || task._id?.toString(),
        message: completed
            ? `${getActorName(actor)} completed task "${getTaskLabel(task.content)}"`
            : `${getActorName(actor)} reopened task "${getTaskLabel(task.content)}"`,
        metadata: {
            projectId: task.projectId,
            taskContent: task.content,
            completed: !!completed
        }
    });

exports.logTaskMoved = async ({ task, actor, fromSectionId, toSectionId }) => {
    if (!toSectionId || fromSectionId === toSectionId) return null;

    const targetSectionTitle = await getSectionTitle(task.projectId, toSectionId);

    return createActivity({
        workspaceId: task.workspaceId,
        actor,
        action: 'task_moved',
        entityId: task.clientId || task._id?.toString(),
        message: `${getActorName(actor)} moved task "${getTaskLabel(task.content)}" to ${targetSectionTitle}`,
        metadata: {
            projectId: task.projectId,
            taskContent: task.content,
            fromSectionId,
            toSectionId,
            toSectionTitle: targetSectionTitle
        }
    });
};

exports.logTaskDeleted = async ({ task, actor }) =>
    createActivity({
        workspaceId: task.workspaceId,
        actor,
        action: 'task_deleted',
        entityId: task.clientId || task._id?.toString(),
        message: `${getActorName(actor)} deleted task "${getTaskLabel(task.content)}"`,
        metadata: {
            projectId: task.projectId,
            taskContent: task.content
        }
    });
