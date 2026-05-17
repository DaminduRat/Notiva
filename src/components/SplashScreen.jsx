import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export default function SplashScreen({ onComplete }) {
  const [status, setStatus] = useState("Aligning stars...");

  useEffect(() => {
    const timers = [
      setTimeout(() => setStatus("Polishing glass..."), 800),
      setTimeout(() => setStatus("Charging magic..."), 1500),
      setTimeout(() => setStatus("Decrypting dreams..."), 2200),
      setTimeout(() => onComplete(), 3000)
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, [onComplete]);

  // Star patterns
  const stars = Array.from({ length: 18 });

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#faf8f5] text-slate-800">
      
      {/* Background Starry Particles */}
      <div className="absolute inset-0 opacity-40">
        {stars.map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-gradient-to-tr from-purple-400 to-pink-400"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              width: Math.random() * 5 + 2 + 'px',
              height: Math.random() * 5 + 2 + 'px',
            }}
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [0.8, 1.3, 0.8]
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* Decorative Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl animate-glow pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-pink-200/40 rounded-full blur-3xl animate-glow pointer-events-none" style={{ animationDelay: '2s' }} />

      {/* Brand Icon & Name */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <motion.div
          className="relative flex items-center justify-center w-28 h-28 rounded-[28px] bg-gradient-to-tr from-purple-400 via-pink-400 to-orange-300 p-0.5 shadow-md"
          initial={{ scale: 0.3, rotate: -45, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ 
            type: "spring", 
            stiffness: 120, 
            damping: 14,
            duration: 1
          }}
        >
          {/* Inner glass box */}
          <div className="flex items-center justify-center w-full h-full bg-transparent overflow-hidden rounded-[26px] shadow-inner">
            <motion.div
              className="w-full h-full"
              animate={{ 
                rotate: [0, 5, -5, 0],
                scale: [1, 1.05, 0.95, 1]
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <img src="/logo.png" alt="Notiva Logo" className="w-full h-full object-cover" />
            </motion.div>
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          className="mt-6 text-3xl font-black tracking-wider text-slate-800 font-outfit"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          NOTIVA
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="mt-2 text-xs font-bold text-slate-500 font-poppins"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.95 }}
          transition={{ delay: 0.9 }}
        >
          Your secure aesthetic cosmic sanctuary
        </motion.p>
      </div>

      {/* Loading Bar & Status */}
      <div className="absolute bottom-20 z-10 w-64 flex flex-col items-center">
        <div className="w-full h-1.5 bg-slate-100 border border-slate-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-400 to-pink-500"
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 2.8, ease: "easeInOut" }}
          />
        </div>
        
        <AnimatePresence mode="wait">
          <motion.span
            key={status}
            className="mt-3.5 text-[9px] text-purple-700 font-black tracking-widest uppercase font-mono"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
          >
            {status}
          </motion.span>
        </AnimatePresence>
      </div>
      
    </div>
  );
}
