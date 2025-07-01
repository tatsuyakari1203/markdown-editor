import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Check, X as XIcon, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useTabManager } from '../core/contexts/TabManagerContext';
import { cn } from '../lib/utils';

interface TabItemProps {
  tab: {
    id: string;
    document: {
      title: string;
    };
    isDirty: boolean;
    isActive: boolean;
  };
  onClose: (tabId: string) => void;
  onSwitch: (tabId: string) => void;
  onRename: (tabId: string, newTitle: string) => void;
}

const TabItem: React.FC<TabItemProps> = ({ tab, onClose, onSwitch, onRename }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(tab.document.title);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditTitle(tab.document.title);
  };

  const handleSaveTitle = () => {
    if (editTitle.trim() && editTitle !== tab.document.title) {
      onRename(tab.id, editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(tab.document.title);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleDeleteClick = () => {
    setIsConfirmingDelete(true);
  };

  const handleConfirmDelete = () => {
    onClose(tab.id);
    setIsConfirmingDelete(false);
  };

  const handleCancelDelete = () => {
    setIsConfirmingDelete(false);
  };

  // Auto-cancel delete confirmation after 5 seconds
  useEffect(() => {
    if (isConfirmingDelete) {
      const timer = setTimeout(() => {
        setIsConfirmingDelete(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmingDelete]);

  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-3 py-2 border-r border-gray-200 bg-white hover:bg-gray-50 transition-all duration-300 cursor-pointer min-w-0 relative',
        tab.isActive && 'bg-orange-50 border-b-2 border-b-black',
        isConfirmingDelete ? 'bg-red-50 border-red-300 max-w-[320px]' : 'max-w-[220px]'
      )}
      onClick={() => !isEditing && !isConfirmingDelete && onSwitch(tab.id)}
    >
      {isEditing ? (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSaveTitle}
            className="h-7 text-sm px-2 py-1 border border-gray-300 bg-white focus:bg-white focus:border-blue-400 focus:outline-none rounded font-medium"
            autoFocus
            onFocus={(e) => e.target.select()}
          />
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-green-500 hover:text-green-600 hover:bg-green-100 rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleSaveTitle();
            }}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleCancelEdit();
            }}
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <>
          <div 
            className="flex items-center gap-2 flex-1 min-w-0"
            onDoubleClick={handleDoubleClick}
          >
            <span className="text-sm font-medium text-gray-700 truncate flex-1 min-w-0">
              {tab.document.title}
            </span>
            {tab.isDirty && (
              <div className="w-2 h-2 bg-orange-400 rounded-full flex-shrink-0" title="Unsaved changes" />
            )}
          </div>
          {isConfirmingDelete ? (
             <div className="flex items-center gap-2 flex-shrink-0">
               <Button
                 size="sm"
                 variant="ghost"
                 className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-100 rounded transition-colors"
                 onClick={(e) => {
                   e.stopPropagation();
                   handleConfirmDelete();
                 }}
                 title="Confirm delete"
               >
                 <Check className="h-4 w-4" />
               </Button>
               <Button
                 size="sm"
                 variant="ghost"
                 className="h-6 w-6 p-0 text-gray-500 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                 onClick={(e) => {
                   e.stopPropagation();
                   handleCancelDelete();
                 }}
                 title="Cancel delete"
               >
                 <X className="h-4 w-4" />
               </Button>
             </div>
           ) : (
             <Button
               size="sm"
               variant="ghost"
               className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 flex-shrink-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all"
               onClick={(e) => {
                 e.stopPropagation();
                 handleDeleteClick();
               }}
               title="Delete tab"
             >
               <X className="h-4 w-4" />
             </Button>
           )}
        </>
      )}
    </div>
  );
};

const TabBar: React.FC = () => {
  const { tabs, createNewTab, closeTab, switchToTab, renameTab } = useTabManager();

  return (
    <div className="flex items-center border-b border-gray-200 bg-white px-3 py-1 gap-2 overflow-x-auto scrollbar-hide transition-colors duration-300">
      {/* Editor Label */}
      <div className="px-4 py-2 text-sm font-semibold text-gray-600 border-r border-gray-200">
        Editor
      </div>
      
      {/* Tabs Container */}
      <div className="flex items-center flex-1 min-w-0 overflow-x-auto">
        <div className="flex items-center min-w-0">
          {tabs.map((tab) => (
            <TabItem
              key={tab.id}
              tab={tab}
              onClose={closeTab}
              onSwitch={switchToTab}
              onRename={renameTab}
            />
          ))}
        </div>
        
        {/* New Tab Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={createNewTab}
          className="h-7 px-2 ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>
      
      {/* Auto Save Indicator */}
      <div className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 border-l border-gray-200 flex-shrink-0">
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
        <span>Auto Save</span>
      </div>
    </div>
  );
};

export default TabBar;