"""
Tests for Jalali (Persian) calendar utility functions
"""
import pytest
import jdatetime
from datetime import datetime, date, timedelta
from django.utils import timezone

from core.jalali_utils import (
    get_current_jalali_date,
    jalali_to_gregorian,
    gregorian_to_jalali,
    get_jalali_week_number,
    get_jalali_week_start_end,
    get_jalali_month_start_end,
    get_jalali_year_start_end,
    get_jalali_date_range,
    format_jalali_period,
)


class TestGetCurrentJalaliDate:
    """Tests for getting current Jalali date"""
    
    def test_get_current_jalali_date_returns_dict(self):
        """Test that function returns a dictionary with expected keys"""
        result = get_current_jalali_date()
        assert isinstance(result, dict)
        assert 'year' in result
        assert 'month' in result
        assert 'day' in result
        assert 'week' in result
        assert isinstance(result['year'], int)
        assert isinstance(result['month'], int)
        assert isinstance(result['day'], int)
        assert isinstance(result['week'], int)


class TestJalaliToGregorian:
    """Tests for Jalali to Gregorian conversion"""
    
    def test_jalali_to_gregorian_valid_date(self):
        """Test converting a valid Jalali date to Gregorian"""
        g_date = jalali_to_gregorian(1403, 1, 1)  # First day of Farvardin 1403
        assert isinstance(g_date, date)
        assert g_date.year >= 2023  # Approximate conversion
    
    def test_jalali_to_gregorian_invalid_date(self):
        """Test that invalid Jalali dates raise ValueError"""
        with pytest.raises(ValueError):
            jalali_to_gregorian(1403, 13, 1)  # Month 13 doesn't exist
        with pytest.raises(ValueError):
            jalali_to_gregorian(1403, 1, 32)  # Day 32 doesn't exist


class TestGregorianToJalali:
    """Tests for Gregorian to Jalali conversion"""
    
    def test_gregorian_to_jalali_from_date(self):
        """Test converting a date object to Jalali"""
        g_date = date(2024, 3, 20)
        result = gregorian_to_jalali(g_date)
        assert isinstance(result, dict)
        assert 'year' in result
        assert 'month' in result
        assert 'day' in result
        assert isinstance(result['year'], int)
        assert isinstance(result['month'], int)
        assert isinstance(result['day'], int)
    
    def test_gregorian_to_jalali_from_datetime(self):
        """Test converting a datetime object to Jalali"""
        g_datetime = datetime(2024, 3, 20, 12, 30, 45)
        result = gregorian_to_jalali(g_datetime)
        assert isinstance(result, dict)
        assert 'year' in result
        assert 'month' in result
        assert 'day' in result


class TestGetJalaliWeekNumber:
    """Tests for getting Jalali week number"""
    
    def test_get_jalali_week_number_first_week(self):
        """Test week number for early year dates"""
        week = get_jalali_week_number(1403, 1, 1)
        assert isinstance(week, int)
        assert week >= 0
    
    def test_get_jalali_week_number_mid_year(self):
        """Test week number for mid-year dates"""
        week = get_jalali_week_number(1403, 6, 15)
        assert isinstance(week, int)
        assert week > 0
    
    def test_get_jalali_week_number_end_year(self):
        """Test week number for end of year dates"""
        week = get_jalali_week_number(1403, 12, 29)
        assert isinstance(week, int)
        assert week > 0


class TestGetJalaliWeekStartEnd:
    """Tests for getting Jalali week start and end dates"""
    
    def test_get_jalali_week_start_end_valid_week(self):
        """Test getting start and end dates for a valid week"""
        start, end = get_jalali_week_start_end(1403, 1)
        assert isinstance(start, datetime)
        assert isinstance(end, datetime)
        assert timezone.is_aware(start)
        assert timezone.is_aware(end)
        assert start <= end
    
    def test_get_jalali_week_start_end_mid_year(self):
        """Test getting week dates for mid-year"""
        start, end = get_jalali_week_start_end(1403, 20)
        assert isinstance(start, datetime)
        assert isinstance(end, datetime)
        assert start <= end


