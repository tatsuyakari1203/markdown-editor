import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { db } from '../database/connection.js';
import type { User, Session, LoginRequest, RegisterRequest } from '../types/index.js';

export class UserService {
  private static getUserByUsername = db.prepare('SELECT * FROM users WHERE username = ?');
  private static getUserById = db.prepare('SELECT * FROM users WHERE id = ?');
  private static createUser = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
  private static createSession = db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)');
  private static getSession = db.prepare('SELECT * FROM sessions WHERE id = ? AND expires_at > datetime(\'now\')');
  private static deleteSession = db.prepare('DELETE FROM sessions WHERE id = ?');
  private static deleteExpiredSessions = db.prepare('DELETE FROM sessions WHERE expires_at <= datetime(\'now\')');

  static async register(data: RegisterRequest): Promise<{ success: boolean; message: string; user?: { id: number; username: string } }> {
    try {
      // Check if username already exists
      const existingUser = this.getUserByUsername.get(data.username) as User | undefined;
      if (existingUser) {
        return { success: false, message: 'Username already exists' };
      }

      // Validate password strength
      if (data.password.length < 6) {
        return { success: false, message: 'Password must be at least 6 characters long' };
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(data.password, saltRounds);

      // Create user
      const result = this.createUser.run(data.username, passwordHash);
      const userId = result.lastInsertRowid as number;

      return {
        success: true,
        message: 'User registered successfully',
        user: { id: userId, username: data.username }
      };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  static async login(data: LoginRequest): Promise<{ success: boolean; message: string; sessionId?: string; user?: { id: number; username: string } }> {
    try {
      // Get user by username
      const user = this.getUserByUsername.get(data.username) as User | undefined;
      if (!user) {
        return { success: false, message: 'Invalid username or password' };
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(data.password, user.password_hash);
      if (!isValidPassword) {
        return { success: false, message: 'Invalid username or password' };
      }

      // Clean up expired sessions
      this.deleteExpiredSessions.run();

      // Create session
      const sessionId = randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      this.createSession.run(sessionId, user.id, expiresAt.toISOString());

      return {
        success: true,
        message: 'Login successful',
        sessionId,
        user: { id: user.id, username: user.username }
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  static logout(sessionId: string): { success: boolean; message: string } {
    try {
      this.deleteSession.run(sessionId);
      return { success: true, message: 'Logout successful' };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  static validateSession(sessionId: string): { valid: boolean; user?: { id: number; username: string } } {
    try {
      const session = this.getSession.get(sessionId) as Session | undefined;
      if (!session) {
        return { valid: false };
      }

      const user = this.getUserById.get(session.user_id) as User | undefined;
      if (!user) {
        return { valid: false };
      }

      return {
        valid: true,
        user: { id: user.id, username: user.username }
      };
    } catch (error) {
      console.error('Session validation error:', error);
      return { valid: false };
    }
  }

  static cleanupExpiredSessions(): void {
    try {
      this.deleteExpiredSessions.run();
    } catch (error) {
      console.error('Session cleanup error:', error);
    }
  }
}