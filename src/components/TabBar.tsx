import React, { useState } from 'react';
import { X, Plus, Edit2, Check, X as XIcon } from 'lucide-react';
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

  return (
    <div
      className={cn(
        'group flex items-center gap-1 px-3 py-2 border-r border-border bg-background hover:bg-accent/50 transition-colors cursor-pointer min-w-0 max-w-[200px]',
        tab.isActive && 'bg-accent border-b-2 border-b-primary'
      )}
      onClick={() => !isEditing && onSwitch(tab.id)}
    >
      {isEditing ? (
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSaveTitle}
            className="h-6 text-xs px-1 py-0 border-0 bg-transparent focus:bg-background focus:border focus:border-primary"
            autoFocus
            onFocus={(e) => e.target.select()}
          />
          <Button
            size="sm"
            variant="ghost"
            className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              handleSaveTitle();
            }}
          >
            <Check className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              handleCancelEdit();
            }}
          >
            <XIcon className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <>
          <div 
            className="flex items-center gap-1 flex-1 min-w-0"
            onDoubleClick={handleDoubleClick}
          >
            <span className="text-sm truncate flex-1 min-w-0">
              {tab.document.title}
            </span>
            {tab.isDirty && (
              <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" title="Unsaved changes" />
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onClose(tab.id);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </>
      )}
    </div>
  );
};

const TabBar: React.FC = () => {
  const { tabs, createNewTab, closeTab, switchToTab, renameTab } = useTabManager();

  return (
    <div className="flex items-center border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Editor Label */}
      <div className="px-4 py-2 text-sm font-medium text-muted-foreground border-r border-border">
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
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 ml-1 flex-shrink-0"
          onClick={createNewTab}
          title="New tab (Ctrl+T)"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Auto Save Indicator */}
      <div className="px-4 py-2 text-xs text-muted-foreground border-l border-border flex-shrink-0">
        Auto Save
      </div>
    </div>
  );
};

export default TabBar;