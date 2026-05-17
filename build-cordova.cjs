const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  console.log("🌌 Starting Nebula Notes Cordova Build Process...");

  // 1. Build Vite Web Assets
  console.log("📦 Compiling React Vite production build...");
  execSync('npm run build', { stdio: 'inherit' });

  // 2. Initialize Cordova app folder if not already exists
  const cordovaFolder = path.join(__dirname, 'cordova-app');
  if (!fs.existsSync(cordovaFolder)) {
    console.log("📱 Initializing new Cordova project...");
    execSync('cordova create cordova-app com.damindur.notiva Notiva', { stdio: 'inherit' });
    
    console.log("🤖 Adding Android platform...");
    execSync('cordova platform add android', { cwd: cordovaFolder, stdio: 'inherit' });
  }

  // 3. Clear existing Cordova www files & copy Vite production assets
  console.log("🧼 Copying web assets to Cordova shell...");
  const wwwFolder = path.join(cordovaFolder, 'www');
  
  if (fs.existsSync(wwwFolder)) {
    fs.rmSync(wwwFolder, { recursive: true, force: true });
  }
  fs.mkdirSync(wwwFolder, { recursive: true });
  fs.cpSync(path.join(__dirname, 'dist'), wwwFolder, { recursive: true });

  // 4. Compile APK locally
  console.log("🔨 Building Android APK package...");
  execSync('cordova build android', { cwd: cordovaFolder, stdio: 'inherit' });

  console.log("🎉 SUCCESS! Your APK is ready at: cordova-app/platforms/android/app/build/outputs/apk/debug/app-debug.apk");

} catch (error) {
  console.error("❌ Cordova Build Failed:", error.message);
}
