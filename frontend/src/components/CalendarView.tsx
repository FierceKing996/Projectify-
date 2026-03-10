import { useState, useMemo } from 'react';
import { FiChevronLeft, FiChevronRight, FiCalendar } from 'react-icons/fi';

interface Task {
    _id?: string;
    clientId: string;
    content: string;
    priority: string;
    reminderAt?: string;
    createdAt?: string;
    assignedTo?: any;
    userId?: any;
}

interface CalendarViewProps {
    tasks: Task[];
    currentUserId: string;
    isAdmin: boolean;
}

export default function CalendarView({ tasks, currentUserId, isAdmin }: CalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());

    // 1. Filter tasks
    const visibleTasks = useMemo(() => {
        if (isAdmin) {
            // Admin only sees tasks with reminders set
            return tasks.filter(t => t.reminderAt);
        }
        return tasks.filter(t => {
            const assignedId = typeof t.assignedTo === 'object' && t.assignedTo ? t.assignedTo._id : t.assignedTo;
            const creatorId = typeof t.userId === 'object' && t.userId ? t.userId._id : t.userId;
            return assignedId === currentUserId || creatorId === currentUserId;
        });
    }, [tasks, currentUserId, isAdmin]);

    // 2. Map tasks to dates
    const tasksByDate = useMemo(() => {
        const map: Record<string, Task[]> = {};
        visibleTasks.forEach(task => {
            // Use reminderAt if it exists, otherwise fallback to createdAt
            const targetDateStr = task.reminderAt || task.createdAt || new Date().toISOString();
            if (!targetDateStr) return;

            const dateCls = new Date(targetDateStr);
            if (isNaN(dateCls.getTime())) return;

            // Form key: YYYY-MM-DD
            const key = `${dateCls.getFullYear()}-${String(dateCls.getMonth() + 1).padStart(2, '0')}-${String(dateCls.getDate()).padStart(2, '0')}`;
            if (!map[key]) map[key] = [];
            map[key].push(task);
        });
        return map;
    }, [visibleTasks]);

    // --- Calendar Generation Logic ---
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0-11

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month); // 0 (Sun) to 6 (Sat)

    // Previous month filler days
    const prevMonthDays = getDaysInMonth(year, month - 1);

    const calendarGrid = [];

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Fill previous month trailing days
    for (let i = 0; i < firstDay; i++) {
        calendarGrid.push({
            day: prevMonthDays - firstDay + i + 1,
            isCurrentMonth: false,
            dateKey: null
        });
    }

    // Fill current month
    for (let i = 1; i <= daysInMonth; i++) {
        const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        calendarGrid.push({
            day: i,
            isCurrentMonth: true,
            dateKey: key
        });
    }

    // Fill next month leading days to complete the 42-cell grid (6 weeks)
    const remainingCells = 42 - calendarGrid.length;
    for (let i = 1; i <= remainingCells; i++) {
        calendarGrid.push({
            day: i,
            isCurrentMonth: false,
            dateKey: null
        });
    }

    // --- Actions ---
    const prevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const today = () => {
        setCurrentDate(new Date());
    };

    const getPriorityColor = (priority: string) => {
        switch (priority?.toLowerCase()) {
            case 'high': return 'bg-red-100 text-red-700 border-red-200';
            case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    // Helper to format Date
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const isToday = (dateKey: string | null) => {
        if (!dateKey) return false;
        const now = new Date();
        const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        return dateKey === todayKey;
    };

    return (
        <div className="flex-1 bg-gray-50 p-8 overflow-y-auto flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <span className="text-indigo-600"><FiCalendar /></span>
                        {monthNames[month]} {year}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {isAdmin ? 'Showing all workspace tasks' : 'Showing tasks assigned to you'}
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={today}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        Today
                    </button>
                    <div className="flex items-center rounded-md border border-gray-300 bg-white shadow-sm overflow-hidden">
                        <button
                            onClick={prevMonth}
                            className="p-2 text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-colors border-r border-gray-200"
                        >
                            <FiChevronLeft size={20} />
                        </button>
                        <button
                            onClick={nextMonth}
                            className="p-2 text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                        >
                            <FiChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Calendar Grid Container */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col flex-1 overflow-hidden">
                {/* Days of Week Header */}
                <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/80 shrink-0">
                    {weekDays.map(day => (
                        <div key={day} className="py-3 text-center text-xs font-bold tracking-wider text-gray-500 uppercase">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Cells */}
                <div className="grid grid-cols-7 flex-1 min-h-[500px]">
                    {calendarGrid.map((cell, index) => {
                        const dayTasks = cell.dateKey ? tasksByDate[cell.dateKey] || [] : [];
                        const todayHighlight = isToday(cell.dateKey);

                        return (
                            <div
                                key={index}
                                className={`
                                    min-h-[120px] p-2 border-b border-r border-gray-100 relative
                                    ${index % 7 === 6 ? 'border-r-0' : ''} 
                                    ${index >= 35 ? 'border-b-0' : ''}
                                    ${!cell.isCurrentMonth ? 'bg-gray-50/50' : 'bg-white'}
                                `}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`
                                        inline-flex items-center justify-center w-7 h-7 rounded-full text-sm
                                        ${todayHighlight
                                            ? 'bg-indigo-600 text-white font-bold'
                                            : cell.isCurrentMonth ? 'text-gray-700 font-medium' : 'text-gray-400'}
                                    `}>
                                        {cell.day}
                                    </span>
                                    {dayTasks.length > 0 && (
                                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md font-medium">
                                            {dayTasks.length}
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-1.5 max-h-[100px] overflow-y-auto no-scrollbar pb-1">
                                    {dayTasks.map(task => (
                                        <div
                                            key={task.clientId}
                                            className={`text-xs px-2 py-1.5 rounded-md border truncate shadow-sm transition-all hover:shadow-md cursor-pointer ${getPriorityColor(task.priority)}`}
                                            title={task.content}
                                        >
                                            {task.content}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
