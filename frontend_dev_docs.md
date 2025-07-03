# Frontend Development Documentation

## Tổng quan kiến trúc

### Tech Stack
- **Framework**: React 18+ với TypeScript (strict mode)
- **Build Tool**: Vite
- **UI Library**: Radix UI (primitives) + Class Variance Authority (CVA) + Tailwind CSS
- **State Management**: React Context API + Custom Hooks
- **Icons**: Lucide React
- **Editor**: Monaco Editor
- **Markdown Processing**: Unified ecosystem (remark/rehype) + Web Workers
- **AI Integration**: Google Gemini API

### Kiến trúc tổng thể

Ứng dụng được thiết kế theo mô hình **Component-Hook-Service** với các nguyên tắc:

1. **Separation of Concerns**: Tách biệt UI, business logic, và data processing
2. **Custom Hooks**: Encapsulate logic và state management
3. **Service Layer**: Xử lý API calls và business logic phức tạp
4. **Web Workers**: Xử lý markdown rendering không đồng bộ
5. **Context API**: Global state management cho authentication và tab management

## Cấu trúc thư mục

```
src/
├── components/           # React components
│   ├── ui/              # Base UI components (Button, Dialog, etc.)
│   ├── layout/          # Layout components (AppHeader, AppLayout)
│   ├── auth/            # Authentication components
│   ├── dashboard/       # Dashboard-specific components
│   ├── export/          # Export functionality components
│   ├── file/            # File operations components
│   └── share/           # Sharing functionality components
├── hooks/               # Custom React hooks
├── contexts/            # React Context providers
├── core/                # Core application logic
│   ├── contexts/        # Core contexts (TabManager)
│   ├── rendering/       # Rendering utilities
│   └── strategies/      # Strategy pattern implementations
├── services/            # Business logic services
├── workers/             # Web Workers
├── lib/                 # Utility functions
├── lib-ui/              # UI-specific utilities
├── styles/              # CSS files
└── types/               # TypeScript type definitions
```

## Các thành phần chính

### 1. Entry Point (`main.tsx`)

```typescript
<StrictMode>
  <ErrorBoundary>
    <AuthProvider>
      <TabManagerProvider>
        <App />
      </TabManagerProvider>
    </AuthProvider>
  </ErrorBoundary>
</StrictMode>
```

**Provider hierarchy**:
- `ErrorBoundary`: Bắt lỗi toàn cục
- `AuthProvider`: Quản lý authentication state
- `TabManagerProvider`: Quản lý tabs và documents

### 2. App Component (`App.tsx`)

Component chính orchestrate toàn bộ ứng dụng:

```typescript
function App() {
  // Custom hooks cho state management
  const { isDarkMode, toggleTheme } = useTheme()
  const { activePanel, mobileView, isMobile } = useLayout()
  const { processMarkdown } = useMarkdownEngine()
  const { document: activeDocument } = useActiveDocument()
  
  // Markdown processing với debounce
  useEffect(() => {
    if (activeDocument?.content) {
      const timeoutId = setTimeout(() => {
        processMarkdownInWorker(activeDocument.content);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [activeDocument?.content]);
}
```

### 3. Context Providers

#### AuthContext
- Quản lý user authentication
- Tích hợp với `DatabaseStorageStrategy`
- Cung cấp: `user`, `isAuthenticated`, `login`, `logout`, `register`

#### TabManagerContext
- Quản lý multiple tabs/documents
- Auto-save functionality với debounce
- Tab state: `id`, `document`, `isDirty`, `isActive`

### 4. Custom Hooks Architecture

#### Core Hooks
- `useTheme`: Dark/light mode management
- `useLayout`: Responsive layout và panel management
- `useMarkdownEngine`: Markdown processing với Web Workers
- `useAutoComplete`: AI-powered autocomplete
- `useFileOperations`: File import/export operations
- `useKeyboardShortcuts`: Global keyboard shortcuts

#### Hook Pattern
```typescript
export function useCustomHook(): UseCustomHookReturn {
  // Local state
  const [state, setState] = useState()
  
  // Effects
  useEffect(() => {
    // Side effects
  }, [dependencies])
  
  // Memoized functions
  const memoizedFunction = useCallback(() => {
    // Logic
  }, [dependencies])
  
  return {
    // Exposed API
    state,
    actions: { memoizedFunction }
  }
}
```

### 5. Service Layer

#### MarkdownProcessorService
- Singleton pattern
- Web Worker pool management
- Markdown → HTML conversion với KaTeX support

#### GeminiService
- AI integration với Google Gemini
- Token optimization
- Smart chunking cho large content
- Content processing pipeline

#### AutoCompleteService
- AI-powered autocomplete
- Caching mechanism
- Rate limiting
- Context-aware suggestions

### 6. Web Workers

#### markdown.worker.ts
- Xử lý markdown rendering không đồng bộ
- KaTeX math rendering
- HTML sanitization
- Table styling

**Worker Communication Pattern**:
```typescript
// Request
interface WorkerRequest {
  id: string
  type: WorkerTask
  payload: any
}

// Response
interface WorkerResponse {
  id: string
  success: boolean
  payload?: any
  error?: string
}
```

