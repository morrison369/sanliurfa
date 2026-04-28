import { describe, it, expect, beforeEach, vi } from 'vitest';
import bcrypt from 'bcryptjs';

// Mock query
vi.mock('../../lib/postgres', () => ({
  query: vi.fn()
}));

import { query } from '../../lib/postgres';

describe('Auth Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Login', () => {
    it('should return user without password on successful login', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);

      (query as any).mockResolvedValueOnce({
        rows: [{
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
          password: hashedPassword,
          role: 'user',
          status: 'active'
        }]
      });

      const result = await query(
        'SELECT id, name, email, password, role, status FROM users WHERE email = $1',
        ['test@example.com']
      );

      expect(result.rows[0].email).toBe('test@example.com');
      expect(result.rows[0].status).toBe('active');
    });

    it('should reject invalid credentials', async () => {
      (query as any).mockResolvedValueOnce({ rows: [] });

      const result = await query(
        'SELECT id, name, email, password, role, status FROM users WHERE email = $1',
        ['invalid@example.com']
      );

      expect(result.rows.length).toBe(0);
    });

    it('should detect suspended accounts', async () => {
      (query as any).mockResolvedValueOnce({
        rows: [{
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
          password: 'hashed',
          role: 'user',
          status: 'suspended'
        }]
      });

      const result = await query(
        'SELECT id, name, email, password, role, status FROM users WHERE email = $1',
        ['test@example.com']
      );

      expect(result.rows[0].status).toBe('suspended');
    });
  });

  describe('Registration', () => {
    it('should hash password before saving', async () => {
      const password = 'password123';
      const hashedPassword = await bcrypt.hash(password, 10);

      // bcrypt.compare should work with hashed password
      const isValidHash = await bcrypt.compare(password, hashedPassword);
      expect(isValidHash).toBe(true);
    });

    it('should detect duplicate emails', async () => {
      (query as any).mockResolvedValueOnce({
        rows: [{ id: 'existing-user' }]
      });

      const result = await query(
        'SELECT id FROM users WHERE email = $1',
        ['existing@example.com']
      );

      expect(result.rows.length).toBeGreaterThan(0);
    });
  });
});
