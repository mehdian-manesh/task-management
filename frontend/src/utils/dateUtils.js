import moment from 'moment-jalaali';

// Configure moment-jalaali
moment.loadPersian({ dialect: 'persian-modern' });

// Format date to Jalali
export const formatToJalali = (date) => {
  if (!date) return '-';
  return moment(date).format('jYYYY/jMM/jDD');
};

// Format date and time to Jalali
export const formatToJalaliWithTime = (date) => {
  if (!date) return '-';
  try {
    const m = moment(date);
    if (!m.isValid()) return '-';
    return m.format('jYYYY/jMM/jDD - HH:mm');
  } catch (error) {
    console.error('Error formatting date:', error, date);
    return '-';
  }
};

// Convert Jalali to Gregorian for API
export const jalaliToGregorian = (jDate) => {
  if (!jDate) return null;
  return moment(jDate, 'jYYYY/jMM/jDD').format('YYYY-MM-DD');
};

// Get today in Jalali format
export const getTodayJalali = () => {
  return moment().format('jYYYY/jMM/jDD');
};

// Constants for report results
export const REPORT_RESULTS = {
  ONGOING: 'ongoing',
  SUCCESS: 'success',
  POSTPONED: 'postponed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

export const REPORT_RESULT_LABELS = {
  [REPORT_RESULTS.ONGOING]: 'هنوز تمام نشده',
  [REPORT_RESULTS.SUCCESS]: 'با موفقیت انجام شد',
  [REPORT_RESULTS.POSTPONED]: 'به تعویق افتاد',
  [REPORT_RESULTS.FAILED]: 'موفق به انجام آن نشدم',
  [REPORT_RESULTS.CANCELLED]: 'کنسل شد',
};