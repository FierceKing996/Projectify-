export interface TemplateSection {
    id: string;
    title: string;
    order: number;
    isCompleted: boolean;
}

export interface TemplateTask {
    content: string;
    sectionId: string;
    labels: string[];
    priority?: 'Low' | 'Medium' | 'High';
}

export interface ProjectTemplate {
    id: string;
    name: string;
    pitch: string;
    projectTitle: string;
    sections: TemplateSection[];
    tasks: TemplateTask[];
    labels: string[];
}

export const STANDARD_BOARD_TEMPLATE: ProjectTemplate = {
    id: 'standard',
    name: 'Standard Board',
    pitch: 'Start simple with the classic three-column workflow.',
    projectTitle: 'My First Board',
    sections: [
        { id: 'todo', title: 'To Do', order: 0, isCompleted: false },
        { id: 'in-progress', title: 'In Progress', order: 1, isCompleted: false },
        { id: 'done', title: 'Done', order: 2, isCompleted: true }
    ],
    tasks: [],
    labels: []
};

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
    {
        id: 'b2b-sales-pipeline',
        name: 'B2B Sales Pipeline',
        pitch: 'Perfect for tracking lead generation and outreach.',
        projectTitle: 'B2B Sales Pipeline',
        sections: [
            { id: 'lead-generation', title: 'Lead Generation', order: 0, isCompleted: false },
            { id: 'first-contact', title: 'First Contact', order: 1, isCompleted: false },
            { id: 'demo-scheduled', title: 'Demo Scheduled', order: 2, isCompleted: false },
            { id: 'proposal-sent', title: 'Proposal Sent', order: 3, isCompleted: false },
            { id: 'closed-won', title: 'Closed Won', order: 4, isCompleted: true },
            { id: 'closed-lost', title: 'Closed Lost', order: 5, isCompleted: true }
        ],
        tasks: [
            { content: 'Identify target corporate HR directors', sectionId: 'lead-generation', labels: ['Cold'], priority: 'Medium' },
            { content: 'Send Apollo.io sequence', sectionId: 'first-contact', labels: ['Warm'], priority: 'High' },
            { content: 'Follow up post-demo', sectionId: 'demo-scheduled', labels: ['Hot', 'High-Ticket'], priority: 'High' }
        ],
        labels: ['Cold', 'Warm', 'Hot', 'High-Ticket']
    },
    {
        id: 'employee-onboarding-wellness',
        name: 'Employee Onboarding & Wellness',
        pitch: 'Ideal for HR teams managing new hires or wellness rollouts.',
        projectTitle: 'Employee Onboarding & Wellness',
        sections: [
            { id: 'pre-boarding-signed', title: 'Pre-boarding (Signed)', order: 0, isCompleted: false },
            { id: 'day-1-orientation', title: 'Day 1: Orientation', order: 1, isCompleted: false },
            { id: 'week-1-training', title: 'Week 1: Training', order: 2, isCompleted: false },
            { id: 'month-1-review', title: 'Month 1: Review', order: 3, isCompleted: true }
        ],
        tasks: [
            { content: 'Send welcome kit', sectionId: 'pre-boarding-signed', labels: ['Culture'], priority: 'Medium' },
            { content: 'Schedule introductory therapy platform demo', sectionId: 'day-1-orientation', labels: ['Culture'], priority: 'Medium' },
            { content: 'Add to payroll system', sectionId: 'week-1-training', labels: ['Paperwork', 'IT Setup'], priority: 'High' }
        ],
        labels: ['Paperwork', 'IT Setup', 'Culture']
    },
    {
        id: 'software-sprint',
        name: 'Software Sprint',
        pitch: 'The classic developer workflow for shipping code.',
        projectTitle: 'Software Sprint',
        sections: [
            { id: 'backlog', title: 'Backlog', order: 0, isCompleted: false },
            { id: 'up-next', title: 'Up Next', order: 1, isCompleted: false },
            { id: 'in-progress', title: 'In Progress', order: 2, isCompleted: false },
            { id: 'qa-testing', title: 'QA / Testing', order: 3, isCompleted: false },
            { id: 'deployed', title: 'Deployed', order: 4, isCompleted: true }
        ],
        tasks: [
            { content: 'Design database schema', sectionId: 'backlog', labels: ['Feature'], priority: 'Medium' },
            { content: 'Fix mobile CSS overflow', sectionId: 'up-next', labels: ['Bug'], priority: 'High' },
            { content: 'Set up SQS background worker', sectionId: 'in-progress', labels: ['P1 (Critical)'], priority: 'High' }
        ],
        labels: ['Bug', 'Feature', 'P1 (Critical)']
    },
    {
        id: 'agency-client-management',
        name: 'Agency Client Management',
        pitch: 'A structured workflow for taking a client from contract to service.',
        projectTitle: 'Agency Client Management',
        sections: [
            { id: 'intake-strategy', title: 'Intake & Strategy', order: 0, isCompleted: false },
            { id: 'asset-collection', title: 'Asset Collection', order: 1, isCompleted: false },
            { id: 'active-campaign', title: 'Active Campaign', order: 2, isCompleted: false },
            { id: 'monthly-reporting', title: 'Monthly Reporting', order: 3, isCompleted: true }
        ],
        tasks: [
            { content: 'Send kickoff questionnaire', sectionId: 'intake-strategy', labels: ['Internal Review'], priority: 'Medium' },
            { content: 'Request brand assets', sectionId: 'asset-collection', labels: ['Waiting on Client'], priority: 'High' },
            { content: 'Schedule monthly review call', sectionId: 'monthly-reporting', labels: ['Approved'], priority: 'Medium' }
        ],
        labels: ['Waiting on Client', 'Internal Review', 'Approved']
    }
];

export const getProjectTemplateById = (templateId: string | null | undefined): ProjectTemplate => {
    if (!templateId || templateId === STANDARD_BOARD_TEMPLATE.id) {
        return STANDARD_BOARD_TEMPLATE;
    }

    return PROJECT_TEMPLATES.find((template) => template.id === templateId) || STANDARD_BOARD_TEMPLATE;
};
