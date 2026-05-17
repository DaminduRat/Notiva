import React, { useEffect, useState } from 'react';
import { useNoteStore } from '../store/useNoteStore';
import { Play, Pause, RotateCcw, Flame, Moon, Coffee, Sparkles, Volume2, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PomodoroTimer() {
  const { pomodoro, setPomodoro } = useNoteStore();
  const { mode, isRunning, timeLeft, totalTime, cycleCount } = pomodoro;
  const [ambientSound, setAmbientSound] = useState(null); // 'lofi', 'rain', null
  const [soundPlaying, setSoundPlaying] = useState(false);
  const audioRef = React.useRef(null);

  // Formatting seconds to MM:SS
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  const handleToggleTimer = () => {
    setPomodoro({ isRunning: !isRunning });
  };

  const handleReset = () => {
    let resetTime = 1500;
    if (mode === 'short') resetTime = 300;
    if (mode === 'long') resetTime = 900;
    
    setPomodoro({
      isRunning: false,
      timeLeft: resetTime,
      totalTime: resetTime
    });
  };

  const handleSetMode = (newMode) => {
    let nextTime = 1500;
    if (newMode === 'short') nextTime = 300;
    if (newMode === 'long') nextTime = 900;

    setPomodoro({
      mode: newMode,
      isRunning: false,
      timeLeft: nextTime,
      totalTime: nextTime
    });
  };

  const toggleAmbientSound = (soundType) => {
    if (ambientSound === soundType && soundPlaying) {
      setSoundPlaying(false);
      if (audioRef.current) audioRef.current.pause();
    } else {
      setAmbientSound(soundType);
      setSoundPlaying(true);
      
      const soundUrls = {
        lofi: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // space music
        rain: 'https://assets.mixkit.co/active_storage/sfx/2448/2448-84.wav' // rain mock
      };
      
      if (audioRef.current) {
        audioRef.current.src = soundUrls[soundType];
        audioRef.current.loop = true;
        audioRef.current.volume = 0.15;
        audioRef.current.play().catch(e => {
          console.warn("Audio blocked by browser sandbox policy", e);
        });
      }
    }
  };

  // Circular progress stroke calculation
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (timeLeft / totalTime) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-white border border-slate-200 shadow-sm max-w-sm mx-auto font-poppins relative select-none">
      {/* Soft background light */}
      <div className="absolute top-10 left-10 w-24 h-24 bg-amber-200/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-24 h-24 bg-amber-200/10 rounded-full blur-2xl pointer-events-none" />

      <audio ref={audioRef} />

      {/* Header */}
      <h2 className="text-md font-extrabold font-outfit text-slate-800 flex items-center gap-2">
        <Clock className="w-5 h-5 text-[#db922b] stroke-[2.2]" />
        <span>Focus Session</span>
      </h2>
      <p className="text-[10px] text-slate-500 font-medium mt-1 mb-6">Align your focus cycles seamlessly</p>

      {/* Bubble Mode Switches */}
      <div className="flex gap-1.5 mb-8 bg-slate-100 p-1 rounded-lg border border-slate-200">
        {[
          { id: 'work', label: 'Focus', icon: Flame, color: 'text-[#db922b]' },
          { id: 'short', label: 'Break', icon: Coffee, color: 'text-[#db922b]' },
          { id: 'long', label: 'Rest', icon: Moon, color: 'text-[#db922b]' }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => handleSetMode(item.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all active:scale-95 cursor-pointer ${
              mode === item.id 
                ? 'bg-white text-slate-800 shadow-sm border border-slate-200' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <item.icon className="w-3.5 h-3.5" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Circular Progress Timer */}
      <div className="relative w-44 h-44 mb-8 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="88"
            cy="88"
            r={radius}
            className="stroke-slate-100"
            strokeWidth="6"
            fill="transparent"
          />
          <motion.circle
            cx="88"
            cy="88"
            r={radius}
            className="stroke-[#db922b]"
            strokeWidth="6"
            fill="transparent"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.3 }}
            strokeLinecap="round"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold font-outfit text-slate-800 tracking-wider">
            {formatTime(timeLeft)}
          </span>
          <span className="text-[8px] uppercase tracking-widest text-slate-500 font-bold mt-1">
            {mode === 'work' ? 'FOCUS TIME' : 'REST TIME'}
          </span>
        </div>
      </div>

      {/* Controls Deck */}
      <div className="flex gap-4 items-center mb-6">
        <button
          onClick={handleReset}
          className="p-3 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-350 active:scale-90 transition-all cursor-pointer shadow-sm"
          title="Reset timer"
        >
          <RotateCcw className="w-4 h-4 stroke-[2.2]" />
        </button>
        
        <button
          onClick={handleToggleTimer}
          className="w-16 h-16 rounded-full bg-[#db922b] hover:bg-[#db922b]/95 text-white flex items-center justify-center shadow-sm active:scale-95 transition-all cursor-pointer border-none"
        >
          {isRunning ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white ml-1" />}
        </button>

        <div className="p-3 rounded-full text-[#db922b]">
          <Sparkles className="w-4 h-4 text-[#db922b] fill-[#db922b]/10 stroke-[2.2]" />
        </div>
      </div>

      {/* Cycle Count status */}
      <div className="w-full pt-4 border-t border-slate-100 text-center flex flex-col items-center gap-1.5">
        <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Cycles Aligned: {cycleCount}</span>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(idx => (
            <div 
              key={idx}
              className={`w-3 h-3 rounded-full border transition-all ${
                cycleCount >= idx 
                  ? 'bg-[#db922b] border-[#db922b] scale-110 shadow-sm' 
                  : 'bg-slate-200 border-transparent'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Acoustic Ambient soundscapes */}
      <div className="w-full mt-4 pt-3 border-t border-slate-100 flex flex-col items-center gap-2">
        <div className="flex items-center gap-1 text-[8px] uppercase tracking-wider font-bold text-slate-400">
          <Volume2 className="w-3.5 h-3.5 text-[#db922b]" />
          <span>Ambient Shield</span>
        </div>
        <div className="flex gap-1.5 justify-center">
          {[
            { id: 'lofi', label: 'Space Lofi' },
            { id: 'rain', label: 'Cosmic Rain' }
          ].map(sound => {
            const isActive = ambientSound === sound.id && soundPlaying;
            return (
              <button
                key={sound.id}
                onClick={() => toggleAmbientSound(sound.id)}
                className={`text-[9px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-bold ${
                  isActive
                    ? 'bg-[#fff7eb] text-[#db922b] border-[#ffe2c4] shadow-sm'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-350'
                }`}
              >
                {sound.label}
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
