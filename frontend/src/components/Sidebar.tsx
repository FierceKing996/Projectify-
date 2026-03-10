import { useState, useEffect } from 'react';
import { FiMenu, FiChevronRight, FiChevronDown, FiPlus, FiLayout, FiTag, FiBriefcase, FiFolder, FiTrash2, FiUserPlus, FiTrendingUp, FiCalendar } from 'react-icons/fi';
import { ProjectService } from '../services/projectService';
import { useWorkspaces } from '../hooks/useWorkspaces';
import InputModal from './InputModal';
import ConfirmModal from './ConfirmModal';
import InviteModal from './InviteModal';

interface SidebarProps {
    isCollapsed: boolean;
    toggleSidebar: () => void;
    currentWorkspaceId: string;
    setCurrentWorkspace: (ws: { id: string; title: string }) => void;
    currentProjectId: string | null;
    onProjectSelect: (project: any) => void;
    openModal: () => void;
    onWorkspaceDelete?: (wsId: string) => void;
    onProjectDelete?: (projectId: string, wsId: string) => void;
    refreshTrigger: number;
    labels?: string[];
    selectedLabel?: string | null;
    onLabelSelect?: (label: string) => void;
    userRole?: string;
    currentView?: 'kanban' | 'analytics' | 'calendar';
    setCurrentView?: (view: 'kanban' | 'analytics' | 'calendar') => void;
}

