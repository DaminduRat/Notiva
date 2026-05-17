import React, { useState, useRef, useEffect } from 'react';
import { useNoteStore } from '../store/useNoteStore';
import { 
  Search, 
  Grid, 
  List, 
  Plus, 
  Pin, 
  Star, 
  Folder, 
  Archive, 
  Trash, 
  Trash2, 
  RotateCcw,
  Palette, 
  Check, 
  X, 
  SearchX, 
  Clock, 
  Mic, 
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function KeepGridView() {
  const {
    notes,
    decryptedNotes,
    folders,
    filters,
    setFilter,
    searchQuery,
    setSearchQuery,
    addNote,
    updateNote,
    deleteNote,
    activeNoteId,
    selectedNoteIds,
    toggleSelectNote,
    clearSelection,
    bulkDelete,
    bulkArchive
  } = useNoteStore();

  // --- Inline Note Creator State ---
  const [isCreatorExpanded, setIsCreatorExpanded] = useState(false);
  const [creatorTitle, setCreatorTitle] = useState('');
  const [creatorContent, setCreatorContent] = useState('');
  const [creatorColor, setCreatorColor] = useState('default');
  const [creatorFolderId, setCreatorFolderId] = useState(filters.folderId || '');
  const [showCreatorFolderDropdown, setShowCreatorFolderDropdown] = useState(false);
  const creatorRef = useRef(null);

  // --- Card Hover Color Picker State ---
  const [activeColorPickerNoteId, setActiveColorPickerNoteId] = useState(null);

  // --- Click Outside to Close Creator logic ---
  useEffect(() => {
    function handleClickOutside(event) {
      if (creatorRef.current && !creatorRef.current.contains(event.target)) {
        handleCommitNewNote();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [creatorTitle, creatorContent, creatorColor, creatorFolderId]);

  const handleCommitNewNote = async () => {
    if (creatorTitle.trim() || creatorContent.trim()) {
      try {
        await addNote(
          creatorTitle.trim() || "Untitled Note",
          creatorContent.trim(),
          creatorFolderId || null,
          filters.tag ? [filters.tag] : [],
          creatorColor
        );
      } catch (err) {
        alert("Please unlock your safe room first!");
      }
    }
    // Reset Creator
    setCreatorTitle('');
    setCreatorContent('');
    setCreatorColor('default');
    setCreatorFolderId(filters.folderId || '');
    setIsCreatorExpanded(false);
  };

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

  // Separate pinned and unpinned notes for Keep-style sections
  const pinnedNotes = processedNotes.filter(n => n.isPinned && !n.isTrash && !n.isArchived);
  const otherNotes = processedNotes.filter(n => !n.isPinned || n.isTrash || n.isArchived);

  // Background colors config
  const colorMap = {
    default: 'bg-white border-slate-200 text-slate-800',
    pink: 'bg-[#fff0f2] border-[#ffd6dc] text-[#a11b3c]',
    blue: 'bg-[#f0f4ff] border-[#d6e4ff] text-[#1b3ca1]',
    purple: 'bg-[#f8f0ff] border-[#edd6ff] text-[#5e1ba1]',
    mint: 'bg-[#f0faf6] border-[#d6f5e8] text-[#1ba161]',
    peach: 'bg-[#fff8f0] border-[#ffe4cc] text-[#a1611b]'
  };

  const getFolderLabel = (folderId) => {
    const f = folders.find(folder => folder.id === folderId);
    return f ? f.name : '';
  };

  const handleCardClick = (noteId) => {
    useNoteStore.setState({ activeNoteId: noteId });
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#f5f5f7]/50 select-none overflow-hidden">
      
      {/* 1. Header Toolbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between flex-shrink-0 z-10">
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          <h2 className="text-lg font-extrabold text-[#1d1d1f] font-outfit uppercase tracking-wider shrink-0">
            {filters.tab === 'notes' && (filters.folderId ? getFolderLabel(filters.folderId) : "All Notes")}
            {filters.tab === 'favorites' && "Favorites"}
            {filters.tab === 'voice' && "Voice Notes"}
            {filters.tab === 'archive' && "Archive"}
            {filters.tab === 'trash' && "Trash"}
          </h2>

          <div className="relative w-full">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search className="w-4 h-4 stroke-[2]" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search E2EE safe keys..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-100 border-none focus:bg-slate-100 focus:ring-1 focus:ring-[#db922b] focus:outline-none text-xs text-[#1d1d1f] placeholder-slate-400 font-medium"
            />
          </div>
        </div>

        {/* View Switches & Mode actions */}
        <div className="flex items-center gap-3 ml-4 shrink-0">
          <span className="text-[10px] text-slate-500 font-bold">{processedNotes.length} notes</span>
          
          <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => {
                setFilter('viewMode', 'list');
                useNoteStore.setState({ activeNoteId: null });
              }}
              className={`p-1 rounded transition-all cursor-pointer ${
                filters.viewMode === 'list' 
                  ? 'bg-white text-[#db922b] shadow-sm border border-slate-200/50' 
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
              className={`p-1 rounded transition-all cursor-pointer ${
                filters.viewMode === 'grid' 
                  ? 'bg-white text-[#db922b] shadow-sm border border-slate-200/50' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Grid View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Scrollable Cards Dashboard Workspace */}
      <div className="flex-1 overflow-y-auto px-6 py-6 pb-24">
        


        {processedNotes.length === 0 ? (
          /* Empty notes state */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-4 shadow-sm">
              <SearchX className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-700">No notes in card deck</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto font-medium">
              Start adding your first client-side encrypted notebooks to populate this Google Keep space grid.
            </p>
          </div>
        ) : (
          <div className="space-y-8 select-none">
            
            {/* PINNED SECTION */}
            {pinnedNotes.length > 0 && (
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block pl-1">Pinned</span>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
                  {pinnedNotes.map(note => (
                    <div key={note.id} className="w-full">
                      <KeepNoteCard
                        note={note}
                        decrypted={decryptedNotes[note.id] || { title: '🔐 Encrypted', content: '' }}
                        colorMap={colorMap}
                        onCardClick={handleCardClick}
                        onUpdate={updateNote}
                        onDelete={deleteNote}
                        getFolderLabel={getFolderLabel}
                        folders={folders}
                        activeColorPickerNoteId={activeColorPickerNoteId}
                        setActiveColorPickerNoteId={setActiveColorPickerNoteId}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* OTHERS SECTION */}
            {otherNotes.length > 0 && (
              <div className="space-y-3">
                {pinnedNotes.length > 0 && (
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block pl-1 pt-2">Others</span>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
                  {otherNotes.map(note => (
                    <div key={note.id} className="w-full">
                      <KeepNoteCard
                        note={note}
                        decrypted={decryptedNotes[note.id] || { title: '🔐 Encrypted', content: '' }}
                        colorMap={colorMap}
                        onCardClick={handleCardClick}
                        onUpdate={updateNote}
                        onDelete={deleteNote}
                        getFolderLabel={getFolderLabel}
                        folders={folders}
                        activeColorPickerNoteId={activeColorPickerNoteId}
                        setActiveColorPickerNoteId={setActiveColorPickerNoteId}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>

    </div>
  );
}

// --- KEEP NOTE CARD SUBCOMPONENT ---
function KeepNoteCard({
  note,
  decrypted,
  colorMap,
  onCardClick,
  onUpdate,
  onDelete,
  getFolderLabel,
  folders,
  activeColorPickerNoteId,
  setActiveColorPickerNoteId
}) {
  const colorClass = colorMap[note.color] || colorMap.default;

  const handleTogglePin = (e) => {
    e.stopPropagation();
    onUpdate(note.id, { isPinned: !note.isPinned });
  };

  const handleToggleStar = (e) => {
    e.stopPropagation();
    onUpdate(note.id, { isFavorite: !note.isFavorite });
  };

  const handleArchive = (e) => {
    e.stopPropagation();
    onUpdate(note.id, { isArchived: !note.isArchived });
  };

  const handleTrash = (e) => {
    e.stopPropagation();
    if (!note.isTrash) {
      onUpdate(note.id, { isTrash: true });
    } else {
      if (confirm("Permanently delete this E2EE note?")) {
        onDelete(note.id);
      }
    }
  };

  const handleRestore = (e) => {
    e.stopPropagation();
    onUpdate(note.id, { isTrash: false, isArchived: false });
  };

  return (
    <div
      onClick={() => onCardClick(note.id)}
      className={`group relative flex flex-col justify-between p-4 rounded-xl border shadow-sm hover:shadow-md hover:scale-[1.015] transition-all duration-150 cursor-pointer h-[210px] w-full ${colorClass}`}
    >
      <div>
        {/* Top Header inside Card */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h4 className="text-xs font-extrabold truncate max-w-[80%] leading-tight">
            {decrypted.title || "Untitled Note"}
          </h4>
          
          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleTogglePin}
              className={`p-0.5 rounded hover:bg-black/5 ${note.isPinned ? 'text-[#db922b]' : 'text-slate-400 hover:text-slate-650'}`}
              title={note.isPinned ? "Unpin note" : "Pin note"}
            >
              <Pin className="w-3.5 h-3.5 fill-current stroke-[2]" />
            </button>
          </div>
        </div>

        {/* Note Body Text Snippet */}
        <p className="text-[10.5px] leading-relaxed font-medium line-clamp-3 opacity-90 break-words">
          {decrypted.content && decrypted.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() 
            ? decrypted.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() 
            : (note.voiceUrl ? "🎙️ Voice Memo" : "No content recorded...")}
        </p>

        {/* Miniature Live Table Graphic Mock */}
        {decrypted.content && decrypted.content.includes('<table') && (
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
      </div>

      {/* Footer Area with tags, active badge & quick actions */}
      <div className="mt-3 flex flex-col gap-2">
        
        {/* Badge details */}
        <div className="flex flex-wrap items-center justify-between gap-1 select-none">
          <div className="flex gap-1 overflow-hidden">
            {note.folderId && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-white/60 border border-black/10">
                {getFolderLabel(note.folderId)}
              </span>
            )}
            {note.tags.slice(0, 1).map(tag => (
              <span key={tag} className="text-[8px] font-medium opacity-60">
                #{tag}
              </span>
            ))}
          </div>

          {note.voiceUrl && (
            <span className="text-[7.5px] font-extrabold uppercase tracking-wide text-[#db922b]">Voice</span>
          )}
        </div>

        {/* Hover quick action toolbars */}
        <div className="flex items-center justify-between border-t border-black/5 pt-1.5 opacity-0 group-hover:opacity-100 transition-opacity relative z-20">
          <div className="flex items-center gap-1.5">
            {/* Trash Actions */}
            {note.isTrash ? (
              <>
                <button
                  onClick={handleRestore}
                  className="p-1 rounded hover:bg-black/5 text-slate-500 hover:text-slate-800"
                  title="Restore note"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
                <button
                  onClick={handleTrash}
                  className="p-1 rounded hover:bg-black/5 text-rose-600 hover:text-rose-800 font-bold"
                  title="Delete permanently"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </>
            ) : (
              <>
                {/* Favorite Toggle */}
                <button
                  onClick={handleToggleStar}
                  className={`p-1 rounded hover:bg-black/5 ${note.isFavorite ? 'text-[#ff2d55]' : 'text-slate-400 hover:text-slate-700'}`}
                  title="Favorite note"
                >
                  <Star className={`w-3 h-3 ${note.isFavorite ? 'fill-current' : ''}`} />
                </button>

                {/* Archive toggle */}
                <button
                  onClick={handleArchive}
                  className={`p-1 rounded hover:bg-black/5 ${note.isArchived ? 'text-slate-800' : 'text-slate-400 hover:text-slate-700'}`}
                  title={note.isArchived ? "Unarchive" : "Archive"}
                >
                  <Archive className="w-3 h-3" />
                </button>

                {/* Color Changer stamps */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveColorPickerNoteId(activeColorPickerNoteId === note.id ? null : note.id);
                    }}
                    className="p-1 rounded hover:bg-black/5 text-slate-400 hover:text-slate-700"
                    title="Change note color"
                  >
                    <Palette className="w-3 h-3" />
                  </button>

                  {activeColorPickerNoteId === note.id && (
                    <div 
                      className="absolute bottom-6 left-0 bg-white border border-slate-200 rounded-lg p-1.5 shadow-lg flex gap-1 z-30 flex-row"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {['default', 'pink', 'blue', 'purple', 'mint', 'peach'].map(col => (
                        <button
                          key={col}
                          onClick={() => {
                            onUpdate(note.id, { color: col });
                            setActiveColorPickerNoteId(null);
                          }}
                          className={`w-3.5 h-3.5 rounded-full border transition-all hover:scale-115 ${
                            col === 'default' ? 'bg-white border-slate-300' :
                            col === 'pink' ? 'bg-[#fff0f2] border-[#ffd6dc]' :
                            col === 'blue' ? 'bg-[#f0f4ff] border-[#d6e4ff]' :
                            col === 'purple' ? 'bg-[#f8f0ff] border-[#edd6ff]' :
                            col === 'mint' ? 'bg-[#f0faf6] border-[#d6f5e8]' :
                            'bg-[#fff8f0] border-[#ffe4cc]'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Delete (trash) trigger */}
                <button
                  onClick={handleTrash}
                  className="p-1 rounded hover:bg-black/5 text-slate-400 hover:text-rose-600"
                  title="Move to Trash"
                >
                  <Trash className="w-3 h-3" />
                </button>
              </>
            )}
          </div>

          <span className="text-[8px] opacity-40 font-bold">
            {new Date(note.updatedAt).toLocaleDateString([], { month: 'numeric', day: 'numeric' })}
          </span>
        </div>
      </div>
    </div>
  );
}
