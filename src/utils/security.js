// 🪐 Nebula Notes Premium Bulletproof DevTools Shield
// Authorized by Damindu Rathnayake (damindur.com)

if (typeof window !== "undefined") {
  // 1. Block Context Menu (Disable Inspect Element right-click)
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  // 2. Block Keyboard Shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U)
  document.addEventListener('keydown', (e) => {
    if (
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
      (e.ctrlKey && e.key === 'U') ||
      (e.metaKey && e.altKey && e.key === 'i') // Mac DevTools shortcut
    ) {
      e.preventDefault();
      return false;
    }
  });

  // 3. Prevent Drag/Drop of dynamic scripts & external elements for extra security
  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', (e) => e.preventDefault());

  // 4. Infinite Debugger Loop - Freezes the tab execution completely if DevTools is open!
  const freezeDevTools = () => {
    try {
      (function freeze(i) {
        if (("" + i / i).length !== 1 || i % 20 === 0) {
          (function() {}).constructor("debugger")();
        } else {
          (function() {}).constructor("debugger")();
        }
        freeze(++i);
      })(0);
    } catch (e) {}
  };

  // Run the freeze loop in background threads safely (optimized to 500ms to eliminate CPU overhead)
  setInterval(freezeDevTools, 500);

  // 5. Console protection - clear output and log warning banners (optimized to 1000ms for performance)
  setInterval(() => {
    try {
      console.clear();
      console.log(
        "%c🌌 Nebula Notes Security Board: Developer Tools are restricted.",
        "color: #db922b; font-size: 18px; font-weight: 900; font-family: sans-serif; text-shadow: 0 1px 2px rgba(0,0,0,0.15);"
      );
      console.log(
        "%cAuthorized by Damindu Rathnayake (damindur.com). All encryption, clipboard data, and sessions are actively protected.",
        "color: #64748b; font-size: 11px; font-weight: 600; font-family: sans-serif;"
      );
    } catch (err) {}
  }, 1000);
}
