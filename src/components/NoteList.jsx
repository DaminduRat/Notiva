import React, { useState } from 'react';
import { useNoteStore } from '../store/useNoteStore';
import { 
  Search, 
  Grid, 
  List, 
  Plus, 
  Pin, 
  Star, 
  Folder, 
  Clock, 
  Sparkles,
  SearchX,
  PlusCircle,
  Check,
  ArrowUpDown,
  Menu,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NoteList() {
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const {
    notes,
    decryptedNotes,
    folders,
    filters,
    setFilter,
    searchQuery,
    setSearchQuery,
    addSearchHistory,
    addNote,
    activeNoteId,
    selectedNoteIds,
    toggleSelectNote,
    clearSelection,
    bulkDelete,
    bulkArchive,
    bulkTag
  } = useNoteStore();

  // Compile and filter notes
  const processedNotes = notes
    .filter(note => {
      if (filters.tab === 'trash') return note.isTrash;
      if (note.isTrash) return false;
      
      if (filters.tab === 'favorites') return note.isFavorite && !note.isArchived;
      if (filters.tab === 'archive') return note.isArchived;
      if (filters.tab === 'voice') {
        const dec = decryptedNotes[note.id] || { content: '' };
        const hasAudio = dec.content && dec.content.includes('<audio');
        return (note.voiceUrl || hasAudio) && !note.isArchived;
      }
      
      if (note.isArchived) return false;

      if (filters.folderId && note.folderId !== filters.folderId) return false;
      if (filters.tag && !note.tags.includes(filters.tag)) return false;

      return true;
    })
    .filter(note => {
      if (!searchQuery.trim()) return true;
      const dec = decryptedNotes[note.id] || { title: '', content: '' };
      const q = searchQuery.toLowerCase();
      const titleMatch = dec.title.toLowerCase().includes(q);
      const contentMatch = dec.content.toLowerCase().includes(q);
      const tagMatch = (note.tags || []).some(t => t.toLowerCase().includes(q));
      
      return titleMatch || contentMatch || tagMatch;
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      if (filters.sortBy === 'title') {
        const titleA = decryptedNotes[a.id]?.title || '';
        const titleB = decryptedNotes[b.id]?.title || '';
        return titleA.localeCompare(titleB);
      }
      
      if (filters.sortBy === 'createdAt') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }

      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

  const getFolderBadgeStyles = (folderId) => {
    const f = folders.find(folder => folder.id === folderId);
    if (!f) return 'bg-slate-100 text-slate-500 border-slate-200';
    if (f.color === 'pink') return 'bg-cute-pink text-cute-pink-text border-pink-200';
    if (f.color === 'blue') return 'bg-cute-blue text-cute-blue-text border-blue-200';
    if (f.color === 'purple') return 'bg-cute-purple text-cute-purple-text border-purple-200';
    if (f.color === 'mint') return 'bg-cute-mint text-cute-mint-text border-teal-200';
    return 'bg-cute-peach text-cute-peach-text border-orange-200';
  };

  const getFolderLabel = (folderId) => {
    const f = folders.find(folder => folder.id === folderId);
    return f ? f.name : '';
  };

  const getNoteCardColorClass = (color) => {
    if (color === 'pink') return 'bg-[#fff9fa] border-pink-100 text-[#a11b3c]';
    if (color === 'blue') return 'bg-[#f4f8ff] border-blue-100 text-[#1b3ca1]';
    if (color === 'purple') return 'bg-[#faf7ff] border-purple-100 text-[#5e1ba1]';
    if (color === 'mint') return 'bg-[#f5fbf7] border-teal-100 text-[#1ba161]';
    if (color === 'peach') return 'bg-[#fffbf4] border-orange-100 text-[#a1611b]';
    return 'bg-[#fbfaf7] border-amber-200/50 text-slate-800'; // Default warm Apple tint
  };

  const handleCheckboxClick = (e, noteId) => {
    e.stopPropagation();
    toggleSelectNote(noteId);
  };

  return (
    <div className="flex flex-col h-screen bg-white border-r border-[#e5e5ea] select-none flex-shrink-0 w-full md:w-80">
      
      {/* Sleek macOS Search & Title Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-8 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 shadow-sm shrink-0 transition-all duration-300">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.toggleMobileSidebar?.()}
            className="md:hidden p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-650 cursor-pointer transition-all active:scale-95 flex items-center justify-center border-none shrink-0"
          >
            <Menu className="w-4 h-4 stroke-[2.2]" />
          </button>
          <div>
            <h2 className="text-lg font-black font-outfit text-slate-800 flex items-center gap-2">
              <FileText className="w-5.5 h-5.5 text-[#db922b] animate-float stroke-[2.2]" />
              <span>
                {filters.tab === 'notes' && (filters.folderId ? getFolderLabel(filters.folderId) : "Notes")}
                {filters.tab === 'favorites' && "Favorites"}
                {filters.tab === 'voice' && "Voice Notes"}
                {filters.tab === 'archive' && "Archive"}
                {filters.tab === 'trash' && "Trash"}
              </span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Search bar nestled cleanly in header */}
          <div className="relative flex-1 md:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 stroke-[2.2]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.trim().length > 3) {
                  addSearchHistory(e.target.value);
                }
              }}
              placeholder="Search notes..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#db922b] focus:bg-white transition-all"
            />
          </div>

          {/* Grid/List View switcher */}
          <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
            <button
              onClick={() => {
                setFilter('viewMode', 'list');
                useNoteStore.setState({ activeNoteId: null });
              }}
              className={`p-1 rounded transition-all cursor-pointer border-none ${
                filters.viewMode === 'list' 
                  ? 'bg-white text-[#db922b] shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setFilter('viewMode', 'grid');
                useNoteStore.setState({ activeNoteId: null });
              }}
              className={`p-1 rounded transition-all cursor-pointer border-none ${
                filters.viewMode === 'grid' 
                  ? 'bg-white text-[#db922b] shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Grid View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Stats & Sorting bar */}
      <div className="flex items-center justify-between px-4 py-2 text-[10px] text-slate-500 font-bold border-b border-[#e5e5ea]/40 bg-slate-50/50 select-none">
        <span>{processedNotes.length} notes</span>
        
        <div className="relative flex items-center gap-1">
          <span>Sort:</span>
          <button
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            className="flex items-center gap-0.5 text-[#db922b] hover:text-[#db922b]/80 cursor-pointer font-bold transition-all active:scale-95"
          >
            <span>
              {filters.sortBy === 'updatedAt' && 'Edited'}
              {filters.sortBy === 'createdAt' && 'Created'}
              {filters.sortBy === 'title' && 'Title'}
            </span>
          </button>

          <AnimatePresence>
            {showSortDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowSortDropdown(false)} 
                />
                
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 5 }}
                  className="absolute right-0 top-6 w-32 bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl shadow-xl p-1 z-50 select-none text-[10px]"
                >
                  {[
                    { value: 'updatedAt', label: 'Edited' },
                    { value: 'createdAt', label: 'Created' },
                    { value: 'title', label: 'Title' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setFilter('sortBy', opt.value);
                        setShowSortDropdown(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl font-bold transition-all flex items-center justify-between cursor-pointer ${
                        filters.sortBy === opt.value
                          ? 'bg-[#fff7eb] text-[#db922b]'
                          : 'text-slate-650 hover:bg-slate-50'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {filters.sortBy === opt.value && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Note items scroll area */}
      <div className={`flex-1 overflow-y-auto ${
        filters.viewMode === 'grid' 
          ? 'bg-slate-50/40' 
          : 'divide-y divide-[#e5e5ea]/60'
      }`}>
        <AnimatePresence mode="popLayout">
          {processedNotes.length === 0 ? (
            <motion.div
              key="empty-notes"
              className="flex flex-col items-center justify-center py-20 px-4 text-center select-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <SearchX className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-xs font-bold text-slate-700">No notes found</h3>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed max-w-[200px] mx-auto font-medium">
                Try sorting by other criteria or clear your current folders/tags selection.
              </p>
            </motion.div>
          ) : (
            <div className={filters.viewMode === 'grid' ? "grid grid-cols-2 gap-2.5 p-3 animate-fade-in" : "flex flex-col"}>
              {processedNotes.map(note => {
                const dec = decryptedNotes[note.id] || { title: '🔐 Encrypted', content: '' };
                const isSelected = activeNoteId === note.id;
                const isSelectedForBulk = selectedNoteIds.includes(note.id);

                return (
                  <motion.div
                    key={note.id}
                    layoutId={`card-${note.id}`}
                    onClick={() => useNoteStore.setState({ activeNoteId: note.id, filters: { ...filters, tab: 'notes' } })}
                    className={filters.viewMode === 'grid'
                      ? `p-3.5 rounded-xl cursor-pointer relative group flex flex-col justify-between gap-1.5 transition-all duration-200 border min-h-[110px] ${
                          isSelected 
                            ? 'bg-[#fdf8ee] border-[#db922b] shadow-sm scale-[1.01] ring-1 ring-[#db922b]/10' 
                            : `${getNoteCardColorClass(note.color)} hover:brightness-[0.97] hover:scale-[1.01] shadow-[0_1px_2px_rgba(0,0,0,0.02)]`
                        }`
                      : `mx-3 my-2 p-3.5 rounded-xl cursor-pointer relative group flex flex-col gap-1.5 transition-all duration-200 border ${
                          isSelected 
                            ? 'bg-[#fdf8ee] border-[#db922b] shadow-sm scale-[1.01] ring-1 ring-[#db922b]/10' 
                            : `${getNoteCardColorClass(note.color)} hover:brightness-[0.97] hover:scale-[1.01] shadow-[0_1px_2px_rgba(0,0,0,0.02)]`
                        }`
                    }
                  >
                    {/* Circular Checkbox node for multi-select */}
                    <div 
                      onClick={(e) => handleCheckboxClick(e, note.id)}
                      className={`absolute top-3.5 right-3.5 w-4 h-4 rounded-full border transition-all flex items-center justify-center z-10 ${
                        isSelectedForBulk 
                          ? 'bg-[#db922b] border-[#db922b] text-white scale-110 shadow-sm' 
                          : 'bg-white/80 border-slate-300 opacity-0 group-hover:opacity-100 hover:border-[#db922b]'
                      }`}
                    >
                      {isSelectedForBulk && (
                        <span className="text-[8px] font-bold leading-none">✓</span>
                      )}
                    </div>

                    {/* Header Row: Title & Icons */}
                    <div className="flex items-center justify-between pr-4">
                      <h4 className={`text-xs font-bold truncate leading-tight ${isSelected ? 'text-[#1d1d1f]' : 'text-slate-800'}`}>
                        {dec.title || "New Spark"}
                      </h4>
                      
                      <div className="flex items-center gap-1 shrink-0">
                        {note.isPinned && (
                          <Pin className="w-2.5 h-2.5 text-[#db922b] fill-[#db922b] stroke-[2]" />
                        )}
                        {note.isFavorite && (
                          <Star className="w-2.5 h-2.5 text-[#ff2d55] fill-[#ff2d55] stroke-[2]" />
                        )}
                      </div>
                    </div>

                    {/* Content Preview Row (Apple Style: Date + Content) */}
                    <div className="flex items-baseline gap-1.5 text-[10px] leading-tight">
                      <span className="text-slate-500 font-bold shrink-0">
                        {new Date(note.updatedAt).toLocaleDateString([], { month: 'numeric', day: 'numeric', year: '2-digit' })}
                      </span>
                      <span className="text-slate-400 font-medium truncate">
                        {dec.content && dec.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() 
                          ? dec.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() 
                          : (note.voiceUrl ? "🎙️ Voice Memo" : "No content recorded...")}
                      </span>
                    </div>

                    {/* Miniature Live Table Graphic Mock */}
                    {dec.content && dec.content.includes('<table') && (
                      <div className="mt-1.5 p-1 rounded-lg border border-orange-100 bg-white/85 shadow-sm flex flex-col gap-0.5 w-full max-w-full overflow-hidden select-none">
                        {/* Miniature Mock Table Header */}
                        <div className="flex gap-1 border-b border-orange-100/50 pb-0.5 bg-[#fff7eb]/60 rounded-t px-1">
                          <div className="h-1 bg-[#db922b]/30 rounded w-1/3" />
                          <div className="h-1 bg-[#db922b]/30 rounded w-1/3" />
                          <div className="h-1 bg-[#db922b]/30 rounded w-1/3" />
                        </div>
                        {/* Miniature Mock Table Rows */}
                        <div className="flex gap-1 py-0.5 px-1">
                          <div className="h-0.5 bg-slate-200/60 rounded w-1/3" />
                          <div className="h-0.5 bg-slate-200/60 rounded w-1/3" />
                          <div className="h-0.5 bg-slate-200/60 rounded w-1/3" />
                        </div>
                        <div className="flex gap-1 py-0.5 px-1">
                          <div className="h-0.5 bg-slate-200/60 rounded w-1/3" />
                          <div className="h-0.5 bg-slate-200/60 rounded w-1/3" />
                          <div className="h-0.5 bg-slate-200/60 rounded w-1/3" />
                        </div>
                      </div>
                    )}

                    {/* Folder & tags indicators */}
                    <div className="flex items-center justify-between mt-1 select-none">
                      <div className="flex gap-1 overflow-hidden">
                        {note.folderId && (
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${getFolderBadgeStyles(note.folderId)}`}>
                            {getFolderLabel(note.folderId)}
                          </span>
                        )}
                        {note.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="text-[8px] font-medium text-slate-400">
                            #{tag}
                          </span>
                        ))}
                      </div>
                      {note.voiceUrl && (
                        <span className="text-[7.5px] text-[#db922b] font-extrabold uppercase tracking-wide">Voice Note</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Bulk operations drawer (Frosted Apple Style) */}
      <AnimatePresence>
        {selectedNoteIds.length > 0 && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="absolute bottom-6 left-3 right-3 z-30 p-3 bg-white/90 backdrop-blur-md rounded-xl border border-[#e5e5ea] shadow-lg select-none"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col min-w-0">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Active Selection</span>
                <span className="text-xs font-bold text-[#1d1d1f] mt-0.5 truncate">{selectedNoteIds.length} notes</span>
              </div>
              
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => bulkArchive()}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer"
                  title="Archive selected"
                >
                  Archive
                </button>
                <button
                  onClick={() => {
                    if (confirm("Send selected notes to trash?")) {
                      bulkDelete();
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-[#ffeef0] hover:bg-[#ffd6dc] text-[#ff2d55] text-[10px] font-bold cursor-pointer"
                  title="Delete selected"
                >
                  Trash
                </button>
                <button
                  onClick={() => {
                    const tag = prompt("Enter tag name to apply to selection:");
                    if (tag && tag.trim()) {
                      bulkTag(tag.trim().toLowerCase());
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-[#fff7eb] hover:bg-[#ffe2c4] text-[#db922b] text-[10px] font-bold cursor-pointer"
                  title="Tag selected"
                >
                  Tag
                </button>
                <button
                  onClick={() => clearSelection()}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 text-[10px] font-bold cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
    </div>
  );
}
