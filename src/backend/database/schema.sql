-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY, -- UUID
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    path TEXT NOT NULL, -- File path in the tree structure
    is_directory BOOLEAN NOT NULL DEFAULT FALSE,
    parent_id TEXT, -- Reference to parent directory
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Sessions table for authentication
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY, -- UUID
    user_id INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_parent_id ON documents(parent_id);
CREATE INDEX IF NOT EXISTS idx_documents_path ON documents(path);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
    AFTER UPDATE ON users
    FOR EACH ROW
    BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_documents_timestamp 
    AFTER UPDATE ON documents
    FOR EACH ROW
    BEGIN
        UPDATE documents SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    theme TEXT NOT NULL DEFAULT 'auto' CHECK (theme IN ('light', 'dark', 'auto')),
    editor_font_size INTEGER NOT NULL DEFAULT 14,
    editor_font_family TEXT NOT NULL DEFAULT 'Monaco, Consolas, monospace',
    auto_save BOOLEAN NOT NULL DEFAULT TRUE,
    vim_mode BOOLEAN NOT NULL DEFAULT FALSE,
    line_numbers BOOLEAN NOT NULL DEFAULT TRUE,
    word_wrap BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Media files table
CREATE TABLE IF NOT EXISTS media_files (
    id TEXT PRIMARY KEY, -- UUID
    user_id INTEGER NOT NULL,
    filename TEXT NOT NULL, -- Generated filename
    original_name TEXT NOT NULL, -- Original uploaded filename
    file_path TEXT NOT NULL, -- Path to file on disk
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Additional indexes
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_media_files_user_id ON media_files(user_id);
CREATE INDEX IF NOT EXISTS idx_media_files_created_at ON media_files(created_at);

-- Full-text search index for documents
CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
    title, content, path,
    content='documents',
    content_rowid='rowid'
);

-- Triggers for FTS
CREATE TRIGGER IF NOT EXISTS documents_fts_insert AFTER INSERT ON documents BEGIN
    INSERT INTO documents_fts(rowid, title, content, path) VALUES (NEW.rowid, NEW.title, NEW.content, NEW.path);
END;

CREATE TRIGGER IF NOT EXISTS documents_fts_delete AFTER DELETE ON documents BEGIN
    INSERT INTO documents_fts(documents_fts, rowid, title, content, path) VALUES('delete', OLD.rowid, OLD.title, OLD.content, OLD.path);
END;

CREATE TRIGGER IF NOT EXISTS documents_fts_update AFTER UPDATE ON documents BEGIN
    INSERT INTO documents_fts(documents_fts, rowid, title, content, path) VALUES('delete', OLD.rowid, OLD.title, OLD.content, OLD.path);
    INSERT INTO documents_fts(rowid, title, content, path) VALUES (NEW.rowid, NEW.title, NEW.content, NEW.path);
END;

-- Trigger to update user_settings timestamp
CREATE TRIGGER IF NOT EXISTS update_user_settings_timestamp 
    AFTER UPDATE ON user_settings
    FOR EACH ROW
    BEGIN
        UPDATE user_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;