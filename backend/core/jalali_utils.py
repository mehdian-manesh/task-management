"""
Jalali (Persian) calendar utility functions for report generation.
"""
import jdatetime
from datetime import datetime, date, timedelta
from django.utils import timezone


def get_current_jalali_date():
    """Get current Jalali date as a dictionary"""
    now = jdatetime.datetime.now()
    return {
        'year': now.year,
        'month': now.month,
        'day': now.day,
        'week': get_jalali_week_number(now.year, now.month, now.day),
    }


def jalali_to_gregorian(year, month, day):
    """Convert Jalali date to Gregorian date"""
    try:
        j_date = jdatetime.date(year, month, day)
        g_date = j_date.togregorian()
        return g_date
    except ValueError as e:
        raise ValueError(f"Invalid Jalali date: {year}/{month}/{day} - {e}")


def gregorian_to_jalali(g_date):
    """Convert Gregorian date to Jalali date using local timezone awareness."""
    # Normalize to date in the current timezone to avoid UTC/local day mismatches
    if isinstance(g_date, datetime):
        if timezone.is_aware(g_date):
            g_date = g_date.astimezone(timezone.get_current_timezone()).date()
        else:
            g_date = g_date.date()
    j_date = jdatetime.date.fromgregorian(date=g_date)
    return {
        'year': j_date.year,
        'month': j_date.month,
        'day': j_date.day,
    }


def get_jalali_week_number(year, month, day):
    """Get week number in Jalali year (1-based, week starts on Saturday)"""
    j_date = jdatetime.date(year, month, day)
    year_start = jdatetime.date(year, 1, 1)
    # Find the first Saturday of the year (week starts on Saturday in Jalali calendar)
    days_since_saturday = (year_start.weekday() + 2) % 7  # Saturday = 6, so +2 to map correctly
    first_saturday = year_start - timedelta(days=days_since_saturday)
    
    if j_date < first_saturday:
        # If date is before first Saturday, it belongs to week 0 or previous year's last week
        return 0
    
    days_diff = (j_date - first_saturday).days
    week_number = (days_diff // 7) + 1
    return week_number


def get_jalali_week_start_end(year, week):
    """Get start and end dates (Gregorian) for a Jalali week"""
    year_start = jdatetime.date(year, 1, 1)
    # Find the Saturday on or before 1 Farvardin (week numbering starts there)
    # weekday(): Saturday=0, ..., Friday=6 (jdatetime)
    days_back_to_saturday = year_start.weekday()
    first_saturday = year_start - timedelta(days=days_back_to_saturday)
    
    # Calculate week start (Saturday)
    week_start_jalali = first_saturday + timedelta(days=(week - 1) * 7)
    # Week end is Friday (6 days after Saturday)
    week_end_jalali = week_start_jalali + timedelta(days=6)
    
    # Convert to Gregorian
    week_start_gregorian = week_start_jalali.togregorian()
    week_end_gregorian = week_end_jalali.togregorian()
    
    # Make datetime objects with time boundaries
    start_datetime = timezone.make_aware(datetime.combine(week_start_gregorian, datetime.min.time()))
    end_datetime = timezone.make_aware(datetime.combine(week_end_gregorian, datetime.max.time()))
    
    return start_datetime, end_datetime


def get_jalali_month_start_end(year, month):
    """Get start and end dates (Gregorian) for a Jalali month"""
    try:
        month_start_jalali = jdatetime.date(year, month, 1)
        # Get last day of month
        if month <= 6:
            days_in_month = 31
        elif month <= 11:
            days_in_month = 30
        else:  # month == 12 (Esfand)
            # Check if it's a leap year by trying to create Esfand 30
            # If it succeeds, it's a leap year (30 days), otherwise 29 days
            try:
                test_date = jdatetime.date(year, 12, 30)
                days_in_month = 30  # Leap year
            except ValueError:
                days_in_month = 29  # Not a leap year
        
        month_end_jalali = jdatetime.date(year, month, days_in_month)
        
        # Convert to Gregorian
        month_start_gregorian = month_start_jalali.togregorian()
        month_end_gregorian = month_end_jalali.togregorian()
        
        # Make datetime objects with time boundaries
        start_datetime = timezone.make_aware(datetime.combine(month_start_gregorian, datetime.min.time()))
        end_datetime = timezone.make_aware(datetime.combine(month_end_gregorian, datetime.max.time()))
        
        return start_datetime, end_datetime
    except ValueError as e:
        raise ValueError(f"Invalid Jalali month: {year}/{month} - {e}")


def get_jalali_year_start_end(year):
    """Get start and end dates (Gregorian) for a Jalali year"""
    try:
        year_start_jalali = jdatetime.date(year, 1, 1)
        year_end_jalali = jdatetime.date(year, 12, 29)  # Start with Esfand 29
        
        # Check if it's a leap year by trying to create Esfand 30
        try:
            test_date = jdatetime.date(year, 12, 30)
            year_end_jalali = test_date
        except ValueError:
            pass  # Not a leap year, use Esfand 29
        
        # Convert to Gregorian
        year_start_gregorian = year_start_jalali.togregorian()
        year_end_gregorian = year_end_jalali.togregorian()
        
        # Make datetime objects with time boundaries
        start_datetime = timezone.make_aware(datetime.combine(year_start_gregorian, datetime.min.time()))
        end_datetime = timezone.make_aware(datetime.combine(year_end_gregorian, datetime.max.time()))
        
        return start_datetime, end_datetime
    except ValueError as e:
        raise ValueError(f"Invalid Jalali year: {year} - {e}")


def get_jalali_date_range(period_type, year, month=None, day=None, week=None):
    """
    Get Gregorian date range for a Jalali period.
    
    Args:
        period_type: 'daily', 'weekly', 'monthly', or 'yearly'
        year: Jalali year
        month: Jalali month (required for daily, monthly)
        day: Jalali day (required for daily)
        week: Jalali week number (required for weekly)
    
    Returns:
        Tuple of (start_datetime, end_datetime) in Gregorian timezone-aware datetime
    """
    if period_type == 'daily':
        if month is None or day is None:
            raise ValueError("month and day are required for daily period")
        jalali_date = jdatetime.date(year, month, day)
        gregorian_date = jalali_date.togregorian()
        start_datetime = timezone.make_aware(datetime.combine(gregorian_date, datetime.min.time()))
        end_datetime = timezone.make_aware(datetime.combine(gregorian_date, datetime.max.time()))
        return start_datetime, end_datetime
    
    elif period_type == 'weekly':
        if week is None:
            raise ValueError("week is required for weekly period")
        result = get_jalali_week_start_end(year, week)
        return result
    
    elif period_type == 'monthly':
        if month is None:
            raise ValueError("month is required for monthly period")
        return get_jalali_month_start_end(year, month)
    
    elif period_type == 'yearly':
        return get_jalali_year_start_end(year)
    
    else:
        raise ValueError(f"Invalid period_type: {period_type}. Must be 'daily', 'weekly', 'monthly', or 'yearly'")


def format_jalali_period(period_type, year, month=None, week=None, day=None):
    """Format a Jalali period as a human-readable string"""
    if period_type == 'daily':
        month_names = [
            '', 'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
            'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
        ]
        return f"{day} {month_names[month]} {year}"
    elif period_type == 'weekly':
        return f"هفته {week} سال {year}"
    elif period_type == 'monthly':
        month_names = [
            '', 'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
            'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
        ]
        return f"{month_names[month]} {year}"
    elif period_type == 'yearly':
        return f"سال {year}"
    else:
        return f"{period_type} {year}"
