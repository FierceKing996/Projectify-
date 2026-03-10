import { useState, useEffect } from 'react';
import { FiUsers, FiCheckCircle, FiClock, FiActivity } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

interface AnalyticsDashboardProps {
    workspaceId: string;
}

export default function AnalyticsDashboard({ workspaceId }: AnalyticsDashboardProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('agency_token');
                const res = await fetch(`http://localhost:5000/api/analytics/workspace/${workspaceId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!res.ok) {
                    throw new Error('Failed to fetch analytics');
                }

                const result = await res.json();
                setData(result.data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (workspaceId) {
            fetchAnalytics();
        }
    }, [workspaceId]);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Analytics...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;
    if (!data) return null;

    const { overview, userAnalytics } = data;

    // Helper to format ms to hours/mins
    const formatTime = (ms: number) => {
        if (!ms) return '0h';
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        if (hours > 0) return `${hours}h ${mins}m`;
        return `${mins}m`;
    };

    // Prepare chart data
    const chartData = userAnalytics.map((u: any) => ({
        name: u.username,
        Total: u.totalTasks,
        Completed: u.completedTasks,
        avgTimeHours: Number((u.avgCompletionTimeMs / (1000 * 60 * 60)).toFixed(1))
    }));

    return (
        <div className="flex-1 bg-gray-50 p-8 overflow-y-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Workspace Analytics</h1>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><FiUsers size={24} /></div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Workspace Members</p>
                        <h3 className="text-2xl font-bold text-gray-900">{overview.totalMembers}</h3>
                        <p className="text-xs text-green-600 mt-1">{overview.onlineMembers} currently online</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><FiActivity size={24} /></div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total Tasks</p>
                        <h3 className="text-2xl font-bold text-gray-900">{overview.totalTasks}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 bg-green-50 text-green-600 rounded-lg"><FiCheckCircle size={24} /></div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Completed Tasks</p>
                        <h3 className="text-2xl font-bold text-gray-900">{overview.completedTasks}</h3>
                        <p className="text-xs text-gray-500 mt-1">
                            {overview.totalTasks > 0 ? Math.round((overview.completedTasks / overview.totalTasks) * 100) : 0}% completion rate
                        </p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-lg"><FiClock size={24} /></div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Avg Completion Time</p>
                        <h3 className="text-2xl font-bold text-gray-900">{formatTime(overview.overallAvgCompletionTimeMs)}</h3>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Visualizations - Occupies 2 columns */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Task Distribution by User</h3>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: '#F3F4F6' }} />
                                    <Legend />
                                    <Bar dataKey="Total" fill="#93C5FD" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Completed" fill="#4ADE80" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Average Completion Time (Hours)</h3>
                        <div className="h-60">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: '#F3F4F6' }} />
                                    <Bar dataKey="avgTimeHours" fill="#FBBF24" radius={[4, 4, 0, 0]} name="Hours" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Leaderboard - Occupies 1 column */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            🏆 Leaderboard
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">Ranked by completed tasks</p>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 bg-white">
                                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Done</th>
                                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Avg Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {userAnalytics.map((u: any, idx: number) => (
                                    <tr key={u._id || idx} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-5 py-3 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
                                                    {u.username.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="font-medium text-sm text-gray-900">{u.username}</div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-700 font-semibold text-right">
                                            {u.completedTasks}
                                        </td>
                                        <td className="px-5 py-3 whitespace-nowrap text-xs text-gray-500 text-right">
                                            {formatTime(u.avgCompletionTimeMs)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {userAnalytics.length === 0 && (
                            <div className="p-8 text-center text-gray-500 text-sm">
                                No data available yet.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
