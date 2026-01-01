/**
 * Tests for device info collection utility
 */

import { collectDeviceInfo } from './deviceInfo';

describe('collectDeviceInfo', () => {
  // Mock window.navigator
  const originalNavigator = window.navigator;

  beforeEach(() => {
    // Reset mocks
    delete window.navigator;
  });

  afterEach(() => {
    window.navigator = originalNavigator;
  });

  it('should collect screen dimensions', () => {
    // Mock screen
    Object.defineProperty(window, 'screen', {
      writable: true,
      value: {
        width: 1920,
        height: 1080,
      },
    });

    const info = collectDeviceInfo();

    expect(info).toHaveProperty('screen_width');
    expect(info).toHaveProperty('screen_height');
    expect(info.screen_width).toBe(1920);
    expect(info.screen_height).toBe(1080);
  });

  it('should collect browser information from navigator', () => {
    // Mock navigator
    window.navigator = {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
      language: 'en-US',
      platform: 'Win32',
    };

    const info = collectDeviceInfo();

    expect(info).toHaveProperty('user_agent');
    expect(info.user_agent).toBe(window.navigator.userAgent);
    expect(info).toHaveProperty('language');
    expect(info.language).toBe('en-US');
  });

  it('should handle missing navigator gracefully', () => {
    window.navigator = undefined;

    const info = collectDeviceInfo();

    expect(info).toHaveProperty('screen_width');
    expect(info).toHaveProperty('screen_height');
    // Should still return object even if navigator is missing
    expect(typeof info).toBe('object');
  });

  it('should handle missing screen dimensions', () => {
    Object.defineProperty(window, 'screen', {
      writable: true,
      value: undefined,
    });

    const info = collectDeviceInfo();

    // Should still return object, dimensions might be null/undefined
    expect(typeof info).toBe('object');
  });
});

