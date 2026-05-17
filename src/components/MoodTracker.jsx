import React, { useState } from 'react';
import { useNoteStore } from '../store/useNoteStore';
import { Smile, Calendar, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MoodTracker() {
  const { moods, logMood } = useNoteStore();
  const [selectedMood, setSelectedMood] = useState('calm');
  const [moodNote, setMoodNote] = useState('');
  const [isLoggedToday, setIsLoggedToday] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    return moods.some(m => m.date === today);
  });

  const moodsConfig = {
    happy: { emoji: '🌸', label: 'Happy', color: 'text-pink-600 bg-rose-50 border-pink-200' },
    calm: { emoji: '🌊', label: 'Calm', color: 'text-blue-600 bg-blue-50 border-blue-200' },
    tired: { emoji: '🥱', label: 'Tired', color: 'text-orange-600 bg-orange-50 border-orange-200' },
    sad: { emoji: '💧', label: 'Sad', color: 'text-slate-600 bg-slate-50 border-slate-200' },
    anxious: { emoji: '🌀', label: 'Anxious', color: 'text-purple-600 bg-purple-50 border-purple-200' },
  };

  const handleLogMoodSubmit = (e) => {
    e.preventDefault();
    logMood(selectedMood, moodNote);
    setIsLoggedToday(true);
    setMoodNote('');
  };

  return (
    <div className="w-full max-w-sm mx-auto p-5 rounded-xl bg-white border border-slate-200 shadow-sm font-poppins relative select-none">
      <div className="absolute top-10 right-10 w-20 h-20 bg-amber-250/10 rounded-full blur-xl pointer-events-none" />

      {/* Header */}
      <h2 className="text-md font-extrabold font-outfit text-slate-800 flex items-center gap-2 mb-1">
        <Smile className="w-5 h-5 text-[#db922b] stroke-[2.2]" />
        <span>Mood Tracker</span>
      </h2>
      <p className="text-[10px] text-slate-500 font-medium mb-5">Map your emotional cycles today</p>

      {isLoggedToday ? (
        /* Logged today panel */
        <div className="bg-[#fff7eb] border border-[#ffe2c4] p-4 rounded-lg text-center">
          <span className="text-3xl inline-block mb-2">✨</span>
          <h3 className="text-xs font-bold text-[#db922b]">Mood Logged!</h3>
          <p className="text-[10px] text-slate-500 font-medium mt-1 leading-relaxed">
            Your emotional coordinates are recorded client-side. Have a peaceful day!
          </p>
          <button
            onClick={() => setIsLoggedToday(false)}
            className="text-[10px] font-bold text-[#db922b] hover:underline mt-3 cursor-pointer"
          >
            Update today's mood
          </button>
        </div>
      ) : (
        /* Vibe form */
        <form onSubmit={handleLogMoodSubmit} className="space-y-4">
          <div className="flex justify-between gap-1.5 pt-1">
            {Object.keys(moodsConfig).map(moodKey => {
              const item = moodsConfig[moodKey];
              const isSelected = selectedMood === moodKey;
              return (
                <button
                  key={moodKey}
                  type="button"
                  onClick={() => setSelectedMood(moodKey)}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#db922b] bg-[#fff7eb]/30 font-bold text-[#db922b]'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-350'
                  }`}
                >
                  <span className="text-2xl transition-transform duration-300 hover:scale-110">{item.emoji}</span>
                  <span className="text-[9px] font-bold">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div>
            <label className="block text-[8px] uppercase font-bold text-slate-400 mb-1 ml-0.5">Diary Note</label>
            <input
              type="text"
              value={moodNote}
              onChange={(e) => setMoodNote(e.target.value)}
              placeholder="What made your stars shine today?..."
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#db922b] text-slate-800 font-medium"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-[#db922b] hover:bg-[#db922b]/95 text-white font-bold text-xs rounded-lg shadow-sm cursor-pointer transition-transform active:scale-95 border-none"
          >
            Log Mood Coordinates
          </button>
        </form>
      )}

      {/* Mood history */}
      <div className="mt-5 pt-4 border-t border-slate-100 select-none">
        <h4 className="text-[9px] uppercase font-bold text-slate-400 mb-3 flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-[#db922b] stroke-[2.2]" />
          <span>Vibe History</span>
        </h4>
        
        {moods.length === 0 ? (
          <p className="text-[9px] font-bold text-slate-400 text-center py-2">No mood orbits recorded yet.</p>
        ) : (
          <div className="space-y-2 max-h-[110px] overflow-y-auto pr-1">
            {moods.slice(-3).reverse().map((moodEntry, idx) => {
              const cfg = moodsConfig[moodEntry.mood] || { emoji: '💫', label: 'Vibe', color: 'text-slate-600 bg-slate-50 border-slate-100' };
              return (
                <div 
                  key={idx}
                  className="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-xs shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{cfg.emoji}</span>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-[10px] text-slate-700 leading-tight truncate">
                        {cfg.label} {moodEntry.note ? `— "${moodEntry.note}"` : ''}
                      </span>
                      <span className="text-[8px] font-medium text-slate-400 mt-0.5">{moodEntry.date}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
