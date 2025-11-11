/**
 * Device ID utility for tracking anonymous users
 * Generates and stores a unique device ID in localStorage
 * This ID is sent with API requests to track votes from unauthenticated users
 */

const DEVICE_ID_KEY = 'device_id';

/**
 * Generate a random URL-safe device ID
 */
function generateDeviceId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Get or create device ID from localStorage
 * Returns existing ID if found, otherwise generates and stores a new one
 */
export function getOrCreateDeviceId(): string {
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    
    if (!deviceId) {
      deviceId = generateDeviceId();
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    
    return deviceId;
  } catch (error) {
    // Fallback if localStorage is not available
    console.warn('localStorage not available, generating temporary device ID');
    return generateDeviceId();
  }
}

/**
 * Clear device ID from storage (useful for testing or logout)
 */
export function clearDeviceId(): void {
  try {
    localStorage.removeItem(DEVICE_ID_KEY);
  } catch (error) {
    console.warn('Failed to clear device ID:', error);
  }
}
