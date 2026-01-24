/**
 * Collect client-side device information
 * @returns {Object} Device information object
 */
export const collectDeviceInfo = () => {
  const info = {};

  // Screen dimensions
  if (window.screen) {
    info.screen_width = window.screen.width;
    info.screen_height = window.screen.height;
  }

  // Browser information from navigator
  if (window.navigator) {
    info.user_agent = window.navigator.userAgent || '';
    info.language = window.navigator.language || '';
    info.platform = window.navigator.platform || '';
    
    // Additional browser details if available
    if (window.navigator.hardwareConcurrency) {
      info.hardware_concurrency = window.navigator.hardwareConcurrency;
    }
    
    if (window.navigator.deviceMemory) {
      info.device_memory = window.navigator.deviceMemory;
    }
  }

  return info;
};

