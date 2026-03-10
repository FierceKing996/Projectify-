import { useState, useEffect } from 'react';
import { FiX, FiSend, FiMail, FiClock, FiCheck, FiUserPlus } from 'react-icons/fi';
// @ts-ignore
import { CollaborationService } from '../services/collaborationService.js';

interface InviteModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    workspaceTitle: string;
}

export default function InviteModal({ isOpen, onClose, workspaceId, workspaceTitle }: InviteModalProps) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [pendingInvites, setPendingInvites] = useState<any[]>([]);

    // Fetch pending invitations when modal opens
    useEffect(() => {
        if (isOpen && workspaceId) {
            CollaborationService.getPendingInvitations(workspaceId)
                .then((invites: any[]) => setPendingInvites(invites))
                .catch((err: Error) => console.warn('Could not load invitations:', err.message));
        }
    }, [isOpen, workspaceId]);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setLoading(true);
        setMessage(null);

        try {
            await CollaborationService.inviteUser(workspaceId, email.trim());
            setMessage({ type: 'success', text: `Invitation sent to ${email}!` });
            setEmail('');
            // Refresh pending invitations
            const invites = await CollaborationService.getPendingInvitations(workspaceId);
            setPendingInvites(invites);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
                {/* Modal */}
                <div
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                                <span style={{ color: 'white' }}><FiUserPlus size={18} /></span>
                            </div>
                            <div>
                                <h2 className="text-white font-bold text-lg">Invite Collaborator</h2>
                                <p className="text-white/70 text-xs">{workspaceTitle}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-white/70 hover:text-white transition-colors p-1">
                            <FiX size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6">
                        {/* Message */}
                        {message && (
                            <div className={`mb-4 p-3 rounded-xl text-sm font-medium flex items-center gap-2 ${message.type === 'success'
                                ? 'bg-green-50 text-green-700 border border-green-100'
                                : 'bg-red-50 text-red-600 border border-red-100'
                                }`}>
                                {message.type === 'success' ? <FiCheck size={16} /> : <FiX size={16} />}
                                {message.text}
                            </div>
                        )}

                        {/* Invite Form */}
                        <form onSubmit={handleInvite} className="flex gap-2">
                            <div className="flex-1 relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><FiMail size={16} /></span>
                                <input
                                    type="email"
                                    placeholder="colleague@gmail.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 flex-shrink-0"
                            >
                                <FiSend size={14} />
                                {loading ? 'Sending...' : 'Send'}
                            </button>
                        </form>

                        {/* Pending Invitations */}
                        {pendingInvites.length > 0 && (
                            <div className="mt-5">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Pending Invitations</h3>
                                <div className="space-y-2">
                                    {pendingInvites.map((inv: any) => (
                                        <div key={inv._id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <span className="text-gray-400"><FiMail size={14} /></span>
                                                <span className="truncate">{inv.inviteeEmail}</span>
                                            </div>
                                            <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <FiClock size={10} /> Pending
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
