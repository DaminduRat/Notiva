import React, { useState } from 'react';
import { useNoteStore } from '../store/useNoteStore';
import { isDemoMode, auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { 
  FileText, 
  Star, 
  Archive, 
  Trash2, 
  CheckSquare, 
  Clock, 
  Settings, 
  Lock, 
  FolderPlus, 
  Tag, 
  ChevronRight,
  Sparkles,
  LogOut,
  FolderOpen,
  ClipboardPaste,
  X,
  Mic
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const {
    user,
    isGuest,
    folders,
    tags,
    filters,
    setFilter,
    addFolder,
    isSyncing,
    lockSafe,
    setUser,
    setGuestMode
  } = useNoteStore();

  const [newFolderName, setNewFolderName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('📁');
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [showAllFolders, setShowAllFolders] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);

  const getUserGreetingName = () => {
    if (isGuest || !user || !user.email) return 'Guest';
    const emailPart = user.email.split('@')[0];
    const rawName = emailPart.split(/[._-]/)[0];
    return rawName.charAt(0).toUpperCase() + rawName.slice(1);
  };

  const getGreetingMessage = () => {
    const hr = new Date().getHours();
    if (hr >= 5 && hr < 12) return 'Good Morning ☀️';
    if (hr >= 12 && hr < 17) return 'Good Afternoon 🌤️';
    if (hr >= 17 && hr < 21) return 'Good Evening 🌅';
    return 'Good Night 🌙';
  };

  const navigationItems = [
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'habits', label: 'Board', icon: ClipboardPaste },
    { id: 'voice', label: 'Voice Notes', icon: Mic },
    { id: 'archive', label: 'Archive', icon: Archive },
    { id: 'trash', label: 'Trash', icon: Trash2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const colors = ['pink', 'blue', 'purple', 'mint', 'peach'];

  const handleCreateFolder = (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    addFolder(newFolderName.trim(), randomColor);
    setNewFolderName('');
    setShowAddFolder(false);
  };

  const handleLogout = async () => {
    lockSafe();
    if (!isDemoMode && auth) {
      try {
        await signOut(auth);
      } catch (e) {
        console.error("Firebase logout error:", e);
      }
    }
    setUser(null);
    setGuestMode(false);
  };

  // Maps folder color tokens to cute contrast badges
  const getFolderBadgeStyles = (color) => {
    if (color === 'pink') return 'bg-cute-pink text-cute-pink-text border-pink-200';
    if (color === 'blue') return 'bg-cute-blue text-cute-blue-text border-blue-200';
    if (color === 'purple') return 'bg-cute-purple text-cute-purple-text border-purple-200';
    if (color === 'mint') return 'bg-cute-mint text-cute-mint-text border-teal-200';
    return 'bg-cute-peach text-cute-peach-text border-orange-200';
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-[1.5px] z-40 md:hidden"
        />
      )}
      
      <aside className={`h-screen bg-[#f3f3f3]/95 backdrop-blur-3xl border-r border-[#e5e5ea] p-4 select-none relative flex-shrink-0 transition-all duration-300 z-50
        ${isOpen ? 'fixed inset-y-0 left-0 w-64 shadow-2xl flex flex-col' : 'w-64 hidden md:flex flex-col'}
      `}>
        
        {/* Premium Apple Style Personalized Greeting Header */}
        <div className="flex items-center justify-between px-1 py-4 border-b border-[#e5e5ea]/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl overflow-hidden bg-slate-300/80 dark:bg-white/10 border border-slate-400/30 dark:border-white/5 flex items-center justify-center shadow-sm shrink-0">
              <img src="/logo.png" alt="Notiva Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-[#1d1d1f] tracking-wide leading-none">Notiva</h1>
              <div className="text-[9px] font-bold text-slate-500 tracking-wider mt-1.5 flex items-center gap-1.5 flex-wrap">
                <span>{getGreetingMessage()}</span>
                <span className="text-slate-350 select-none">|</span>
                <span className="truncate max-w-[70px]">{getUserGreetingName()}</span>
                {isSyncing ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#db922b] animate-ping shrink-0" title="Syncing secure keys..." />
                ) : (isDemoMode || isGuest) ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#db922b]/60 shrink-0" title="Offline Demo Mode" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34c759] shrink-0" title="Secure E2EE Cloud Synced" />
                )}
              </div>
            </div>
          </div>

          {/* Mobile close button inside the brand header */}
          <button 
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg bg-slate-200/50 hover:bg-slate-200 text-slate-650 cursor-pointer transition-all active:scale-95 flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

      {/* Nav drawers */}
      <nav className="flex-1 overflow-y-auto space-y-1 py-4 text-xs pr-1 scrollbar-thin">
        {navigationItems.map((item) => {
          const isActive = filters.tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setFilter('tab', item.id);
                if (item.id !== 'notes') {
                  setFilter('folderId', null);
                  setFilter('tag', null);
                }
                onClose?.();
              }}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-black/[0.05] text-[#1d1d1f] font-bold shadow-sm'
                  : 'text-[#48484a] hover:bg-black/[0.02] hover:text-[#1d1d1f]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <item.icon className={`w-4 h-4 stroke-[2.2] ${isActive ? 'text-[#db922b]' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </div>
              {isActive && <ChevronRight className="w-3 h-3 text-[#db922b] stroke-[3]" />}
            </button>
          );
        })}

        {/* APPLE STYLE FOLDERS DRAWER */}
        <div className="pt-4 border-t border-[#e5e5ea]/80 mt-4">
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-outfit">Folders</span>
            <button 
              onClick={() => setShowAddFolder(!showAddFolder)}
              className="p-1 rounded-lg hover:bg-black/[0.04] text-[#db922b] transition-all active:scale-95 cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5 stroke-[2.2]" />
            </button>
          </div>

          {showAddFolder && (
            <div className="bg-white/90 dark:bg-[#1a1a1f] border border-slate-200/80 dark:border-white/5 rounded-xl p-3.5 mb-3 shadow-md">
              <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-outfit mb-2">
                Select Folder Emoji
              </div>
              <div className="grid grid-cols-6 gap-1 mb-3">
                {['📁', '📝', '💡', '📅', '💖', '🚀', '⚙️', '🔑', '🎓', '💰', '🎨', '🍿'].map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setSelectedEmoji(emoji)}
                    className={`h-7 rounded-lg text-sm flex items-center justify-center transition-all cursor-pointer border-none
                      ${selectedEmoji === emoji 
                        ? 'bg-[#db922b]/15 text-[#db922b] scale-110 shadow-sm border border-[#db922b]/35' 
                        : 'bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-350 hover:bg-[#db922b]/10 hover:text-[#db922b]'
                      }
                    `}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Folder name input */}
              <input
                type="text"
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder title..."
                className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 focus:outline-none focus:border-[#db922b] text-slate-800 dark:text-white font-medium mb-3"
              />

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (newFolderName.trim()) {
                      const randomColor = colors[Math.floor(Math.random() * colors.length)];
                      addFolder(newFolderName.trim(), randomColor, selectedEmoji);
                      setNewFolderName('');
                      setSelectedEmoji('📁');
                      setShowAddFolder(false);
                    }
                  }}
                  className="flex-1 py-1.5 bg-[#db922b] hover:bg-[#db922b]/90 text-white font-extrabold text-xs rounded-lg shadow-sm cursor-pointer transition-all active:scale-[0.97] border-none"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowAddFolder(false);
                    setNewFolderName('');
                    setSelectedEmoji('📁');
                  }}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 font-bold text-xs rounded-lg cursor-pointer transition-all active:scale-[0.97] border-none"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-0.5">
            {(showAllFolders ? folders : folders.slice(0, 8)).map(folder => {
               const isFolderActive = filters.folderId === folder.id && filters.tab === 'notes';
               return (
                 <button
                   key={folder.id}
                   onClick={() => {
                     setFilter('tab', 'notes');
                     setFilter('folderId', isFolderActive ? null : folder.id);
                     onClose?.();
                   }}
                   className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                     isFolderActive
                       ? 'bg-black/[0.04] border-transparent text-[#1d1d1f] font-bold'
                       : 'border-transparent text-[#48484a] hover:bg-black/[0.02]'
                   }`}
                 >
                   {folder.icon && folder.icon !== 'Folder' ? (
                     <span className="text-sm w-4.5 h-4.5 flex items-center justify-center shrink-0">{folder.icon}</span>
                   ) : (
                     <FolderOpen className={`w-3.5 h-3.5 p-0.5 rounded border shrink-0 ${getFolderBadgeStyles(folder.color)}`} />
                   )}
                   <span className="truncate">{folder.name}</span>
                 </button>
               );
            })}

            {folders.length > 8 && (
              <button
                onClick={() => setShowAllFolders(!showAllFolders)}
                className="w-full flex items-center justify-center gap-1 py-1 mt-1 text-[9px] font-black text-[#db922b] hover:bg-black/[0.02] rounded-lg transition-all cursor-pointer border-none bg-transparent"
              >
                <span>{showAllFolders ? 'Show Less 🔼' : `Show More (${folders.length - 8} more) 🔽`}</span>
              </button>
            )}
          </div>
        </div>

        {/* APPLE STYLE TAG CLOUD DRAWER */}
        <div className="pt-4 border-t border-[#e5e5ea]/80 mt-3">
          <div className="px-1 mb-2">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-outfit">Magic Tags</span>
          </div>
          <div className="flex flex-wrap gap-1 px-1">
            {(showAllTags ? tags : tags.slice(0, 8)).map(tag => {
              const isTagActive = filters.tag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => {
                     setFilter('tab', 'notes');
                     setFilter('tag', isTagActive ? null : tag);
                     onClose?.();
                  }}
                  className={`text-[9px] px-2.5 py-1 rounded-full border transition-all cursor-pointer font-bold ${
                    isTagActive
                      ? 'bg-[#db922b] border-transparent text-white shadow-sm'
                      : 'border-slate-200 text-slate-500 bg-white hover:border-[#db922b] hover:text-[#db922b]'
                  }`}
                >
                  #{tag}
                </button>
              );
            })}

            {tags.length > 8 && (
              <button
                onClick={() => setShowAllTags(!showAllTags)}
                className="w-full flex items-center justify-center gap-1 py-1 mt-2 text-[9px] font-black text-[#db922b] hover:bg-black/[0.02] rounded-lg transition-all cursor-pointer border-none bg-transparent"
              >
                <span>{showAllTags ? 'Show Less 🔼' : `Show More (${tags.length - 8} more) 🔽`}</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Profile Card & Logout */}
      <div className="border-t border-[#e5e5ea]/80 pt-3 mt-auto flex flex-col gap-2">
        <div className="flex items-center justify-between p-2 rounded-xl border border-[#e5e5ea]/60 bg-white/70 shadow-sm relative overflow-hidden group">
          <div className="flex items-center gap-2 relative z-10">
            <img 
              src={user?.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${isGuest ? 'guest' : 'celeste'}`}
              alt="Avatar" 
              className="w-8 h-8 rounded-lg border border-slate-250 bg-white"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold text-slate-800 truncate leading-tight">
                {user?.displayName || (isGuest ? 'iCloud Explorer 🛸' : 'Explorer')}
              </span>
              <span className="text-[8px] text-slate-400 font-medium truncate mt-0.5">
                {user?.email || 'Cloud synced session'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-slate-200 text-[9px] font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all cursor-pointer"
        >
          <LogOut className="w-3 h-3 stroke-[2.2]" />
          <span>Sign Out</span>
        </button>
      </div>

    </aside>
  </>
  );
}
