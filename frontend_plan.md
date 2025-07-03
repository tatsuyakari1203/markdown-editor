# Frontend Implementation Plan - File Panel & API Integration

## Tổng quan

Kế hoạch triển khai tính năng File Panel và tích hợp API backend cho KMDE (Markdown Editor). File Panel sẽ được thêm vào bên trái của layout hiện tại, tương đương với Editor và Preview panels.

## 1. Authentication Status ✅

### Đã hoàn thành:
- ✅ **AuthContext**: Đã implement trong `src/contexts/AuthContext.tsx`
- ✅ **AuthProvider**: Đã wrap App trong `main.tsx`
- ✅ **Login/Register**: Đã có LoginForm component
- ✅ **AuthGuard**: Đã có component bảo vệ routes
- ✅ **User Profile**: Đã hiển thị trong AppHeader
- ✅ **Logout**: Đã implement trong AppHeader

### Cần kiểm tra và cập nhật:
- 🔄 **API Integration**: Cần verify tích hợp với backend API endpoints
- 🔄 **Token Management**: Cần implement Bearer token và session cookie handling
- 🔄 **Error Handling**: Cần thêm error handling cho authentication failures

## 2. File Panel Implementation

### 2.1 Core Components

#### A. FilePanel Component
**Location**: `src/components/file/FilePanel.tsx`

```typescript
interface FilePanelProps {
  isDarkMode: boolean
  isVisible: boolean
  onToggle: () => void
}

interface FileTreeNode {
  path: string
  name: string
  type: 'file' | 'folder'
  documentId?: string
  children?: FileTreeNode[]
  createdAt?: string
  updatedAt?: string
}
```

**Features cần implement:**
- 📁 File tree display với expand/collapse
- 📄 File creation (New File button)
- 📂 Folder creation (New Folder button)
- 🔍 Search functionality
- ✏️ Rename files/folders (right-click context menu)
- 🗑️ Delete files/folders (right-click context menu)
- 📋 Copy/Move files (drag & drop)
- 🔄 Refresh tree
- 📊 File info display (size, modified date)

#### B. FileTreeItem Component
**Location**: `src/components/file/FileTreeItem.tsx`

```typescript
interface FileTreeItemProps {
  node: FileTreeNode
  level: number
  isExpanded: boolean
  onToggle: (path: string) => void
  onSelect: (node: FileTreeNode) => void
  onRename: (path: string, newName: string) => void
  onDelete: (path: string) => void
  onMove: (fromPath: string, toPath: string) => void
  isDarkMode: boolean
}
```

#### C. FileContextMenu Component
**Location**: `src/components/file/FileContextMenu.tsx`

**Actions:**
- New File
- New Folder
- Rename
- Delete
- Copy Path
- Move to...

#### D. FileSearchDialog Component
**Location**: `src/components/file/FileSearchDialog.tsx`

**Features:**
- Search by filename
- Search by content (using `/api/documents/search`)
- Filter by file type
- Recent files

### 2.2 Hooks Implementation

#### A. useFileTree Hook
**Location**: `src/hooks/useFileTree.ts`

```typescript
interface UseFileTreeReturn {
  tree: FileTreeNode | null
  isLoading: boolean
  error: string | null
  expandedPaths: Set<string>
  selectedPath: string | null
  
  // Actions
  loadTree: (path?: string) => Promise<void>
  expandPath: (path: string) => void
  collapsePath: (path: string) => void
  selectPath: (path: string) => void
  createFile: (parentPath: string, name: string) => Promise<void>
  createFolder: (parentPath: string, name: string) => Promise<void>
  renameItem: (path: string, newName: string) => Promise<void>
  deleteItem: (path: string) => Promise<void>
  moveItem: (fromPath: string, toPath: string) => Promise<void>
  searchFiles: (query: string) => Promise<FileTreeNode[]>
}
```

#### B. useFileOperations Hook (Extend existing)
**Location**: `src/hooks/useFileOperations.ts`

**Thêm functions:**
- `openFileFromTree: (documentId: string) => Promise<void>`
- `saveCurrentFile: () => Promise<void>`
- `createNewFileInFolder: (folderPath: string) => Promise<void>`

### 2.3 Services Implementation

#### A. FileService
**Location**: `src/services/FileService.ts`