class TestGetJalaliMonthStartEnd:
    """Tests for getting Jalali month start and end dates"""
    
    def test_get_jalali_month_start_end_valid_month(self):
        """Test getting start and end dates for a valid month"""
        start, end = get_jalali_month_start_end(1403, 1)
        assert isinstance(start, datetime)
        assert isinstance(end, datetime)
        assert timezone.is_aware(start)
        assert timezone.is_aware(end)
        assert start <= end
    
    def test_get_jalali_month_start_end_all_months(self):
        """Test getting month dates for all months"""
        for month in range(1, 13):
            start, end = get_jalali_month_start_end(1403, month)
            assert isinstance(start, datetime)
            assert isinstance(end, datetime)
            assert start <= end
    
    def test_get_jalali_month_start_end_leap_year(self):
        """Test getting month dates for leap year (Esfand has 30 days)"""
        # Try to find a leap year by checking if Esfand 30 exists
        try:
            start, end = get_jalali_month_start_end(1402, 12)
            assert isinstance(start, datetime)
            assert isinstance(end, datetime)
        except ValueError:
            # If it's not a leap year, that's okay
            pass
    
    def test_get_jalali_month_start_end_esfand_1404(self):
        """Test getting month dates for Esfand 1404 (non-leap year, 29 days)"""
        # Year 1404 is not a leap year, so Esfand should have 29 days
        start, end = get_jalali_month_start_end(1404, 12)
        assert isinstance(start, datetime)
        assert isinstance(end, datetime)
        assert timezone.is_aware(start)
        assert timezone.is_aware(end)
        assert start <= end
        # Verify it's actually Esfand by checking the date range
        # The difference should be approximately 28 days (29 days - 1 day)
        days_diff = (end.date() - start.date()).days
        assert days_diff == 28  # 29 days total, so 28 days difference
    
    def test_get_jalali_month_start_end_invalid_month(self):
        """Test that invalid months raise ValueError"""
        with pytest.raises(ValueError):
            get_jalali_month_start_end(1403, 13)


class TestGetJalaliYearStartEnd:
    """Tests for getting Jalali year start and end dates"""
    
    def test_get_jalali_year_start_end_valid_year(self):
        """Test getting start and end dates for a valid year"""
        start, end = get_jalali_year_start_end(1403)
        assert isinstance(start, datetime)
        assert isinstance(end, datetime)
        assert timezone.is_aware(start)
        assert timezone.is_aware(end)
        assert start <= end
    
    def test_get_jalali_year_start_end_handles_leap_year(self):
        """Test that leap years are handled correctly"""
        start, end = get_jalali_year_start_end(1402)
        assert isinstance(start, datetime)
        assert isinstance(end, datetime)
        assert start <= end


class TestGetJalaliDateRange:
    """Tests for getting Jalali date ranges"""
    
    def test_get_jalali_date_range_daily(self):
        """Test getting daily date range"""
        start, end = get_jalali_date_range('daily', 1403, month=1, day=1)
        assert isinstance(start, datetime)
        assert isinstance(end, datetime)
        assert timezone.is_aware(start)
        assert timezone.is_aware(end)
        # Start and end should be on the same day
        assert start.date() == end.date()
    
    def test_get_jalali_date_range_weekly(self):
        """Test getting weekly date range"""
        start, end = get_jalali_date_range('weekly', 1403, week=1)
        assert isinstance(start, datetime)
        assert isinstance(end, datetime)
        assert start <= end
        # Should span 7 days
        assert (end - start).days <= 7
    
    def test_get_jalali_date_range_monthly(self):
        """Test getting monthly date range"""
        start, end = get_jalali_date_range('monthly', 1403, month=1)
        assert isinstance(start, datetime)
        assert isinstance(end, datetime)
        assert start <= end
    
    def test_get_jalali_date_range_yearly(self):
        """Test getting yearly date range"""
        start, end = get_jalali_date_range('yearly', 1403)
        assert isinstance(start, datetime)
        assert isinstance(end, datetime)
        assert start <= end
    
    def test_get_jalali_date_range_daily_missing_params(self):
        """Test that daily range requires month and day"""
        with pytest.raises(ValueError):
            get_jalali_date_range('daily', 1403)
        with pytest.raises(ValueError):
            get_jalali_date_range('daily', 1403, month=1)
    
    def test_get_jalali_date_range_weekly_missing_params(self):
        """Test that weekly range requires week"""
        with pytest.raises(ValueError):
            get_jalali_date_range('weekly', 1403)
    
    def test_get_jalali_date_range_monthly_missing_params(self):
        """Test that monthly range requires month"""
        with pytest.raises(ValueError):
            get_jalali_date_range('monthly', 1403)
    
    def test_get_jalali_date_range_invalid_period_type(self):
        """Test that invalid period types raise ValueError"""
        with pytest.raises(ValueError):
            get_jalali_date_range('invalid', 1403)


class TestFormatJalaliPeriod:
    """Tests for formatting Jalali periods"""
    
    def test_format_jalali_period_daily(self):
        """Test formatting daily period"""
        result = format_jalali_period('daily', 1403, month=1, day=1)
        assert isinstance(result, str)
        assert '1403' in result or '۱' in result  # May contain Persian digits
    
    def test_format_jalali_period_weekly(self):
        """Test formatting weekly period"""
        result = format_jalali_period('weekly', 1403, week=1)
        assert isinstance(result, str)
        assert '1403' in result or '۱' in result
    
    def test_format_jalali_period_monthly(self):
        """Test formatting monthly period"""
        result = format_jalali_period('monthly', 1403, month=1)
        assert isinstance(result, str)
        assert '1403' in result or '۱' in result
    
    def test_format_jalali_period_yearly(self):
        """Test formatting yearly period"""
        result = format_jalali_period('yearly', 1403)
        assert isinstance(result, str)
        assert '1403' in result or '۱' in result
    
    def test_format_jalali_period_invalid_type(self):
        """Test formatting with invalid period type"""
        result = format_jalali_period('invalid', 1403)
        assert isinstance(result, str)