### 7. UI Component System

#### Base Components (`components/ui/`)
Sử dụng **Radix UI + CVA pattern**:

```typescript
const buttonVariants = cva(
  "base-classes",
  {
    variants: {
      variant: {
        default: "default-classes",
        destructive: "destructive-classes"
      },
      size: {
        default: "default-size",
        sm: "small-size"
      }
    }
  }
)
```

#### Layout Components
- `AppHeader`: Navigation, theme toggle, panel controls
- `AppLayout`: Responsive layout với ResizablePanels
- `MobileTabSwitcher`: Mobile-specific navigation

#### Feature Components
- `MarkdownEditor`: Monaco editor với AI integration
- `MarkdownPreview`: HTML preview với syntax highlighting
- `TabBar`: Multi-tab management
- `StatusBar`: Application status display

## Luồng dữ liệu

### 1. Document Flow
```
User Input → TabManagerContext → useActiveDocument → App → MarkdownEditor
     ↓
Content Change → debounce → useMarkdownEngine → Web Worker → HTML
     ↓
HTML Update → MarkdownPreview → UI Render
```

### 2. AI Integration Flow
```
User Trigger → useAutoComplete → AutoCompleteService → Gemini API
     ↓
Suggestions → Cache → UI Display → User Selection → Editor Update
```

### 3. Authentication Flow
```
Login Form → AuthContext → DatabaseStorageStrategy → Backend API
     ↓
Auth State → Global Context → Protected Routes → UI Update
```

## Hướng dẫn tích hợp tính năng mới

### 1. Thêm UI Component mới

#### Bước 1: Tạo base component
```typescript
// components/ui/new-component.tsx
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const newComponentVariants = cva(
  "base-classes",
  {
    variants: {
      variant: {
        default: "default-variant"
      }
    }
  }
)

export interface NewComponentProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof newComponentVariants> {
  // Custom props
}

export const NewComponent = React.forwardRef<HTMLDivElement, NewComponentProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <div
        className={cn(newComponentVariants({ variant, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
```

#### Bước 2: Export component
```typescript
// components/ui/index.ts (tạo nếu chưa có)
export { NewComponent } from './new-component'
export type { NewComponentProps } from './new-component'
```

### 2. Thêm Custom Hook mới

```typescript
// hooks/useNewFeature.ts
import { useState, useCallback, useEffect } from 'react'

export interface UseNewFeatureOptions {
  // Options
}

export interface UseNewFeatureReturn {
  // Return type
}

export function useNewFeature(options: UseNewFeatureOptions): UseNewFeatureReturn {
  // Implementation
  
  return {
    // Exposed API
  }
}

// Export từ hooks/index.ts
export { useNewFeature } from './useNewFeature'
export type { UseNewFeatureReturn, UseNewFeatureOptions } from './useNewFeature'
```

### 3. Thêm Service mới

```typescript
// services/NewService.ts
class NewService {
  private static instance: NewService
  
  private constructor() {}
  
  static getInstance(): NewService {
    if (!NewService.instance) {
      NewService.instance = new NewService()
    }
    return NewService.instance
  }
  
  async performAction(data: any): Promise<any> {
    // Implementation
  }
}

export default NewService
```

### 4. Thêm Context mới

```typescript
// contexts/NewContext.tsx
interface NewContextType {
  // Context type
}

const NewContext = createContext<NewContextType | undefined>(undefined)

export function useNew() {
  const context = useContext(NewContext)
  if (context === undefined) {
    throw new Error('useNew must be used within a NewProvider')
  }
  return context
}

export function NewProvider({ children }: { children: ReactNode }) {
  // Implementation
  
  return (
    <NewContext.Provider value={value}>
      {children}
    </NewContext.Provider>
  )
}
```

### 5. Tích hợp AI Feature mới

#### Bước 1: Extend GeminiService
```typescript
// services/geminiService.ts
class GeminiService {
  async newAIFeature(input: string): Promise<string> {
    if (!this.isInitialized()) {
      throw new Error('Service not initialized')
    }
    
    const model = this.genAI!.getGenerativeModel({ model: this.modelName })
    const prompt = this.promptBuilder.buildNewFeaturePrompt(input)
    
    const result = await model.generateContent(prompt)
    return result.response.text()
  }
}
```

#### Bước 2: Tạo hook wrapper
```typescript
// hooks/useNewAIFeature.ts
export function useNewAIFeature() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  
  const processWithAI = useCallback(async (input: string) => {
    setIsLoading(true)
    try {
      const result = await geminiService.newAIFeature(input)
      setResult(result)
    } catch (error) {
      console.error('AI processing failed:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  return { processWithAI, isLoading, result }
}
```

## Best Practices

### 1. Component Design

#### Composition over Inheritance
```typescript
// Good: Composition
function FeatureComponent({ children, ...props }) {
  return (
    <BaseComponent {...props}>
      <FeatureSpecificLogic />
      {children}
    </BaseComponent>
  )
}

// Avoid: Complex inheritance hierarchies
```

