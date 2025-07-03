# KMDE API Documentation

## Tổng quan

API cho KMDE (Markdown Editor) được thiết kế để hỗ trợ:
- Authentication với username/password
- Quản lý documents/files
- File tree structure
- Tương thích với frontend hiện tại

**Base URL**: `http://localhost:3001/api`

## Authentication

Tất cả API endpoints (trừ login/register) yêu cầu authentication. Backend hỗ trợ hai phương thức:

**Phương thức 1 (Ưu tiên): Bearer Token**
```
Authorization: Bearer <session_token>
```

**Phương thức 2 (Fallback): Session Cookie**
```
Cookie: sessionId=<session_id>
```

*Lưu ý: Backend sẽ kiểm tra Authorization header trước, nếu không có sẽ fallback sang sessionId cookie.*

## API Endpoints

### Authentication

#### POST /api/auth/login
Đăng nhập user

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "john_doe"
    },
    "session": {
      "token": "session_token_here",
      "expiresAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

**Headers:**
```
Set-Cookie: sessionId=<session_token>; HttpOnly; Secure; SameSite=Strict; Max-Age=604800; Path=/
```

*Lưu ý: Backend sẽ tự động set sessionId cookie để hỗ trợ authentication qua cookie.*

**Response (401):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid username or password"
  }
}
```

#### POST /api/auth/register
Đăng ký user mới (optional feature)

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "john_doe"
    }
  }
}
```

#### POST /api/auth/logout
Đăng xuất user

**Headers:**
```
Authorization: Bearer <session_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### GET /api/auth/me
Lấy thông tin user hiện tại

**Headers:**
```
Authorization: Bearer <session_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "john_doe",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

### Documents

#### GET /api/documents
Lấy danh sách tất cả documents của user

**Headers:**
```
Authorization: Bearer <session_token>
```

**Query Parameters:**
- `folder_path` (optional): Filter theo folder path
- `limit` (optional): Số lượng documents trả về (default: 50)
- `offset` (optional): Offset cho pagination (default: 0)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": "doc_123",
        "title": "My Document",
        "content": "# Hello World\n\nThis is my document.",
        "folderPath": "/projects",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T12:00:00Z"
      }
    ],
    "total": 1,
    "hasMore": false
  }
}
```

#### GET /api/documents/:id
Lấy document theo ID

**Headers:**
```
Authorization: Bearer <session_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "document": {
      "id": "doc_123",
      "title": "My Document",
      "content": "# Hello World\n\nThis is my document.",
      "folderPath": "/projects",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T12:00:00Z"
    }
  }
}
```

**Response (404):**
```json
{
  "success": false,
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Document not found"
  }
}
```

#### POST /api/documents
Tạo document mới

**Headers:**
```
Authorization: Bearer <session_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "string",
  "content": "string",
  "folderPath": "string" // optional, default: "/"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "document": {
      "id": "doc_124",
      "title": "New Document",
      "content": "# New Document\n\nContent here.",
      "folderPath": "/",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

#### PUT /api/documents/:id
Cập nhật document

**Headers:**
```
Authorization: Bearer <session_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "string", // optional
  "content": "string", // optional
  "folderPath": "string" // optional
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "document": {
      "id": "doc_123",
      "title": "Updated Document",
      "content": "# Updated Content",
      "folderPath": "/projects",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T13:00:00Z"
    }
  }
}
```

#### DELETE /api/documents/:id
Xóa document

**Headers:**
```
Authorization: Bearer <session_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

#### POST /api/documents/search
Tìm kiếm documents theo nội dung

**Headers:**
```
Authorization: Bearer <session_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "query": "string", // required - từ khóa tìm kiếm
  "limit": 20, // optional - số lượng kết quả tối đa (default: 20)
  "offset": 0 // optional - vị trí bắt đầu (default: 0)
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": "doc_123",
        "title": "My Document",
        "content": "# My Document\n\nThis contains the search term...",
        "folderPath": "/projects",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T12:00:00Z"
      }
    ],
    "total": 1,
    "hasMore": false
  }
}
```

### File Tree

#### GET /api/files/tree
Lấy cấu trúc file tree của user

**Headers:**
```
Authorization: Bearer <session_token>
```

**Query Parameters:**
- `path` (optional): Root path để lấy tree (default: "/")
- `depth` (optional): Độ sâu của tree (default: unlimited)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "tree": {
      "path": "/",
      "name": "root",
      "type": "folder",
      "children": [
        {
          "path": "/projects",
          "name": "projects",
          "type": "folder",
          "children": [
            {
              "path": "/projects/doc_123",
              "name": "My Document",
              "type": "file",
              "documentId": "doc_123",
              "createdAt": "2024-01-01T00:00:00Z",
              "updatedAt": "2024-01-01T12:00:00Z"
            }
          ]
        },
        {
          "path": "/doc_124",
          "name": "New Document",
          "type": "file",
          "documentId": "doc_124",
          "createdAt": "2024-01-01T00:00:00Z",
          "updatedAt": "2024-01-01T00:00:00Z"
        }
      ]
    }
  }
}
```

