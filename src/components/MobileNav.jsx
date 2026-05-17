import React from 'react';
import { useNoteStore } from '../store/useNoteStore';
import { 
  BookOpen, 
  CheckSquare, 
  Clock, 
  Settings, 
  Star,
  ClipboardPaste
} from 'lucide-react';

export default function MobileNav() {
  const { filters, setFilter } = useNoteStore();

  const navItems = [
    { id: 'notes', label: 'Notes', icon: BookOpen },
    { id: 'habits', label: 'Board', icon: ClipboardPaste },
    { id: 'favorites', label: 'Fav', icon: Star },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pt-1 bg-gradient-to-t from-slate-100/90 via-slate-100/30 to-transparent dark:from-[#0b0b0d]/90 dark:via-transparent pointer-events-none select-none">
      <nav className="w-full max-w-md mx-auto h-16 rounded-[22px] glass-panel border-2 border-white dark:border-white/10 shadow-lg flex items-center justify-around px-2 pointer-events-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = filters.tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setFilter('tab', item.id);
                if (item.id !== 'notes' && item.id !== 'favorites') {
                  setFilter('folderId', null);
                  setFilter('tag', null);
                }
              }}
              className="flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 active:scale-95 cursor-pointer"
            >
              <div className={`p-2.5 rounded-full transition-all flex items-center justify-center ${
                isActive 
                  ? 'bg-[#db922b] text-white scale-110 shadow-[0_4px_12px_rgba(219,146,43,0.25)]' 
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-650'
              }`}>
                <Icon className="w-4.5 h-4.5 stroke-[2.8]" />
              </div>
              <span className={`text-[8.5px] font-black font-poppins mt-1 ${
                isActive ? 'text-[#db922b]' : 'text-slate-400 dark:text-slate-500'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
