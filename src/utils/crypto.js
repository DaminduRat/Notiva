/**
 * Client-Side E2EE Crypto Module
 * Uses native Web Cryptography API (AES-GCM 256-bit + PBKDF2)
 * Works cross-platform (browsers, Cordova, PWA)
 */

// Helper: Convert array buffer to hex string
function bufToHex(buffer) {
  return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
}

// Helper: Convert hex string to Uint8Array
function hexToBuf(hexString) {
  if (!hexString) return new Uint8Array(0);
  const result = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    result[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
  }
  return result;
}

/**
 * Derives a cryptographic key from a password and salt using PBKDF2
 */
async function deriveKey(password, saltBuf) {
  const enc = new TextEncoder();
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey", "deriveBits"]
  );

  return await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuf,
      iterations: 100000,
      hash: "SHA-256"
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt plaintext string using a master password
 * Returns an object with ciphertext, iv, and salt in hex format
 */
export async function encryptText(plaintext, password) {
  if (!plaintext) return "";
  if (!password) {
    throw new Error("Encryption key not provided. Please unlock your safe first.");
  }

  try {
    const enc = new TextEncoder();
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    // Derive key from password and salt
    const aesKey = await deriveKey(password, salt);
    
    // Encrypt content
    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      aesKey,
      enc.encode(plaintext)
    );

    return {
      ciphertext: bufToHex(ciphertextBuffer),
      iv: bufToHex(iv),
      salt: bufToHex(salt),
      encrypted: true,
      version: "1.0"
    };
  } catch (err) {
    console.error("Encryption failed:", err);
    throw new Error("Failed to encrypt. Please check your encryption password.");
  }
}

/**
 * Decrypts a ciphertext package using the master password
 */
export async function decryptText(encryptedPackage, password) {
  if (!encryptedPackage) return "";
  if (!password) {
    throw new Error("Safe is locked. Cannot decrypt content.");
  }

  // Handle case where it's already decrypted or not a package
  if (typeof encryptedPackage === 'string') {
    return encryptedPackage;
  }
  
  if (!encryptedPackage.encrypted) {
    return encryptedPackage.ciphertext || "";
  }

  try {
    const dec = new TextDecoder();
    const saltBuf = hexToBuf(encryptedPackage.salt);
    const ivBuf = hexToBuf(encryptedPackage.iv);
    const ciphertextBuf = hexToBuf(encryptedPackage.ciphertext);

    // Derive key
    const aesKey = await deriveKey(password, saltBuf);

    // Decrypt
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: ivBuf
      },
      aesKey,
      ciphertextBuf
    );

    return dec.decode(decryptedBuffer);
  } catch (err) {
    console.error("Decryption failed:", err);
    // Return a flag or placeholder so the UI knows decryption failed
    return "🔐 [Decryption Error: Incorrect Passphrase]";
  }
}

/**
 * Generate a quick PIN hash to store locally for quick resume locks
 * Uses SHA-256
 */
export async function hashPin(pin) {
  const enc = new TextEncoder();
  const data = enc.encode(pin + "nebula-notes-salt"); // simple salt
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  return bufToHex(hashBuffer);
}
