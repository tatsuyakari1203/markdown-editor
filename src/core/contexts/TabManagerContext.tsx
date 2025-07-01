import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { IStorageStrategy, Document } from '../strategies/IStorageStrategy';
import { LocalStorageStrategy } from '../strategies/LocalStorageStrategy';
import { normalizeTableContent } from '@/lib/table-normalizer';

// Định nghĩa Tab interface
export interface Tab {
  id: string;
  document: Document;
  isDirty: boolean; // Có thay đổi chưa lưu không
  isActive: boolean;
}

// Context type
interface TabManagerContextType {
  tabs: Tab[];
  activeTabId: string | null;
  createNewTab: () => void;
  closeTab: (tabId: string) => void;
  switchToTab: (tabId: string) => void;
  updateTabContent: (tabId: string, content: string) => void;
  renameTab: (tabId: string, newTitle: string) => void;
  isLoading: boolean;
  isSaving: boolean;
}

const TabManagerContext = createContext<TabManagerContextType | null>(null);

export const TabManagerProvider = ({ children }: { children: React.ReactNode }) => {
  const [strategy] = useState<IStorageStrategy>(() => new LocalStorageStrategy());
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial tabs from storage
  useEffect(() => {
    const loadInitialTabs = async () => {
      setIsLoading(true);
      try {
        // Sử dụng phương thức loadTabs mới
        const tabsData = await (strategy as any).loadTabs();
        setTabs(tabsData.tabs);
        setActiveTabId(tabsData.activeTabId);
      } catch (error) {
        console.error('Failed to load tabs:', error);
        // Fallback: tạo tab mặc định
        const document = await strategy.getDocument();
        const initialTab: Tab = {
          id: 'tab-1',
          document,
          isDirty: false,
          isActive: true
        };
        setTabs([initialTab]);
        setActiveTabId('tab-1');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialTabs();
  }, [strategy]);

  // Auto-save logic
  useEffect(() => {
    if (tabs.length === 0 || isLoading) return;

    const dirtyTabs = tabs.filter(tab => tab.isDirty);
    if (dirtyTabs.length === 0) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        // Chuẩn hóa nội dung cho tất cả tabs dirty
        const normalizedTabs = tabs.map(tab => {
          if (tab.isDirty) {
            return {
              ...tab,
              document: {
                ...tab.document,
                content: normalizeTableContent(tab.document.content)
              }
            };
          }
          return tab;
        });
        
        // Lưu tất cả tabs cùng lúc
        await (strategy as any).saveTabs(normalizedTabs, activeTabId);
        
        // Mark tabs as saved
        setTabs(prevTabs => 
          prevTabs.map(tab => ({ ...tab, isDirty: false }))
        );
      } catch (error) {
        console.error('Failed to save tabs:', error);
      } finally {
        setIsSaving(false);
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [tabs, strategy, isLoading]);

  // Save tabs structure when tabs or activeTabId changes (not content)
  useEffect(() => {
    if (tabs.length === 0 || isLoading || isSaving) return;

    // Debounce để tránh lưu quá nhiều lần
    const saveTabsStructure = setTimeout(async () => {
      try {
        await (strategy as any).saveTabs(tabs, activeTabId);
      } catch (error) {
        console.error('Failed to save tabs structure:', error);
      }
    }, 500);

    return () => clearTimeout(saveTabsStructure);
  }, [tabs.length, activeTabId, strategy, isLoading, isSaving]);

  const createNewTab = useCallback(() => {
    const newTabId = `tab-${Date.now()}`;
    const newDocument: Document = {
      id: null,
      title: `Untitled ${tabs.length + 1}`,
      content: '# New Document\n\nStart writing your markdown here...'
    };

    const newTab: Tab = {
      id: newTabId,
      document: newDocument,
      isDirty: true,
      isActive: false
    };

    setTabs(prevTabs => [
      ...prevTabs.map(tab => ({ ...tab, isActive: false })),
      { ...newTab, isActive: true }
    ]);
    setActiveTabId(newTabId);
  }, [tabs.length]);

  const closeTab = useCallback((tabId: string) => {
    setTabs(prevTabs => {
      const updatedTabs = prevTabs.filter(tab => tab.id !== tabId);
      
      // If closing active tab, switch to another tab
      if (activeTabId === tabId && updatedTabs.length > 0) {
        const newActiveTab = updatedTabs[updatedTabs.length - 1];
        setActiveTabId(newActiveTab.id);
        return updatedTabs.map(tab => 
          tab.id === newActiveTab.id 
            ? { ...tab, isActive: true }
            : { ...tab, isActive: false }
        );
      }
      
      // If no tabs left, create a new one
      if (updatedTabs.length === 0) {
        const defaultDocument: Document = {
          id: null,
          title: 'Untitled',
          content: '# Welcome\n\nStart writing your markdown here...'
        };
        const defaultTab: Tab = {
          id: 'tab-default',
          document: defaultDocument,
          isDirty: true,
          isActive: true
        };
        setActiveTabId('tab-default');
        return [defaultTab];
      }
      
      return updatedTabs;
    });
  }, [activeTabId]);

  const switchToTab = useCallback((tabId: string) => {
    setTabs(prevTabs => 
      prevTabs.map(tab => ({
        ...tab,
        isActive: tab.id === tabId
      }))
    );
    setActiveTabId(tabId);
  }, []);

  const updateTabContent = useCallback((tabId: string, content: string) => {
    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === tabId
          ? { 
              ...tab, 
              document: { ...tab.document, content },
              isDirty: true
            }
          : tab
      )
    );
  }, []);

  const renameTab = useCallback((tabId: string, newTitle: string) => {
    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === tabId
          ? { 
              ...tab, 
              document: { ...tab.document, title: newTitle },
              isDirty: true
            }
          : tab
      )
    );
  }, []);

  const value = {
    tabs,
    activeTabId,
    createNewTab,
    closeTab,
    switchToTab,
    updateTabContent,
    renameTab,
    isLoading,
    isSaving
  };

  return (
    <TabManagerContext.Provider value={value}>
      {children}
    </TabManagerContext.Provider>
  );
};

export const useTabManager = () => {
  const context = useContext(TabManagerContext);
  if (!context) {
    throw new Error('useTabManager must be used within a TabManagerProvider');
  }
  return context;
};

// Hook để lấy document hiện tại (tương thích với useDocument cũ)
export const useActiveDocument = () => {
  const { tabs, activeTabId, updateTabContent } = useTabManager();
  
  const activeTab = tabs.find(tab => tab.id === activeTabId);
  
  return {
    document: activeTab?.document || null,
    updateDocumentContent: (content: string) => {
      if (activeTabId) {
        updateTabContent(activeTabId, content);
      }
    },
    isLoading: false,
    isSaving: activeTab?.isDirty || false
  };
};