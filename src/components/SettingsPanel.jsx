import React, { useState } from 'react';
import { useNoteStore } from '../store/useNoteStore';
import { 
  Settings, 
  ShieldCheck, 
  Palette, 
  Database, 
  Moon, 
  Sun, 
  Trash2, 
  Upload, 
  Download, 
  ChevronRight,
  Check,
  Sparkles,
  Type,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Bell,
  Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SettingsPanel() {
  const {
    pinHash,
    setupPin,
    autoLockTimeout,
    notes,
    decryptedNotes,
    folders,
    habits,
    moods,
    lockSafe,
    accentColor,
    fontTheme
  } = useNoteStore();

  const [pinInput, setPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [securityMessage, setSecurityMessage] = useState('');
  const [showTimeoutDropdown, setShowTimeoutDropdown] = useState(false);
  
  // Custom Settings Toggles (Local Storage state persistent)
  const [autoSaveCloud, setAutoSaveCloud] = useState(() => {
    return localStorage.getItem('nebula_auto_save_cloud') !== 'false';
  });
  const [bellNotifications, setBellNotifications] = useState(() => {
    return localStorage.getItem('nebula_bell_notifications') !== 'false';
  });
  const [autoArchiveTrash, setAutoArchiveTrash] = useState(() => {
    return localStorage.getItem('nebula_auto_archive_trash') === 'true';
  });



  const handleSetAccentColor = (color) => {
    useNoteStore.setState({ accentColor: color });
    // Also inject custom theme accent variables globally
    document.documentElement.style.setProperty('--nebula-accent', color);
  };

  const handleSetFontTheme = (theme) => {
    useNoteStore.setState({ fontTheme: theme });
  };

  const handleSetupPinSubmit = async (e) => {
    e.preventDefault();
    if (pinInput.length !== 4 || isNaN(Number(pinInput))) {
      return setSecurityMessage("PIN must be exactly 4 digits.");
    }
    if (pinInput !== confirmPinInput) {
      return setSecurityMessage("PINs do not match.");
    }

    await setupPin(pinInput);
    setSecurityMessage("PIN configured successfully!");
    setPinInput('');
    setConfirmPinInput('');
    setTimeout(() => {
      setShowPinSetup(false);
      setSecurityMessage('');
    }, 2000);
  };

  const handleClearPin = async () => {
    await setupPin("");
    setSecurityMessage("Safe PIN disabled.");
    setTimeout(() => setSecurityMessage(''), 2000);
  };

  const handleBulkExport = () => {
    const exportData = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      folders: folders,
      habits: habits,
      moods: moods,
      notes: notes.map(note => {
        const dec = decryptedNotes[note.id] || { title: '', content: '' };
        return {
          ...note,
          decryptedTitle: dec.title,
          decryptedContent: dec.content
        };
      })
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `nebula-notes-backup-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleBulkImport = (e) => {
    const fileReader = new FileReader();
    const file = e.target.files[0];
    if (!file) return;

    fileReader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (!imported.notes || !Array.isArray(imported.notes)) {
          alert("Invalid backup format.");
          return;
        }

        const currentNotes = [...notes];
        const currentDecrypted = { ...decryptedNotes };
        
        imported.notes.forEach(impNote => {
          if (!currentNotes.some(n => n.id === impNote.id)) {
            currentNotes.push(impNote);
            currentDecrypted[impNote.id] = {
              title: impNote.decryptedTitle || "Decrypted Import",
              content: impNote.decryptedContent || ""
            };
          }
        });

        useNoteStore.setState({ 
          notes: currentNotes,
          decryptedNotes: currentDecrypted,
          folders: imported.folders || folders,
          habits: imported.habits || habits,
          moods: imported.moods || moods
        });

        alert("Backup restored successfully!");
      } catch (err) {
        console.error(err);
        alert("Failed to restore backup file.");
      }
    };
    fileReader.readAsText(file);
  };

  const handleWipeDatabase = () => {
    const confirmWipe = window.confirm("WARNING: This will permanently wipe all notes, habits, and folders from this device! Are you absolutely sure?");
    if (confirmWipe) {
      useNoteStore.setState({
        notes: [],
        decryptedNotes: {},
        folders: [],
        habits: [],
        moods: [],
        activeNoteId: null
      });
      lockSafe();
      alert("Local storage database completely wiped.");
    }
  };

  const toggleSaveOption = (val) => {
    setAutoSaveCloud(val);
    localStorage.setItem('nebula_auto_save_cloud', String(val));
  };

  const toggleNotificationOption = (val) => {
    setBellNotifications(val);
    localStorage.setItem('nebula_bell_notifications', String(val));
  };

  const toggleArchiveOption = (val) => {
    setAutoArchiveTrash(val);
    localStorage.setItem('nebula_auto_archive_trash', String(val));
  };

  const accentColorOptions = [
    { label: 'Golden Crema', hex: '#db922b', border: 'border-amber-300' },
    { label: 'Lavender Sky', hex: '#9b5de5', border: 'border-purple-300' },
    { label: 'Celestial Blue', hex: '#00bbf9', border: 'border-sky-300' },
    { label: 'Emerald Mint', hex: '#00f5d4', border: 'border-teal-300' },
    { label: 'Blossom Pink', hex: '#f15bb5', border: 'border-pink-300' }
  ];

  return (
    <div className="flex-1 w-full flex flex-col bg-[#f5f5f7] select-none font-poppins relative">
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
              <Settings className="w-5.5 h-5.5 text-[#db922b] animate-float stroke-[2.2]" />
              <span>Notiva Control Board</span>
            </h2>
          </div>
        </div>

        {/* Quick safe state badge */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex flex-col text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Storage Load</span>
            <span className="text-xs font-bold text-[#db922b]">{notes.length} Active Sparks</span>
          </div>
        </div>
      </div>

      {/* Scrollable Dashboard Content */}
      <div className="flex-1 w-full bg-[#f5f5f7]/60 py-8 px-6 md:px-12 overflow-y-auto">
        
        {/* 2. Responsive Dashboard Grid */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 pb-24">
        
        {/* ================= CARD 1: AESTHETICS & CUSTOM ACCENTS ================= */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4 font-outfit">
              <Palette className="w-4 h-4 text-[#db922b] stroke-[2.2]" />
              <span>Aesthetics & Canvas Vibe</span>
            </h3>



            {/* Accent color picker */}
            <div className="mb-5 space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Personal Theme Accent Color</label>
              <div className="flex flex-wrap gap-2.5">
                {accentColorOptions.map(opt => {
                  const isActive = accentColor === opt.hex;
                  return (
                    <button
                      key={opt.hex}
                      onClick={() => handleSetAccentColor(opt.hex)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-90 border-2 ${
                        isActive ? 'border-slate-800 scale-105' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: opt.hex }}
                      title={opt.label}
                    >
                      {isActive && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Font selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Canvas Typing Typography</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'sans', label: 'Outfit Sans', class: 'font-sans' },
                  { id: 'serif', label: 'Cozy Serif', class: 'font-serif' },
                  { id: 'mono', label: 'Mono Workspace', class: 'font-mono' }
                ].map(opt => {
                  const isActive = fontTheme === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleSetFontTheme(opt.id)}
                      className={`py-2 rounded-lg border transition-all cursor-pointer text-[10px] font-bold active:scale-95 ${opt.class} ${
                        isActive
                          ? 'border-[#db922b] bg-[#fff7eb]/35 text-[#db922b]'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>



        {/* ================= CARD 3: DATABASE BACKUP & PORTABILITY ================= */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4 font-outfit">
              <Database className="w-4 h-4 text-[#db922b] stroke-[2.2]" />
              <span>Database & Safe Backup Portability</span>
            </h3>
            
            <p className="text-[10px] text-slate-400 font-bold mb-4 uppercase tracking-wide">Take your E2EE data anywhere. Export decrypted raw representations or E2EE backup blobs.</p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleBulkExport}
                className="py-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all flex flex-col items-center gap-1.5 text-slate-700 font-bold cursor-pointer active:scale-95 text-xs shadow-sm"
                title="Download backup"
              >
                <Download className="w-4 h-4 text-[#db922b] stroke-[2.2]" />
                <span>Export JSON</span>
              </button>

              <label className="py-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all flex flex-col items-center gap-1.5 text-slate-700 font-bold cursor-pointer active:scale-95 text-xs shadow-sm text-center justify-center">
                <Upload className="w-4 h-4 text-[#db922b] stroke-[2.2]" />
                <span>Import JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleBulkImport}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* ================= CARD 4: CLOUD SYNC & SYSTEM PREFERENCES ================= */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4 font-outfit">
              <RefreshCw className="w-4 h-4 text-[#db922b] stroke-[2.2]" />
              <span>Synchronization & System Preferences</span>
            </h3>

            <div className="space-y-4">
              
              {/* Auto Cloud sync */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800">Auto Save E2EE to Cloud</span>
                  <span className="text-[9.5px] text-slate-400 font-medium mt-0.5">Real-time sync to E2EE Firestore cluster</span>
                </div>
                <button
                  onClick={() => toggleSaveOption(!autoSaveCloud)}
                  className="p-1 text-slate-500 hover:text-slate-800 transition-all border-none bg-transparent cursor-pointer"
                >
                  {autoSaveCloud ? (
                    <ToggleRight className="w-9 h-9 text-[#db922b] stroke-[1.5]" />
                  ) : (
                    <ToggleLeft className="w-9 h-9 text-slate-350 stroke-[1.5]" />
                  )}
                </button>
              </div>

              {/* Bell notifications */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800">Celestial Notifications</span>
                  <span className="text-[9.5px] text-slate-400 font-medium mt-0.5">Play dynamic sound bell on reminders</span>
                </div>
                <button
                  onClick={() => toggleNotificationOption(!bellNotifications)}
                  className="p-1 text-slate-500 hover:text-slate-800 transition-all border-none bg-transparent cursor-pointer"
                >
                  {bellNotifications ? (
                    <ToggleRight className="w-9 h-9 text-[#db922b] stroke-[1.5]" />
                  ) : (
                    <ToggleLeft className="w-9 h-9 text-slate-350 stroke-[1.5]" />
                  )}
                </button>
              </div>

              {/* Auto Archive deleted notes */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800">Auto Archive in Trash</span>
                  <span className="text-[9.5px] text-slate-400 font-medium mt-0.5">Move notes to Archive before placing in Trash</span>
                </div>
                <button
                  onClick={() => toggleArchiveOption(!autoArchiveTrash)}
                  className="p-1 text-slate-500 hover:text-slate-800 transition-all border-none bg-transparent cursor-pointer"
                >
                  {autoArchiveTrash ? (
                    <ToggleRight className="w-9 h-9 text-[#db922b] stroke-[1.5]" />
                  ) : (
                    <ToggleLeft className="w-9 h-9 text-slate-350 stroke-[1.5]" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ================= DANGER ZONE BLOCK ================= */}
        <div className="bg-rose-50/50 border border-rose-200 rounded-2xl p-6 shadow-sm md:col-span-2 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-rose-100 rounded-xl text-rose-600 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5 stroke-[2.2]" />
            </span>
            <div>
              <h4 className="text-xs font-bold text-rose-800 uppercase tracking-widest font-outfit">Destructive Chamber Danger Zone</h4>
              <p className="text-[10px] text-rose-600/80 font-bold mt-0.5 uppercase tracking-wide">Warning: purging the safe cannot be reversed. All master passwords and E2EE folders will be permanently wiped.</p>
            </div>
          </div>

          <button
            onClick={handleWipeDatabase}
            className="px-5 py-3 rounded-xl border border-rose-200 bg-rose-100 hover:bg-rose-200 text-rose-600 text-xs font-extrabold transition-all active:scale-95 cursor-pointer shadow-sm shrink-0 uppercase tracking-wider"
          >
            Destroy My Safe Space
          </button>
        </div>

        {/* ================= DEVELOPER CREDIT FOOTER ================= */}
        <div className="md:col-span-2 mt-8 pt-6 border-t border-slate-200/80 flex flex-col items-center justify-center gap-1 select-none text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-outfit">
            Designed & Engineered By
          </div>
          <a 
            href="https://damindur.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="group flex items-center gap-1.5 text-xs font-black text-[#db922b] hover:text-[#b06f1d] transition-all no-underline mt-1 bg-[#fff7eb] px-3.5 py-2 rounded-full border border-[#db922b]/15 shadow-sm active:scale-95"
          >
            <span>🚀 Damindu Rathnayake</span>
            <span className="text-[9px] text-[#db922b]/60 group-hover:translate-x-0.5 transition-transform">↗</span>
          </a>
          <span className="text-[8px] text-slate-350 font-bold font-mono tracking-widest mt-1">
            WWW.DAMINDUR.COM
          </span>
        </div>

       </div>
     </div>
    </div>
   );
 }
