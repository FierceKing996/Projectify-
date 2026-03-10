import { useState, useEffect } from 'react';
import { FiX, FiCheckSquare, FiSquare, FiPlus, FiUser, FiAlignLeft, FiList, FiTrash2 } from 'react-icons/fi';
// @ts-ignore
import { TaskService } from '../services/taskService';

interface SubTask {
    id: string;
    content: string;
    completed: boolean;
}

interface Member {
    _id: string;
    username: string;
    email: string;
    role: string;
    isOnline: boolean;
}

interface TaskDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: any;
    onTaskUpdate: () => void;
    workspaceMembers?: Member[];
    isAdmin?: boolean;
}

export default function TaskDetailModal({ isOpen, onClose, task, onTaskUpdate, workspaceMembers = [], isAdmin = true }: TaskDetailModalProps) {
    const [description, setDescription] = useState('');
    const [subtasks, setSubtasks] = useState<SubTask[]>([]);
    const [newSubtask, setNewSubtask] = useState('');
    const [assignedTo, setAssignedTo] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (task) {
            setDescription(task.description || '');
            setSubtasks(task.subtasks || []);
            setAssignedTo(task.assignedTo?._id || task.assignedTo || null);
        }
    }, [task]);

    if (!isOpen || !task) return null;

    const activeTaskId = task._id || task.clientId || task.id;

    const save = async (updates: Record<string, any>) => {
        setSaving(true);
        try {
            await TaskService.updateTask(activeTaskId, updates);
            onTaskUpdate();
        } catch (err) {
            console.error('Failed to save task:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleDescriptionBlur = () => {
        if (description !== (task.description || '')) {
            save({ description });
        }
    };

    const handleAddSubtask = () => {
        if (!newSubtask.trim()) return;
        const updated = [...subtasks, { id: `st-${Date.now()}`, content: newSubtask.trim(), completed: false }];
        setSubtasks(updated);
        setNewSubtask('');
        save({ subtasks: updated });
    };

    const handleToggleSubtask = (id: string) => {
        const updated = subtasks.map(st => st.id === id ? { ...st, completed: !st.completed } : st);
        setSubtasks(updated);
        save({ subtasks: updated });
    };

    const handleDeleteSubtask = (id: string) => {
        const updated = subtasks.filter(st => st.id !== id);
        setSubtasks(updated);
        save({ subtasks: updated });
    };

    const handleAssign = (userId: string) => {
        const val = userId === '' ? null : userId;
        setAssignedTo(val);
        save({ assignedTo: val });
    };

    const completedCount = subtasks.filter(st => st.completed).length;
    const progressPct = subtasks.length > 0 ? Math.round((completedCount / subtasks.length) * 100) : 0;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-bold text-gray-900 truncate">{task.content}</h2>
                        <div className="flex items-center gap-3 mt-1">
                            {task.priority && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${task.priority === 'High' ? 'bg-red-50 text-red-700' :
                                    task.priority === 'Medium' ? 'bg-yellow-50 text-yellow-700' :
                                        'bg-blue-50 text-blue-700'
                                    }`}>{task.priority}</span>
                            )}
                            {task.labels?.map((l: string) => (
                                <span key={l} className="bg-indigo-50 text-indigo-700 text-[10px] font-semibold px-2 py-0.5 rounded">{l}</span>
                            ))}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <FiX size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">

                    {/* Assignment */}
                    {isAdmin && (
                        <div>
                            <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                <FiUser size={13} /> Assigned To
                            </label>
                            <select
                                value={assignedTo || ''}
                                onChange={(e) => handleAssign(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
                            >
                                <option value="">Unassigned</option>
                                {workspaceMembers.map(m => (
                                    <option key={m._id} value={m._id}>{m.username} ({m.role})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Description */}
                    <div>
                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            <FiAlignLeft size={13} /> Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            onBlur={handleDescriptionBlur}
                            placeholder="Add a description..."
                            className="w-full min-h-[80px] px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 focus:bg-white resize-y transition-all"
                        />
                    </div>

                    {/* Subtasks */}
                    <div>
                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            <FiList size={13} /> Subtasks
                            {subtasks.length > 0 && (
                                <span className="text-[10px] font-medium text-gray-400 normal-case">
                                    {completedCount}/{subtasks.length} done
                                </span>
                            )}
                        </label>

                        {/* Progress bar */}
                        {subtasks.length > 0 && (
                            <div className="w-full h-1.5 bg-gray-100 rounded-full mb-3 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-300"
                                    style={{ width: `${progressPct}%` }}
                                />
                            </div>
                        )}

                        {/* Subtask list */}
                        <div className="space-y-1.5">
                            {subtasks.map(st => (
                                <div key={st.id} className="flex items-center gap-2 group px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                                    <button onClick={() => handleToggleSubtask(st.id)} className="flex-shrink-0">
                                        {st.completed ? (
                                            <span className="text-emerald-500"><FiCheckSquare size={16} /></span>
                                        ) : (
                                            <span className="text-gray-400"><FiSquare size={16} /></span>
                                        )}
                                    </button>
                                    <span className={`flex-1 text-sm ${st.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                        {st.content}
                                    </span>
                                    <button
                                        onClick={() => handleDeleteSubtask(st.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                                    >
                                        <FiTrash2 size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Add subtask */}
                        <form onSubmit={(e) => { e.preventDefault(); handleAddSubtask(); }} className="flex gap-2 mt-2">
                            <input
                                value={newSubtask}
                                onChange={(e) => setNewSubtask(e.target.value)}
                                placeholder="Add a subtask..."
                                className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
                            />
                            <button
                                type="submit"
                                disabled={!newSubtask.trim()}
                                className="px-3 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 disabled:opacity-40 transition-all flex items-center gap-1"
                            >
                                <FiPlus size={14} /> Add
                            </button>
                        </form>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-xs text-gray-400">
                    <span>Created {new Date(task.createdAt).toLocaleDateString()}</span>
                    {saving && <span className="text-indigo-500 font-medium">Saving...</span>}
                    {task.userId?.username && <span>by {task.userId.username}</span>}
                </div>
            </div>
        </div>
    );
}
