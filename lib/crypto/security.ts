/**
 * MindSpill Security & Cryptography Engine
 * Uses Web Crypto API (AES-GCM 256 + PBKDF2) for Zero-Knowledge Local Encryption
 * and WebAuthn for optional device biometric unlock.
 */

// Helper to convert ArrayBuffer to Base64
export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper to convert Base64 to ArrayBuffer
export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Generate random salt for PBKDF2
export function generateSalt(length = 16): Uint8Array {
  const salt = new Uint8Array(length);
  window.crypto.getRandomValues(salt);
  return salt;
}

/**
 * Derive AES-GCM key from Master Passcode + Salt using PBKDF2 (100,000 iterations)
 */
export async function deriveKey(passcode: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passcode),
    'PBKDF2',
    false,
    ['deriveKey', 'deriveBits']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false, // key is non-extractable from memory
    ['encrypt', 'decrypt']
  );
}

/**
 * Derive a verification hash from the passcode so we can confirm correctness on unlock
 */
export async function deriveVerificationHash(passcode: string, salt: Uint8Array): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passcode),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const bits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  return bufferToBase64(bits);
}

/**
 * Encrypt string payload using AES-GCM 256
 */
export async function encryptPayload(
  text: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const enc = new TextEncoder();
  const encodedText = enc.encode(text);
  
  // 12 bytes IV is standard for AES-GCM
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encodedText
  );

  return {
    ciphertext: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv),
  };
}

/**
 * Decrypt ciphertext payload using AES-GCM 256
 */
export async function decryptPayload(
  ciphertext: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
  const encryptedBuffer = base64ToBuffer(ciphertext);
  const ivBuffer = new Uint8Array(base64ToBuffer(iv));

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBuffer,
    },
    key,
    encryptedBuffer
  );

  const dec = new TextDecoder();
  return dec.decode(decryptedBuffer);
}

/**
 * Check if WebAuthn / Biometric authentication is supported on this browser
 */
export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.PublicKeyCredential !== undefined &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
  );
}

/**
 * Register WebAuthn Biometric Credential for Quick Unlock
 */
export async function registerWebAuthnCredential(username = 'MindSpill Vault User'): Promise<string | null> {
  if (!isWebAuthnSupported()) return null;

  try {
    const challenge = window.crypto.getRandomValues(new Uint8Array(32));
    const userId = window.crypto.getRandomValues(new Uint8Array(16));

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'MindSpill Brain Dump' },
        user: {
          id: userId,
          name: username,
          displayName: username,
        },
        pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'preferred',
        },
        timeout: 60000,
      },
    })) as PublicKeyCredential;

    if (credential) {
      return bufferToBase64(credential.rawId);
    }
  } catch (err) {
    console.warn('WebAuthn Registration skipped or failed:', err);
  }
  return null;
}

/**
 * Authenticate using WebAuthn Biometrics
 */
export async function authenticateWebAuthn(credentialIdBase64: string): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;

  try {
    const challenge = window.crypto.getRandomValues(new Uint8Array(32));
    const credentialId = base64ToBuffer(credentialIdBase64);

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [
          {
            id: credentialId,
            type: 'public-key',
          },
        ],
        userVerification: 'preferred',
        timeout: 60000,
      },
    });

    return !!assertion;
  } catch (err) {
    console.warn('WebAuthn Authentication failed:', err);
    return false;
  }
}