```typescript
class FileService {
  private static instance: FileService
  private baseUrl = 'http://localhost:3001/api'
  
  // File Tree Operations
  async getFileTree(path?: string, depth?: number): Promise<FileTreeNode>
  async createFolder(path: string, name: string): Promise<void>
  async moveFile(fromPath: string, toPath: string): Promise<void>
  async deleteFile(path: string): Promise<void>
  
  // Document Operations
  async getDocuments(folderPath?: string, limit?: number, offset?: number): Promise<Document[]>
  async getDocument(id: string): Promise<Document>
  async createDocument(title: string, content: string, folderPath?: string): Promise<Document>
  async updateDocument(id: string, updates: Partial<Document>): Promise<Document>
  async deleteDocument(id: string): Promise<void>
  async searchDocuments(query: string, limit?: number, offset?: number): Promise<Document[]>
  
  // Helper methods
  private getAuthHeaders(): HeadersInit
  private handleApiError(response: Response): Promise<never>
}
```

## 3. Layout Integration

### 3.1 Update AppHeader
**File**: `src/components/layout/AppHeader.tsx`

**Changes needed:**
- Thêm File toggle button vào panel controls
- Update PanelType để include 'files'
- Thêm keyboard shortcut (Ctrl+Shift+E) cho toggle file panel

```typescript
// Thêm vào panel controls section
<Button
  variant={showFilePanel ? 'default' : 'ghost'}
  size="sm"
  onClick={() => toggleFilePanel()}
  className="h-8"
  title="Toggle File Panel (Ctrl+Shift+E)"
>
  <Folder className="w-4 h-4 mr-1" />
  Files
</Button>
```

### 3.2 Update AppLayout
**File**: `src/components/layout/AppLayout.tsx`

**Changes needed:**
- Thêm File Panel vào ResizablePanelGroup
- Update layout structure: Files | Editor | Preview
- Handle responsive behavior cho mobile

```typescript
// New layout structure
<ResizablePanelGroup direction="horizontal" className="h-full overflow-hidden">
  {/* File Panel */}
  {showFilePanel && (
    <>
      <ResizablePanel 
        id="file-panel"
        order={1}
        defaultSize={20}
        minSize={15}
        maxSize={40}
      >
        <FilePanel 
          isDarkMode={isDarkMode}
          isVisible={showFilePanel}
          onToggle={toggleFilePanel}
        />
      </ResizablePanel>
      <ResizableHandle withHandle />
    </>
  )}
  
  {/* Existing Editor Panel */}
  {/* Existing Preview Panel */}
</ResizablePanelGroup>
```

### 3.3 Update useLayout Hook
**File**: `src/hooks/useLayout.ts`

**Changes needed:**
- Thêm `showFilePanel` state
- Thêm `toggleFilePanel` function
- Update responsive logic

```typescript
export interface UseLayoutReturn {
  // Existing properties...
  showFilePanel: boolean
  toggleFilePanel: () => void
}

export function useLayout(): UseLayoutReturn {
  const [showFilePanel, setShowFilePanel] = useState(true)
  
  const toggleFilePanel = useCallback(() => {
    setShowFilePanel(prev => !prev)
  }, [])
  
  // Return updated interface
}
```

## 4. TabManager Integration

### 4.1 Update TabManagerContext
**File**: `src/core/contexts/TabManagerContext.tsx`

**Changes needed:**
- Integrate với FileService để load documents từ API
- Update auto-save logic để sync với backend
- Implement conflict resolution cho concurrent edits
- Add file path tracking cho tabs

```typescript
interface Tab {
  id: string
  document: Document
  isDirty: boolean
  isActive: boolean
  filePath?: string // Thêm để track file location
  lastSavedAt?: Date // Thêm để track save status
}

interface TabManagerContextType {
  // Existing properties...
  openFileFromTree: (documentId: string, filePath: string) => Promise<void>
  saveAllTabs: () => Promise<void>
  getUnsavedTabs: () => Tab[]
}
```

### 4.2 Auto-save Logic Enhancement

**Strategy:**
1. **Primary Source**: API backend
2. **Cache Layer**: localStorage cho UI state và unsaved changes
3. **Conflict Resolution**: Last-write-wins với user notification

