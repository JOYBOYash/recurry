import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isLandingPathname,
  loadThemePreference,
  parseThemePreference,
  resolveThemeForRoute,
  saveThemePreference,
  type StorageLike,
} from './themePreference';

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
  };
}

test('parseThemePreference defaults to system for unknown or null values', () => {
  assert.equal(parseThemePreference(null), 'system');
  assert.equal(parseThemePreference(undefined), 'system');
  assert.equal(parseThemePreference('sepia'), 'system');
  assert.equal(parseThemePreference('dark'), 'dark');
  assert.equal(parseThemePreference('light'), 'light');
  assert.equal(parseThemePreference('system'), 'system');
});

test('resolveThemeForRoute always keeps landing page light regardless of system or explicit dark preference', () => {
  assert.equal(resolveThemeForRoute('dark', true, '/'), 'light');
  assert.equal(resolveThemeForRoute('system', true, '/'), 'light');
  assert.equal(resolveThemeForRoute('dark', true, ''), 'light');
  assert.equal(isLandingPathname('/'), true);
  assert.equal(isLandingPathname('/app/settings'), false);
});

test('resolveThemeForRoute applies system, light, and dark themes on all non-landing routes', () => {
  assert.equal(resolveThemeForRoute('system', true, '/app/learn'), 'dark');
  assert.equal(resolveThemeForRoute('system', false, '/app/learn'), 'light');
  assert.equal(resolveThemeForRoute('dark', false, '/login'), 'dark');
  assert.equal(resolveThemeForRoute('light', true, '/app/settings'), 'light');
  assert.equal(resolveThemeForRoute('dark', false, '/onboarding/username'), 'dark');
});

test('saveThemePreference and loadThemePreference persist cleanly', () => {
  const storage = createMemoryStorage();
  assert.equal(loadThemePreference(storage), 'system');
  saveThemePreference('dark', storage);
  assert.equal(loadThemePreference(storage), 'dark');
  saveThemePreference('light', storage);
  assert.equal(loadThemePreference(storage), 'light');
});
