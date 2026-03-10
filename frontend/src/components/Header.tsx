import { useState } from 'react';
import { FiSearch, FiLogOut, FiUser, FiChevronDown } from 'react-icons/fi';
import { AuthService } from '../services/authService';
import ProfileModal from './ProfileModal';
import ReminderDropdown from './ReminderDropdown';
import MembersPanel from './MembersPanel';
interface HeaderProps {
  username: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  tasks?: any[];
  workspaceMembers?: any[];
}

export default function Header({ username, searchQuery, setSearchQuery, tasks = [], workspaceMembers = [] }: HeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const handleLogout = () => {
    AuthService.logout();
    window.location.reload(); // Force refresh to clear state and go to login
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-20 relative">

      {/* Search Bar */}
      <div className="flex items-center bg-gray-100 rounded-md px-3 py-1.5 w-96 transition-all focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300 border border-transparent">
        <div className="text-gray-400 mr-2">
          <FiSearch size={18} />
        </div>
        <input
          type="text"
          placeholder="Search tasks..."
          className="bg-transparent border-none outline-none text-sm text-gray-700 placeholder-gray-400 w-full"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Members Panel - shows collaborators */}
      {workspaceMembers.length > 1 && (
        <MembersPanel members={workspaceMembers} />
      )}

      {/* Right Side Actions */}
      <div className="flex items-center gap-4">
        <ReminderDropdown tasks={tasks} />

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 pl-4 border-l border-gray-200 cursor-pointer hover:bg-gray-50 py-1 px-2 rounded-md transition-colors"
          >
            <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm">
              {username.charAt(0).toUpperCase()}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-sm font-semibold text-gray-700 leading-none">{username}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Admin</p>
            </div>
            <div className={`text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}>
              <FiChevronDown />
            </div>
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <>
              {/* Click outside closer */}
              <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)}></div>

              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-20 py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-xs text-gray-500">Signed in as</p>
                  <p className="text-sm font-bold text-gray-800 truncate">{username}</p>
                </div>

                {/* ⚡ EXACTLY ONE PROFILE BUTTON */}
                <button
                  onClick={() => {
                    setIsDropdownOpen(false); // Close the dropdown
                    setIsProfileModalOpen(true); // Open the modal
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-blue-600 flex items-center gap-2 transition-colors"
                >
                  <div className="text-gray-500"><FiUser size={14} /></div> Profile
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                >
                  <div className="text-red-500"><FiLogOut size={14} /></div> Log Out
                </button>
              </div>
            </>
          )}
          <ProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            username={username}
          />
        </div>
      </div>
    </header>
  );
}