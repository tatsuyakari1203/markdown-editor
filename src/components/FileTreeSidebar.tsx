import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTabManager } from '../contexts/TabManagerContext';
import { useToast } from '../hooks/useToast';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { 
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from './ui/context-menu';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Label } from './ui/label';
import { 
  ChevronRight, 
  ChevronDown, 
  File, 
  Folder, 
  FolderPlus, 
  FilePlus,
  Trash2,
  Edit3
} from 'lucide-react';

interface FileTreeNode {
  id: string;
  title: string;
  path: string;
  is_directory: boolean;
  parent_id: string | null;
  children?: FileTreeNode[];
}

interface FileTreeItemProps {
  node: FileTreeNode;
  level: number;
  onSelect: (node: FileTreeNode) => void;
  onCreateFile: (parentId: string) => void;
  onCreateFolder: (parentId: string) => void;
  onDelete: (node: FileTreeNode) => void;
  onRename: (node: FileTreeNode) => void;
}

function FileTreeItem({ 
  node, 
  level, 
  onSelect, 
  onCreateFile, 
  onCreateFolder, 
  onDelete, 
  onRename 
}: FileTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = node.children && node.children.length > 0;

  const handleToggle = () => {
    if (node.is_directory) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleSelect = () => {
    if (!node.is_directory) {
      onSelect(node);
    }
  };

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger>
          <div 
            className={`flex items-center gap-1 px-2 py-1 hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm`}
            style={{ paddingLeft: `${level * 12 + 8}px` }}
            onClick={node.is_directory ? handleToggle : handleSelect}
          >
            {node.is_directory ? (
              <>
                {hasChildren ? (
                  isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                ) : (
                  <div className="w-4" />
                )}
                <Folder className="h-4 w-4 text-blue-500" />
              </>
            ) : (
              <>
                <div className="w-4" />
                <File className="h-4 w-4 text-gray-500" />
              </>
            )}
            <span className="truncate">{node.title}</span>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {node.is_directory && (
            <>
              <ContextMenuItem onClick={() => onCreateFile(node.id)}>
                <FilePlus className="mr-2 h-4 w-4" />
                New File
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onCreateFolder(node.id)}>
                <FolderPlus className="mr-2 h-4 w-4" />
                New Folder
              </ContextMenuItem>
            </>
          )}
          <ContextMenuItem onClick={() => onRename(node)}>
            <Edit3 className="mr-2 h-4 w-4" />
            Rename
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onDelete(node)} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      
      {node.is_directory && isExpanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <FileTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              onCreateFile={onCreateFile}
              onCreateFolder={onCreateFolder}
              onDelete={onDelete}
              onRename={onRename}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
  title: string;
  description: string;
  placeholder: string;
}

function CreateDialog({ isOpen, onClose, onConfirm, title, description, placeholder }: CreateDialogProps) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onConfirm(name.trim());
      setName('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={placeholder}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function FileTreeSidebar() {
  const { databaseStorage, isAuthenticated } = useAuth();
  const { openTab } = useTabManager();
  const { toast } = useToast();
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [createDialog, setCreateDialog] = useState<{
    isOpen: boolean;
    type: 'file' | 'folder';
    parentId: string | null;
  }>({ isOpen: false, type: 'file', parentId: null });

  const loadFileTree = async () => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    try {
      const tree = await databaseStorage.getFileTree();
      setFileTree(tree);
    } catch (error) {
      console.error('Failed to load file tree:', error);
      toast({
        title: 'Error',
        description: 'Failed to load file tree',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFileTree();
  }, [isAuthenticated]);

  const handleSelectFile = async (node: FileTreeNode) => {
    try {
      const document = await databaseStorage.getDocument(node.id);
      if (document) {
        openTab({
          id: node.id,
          title: node.title,
          content: document.content,
          isDirty: false,
          path: node.path
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load document',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to open document:', error);
      toast({
        title: 'Error',
        description: 'Failed to open document',
        variant: 'destructive'
      });
    }
  };

  const handleCreateFile = (parentId: string) => {
    setCreateDialog({ isOpen: true, type: 'file', parentId });
  };

  const handleCreateFolder = (parentId: string) => {
    setCreateDialog({ isOpen: true, type: 'folder', parentId });
  };

  const handleCreate = async (name: string) => {
    // This would need to be implemented with API calls
    // For now, just show a toast
    toast({
      title: 'Info',
      description: 'Create functionality will be implemented soon',
    });
  };

  const handleDelete = async (node: FileTreeNode) => {
    // This would need to be implemented with API calls
    toast({
      title: 'Info',
      description: 'Delete functionality will be implemented soon',
    });
  };

  const handleRename = async (node: FileTreeNode) => {
    // This would need to be implemented with API calls
    toast({
      title: 'Info',
      description: 'Rename functionality will be implemented soon',
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="w-64 border-r bg-background p-4">
        <div className="text-sm text-muted-foreground">
          Please log in to view your files.
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 border-r bg-background flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Files</h2>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleCreateFile('')}
              className="h-6 w-6 p-0"
            >
              <FilePlus className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleCreateFolder('')}
              className="h-6 w-6 p-0"
            >
              <FolderPlus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 text-sm text-muted-foreground">
            Loading...
          </div>
        ) : fileTree.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">
            No files yet. Create your first document!
          </div>
        ) : (
          <div className="py-2">
            {fileTree.map((node) => (
              <FileTreeItem
                key={node.id}
                node={node}
                level={0}
                onSelect={handleSelectFile}
                onCreateFile={handleCreateFile}
                onCreateFolder={handleCreateFolder}
                onDelete={handleDelete}
                onRename={handleRename}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      <CreateDialog
        isOpen={createDialog.isOpen}
        onClose={() => setCreateDialog({ isOpen: false, type: 'file', parentId: null })}
        onConfirm={handleCreate}
        title={createDialog.type === 'file' ? 'Create New File' : 'Create New Folder'}
        description={`Enter a name for the new ${createDialog.type}.`}
        placeholder={createDialog.type === 'file' ? 'document.md' : 'New Folder'}
      />
    </div>
  );
}