#### Props Interface Design
```typescript
// Good: Clear, specific props
interface ComponentProps {
  title: string
  onAction: (data: ActionData) => void
  variant?: 'primary' | 'secondary'
}

// Avoid: Generic, unclear props
interface ComponentProps {
  data: any
  callback: Function
}
```

### 2. Hook Design

#### Single Responsibility
```typescript
// Good: Focused hook
function useMarkdownProcessor() {
  // Only markdown processing logic
}

// Avoid: Kitchen sink hook
function useEverything() {
  // Multiple unrelated concerns
}
```

#### Stable References
```typescript
// Good: Memoized callbacks
const handleAction = useCallback((data) => {
  // Action logic
}, [dependencies])

// Avoid: New functions on every render
const handleAction = (data) => {
  // Action logic
}
```

### 3. Performance Optimization

#### Lazy Loading
```typescript
// Large components
const MarkdownEditor = lazy(() => import('../MarkdownEditor'))
const MarkdownPreview = lazy(() => import('../MarkdownPreview'))

// Usage with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <MarkdownEditor />
</Suspense>
```

#### Debouncing
```typescript
// Expensive operations
useEffect(() => {
  const timeoutId = setTimeout(() => {
    expensiveOperation(input)
  }, 300)
  
  return () => clearTimeout(timeoutId)
}, [input])
```

#### Web Workers
```typescript
// CPU-intensive tasks
const processInWorker = useCallback(async (data) => {
  return new Promise((resolve) => {
    const worker = new Worker('/worker.js')
    worker.postMessage(data)
    worker.onmessage = (e) => resolve(e.data)
  })
}, [])
```

### 4. Error Handling

#### Component Level
```typescript
function Component() {
  const [error, setError] = useState<string | null>(null)
  
  const handleAction = async () => {
    try {
      await riskyOperation()
    } catch (err) {
      setError(err.message)
    }
  }
  
  if (error) {
    return <ErrorDisplay message={error} />
  }
  
  return <NormalComponent />
}
```

#### Global Error Boundary
```typescript
class ErrorBoundary extends Component {
  componentDidCatch(error, errorInfo) {
    console.error('Global error:', error, errorInfo)
    // Log to error reporting service
  }
}
```

### 5. TypeScript Best Practices

#### Strict Type Definitions
```typescript
// Good: Specific types
interface UserAction {
  type: 'CREATE' | 'UPDATE' | 'DELETE'
  payload: {
    id: string
    data: UserData
  }
}

// Avoid: Any types
interface UserAction {
  type: any
  payload: any
}
```

#### Generic Constraints
```typescript
// Good: Constrained generics
function processData<T extends { id: string }>(items: T[]): T[] {
  return items.filter(item => item.id)
}

// Avoid: Unconstrained generics
function processData<T>(items: T[]): T[] {
  return items
}
```

## Testing Strategy

### 1. Component Testing
```typescript
// Component.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Component } from './Component'

test('should handle user interaction', () => {
  const onAction = jest.fn()
  render(<Component onAction={onAction} />)
  
  fireEvent.click(screen.getByRole('button'))
  expect(onAction).toHaveBeenCalled()
})
```

### 2. Hook Testing
```typescript
// useHook.test.ts
import { renderHook, act } from '@testing-library/react'
import { useCustomHook } from './useCustomHook'

test('should update state correctly', () => {
  const { result } = renderHook(() => useCustomHook())
  
  act(() => {
    result.current.updateState('new value')
  })
  
  expect(result.current.state).toBe('new value')
})
```

### 3. Service Testing
```typescript
// Service.test.ts
import { ServiceClass } from './ServiceClass'

test('should process data correctly', async () => {
  const service = ServiceClass.getInstance()
  const result = await service.processData('input')
  
  expect(result).toEqual(expectedOutput)
})
```

## Deployment và Build

### Build Commands
```bash
# Development
yarn dev

# Production build
yarn build

# Preview production build
yarn preview

# Type checking
yarn tsc --noEmit

# Linting
yarn lint
yarn lint:fix
```

### Environment Variables
```env
# .env.local
VITE_GEMINI_API_KEY=your_api_key
VITE_APP_VERSION=1.0.0
```

### Build Optimization
- **Code Splitting**: Automatic với Vite
- **Tree Shaking**: Loại bỏ unused code
- **Asset Optimization**: Images, fonts tự động optimize
- **Bundle Analysis**: `yarn build --analyze`

## Troubleshooting

### Common Issues

1. **Markdown không render**: Kiểm tra Web Worker và console errors
2. **AI features không hoạt động**: Verify API key và network connectivity
3. **Performance issues**: Check for unnecessary re-renders và memory leaks
4. **TypeScript errors**: Ensure proper type definitions và imports

### Debug Tools
- React Developer Tools
- Redux DevTools (cho Context debugging)
- Network tab cho API calls
- Performance tab cho performance profiling

---

*Tài liệu này sẽ được cập nhật khi có thay đổi trong kiến trúc hoặc thêm tính năng mới.*