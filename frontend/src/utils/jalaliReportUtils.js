import moment from 'moment-jalaali';

// Configure moment-jalaali
moment.loadPersian({ dialect: 'persian-modern' });

/**
 * Get current Jalali date components
 */
export const getCurrentJalaliDate = () => {
  const now = moment();
  return {
    year: now.jYear(),
    month: now.jMonth() + 1, // moment-jalaali months are 0-indexed
    day: now.jDate(),
    week: getJalaliWeekNumber(now.jYear(), now.jMonth() + 1, now.jDate()),
  };
};

/**
 * Get Jalali week number in year (week starts on Saturday)
 */
export const getJalaliWeekNumber = (year, month, day) => {
  const jDate = moment(`${year}/${month}/${day}`, 'jYYYY/jMM/jDD');
  const yearStart = moment(`${year}/1/1`, 'jYYYY/jMM/jDD');
  
  // Find first Saturday of the year
  const firstDayWeekday = yearStart.day(); // Sunday=0 ... Saturday=6
  const daysBackToSaturday = (firstDayWeekday - 6 + 7) % 7; // Saturday=6 in moment
  const firstSaturday = yearStart.clone().subtract(daysBackToSaturday, 'days');
  
  if (jDate.isBefore(firstSaturday)) {
    return 0; // Before first Saturday, belongs to previous year's last week
  }
  
  const daysDiff = jDate.diff(firstSaturday, 'days');
  return Math.floor(daysDiff / 7) + 1;
};

/**
 * Get Gregorian date range for a Jalali period
 * Returns ISO date strings for start and end dates
 */
export const getJalaliPeriodDates = (periodType, year, month, week, day) => {
  let startMoment, endMoment;
  
  if (periodType === 'daily') {
    startMoment = moment(`${year}/${month}/${day}`, 'jYYYY/jMM/jDD').startOf('day');
    endMoment = moment(`${year}/${month}/${day}`, 'jYYYY/jMM/jDD').endOf('day');
  } else if (periodType === 'weekly') {
    // Find the Saturday of the week (week starts on Saturday)
    const yearStart = moment(`${year}/1/1`, 'jYYYY/jMM/jDD');
    const firstDayWeekday = yearStart.day(); // Sunday=0 ... Saturday=6 (moment)
    const daysBackToSaturday = (firstDayWeekday - 6 + 7) % 7; // Saturday=6 in moment
    const firstSaturday = yearStart.clone().subtract(daysBackToSaturday, 'days');
    
    // Calculate week start (Saturday)
    const weekStart = firstSaturday.clone().add((week - 1) * 7, 'days');
    startMoment = weekStart.clone().startOf('day');
    endMoment = weekStart.clone().add(6, 'days').endOf('day');
    // instrumentation removed after verification
  } else if (periodType === 'monthly') {
    startMoment = moment(`${year}/${month}/1`, 'jYYYY/jMM/jDD').startOf('day');
    // Get last day of month
    const daysInMonth = moment(`${year}/${month}/1`, 'jYYYY/jMM/jDD').jDaysInMonth();
    endMoment = moment(`${year}/${month}/${daysInMonth}`, 'jYYYY/jMM/jDD').endOf('day');
  } else if (periodType === 'yearly') {
    startMoment = moment(`${year}/1/1`, 'jYYYY/jMM/jDD').startOf('day');
    // Last day of year is Esfand 29 or 30 (leap year)
    const lastDayOfYear = moment(`${year}/12/29`, 'jYYYY/jMM/jDD');
    if (lastDayOfYear.jDaysInMonth() === 30) {
      endMoment = moment(`${year}/12/30`, 'jYYYY/jMM/jDD').endOf('day');
    } else {
      endMoment = lastDayOfYear.endOf('day');
    }
  } else {
    throw new Error(`Invalid period type: ${periodType}`);
  }
  
  return {
    startDate: startMoment.format('YYYY-MM-DD'),
    endDate: endMoment.format('YYYY-MM-DD'),
  };
};

/**
 * Format Jalali period as a human-readable string
 */
export const formatJalaliPeriod = (periodType, year, month, week, day) => {
  const monthNames = [
    '', 'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
  ];
  
  if (periodType === 'daily') {
    return `${day} ${monthNames[month]} ${year}`;
  } else if (periodType === 'weekly') {
    return `هفته ${week} سال ${year}`;
  } else if (periodType === 'monthly') {
    return `${monthNames[month]} ${year}`;
  } else if (periodType === 'yearly') {
    return `سال ${year}`;
  } else {
    return `${periodType} ${year}`;
  }
};

/**
 * Convert Jalali date components to ISO date string (Gregorian)
 */
export const jalaliToIso = (year, month, day) => {
  const jDate = moment(`${year}/${month}/${day}`, 'jYYYY/jMM/jDD');
  return jDate.format('YYYY-MM-DD');
};

/**
 * Get period info for display
 */
export const getPeriodInfo = (periodType, year, month, week, day) => {
  const dates = getJalaliPeriodDates(periodType, year, month, week, day);
  const formatted = formatJalaliPeriod(periodType, year, month, week, day);
  
  return {
    type: periodType,
    jalali_year: year,
    jalali_month: month,
    jalali_week: week,
    jalali_day: day,
    start_date: dates.startDate,
    end_date: dates.endDate,
    formatted,
  };
};
