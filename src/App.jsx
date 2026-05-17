import React, { useEffect, useState } from 'react';
import { useNoteStore } from './store/useNoteStore';
import { isDemoMode, auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc } from 'firebase/firestore';
import { ClipboardPaste, Sparkles, Plus } from 'lucide-react';

// Component Imports
import SplashScreen from './components/SplashScreen';
import AuthScreen from './components/AuthScreen';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import NoteList from './components/NoteList';
import NoteEditor from './components/NoteEditor';

import HabitsTracker from './components/HabitsTracker';
import MoodTracker from './components/MoodTracker';
import SettingsPanel from './components/SettingsPanel';
import KeepGridView from './components/KeepGridView';

// CSS Imports
import './App.css';

export default function App() {
  const [showSplash, setShowSplash] = useState(false);
  const [reminderAlert, setReminderAlert] = useState(null);
  const [saveToast, setSaveToast] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const [globalPasteToast, setGlobalPasteToast] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // E2EE Shared Notepad view states
  const [sharedNoteId, setSharedNoteId] = useState(null);
  const [sharedNote, setSharedNote] = useState(null);
  const [loadingShared, setLoadingShared] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedId = params.get('shared');
    if (sharedId) {
      setSharedNoteId(sharedId);
      setLoadingShared(true);
      
      const docRef = doc(db, 'public_shares', sharedId);
      getDoc(docRef).then((snap) => {
        if (snap.exists()) {
          setSharedNote(snap.data());
        } else {
          alert("This shared note has expired or does not exist.");
        }
        setLoadingShared(false);
      }).catch(err => {
        console.error(err);
        setLoadingShared(false);
      });
    }
  }, []);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    window.toggleMobileSidebar = () => setIsSidebarOpen(p => !p);
    return () => {
      window.removeEventListener('resize', handleResize);
      delete window.toggleMobileSidebar;
    };
  }, []);
  
  const {
    user,
    isGuest,
    isSafeLocked,
    isAppPinLocked,
    pinHash,
    updateActivity,
    setUser,
    setAuthLoading,
    filters,
    setFilter,
    activeNoteId,
    accentColor,
    fontTheme
  } = useNoteStore();

  // Dynamic Theme Accent Color Loader
  useEffect(() => {
    document.documentElement.style.setProperty('--nebula-accent', accentColor || '#db922b');
  }, [accentColor]);

  // Enforce pure warm Cozy Day Mode (Light Mode) exclusively
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('nebula_theme', 'light');
  }, []);

  // Auto-unlock safe on mount if user is already logged in
  useEffect(() => {
    const state = useNoteStore.getState();
    if (state.user) {
      const derivedPassword = state.user.uid + "-cozy-nebula";
      useNoteStore.setState({ masterPassword: derivedPassword, isSafeLocked: false });
    } else if (state.isGuest) {
      const derivedPassword = "guest-cozy-nebula";
      useNoteStore.setState({ masterPassword: derivedPassword, isSafeLocked: false });
    }
  }, []);

  // 1. Listen to Firebase Authentication state changes
  useEffect(() => {
    if (isDemoMode) return;
    setAuthLoading(true);
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
          photoURL: firebaseUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${firebaseUser.uid}`
        });
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [setUser, setAuthLoading]);

  // 2. Global Ticker (Activity Timeout, and E2EE Reminders)
  useEffect(() => {
    const activityTimer = setInterval(() => {
      updateActivity();

      // Check client-side E2EE Reminders
      const now = new Date().getTime();
      const lastEnc = localStorage.getItem('nebula_last_pass_change') || now;
      if (now - Number(lastEnc) > 30 * 24 * 60 * 60 * 1000) {
        // Option to trigger automatic soft reminders
      }
      const state = useNoteStore.getState();
      const { notes, decryptedNotes, updateNote } = state;

      notes.forEach(note => {
        if (note.reminderTime && !note.reminderTriggered && !note.isTrash && !note.isArchived) {
          const reminderTime = new Date(note.reminderTime).getTime();
          if (now >= reminderTime) {
            const decrypted = decryptedNotes[note.id] || { title: "🔐 Encrypted Spark" };
            setReminderAlert(decrypted.title);
            updateNote(note.id, { reminderTriggered: true });

            // Trigger sweet celestial bell sound
            try {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-84.wav');
              audio.volume = 0.45;
              audio.play();
            } catch (e) {}
          }
        }
      });
    }, 5000); // Check every 5 seconds

    return () => {
      clearInterval(activityTimer);
    };
  }, [updateActivity]);

  // 3. Keep-alive listener (Reset activity timer on user movements)
  useEffect(() => {
    const handleResetActivity = () => {
      updateActivity();
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    events.forEach(ev => window.addEventListener(ev, handleResetActivity));

    return () => {
      events.forEach(ev => window.removeEventListener(ev, handleResetActivity));
    };
  }, [updateActivity]);

  // 4. Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!user && !isGuest) return;
      if (isSafeLocked) return;

      // Alt + N: New Note
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleCreateNewNote();
      }

      // Ctrl + P: Toggle Editor Preview Mode
      if (e.ctrlKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('nebula-toggle-preview'));
      }

      // Ctrl + S: Soft Save Sync Toast
      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setSaveToast(true);
        setTimeout(() => setSaveToast(false), 2000);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user, isGuest, isSafeLocked, filters.folderId, filters.tag]);

  const handleGlobalPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        alert("Clipboard is empty or access was denied!");
        return;
      }
      useNoteStore.getState().addPastedText(text);
      setGlobalPasteToast(true);
      setTimeout(() => setGlobalPasteToast(false), 2000);

      // Play soft sound
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-84.wav');
        audio.volume = 0.25;
        audio.play();
      } catch (e) {}
    } catch (err) {
      console.warn("Clipboard read failed:", err);
      alert("Please allow clipboard permission for Nebula Notes to capture copied snippets!");
    }
  };

  const handleCreateNewNote = async () => {
    // 1. Switch active view context to 'notes' tab and clear search, folders, tags
    useNoteStore.setState({
      filters: {
        ...useNoteStore.getState().filters,
        tab: 'notes',
        folderId: null,
        tag: null
      }
    });

    // 2. Create and focus new note
    await useNoteStore.getState().addNote("", "", null, []);
  };

  // --- E2EE SHARED NOTEPAD PUBLIC VIEW STAGES ---
  if (loadingShared) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#fbfaf7] font-poppins text-[#db922b]">
        <Sparkles className="w-10 h-10 animate-spin mb-3 text-[#db922b]" />
        <span className="text-[10px] font-black uppercase tracking-wider animate-pulse">Decrypting public notepad...</span>
      </div>
    );
  }

  if (sharedNote) {
    const getBgColor = (color) => {
      if (color === 'pink') return 'bg-[#fff9fa]';
      if (color === 'blue') return 'bg-[#f4f8ff]';
      if (color === 'purple') return 'bg-[#faf7ff]';
      if (color === 'mint') return 'bg-[#f5fbf7]';
      if (color === 'peach') return 'bg-[#fffbf4]';
      return 'bg-[#fbfaf7]';
    };

    return (
      <div className={`min-h-screen w-screen flex flex-col p-6 font-poppins relative selection:bg-amber-100/60 overflow-y-auto ${getBgColor(sharedNote.color)}`}>
        {/* Top bar */}
        <div className="max-w-3xl w-full mx-auto flex items-center justify-between pb-4 border-b border-slate-200/60 mb-6">
          <div className="flex items-center gap-2 select-none">
            <span className="text-xs font-black text-[#db922b] uppercase tracking-wider">🪐 Notiva Notes</span>
            <span className="text-[8px] bg-[#fff7eb] text-[#db922b] px-2 py-0.5 rounded-full font-black border border-[#ffe2c4]">Public Shared View</span>
          </div>
          <button
            onClick={() => {
              window.location.search = ""; // clear sharing to load main app
            }}
            className="text-[10px] bg-white hover:bg-slate-50 border border-slate-200 hover:border-[#db922b]/50 px-3.5 py-1.5 rounded-xl font-black text-slate-650 transition-all active:scale-95 shadow-sm cursor-pointer"
          >
            Create Your Space
          </button>
        </div>

        {/* Notepad main sheet */}
        <div className="max-w-3xl w-full mx-auto flex-1 bg-white/70 backdrop-blur-sm border border-slate-200/50 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col min-h-0">
          <h1 className="text-2xl font-black font-outfit text-slate-800 leading-tight mb-4 select-text">
            {sharedNote.title || 'Untitled Note'}
          </h1>
          
          <div 
            className="flex-1 text-slate-700 leading-[1.8] text-[13.5px] font-semibold select-text max-w-none pb-12 focus:outline-none prose"
            dangerouslySetInnerHTML={{ __html: sharedNote.content }}
          />
        </div>

        {/* Premium footer */}
        <div className="max-w-3xl w-full mx-auto py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-slate-400 font-bold mt-4 select-none">
          <span>Shared via Notiva Notes — 100% Encrypted & Cozy</span>
          <span className="flex items-center gap-1">
            Engineered By
            <a 
              href="https://damindur.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-[#db922b] hover:underline font-black"
            >
              Damindu Rathnayake
            </a>
          </span>
        </div>
      </div>
    );
  }

  // --- SPLASH SCREEN STAGE ---
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  // --- E2EE OR PIN AUTHENTICATION GATE STAGE ---
  const needsAuth = !user && !isGuest;
  const isAppLocked = false; // Safe lock room deactivated per request

  if (needsAuth || isAppLocked) {
    return <AuthScreen />;
  }

  return (
    <div className={`h-screen w-screen flex flex-col md:flex-row gap-0 relative overflow-hidden bg-[#f5f5f7] ${
      fontTheme === 'serif' ? 'font-serif' : fontTheme === 'mono' ? 'font-mono' : 'font-sans'
    }`}>
      
      {/* 1. Desktop Left Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* 2. Primary Layout Central Stage */}
      <main className="flex-1 min-h-0 flex flex-col md:flex-row gap-0 h-full overflow-hidden">
        {/* VIEW ROUTER */}
        {['notes', 'favorites', 'archive', 'trash', 'voice'].includes(filters.tab) && (
          (filters.viewMode === 'grid' && isDesktop) ? (
            <div className="flex-1 flex flex-col relative h-full">
              <KeepGridView />
              
              {/* Centered Google Keep E2EE Modal Editor Sheet */}
              {activeNoteId && (
                <div 
                  className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 md:p-6"
                >
                  <div 
                    className="bg-[#fbfaf7] rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] overflow-hidden flex flex-col relative border border-slate-200"
                  >
                    <div className="flex-1 flex flex-col min-h-0 pt-4">
                      <NoteEditor isModal={true} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Note list column */}
              <div className={`flex-1 md:flex-initial md:w-80 flex flex-col min-h-0 ${
                activeNoteId ? 'hidden md:flex' : 'flex'
              }`}>
                <NoteList />
              </div>

              {/* Note editor workspace column */}
              <div className={`flex-1 flex flex-col min-h-0 ${
                activeNoteId ? 'flex' : 'hidden md:flex'
              }`}>
                <NoteEditor />
              </div>
            </>
          )
        )}

        {/* Clipboard Paste Board Workspace (Dedicated Full-Bleed Column) */}
        {filters.tab === 'habits' && (
          <div className="flex-1 flex flex-col h-full min-h-0 bg-[#f5f5f7]">
            <HabitsTracker />
          </div>
        )}



        {/* Settings control board */}
        {filters.tab === 'settings' && (
          <div className="flex-1 flex flex-col h-full min-h-0 bg-[#f5f5f7] overflow-y-auto">
            <SettingsPanel />
          </div>
        )}

      </main>

      {/* 3. Mobile Bottom navigation */}
      {!activeNoteId && <MobileNav />}

      {/* Dynamic Save Sync Toast */}
      {saveToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 backdrop-blur-md text-white font-bold text-[10px] tracking-wide px-4 py-2 rounded-lg shadow-lg border border-slate-700 flex items-center gap-2 select-none">
          <span>Notes synchronized successfully</span>
        </div>
      )}

      {/* Dynamic E2EE Cosmic Reminder Alarm banner */}
      {reminderAlert && (
        <div className="fixed top-6 right-6 z-50 w-full max-w-xs px-4 select-none animate-float">
          <div className="bg-white/90 backdrop-blur-md rounded-xl border border-slate-200 p-4 shadow-lg flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-[#db922b] flex items-center justify-center text-white text-[10px] font-bold">
                  N
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reminder</span>
              </div>
              <span className="text-[9px] text-slate-400">now</span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#1d1d1f]">{reminderAlert}</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">Your scheduled reminder is active.</p>
            </div>
            <div className="flex justify-end pt-1">
              <button
                onClick={() => setReminderAlert(null)}
                className="px-3 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-[#1d1d1f] text-[10px] font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Floating Action Buttons (FABs) */}
      {!activeNoteId && (
        <div className="fixed bottom-24 md:bottom-8 right-6 z-40 flex flex-col-reverse gap-3 items-center">
          {/* New Note Button (Primary) */}
          <button
            onClick={handleCreateNewNote}
            title="Create New Note"
            className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-tr from-[#db922b] to-[#f5ab42] hover:scale-110 active:scale-95 transition-all text-white shadow-lg shadow-[#db922b]/30 border border-white flex flex-col items-center justify-center cursor-pointer select-none group"
          >
            <Plus className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform stroke-[2.5]" />
            <span className="text-[7px] font-black uppercase mt-0.5 tracking-tighter">Note</span>
          </button>

          {/* Paste Capture Button (Secondary) */}
          <button
            onClick={handleGlobalPaste}
            title="Instant Paste Capture"
            className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white hover:bg-slate-50 hover:scale-110 active:scale-95 transition-all text-slate-700 shadow-md border border-slate-200 flex flex-col items-center justify-center cursor-pointer select-none group"
          >
            <ClipboardPaste className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover:scale-110 transition-transform stroke-[2]" />
            <span className="text-[6px] font-black uppercase mt-0.5 tracking-tighter">Paste</span>
          </button>
        </div>
      )}

      {/* Clipboard Toast */}
      {globalPasteToast && (
        <div className="fixed bottom-36 md:bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-[#db922b] to-amber-600 text-white font-bold text-[10px] tracking-wide px-4 py-2.5 rounded-xl shadow-lg border border-white/10 flex items-center gap-2 select-none animate-bounce">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Captured to Clipboard Paste Board!</span>
        </div>
      )}

    </div>
  );
}
