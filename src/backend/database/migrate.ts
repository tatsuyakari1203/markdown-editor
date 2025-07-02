import { db } from './connection.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function runMigrations(): void {
  console.log('Running database migrations...');
  
  try {
    // Check if new tables exist
    const userSettingsExists = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='user_settings'"
    ).get();
    
    const mediaFilesExists = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='media_files'"
    ).get();
    
    const ftsExists = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='documents_fts'"
    ).get();
    
    if (!userSettingsExists || !mediaFilesExists || !ftsExists) {
      console.log('Creating new tables...');
      
      // Read and execute the full schema
      const schemaPath = join(__dirname, 'schema.sql');
      const schema = readFileSync(schemaPath, 'utf-8');
      
      const transaction = db.transaction(() => {
        db.exec(schema);
      });
      
      transaction();
      
      console.log('Database migration completed successfully!');
    } else {
      console.log('Database is already up to date.');
    }
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run migrations if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
}