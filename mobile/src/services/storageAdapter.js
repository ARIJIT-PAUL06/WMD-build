/**
 * Storage Adapter for Mobile App & Testing
 * Wraps @react-native-async-storage/async-storage with an in-memory fallback for testing/SSR
 */

let storage = null;

try {
  // Use React Native AsyncStorage if available
  const rnAsyncStorage = require('@react-native-async-storage/async-storage');
  storage = rnAsyncStorage.default || rnAsyncStorage;
} catch (e) {
  // In-memory fallback for Node test environments or Web SSR
  const memoryMap = new Map();
  storage = {
    getItem: async (key) => memoryMap.get(key) || null,
    setItem: async (key, value) => { memoryMap.set(key, String(value)); },
    removeItem: async (key) => { memoryMap.delete(key); },
    clear: async () => { memoryMap.clear(); }
  };
}

export default storage;
