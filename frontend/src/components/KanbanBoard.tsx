import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { FiMoreHorizontal, FiEdit2, FiTrash2, FiCheck, FiX, FiCloudOff, FiTag, FiColumns, FiBookmark, FiGrid, FiBell, FiList } from 'react-icons/fi';
import { ProjectService } from '../services/projectService';
import { TaskService } from '../services/taskService';
import InputModal from './InputModal';
import ConfirmModal from './ConfirmModal';
import TaskDetailModal from './TaskDetailModal';

interface KanbanBoardProps {
    project: any;
    tasks: any[];
    onTaskMove: (taskId: string, sectionId: string) => void;
    onTaskCreate: (sectionId: string, content: string, assignedTo?: string | null) => void;
    onTaskUpdate?: () => void;
    isAdmin?: boolean;
    workspaceMembers?: any[];
}

export default function KanbanBoard({ project, tasks, onTaskMove, onTaskCreate, onTaskUpdate, isAdmin = true, workspaceMembers = [] }: KanbanBoardProps) {
    const [sections, setSections] = useState<any[]>([]);
    const [newTaskContent, setNewTaskContent] = useState<Record<string, string>>({});
    const [newTaskAssignee, setNewTaskAssignee] = useState<Record<string, string>>({});
    const [openPriorityMenuId, setOpenPriorityMenuId] = useState<string | null>(null);
    // UI State
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [localTasks, setLocalTasks] = useState<any[]>([]);
    const [showSectionModal, setShowSectionModal] = useState(false);
    const [showLabelModal, setShowLabelModal] = useState(false);
    const [labelTargetTaskId, setLabelTargetTaskId] = useState<string | null>(null);
    const [labelTargetLabels, setLabelTargetLabels] = useState<string[]>([]);
    const [pendingDelete, setPendingDelete] = useState<{ type: 'task' | 'section'; id: string; title: string } | null>(null);
    const [reminderPickerTaskId, setReminderPickerTaskId] = useState<string | null>(null);
    const [selectedTask, setSelectedTask] = useState<any>(null);

    useEffect(() => {
        setLocalTasks(tasks);
    }, [tasks]);
    useEffect(() => {
        if (project?.sections) {
            setSections([...project.sections].sort((a, b) => a.order - b.order));
        }
    }, [project]);

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setOpenMenuId(null);
        setOpenPriorityMenuId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId, type } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        // ⚡ COLUMN REORDER
        if (type === 'COLUMN') {
            const reordered = Array.from(sections);
            const [moved] = reordered.splice(source.index, 1);
            reordered.splice(destination.index, 0, moved);
            // Update order field
            const withOrder = reordered.map((s, i) => ({ ...s, order: i }));
            setSections(withOrder);
            await ProjectService.updateSections(project._id, withOrder);
            return;
        }

        // ⚡ 1. INSTANT UI UPDATE: Stop the snap-back
        const updatedTasks = Array.from(localTasks);
        const taskIndex = updatedTasks.findIndex(t => (t._id || t.clientId || t.id) === draggableId);

        if (taskIndex > -1) {
            // Update the section ID locally right away
            updatedTasks[taskIndex].sectionId = destination.droppableId;
            setLocalTasks(updatedTasks);
        }

        // ⚡ 2. BACKGROUND SERVER SYNC
        const isCompleted = destination.droppableId.toLowerCase().includes('done');
        await TaskService.moveTask(draggableId, destination.droppableId, destination.index, isCompleted);

        // ⚡ 3. PERMANENT REFRESH
        if (onTaskUpdate) onTaskUpdate();
    };

    const handleAddSection = async (title: string) => {
        const newSections = [...sections, { id: `sec-${Date.now()}`, title, order: sections.length }];
        setSections(newSections);
        await ProjectService.updateSections(project._id, newSections);
    };

    // ⚡ BULLETPROOF HANDLERS (Using exact strings)
    const handleDeleteTask = async (taskId: string) => {
        try {
            await TaskService.deleteTask(taskId);
            setOpenMenuId(null);
            if (onTaskUpdate) onTaskUpdate();
        } catch (e) {
            alert("Failed to delete task");
        }
    };

    const startEditing = (taskId: string, content: string) => {
        setEditingTaskId(taskId);
        setEditContent(content);
        setOpenMenuId(null);
    };

    const saveEdit = async (taskId: string) => {
        if (!editContent.trim()) return;
        try {
            await TaskService.updateTask(taskId, { content: editContent });
            setEditingTaskId(null);
            if (onTaskUpdate) onTaskUpdate();
        } catch (e) {
            alert("Failed to update task");
        }
    };

    const openLabelModal = (taskId: string, currentLabels: string[] = []) => {
        setLabelTargetTaskId(taskId);
        setLabelTargetLabels(currentLabels);
        setShowLabelModal(true);
        setOpenMenuId(null);
    };

    const handleAddLabel = async (newLabel: string) => {
        if (!labelTargetTaskId) return;

        // Prevent duplicate labels on the same task
        const updatedLabels = [...new Set([...labelTargetLabels, newLabel])];

        try {
            // Optimistic UI Update
            const updatedTasks = [...localTasks];
            const taskIndex = updatedTasks.findIndex(t => (t._id || t.clientId || t.id) === labelTargetTaskId);
            if (taskIndex > -1) {
                updatedTasks[taskIndex].labels = updatedLabels;
                setLocalTasks(updatedTasks);
            }

            // Server Sync
            await TaskService.updateTask(labelTargetTaskId, { labels: updatedLabels });
            if (onTaskUpdate) onTaskUpdate();
        } catch (e) {
            console.error("Failed to add label", e);
        }
    };

    const handlePriorityChange = async (taskId: string, newPriority: string) => {
        try {
            // Instant UI Update (Optimistic)
            const updatedTasks = [...localTasks];
            const taskIndex = updatedTasks.findIndex(t => (t._id || t.clientId || t.id) === taskId);
            if (taskIndex > -1) {
                updatedTasks[taskIndex].priority = newPriority;
                setLocalTasks(updatedTasks);
            }

            // Tell the server
            await TaskService.updateTask(taskId, { priority: newPriority });
            setOpenPriorityMenuId(null); // Close menu
            if (onTaskUpdate) onTaskUpdate(); // Sync
        } catch (e) {
            console.error("Priority Error:", e);
            alert("Failed to update priority");
        }
    };

    const handleSetReminder = async (taskId: string, reminderAt: string) => {
        try {
            const updatedTasks = [...localTasks];
            const taskIndex = updatedTasks.findIndex(t => (t._id || t.clientId || t.id) === taskId);
            if (taskIndex > -1) {
                updatedTasks[taskIndex].reminderAt = reminderAt;
                setLocalTasks(updatedTasks);
            }
            await TaskService.updateTask(taskId, { reminderAt });
            setReminderPickerTaskId(null);
            if (onTaskUpdate) onTaskUpdate();
        } catch (e) {
            console.error("Failed to set reminder", e);
        }
    };

    const handleClearReminder = async (taskId: string) => {
        try {
            const updatedTasks = [...localTasks];
            const taskIndex = updatedTasks.findIndex(t => (t._id || t.clientId || t.id) === taskId);
            if (taskIndex > -1) {
                updatedTasks[taskIndex].reminderAt = null;
                setLocalTasks(updatedTasks);
            }
            await TaskService.updateTask(taskId, { reminderAt: null });
            setReminderPickerTaskId(null);
            if (onTaskUpdate) onTaskUpdate();
        } catch (e) {
            console.error("Failed to clear reminder", e);
        }
    };

    const getPriorityStyle = (priority: string) => {
        switch (priority) {
            case 'High': return 'bg-red-50 text-red-700 ring-1 ring-red-600/20';
            case 'Medium': return 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-600/20';
            case 'Low': return 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20';
            default: return 'bg-gray-50 text-gray-700 ring-1 ring-gray-600/20';
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-gray-50 overflow-hidden">
            <div className="h-16 px-6 border-b border-gray-200 flex items-center justify-between bg-white">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">{project.title}</h2>
                    <p className="text-xs text-gray-500">Board View</p>
                </div>
                {isAdmin && (
                    <button onClick={() => setShowSectionModal(true)} className="bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium px-3 py-1.5 rounded-md border border-gray-300 shadow-sm transition-colors">
                        + Add Section
                    </button>
                )}
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="board" type="COLUMN" direction="horizontal">
                    {(boardProvided) => (
                        <div ref={boardProvided.innerRef} {...boardProvided.droppableProps} className="flex-1 flex overflow-x-auto p-6 gap-6 items-start">
                            {sections.map((section, colIndex) => {

                                const sectionTasks = localTasks.filter(t => t.sectionId === section.id).sort((a, b) => a.order - b.order);
                                return (
                                    <Draggable key={section.id} draggableId={`col-${section.id}`} index={colIndex}>
                                        {(colProvided, colSnapshot) => (
                                            <div ref={colProvided.innerRef} {...colProvided.draggableProps} className={`w-80 flex-shrink-0 flex flex-col bg-gray-100/50 rounded-lg border max-h-full group/section transition-shadow ${colSnapshot.isDragging ? 'shadow-xl border-blue-300 ring-2 ring-blue-200' : 'border-gray-200'}`}>
                                                <div className="flex items-center justify-between p-3">
                                                    <div className="flex items-center gap-2">
                                                        {/* Drag Handle — admin only */}
                                                        {isAdmin ? (
                                                            <span {...colProvided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 transition-colors" title="Drag to reorder">
                                                                <FiGrid size={14} />
                                                            </span>
                                                        ) : (
                                                            <span {...colProvided.dragHandleProps} style={{ cursor: 'default' }} className="text-gray-300">
                                                                <FiGrid size={14} />
                                                            </span>
                                                        )}
                                                        <h3 className="font-semibold text-sm text-gray-700">{section.title}</h3>
                                                        <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">{sectionTasks.length}</span>
                                                    </div>
                                                    {/* Delete Section Button (admin only, visible on hover) */}
                                                    {isAdmin && (
                                                        <button
                                                            onClick={() => {
                                                                setPendingDelete({ type: 'section', id: section.id, title: section.title });
                                                            }}
                                                            className="opacity-0 group-hover/section:opacity-100 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all duration-150"
                                                            title="Delete Section"
                                                        >
                                                            <FiTrash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                                <Droppable droppableId={section.id} type="TASK">
                                                    {(provided) => (
                                                        <div ref={provided.innerRef} {...provided.droppableProps} className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-300">
                                                            {sectionTasks.map((task, index) => {
                                                                // ⚡ THE MASTER ID: We define it once per task and use it for everything.
                                                                const activeTaskId = task._id || task.clientId || task.id;
                                                                const isEditing = editingTaskId === activeTaskId;
                                                                const isUnsynced = !task._id;

                                                                return (
                                                                    <Draggable key={activeTaskId} draggableId={activeTaskId} index={index}>
                                                                        {(provided, snapshot) => (
                                                                            <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                                                                                onClick={() => { if (!isEditing) setSelectedTask(task); }}
                                                                                className={`bg-white p-3 rounded-lg border shadow-sm group relative transition-all cursor-pointer ${snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500 rotate-2 z-50' : 'border-gray-200 hover:border-blue-300'
                                                                                    }`}
                                                                            >
                                                                                <div className="flex justify-between items-start mb-2">
                                                                                    <div className="flex gap-2">
                                                                                        <div className="relative">
                                                                                            <button
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    setOpenPriorityMenuId(openPriorityMenuId === activeTaskId ? null : activeTaskId);
                                                                                                    setOpenMenuId(null);
                                                                                                }}
                                                                                                className={`text-[10px] font-medium px-2 py-0.5 rounded uppercase tracking-wider cursor-pointer hover:shadow-md transition-all ${getPriorityStyle(task.priority || 'Medium')}`}
                                                                                            >
                                                                                                {task.priority || 'Medium'}
                                                                                            </button>

                                                                                            {openPriorityMenuId === activeTaskId && (
                                                                                                <div className="absolute left-0 top-6 w-28 bg-white border border-gray-200 shadow-xl rounded-lg z-50 py-1 overflow-hidden">
                                                                                                    {['High', 'Medium', 'Low'].map(level => (
                                                                                                        <button
                                                                                                            key={level}
                                                                                                            onClick={(e) => {
                                                                                                                e.stopPropagation();
                                                                                                                handlePriorityChange(activeTaskId, level);
                                                                                                            }}
                                                                                                            className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-700 hover:bg-gray-50 transition-colors flex items-center"
                                                                                                        >
                                                                                                            <span className={`px-2 py-0.5 rounded w-full text-center ${getPriorityStyle(level)}`}>
                                                                                                                {level}
                                                                                                            </span>
                                                                                                        </button>
                                                                                                    ))}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                        {isUnsynced && (
                                                                                            <span className="flex items-center gap-1 text-[10px] bg-orange-100 text-orange-700 px-1.5 rounded border border-orange-200" title="Not synced yet">
                                                                                                <FiCloudOff size={10} /> Syncing...
                                                                                            </span>
                                                                                        )}
                                                                                    </div>

                                                                                    {!isEditing && (
                                                                                        <div className="relative">
                                                                                            <button
                                                                                                onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === activeTaskId ? null : activeTaskId); }}
                                                                                                className="text-gray-400 hover:text-gray-700 p-1 rounded hover:bg-gray-100"
                                                                                            >
                                                                                                <FiMoreHorizontal />
                                                                                            </button>

                                                                                            {openMenuId === activeTaskId && (
                                                                                                <div className="absolute right-0 top-6 w-32 bg-white border border-gray-200 shadow-xl rounded-lg z-50 py-1 overflow-hidden">
                                                                                                    <button onClick={(e) => { e.stopPropagation(); startEditing(activeTaskId, task.content); }} className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2">
                                                                                                        <FiEdit2 size={12} /> Edit
                                                                                                    </button>
                                                                                                    <button onClick={(e) => { e.stopPropagation(); openLabelModal(activeTaskId, task.labels); }} className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2">
                                                                                                        <FiTag size={12} /> Add Label
                                                                                                    </button>
                                                                                                    <button onClick={(e) => { e.stopPropagation(); setReminderPickerTaskId(activeTaskId); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-amber-50 hover:text-amber-600 flex items-center gap-2">
                                                                                                        <FiBell size={12} /> Set Reminder
                                                                                                    </button>
                                                                                                    <button onClick={(e) => { e.stopPropagation(); setPendingDelete({ type: 'task', id: activeTaskId, title: task.content }); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2">
                                                                                                        <FiTrash2 size={12} /> Delete
                                                                                                    </button>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </div>

                                                                                {isEditing ? (
                                                                                    <div className="mt-2">
                                                                                        <textarea
                                                                                            autoFocus className="w-full text-sm border border-blue-300 rounded p-2 outline-none ring-2 ring-blue-100 min-h-[60px]"
                                                                                            value={editContent} onChange={(e) => setEditContent(e.target.value)}
                                                                                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(activeTaskId); } }}
                                                                                        />
                                                                                        <div className="flex gap-2 mt-2 justify-end">
                                                                                            <button onClick={() => setEditingTaskId(null)} className="p-1 text-gray-500 hover:bg-gray-100 rounded"><FiX /></button>
                                                                                            <button onClick={() => saveEdit(activeTaskId)} className="p-1 text-green-600 hover:bg-green-50 rounded"><FiCheck /></button>
                                                                                        </div>
                                                                                    </div>
                                                                                ) : (
                                                                                    <p className="text-sm text-gray-800 leading-relaxed break-words">{task.content}</p>
                                                                                )}
                                                                                {task.labels && task.labels.length > 0 && (
                                                                                    <div className="flex flex-wrap gap-1 mt-3">
                                                                                        {task.labels.map((label: string) => (
                                                                                            <span key={label} className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide">
                                                                                                {label}
                                                                                            </span>
                                                                                        ))}
                                                                                    </div>
                                                                                )}

                                                                                {/* Subtask progress + assigned avatar row */}
                                                                                <div className="flex items-center justify-between mt-2">
                                                                                    {task.subtasks && task.subtasks.length > 0 ? (
                                                                                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                                                                                            <FiList size={10} />
                                                                                            <span>{task.subtasks.filter((s: any) => s.completed).length}/{task.subtasks.length}</span>
                                                                                        </div>
                                                                                    ) : <div />}
                                                                                    {(task.assignedTo?.username || task.userId?.username) && (
                                                                                        <div
                                                                                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold bg-gradient-to-br from-indigo-500 to-violet-600"
                                                                                            title={`Assigned to ${task.assignedTo?.username || task.userId?.username}`}
                                                                                        >
                                                                                            {(task.assignedTo?.username || task.userId?.username || '?').charAt(0).toUpperCase()}
                                                                                        </div>
                                                                                    )}
                                                                                </div>

                                                                                {/* Reminder Badge */}
                                                                                {task.reminderAt && (
                                                                                    <div className="flex items-center gap-1.5 mt-2">
                                                                                        <span className={new Date(task.reminderAt) <= new Date() ? 'text-red-500' : 'text-amber-500'}><FiBell size={11} /></span>
                                                                                        <span className={`text-[10px] font-medium ${new Date(task.reminderAt) <= new Date() ? 'text-red-500' : 'text-amber-500'}`}>
                                                                                            {new Date(task.reminderAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                                        </span>
                                                                                        <button
                                                                                            onClick={(e) => { e.stopPropagation(); handleClearReminder(activeTaskId); }}
                                                                                            className="text-gray-300 hover:text-red-400 transition-colors ml-1"
                                                                                            title="Clear Reminder"
                                                                                        >
                                                                                            <FiX size={11} />
                                                                                        </button>
                                                                                    </div>
                                                                                )}

                                                                                {/* Reminder Datetime Picker */}
                                                                                {reminderPickerTaskId === activeTaskId && (
                                                                                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg"
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                        onMouseDown={(e) => e.stopPropagation()}
                                                                                        onPointerDown={(e) => e.stopPropagation()}
                                                                                    >
                                                                                        <label className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-1 block">Set Reminder</label>
                                                                                        <input
                                                                                            type="datetime-local"
                                                                                            className="w-full text-xs border border-amber-300 rounded px-2 py-1.5 outline-none focus:ring-2 focus:ring-amber-200 bg-white"
                                                                                            draggable={false}
                                                                                            onMouseDown={(e) => e.stopPropagation()}
                                                                                            onPointerDown={(e) => e.stopPropagation()}
                                                                                            onChange={(e) => {
                                                                                                if (e.target.value) {
                                                                                                    handleSetReminder(activeTaskId, new Date(e.target.value).toISOString());
                                                                                                }
                                                                                            }}
                                                                                        />
                                                                                        <button
                                                                                            onClick={() => setReminderPickerTaskId(null)}
                                                                                            className="mt-1 text-[10px] text-gray-500 hover:text-gray-700"
                                                                                        >
                                                                                            Cancel
                                                                                        </button>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </Draggable>
                                                                );
                                                            })}
                                                            {provided.placeholder}
                                                        </div>
                                                    )}
                                                </Droppable>

                                                <div className="p-2 border-t border-gray-200 bg-white rounded-b-lg">
                                                    <form onSubmit={(e) => {
                                                        e.preventDefault();
                                                        const val = newTaskContent[section.id];
                                                        const assignTo = newTaskAssignee[section.id] || null;
                                                        if (val && val.trim()) {
                                                            setNewTaskContent({ ...newTaskContent, [section.id]: '' });
                                                            setNewTaskAssignee({ ...newTaskAssignee, [section.id]: '' });
                                                            onTaskCreate(section.id, val, assignTo);
                                                        }
                                                    }}>
                                                        <input
                                                            className="w-full bg-gray-50 hover:bg-white border border-transparent hover:border-gray-300 rounded-md p-2 text-sm text-gray-700 placeholder-gray-500 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                                            placeholder="+ Add Task" value={newTaskContent[section.id] || ''} onChange={(e) => setNewTaskContent({ ...newTaskContent, [section.id]: e.target.value })}
                                                        />
                                                        {newTaskContent[section.id] && (
                                                            <div className="flex items-center justify-between mt-2 px-1 animate-in fade-in zoom-in-95 duration-200">
                                                                {isAdmin ? (
                                                                    <select
                                                                        className="max-w-[130px] text-[11px] sm:text-xs text-gray-600 border border-gray-200 rounded p-1 bg-white outline-none cursor-pointer hover:border-gray-300 focus:border-blue-500 transition-colors truncate"
                                                                        value={newTaskAssignee[section.id] || ''}
                                                                        onChange={(e) => setNewTaskAssignee({ ...newTaskAssignee, [section.id]: e.target.value })}
                                                                    >
                                                                        <option value="">Unassigned</option>
                                                                        {workspaceMembers.map((member: any) => (
                                                                            <option key={member._id} value={member._id}>Assign: {member.username}</option>
                                                                        ))}
                                                                    </select>
                                                                ) : <div />}
                                                                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] sm:text-xs font-semibold px-2 py-1 rounded transition-colors flex-shrink-0">
                                                                    Save Task
                                                                </button>
                                                            </div>
                                                        )}
                                                    </form>
                                                </div>
                                            </div>
                                        )}
                                    </Draggable>
                                );
                            })}
                            {boardProvided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>

            {/* Section Modal */}
            <InputModal
                isOpen={showSectionModal}
                onClose={() => setShowSectionModal(false)}
                onSubmit={handleAddSection}
                title="New Section"
                placeholder="e.g. In Progress, Review, Done"
                submitLabel="Add Section"
                icon={<FiColumns size={20} />}
            />

            {/* Label Modal */}
            <InputModal
                isOpen={showLabelModal}
                onClose={() => setShowLabelModal(false)}
                onSubmit={handleAddLabel}
                title="Add Label"
                placeholder="e.g. Frontend, Bug, Urgent"
                submitLabel="Add Label"
                icon={<FiBookmark size={20} />}
            />

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={!!pendingDelete}
                onClose={() => setPendingDelete(null)}
                onConfirm={async () => {
                    if (!pendingDelete) return;
                    if (pendingDelete.type === 'task') {
                        await handleDeleteTask(pendingDelete.id);
                    } else if (pendingDelete.type === 'section') {
                        const updated = sections.filter(s => s.id !== pendingDelete.id);
                        setSections(updated);
                        await ProjectService.updateSections(project._id, updated);
                        if (onTaskUpdate) onTaskUpdate();
                    }
                }}
                title={pendingDelete?.type === 'task' ? 'Delete Task' : 'Delete Section'}
                message={
                    pendingDelete?.type === 'task'
                        ? `Are you sure you want to delete this task?`
                        : `Delete section "${pendingDelete?.title}"? Tasks in this section won't be deleted but will lose their section.`
                }
            />

            {/* Task Detail Modal */}
            <TaskDetailModal
                isOpen={!!selectedTask}
                onClose={() => setSelectedTask(null)}
                task={selectedTask}
                onTaskUpdate={() => { setSelectedTask(null); if (onTaskUpdate) onTaskUpdate(); }}
                workspaceMembers={workspaceMembers}
            />
        </div>
    );
}