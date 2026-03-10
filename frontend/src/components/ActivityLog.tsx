import { useEffect, useState, type ReactNode } from 'react';
import { FiActivity, FiCheckCircle, FiClock, FiEdit3, FiMove, FiTrash2, FiUserPlus, FiUserX } from 'react-icons/fi';
import { ActivityService } from '../services/activityService.js';

type ActivityItem = {
    _id: string;
    action: string;
    actorName: string;
    message: string;
    workspaceId: string;
    workspaceTitle: string;
    createdAt: string;
};

const actionStyles: Record<string, { icon: ReactNode; accent: string; chip: string }> = {
    task_created: {
        icon: <FiActivity size={16} />,
        accent: 'text-sky-600 bg-sky-100',
        chip: 'Added'
    },
    task_updated: {
        icon: <FiEdit3 size={16} />,
        accent: 'text-amber-600 bg-amber-100',
        chip: 'Updated'
    },
    task_moved: {
        icon: <FiMove size={16} />,
        accent: 'text-violet-600 bg-violet-100',
        chip: 'Moved'
    },
    task_completed: {
        icon: <FiCheckCircle size={16} />,
        accent: 'text-emerald-600 bg-emerald-100',
        chip: 'Completed'
    },
    task_reopened: {
        icon: <FiClock size={16} />,
        accent: 'text-orange-600 bg-orange-100',
        chip: 'Reopened'
    },
    task_assigned: {
        icon: <FiUserPlus size={16} />,
        accent: 'text-indigo-600 bg-indigo-100',
        chip: 'Assigned'
    },
    task_unassigned: {
        icon: <FiUserX size={16} />,
        accent: 'text-rose-600 bg-rose-100',
        chip: 'Unassigned'
    },
    task_deleted: {
        icon: <FiTrash2 size={16} />,
        accent: 'text-red-600 bg-red-100',
        chip: 'Deleted'
    }
};

const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const diffMs = date.getTime() - Date.now();
    const diffMinutes = Math.round(diffMs / (1000 * 60));
    const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

    if (Math.abs(diffMinutes) < 60) {
        return formatter.format(diffMinutes, 'minute');
    }

    const diffHours = Math.round(diffMinutes / 60);
    if (Math.abs(diffHours) < 24) {
        return formatter.format(diffHours, 'hour');
    }

    const diffDays = Math.round(diffHours / 24);
    return formatter.format(diffDays, 'day');
};

export default function ActivityLog() {
    const [logs, setLogs] = useState<ActivityItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let isMounted = true;

        const loadLogs = async () => {
            try {
                const activityLogs = await ActivityService.getLogs();
                if (!isMounted) return;
                setLogs(activityLogs);
                setError('');
            } catch (err: any) {
                if (!isMounted) return;
                setError(err.message || 'Failed to load activity logs');
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadLogs();
        const interval = window.setInterval(loadLogs, 15000);

        return () => {
            isMounted = false;
            window.clearInterval(interval);
        };
    }, []);

    return (
        <section className="flex-1 overflow-y-auto bg-gray-50 px-6 py-6">
            <div className="mx-auto max-w-5xl">
                <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">Activity</p>
                        <h1 className="mt-2 text-2xl font-semibold text-gray-900">Global activity log</h1>
                        <p className="mt-2 text-sm text-gray-500">
                            Recent task activity across every workspace you can access.
                        </p>
                    </div>
                    <div className="hidden rounded-2xl bg-gray-100 p-3 text-gray-500 sm:block">
                        <FiActivity size={20} />
                    </div>
                </div>

                {isLoading ? (
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-sm text-gray-500">
                        Loading activity log...
                    </div>
                ) : error ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
                        {error}
                    </div>
                ) : logs.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                            <FiActivity size={18} />
                        </div>
                        <p className="text-base font-medium text-gray-900">No activity yet</p>
                        <p className="mt-1 text-sm text-gray-500">Task actions will start appearing here as your team works.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {logs.map((log) => {
                            const style = actionStyles[log.action] || actionStyles.task_updated;

                            return (
                                <article
                                    key={log._id}
                                    className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-gray-300"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl ${style.accent}`}>
                                            {style.icon}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                                                    {style.chip}
                                                </span>
                                                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
                                                    {log.workspaceTitle}
                                                </span>
                                                <span className="text-xs text-gray-400">{formatTimestamp(log.createdAt)}</span>
                                            </div>
                                            <p className="mt-2 text-sm leading-6 text-gray-800">{log.message}</p>
                                            <p className="mt-1 text-xs text-gray-400">
                                                {new Date(log.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}
