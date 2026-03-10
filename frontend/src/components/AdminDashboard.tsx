import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { AuthService } from '../services/authService';

// --- TYPES ---
interface KPICards {
  totalUsers: number;
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  completionRate: number;
  productivityScore: number;
  currentStreak: number;
  avgCompletionTime: number; // In hours
  userGrowth: number;
  taskGrowth: number;
  wsTotal: number;
  wsGrowth: number;
}

interface ChartData {
  date: string;
  tasks: number;
}

interface HeatmapData {
  hour: number;
  value: number;
}

interface ProjectData {
  name: string;
  value: number;
}

interface ActivityItem {
  id: string;
  user: string;
  task: string;
  status: 'Completed' | 'Active';
  date: string;
}

interface DashboardData {
  cards: KPICards;
  chartData: ChartData[];
  recentActivity: ActivityItem[];
  pieData: { name: string; value: number }[];
  creationHeatmap: HeatmapData[];   // ⚡ NEW: When tasks are created
  completionHeatmap: HeatmapData[]; // ⚡ NEW: When tasks are completed
  projects: ProjectData[];
}

interface AdminDashboardProps {
  onLogout: () => void;
}

// --- COLORS ---
const COLORS = ['#00C853', '#2962FF', '#FFD600', '#FF3D00', '#AA00FF'];
const DARK_BG = "#1A1A1A";
const CARD_BG = "#252525";
const TEXT_MAIN = "#E0E0E0";
const TEXT_SUB = "#A0A0A0";
export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // ⚡ NEW: Toggle between "Created" and "Completed" heatmaps
  const [heatmapMode, setHeatmapMode] = useState<'created' | 'completed'>('completed');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/admin/stats', {
          headers: { 'Authorization': `Bearer ${AuthService.getToken()}` }
        });
        
        if (res.status === 401 || res.status === 403) {
            onLogout();
            return;
        }

        const response = await res.json();
        if (res.ok && response.data) {
          setData(response.data);
        } else {
            console.error("API Error:", response);
        }
      } catch (err) {
        console.error("Network Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [onLogout]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#111] text-[#00E676] font-mono animate-pulse">
      INITIALIZING DASHBOARD...
    </div>
  );

  if (!data) return null;

  // --- RENDERING HELPERS ---
  const { cards } = data;
  
  const StatCard = ({ title, value, sub, trend }: any) => (
    <div className="p-5 rounded-xl border border-gray-800 hover:border-[#00E676] transition-all duration-300 relative overflow-hidden group" style={{ backgroundColor: CARD_BG }}>
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            {/* Background Icon Effect */}
            <div className="w-16 h-16 bg-white rounded-full blur-xl"></div>
        </div>
        <h3 className="text-sm font-bold uppercase tracking-wider mb-1" style={{ color: TEXT_SUB }}>{title}</h3>
        <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-white">{value}</span>
            {trend !== undefined && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded mb-1 ${trend >= 0 ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
                    {trend > 0 ? '+' : ''}{trend}%
                </span>
            )}
        </div>
        {sub && <p className="text-xs mt-2" style={{ color: TEXT_SUB }}>{sub}</p>}
    </div>
  );

  return (
    <div className="min-h-screen font-sans selection:bg-[#00E676] selection:text-black" style={{ backgroundColor: DARK_BG, color: TEXT_MAIN }}>
      
      {/* --- HEADER --- */}
      <header className="border-b border-gray-800 bg-[#111]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="w-3 h-8 bg-[#00E676] rounded-sm shadow-[0_0_10px_#00E676]"></div>
                <h1 className="text-xl font-black tracking-tight text-white">
                    YOUR-TO<span className="text-[#00E676]">DO</span> <span className="text-gray-600 font-normal">| EXECUTIVE</span>
                </h1>
            </div>
            <div className="flex items-center gap-6">
                <div className="text-right hidden sm:block">
                    <p className="text-xs text-gray-500 uppercase font-bold">System Status</p>
                    <div className="flex items-center gap-2 justify-end">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        <span className="text-xs font-mono text-green-400">OPERATIONAL</span>
                    </div>
                </div>
                <button 
                    onClick={onLogout}
                    className="bg-gray-800 hover:bg-red-900/30 hover:text-red-400 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all border border-gray-700 hover:border-red-500/50"
                >
                    LOGOUT
                </button>
            </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* --- 1. KPI GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* ROW 1: GROWTH & VOLUME */}
            <StatCard title="Total Users" value={cards.totalUsers} trend={cards.userGrowth} sub="Registered Accounts" />
            <StatCard title="Total Tasks" value={cards.totalTasks} trend={cards.taskGrowth} sub="All-time Volume" />
            <StatCard title="Completion Rate" value={`${cards.completionRate}%`} sub={`${cards.completedTasks} / ${cards.totalTasks} Tasks`} />
            <StatCard title="Active Workspaces" value={cards.wsTotal} trend={cards.wsGrowth} sub="Project Containers" />
            
            {/* ROW 2: PERFORMANCE & HEALTH */}
            <StatCard title="Productivity Score" value={cards.productivityScore} sub="Algorithmic Health Index" />
            <StatCard title="System Streak" value={`${cards.currentStreak} Days`} sub="Consecutive Activity" />
            <StatCard title="Avg Turnaround" value={`${cards.avgCompletionTime}h`} sub="Create to Complete Time" />
            <StatCard title="Active Now" value={cards.activeTasks} sub="Pending Tasks" />
        </div>

        {/* --- 2. MAIN CHARTS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* A. GROWTH CHART (Area) */}
            <div className="lg:col-span-2 rounded-xl border border-gray-800 p-6" style={{ backgroundColor: CARD_BG }}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        TASK VELOCITY (7 DAYS)
                    </h3>
                </div>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.chartData}>
                            <defs>
                                <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2962FF" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#2962FF" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="date" stroke="#555" tick={{fill: '#888', fontSize: 12}} />
                            <YAxis stroke="#555" tick={{fill: '#888', fontSize: 12}} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Area type="monotone" dataKey="tasks" stroke="#2962FF" strokeWidth={3} fillOpacity={1} fill="url(#colorTasks)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* B. HEATMAP (Bar - Switchable) */}
            <div className="rounded-xl border border-gray-800 p-6" style={{ backgroundColor: CARD_BG }}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${heatmapMode === 'completed' ? 'bg-[#00E676]' : 'bg-[#FFD600]'}`}></span>
                        PEAK HOURS
                    </h3>
                    <div className="flex bg-black rounded-lg p-1 border border-gray-800">
                        <button 
                            onClick={() => setHeatmapMode('created')}
                            className={`px-3 py-1 text-xs font-bold rounded ${heatmapMode === 'created' ? 'bg-[#FFD600] text-black' : 'text-gray-500 hover:text-white'}`}
                        >
                            ADDED
                        </button>
                        <button 
                            onClick={() => setHeatmapMode('completed')}
                            className={`px-3 py-1 text-xs font-bold rounded ${heatmapMode === 'completed' ? 'bg-[#00E676] text-black' : 'text-gray-500 hover:text-white'}`}
                        >
                            DONE
                        </button>
                    </div>
                </div>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={heatmapMode === 'completed' ? data.completionHeatmap : data.creationHeatmap}>
                            <XAxis dataKey="hour" stroke="#555" tick={{fontSize: 10}} interval={2} />
                            <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
                            <Bar 
                                dataKey="value" 
                                fill={heatmapMode === 'completed' ? '#00E676' : '#FFD600'} 
                                radius={[2, 2, 0, 0]} 
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* --- 3. BOTTOM ROW --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* C. PROJECT DISTRIBUTION (Pie) */}
            <div className="rounded-xl border border-gray-800 p-6" style={{ backgroundColor: CARD_BG }}>
                <h3 className="font-bold text-white mb-6">WORKLOAD BY PROJECT</h3>
                <div className="h-64 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data.projects}
                                cx="50%" cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.projects.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Centered Total */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                            <span className="block text-3xl font-black text-white">{cards.totalTasks}</span>
                            <span className="text-xs text-gray-500 uppercase font-bold">Tasks</span>
                        </div>
                    </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    {data.projects.map((entry, index) => (
                        <div key={index} className="flex items-center gap-1.5 bg-black/30 px-2 py-1 rounded text-xs">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                            <span className="text-gray-300">{entry.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* D. RECENT ACTIVITY (Table) */}
            <div className="lg:col-span-2 rounded-xl border border-gray-800 p-6" style={{ backgroundColor: CARD_BG }}>
                <h3 className="font-bold text-white mb-6 flex items-center gap-2">
                    <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                    LIVE FEED
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-black/20 text-gray-500">
                            <tr>
                                <th className="px-4 py-3 rounded-l-lg">User</th>
                                <th className="px-4 py-3">Task</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right rounded-r-lg">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {data.recentActivity.length > 0 ? (
                                data.recentActivity.map((item) => (
                                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-4 py-3 font-medium text-white">{item.user}</td>
                                        <td className="px-4 py-3 text-gray-400 truncate max-w-[200px]">{item.task}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                item.status === 'Completed' ? 'bg-green-900/30 text-green-400 border border-green-900' : 'bg-yellow-900/30 text-yellow-400 border border-yellow-900'
                                            }`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-500 font-mono text-xs">
                                            {new Date(item.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500 italic">
                                        No recent activity found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
      </main>
    </div>
  );
}
