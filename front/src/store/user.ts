import { Platform } from 'react-native';

const USER_ID_KEY = 'selfdev_user_id';
const USER_EMAIL_KEY = 'selfdev_user_email';

type StorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

const memory = new Map<string, string>();

const memoryStorage: StorageLike = {
  async getItem(key) {
    return memory.has(key) ? memory.get(key)! : null;
  },
  async setItem(key, value) {
    memory.set(key, value);
  },
  async removeItem(key) {
    memory.delete(key);
  },
};

const webStorage: StorageLike = {
  async getItem(key) {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return memoryStorage.getItem(key);
    }
  },
  async setItem(key, value) {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      await memoryStorage.setItem(key, value);
    }
  },
  async removeItem(key) {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      await memoryStorage.removeItem(key);
    }
  },
};

let nativeStorage: StorageLike | null = null;

async function getStorage(): Promise<StorageLike> {
  if (Platform.OS === 'web') return webStorage;

  if (!nativeStorage) {
    try {
      const mod = await import('@react-native-async-storage/async-storage');
      const AsyncStorage = (mod.default ?? mod) as {
        getItem: (k: string) => Promise<string | null>;
        setItem: (k: string, v: string) => Promise<void>;
        removeItem: (k: string) => Promise<void>;
      };
      if (typeof AsyncStorage.getItem === 'function') {
        nativeStorage = {
          getItem: (k) => AsyncStorage.getItem(k),
          setItem: (k, v) => AsyncStorage.setItem(k, v),
          removeItem: (k) => AsyncStorage.removeItem(k),
        };
      } else {
        nativeStorage = memoryStorage;
      }
    } catch {
      nativeStorage = memoryStorage;
    }
  }

  return nativeStorage;
}

export async function getStoredUserId(): Promise<string | null> {
  const storage = await getStorage();
  return storage.getItem(USER_ID_KEY);
}

export async function getStoredEmail(): Promise<string | null> {
  const storage = await getStorage();
  return storage.getItem(USER_EMAIL_KEY);
}

export async function setStoredUser(userId: string, email: string): Promise<void> {
  const storage = await getStorage();
  await storage.setItem(USER_ID_KEY, userId);
  await storage.setItem(USER_EMAIL_KEY, email);
}

export async function clearStoredUser(): Promise<void> {
  const storage = await getStorage();
  await storage.removeItem(USER_ID_KEY);
  await storage.removeItem(USER_EMAIL_KEY);
}
