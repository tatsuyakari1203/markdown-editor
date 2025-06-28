import { safeStorage } from '../lib/storage';

interface SettingsData {
  [key: string]: any;
}

interface SetAllOptions {
  save?: boolean;
}

interface Settings {
  get<T = any>(key: string): T | undefined;
  getAll(): SettingsData;
  set(key: string, value: any): void;
  setAll(newData: Partial<SettingsData>, options?: SetAllOptions): void;
  toJSON(): SettingsData;
  save(): void;
  load(): void;
  _storageKey: string;
  _data: SettingsData;
}

export const settings: Settings = {
  get<T = any>(key: string): T | undefined {
    return this._data[key] as T;
  },

  getAll(): SettingsData {
    return Object.assign({}, this._data);
  },

  set(key: string, value: any): void {
    this._data[key] = value;
    this.save();
  },

  setAll(newData: Partial<SettingsData>, { save = true }: SetAllOptions = {}): void {
    Object.assign(this._data, newData);
    if (save) {
      this.save();
    }
  },

  toJSON(): SettingsData {
    return this.getAll();
  },

  save(): void {
    const serialized = JSON.stringify(this);
    const success = safeStorage.setItem(this._storageKey, serialized);
    // Silently handle save failures
  },

  load(): void {
    try {
      const serialized = safeStorage.getItem(this._storageKey);
      if (serialized) {
        const parsed = JSON.parse(serialized) as SettingsData;
        this.setAll(parsed, { save: false });
      }
    } catch (error) {
      // OK: there might be nothing saved or invalid JSON
      // Silently handle load failures
    }
  },

  _storageKey: 'gdoc2md.options',
  _data: {} as SettingsData,
};

// Initialize settings on module load
settings.load();

// Export a convenience function to get current settings
export function getSettings() {
  return {
    geminiApiKey: settings.get<string>('geminiApiKey'),
    ...settings.getAll()
  };
}