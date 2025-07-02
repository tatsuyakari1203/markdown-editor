import Database from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class DatabaseConnection {
  private static instance: Database.Database | null = null;

  static getInstance(): Database.Database {
    if (!this.instance) {
      this.instance = this.createConnection();
    }
    return this.instance;
  }

  private static createConnection(): Database.Database {
    const dbPath = process.env.DATABASE_PATH || join(process.cwd(), 'data', 'app.db');
    
    // Create database directory if it doesn't exist
    const dbDir = dirname(dbPath);
    mkdirSync(dbDir, { recursive: true });

    const db = new Database(dbPath);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Set WAL mode for better performance
    db.pragma('journal_mode = WAL');
    
    // Initialize schema
    this.initializeSchema(db);
    
    return db;
  }

  private static initializeSchema(db: Database.Database): void {
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    
    // Execute schema in a transaction
    const transaction = db.transaction(() => {
      db.exec(schema);
    });
    
    transaction();
  }

  static close(): void {
    if (this.instance) {
      this.instance.close();
      this.instance = null;
    }
  }
}

export const db = DatabaseConnection.getInstance();