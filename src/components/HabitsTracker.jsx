import React, { useState } from 'react';
import { useNoteStore } from '../store/useNoteStore';
import { 
  Trash2, 
  Copy, 
  Check, 
  FileText, 
  Search, 
  Sparkles,
  ClipboardPaste,
  Grid,
  List,
  ArrowUpDown,
  Link2,
  Mail,
  Phone,
  Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Regex utilities for automatic categorization
const detectCategories = (text) => {
  const categories = [];
  const urlRegex = /https?:\/\/[^\s$.?#].[^\s]*/gi;
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const phoneRegex = /\+?\d[\d-\s()]{6,14}\d/g;

  if (urlRegex.test(text)) categories.push('link');
  if (emailRegex.test(text)) categories.push('email');
  
  // Basic guard to ensure phone numbers are detected accurately
  const phoneMatches = text.match(phoneRegex);
  if (phoneMatches) {
    const hasValidPhone = phoneMatches.some(m => {
      const cleanDigits = m.replace(/[-()\s+]/g, '');
      return cleanDigits.length >= 7 && cleanDigits.length <= 15;
    });
    if (hasValidPhone) categories.push('phone');
  }

  if (categories.length === 0) {
    categories.push('text');
  }
  return categories;
};

export default function HabitsTracker() {
  const { 
    pastedTexts, 
    addPastedText, 
    deletePastedText, 
    clearAllPastedTexts,
    addNote,
    filters 
  } = useNoteStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [morphedId, setMorphedId] = useState(null);
  const [newManualText, setNewManualText] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Instant clipboard sync toast notifications states
  const [showClipboardToast, setShowClipboardToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setShowClipboardToast(true);
    setTimeout(() => setShowClipboardToast(false), 3000);
  };

  const handleClipboardInstantPaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          // Prevent exact duplicate inserts
          if (pastedTexts.length > 0 && pastedTexts[0].text === text.trim()) {
            triggerToast("Already synced to Board! 📋");
            return;
          }
          await addPastedText(text.trim());
          triggerToast("Pasted & Synced instantly! 🚀");
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav');
            audio.volume = 0.35;
            audio.play();
          } catch (e) {}
          return;
        }
      }
      // Trigger prompt fallback if security restrictions deny direct reading
      const manualText = prompt("Clipboard access is restricted. Please paste your text here to sync instantly:");
      if (manualText && manualText.trim()) {
        await addPastedText(manualText.trim());
        triggerToast("Saved & Synced instantly! 🚀");
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav');
          audio.volume = 0.35;
          audio.play();
        } catch (e) {}
      }
    } catch (err) {
      console.warn("Direct clipboard read blocked:", err);
      const manualText = prompt("Please paste your copied text below to sync across all devices:");
      if (manualText && manualText.trim()) {
        await addPastedText(manualText.trim());
        triggerToast("Saved & Synced instantly! 🚀");
      }
    }
  };

  // Filter & Layout local states
  const [activeCategory, setActiveCategory] = useState('all'); // 'all', 'link', 'email', 'phone', 'text'
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'list'
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'length'
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Copy text back to system clipboard
  const handleCopyBack = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);

      // Cute pop audio cue
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-84.wav');
        audio.volume = 0.2;
        audio.play();
      } catch (e) {}
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Convert pasted text into a new secure note
  const handleMorphToNote = async (text, id) => {
    try {
      const cleanText = text.trim();
      const firstLine = cleanText.split('\n')[0];
      const title = firstLine.slice(0, 30).trim() + (cleanText.length > 30 ? "..." : "");
      
      const folderId = filters.folderId || null;
      await addNote(
        title || "📋 Clipboard Spark", 
        `Pasted from Clipboard:\n\n${cleanText}`, 
        folderId, 
        ['pasted']
      );

      setMorphedId(id);
      setTimeout(() => setMorphedId(null), 2000);

      // Play soft success sound
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav');
        audio.volume = 0.35;
        audio.play();
      } catch (e) {}
    } catch (e) {
      console.error("Failed to create note:", e);
    }
  };

  const handleManualAdd = (e) => {
    e.preventDefault();
    if (!newManualText.trim()) return;
    addPastedText(newManualText.trim());
    setNewManualText('');
    setShowAddForm(false);
  };

  // Count matches in category dynamically
  const getCategoryCount = (cat) => {
    if (!pastedTexts) return 0;
    if (cat === 'all') return pastedTexts.length;
    return pastedTexts.filter(p => detectCategories(p.text).includes(cat)).length;
  };

  // 1. Filter based on category & search query
  let filteredPastes = (pastedTexts || []).filter(p => {
    const matchesSearch = p.text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || detectCategories(p.text).includes(activeCategory);
    return matchesSearch && matchesCategory;
  });

  // 2. Sort results
  filteredPastes.sort((a, b) => {
    if (sortBy === 'newest') return b.pastedAt - a.pastedAt;
    if (sortBy === 'oldest') return a.pastedAt - b.pastedAt;
    if (sortBy === 'length') return b.text.length - a.text.length;
    return 0;
  });

  const renderCategoryBadges = (categories) => {
    return (
      <div className="flex gap-1 select-none">
        {categories.map(cat => {
          if (cat === 'link') return <span key={cat} className="px-1.5 py-0.5 rounded-md bg-[#e0f2fe] text-[#0369a1] text-[8px] font-black tracking-wider uppercase border border-[#bae6fd]/30">Link 🔗</span>;
          if (cat === 'email') return <span key={cat} className="px-1.5 py-0.5 rounded-md bg-[#dcfce7] text-[#15803d] text-[8px] font-black tracking-wider uppercase border border-[#bbf7d0]/30">Email 📧</span>;
          if (cat === 'phone') return <span key={cat} className="px-1.5 py-0.5 rounded-md bg-[#fef3c7] text-[#b45309] text-[8px] font-black tracking-wider uppercase border border-[#fde68a]/30">Phone 📞</span>;
          return <span key={cat} className="px-1.5 py-0.5 rounded-md bg-slate-105 text-slate-500 text-[8px] font-black tracking-wider uppercase border border-slate-200/50">Text 📝</span>;
        })}
      </div>
    );
  };

  const renderEntityShortcuts = (text) => {
    const urlRegex = /https?:\/\/[^\s$.?#].[^\s]*/gi;
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex = /\+?\d[\d-\s()]{6,14}\d/g;

    const urls = text.match(urlRegex) || [];
    const emails = text.match(emailRegex) || [];
    const phones = (text.match(phoneRegex) || []).filter(m => {
      const cleanDigits = m.replace(/[-()\s+]/g, '');
      return cleanDigits.length >= 7 && cleanDigits.length <= 15;
    });

    if (urls.length === 0 && emails.length === 0 && phones.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-slate-100 select-none">
        {urls.slice(0, 2).map((url, i) => (
          <a
            key={`url-${i}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 text-[9px] font-black tracking-wide uppercase transition-all cursor-pointer hover:scale-105 active:scale-95"
            onClick={(e) => e.stopPropagation()}
          >
            <Link2 className="w-2.5 h-2.5 stroke-[2.5]" />
            <span>Open Link</span>
          </a>
        ))}
        
        {emails.slice(0, 2).map((email, i) => (
          <a
            key={`email-${i}`}
            href={`mailto:${email}`}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-100 text-[9px] font-black tracking-wide uppercase transition-all cursor-pointer hover:scale-105 active:scale-95"
            onClick={(e) => e.stopPropagation()}
          >
            <Mail className="w-2.5 h-2.5 stroke-[2.5]" />
            <span>Mail</span>
          </a>
        ))}

        {phones.slice(0, 2).map((phone, i) => (
          <a
            key={`phone-${i}`}
            href={`tel:${phone}`}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 text-[9px] font-black tracking-wide uppercase transition-all cursor-pointer hover:scale-105 active:scale-95"
            onClick={(e) => e.stopPropagation()}
          >
            <Phone className="w-2.5 h-2.5 stroke-[2.5]" />
            <span>Call</span>
          </a>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#f5f5f7] select-none font-poppins relative">
      <div className="absolute top-10 right-10 w-40 h-40 bg-amber-200/5 rounded-full blur-3xl pointer-events-none" />

      {/* Edge-to-Edge Premium Apple Style Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-8 py-5 flex flex-wrap items-center justify-between gap-4 z-10 shadow-sm transition-all duration-300">
        <div className="flex items-center gap-3">
          {/* Mobile Sidebar Toggle Hamburger */}
          <button
            onClick={() => window.toggleMobileSidebar?.()}
            className="md:hidden p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-650 cursor-pointer transition-all active:scale-95 flex items-center justify-center border-none shrink-0"
          >
            <Menu className="w-4 h-4 stroke-[2.2]" />
          </button>

          <div>
            <h2 className="text-lg font-black font-outfit text-slate-800 flex items-center gap-2">
              <ClipboardPaste className="w-5.5 h-5.5 text-[#db922b] animate-float stroke-[2.2]" />
              <span>Board</span>
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search bar nestled cleanly in header */}
          {pastedTexts.length > 0 && (
            <div className="relative w-40 md:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search clipboard..."
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#db922b] focus:bg-white transition-all"
              />
            </div>
          )}

          {/* View Mode Toggle */}
          {pastedTexts.length > 0 && (
            <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200/50">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                  viewMode === 'grid' 
                    ? 'bg-white text-[#db922b] shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Grid View"
              >
                <Grid className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                  viewMode === 'list' 
                    ? 'bg-white text-[#db922b] shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="List View"
              >
                <List className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          )}

          {/* Custom Sort Selector Dropdown */}
          {pastedTexts.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-650 cursor-pointer transition-all active:scale-95 select-none"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {sortBy === 'newest' && 'Newest First'}
                  {sortBy === 'oldest' && 'Oldest First'}
                  {sortBy === 'length' && 'Length'}
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
                      className="absolute right-0 mt-2 w-40 bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl shadow-xl p-1 z-50 select-none"
                    >
                      {[
                        { value: 'newest', label: 'Newest First' },
                        { value: 'oldest', label: 'Oldest First' },
                        { value: 'length', label: 'Length' }
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setSortBy(opt.value);
                            setShowSortDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                            sortBy === opt.value
                              ? 'bg-[#fff7eb] text-[#db922b]'
                              : 'text-slate-650 hover:bg-slate-50'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {sortBy === opt.value && <Check className="w-3 h-3 stroke-[3]" />}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3.5 py-1.5 rounded-xl bg-[#fff7eb] hover:bg-[#ffe2c4] text-[#db922b] border border-[#ffe2c4] text-xs font-black cursor-pointer transition-all active:scale-95 flex items-center gap-1.5 shadow-sm"
          >
            <span>+ Manual</span>
          </button>
          
          {pastedTexts.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm("Permanently clear all pasted clipboard texts?")) {
                  clearAllPastedTexts();
                }
              }}
              title="Clear All Board"
              className="p-2 rounded-xl border border-rose-200 text-rose-500 hover:bg-rose-50 cursor-pointer transition-all active:scale-95 flex items-center gap-1 text-xs font-black"
            >
              <Trash2 className="w-3.5 h-3.5 stroke-[2.2]" />
              <span className="hidden md:inline">Clear All</span>
            </button>
          )}
        </div>
      </div>

      {/* Categories Horizontal Filter Pills Row */}
      {pastedTexts.length > 0 && (
        <div className="bg-white border-b border-slate-200/50 px-6 py-2.5 flex gap-2 overflow-x-auto select-none no-scrollbar">
          {[
            { id: 'all', label: 'All Snips 📋', count: getCategoryCount('all') },
            { id: 'link', label: 'Links 🔗', count: getCategoryCount('link') },
            { id: 'email', label: 'Emails 📧', count: getCategoryCount('email') },
            { id: 'phone', label: 'Phones 📞', count: getCategoryCount('phone') },
            { id: 'text', label: 'Texts 📝', count: getCategoryCount('text') },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeCategory === cat.id
                  ? 'bg-[#db922b] text-white border-transparent shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{cat.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono ${
                activeCategory === cat.id ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-500'
              }`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Main Workspace Area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
        
        {/* Manual Creator Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.form
              onSubmit={handleManualAdd}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full max-w-2xl mx-auto overflow-hidden bg-white border border-slate-200 p-5 rounded-2xl mb-6 shadow-md space-y-4"
            >
              <div>
                <label className="block text-[9px] uppercase font-black text-slate-400 mb-1 ml-0.5">Payload snippet</label>
                <textarea
                  required
                  rows={4}
                  value={newManualText}
                  onChange={(e) => setNewManualText(e.target.value)}
                  placeholder="Type or paste any snippet here manually..."
                  className="w-full text-xs px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-[#db922b] focus:bg-white text-slate-800 font-semibold resize-none leading-relaxed transition-all"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#db922b] hover:bg-[#db922b]/95 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer transition-transform active:scale-95 border-none"
                >
                  Save to Board 📋
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Dynamic Responsive Columns Grid / List view */}
        {filteredPastes.length === 0 ? (
          <div className="text-center py-20 bg-white/50 rounded-3xl border-2 border-dashed border-slate-200 max-w-2xl mx-auto flex flex-col items-center justify-center p-8 mt-10">
            <span className="text-4xl animate-float inline-block">📋</span>
            <h3 className="text-sm font-black text-slate-700 mt-3">No matching clipboard snippets</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-2 leading-relaxed font-semibold">
              {pastedTexts.length === 0 
                ? "Copy any text on your phone or PC, then click the floating golden 'Paste' button below to capture it instantly!"
                : "Try adjusting your category filter pills or search terms."}
            </p>
          </div>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? "grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5 pb-16 max-w-7xl mx-auto"
              : "flex flex-col gap-3 pb-16 max-w-4xl mx-auto"
          }>
            {filteredPastes.map(paste => {
              const isCopied = copiedId === paste.id;
              const isMorphed = morphedId === paste.id;
              const categories = detectCategories(paste.text);

              const getCardStyle = () => {
                if (categories.includes('link')) {
                  return 'bg-[#f0f9ff]/90 border-[#bae6fd]/70 hover:border-[#38bdf8]/60 hover:shadow-sky-100/30';
                }
                if (categories.includes('email')) {
                  return 'bg-[#f0fdf4]/90 border-[#bbf7d0]/70 hover:border-[#4ade80]/60 hover:shadow-emerald-100/30';
                }
                if (categories.includes('phone')) {
                  return 'bg-[#fffbeb]/90 border-[#fde68a]/70 hover:border-[#facc15]/60 hover:shadow-amber-100/30';
                }
                return 'bg-white border-slate-200/80 hover:border-[#db922b]/30 hover:shadow-slate-100/30';
              };
              const cardClass = getCardStyle();

              return (
                <motion.div
                  key={paste.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`${cardClass} p-5 border rounded-2xl flex flex-col justify-between hover:shadow-md transition-all shadow-sm ${
                    viewMode === 'grid' ? 'h-[235px] w-full' : 'min-h-[90px] flex-row items-center gap-6'
                  }`}
                >
                  {/* Left Column in List, Top in Grid */}
                  <div className={`flex-1 min-w-0 ${viewMode === 'list' ? 'flex flex-col gap-1.5' : ''}`}>
                    
                    {/* Header Row for Badges */}
                    <div className="flex items-center justify-between gap-3 mb-2 select-none">
                      {renderCategoryBadges(categories)}
                      
                      {viewMode === 'grid' && (
                        <span className="text-[8px] text-slate-400 font-mono font-black">
                          {new Date(paste.pastedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>

                    {/* Text render */}
                    <div className={`text-xs font-semibold text-slate-700 leading-relaxed break-words whitespace-pre-wrap select-text pr-1 ${
                      viewMode === 'grid' ? 'line-clamp-4' : 'line-clamp-2'
                    }`}>
                      {paste.text}
                    </div>

                    {/* Render Quick entity actions if links/emails/phones are detected */}
                    {renderEntityShortcuts(paste.text)}
                  </div>

                  {/* Right Column in List, Bottom in Grid */}
                  <div className={`flex items-center justify-between ${
                    viewMode === 'grid' 
                      ? 'border-t border-slate-100 pt-3 mt-4' 
                      : 'border-l border-slate-100 pl-4 ml-2 flex-shrink-0 gap-3'
                  }`}>
                    {/* Timestamp - Hidden on mobile grid to prevent icon misalignment */}
                    {viewMode === 'grid' ? (
                      <span className="text-[8px] text-slate-400 font-mono font-black hidden sm:block">
                        {new Date(paste.pastedAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-[8px] text-slate-400 font-mono font-black text-right hidden sm:block">
                        {new Date(paste.pastedAt).toLocaleDateString()}
                        <br />
                        {new Date(paste.pastedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}

                    {/* Stamp actions */}
                    <div className="flex items-center gap-1.5 select-none flex-shrink-0">
                      {/* Copy Back to Clipboard button */}
                      <button
                        onClick={() => handleCopyBack(paste.text, paste.id)}
                        title="Copy again"
                        className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                          isCopied 
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-500 font-bold' 
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5 stroke-[2.2]" />}
                      </button>

                      {/* Convert into a beautiful Note */}
                      <button
                        onClick={() => handleMorphToNote(paste.text, paste.id)}
                        title="Morph into Note"
                        className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                          isMorphed
                            ? 'bg-[#fff7eb] border-[#db922b] text-[#db922b]'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {isMorphed ? <Sparkles className="w-3.5 h-3.5 stroke-[2.2] animate-spin" /> : <FileText className="w-3.5 h-3.5 stroke-[2.2]" />}
                      </button>

                      {/* Delete pasted item */}
                      <button
                        onClick={() => deletePastedText(paste.id)}
                        title="Delete Paste Log"
                        className="w-8 h-8 rounded-full bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 border border-slate-200 hover:border-rose-200 flex items-center justify-center transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 stroke-[2.2]" />
                      </button>
                    </div>
                  </div>

                </motion.div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
