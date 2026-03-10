import { useState, useEffect } from 'react';
import { FiBell, FiClock, FiCheckCircle } from 'react-icons/fi';

interface ReminderDropdownProps {
    tasks: any[];
    onDismiss?: (taskId: string) => void;
}

export default function ReminderDropdown({ tasks, onDismiss }: ReminderDropdownProps) {
    void onDismiss;
    const [isOpen, setIsOpen] = useState(false);
    const [now, setNow] = useState(new Date());

    // Refresh "now" every 60 seconds so reminders appear in real time
    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    // Filter tasks whose reminder time has arrived
    const dueReminders = tasks.filter(task => {
        if (!task.reminderAt || task.completed || task.isDeleted) return false;
        return new Date(task.reminderAt) <= now;
    });

    const count = dueReminders.length;

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        const today = new Date();
        const isToday = d.toDateString() === today.toDateString();

        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (isToday) return `Today at ${timeStr}`;
        return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
    };

    const getPriorityDot = (priority: string) => {
        switch (priority) {
            case 'High': return 'bg-red-500';
            case 'Medium': return 'bg-yellow-500';
            case 'Low': return 'bg-blue-500';
            default: return 'bg-gray-400';
        }
    };

    return (
        <div className="relative">
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors relative"
            >
                <FiBell size={20} />
                {/* Notification Badge */}
                {count > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white px-1 animate-pulse">
                        {count > 9 ? '9+' : count}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />

                    <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl z-40 overflow-hidden"
                        style={{ animation: 'fadeSlideIn 0.2s ease-out' }}
                    >
                        {/* Header */}
                        <div className="px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FiBell size={16} />
                                    <span className="font-semibold text-sm">Reminders</span>
                                </div>
                                {count > 0 && (
                                    <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                        {count} due
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Reminder List */}
                        <div className="max-h-80 overflow-y-auto">
                            {count === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 px-4">
                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                        <span className="text-green-400"><FiCheckCircle size={24} /></span>
                                    </div>
                                    <p className="text-sm font-medium text-gray-700">All caught up!</p>
                                    <p className="text-xs text-gray-400 mt-1">No reminders due right now</p>
                                </div>
                            ) : (
                                dueReminders.map(task => {
                                    const activeId = task._id || task.clientId || task.id;
                                    return (
                                        <div
                                            key={activeId}
                                            className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer group"
                                        >
                                            <div className="flex items-start gap-3">
                                                {/* Priority Dot */}
                                                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${getPriorityDot(task.priority)}`} />

                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-gray-800 font-medium truncate">
                                                        {task.content}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <span className="text-gray-400"><FiClock size={11} /></span>
                                                        <span className="text-[11px] text-gray-400">
                                                            {formatTime(task.reminderAt)}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Priority Badge */}
                                                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0
                                                    ${task.priority === 'High' ? 'bg-red-50 text-red-600' : ''}
                                                    ${task.priority === 'Medium' ? 'bg-yellow-50 text-yellow-600' : ''}
                                                    ${task.priority === 'Low' ? 'bg-blue-50 text-blue-600' : ''}
                                                `}>
                                                    {task.priority || 'Medium'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Inline keyframe animation */}
            <style>{`
                @keyframes fadeSlideIn {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