```typescript
// Auto-save implementation
const autoSave = useCallback(async (tabId: string, content: string) => {
  try {
    // Save to API first
    await fileService.updateDocument(tabId, { content })
    
    // Update local cache
    updateTabInCache(tabId, { content, lastSavedAt: new Date() })
    
    // Clear dirty flag
    setTabDirty(tabId, false)
  } catch (error) {
    // Keep in localStorage as backup
    saveToLocalStorage(tabId, content)
    
    // Show error notification
    showNotification('Auto-save failed. Changes saved locally.', 'warning')
  }
}, [])

// Debounced auto-save
const debouncedAutoSave = useMemo(
  () => debounce(autoSave, 2000),
  [autoSave]
)
```

## 5. API Integration Details

### 5.1 Authentication API

#### Update AuthContext
**File**: `src/contexts/AuthContext.tsx`

```typescript
// Add API integration
const login = async (username: string, password: string) => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error.message)
    }
    
    const data = await response.json()
    
    // Store token
    localStorage.setItem('auth_token', data.data.session.token)
    
    // Update state
    setUser(data.data.user)
    setIsAuthenticated(true)
    
    return data.data.user
  } catch (error) {
    console.error('Login failed:', error)
    throw error
  }
}
```

### 5.2 Document API Integration

#### HTTP Client Setup
**File**: `src/lib/api.ts`

```typescript
class ApiClient {
  private baseUrl = 'http://localhost:3001/api'
  
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token')
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  }
  
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T>
  async post<T>(endpoint: string, data?: any): Promise<T>
  async put<T>(endpoint: string, data?: any): Promise<T>
  async delete<T>(endpoint: string): Promise<T>
}

export const apiClient = new ApiClient()
```

### 5.3 Error Handling Strategy

```typescript
// Global error handler
const handleApiError = (error: any) => {
  if (error.status === 401) {
    // Token expired, redirect to login
    logout()
    return
  }
  
  if (error.status === 403) {
    showNotification('Access denied', 'error')
    return
  }
  
  if (error.status >= 500) {
    showNotification('Server error. Please try again.', 'error')
    return
  }
  
  // Show specific error message
  showNotification(error.message || 'An error occurred', 'error')
}
```

## 6. Storage Strategy

### 6.1 Hybrid Storage Approach

**Primary**: API Backend
- All documents và file structure
- User preferences
- Authentication state

**Secondary**: localStorage Cache
- UI state (panel sizes, expanded folders)
- Unsaved changes (backup)
- Recently opened files
- Offline fallback data

```typescript
// Storage strategy implementation
class StorageStrategy {
  async saveDocument(doc: Document): Promise<void> {
    try {
      // Primary: Save to API
      await apiClient.put(`/documents/${doc.id}`, doc)
      
      // Cache: Update localStorage
      this.updateCache('documents', doc.id, doc)
    } catch (error) {
      // Fallback: Save to localStorage only
      this.saveToLocalStorage('unsaved_documents', doc.id, doc)
      throw error
    }
  }
  
  async loadDocument(id: string): Promise<Document> {
    try {
      // Primary: Load from API
      const doc = await apiClient.get<Document>(`/documents/${id}`)
      
      // Cache: Update localStorage
      this.updateCache('documents', id, doc)
      
      return doc
    } catch (error) {
      // Fallback: Load from localStorage
      const cachedDoc = this.getFromCache('documents', id)
      if (cachedDoc) {
        return cachedDoc
      }
      throw error
    }
  }
}
```

## 7. Keyboard Shortcuts

### 7.1 File Panel Shortcuts

```typescript
// Add to useKeyboardShortcuts hook
const fileShortcuts = {
  'ctrl+shift+e': () => toggleFilePanel(),
  'ctrl+n': () => createNewFile(),
  'ctrl+shift+n': () => createNewFolder(),
  'f2': () => renameSelectedFile(),
  'delete': () => deleteSelectedFile(),
  'ctrl+f': () => openFileSearch(),
  'escape': () => closeFileSearch()
}
```

## 8. Mobile Responsiveness

### 8.1 Mobile File Panel

**Strategy**: File Panel sẽ là một tab riêng trong mobile view

```typescript
// Update MobileViewType
export type MobileViewType = 'files' | 'editor' | 'preview'

// Update MobileTabSwitcher
const tabs = [
  { id: 'files', label: 'Files', icon: Folder },
  { id: 'editor', label: 'Editor', icon: Edit },
  { id: 'preview', label: 'Preview', icon: Eye }
]
```