#### POST /api/files/folder
Tạo folder mới

**Headers:**
```
Authorization: Bearer <session_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "path": "string", // Full path của folder mới
  "name": "string"  // Tên folder
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "folder": {
      "path": "/new-folder",
      "name": "new-folder",
      "type": "folder"
    }
  }
}
```

#### PUT /api/files/move
Di chuyển file hoặc folder

**Headers:**
```
Authorization: Bearer <session_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "fromPath": "string", // Path hiện tại
  "toPath": "string"    // Path đích
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "File moved successfully",
  "data": {
    "fromPath": "/old-path",
    "toPath": "/new-path"
  }
}
```

#### DELETE /api/files
Xóa file hoặc folder

**Headers:**
```
Authorization: Bearer <session_token>
```

**Query Parameters:**
- `path`: Path của file/folder cần xóa

**Response (200):**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

## Error Responses

Tất cả error responses đều có format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {} // optional additional details
  }
}
```

### Common Error Codes

- `UNAUTHORIZED` (401): Missing or invalid authentication
- `FORBIDDEN` (403): User không có quyền truy cập resource
- `NOT_FOUND` (404): Resource không tồn tại
- `VALIDATION_ERROR` (400): Request data không hợp lệ
- `CONFLICT` (409): Resource đã tồn tại (duplicate)
- `INTERNAL_ERROR` (500): Server error

### Authentication Errors

- `INVALID_CREDENTIALS`: Username/password không đúng
- `SESSION_EXPIRED`: Session token đã hết hạn
- `INVALID_TOKEN`: Token không hợp lệ

### Document Errors

- `DOCUMENT_NOT_FOUND`: Document không tồn tại
- `DOCUMENT_ACCESS_DENIED`: User không có quyền truy cập document
- `INVALID_DOCUMENT_DATA`: Dữ liệu document không hợp lệ

### File Tree Errors

- `INVALID_PATH`: Path không hợp lệ
- `PATH_NOT_FOUND`: Path không tồn tại
- `FOLDER_NOT_EMPTY`: Không thể xóa folder có chứa files
- `PATH_ALREADY_EXISTS`: Path đã tồn tại

## Rate Limiting

- **Authentication endpoints**: 5 requests/minute per IP
- **Document CRUD**: 100 requests/minute per user
- **File tree operations**: 50 requests/minute per user

## Data Types

### Document
```typescript
interface Document {
  id: string;           // UUID
  title: string;        // Document title
  content: string;      // Markdown content
  folderPath: string;   // Folder path (e.g., "/projects")
  createdAt: string;    // ISO 8601 datetime
  updatedAt: string;    // ISO 8601 datetime
}
```

### User
```typescript
interface User {
  id: number;           // Auto-increment ID
  username: string;     // Unique username
  createdAt: string;    // ISO 8601 datetime
}
```

### FileTreeNode
```typescript
interface FileTreeNode {
  path: string;         // Full path
  name: string;         // Display name
  type: 'file' | 'folder';
  documentId?: string;  // Only for files
  children?: FileTreeNode[]; // Only for folders
  createdAt?: string;   // ISO 8601 datetime
  updatedAt?: string;   // ISO 8601 datetime
}
```

## Migration từ LocalStorage

Để tương thích với frontend hiện tại, API được thiết kế để:

1. **Document interface tương thích**: API trả về Document object giống với interface hiện tại
2. **Tab system**: Frontend có thể tiếp tục sử dụng tab system, chỉ thay đổi storage strategy
3. **Auto-save**: API hỗ trợ frequent updates để maintain auto-save behavior
4. **Offline fallback**: Frontend có thể fallback về localStorage khi API không available

## Security

- **Password hashing**: Sử dụng bcrypt với salt rounds >= 12
- **Session tokens**: Random UUID với expiration time
- **Input validation**: Tất cả inputs được validate và sanitize
- **SQL injection prevention**: Sử dụng prepared statements
- **CORS**: Configured cho frontend domain