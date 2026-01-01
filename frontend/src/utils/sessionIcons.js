/**
 * Browser and device icon mapping utilities
 */
import React from 'react';
import {
  LaptopWindows as DesktopIcon,
  Smartphone as MobileIcon,
  TabletMac as TabletIcon,
  QuestionMark as UnknownDeviceIcon,
  Web as DefaultBrowserIcon,
  Language as ChromeIcon,
  Apple as SafariIcon,
  Microsoft as EdgeIcon,
  Extension as ElectronIcon,
  Public as OperaIcon,
} from '@mui/icons-material';

/**
 * Get device icon based on device type
 * @param {string} deviceType - 'desktop', 'mobile', or 'tablet'
 * @returns {Object} Object with icon component and tooltip
 */
export const getDeviceIcon = (deviceType) => {
  switch (deviceType?.toLowerCase()) {
    case 'desktop':
      return { icon: <DesktopIcon />, tooltip: 'دسکتاپ' };
    case 'mobile':
      return { icon: <MobileIcon />, tooltip: 'موبایل' };
    case 'tablet':
      return { icon: <TabletIcon />, tooltip: 'تبلت' };
    default:
      return { icon: <UnknownDeviceIcon />, tooltip: 'دستگاه نامشخص' };
  }
};

/**
 * Get browser icon based on browser name
 * @param {string} browserName - Browser name (e.g., 'Chrome', 'Firefox', 'Safari')
 * @returns {Object} Object with icon component and tooltip
 */
export const getBrowserIcon = (browserName) => {
  if (!browserName) {
    return { icon: <DefaultBrowserIcon />, tooltip: 'مرورگر نامشخص' };
  }

  const browser = browserName.toLowerCase();

  if (browser.includes('chrome') && !browser.includes('edge')) {
    return { icon: <ChromeIcon />, tooltip: 'گوگل کروم' };
  } else if (browser.includes('firefox')) {
    return { icon: <DefaultBrowserIcon />, tooltip: 'فایرفاکس' };
  } else if (browser.includes('safari')) {
    return { icon: <SafariIcon />, tooltip: 'سافاری' };
  } else if (browser.includes('edge') || browser.includes('edg')) {
    return { icon: <EdgeIcon />, tooltip: 'مایکروسافت اج' };
  } else if (browser.includes('electron')) {
    return { icon: <ElectronIcon />, tooltip: 'اپلیکیشن دسکتاپ' };
  } else if (browser.includes('opera')) {
    return { icon: <OperaIcon />, tooltip: 'اپرا' };
  } else {
    return { icon: <DefaultBrowserIcon />, tooltip: browserName };
  }
};

/**
 * Get browser display name
 * @param {string} browserName - Browser name from backend
 * @returns {string} Formatted browser name
 */
export const getBrowserDisplayName = (browserName) => {
  if (!browserName) {
    return 'نامشخص';
  }

  const browser = browserName.toLowerCase();

  if (browser.includes('chrome') && !browser.includes('edge')) {
    return 'کروم';
  } else if (browser.includes('firefox')) {
    return 'فایرفاکس';
  } else if (browser.includes('safari')) {
    return 'سافاری';
  } else if (browser.includes('edge') || browser.includes('edg')) {
    return 'اج';
  } else if (browser.includes('electron')) {
    return 'اپلیکیشن دسکتاپ';
  } else if (browser.includes('opera')) {
    return 'اپرا';
  } else {
    return browserName;
  }
};

/**
 * Get device display name
 * @param {string} deviceType - Device type
 * @returns {string} Formatted device type name
 */
export const getDeviceDisplayName = (deviceType) => {
  switch (deviceType?.toLowerCase()) {
    case 'mobile':
      return 'موبایل';
    case 'tablet':
      return 'تبلت';
    case 'desktop':
      return 'دسکتاپ';
    default:
      return 'نامشخص';
  }
};

