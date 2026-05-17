import React, { useState, useEffect, useRef } from 'react';
import { useNoteStore } from '../store/useNoteStore';
import { db } from '../firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { 
  Pin, 
  Star, 
  Archive, 
  Trash2, 
  ChevronLeft, 
  Bold, 
  Italic, 
  List, 
  CheckSquare, 
  Check,
  Code, 
  Highlighter, 
  Heading1, 
  Heading2, 
  Mic, 
  Square,
  Image as ImageIcon,
  Share2,
  Eye,
  BookOpen,
  Sparkles,
  RotateCcw,
  RotateCw,
  FileDown,
  Bell,
  History,
  Paperclip,
  Table,
  Palette,
  Play,
  Pause
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NoteEditor({ isModal = false }) {
  const {
    notes,
    decryptedNotes,
    folders,
    activeNoteId,
    updateNote,
    deleteNote,
    restoreVersion,
    fontTheme
  } = useNoteStore();

  const note = notes.find(n => n.id === activeNoteId);
  const decrypted = decryptedNotes[activeNoteId] || { title: '', content: '' };

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const isPreview = false;
  const [showShareTooltip, setShowShareTooltip] = useState(false);
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);

  // Reminders and Version states
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [reminderInput, setReminderInput] = useState('');
  const [showVersionsModal, setShowVersionsModal] = useState(false);

  // History stacks for Undo / Redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isUndoingRedoing, setIsUndoingRedoing] = useState(false);

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [activeFormats, setActiveFormats] = useState([]);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const editorRef = useRef(null);

  // Sync state with active note selection
  useEffect(() => {
    if (note) {
      const decTitle = decrypted.title || '';
      const decContent = decrypted.content || '';
      setTitle(decTitle);
      setContent(decContent);
      setAudioUrl(note.voiceUrl || null);
      
      if (editorRef.current) {
        let htmlVal = decContent;
        // Backward compatibility: if the note has legacy markdown text, convert it to HTML once for editing!
        if (decContent && !decContent.includes('<') && !decContent.includes('>')) {
          htmlVal = parseMarkdown(decContent);
        }
        editorRef.current.innerHTML = htmlVal;
      }
      
      // Reset history for new note selection
      setHistory([{ title: decTitle, content: decContent }]);
      setHistoryIndex(0);
    }
  }, [activeNoteId]);
  // Expose global window methods for inline table editor actions
  useEffect(() => {
    window.triggerNoteSave = () => {
      if (editorRef.current) {
        const html = editorRef.current.innerHTML;
        setContent(html);
        updateNote(activeNoteId, { content: html });
      }
    };

    // Track active formatting styles on selection change
    const handleSelectionChange = () => {
      const formats = [];
      try {
        if (document.queryCommandState('bold')) formats.push('Bold');
        if (document.queryCommandState('italic')) formats.push('Italic');
        
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const node = range.startContainer;
          const parent = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
          
          if (parent) {
            if (parent.closest('.checklist-text')) formats.push('Checklist');
            if (parent.closest('ul') || parent.closest('ol')) formats.push('List');
            if (parent.closest('table')) formats.push('Table');
            if (parent.closest('pre') || parent.closest('code')) formats.push('Code Block');
            
            const blockFormat = document.queryCommandValue('formatBlock');
            if (blockFormat && blockFormat.toLowerCase().includes('h1')) formats.push('Header 1');
            else if (parent.closest('h1')) formats.push('Header 1');
            
            if (blockFormat && blockFormat.toLowerCase().includes('h2')) formats.push('Header 2');
            else if (parent.closest('h2')) formats.push('Header 2');
            
          }
        }
      } catch (e) {}
      setActiveFormats(formats);
    };

    document.addEventListener('selectionchange', handleSelectionChange);

    window.addTableRow = (btn) => {
      const wrapper = btn.closest('.table-wrapper');
      if (!wrapper) return;
      const table = wrapper.querySelector('table');
      if (!table) return;
      const tbody = table.querySelector('tbody') || table;
      const headers = table.querySelectorAll('thead th');
      const colCount = headers.length || 1;
      
      const newTr = document.createElement('tr');
      newTr.className = "hover:bg-[#fffcf7] transition-colors border-b border-slate-100 last:border-b-0";
      for (let i = 0; i < colCount; i++) {
        const newTd = document.createElement('td');
        newTd.className = "px-4 py-2 border-r border-slate-100 last:border-r-0 break-words";
        newTd.setAttribute('contenteditable', 'true');
        newTd.innerHTML = 'New Cell';
        newTr.appendChild(newTd);
      }
      tbody.appendChild(newTr);
      
      if (editorRef.current) {
        setContent(editorRef.current.innerHTML);
        updateNote(activeNoteId, { content: editorRef.current.innerHTML });
      }
    };

    window.addTableColumn = (btn) => {
      const wrapper = btn.closest('.table-wrapper');
      if (!wrapper) return;
      const table = wrapper.querySelector('table');
      if (!table) return;
      
      const theadTr = table.querySelector('thead tr');
      if (theadTr) {
        const newTh = document.createElement('th');
        newTh.className = "px-4 py-2 font-black border-r border-[#ffe7cc] last:border-r-0";
        newTh.setAttribute('contenteditable', 'true');
        newTh.innerHTML = 'Heading';
        
        const oldLastTh = theadTr.querySelector('th:last-child');
        if (oldLastTh) oldLastTh.classList.remove('last:border-r-0');
        theadTr.appendChild(newTh);
      }

      const tbodyTrs = table.querySelectorAll('tbody tr');
      tbodyTrs.forEach(tr => {
        const newTd = document.createElement('td');
        newTd.className = "px-4 py-2 border-r border-slate-100 last:border-r-0 break-words";
        newTd.setAttribute('contenteditable', 'true');
        newTd.innerHTML = 'Cell';

        const oldLastTd = tr.querySelector('td:last-child');
        if (oldLastTd) oldLastTd.classList.remove('last:border-r-0');
        tr.appendChild(newTd);
      });

      if (editorRef.current) {
        setContent(editorRef.current.innerHTML);
        updateNote(activeNoteId, { content: editorRef.current.innerHTML });
      }
    };

    window.deleteTableRow = (btn) => {
      const wrapper = btn.closest('.table-wrapper');
      if (!wrapper) return;
      const table = wrapper.querySelector('table');
      if (!table) return;
      const tbody = table.querySelector('tbody') || table;
      const rows = tbody.querySelectorAll('tr');
      if (rows.length > 1) {
        rows[rows.length - 1].remove();
      }
      
      if (editorRef.current) {
        setContent(editorRef.current.innerHTML);
        updateNote(activeNoteId, { content: editorRef.current.innerHTML });
      }
    };

    window.deleteTableColumn = (btn) => {
      const wrapper = btn.closest('.table-wrapper');
      if (!wrapper) return;
      const table = wrapper.querySelector('table');
      if (!table) return;

      const theadTr = table.querySelector('thead tr');
      if (theadTr) {
        const ths = theadTr.querySelectorAll('th');
        if (ths.length > 1) {
          ths[ths.length - 1].remove();
          const newLastTh = theadTr.querySelector('th:last-child');
          if (newLastTh) newLastTh.classList.add('last:border-r-0');
        }
      }

      const tbodyTrs = table.querySelectorAll('tbody tr');
      tbodyTrs.forEach(tr => {
        const tds = tr.querySelectorAll('td');
        if (tds.length > 1) {
          tds[tds.length - 1].remove();
          const newLastTd = tr.querySelector('td:last-child');
          if (newLastTd) newLastTd.classList.add('last:border-r-0');
        }
      });

      if (editorRef.current) {
        setContent(editorRef.current.innerHTML);
        updateNote(activeNoteId, { content: editorRef.current.innerHTML });
      }
    };

    window.deleteTable = (btn) => {
      const wrapper = btn.closest('.table-wrapper');
      if (!wrapper) return;
      wrapper.remove();
      
      if (editorRef.current) {
        setContent(editorRef.current.innerHTML);
        updateNote(activeNoteId, { content: editorRef.current.innerHTML });
      }
    };
  }, [activeNoteId]);
  // Debounced auto-save effect with Smart Auto-Title Generator
  useEffect(() => {
    if (!activeNoteId || !note) return;
    
    // Check if anything actually changed to prevent loops
    if (title === decrypted.title && content === decrypted.content) return;

    const timer = setTimeout(() => {
      let resolvedTitle = title.trim();
      let autoGenerated = false;
      
      // Auto-generate title if explicitly left empty by the user
      if (!resolvedTitle) {
        const cleanContent = content
          .replace(/<[^>]*>/g, '') // Strip HTML tags
          .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
          .replace(/\s+/g, ' ') // Collapse whitespaces
          .trim();
        
        if (cleanContent) {
          const words = cleanContent.split(' ');
          const titleCandidate = words.slice(0, 5).join(' ');
          resolvedTitle = titleCandidate.length > 25 
            ? titleCandidate.slice(0, 25).trim() + "..." 
            : titleCandidate;
        } else {
          resolvedTitle = "New Spark ✨";
        }
        autoGenerated = true;
      }

      updateNote(activeNoteId, { title: resolvedTitle, content });
      if (autoGenerated) {
        setTitle(resolvedTitle);
      }
      
      // Add to history stack for undo/redo if not in intermediate states
      if (!isUndoingRedoing) {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push({ title: resolvedTitle, content });
        if (newHistory.length > 30) newHistory.shift();
        
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      }
      setIsUndoingRedoing(false);
    }, 80);

    return () => clearTimeout(timer);
  }, [title, content]);



  if (!note) {
    return (
      <div className="hidden md:flex flex-col items-center justify-center h-full text-center p-8 bg-white/40 rounded-[28px] border-2 border-dashed border-purple-200">
        <div className="w-20 h-20 rounded-full bg-cute-purple flex items-center justify-center mb-4 animate-float border-2 border-white shadow-sm">
          <Sparkles className="w-10 h-10 text-cute-purple-dark fill-purple-300" />
        </div>
        <h3 className="text-md font-black text-slate-800 font-outfit">Open Your Celestial Journal 🛸</h3>
        <p className="text-xs text-slate-500 max-w-xs mt-2 leading-relaxed font-semibold">
          Select an encrypted thought from the list or click the floaty "+" button to capture a cosmic spark! Client-side decryption happens locally in RAM.
        </p>
      </div>
    );
  }

  // --- UNDO / REDO ---
  const handleUndo = () => {
    if (historyIndex > 0) {
      setIsUndoingRedoing(true);
      const prevIndex = historyIndex - 1;
      const state = history[prevIndex];
      setTitle(state.title);
      setContent(state.content);
      setHistoryIndex(prevIndex);
      
      if (editorRef.current) {
        editorRef.current.innerHTML = state.content;
      }
      
      updateNote(activeNoteId, { title: state.title, content: state.content });
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setIsUndoingRedoing(true);
      const nextIndex = historyIndex + 1;
      const state = history[nextIndex];
      setTitle(state.title);
      setContent(state.content);
      setHistoryIndex(nextIndex);
      
      if (editorRef.current) {
        editorRef.current.innerHTML = state.content;
      }
      
      updateNote(activeNoteId, { title: state.title, content: state.content });
    }
  };

  // --- RICH FORMATTING UTILITIES & WYSIWYG ---
  const executeFormatCommand = (command, value = null) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();

    if (command === 'createTable') {
      const tableHtml = `
        <div class="table-wrapper" contenteditable="false">
          <div class="table-controls">
            <span style="font-weight:900;color:#db922b;margin-right:4px;">📊 Table Assistant:</span>
            <button onclick="window.addTableRow(this)">+ Row</button>
            <button onclick="window.addTableColumn(this)">+ Col</button>
            <button class="btn-danger" onclick="window.deleteTableRow(this)">- Row</button>
            <button class="btn-danger" onclick="window.deleteTableColumn(this)">- Col</button>
            <button class="btn-danger" onclick="window.deleteTable(this)" style="margin-left:auto;">✕ Delete Table</button>
          </div>
          <div style="overflow-x:auto;">
            <table class="min-w-full border-collapse text-[11px] text-slate-700">
              <thead class="bg-[#fff7eb] border-b border-[#ffe0bb]">
                <tr>
                  <th class="px-4 py-2 font-black border-r border-[#ffe7cc]" contenteditable="true">Header 1</th>
                  <th class="px-4 py-2 font-black last:border-r-0" contenteditable="true">Header 2</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr>
                  <td class="px-4 py-2 border-r border-slate-100" contenteditable="true">Cell 1</td>
                  <td class="px-4 py-2 last:border-r-0" contenteditable="true">Cell 2</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <p>&nbsp;</p>
      `;
      document.execCommand('insertHTML', false, tableHtml);
    } else if (command === 'createChecklist') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const node = range.startContainer;
        const parent = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
        const existingChecklistRow = parent.closest('.checklist-row');
        
        if (existingChecklistRow) {
          // TOGGLE OFF: Convert checklist row back to a normal paragraph!
          const textSpan = existingChecklistRow.querySelector('.checklist-text');
          const currentText = textSpan ? textSpan.innerHTML : "";
          
          const p = document.createElement('p');
          p.innerHTML = currentText || "&nbsp;";
          
          existingChecklistRow.parentNode.replaceChild(p, existingChecklistRow);
          
          // Focus the paragraph
          setTimeout(() => {
            p.focus();
            // Move cursor to end of text
            const newRange = document.createRange();
            newRange.selectNodeContents(p);
            newRange.collapse(false);
            selection.removeAllRanges();
            selection.addRange(newRange);
            window.triggerNoteSave();
          }, 10);
          
          return;
        }
      }

      // TOGGLE ON: Insert a new checklist row
      const checklistHtml = `
        <div class="checklist-row" contenteditable="false">
          <div class="flex items-center gap-2.5 flex-1">
            <input type="checkbox" class="rounded border-purple-300 text-purple-600 accent-purple-500 w-4 h-4 cursor-pointer" onclick="this.setAttribute('checked', this.checked ? 'checked' : ''); window.triggerNoteSave();">
            <span class="checklist-text text-slate-700 font-normal text-xs outline-none flex-1" contenteditable="true" placeholder="To-do item..." style="min-width: 100px;"></span>
          </div>
          <button class="checklist-delete-btn cursor-pointer p-1 rounded border-none outline-none select-none flex items-center justify-center w-5 h-5 text-[10px] font-bold" onclick="this.closest('.checklist-row').remove(); window.triggerNoteSave();" title="Delete item">
            ✕
          </button>
        </div>
        <p>&nbsp;</p>
      `;
      document.execCommand('insertHTML', false, checklistHtml);
      
      // Auto focus the newly inserted checklist's editable text!
      setTimeout(() => {
        if (editorRef.current) {
          const editableChecklists = editorRef.current.querySelectorAll('.checklist-text');
          if (editableChecklists.length > 0) {
            const lastOne = editableChecklists[editableChecklists.length - 1];
            lastOne.focus();
          }
        }
      }, 20);
    } else if (command === 'codeBlock') {
      let inCode = false;
      try {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const node = selection.getRangeAt(0).startContainer;
          const parent = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
          if (parent && parent.closest('pre')) inCode = true;
        }
      } catch(e) {}
      
      if (inCode) {
        document.execCommand('formatBlock', false, '<p>'); // toggle off
      } else {
        const codeHtml = `
          <pre class="bg-slate-50 p-4 rounded-2xl font-mono text-[10.5px] text-slate-800 my-3 border border-slate-200/60 overflow-x-auto leading-relaxed" contenteditable="true"><code>// Type code here...</code></pre>
          <p>&nbsp;</p>
        `;
        document.execCommand('insertHTML', false, codeHtml);
      }
    } else if (command === 'formatBlock') {
      let currentBlock = document.queryCommandValue('formatBlock');
      if (currentBlock) currentBlock = currentBlock.toLowerCase().replace(/<|>/g, '');
      const targetBlock = value.replace(/<|>/g, '');
      
      let domBlock = null;
      try {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const node = selection.getRangeAt(0).startContainer;
          const parent = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
          if (parent) {
            if (parent.closest('h1')) domBlock = 'h1';
            else if (parent.closest('h2')) domBlock = 'h2';
          }
        }
      } catch(e) {}
      
      if (currentBlock === targetBlock || domBlock === targetBlock) {
        document.execCommand('formatBlock', false, '<p>'); // toggle off
      } else {
        document.execCommand('formatBlock', false, value); // toggle on
      }
    } else {
      document.execCommand(command, false, value);
    }

    const updatedHtml = editor.innerHTML;
    setContent(updatedHtml);
    updateNote(activeNoteId, { content: updatedHtml });
  };

  const handleInput = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const html = editor.innerHTML;
    setContent(html);
  };

  const handleBlur = () => {
    const editor = editorRef.current;
    if (!editor) return;
    updateNote(activeNoteId, { content: editor.innerHTML });
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    
    if (html) {
      const template = document.createElement('div');
      template.innerHTML = html;
      
      // Clean up all background stylings and dark foreground text colors from pasted elements
      const elements = template.getElementsByTagName('*');
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        el.style.backgroundColor = '';
        el.style.background = '';
        el.style.color = '';
        el.removeAttribute('bgcolor');
      }
      
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        
        const fragment = range.createContextualFragment(template.innerHTML);
        range.insertNode(fragment);
        
        // Move selection cursor to the end of inserted content
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        
        if (editorRef.current) {
          const newHtml = editorRef.current.innerHTML;
          setContent(newHtml);
          updateNote(activeNoteId, { content: newHtml });
        }
      }
    } else if (text) {
      const formattedText = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\r?\n/g, '<br>');
        
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        
        const fragment = range.createContextualFragment(formattedText);
        range.insertNode(fragment);
        
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        
        if (editorRef.current) {
          const newHtml = editorRef.current.innerHTML;
          setContent(newHtml);
          updateNote(activeNoteId, { content: newHtml });
        }
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const container = range.startContainer;
        const activeEl = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
        
        const checklistText = activeEl.closest('.checklist-text');
        if (checklistText) {
          e.preventDefault();
          const currentRow = checklistText.closest('.checklist-row');
          if (currentRow) {
            // Create a brand new checklist row!
            const newRow = document.createElement('div');
            newRow.className = "checklist-row";
            newRow.setAttribute('contenteditable', 'false');
            
            newRow.innerHTML = `
              <div class="flex items-center gap-2.5 flex-1">
                <input type="checkbox" class="rounded border-purple-300 text-purple-600 accent-purple-500 w-4 h-4 cursor-pointer" onclick="this.setAttribute('checked', this.checked ? 'checked' : ''); window.triggerNoteSave();">
                <span class="checklist-text text-slate-700 font-normal text-xs outline-none flex-1" contenteditable="true" placeholder="To-do item..." style="min-width: 100px;"></span>
              </div>
              <button class="checklist-delete-btn cursor-pointer p-1 rounded border-none outline-none select-none flex items-center justify-center w-5 h-5 text-[10px] font-bold" onclick="this.closest('.checklist-row').remove(); window.triggerNoteSave();" title="Delete item">
                ✕
              </button>
            `;
            
            // Insert the new row after the current row!
            currentRow.parentNode.insertBefore(newRow, currentRow.nextSibling);
            
            // Focus the new row's editable span!
            const newSpan = newRow.querySelector('.checklist-text');
            if (newSpan) {
              setTimeout(() => {
                newSpan.focus();
              }, 10);
            }
            
            window.triggerNoteSave();
          }
        }
      }
    }

    if (e.key === 'Backspace') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const container = range.startContainer;
        
        let blockToDelete = null;
        if (container.nodeType === Node.TEXT_NODE) {
          const text = container.textContent;
          if (range.startOffset === 0 || text.trim() === '') {
            blockToDelete = container.parentElement.closest('[contenteditable="false"]');
          }
        } else {
          const offset = range.startOffset;
          const child = container.childNodes[offset - 1];
          if (child && child.nodeType === Node.ELEMENT_NODE && child.getAttribute('contenteditable') === 'false') {
            blockToDelete = child;
          }
        }
        
        if (blockToDelete) {
          e.preventDefault();
          blockToDelete.remove();
          
          if (editorRef.current) {
            setContent(editorRef.current.innerHTML);
            updateNote(activeNoteId, { content: editorRef.current.innerHTML });
          }
        }
      }
    }
  };

  // --- AUDIO VOICE RECORDING FLOW ---
  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Microphone recording is not supported in this environment.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Convert Blob to self-contained Base64 Data URL
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = reader.result;
          
          // Generate a beautiful, completely self-contained audio player block!
          const dateStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const audioBlockHtml = `
            <div><br></div>
            <div class="audio-block border border-orange-200 dark:border-white/10 bg-[#fffdf9] dark:bg-[#1a1a22] rounded-2xl p-3.5 my-4 shadow-sm flex items-center gap-3 select-none" contenteditable="false" style="max-width: 450px; display: flex !important; align-items: center !important; gap: 12px !important; margin: 16px 0 !important;">
              <div class="w-8 h-8 rounded-full bg-orange-100 dark:bg-amber-950/40 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0 font-bold">🎙️</div>
              <div style="flex: 1; min-width: 0;">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                  <span style="font-size: 10px; font-weight: 900; color: #1e293b;" class="dark:text-slate-200">Voice Note (${dateStr})</span>
                </div>
                <audio src="${base64data}" controls class="w-full h-8 mt-1 scale-95 origin-left" style="outline: none;" />
              </div>
              <button 
                class="p-1 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded transition-all cursor-pointer border-none bg-transparent flex items-center justify-center" 
                onclick="this.closest('.audio-block').remove(); window.triggerNoteSave();"
                title="Delete voice note"
                style="padding: 4px; color: #94a3b8; background: transparent; border: none; cursor: pointer;"
              >
                ✕
              </button>
            </div>
            <div><br></div>
          `;
          
          // Insert the audio block HTML directly at current cursor selection!
          if (editorRef.current) {
            editorRef.current.focus();
            
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              range.deleteContents();
              
              const fragment = range.createContextualFragment(audioBlockHtml);
              range.insertNode(fragment);
              
              // Collapse range to end and update caretaker position
              range.collapse(false);
              selection.removeAllRanges();
              selection.addRange(range);
            } else {
              // Fallback: append to end of editor
              editorRef.current.innerHTML += audioBlockHtml;
            }
            
            // Save note content changes
            const updatedHtml = editorRef.current.innerHTML;
            setContent(updatedHtml);
            updateNote(activeNoteId, { content: updatedHtml });
          }
        };

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setRecordDuration(0);

      timerRef.current = setInterval(() => {
        setRecordDuration(prev => prev + 1);
      }, 1000);

    } catch (e) {
      console.error(e);
      alert("Microphone permission denied or device busy.");
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setRecordDuration(prev => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      clearInterval(timerRef.current);
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const deleteVoiceNote = () => {
    setAudioUrl(null);
    updateNote(activeNoteId, { voiceUrl: null, voiceDuration: 0 });
  };

  // --- EXPORTS & SHARE ---
  const handleExportText = () => {
    const element = document.createElement("a");
    const file = new Blob([`# ${title}\n\n${content}`], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${title.replace(/\s+/g, '-').toLowerCase()}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleShare = async () => {
    // 1. Generate unique share ID and URL synchronously
    const shareId = doc(collection(db, 'public_shares')).id;
    const shareUrl = window.location.origin + window.location.pathname + "?shared=" + shareId;
    
    // 2. Perform copy immediately in user-triggered click thread to bypass iOS/Android/Webview security blocks!
    let copySuccessful = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
        copySuccessful = true;
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) copySuccessful = true;
      }
    } catch (err) {
      console.warn("Direct clipboard API write failed, trying fallback:", err);
      // Inline Fallback
      try {
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        copySuccessful = true;
      } catch (fallbackErr) {
        console.error("All copy strategies failed:", fallbackErr);
      }
    }

    if (copySuccessful) {
      setShowShareTooltip(true);
      setTimeout(() => setShowShareTooltip(false), 3000);
    } else {
      alert("Please copy this link manually: " + shareUrl);
    }

    // 3. Save decrypted copy in background Firestore without showing confusing transcribing text loaders!
    try {
      await setDoc(doc(db, 'public_shares', shareId), {
        title,
        content,
        color: note.color || 'default',
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      console.error("Background public Firestore sync failed:", e);
    }
  };

  // Simple Markdown parser mock
  const parseMarkdown = (txt) => {
    if (!txt) return "";
    let html = txt
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // PARSE MARKDOWN TABLES
    const tableRegex = /^\|[^\n]+\|\r?\n\|[ \t]*[-:|]+[ \t]*\|(?:\r?\n\|[^\n]+\|)+/gm;
    html = html.replace(tableRegex, (tableBlock) => {
      const lines = tableBlock.trim().split(/\r?\n/);
      if (lines.length < 2) return tableBlock;

      // Extract headers from first line
      const headers = lines[0]
        .split('|')
        .slice(1, -1)
        .map(h => h.trim());

      // Extract rows (skipping separator line at index 1)
      const rows = lines.slice(2).map(line => {
        return line
          .split('|')
          .slice(1, -1)
          .map(cell => cell.trim());
      });

      // Build premium HTML table matching warm Apple aesthetic
      let tableHtml = '<div class="overflow-x-auto my-4 rounded-2xl border border-[#ffe0bb] shadow-sm bg-white max-w-full"><table class="min-w-full border-collapse text-[11px] text-slate-700">';
      
      // Header
      tableHtml += '<thead class="bg-[#fff7eb] border-b border-[#ffe0bb]">';
      tableHtml += '<tr>';
      headers.forEach(h => {
        tableHtml += `<th class="px-4 py-2.5 font-black text-slate-700 text-left uppercase tracking-wider select-none border-r border-[#ffe7cc] last:border-r-0">${h}</th>`;
      });
      tableHtml += '</tr></thead>';

      // Body
      tableHtml += '<tbody class="divide-y divide-slate-150 bg-white text-slate-655 font-semibold">';
      rows.forEach(row => {
        tableHtml += '<tr class="hover:bg-[#fffcf7] transition-colors border-b border-slate-100 last:border-b-0">';
        for (let i = 0; i < headers.length; i++) {
          const cellValue = row[i] || '';
          tableHtml += `<td class="px-4 py-2 border-r border-slate-100 last:border-r-0 break-words">${cellValue}</td>`;
        }
        tableHtml += '</tr>';
      });
      tableHtml += '</tbody></table></div>';

      return tableHtml;
    });

    html = html.replace(/^# (.*?)$/gm, '<h1 class="text-xl font-black font-outfit text-slate-800 my-4">$1</h1>');
    html = html.replace(/^## (.*?)$/gm, '<h2 class="text-lg font-extrabold font-outfit text-slate-800 my-3">$1</h2>');
    
    html = html.replace(/^- \[ \] (.*?)$/gm, '<div class="flex items-center gap-2 text-xs my-1.5"><input type="checkbox" disabled class="rounded border-purple-300 text-purple-600 accent-purple-500 w-4 h-4"> <span class="text-slate-700 font-semibold">$1</span></div>');
    html = html.replace(/^- \[x\] (.*?)$/gm, '<div class="flex items-center gap-2 text-xs my-1.5"><input type="checkbox" disabled checked class="rounded border-purple-300 text-purple-600 accent-purple-500 w-4 h-4"> <span class="line-through text-slate-400 font-semibold">$1</span></div>');

    html = html.replace(/^- (.*?)$/gm, '<li class="text-xs text-slate-700 font-semibold ml-4 list-disc my-1">$1</li>');

    html = html.replace(/```([\s\S]*?)```/gm, '<pre class="bg-slate-100 p-3.5 rounded-2xl font-mono text-[10px] text-slate-800 my-3 border border-slate-200/50 overflow-x-auto leading-relaxed">$1</pre>');
    html = html.replace(/`([^`\n]+)`/g, '<code class="bg-purple-100/60 text-purple-700 px-1.5 py-0.5 rounded font-mono text-[10px]">$1</code>');

    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/==([^=]+)==/g, '<mark class="bg-purple-200/60 text-purple-900 px-1 rounded font-bold">$1</mark>');

    return html;
  };

  const colors = ['default', 'purple', 'pink', 'blue', 'mint', 'peach'];

  // Pastel Color Map styles (macOS Apple Notes styled textured backings)
  const getEditorColorClass = (color) => {
    if (color === 'pink') return 'bg-[#fff9fa] dark:bg-[#221316]/90 text-slate-800 dark:text-slate-100';
    if (color === 'blue') return 'bg-[#f4f8ff] dark:bg-[#0c1322]/90 text-slate-800 dark:text-slate-100';
    if (color === 'purple') return 'bg-[#faf7ff] dark:bg-[#140e21]/90 text-slate-800 dark:text-slate-100';
    if (color === 'mint') return 'bg-[#f5fbf7] dark:bg-[#0c1812]/90 text-slate-800 dark:text-slate-100';
    if (color === 'peach') return 'bg-[#fffbf4] dark:bg-[#201509]/90 text-slate-800 dark:text-slate-100';
    return 'bg-[#fbfaf7] dark:bg-[#0c0c0e]/95 text-slate-800 dark:text-slate-100'; // Classic warm Apple Notes yellow-cream paper tint
  };

  return (
    <div className={isModal 
      ? "flex flex-col h-full w-full bg-transparent font-poppins min-h-0"
      : `fixed inset-0 z-40 md:relative md:inset-auto md:flex flex-col h-full bg-[#fbfaf7] dark:bg-[#0c0c0e] md:bg-transparent p-4 md:p-0 font-poppins transition-transform ${
          activeNoteId ? 'flex' : 'hidden'
        }`
    }>
      
      {/* Mobile Back Header Row */}
      {!isModal && (
        <div className="flex md:hidden items-center justify-between pb-2 border-b border-[#e5e5ea] mb-3 select-none">
          <button
            onClick={() => useNoteStore.setState({ activeNoteId: null })}
            className="flex items-center gap-1 text-[#db922b] font-bold text-xs cursor-pointer hover:underline"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
            <span>Notes</span>
          </button>

          <span className="text-[9px] bg-[#fff7eb] text-[#db922b] font-bold px-2 py-0.5 rounded border border-[#ffe2c4]">
            ✨ Cloud Synced
          </span>
        </div>
      )}

      {/* Editor Panel Board */}
      <div className={`flex-1 flex flex-col min-h-0 overflow-hidden md:rounded-none border-t md:border-t-0 p-5 md:p-6 shadow-sm md:shadow-none relative transition-colors duration-300 ${getEditorColorClass(note.color)}`}>
        
        {/* TOP CONTROLS ROW */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#e5e5ea]/85 mb-4 select-none">
          {/* Folder catalog selector */}
          {/* Custom Folder catalog selector */}
          <div className="relative flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Catalog:</span>
            <button
              onClick={() => setShowFolderDropdown(!showFolderDropdown)}
              className="text-xs font-black text-[#db922b] hover:text-[#db922b]/80 cursor-pointer transition-all active:scale-95 flex items-center gap-1 select-none"
            >
              <span>📁 {folders.find(f => f.id === note.folderId)?.name || 'Uncategorized'}</span>
            </button>

            <AnimatePresence>
              {showFolderDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowFolderDropdown(false)} 
                  />
                  
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 5 }}
                    className="absolute left-12 top-6 w-44 bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl shadow-xl p-1 z-50 select-none text-xs font-semibold"
                  >
                    <button
                      onClick={() => {
                        updateNote(activeNoteId, { folderId: null });
                        setShowFolderDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl font-bold transition-all flex items-center justify-between cursor-pointer ${
                        !note.folderId
                          ? 'bg-[#fff7eb] text-[#db922b]'
                          : 'text-slate-650 hover:bg-slate-50'
                      }`}
                    >
                      <span>📁 Uncategorized</span>
                      {!note.folderId && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>
                    
                    {folders.map(f => (
                      <button
                        key={f.id}
                        onClick={() => {
                          updateNote(activeNoteId, { folderId: f.id });
                          setShowFolderDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl font-bold transition-all flex items-center justify-between cursor-pointer ${
                          note.folderId === f.id
                            ? 'bg-[#fff7eb] text-[#db922b]'
                            : 'text-slate-650 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate">{f.name}</span>
                        {note.folderId === f.id && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Quick Action stamps */}
          <div className="flex flex-wrap items-center gap-1">

            {/* Pin, Star */}
            <button
              onClick={() => updateNote(activeNoteId, { isPinned: !note.isPinned })}
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                note.isPinned
                  ? 'bg-[#fff7eb] dark:bg-amber-950/40 border-[#db922b] text-[#db922b]'
                  : 'bg-white hover:bg-slate-50 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 border-slate-250 dark:border-white/5'
              }`}
            >
              <Pin className={`w-3.5 h-3.5 ${note.isPinned ? 'fill-[#db922b] text-[#db922b]' : ''}`} />
            </button>

            <button
              onClick={() => updateNote(activeNoteId, { isFavorite: !note.isFavorite })}
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                note.isFavorite
                  ? 'bg-[#ffeef0] dark:bg-rose-950/40 border-[#ff2d55] text-[#ff2d55]'
                  : 'bg-white hover:bg-slate-50 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 border-slate-250 dark:border-white/5'
              }`}
              title={note.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            >
              <Star className={`w-3.5 h-3.5 ${note.isFavorite ? 'fill-[#ff2d55] text-[#ff2d55]' : ''}`} />
            </button>

            {/* Archive / Unarchive */}
            <button
              onClick={() => updateNote(activeNoteId, { isArchived: !note.isArchived })}
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                note.isArchived
                  ? 'bg-[#fff7eb] dark:bg-amber-950/40 border-[#db922b] text-[#db922b]'
                  : 'bg-white hover:bg-slate-50 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 border-slate-250 dark:border-white/5'
              }`}
              title={note.isArchived ? "Unarchive Note" : "Archive Note"}
            >
              <Archive className={`w-3.5 h-3.5 ${note.isArchived ? 'fill-[#db922b] text-[#db922b]' : ''}`} />
            </button>

            {/* E2EE Reminders Bell key */}
            <button
              onClick={() => {
                setShowReminderPicker(!showReminderPicker);
                setShowColorPicker(false);
                if (note.reminderTime) {
                  const dateLocal = new Date(new Date(note.reminderTime).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                  setReminderInput(dateLocal);
                }
              }}
              title="Set Reminder"
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all cursor-pointer shadow-sm relative ${
                note.reminderTime
                  ? 'bg-[#f3f0ff] dark:bg-purple-950/40 border-[#af52de] text-[#af52de]'
                  : 'bg-white hover:bg-slate-50 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 border-slate-255 dark:border-white/5'
              }`}
            >
              <Bell className="w-3.5 h-3.5 stroke-[2.2]" />
              {note.reminderTime && (
                <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-[#af52de] border border-white animate-pulse" />
              )}
            </button>

            {/* Note Colors circle Palette */}
            <button
              onClick={() => {
                setShowColorPicker(!showColorPicker);
                setShowReminderPicker(false);
              }}
              title="Change note color"
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all cursor-pointer shadow-sm relative ${
                showColorPicker
                  ? 'bg-[#fff7eb] dark:bg-amber-950/40 border-[#db922b] text-[#db922b]'
                  : 'bg-white hover:bg-slate-50 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/5'
              }`}
            >
              <Palette className="w-3.5 h-3.5 stroke-[2.2]" />
            </button>
          </div>
        </div>

        {/* TYPING CANVAS AREA */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Note Title Input */}
          <div className="border-b border-[#db922b]/15 pb-2 mb-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => {
                if (!title.trim()) {
                  const cleanContent = content
                    .replace(/<[^>]*>/g, '') // Strip HTML
                    .replace(/&nbsp;/g, ' ') 
                    .replace(/\s+/g, ' ') 
                    .trim();
                  
                  let resolvedTitle = "";
                  if (cleanContent) {
                    const words = cleanContent.split(' ');
                    const titleCandidate = words.slice(0, 5).join(' ');
                    resolvedTitle = titleCandidate.length > 25 
                      ? titleCandidate.slice(0, 25).trim() + "..." 
                      : titleCandidate;
                  } else {
                    resolvedTitle = "New Spark ✨";
                  }
                  setTitle(resolvedTitle);
                  updateNote(activeNoteId, { title: resolvedTitle });
                }
              }}
              disabled={isPreview}
              placeholder="spark title..."
              className="w-full text-[26px] font-black bg-transparent border-none outline-none text-slate-800 dark:text-white font-outfit placeholder-slate-400/70 focus:placeholder-slate-400 dark:focus:placeholder-slate-500 disabled:opacity-85 tracking-tight"
            />
          </div>

          {/* Note Tags Row */}
          {note && (
            <div className="flex flex-wrap items-center gap-1.5 mb-4 select-none">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                🏷️ Tags:
              </span>
              
              {(note.tags || []).map(tag => (
                <span 
                  key={tag}
                  className="text-[9px] font-black bg-[#fff7eb] dark:bg-amber-950/30 text-[#db922b] px-2.5 py-0.5 rounded-full border border-[#ffe2c4] dark:border-amber-500/20 flex items-center gap-1"
                >
                  <span>#{tag}</span>
                  {!isPreview && (
                    <button
                      onClick={() => {
                        const newTags = (note.tags || []).filter(t => t !== tag);
                        updateNote(activeNoteId, { tags: newTags });
                      }}
                      className="hover:text-red-500 font-black focus:outline-none cursor-pointer text-[8px] border-none bg-transparent p-0 leading-none"
                    >
                      ✕
                    </button>
                  )}
                </span>
              ))}
              
              {!isPreview && (
                <input
                  type="text"
                  placeholder="+ Tag..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      const newTag = e.target.value.trim().toLowerCase().replace(/#/g, '');
                      if (newTag) {
                        const currentTags = note.tags || [];
                        if (!currentTags.includes(newTag)) {
                          const newTags = [...currentTags, newTag];
                          updateNote(activeNoteId, { tags: newTags });
                          
                          const { tags: globalTags } = useNoteStore.getState();
                          if (!globalTags.includes(newTag)) {
                            useNoteStore.setState({ tags: [...globalTags, newTag] });
                          }
                        }
                      }
                      e.target.value = '';
                    }
                  }}
                  className="text-[9px] font-bold bg-slate-100 hover:bg-slate-200/60 focus:bg-white text-slate-700 placeholder-slate-400 focus:outline-none px-2 py-0.5 rounded-full border border-transparent focus:border-[#db922b]/30 w-16 focus:w-24 transition-all"
                />
              )}
            </div>
          )}

          {/* Stamp Formatting Bar (Apple Style Frosted Pill) */}
          {!isPreview && (
            <div className="flex flex-wrap items-center gap-0.5 p-1 bg-white/95 dark:bg-[#151518]/95 border border-[#db922b]/20 dark:border-white/5 select-none shadow-md shadow-[#db922b]/5 dark:shadow-none rounded-2xl mb-5 max-w-max backdrop-blur-sm">
              {[
                { label: 'Bold', action: () => executeFormatCommand('bold'), icon: Bold },
                { label: 'Italic', action: () => executeFormatCommand('italic'), icon: Italic },
                { label: 'Header 1', action: () => executeFormatCommand('formatBlock', '<h1>'), icon: Heading1 },
                { label: 'Header 2', action: () => executeFormatCommand('formatBlock', '<h2>'), icon: Heading2 },
                { label: 'List', action: () => executeFormatCommand('insertUnorderedList'), icon: List },
                { label: 'Checklist', action: () => executeFormatCommand('createChecklist'), icon: CheckSquare },
                { label: 'Code Block', action: () => executeFormatCommand('codeBlock'), icon: Code },
                { label: 'Table', action: () => executeFormatCommand('createTable'), icon: Table }
              ].map(tool => {
                const isActive = activeFormats.includes(tool.label);
                return (
                  <button
                    key={tool.label}
                    onClick={tool.action}
                    className={`p-2 rounded-xl transition-all hover:scale-105 active:scale-95 cursor-pointer border ${
                      isActive 
                        ? 'bg-[#fff7eb] dark:bg-amber-950/40 border-[#db922b]/30 dark:border-amber-500/25 text-[#db922b]' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-[#db922b] hover:bg-[#fff7eb] dark:hover:bg-amber-950/30 border-transparent hover:border-[#db922b]/15'
                    }`}
                    title={tool.label}
                  >
                    <tool.icon className="w-3.5 h-3.5 stroke-[2.3]" />
                  </button>
                );
              })}
              
              <div className="w-px h-5 bg-[#db922b]/20 mx-0.5" />
              
              {/* Voice Recording Dictation button */}
              <button
                onClick={() => isRecording ? stopRecording() : startRecording()}
                className={`p-2 rounded-xl transition-all cursor-pointer border hover:scale-105 active:scale-95 ${
                  isRecording 
                    ? 'bg-red-600 border-red-600 text-white shadow-md animate-pulse' 
                    : 'text-red-600 bg-red-50/60 hover:bg-red-100/80 border-red-100 hover:border-red-200 shadow-sm'
                }`}
                title={isRecording ? "Stop Dictation" : "Record Voice Note"}
              >
                <Mic className={`w-3.5 h-3.5 stroke-[2.3] ${isRecording ? 'fill-white animate-ping text-white' : 'fill-red-50 text-red-600'}`} />
              </button>
            </div>
          )}

          {/* Active Audio / Transcribing HUD Deck */}
          {(audioUrl || isRecording || isTranscribing) && (
            <div className="flex flex-wrap items-center gap-2 mb-4 p-2 bg-white/85 dark:bg-[#1a1a22]/85 border border-[#db922b]/15 dark:border-white/5 rounded-xl shadow-sm backdrop-blur-sm max-w-max select-none">
              {isRecording && (
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-100 flex-wrap">
                  <span className={`w-2.5 h-2.5 rounded-full bg-red-600 ${isPaused ? '' : 'animate-ping'}`} />
                  <span className="text-[10.5px] font-mono font-bold text-red-600 dark:text-red-405">
                    {isPaused ? "Paused: " : "Recording: "}{Math.floor(recordDuration / 60)}:{( '0' + recordDuration % 60).slice(-2)}
                  </span>
                  
                  <div className="flex gap-0.5 items-end h-2.5 px-1">
                    <span className={`w-0.5 bg-red-400 rounded ${isPaused ? 'h-0.5' : 'animate-pulse h-1.5'}`} />
                    <span className={`w-0.5 bg-red-400 rounded ${isPaused ? 'h-0.5' : 'animate-pulse h-2.5'}`} style={{ animationDelay: '0.1s' }} />
                    <span className={`w-0.5 bg-red-400 rounded ${isPaused ? 'h-0.5' : 'animate-pulse h-1'}`} style={{ animationDelay: '0.2s' }} />
                  </div>

                  {/* Pause / Resume Button */}
                  <button 
                    onClick={isPaused ? resumeRecording : pauseRecording}
                    className="p-1 rounded-md bg-red-100 text-red-700 hover:bg-red-200 cursor-pointer ml-1.5 shadow-sm active:scale-95 border-none flex items-center justify-center"
                    title={isPaused ? "Resume Recording" : "Pause Recording"}
                  >
                    {isPaused ? <Play className="w-2.5 h-2.5 fill-red-700 stroke-none" /> : <Pause className="w-2.5 h-2.5 fill-red-700 stroke-none" />}
                  </button>

                  {/* Done / Insert Button */}
                  <button 
                    onClick={stopRecording}
                    className="p-1 rounded-md bg-red-600 text-white hover:bg-red-700 cursor-pointer ml-1 shadow-sm active:scale-95 border-none flex items-center justify-center"
                    title="Done & Insert"
                  >
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </button>
                </div>
              )}

              {audioUrl && !isRecording && (
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#fff7eb]/80 dark:bg-amber-950/20 rounded-lg">
                  <span className="text-[10.5px] font-bold text-[#db922b]">🎙️ Dictation Log</span>
                  <audio src={audioUrl} controls className="h-6 w-36 text-xs scale-90" />
                  <button
                    onClick={deleteVoiceNote}
                    className="text-[10px] text-rose-600 dark:text-rose-400 font-extrabold hover:underline cursor-pointer ml-1.5"
                  >
                    Remove
                  </button>
                </div>
              )}

              {isTranscribing && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-50/50 dark:bg-amber-950/20 rounded-lg text-[10.5px] text-[#db922b] font-bold animate-pulse">
                  <Sparkles className="w-3.5 h-3.5 animate-spin text-[#db922b]" />
                  <span>Transcribing dictation...</span>
                </div>
              )}
            </div>
          )}

          {/* Canvas sheet */}
          <div className={`flex-1 min-h-0 relative overflow-y-auto editor-scroll-parent ${
            fontTheme === 'serif' ? 'font-serif' : fontTheme === 'mono' ? 'font-mono' : 'font-poppins'
          }`}>
            <style>{`
              #note-editor-rich {
                outline: none;
              }
              /* Sleek Warm Custom Scrollbar for all scroll zones */
              .editor-scroll-parent::-webkit-scrollbar,
              #note-editor-rich::-webkit-scrollbar {
                width: 6px !important;
                height: 6px !important;
              }
              .editor-scroll-parent::-webkit-scrollbar-track,
              #note-editor-rich::-webkit-scrollbar-track {
                background: transparent !important;
              }
              .editor-scroll-parent::-webkit-scrollbar-thumb,
              #note-editor-rich::-webkit-scrollbar-thumb {
                background: rgba(219, 146, 43, 0.25) !important;
                border-radius: 99px !important;
              }
              .editor-scroll-parent::-webkit-scrollbar-thumb:hover,
              #note-editor-rich::-webkit-scrollbar-thumb:hover {
                background: rgba(219, 146, 43, 0.45) !important;
              }
              /* Interactive Table Wrapper Styling */
              .table-wrapper {
                margin: 16px 0 !important;
                border: 1px solid #ffe0bb !important;
                background-color: rgba(255, 255, 255, 0.7) !important;
                border-radius: 16px !important;
                padding: 12px !important;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05) !important;
                max-width: 100% !important;
              }
              .table-controls {
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
                margin-bottom: 10px !important;
                padding: 6px 12px !important;
                background-color: #fff7eb !important;
                border: 1px solid #ffe0bb !important;
                border-radius: 12px !important;
                font-size: 10px !important;
                font-family: 'Poppins', sans-serif !important;
                color: #7c2d12 !important;
                user-select: none !important;
              }
              .table-controls button {
                padding: 4px 8px !important;
                background-color: #ffffff !important;
                border: 1px solid #e2e8f0 !important;
                border-radius: 6px !important;
                font-size: 9px !important;
                font-weight: 700 !important;
                color: #475569 !important;
                cursor: pointer !important;
                transition: all 0.15s ease !important;
              }
              .table-controls button:hover {
                background-color: #fffaf3 !important;
                border-color: #db922b !important;
                color: #db922b !important;
                transform: translateY(-1px) !important;
              }
              .table-controls button.btn-danger {
                color: #dc2626 !important;
                border-color: #fca5a5 !important;
                background-color: #fef2f2 !important;
              }
              .table-controls button.btn-danger:hover {
                background-color: #fee2e2 !important;
                border-color: #ef4444 !important;
                color: #b91c1c !important;
              }
              #note-editor-rich h1 {
                font-size: 20px !important;
                font-weight: 900 !important;
                font-family: 'Outfit', sans-serif !important;
                color: #1e293b !important;
                margin-top: 16px !important;
                margin-bottom: 8px !important;
              }
              #note-editor-rich h2 {
                font-size: 16px !important;
                font-weight: 800 !important;
                font-family: 'Outfit', sans-serif !important;
                color: #334155 !important;
                margin-top: 12px !important;
                margin-bottom: 6px !important;
              }
              #note-editor-rich ul {
                padding-left: 20px !important;
                margin-top: 8px !important;
                margin-bottom: 8px !important;
                list-style-type: disc !important;
              }
              #note-editor-rich li {
                font-size: 13.5px !important;
                color: #334155 !important;
                margin-bottom: 4px !important;
              }
              #note-editor-rich pre {
                white-space: pre-wrap !important;
              }
              #note-editor-rich:empty:before {
                content: attr(placeholder);
                color: #94a3b8;
                font-weight: 500;
                pointer-events: none;
                display: block;
              }
              .checklist-text:empty:before {
                content: attr(placeholder);
                color: #cbd5e1;
                font-weight: 500;
                pointer-events: none;
                display: inline-block;
              }
              .checklist-row {
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                gap: 10px !important;
                margin: 6px 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                padding: 6px 8px !important;
                border-radius: 8px !important;
                transition: background-color 0.2s !important;
              }
              @media (min-width: 768px) {
                .checklist-row {
                  max-width: 450px !important;
                }
              }
              .checklist-row:hover {
                background-color: rgba(219, 146, 43, 0.03) !important;
              }
              .checklist-delete-btn {
                opacity: 0.8 !important;
                transition: all 0.2s !important;
                color: #94a3b8 !important;
              }
              @media (min-width: 768px) {
                .checklist-delete-btn {
                  opacity: 0 !important;
                }
                .checklist-row:hover .checklist-delete-btn {
                  opacity: 1 !important;
                }
              }
              .checklist-delete-btn:hover {
                color: #ff2d55 !important;
                background-color: #ffeef0 !important;
              }
              /* Dark Mode Overrides for Rich Text Editor content */
              .dark #note-editor-rich h1 {
                color: #f1f5f9 !important;
              }
              .dark #note-editor-rich h2 {
                color: #e2e8f0 !important;
              }
              .dark #note-editor-rich li,
              .dark #note-editor-rich {
                color: #cbd5e1 !important;
              }
              .dark .table-wrapper {
                background-color: rgba(20, 20, 24, 0.75) !important;
                border-color: rgba(255, 255, 255, 0.08) !important;
              }
              .dark .table-controls {
                background-color: rgba(255, 255, 255, 0.03) !important;
                border-color: rgba(255, 255, 255, 0.08) !important;
                color: #db922b !important;
              }
              .dark .table-controls button {
                background-color: rgba(255, 255, 255, 0.05) !important;
                border-color: rgba(255, 255, 255, 0.08) !important;
                color: #cbd5e1 !important;
              }
              .dark .table-controls button:hover {
                background-color: rgba(219, 146, 43, 0.2) !important;
                color: #db922b !important;
              }
              .dark #note-editor-rich pre {
                background-color: rgba(255, 255, 255, 0.03) !important;
                border-color: rgba(255, 255, 255, 0.08) !important;
                color: #cbd5e1 !important;
              }
            `}</style>

            <div
              ref={editorRef}
              id="note-editor-rich"
              contentEditable
              onInput={handleInput}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Record your sparkles here. Supports full WYSIWYG rich text, tables, and bold formats..."
              className="w-full bg-transparent border-none outline-none text-slate-800 dark:text-slate-200 font-medium text-[13.5px] leading-[1.75] focus:placeholder-slate-400/60 pb-16 min-h-[220px]"
            />
          </div>

          {/* BOTTOM ACTION BAR */}
          <div className="mt-4 pt-3 border-t border-[#db922b]/10 flex flex-wrap items-center justify-between gap-3 select-none">
            <div className="flex flex-wrap items-center gap-1.5 py-1">
              {/* Trash button */}
              <button
                onClick={() => {
                  deleteNote(activeNoteId);
                  useNoteStore.setState({ activeNoteId: null });
                }}
                title="Move to Trash"
                className="w-8 h-8 shrink-0 rounded-full bg-[#ffeef0] hover:bg-[#ffd6dc] text-[#ff2d55] border border-pink-200 shadow-sm transition-all cursor-pointer flex items-center justify-center"
              >
                <Trash2 className="w-3.5 h-3.5 stroke-[2.2]" />
              </button>

              {/* Export button */}
              <button
                onClick={handleExportText}
                title="Export (.md)"
                className="w-8 h-8 shrink-0 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-[#db922b] hover:border-[#db922b]/50 shadow-sm cursor-pointer flex items-center justify-center"
              >
                <FileDown className="w-3.5 h-3.5 stroke-[2.2]" />
              </button>

              {/* Version History clock */}
              <button
                onClick={() => setShowVersionsModal(true)}
                title="Version History"
                className="w-8 h-8 shrink-0 rounded-full border bg-white hover:bg-slate-50 text-slate-500 border-slate-200 transition-all cursor-pointer shadow-sm relative flex items-center justify-center"
              >
                <History className="w-3.5 h-3.5 stroke-[2.2]" />
                {note.versions && note.versions.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#db922b] text-white text-[7px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white">
                    {note.versions.length}
                  </span>
                )}
              </button>

              {/* Undo */}
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                title="Undo"
                className="w-8 h-8 shrink-0 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[#db922b] disabled:text-slate-300 disabled:opacity-40 hover:bg-[#fff7eb] transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5 stroke-[2.2]" />
              </button>

              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                title="Redo"
                className="w-8 h-8 shrink-0 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[#db922b] disabled:text-slate-300 disabled:opacity-40 hover:bg-[#fff7eb] transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <RotateCw className="w-3.5 h-3.5 stroke-[2.2]" />
              </button>
            </div>
            
            {/* Done Close button on bottom-right of Apple Notes sheet */}
            <button
              onClick={() => useNoteStore.setState({ activeNoteId: null })}
              className="px-4 py-1.5 bg-[#db922b] hover:bg-[#db922b]/95 text-white text-[10.5px] font-black rounded-lg cursor-pointer transition-all active:scale-95 border-none shadow-sm flex items-center gap-1 shrink-0 animate-fade-in"
            >
              <span>Done</span>
            </button>
          </div>
        </div>


        {/* =================== FLOATING COLOR PICKER =================== */}
        <AnimatePresence>
          {showColorPicker && (
            <div className="absolute top-20 right-4 z-40 w-44 p-3 rounded-xl bg-white border border-slate-250 shadow-lg select-none flex flex-col gap-2.5">
              <span className="text-[9px] font-bold text-[#db922b] uppercase tracking-wider pl-0.5">Select Pigment</span>
              <div className="grid grid-cols-3 gap-2">
                {colors.map(col => (
                  <button
                    key={col}
                    onClick={() => {
                      updateNote(activeNoteId, { color: col });
                      setShowColorPicker(false);
                    }}
                    className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                      note.color === col 
                        ? 'ring-1 ring-[#db922b] border-[#db922b] scale-110 shadow-sm' 
                        : 'border-slate-200'
                    } ${
                      col === 'pink' ? 'bg-pink-200' :
                      col === 'blue' ? 'bg-blue-200' :
                      col === 'purple' ? 'bg-purple-200' :
                      col === 'mint' ? 'bg-teal-200' :
                      col === 'peach' ? 'bg-orange-200' : 'bg-slate-100'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* =================== REMINDERS POPOVER =================== */}
        <AnimatePresence>
          {showReminderPicker && (
            <div className="absolute top-20 right-4 z-40 w-72 p-4 rounded-xl bg-white border border-slate-200 shadow-lg select-none flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#db922b] uppercase tracking-wider leading-none">Configure Reminder</span>
              </div>

              <div className="flex flex-col">
                <label className="text-[8px] font-bold text-slate-400 uppercase mb-1 ml-0.5">Select Date and Time</label>
                <input
                  type="datetime-local"
                  value={reminderInput}
                  onChange={(e) => setReminderInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold text-xs focus:outline-none focus:border-[#db922b]"
                />
              </div>

              {note.reminderTime && (
                <div className="p-2 rounded-lg bg-[#fff7eb] text-[9px] text-[#db922b] font-bold border border-[#ffe2c4]">
                  Active: {new Date(note.reminderTime).toLocaleString()}
                </div>
              )}

              <div className="flex justify-end gap-2 mt-1">
                {note.reminderTime && (
                  <button
                    onClick={() => {
                      updateNote(activeNoteId, { reminderTime: null, reminderTriggered: false });
                      setReminderInput('');
                      setShowReminderPicker(false);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-bold border border-rose-100 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => {
                    if (reminderInput) {
                      const iso = new Date(reminderInput).toISOString();
                      updateNote(activeNoteId, { reminderTime: iso, reminderTriggered: false });
                    }
                    setShowReminderPicker(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#db922b] hover:bg-[#db922b]/95 text-white text-[10px] font-bold cursor-pointer"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowReminderPicker(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 text-[10px] font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* =================== VERSION HISTORY MODAL =================== */}
        <AnimatePresence>
          {showVersionsModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="w-full max-w-sm bg-white rounded-[26px] p-6 shadow-xl border-2 border-white select-none"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
                    <History className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <h3 className="text-sm font-black text-slate-800">Note Version History</h3>
                </div>

                {(!note.versions || note.versions.length === 0) ? (
                  <div className="py-6 text-center text-xs text-slate-400 font-bold">
                    No recent changes logged. Versions are planted automatically on E2EE saves!
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {note.versions.map((ver, idx) => (
                      <div 
                        key={idx}
                        className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between gap-2"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] font-black text-slate-700 leading-none">Version #{note.versions.length - idx}</span>
                          <span className="text-[8px] text-slate-400 font-bold mt-1 font-mono">
                            {new Date(ver.updatedAt).toLocaleString()}
                          </span>
                        </div>
                        <button
                          onClick={async () => {
                            const ok = await restoreVersion(note.id, idx);
                            if (ok) {
                              setShowVersionsModal(false);
                              const refreshed = useNoteStore.getState().decryptedNotes[note.id];
                              if (refreshed) {
                                setTitle(refreshed.title);
                                setContent(refreshed.content);
                                if (editorRef.current) {
                                  editorRef.current.innerHTML = refreshed.content;
                                }
                              }
                            }
                          }}
                          className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-750 text-[9px] font-black rounded-lg cursor-pointer transition-all active:scale-95 border border-purple-150"
                        >
                          Rollback
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowVersionsModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
