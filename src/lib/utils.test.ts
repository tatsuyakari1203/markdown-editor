import { describe, it, expect } from 'vitest';
import { cn, formatDate } from './utils';

describe('cn function', () => {
  it('should merge tailwind classes correctly', () => {
    expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white');
    expect(cn('p-4', { 'm-2': true, 'rounded-lg': false })).toBe('p-4 m-2');
  });

  it('should handle conflicting classes', () => {
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
    expect(cn('p-4', 'p-8')).toBe('p-8');
  });

  it('should handle empty inputs', () => {
    expect(cn()).toBe('');
    expect(cn('')).toBe('');
  });
});

describe('formatDate function', () => {
  it('should format a date object into a readable string', () => {
    const date = new Date('2023-10-27T10:00:00Z');
    const formatted = formatDate(date);
    expect(formatted).toContain('October 27, 2023');
  });

  it('should handle different dates', () => {
    const date1 = new Date('2024-01-01T12:00:00Z');
    const date2 = new Date('2024-12-31T12:00:00Z');
    
    expect(formatDate(date1)).toContain('2024');
    expect(formatDate(date2)).toContain('2024');
  });
});