## 9. Performance Optimization

### 9.1 File Tree Virtualization

```typescript
// For large file trees, implement virtualization
import { FixedSizeList as List } from 'react-window'

const VirtualizedFileTree = ({ nodes }: { nodes: FileTreeNode[] }) => {
  const Row = ({ index, style }: { index: number, style: any }) => (
    <div style={style}>
      <FileTreeItem node={nodes[index]} />
    </div>
  )
  
  return (
    <List
      height={600}
      itemCount={nodes.length}
      itemSize={32}
    >
      {Row}
    </List>
  )
}
```

### 9.2 Debounced Operations

```typescript
// Debounce expensive operations
const debouncedSearch = useMemo(
  () => debounce(async (query: string) => {
    const results = await fileService.searchDocuments(query)
    setSearchResults(results)
  }, 300),
  []
)

const debouncedAutoSave = useMemo(
  () => debounce(async (content: string) => {
    await fileService.updateDocument(activeDocumentId, { content })
  }, 2000),
  [activeDocumentId]
)
```

## 10. Testing Strategy

### 10.1 Component Tests

```typescript
// FilePanel.test.tsx
describe('FilePanel', () => {
  test('should display file tree', async () => {
    render(<FilePanel isDarkMode={false} isVisible={true} onToggle={jest.fn()} />)
    
    await waitFor(() => {
      expect(screen.getByText('My Document')).toBeInTheDocument()
    })
  })
  
  test('should handle file selection', async () => {
    const onSelect = jest.fn()
    render(<FileTreeItem node={mockNode} onSelect={onSelect} />)
    
    fireEvent.click(screen.getByText('My Document'))
    expect(onSelect).toHaveBeenCalledWith(mockNode)
  })
})
```

### 10.2 Integration Tests

```typescript
// FileOperations.test.tsx
describe('File Operations Integration', () => {
  test('should create and open new file', async () => {
    const { result } = renderHook(() => useFileTree())
    
    await act(async () => {
      await result.current.createFile('/projects', 'new-file.md')
    })
    
    expect(result.current.tree?.children).toContainEqual(
      expect.objectContaining({ name: 'new-file.md' })
    )
  })
})
```

## 11. Implementation Timeline

### Phase 1: Core Infrastructure (Week 1)
- ✅ Verify Authentication integration
- 🔄 Setup API client và error handling
- 🔄 Create FileService class
- 🔄 Update storage strategy

### Phase 2: File Panel UI (Week 2)
- 🔄 Create FilePanel component
- 🔄 Create FileTreeItem component
- 🔄 Implement basic file tree display
- 🔄 Add file/folder creation

### Phase 3: Advanced Features (Week 3)
- 🔄 Add context menu
- 🔄 Implement drag & drop
- 🔄 Add search functionality
- 🔄 Implement rename/delete operations

### Phase 4: Integration & Polish (Week 4)
- 🔄 Integrate với TabManager
- 🔄 Update layout và responsive design
- 🔄 Add keyboard shortcuts
- 🔄 Performance optimization
- 🔄 Testing và bug fixes

## 12. Risk Mitigation

### 12.1 API Connectivity Issues
- **Solution**: Robust offline fallback với localStorage
- **Implementation**: Queue failed requests và retry when online

### 12.2 Concurrent Edit Conflicts
- **Solution**: Implement optimistic updates với conflict resolution
- **Implementation**: Show diff dialog when conflicts detected

### 12.3 Performance với Large File Trees
- **Solution**: Implement virtualization và lazy loading
- **Implementation**: Load folders on-demand và paginate results

### 12.4 Mobile UX Challenges
- **Solution**: Dedicated mobile file browser với touch-friendly interactions
- **Implementation**: Swipe gestures và long-press context menus

---

## Conclusion

Kế hoạch này cung cấp roadmap chi tiết để implement File Panel và tích hợp API backend. Trọng tâm là:

1. **Tương thích ngược**: Giữ nguyên functionality hiện tại
2. **Progressive Enhancement**: Thêm features mới mà không breaking existing code
3. **Robust Error Handling**: Graceful degradation khi API unavailable
4. **Performance**: Optimize cho large file trees và frequent operations
5. **User Experience**: Intuitive file management với keyboard shortcuts

Implementation sẽ được thực hiện theo phases để đảm bảo stability và cho phép testing từng component riêng biệt.