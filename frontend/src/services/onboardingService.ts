import { IDB } from '../db/idbHelper.js';
import { getProjectTemplateById } from '../data/projectTemplates';
import type { ProjectTemplate } from '../data/projectTemplates';
import { AuthService } from './authService.js';
import { ProjectService } from './projectService';
import { TaskService } from './taskService.js';
import { WorkspaceService } from './workspaceService.js';

const PERSONAL_WORKSPACE_TITLE = 'Personal';

const sortSections = (template: ProjectTemplate) =>
    template.sections.map((section, index) => ({
        ...section,
        order: index
    }));

const isCompletedSection = (template: ProjectTemplate, sectionId: string) =>
    Boolean(template.sections.find((section) => section.id === sectionId)?.isCompleted);

const pickWorkspace = (workspaces: any[]) =>
    workspaces.find((workspace) => !workspace.isDeleted && workspace.title === PERSONAL_WORKSPACE_TITLE)
    || workspaces.find((workspace) => !workspace.isDeleted)
    || null;

const ensureWorkspace = async () => {
    const cachedWorkspaces = (await IDB.getAll('workspaces')).filter((workspace: any) => !workspace.isDeleted);

    if (cachedWorkspaces.length === 0) {
        return WorkspaceService.addWorkspace(PERSONAL_WORKSPACE_TITLE);
    }

    const hydratedWorkspaces = await WorkspaceService.getWorkspaces();
    return pickWorkspace(hydratedWorkspaces) || WorkspaceService.addWorkspace(PERSONAL_WORKSPACE_TITLE);
};

const seedTasks = async (projectId: string, workspaceId: string, template: ProjectTemplate) => {
    for (const [index, task] of template.tasks.entries()) {
        await TaskService.addTask({
            clientId: crypto.randomUUID(),
            content: task.content,
            sectionId: task.sectionId,
            projectId,
            workspaceId,
            priority: task.priority || 'Medium',
            order: index,
            completed: isCompletedSection(template, task.sectionId),
            labels: task.labels
        });
    }
};

export const OnboardingService = {
    async createStarterBoard(templateId: string | null) {
        const template = getProjectTemplateById(templateId);
        const workspace = await ensureWorkspace();
        const project = await ProjectService.createProject(
            template.projectTitle,
            workspace.id,
            sortSections(template)
        );

        await seedTasks(project._id, workspace.id, template);
        const user = await AuthService.completeOnboarding();

        return {
            workspace: {
                id: workspace.id,
                title: workspace.title
            },
            project,
            user
        };
    }
};
