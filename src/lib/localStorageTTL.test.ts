import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setItemWithTTL, getItemWithTTL, removeItem, clearExpiredItems } from './localStorageTTL';

describe('localStorageTTL', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  it('should store and retrieve an item before it expires', () => {
    const key = 'test-key';
    const value = { foo: 'bar' };
    setItemWithTTL(key, value, 10); // 10 minutes

    expect(getItemWithTTL(key)).toEqual(value);
  });

  it('should return null and remove the item after it expires', () => {
    const key = 'test-key';
    const value = 'test-value';
    setItemWithTTL(key, value, 10);

    // Advance time by 11 minutes
    vi.advanceTimersByTime(11 * 60 * 1000);

    expect(getItemWithTTL(key)).toBeNull();
    expect(localStorage.getItem(key)).toBeNull();
  });

  it('should remove items with removeItem', () => {
    const key = 'test-key';
    setItemWithTTL(key, 'value', 10);
    removeItem(key);
    expect(localStorage.getItem(key)).toBeNull();
  });

  it('should clear all expired items with clearExpiredItems', () => {
    setItemWithTTL('key1', 'val1', 5);
    setItemWithTTL('key2', 'val2', 15);

    // Advance time by 10 minutes
    vi.advanceTimersByTime(10 * 60 * 1000);

    clearExpiredItems();

    expect(localStorage.getItem('key1')).toBeNull();
    expect(localStorage.getItem('key2')).not.toBeNull();
    expect(getItemWithTTL('key2')).toBe('val2');
  });

  it('should handle non-TTL data gracefully in clearExpiredItems', () => {
    localStorage.setItem('raw-key', 'raw-value');
    localStorage.setItem('invalid-json', '{not valid');
    
    clearExpiredItems();
    
    expect(localStorage.getItem('raw-key')).toBe('raw-value');
    expect(localStorage.getItem('invalid-json')).toBe('{not valid');
  });
});
