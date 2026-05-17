import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { auth as firebaseAuth, db, isDemoMode } from '../firebase';
import { encryptText, decryptText, hashPin } from '../utils/crypto';

// Custom persistence storage that excludes sensitive or dynamic data to force pure server sync
const emptyStateMemoryOnly = {
  masterPassword: "",
  isSafeLocked: true,
  decryptedNotes: {}, // noteId -> { title, content }
  isSyncing: false,
  activeNoteId: null,
  notes: [],
  pastedTexts: [],
  folders: [],
  habits: [],
  moods: [],
  stickyNotes: [],
};

export const useNoteStore = create(
  persist(
    (set, get) => ({
      // --- AUTH STATE ---
      user: null, // { uid, email, displayName, photoURL }
      isGuest: false,
      isAuthLoading: false,

      // --- E2EE & LOCKS ---
      masterPassword: "", // Strictly in-memory
      isSafeLocked: true, // Requires masterPassword to view decrypted notes
      pinHash: "", // Stored locally to verify quick PIN resume
      isAppPinLocked: false, // App locked with PIN on start
      autoLockTimeout: 15, // Minutes (0 = disabled)
      lastActiveTime: Date.now(),

      // --- NOTES & ORGANIZATIONS ---
      notes: [], // Encrypted Firestore representations
      folders: [
        { id: 'f-personal', name: '🌸 Personal', color: 'pink', icon: 'Folder' },
        { id: 'f-work', name: '💼 Work', color: 'blue', icon: 'Folder' },
        { id: 'f-ideas', name: '💡 Ideas', color: 'purple', icon: 'Folder' },
      ],
      tags: ['journal', 'todo', 'nebula', 'inspiration'],
      activeNoteId: null,

      // --- IN-MEMORY DECRYPTED CACHE ---
      decryptedNotes: {}, // id -> { title, content }

      // --- PRODUCTIVITY: POMODORO ---
      pomodoro: {
        mode: 'work', // work (25m), short (5m), long (15m)
        isRunning: false,
        timeLeft: 1500,
        totalTime: 1500,
        cycleCount: 0,
      },

      // --- PRODUCTIVITY: HABITS ---
      habits: [], // { id, name, icon, color, completedDays: ['YYYY-MM-DD', ...] }

      // --- PRODUCTIVITY: PASTED TEXTS ---
      pastedTexts: [], // { id, text, pastedAt: Date.now() }

      // --- PRODUCTIVITY: MOODS ---
      moods: [], // { date: 'YYYY-MM-DD', mood: 'happy'|'calm'|'tired'|'sad'|'anxious', note: '' }

      // --- SEARCH & FILTERS ---
      searchQuery: '',
      searchHistory: [],
      filters: {
        folderId: null,
        tag: null,
        color: null,
        sortBy: 'updatedAt', // updatedAt, createdAt, title, pin
        viewMode: 'grid', // grid, list, compact
        tab: 'notes', // notes, favorites, archive, trash, habits, pomodoro
      },

      // --- APP PREFERENCES ---
      accentColor: '#db922b', // Golden Crema
      fontTheme: 'sans', // sans, serif, mono

      // --- SYNC STATUS ---
      isSyncing: false,
      lastSyncedAt: null,
      offlineQueue: [], // Queue of operations to sync when online

      // --- STICKY NOTES ---
      stickyNotes: [
        { id: 's-1', text: '💡 Notiva Tip: Use E2EE folders to organize passwords or cozy journals safely!', color: 'pink' },
        { id: 's-2', text: '⏰ Don\'t forget to practice 2 Pomodoro focus sessions today!', color: 'blue' }
      ],
      selectedNoteIds: [], // Multi-select actions

      // --- ACTIONS: AUTH ---
      setUser: async (user) => {
        set({ user });
        if (user) {
          set({ isGuest: false });
          // Seamlessly derive masterPassword from the user's uid to eliminate E2EE password screens!
          const derivedPassword = user.uid + "-cozy-nebula";
          await get().unlockSafe(derivedPassword);

          if (!isDemoMode) {
            get().startFirestoreSync();
          }
        } else {
          set({ masterPassword: "", isSafeLocked: true, isGuest: false });
          get().stopFirestoreSync();
        }
      },
      
      setGuestMode: async (isGuest) => {
        set({ isGuest, user: null });
        if (isGuest) {
          // Seamlessly derive guest password
          const derivedPassword = "guest-cozy-nebula";
          await get().unlockSafe(derivedPassword);
        } else {
          set({ masterPassword: "", isSafeLocked: true });
        }
        get().stopFirestoreSync();
      },

      setAuthLoading: (isLoading) => set({ isAuthLoading: isLoading }),

      // --- ACTIONS: SECURITY & CRYPTO ---
      setupPin: async (pin) => {
        if (!pin) {
          set({ pinHash: "", isAppPinLocked: false });
          return;
        }
        const hash = await hashPin(pin);
        set({ pinHash: hash, isAppPinLocked: true });
      },

      verifyPin: async (pin) => {
        const hash = await hashPin(pin);
        if (hash === get().pinHash) {
          set({ isAppPinLocked: false, lastActiveTime: Date.now() });
          return true;
        }
        return false;
      },

      setAppPinLocked: (locked) => set({ isAppPinLocked: locked }),

      unlockSafe: async (password) => {
        set({ isSyncing: true });
        try {
          const notes = get().notes;
          const decryptedNotes = {};

          // Attempt to decrypt legacy notes, or read plain text directly
          for (const note of notes) {
            if (note.title !== undefined && note.title !== "🔐 Encrypted Note") {
              decryptedNotes[note.id] = {
                title: note.title || "",
                content: note.content || "",
              };
            } else if (note.encryptedContent) {
              try {
                const decryptedTitle = await decryptText(note.encryptedTitle, password);
                const decryptedContent = await decryptText(note.encryptedContent, password);
                decryptedNotes[note.id] = {
                  title: decryptedTitle,
                  content: decryptedContent,
                };
              } catch (e) {
                decryptedNotes[note.id] = {
                  title: note.title || "",
                  content: note.content || "",
                };
              }
            } else {
              decryptedNotes[note.id] = {
                title: note.title || "",
                content: note.content || "",
              };
            }
          }

          set({ 
            masterPassword: password, 
            isSafeLocked: false,
            decryptedNotes,
            isSyncing: false,
            lastActiveTime: Date.now()
          });
          return true;
        } catch (err) {
          console.error("Unlock safe error:", err);
          set({ isSyncing: false });
          return false;
        }
      },

      lockSafe: () => {
        set({ 
          masterPassword: "", 
          isSafeLocked: true, 
          decryptedNotes: {} 
        });
      },

      updateActivity: () => {
        const now = Date.now();
        const { lastActiveTime, autoLockTimeout, isSafeLocked, pinHash } = get();
        
        if (autoLockTimeout > 0 && !isSafeLocked && pinHash) {
          const diffMinutes = (now - lastActiveTime) / 1000 / 60;
          if (diffMinutes >= autoLockTimeout) {
            get().lockSafe();
            get().setAppPinLocked(true);
            console.log("🌌 Nebula Notes: Auto-locked due to inactivity.");
          }
        }
        set({ lastActiveTime: now });
      },

      // --- ACTIONS: NOTES ---
      addNote: async (title, content, folderId = null, tags = [], color = 'default') => {
        const id = 'note-' + Math.random().toString(36).substr(2, 9);
        const now = new Date().toISOString();

        const newNote = {
          id,
          uid: get().user?.uid || 'guest',
          folderId,
          tags,
          color,
          isPinned: false,
          isFavorite: false,
          isArchived: false,
          isTrash: false,
          createdAt: now,
          updatedAt: now,
          title: title || "Untitled Note",
          content: content || "",
          encryptedTitle: "",
          encryptedContent: "",
          versions: [], 
          reminderTime: null, 
          reminderTriggered: false,
          mediaUrls: [],
          voiceUrl: null,
          voiceDuration: 0,
        };

        const updatedNotes = [newNote, ...get().notes];
        const updatedDecrypted = {
          ...get().decryptedNotes,
          [id]: { title: title || "Untitled Note", content: content || "" }
        };

        set({ 
          notes: updatedNotes, 
          decryptedNotes: updatedDecrypted,
          activeNoteId: id
        });

        // Sync with Database
        if (!get().isGuest && !isDemoMode) {
          try {
            await setDoc(doc(db, 'notes', id), newNote);
          } catch (e) {
            console.warn("Firestore save failed, queuing offline:", e);
            set({ offlineQueue: [...get().offlineQueue, { type: 'ADD', data: newNote }] });
          }
        }
      },

      updateNote: async (id, updates) => {
        const noteIndex = get().notes.findIndex(n => n.id === id);
        if (noteIndex === -1) return;

        const originalNote = get().notes[noteIndex];
        const now = new Date().toISOString();
        
        let updatedDecrypted = { ...get().decryptedNotes };
        let updatedVersions = [...(originalNote.versions || [])];

        if (updates.title !== undefined || updates.content !== undefined) {
          const newTitle = updates.title !== undefined ? updates.title : (updatedDecrypted[id]?.title || "");
          const newContent = updates.content !== undefined ? updates.content : (updatedDecrypted[id]?.content || "");
          
          // Save a plain text snapshot version if content is different
          if (updatedDecrypted[id] && (updates.title !== updatedDecrypted[id].title || updates.content !== updatedDecrypted[id].content)) {
            updatedVersions.unshift({
              updatedAt: originalNote.updatedAt,
              title: updatedDecrypted[id].title || "",
              content: updatedDecrypted[id].content || ""
            });
            if (updatedVersions.length > 5) updatedVersions.pop();
          }

          updatedDecrypted[id] = { title: newTitle, content: newContent };
        }

        const updatedNote = {
          ...originalNote,
          ...updates,
          versions: updatedVersions,
          updatedAt: now,
        };

        // Also ensure plain text values are set inside the main note object fields directly
        if (updates.title !== undefined) updatedNote.title = updates.title;
        if (updates.content !== undefined) updatedNote.content = updates.content;

        const updatedNotes = [...[...get().notes]];
        updatedNotes[noteIndex] = updatedNote;

        set({ 
          notes: updatedNotes, 
          decryptedNotes: updatedDecrypted 
        });

        // Sync to Server
        if (!get().isGuest && !isDemoMode) {
          try {
            await setDoc(doc(db, 'notes', id), updatedNote);
          } catch (e) {
            console.warn("Firestore update failed, queuing offline:", e);
            set({ offlineQueue: [...get().offlineQueue, { type: 'UPDATE', id, data: updatedNote }] });
          }
        }
      },

      deleteNote: async (id) => {
        const note = get().notes.find(n => n.id === id);
        if (!note) return;

        if (!note.isTrash) {
          // Send to Trash
          await get().updateNote(id, { isTrash: true });
        } else {
          // Permanently Delete
          const updatedNotes = get().notes.filter(n => n.id !== id);
          const updatedDecrypted = { ...get().decryptedNotes };
          delete updatedDecrypted[id];

          set({ 
            notes: updatedNotes, 
            decryptedNotes: updatedDecrypted,
            activeNoteId: get().activeNoteId === id ? null : get().activeNoteId,
            selectedNoteIds: get().selectedNoteIds.filter(selId => selId !== id)
          });

          if (!get().isGuest && !isDemoMode) {
            try {
              await deleteDoc(doc(db, 'notes', id));
            } catch (e) {
              console.warn("Firestore delete failed, queueing offline:", e);
              set({ offlineQueue: [...get().offlineQueue, { type: 'DELETE', id }] });
            }
          }
        }
      },

      restoreNote: async (id) => {
        await get().updateNote(id, { isTrash: false, isArchived: false });
      },

      duplicateNote: async (id) => {
        const note = get().notes.find(n => n.id === id);
        const decrypted = get().decryptedNotes[id];
        if (!note || !decrypted) return;

        await get().addNote(
          `${decrypted.title} (Copy)`,
          decrypted.content,
          note.folderId,
          [...note.tags],
          note.color
        );
      },

      restoreVersion: async (noteId, versionIndex) => {
        const note = get().notes.find(n => n.id === noteId);
        if (!note || !note.versions || !note.versions[versionIndex]) return;
        
        const password = get().masterPassword;
        const snapshot = note.versions[versionIndex];
        
        try {
          // Fallback decryption if old legacy snapshot, otherwise direct plain text
          let title = snapshot.title;
          let content = snapshot.content;

          if (title === undefined && snapshot.encryptedTitle) {
            title = await decryptText(snapshot.encryptedTitle, password);
          }
          if (content === undefined && snapshot.encryptedContent) {
            content = await decryptText(snapshot.encryptedContent, password);
          }

          await get().updateNote(noteId, {
            title: title || "",
            content: content || ""
          });
          return true;
        } catch (e) {
          console.error("Failed to restore version snapshot:", e);
          // Ultimate safe fallback
          await get().updateNote(noteId, {
            title: snapshot.title || "Untitled Note",
            content: snapshot.content || ""
          });
          return true;
        }
      },

      // --- ACTIONS: MULTI-SELECT ---
      toggleSelectNote: (id) => {
        const current = get().selectedNoteIds;
        if (current.includes(id)) {
          set({ selectedNoteIds: current.filter(selId => selId !== id) });
        } else {
          set({ selectedNoteIds: [...current, id] });
        }
      },

      clearSelection: () => set({ selectedNoteIds: [] }),

      bulkDelete: async () => {
        const selected = get().selectedNoteIds;
        for (const id of selected) {
          await get().deleteNote(id);
        }
        set({ selectedNoteIds: [] });
      },

      bulkArchive: async () => {
        const selected = get().selectedNoteIds;
        for (const id of selected) {
          await get().updateNote(id, { isArchived: true });
        }
        set({ selectedNoteIds: [] });
      },

      bulkTag: async (tag) => {
        const selected = get().selectedNoteIds;
        for (const id of selected) {
          const note = get().notes.find(n => n.id === id);
          if (note && !note.tags.includes(tag)) {
            await get().updateNote(id, { tags: [...note.tags, tag] });
          }
        }
        set({ selectedNoteIds: [] });
      },

      // --- ACTIONS: DAILY JOURNAL ---
      createOrOpenDailyNote: async () => {
        const todayStr = new Date().toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
        const title = `📅 Journal: ${todayStr}`;
        
        // Check if note already exists
        const existing = get().notes.find(n => {
          const dec = get().decryptedNotes[n.id];
          return dec && dec.title === title;
        });

        if (existing) {
          set({ activeNoteId: existing.id, filters: { ...get().filters, tab: 'notes' } });
        } else {
          await get().addNote(
            title,
            `## Vibe Log:\nHow am I feeling today? \n\n## Daily Gratitude:\n1. \n2. \n3. \n\n## Action Coordinates:\n- [ ] Focus session completed\n- [ ] Habits checked\n- [ ] Drank water`,
            null,
            ['daily', 'journal'],
            'peach'
          );
        }
      },

      // --- ACTIONS: FOLDERS ---
      addFolder: async (name, color = 'purple', icon = 'Folder') => {
        const id = 'folder-' + Math.random().toString(36).substr(2, 9);
        const newFolder = { id, name, color, icon };
        set({ folders: [...get().folders, newFolder] });
        await get().saveUserDataToFirestore();
      },

      updateFolder: async (id, updates) => {
        set({
          folders: get().folders.map(f => f.id === id ? { ...f, ...updates } : f)
        });
        await get().saveUserDataToFirestore();
      },

      deleteFolder: async (id) => {
        // Remove folder and reset any notes inside it to folderId: null
        const updatedFolders = get().folders.filter(f => f.id !== id);
        set({ folders: updatedFolders });
        
        get().notes.forEach(note => {
          if (note.folderId === id) {
            get().updateNote(note.id, { folderId: null });
          }
        });
        await get().saveUserDataToFirestore();
      },

      // --- ACTIONS: FILTERS ---
      setFilter: (key, value) => {
        set({ filters: { ...get().filters, [key]: value } });
      },

      setSearchQuery: (query) => set({ searchQuery: query }),

      addSearchHistory: (q) => {
        if (!q.trim()) return;
        const current = get().searchHistory.filter(h => h !== q);
        set({ searchHistory: [q, ...current].slice(0, 10) }); // keep top 10
      },

      clearSearchHistory: () => set({ searchHistory: [] }),

      // --- ACTIONS: POMODORO ---
      setPomodoro: (updates) => set({ pomodoro: { ...get().pomodoro, ...updates } }),
      
      tickPomodoro: () => {
        const { timeLeft, isRunning, mode, cycleCount } = get().pomodoro;
        if (!isRunning) return;

        if (timeLeft <= 1) {
          // Timer finished!
          let nextMode = 'work';
          let nextTime = 1500;
          let nextCycle = cycleCount;

          if (mode === 'work') {
            nextCycle += 1;
            if (nextCycle % 4 === 0) {
              nextMode = 'long';
              nextTime = 900; // 15 mins
            } else {
              nextMode = 'short';
              nextTime = 300; // 5 mins
            }
          } else {
            nextMode = 'work';
            nextTime = 1500; // 25 mins
          }

          // Trigger cute haptic/audio chime feedback
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav');
            audio.volume = 0.5;
            audio.play();
          } catch (e) {}

          set({
            pomodoro: {
              mode: nextMode,
              isRunning: false,
              timeLeft: nextTime,
              totalTime: nextTime,
              cycleCount: nextCycle
            }
          });
        } else {
          set({
            pomodoro: {
              pomodoro: get().pomodoro,
              timeLeft: timeLeft - 1
            }
          });
        }
      },

      // --- ACTIONS: HABITS ---
      addHabit: async (name, icon = 'Star', color = 'purple') => {
        const id = 'habit-' + Math.random().toString(36).substr(2, 9);
        const newHabit = { id, name, icon, color, completedDays: [] };
        set({ habits: [...get().habits, newHabit] });
        await get().saveUserDataToFirestore();
      },

      toggleHabitDay: async (habitId, dateStr) => {
        const updatedHabits = get().habits.map(h => {
          if (h.id !== habitId) return h;
          const completed = [...h.completedDays];
          const idx = completed.indexOf(dateStr);
          if (idx !== -1) {
            completed.splice(idx, 1);
          } else {
            completed.push(dateStr);
          }
          return { ...h, completedDays: completed };
        });
        set({ habits: updatedHabits });
        await get().saveUserDataToFirestore();
      },

      deleteHabit: async (habitId) => {
        set({ habits: get().habits.filter(h => h.id !== habitId) });
        await get().saveUserDataToFirestore();
      },

      // --- ACTIONS: PASTED TEXTS ---
      addPastedText: async (text) => {
        if (!text || !text.trim()) return;
        const newPaste = {
          id: 'paste-' + Math.random().toString(36).substr(2, 9),
          text: text.trim(),
          pastedAt: Date.now()
        };
        set({ pastedTexts: [newPaste, ...get().pastedTexts] });
        await get().saveUserDataToFirestore();
      },

      deletePastedText: async (id) => {
        set({ pastedTexts: get().pastedTexts.filter(p => p.id !== id) });
        await get().saveUserDataToFirestore();
      },

      clearAllPastedTexts: async () => {
        set({ pastedTexts: [] });
        await get().saveUserDataToFirestore();
      },

      // --- ACTIONS: MOODS ---
      logMood: async (mood, note = '') => {
        const today = new Date().toISOString().split('T')[0];
        const filteredMoods = get().moods.filter(m => m.date !== today);
        const newMood = { date: today, mood, note };
        set({ moods: [...filteredMoods, newMood] });
        await get().saveUserDataToFirestore();
      },

      // --- ACTIONS: STICKY NOTES ---
      addStickyNote: async (text, color = 'pastel-peach') => {
        const id = 'sticky-' + Math.random().toString(36).substr(2, 9);
        set({ stickyNotes: [...get().stickyNotes, { id, text, color }] });
        await get().saveUserDataToFirestore();
      },

      updateStickyNote: async (id, text) => {
        set({
          stickyNotes: get().stickyNotes.map(s => s.id === id ? { ...s, text } : s)
        });
        await get().saveUserDataToFirestore();
      },

      deleteStickyNote: async (id) => {
        set({ stickyNotes: get().stickyNotes.filter(s => s.id !== id) });
        await get().saveUserDataToFirestore();
      },

      // --- FIRESTORE SYNC LOGIC ---
      unsubscribeSync: null,
      unsubscribeSettingsSync: null,

      saveUserDataToFirestore: async () => {
        const user = get().user;
        if (!user || isDemoMode || get().isGuest) return;
        try {
          const userRef = doc(db, 'users', user.uid);
          await setDoc(userRef, {
            folders: get().folders,
            habits: get().habits,
            pastedTexts: get().pastedTexts,
            moods: get().moods,
            stickyNotes: get().stickyNotes,
            tags: get().tags,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (e) {
          console.error("Failed to save user data to Firestore:", e);
        }
      },

      startFirestoreSync: () => {
        const user = get().user;
        if (!user || isDemoMode) return;

        // Stop any existing sync listener
        get().stopFirestoreSync();

        set({ isSyncing: true });

        // 1. Listen to notes
        const q = query(collection(db, 'notes'), where('uid', '==', user.uid));
        const unsubscribe = onSnapshot(q, async (snapshot) => {
          const serverNotes = [];
          const password = get().masterPassword;
          const decryptedNotes = { ...get().decryptedNotes };

          for (const docSnapshot of snapshot.docs) {
            const data = docSnapshot.data();
            serverNotes.push(data);

            // Prioritize plain text directly, fall back to E2EE decryption only for legacy files
            if (data.title !== undefined && data.title !== "🔐 Encrypted Note") {
              decryptedNotes[data.id] = { title: data.title || "", content: data.content || "" };
            } else if (password && data.encryptedContent) {
              try {
                const decryptedTitle = await decryptText(data.encryptedTitle, password);
                const decryptedContent = await decryptText(data.encryptedContent, password);
                decryptedNotes[data.id] = { title: decryptedTitle, content: decryptedContent };
              } catch (e) {
                decryptedNotes[data.id] = { title: data.title || "", content: data.content || "" };
              }
            } else {
              decryptedNotes[data.id] = { title: data.title || "", content: data.content || "" };
            }
          }

          set({ 
            notes: serverNotes, 
            decryptedNotes,
            isSyncing: false, 
            lastSyncedAt: new Date().toISOString() 
          });
          
          get().processOfflineQueue();
        }, (error) => {
          console.error("Firestore notes sync error:", error);
          set({ isSyncing: false });
        });

        // 2. Listen to other userData (folders, habits, pastedTexts, moods, stickyNotes, tags)
        const userRef = doc(db, 'users', user.uid);
        const unsubscribeSettings = onSnapshot(userRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            set({
              folders: data.folders || get().folders,
              habits: data.habits || get().habits,
              pastedTexts: data.pastedTexts || get().pastedTexts,
              moods: data.moods || get().moods,
              stickyNotes: data.stickyNotes || get().stickyNotes,
              tags: data.tags || get().tags,
            });
          }
        }, (error) => {
          console.error("Firestore user settings sync error:", error);
        });

        set({ 
          unsubscribeSync: unsubscribe,
          unsubscribeSettingsSync: unsubscribeSettings
        });
      },

      stopFirestoreSync: () => {
        const unsub = get().unsubscribeSync;
        if (unsub) {
          unsub();
          set({ unsubscribeSync: null });
        }
        const unsubSettings = get().unsubscribeSettingsSync;
        if (unsubSettings) {
          unsubSettings();
          set({ unsubscribeSettingsSync: null });
        }
      },

      processOfflineQueue: async () => {
        const queue = get().offlineQueue;
        if (queue.length === 0 || isDemoMode || get().isGuest) return;

        console.log(`🌌 Nebula Notes: Syncing ${queue.length} offline operations...`);
        const batch = writeBatch(db);
        
        for (const op of queue) {
          if (op.type === 'ADD' || op.type === 'UPDATE') {
            const ref = doc(db, 'notes', op.id || op.data.id);
            batch.set(ref, op.data, { merge: true });
          } else if (op.type === 'DELETE') {
            const ref = doc(db, 'notes', op.id);
            batch.delete(ref);
          }
        }

        try {
          await batch.commit();
          set({ offlineQueue: [] });
          console.log("🌌 Nebula Notes: Offline queue successfully synced to Firestore!");
        } catch (e) {
          console.error("Failed to commit offline queue:", e);
        }
      }
    }),
    {
      name: 'nebula-notes-storage',
      storage: createJSONStorage(() => localStorage),
      // Filter out sensitive and volatile state variables from storage!
      partialize: (state) => {
        const copy = { ...state };
        // Exclude transient/in-memory security data
        Object.keys(emptyStateMemoryOnly).forEach(key => {
          delete copy[key];
        });
        // We also exclude unsubscribeSync to avoid serializing functions
        delete copy.unsubscribeSync;
        return copy;
      }
    }
  )
);
