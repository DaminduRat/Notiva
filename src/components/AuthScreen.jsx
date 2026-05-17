import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNoteStore } from '../store/useNoteStore';
import { isDemoMode, auth } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { 
  Sparkles, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  Mail, 
  ShieldCheck, 
  KeyRound, 
  Delete,
  ArrowRight,
  UserCheck
} from 'lucide-react';

export default function AuthScreen() {
  const { 
    user, 
    isGuest, 
    setUser, 
    setGuestMode, 
    setAuthLoading,
    isAppPinLocked, 
    pinHash, 
    verifyPin,
    unlockSafe,
    isSafeLocked,
    notes
  } = useNoteStore();

  const [mode, setMode] = useState('auth'); 
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // E2EE passphrases
  const [cryptoPassphrase, setCryptoPassphrase] = useState('');
  const [confirmCryptoPassphrase, setConfirmCryptoPassphrase] = useState('');
  const [showCryptoPassphrase, setShowCryptoPassphrase] = useState(false);
  
  // PIN lock pad states
  const [pinInput, setPinInput] = useState('');

  useEffect(() => {
    if (isAppPinLocked && pinHash) {
      setMode('pin');
    } else if (user && isSafeLocked) {
      // Seamlessly auto-unlock in background using derived user key!
      unlockSafe(user.uid + "-cozy-nebula");
    } else if (isGuest && isSafeLocked) {
      // Seamlessly auto-unlock in background!
      unlockSafe("guest-cozy-nebula");
    } else if (!user && !isGuest) {
      setMode('auth');
    }
  }, [user, isGuest, isAppPinLocked, pinHash, isSafeLocked, unlockSafe]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return setError("Please fill in all fields.");
    setError("");
    setLoading(true);
    setAuthLoading(true);

    if (isDemoMode) {
      setTimeout(() => {
        const mockUser = {
          uid: 'mock-uid-123',
          email: email,
          displayName: email.split('@')[0],
          photoURL: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Celeste'
        };
        setUser(mockUser);
        setGuestMode(false);
        setLoading(false);
        setAuthLoading(false);
      }, 1000);
      return;
    }

    try {
      if (isRegister) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        setUser({
          uid: cred.user.uid,
          email: cred.user.email,
          displayName: cred.user.email.split('@')[0],
          photoURL: `https://api.dicebear.com/7.x/adventurer/svg?seed=${cred.user.uid}`
        });
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        setUser({
          uid: cred.user.uid,
          email: cred.user.email,
          displayName: cred.user.displayName || cred.user.email.split('@')[0],
          photoURL: cred.user.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${cred.user.uid}`
        });
      }
    } catch (err) {
      console.error(err);
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);

    if (isDemoMode) {
      setTimeout(() => {
        setUser({
          uid: 'mock-google-uid',
          email: 'celeste@nebula.space',
          displayName: 'Celeste 🌌',
          photoURL: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Celeste'
        });
        setGuestMode(false);
        setLoading(false);
      }, 800);
      return;
    }

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      setUser({
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL
      });
    } catch (err) {
      console.error(err);
      setError("Google Login failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEnterGuest = () => {
    setGuestMode(true);
  };

  const handleSetupCrypto = async (e) => {
    e.preventDefault();
    if (!cryptoPassphrase) return setError("Crypto Key cannot be empty!");
    if (cryptoPassphrase.length < 6) return setError("Crypto Key must be at least 6 characters.");
    if (cryptoPassphrase !== confirmCryptoPassphrase) return setError("Passwords do not match!");

    setError("");
    setLoading(true);

    const success = await unlockSafe(cryptoPassphrase);
    setLoading(false);
    
    if (!success) {
      setError("Failed to initialize secure safe.");
    }
  };

  const handleUnlockCrypto = async (e) => {
    e.preventDefault();
    if (!cryptoPassphrase) return setError("Passphrase is required.");

    setError("");
    setLoading(true);

    const success = await unlockSafe(cryptoPassphrase);
    setLoading(false);

    if (!success) {
      setError("❌ Decryption failed. Incorrect passphrase. Try again!");
      setCryptoPassphrase('');
    }
  };

  const handlePinPress = async (num) => {
    if (pinInput.length >= 4) return;
    const newPin = pinInput + num;
    setPinInput(newPin);
    
    if (newPin.length === 4) {
      setLoading(true);
      const isOk = await verifyPin(newPin);
      setLoading(false);
      if (isOk) {
        setPinInput('');
      } else {
        setError("Invalid PIN. Please try again.");
        setPinInput('');
        if (navigator.vibrate) navigator.vibrate(200);
        setTimeout(() => setError(""), 2000);
      }
    }
  };

  const handlePinDelete = () => {
    setPinInput(prev => prev.slice(0, -1));
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 relative overflow-hidden select-none bg-gradient-to-tr from-[#faf8f5] via-[#f7f5f0] to-[#fcfbfa] dark:from-[#0c0c0f] dark:via-[#0f0f12] dark:to-[#141419]">
      
      {/* Background cosmic aura rings */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-[#db922b]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-[#8b5cf6]/5 rounded-full blur-[120px] pointer-events-none" />

      <AnimatePresence mode="wait">
        
        {/* =================== PIN PAD SCREEN =================== */}
        {mode === 'pin' && (
          <motion.div
            key="pin-screen"
            className="w-full max-w-sm glass-panel rounded-[28px] border-2 border-white p-6 text-center shadow-md"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-400 via-pink-400 to-orange-300 flex items-center justify-center text-white mb-4 shadow-sm animate-float">
                <Lock className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h2 className="text-xl font-black font-outfit text-slate-800">Welcome Back Explorer</h2>
              <p className="text-xs text-slate-500 font-bold mt-1">Enter 4-digit PIN to open your safe</p>
              
              {/* PIN Indicator dots */}
              <div className="flex gap-4 my-8 justify-center">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full border-2 border-purple-300 transition-all duration-200 ${
                      pinInput.length > idx 
                        ? 'bg-gradient-to-tr from-purple-400 to-pink-400 scale-125 shadow-sm' 
                        : 'bg-white'
                    }`}
                  />
                ))}
              </div>

              {error && <p className="text-xs text-rose-500 mb-4 font-mono font-bold">{error}</p>}

              {/* Pin Keyboard */}
              <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    onClick={() => handlePinPress(num)}
                    className="h-16 rounded-2xl flex items-center justify-center font-outfit font-black text-2xl text-slate-700 bg-white border-2 border-slate-100 hover:border-purple-300 active:scale-95 transition-all shadow-sm cursor-pointer"
                  >
                    {num}
                  </button>
                ))}
                <button 
                  onClick={() => setPinInput('')} 
                  className="h-16 rounded-2xl flex items-center justify-center font-poppins text-xs font-black text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Clear
                </button>
                <button
                  onClick={() => handlePinPress(0)}
                  className="h-16 rounded-2xl flex items-center justify-center font-outfit font-black text-2xl text-slate-700 bg-white border-2 border-slate-100 hover:border-purple-300 active:scale-95 transition-all shadow-sm cursor-pointer"
                >
                  0
                </button>
                <button
                  onClick={handlePinDelete}
                  className="h-16 rounded-2xl flex items-center justify-center text-slate-500 hover:text-rose-500 active:scale-95 transition-all cursor-pointer"
                >
                  <Delete className="w-6 h-6 stroke-[2.5]" />
                </button>
              </div>

              <button
                onClick={() => {
                  setGuestMode(false);
                  setUser(null);
                  useNoteStore.setState({ isAppPinLocked: false });
                }}
                className="mt-6 text-xs text-purple-600 hover:text-purple-700 font-extrabold cursor-pointer hover:underline"
              >
                Log out & use safe password
              </button>
            </div>
          </motion.div>
        )}

        {/* =================== AUTH LOGIN/REGISTER SCREEN =================== */}
        {mode === 'auth' && (
          <motion.div
            key="auth-screen"
            className="w-full max-w-sm bg-white/80 dark:bg-[#121215]/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-white/5 p-8 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col items-center"
            initial={{ opacity: 0, y: 15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header */}
            <div className="flex flex-col items-center mb-8 text-center select-none w-full">
              <div className="w-18 h-18 rounded-[22px] overflow-hidden bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4 shadow-[0_8px_20px_rgba(0,0,0,0.03)] border border-slate-200 dark:border-white/5 p-3">
                <img src="/logo.png" alt="Notiva Logo" className="w-full h-full object-contain" />
              </div>
              <h2 className="text-2xl font-black text-[#1d1d1f] dark:text-white font-outfit tracking-tight">Notiva</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-1.5 max-w-[200px]">Secure Aesthetic Cosmic Sanctuary</p>
              {isDemoMode && (
                <span className="mt-4 text-[8px] bg-amber-50 dark:bg-amber-950/20 text-[#db922b] border border-amber-200/50 dark:border-amber-500/20 font-black px-2.5 py-0.5 rounded-full font-mono tracking-widest uppercase">
                  OFFLINE SAFE DEMO
                </span>
              )}
            </div>

            {error && (
              <div className="w-full p-3 bg-[#ffeef0] dark:bg-rose-950/30 border border-[#ffd6dc] dark:border-rose-500/20 text-[#ff2d55] text-xs rounded-lg mb-6 font-bold flex items-start gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Google Authentication Trigger Only */}
            <div className="w-full font-poppins">
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#18181c] hover:bg-slate-50 dark:hover:bg-[#1f1f26] text-xs font-black text-slate-700 dark:text-white flex items-center justify-center gap-3 active:scale-[0.98] transition-all cursor-pointer shadow-sm hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)] dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)] disabled:opacity-50 select-none"
              >
                {loading ? (
                  <span className="w-4 h-4 rounded-full border-2 border-[#db922b] border-t-transparent animate-spin" />
                ) : (
                  <>
                    <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
                      <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.48 15.02 0 12 0 7.34 0 3.32 2.68 1.34 6.6l3.85 2.99C6.12 6.7 8.84 5.04 12 5.04z" />
                      <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.42 3.57l3.77 2.92c2.2-2.03 3.68-5.01 3.68-8.64z" />
                      <path fill="#FBBC05" d="M5.19 14.19c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29L1.34 6.6C.49 8.28 0 10.09 0 12s.49 3.72 1.34 5.4l3.85-2.99z" />
                      <path fill="#34A853" d="M12 24c3.24 0 5.97-1.07 7.96-2.92l-3.77-2.92c-1.11.75-2.53 1.2-4.19 1.2-3.16 0-5.88-1.66-6.81-4.55L1.34 17.8C3.32 21.32 7.34 24 12 24z" />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* =================== E2EE CRYPTO SETUP SCREEN =================== */}
        {mode === 'setup-crypto' && (
          <motion.div
            key="setup-crypto-screen"
            className="w-full max-w-md bg-white rounded-xl border border-slate-200 p-8 shadow-sm"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#e2a53d] to-[#db922b] flex items-center justify-center text-white mb-4 shadow-sm">
                <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h2 className="text-lg font-extrabold text-[#1d1d1f] font-outfit">Set E2EE Master Password</h2>
              <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed max-w-xs">
                Every thought here is protected by <strong>End-to-End Encryption (E2EE)</strong>. 
                Choose a strong key. It is never uploaded to the cloud!
              </p>
              
              <div className="my-4 p-3 bg-[#fff7eb] border border-[#ffe2c4] rounded-lg text-[10px] text-[#db922b] font-bold leading-relaxed text-left flex gap-2">
                <span>💡</span>
                <span><strong>WARNING:</strong> Keys are derived client-side. If you lose this password, your notes cannot be decrypted. There is no password reset!</span>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-[#ffeef0] border border-[#ffd6dc] text-[#ff2d55] text-xs rounded-lg mb-4 font-bold">
                {error}
              </div>
            )}

            <form onSubmit={handleSetupCrypto} className="space-y-4 font-poppins mt-4">
              <div>
                <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1 ml-0.5">Master Encryption Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <KeyRound className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type={showCryptoPassphrase ? "text" : "password"}
                    required
                    value={cryptoPassphrase}
                    onChange={(e) => setCryptoPassphrase(e.target.value)}
                    placeholder="Enter at least 6 characters"
                    className="w-full pl-9 pr-10 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#db922b] text-slate-800 font-medium text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1 ml-0.5">Repeat Encryption Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type={showCryptoPassphrase ? "text" : "password"}
                    required
                    value={confirmCryptoPassphrase}
                    onChange={(e) => setConfirmCryptoPassphrase(e.target.value)}
                    placeholder="Repeat passphrase"
                    className="w-full pl-9 pr-10 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#db922b] text-slate-800 font-medium text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCryptoPassphrase(!showCryptoPassphrase)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-450 hover:text-slate-600"
                  >
                    {showCryptoPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg font-bold text-white bg-[#db922b] hover:bg-[#db922b]/95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <span>Initialize Secure Safe Room ✨</span>
                )}
              </button>
            </form>

            <button
              onClick={() => {
                setUser(null);
                setGuestMode(false);
              }}
              className="w-full mt-4 text-center text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
            >
              Cancel and go back
            </button>
          </motion.div>
        )}

        {/* =================== E2EE CRYPTO UNLOCK SCREEN =================== */}
        {mode === 'unlock-crypto' && (
          <motion.div
            key="unlock-crypto-screen"
            className="w-full max-w-md bg-white rounded-xl border border-slate-200 p-8 shadow-sm"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#e2a53d] to-[#db922b] flex items-center justify-center text-white mb-4 shadow-sm">
                <Lock className="w-5 h-5 stroke-[2.2]" />
              </div>
              <h2 className="text-lg font-extrabold text-[#1d1d1f] font-outfit">Unlock Secure Chamber</h2>
              <p className="text-xs text-slate-500 font-medium mt-2 max-w-xs leading-relaxed">
                To decrypt your secure notebooks, enter your Master Passphrase.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-[#ffeef0] border border-[#ffd6dc] text-[#ff2d55] text-xs rounded-lg my-4 font-bold text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleUnlockCrypto} className="space-y-4 font-poppins mt-6">
              <div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <KeyRound className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type={showCryptoPassphrase ? "text" : "password"}
                    required
                    value={cryptoPassphrase}
                    onChange={(e) => setCryptoPassphrase(e.target.value)}
                    placeholder="Enter Master Password..."
                    className="w-full pl-9 pr-10 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#db922b] text-slate-800 font-medium text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCryptoPassphrase(!showCryptoPassphrase)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-450 hover:text-slate-600"
                  >
                    {showCryptoPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg font-bold text-white bg-[#db922b] hover:bg-[#db922b]/95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5 stroke-[2.2]" />
                    <span>Open Safe Chamber</span>
                  </>
                )}
              </button>
            </form>

            <button
              onClick={() => {
                setGuestMode(false);
                setUser(null);
              }}
              className="w-full mt-6 text-center text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
            >
              Log out / Switch account
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