export default function Sidebar({
    isCollapsed,
    toggleSidebar,
    currentWorkspaceId,
    setCurrentWorkspace,
    currentProjectId,
    onProjectSelect,
    openModal,
    refreshTrigger,
    labels = [],
    selectedLabel,
    onLabelSelect,
    onWorkspaceDelete,
    onProjectDelete,
    userRole = 'owner',
    currentView = 'kanban',
    setCurrentView
}: SidebarProps) {
    const { workspaces } = useWorkspaces(refreshTrigger);
    const [expandedWorkspace, setExpandedWorkspace] = useState<string | null>(null);
    const [projectsMap, setProjectsMap] = useState<Record<string, any[]>>({});
    const [loadingProjects, setLoadingProjects] = useState<string | null>(null);
    const [projectModalWsId, setProjectModalWsId] = useState<string | null>(null);
    const [pendingDelete, setPendingDelete] = useState<{ type: 'workspace' | 'project'; id: string; wsId?: string; title: string } | null>(null);
    const [inviteModalWs, setInviteModalWs] = useState<{ id: string; title: string } | null>(null);

    // Re-fetch projects when refreshTrigger changes (e.g. after delete)
    useEffect(() => {
        if (expandedWorkspace) {
            ProjectService.getProjects(expandedWorkspace).then(projs => {
                setProjectsMap(prev => ({ ...prev, [expandedWorkspace]: projs }));
            }).catch(err => console.error('Failed to refresh projects', err));
        }
    }, [refreshTrigger]);

    // Fetch projects when a workspace is expanded
    const toggleWorkspace = async (wsId: string) => {
        if (expandedWorkspace === wsId) {
            setExpandedWorkspace(null);
            return;
        }
        setExpandedWorkspace(wsId);
        if (!projectsMap[wsId]) {
            setLoadingProjects(wsId);
            try {
                const projs = await ProjectService.getProjects(wsId);
                setProjectsMap(prev => ({ ...prev, [wsId]: projs }));
            } catch (err) {
                console.error(`Failed to load projects for ${wsId}`, err);
            } finally {
                setLoadingProjects(null);
            }
        }
    };

    const handleCreateProject = async (title: string) => {
        if (!projectModalWsId) return;
        try {
            const newProj = await ProjectService.createProject(title, projectModalWsId);
            setProjectsMap(prev => ({ ...prev, [projectModalWsId]: [...(prev[projectModalWsId] || []), newProj] }));
            onProjectSelect(newProj);
        } catch (err) {
            console.error("Failed to create project", err);
        }
    };

    return (
        <aside className={`bg-white border-r border-gray-200 transition-all duration-300 flex flex-col h-screen flex-shrink-0 ${isCollapsed ? 'w-16' : 'w-64'}`}>

            {/* Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
                {!isCollapsed && (
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center text-white">
                            <FiLayout size={14} />
                        </div>
                        <span className="font-bold text-gray-900 tracking-tight">YOUR TO-DO</span>
                    </div>
                )}
                <button onClick={toggleSidebar} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors">
                    <FiMenu size={20} />
                </button>
            </div>
            {!isCollapsed && (
                <div className="mt-6 mb-2">
                    <div className="px-4 mb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Labels</div>
                    <div className="space-y-1">
                        {labels.map(label => (
                            <div
                                key={label}
                                onClick={() => onLabelSelect && onLabelSelect(label)}
                                className={`group flex items-center px-3 py-1.5 mx-2 rounded-md cursor-pointer transition-colors ${selectedLabel === label
                                    ? 'bg-indigo-50 text-indigo-700'
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                            >
                                <div className={`mr-3 transition-colors ${selectedLabel === label ? 'text-indigo-500' : 'text-gray-400 group-hover:text-indigo-500'}`}>
                                    <FiTag size={14} />
                                </div>
                                <span className="text-sm truncate flex-1">{label}</span>
                                {selectedLabel === label && (
                                    <span className="text-[10px] font-medium bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded">Active</span>
                                )}
                            </div>
                        ))}
                        {labels.length === 0 && (
                            <div className="px-5 py-2 text-xs text-gray-400 italic">No labels used yet</div>
                        )}
                    </div>
                </div>
            )}
            {/* Workspaces List */}
            <div className="flex-1 overflow-y-auto py-4 space-y-1">
                {!isCollapsed && <div className="px-4 mb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Workspaces</div>}

                {workspaces.map((ws: any) => (
                    <div key={ws.id}>
                        {/* Workspace Row */}
                        <div
                            className={`group flex items-center px-3 py-2 mx-2 rounded-md cursor-pointer transition-colors ${currentWorkspaceId === ws.id ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            onClick={() => {
                                setCurrentWorkspace({ id: ws.id, title: ws.title });
                                toggleWorkspace(ws.id);
                            }}
                        >
                            {!isCollapsed && (
                                <span className={`mr-2 transition-transform ${currentWorkspaceId === ws.id ? 'text-blue-500' : 'text-gray-400'}`}>
                                    {expandedWorkspace === ws.id ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
                                </span>
                            )}

                            <div className={isCollapsed ? "mx-auto" : "mr-3"}>
                                <FiBriefcase size={18} />
                            </div>

                            {!isCollapsed && <span className="text-sm truncate flex-1">{ws.title}</span>}

                            {/* Delete Workspace Button (admin only, visible on hover) */}
                            {!isCollapsed && onWorkspaceDelete && userRole === 'owner' && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPendingDelete({ type: 'workspace', id: ws.id, title: ws.title });
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all duration-150"
                                    title="Delete Workspace"
                                >
                                    <FiTrash2 size={14} />
                                </button>
                            )}

                            {/* Invite Button */}
                            {!isCollapsed && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setInviteModalWs({ id: ws.id, title: ws.title });
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded transition-all duration-150"
                                    title="Invite Collaborator"
                                >
                                    <FiUserPlus size={14} />
                                </button>
                            )}
                        </div>

                        {/* Nested Projects */}
                        {!isCollapsed && expandedWorkspace === ws.id && (
                            <div className="mt-1 space-y-1">
                                {loadingProjects === ws.id && <div className="px-10 py-1 text-xs text-gray-400">Loading...</div>}

                                {projectsMap[ws.id]?.map(proj => (
                                    <div
                                        key={proj._id}
                                        onClick={() => {
                                            onProjectSelect(proj);
                                            setCurrentView && setCurrentView('kanban');
                                        }}
                                        className={`group/proj ml-6 pl-8 pr-3 py-1.5 flex items-center gap-2 text-sm cursor-pointer rounded-md transition-colors ${currentProjectId === proj._id && currentView === 'kanban'
                                            ? 'bg-blue-100 text-blue-700 font-medium'
                                            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                                            }`}
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60"></span>
                                        <span className="truncate flex-1">{proj.title}</span>

                                        {/* Delete Project Button (admin only, visible on hover) */}
                                        {onProjectDelete && userRole === 'owner' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPendingDelete({ type: 'project', id: proj._id, wsId: ws.id, title: proj.title });
                                                }}
                                                className="opacity-0 group-hover/proj:opacity-100 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all duration-150 flex-shrink-0"
                                                title="Delete Project"
                                            >
                                                <FiTrash2 size={12} />
                                            </button>
                                        )}
                                    </div>
                                ))}

                                {/* Empty State for Members (when no projects exist) */}
                                {projectsMap[ws.id]?.length === 0 && loadingProjects !== ws.id && (
                                    <div className="ml-6 pl-8 py-1.5 text-xs text-gray-400 italic">
                                        No projects yet.
                                    </div>
                                )}

                                {/* Add Project Button (admin only) */}
                                {userRole === 'owner' && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setProjectModalWsId(ws.id); }}
                                        className="ml-6 pl-8 py-1.5 text-xs text-gray-400 hover:text-blue-600 flex items-center gap-2 w-full text-left transition-colors"
                                    >
                                        <FiPlus size={14} /> New Project
                                    </button>
                                )}

                                {/* Analytics Button (admin only) */}
                                {userRole === 'owner' && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setCurrentView && setCurrentView('analytics');
                                        }}
                                        className={`ml-6 pl-8 py-1.5 flex items-center gap-2 text-sm cursor-pointer rounded-md transition-colors w-full text-left ${currentView === 'analytics' && expandedWorkspace === ws.id
                                            ? 'bg-blue-100 text-blue-700 font-medium'
                                            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                                            }`}
                                    >
                                        <span className="opacity-60"><FiTrendingUp size={14} /></span> Analytics
                                    </button>
                                )}

                                {/* Calendar Button (visible to everyone) */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentView && setCurrentView('calendar');
                                    }}
                                    className={`ml-6 pl-8 py-1.5 flex items-center gap-2 text-sm cursor-pointer rounded-md transition-colors w-full text-left ${currentView === 'calendar' && expandedWorkspace === ws.id
                                        ? 'bg-blue-100 text-blue-700 font-medium'
                                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                                        }`}
                                >
                                    <span className="opacity-60"><FiCalendar size={14} /></span> Calendar
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Add Workspace Bottom Button */}
            <div className="p-4 border-t border-gray-200">
                <button
                    onClick={openModal}
                    className={`flex items-center justify-center gap-2 py-2 w-full border rounded-md text-sm font-medium transition-colors ${isCollapsed ? 'border-transparent text-gray-400 hover:bg-gray-100 hover:text-gray-900' : 'border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                        }`}
                >
                    <FiPlus size={16} /> {!isCollapsed && "Add Workspace"}
                </button>
            </div>

            {/* New Project Modal */}
            <InputModal
                isOpen={!!projectModalWsId}
                onClose={() => setProjectModalWsId(null)}
                onSubmit={handleCreateProject}
                title="New Project"
                placeholder="e.g. Website Redesign, Sprint 12"
                submitLabel="Create Project"
                icon={<FiFolder size={20} />}
            />

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={!!pendingDelete}
                onClose={() => setPendingDelete(null)}
                onConfirm={() => {
                    if (!pendingDelete) return;
                    if (pendingDelete.type === 'workspace' && onWorkspaceDelete) {
                        onWorkspaceDelete(pendingDelete.id);
                    } else if (pendingDelete.type === 'project' && onProjectDelete && pendingDelete.wsId) {
                        onProjectDelete(pendingDelete.id, pendingDelete.wsId);
                    }
                }}
                title={pendingDelete?.type === 'workspace' ? 'Delete Workspace' : 'Delete Project'}
                message={
                    pendingDelete?.type === 'workspace'
                        ? `Are you sure you want to delete "${pendingDelete?.title}"? All its projects and tasks will be permanently removed.`
                        : `Are you sure you want to delete "${pendingDelete?.title}"? All its tasks will be permanently removed.`
                }
            />

            {/* Invite Modal */}
            <InviteModal
                isOpen={!!inviteModalWs}
                onClose={() => setInviteModalWs(null)}
                workspaceId={inviteModalWs?.id || ''}
                workspaceTitle={inviteModalWs?.title || ''}
            />
        </aside>
    );
}