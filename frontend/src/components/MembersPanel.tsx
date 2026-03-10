import { FiUsers } from 'react-icons/fi';

interface Member {
    _id: string;
    username: string;
    email: string;
    role: string;
    isOnline: boolean;
}

interface MembersPanelProps {
    members: Member[];
}

export default function MembersPanel({ members }: MembersPanelProps) {
    if (!members || members.length <= 1) return null;

    const onlineCount = members.filter(m => m.isOnline).length;

    return (
        <div className="flex items-center gap-2">
            {/* Online count badge */}
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mr-1">
                <FiUsers size={14} />
                <span className="font-medium">{onlineCount}/{members.length}</span>
            </div>

            {/* Avatar stack */}
            <div className="flex -space-x-2">
                {members.slice(0, 5).map((member) => (
                    <div key={member._id} className="relative group">
                        <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-sm transition-transform hover:scale-110 hover:z-10 cursor-default ${member.role === 'owner'
                                    ? 'bg-gradient-to-br from-indigo-500 to-violet-600'
                                    : 'bg-gradient-to-br from-emerald-400 to-teal-500'
                                }`}
                            title={`${member.username} (${member.role}) — ${member.isOnline ? 'Online' : 'Offline'}`}
                        >
                            {member.username.charAt(0).toUpperCase()}
                        </div>
                        {/* Online indicator dot */}
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${member.isOnline ? 'bg-green-400' : 'bg-gray-300'
                            }`} />
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 text-white text-[11px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                            <div className="font-semibold">{member.username}</div>
                            <div className="text-gray-400 text-[10px]">{member.role === 'owner' ? '👑 Owner' : 'Member'}</div>
                            <div className={`text-[10px] ${member.isOnline ? 'text-green-400' : 'text-gray-500'}`}>
                                {member.isOnline ? '● Online' : '○ Offline'}
                            </div>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900 rotate-45" />
                        </div>
                    </div>
                ))}
                {members.length > 5 && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-[10px] font-bold border-2 border-white shadow-sm">
                        +{members.length - 5}
                    </div>
                )}
            </div>
        </div>
    );
}
