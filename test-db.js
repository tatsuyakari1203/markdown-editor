import Database from 'better-sqlite3';
const db = new Database('./data/app.db');

console.log('Tables:', db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all());
console.log('Documents table schema:', db.prepare("PRAGMA table_info(documents)").all());

db.close();