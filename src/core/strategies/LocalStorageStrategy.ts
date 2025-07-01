// src/core/strategies/LocalStorageStrategy.ts

import { IStorageStrategy, Document } from './IStorageStrategy';
import { safeStorage } from '@/lib/storage';
import templateMarkdown from '@/template.md?raw';

interface TabData {
  id: string;
  document: Document;
  isDirty: boolean;
  isActive: boolean;
}

interface StoredTabsData {
  tabs: TabData[];
  activeTabId: string | null;
}

/**
 * Chiến lược lưu trữ sử dụng localStorage của trình duyệt.
 * Hoạt động hoàn toàn phía client, phù hợp cho "Community Edition".
 * Hỗ trợ lưu trữ nhiều tabs và documents.
 */
export class LocalStorageStrategy implements IStorageStrategy {
  private readonly TABS_STORAGE_KEY = 'markdown-editor-tabs';
  private readonly LEGACY_CONTENT_KEY = 'markdown-editor-content';

  async getDocument(documentId?: string): Promise<Document> {
    // Nếu có documentId cụ thể, tìm document đó trong tabs
    if (documentId) {
      const tabsData = this.getStoredTabs();
      const tab = tabsData.tabs.find(t => t.document.id === documentId);
      if (tab) {
        return tab.document;
      }
    }

    // Nếu không có documentId hoặc không tìm thấy, trả về document mặc định
    const tabsData = this.getStoredTabs();
    if (tabsData.tabs.length > 0) {
      const activeTab = tabsData.tabs.find(t => t.isActive) || tabsData.tabs[0];
      return activeTab.document;
    }

    // Fallback: kiểm tra legacy storage hoặc dùng template
    const legacyContent = safeStorage.getItem('markdown-editor-content');
    const content = legacyContent || templateMarkdown;
    return { id: 'local', title: 'Local Document', content };
  }

  async saveDocument(document: Document): Promise<string | null> {
    // Lưu document vào tabs storage
    const tabsData = this.getStoredTabs();
    const existingTabIndex = tabsData.tabs.findIndex(t => t.document.id === document.id);
    
    if (existingTabIndex >= 0) {
      // Cập nhật document hiện có
      tabsData.tabs[existingTabIndex].document = document;
      tabsData.tabs[existingTabIndex].isDirty = false;
    } else {
      // Tạo tab mới nếu chưa tồn tại
      const newTab: TabData = {
        id: `tab-${Date.now()}`,
        document,
        isDirty: false,
        isActive: false
      };
      tabsData.tabs.push(newTab);
    }

    this.saveStoredTabs(tabsData);
    return document.id;
  }

  // Phương thức mới để lưu trữ tất cả tabs
  async saveTabs(tabs: TabData[], activeTabId: string | null): Promise<void> {
    const tabsData: StoredTabsData = {
      tabs: tabs.map(tab => ({
        ...tab,
        isDirty: false // Đánh dấu tất cả tabs đã được lưu
      })),
      activeTabId
    };
    this.saveStoredTabs(tabsData);
  }

  // Phương thức mới để load tất cả tabs
  async loadTabs(): Promise<StoredTabsData> {
    const stored = this.getStoredTabs();
    
    // Nếu không có tabs nào được lưu, tạo tab mặc định
    if (stored.tabs.length === 0) {
      const legacyContent = safeStorage.getItem('markdown-editor-content');
      const content = legacyContent || templateMarkdown;
      
      const defaultTab: TabData = {
        id: 'tab-1',
        document: { id: 'local', title: 'Local Document', content },
        isDirty: false,
        isActive: true
      };
      
      return {
        tabs: [defaultTab],
        activeTabId: 'tab-1'
      };
    }
    
    return stored;
  }

  private getStoredTabs(): StoredTabsData {
    try {
      const stored = safeStorage.getItem('markdown-editor-tabs' as any);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          tabs: parsed.tabs || [],
          activeTabId: parsed.activeTabId || null
        };
      }
    } catch (error) {
      console.warn('Failed to parse stored tabs:', error);
    }
    
    return { tabs: [], activeTabId: null };
  }

  private saveStoredTabs(tabsData: StoredTabsData): void {
    try {
      safeStorage.setItem('markdown-editor-tabs' as any, JSON.stringify(tabsData));
    } catch (error) {
      console.error('Failed to save tabs to localStorage:', error);
    }
  }

  onUpdate(callback: (newContent: string) => void): () => void {
    // localStorage không có cơ chế lắng nghe thay đổi real-time giữa các tab một cách đáng tin cậy.
    // Chúng ta sẽ để trống hàm này.
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'markdown-editor-content' && event.newValue) {
        callback(event.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Trả về hàm cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }
}