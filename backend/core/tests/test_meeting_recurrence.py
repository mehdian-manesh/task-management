"""
Tests for Meeting recurrence functionality
"""
import pytest
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta

from core.models import Meeting, MeetingTypeChoices, RecurrenceTypeChoices


@pytest.mark.django_db
class TestMeetingRecurrence:
    """Tests for meeting recurrence"""
    
    def test_meeting_no_recurrence(self):
        """Test meeting with no recurrence"""
        admin = User.objects.create_superuser(username='admin', password='pass', email='admin@test.com')
        now = timezone.now()
        
        meeting = Meeting.objects.create(
            datetime=now + timedelta(days=1),
            type=MeetingTypeChoices.IN_PERSON.value,
            topic='One-time Meeting',
            created_by=admin,
            recurrence_type=RecurrenceTypeChoices.NONE.value
        )
        
        occurrences = meeting.get_next_occurrences(count=3)
        assert len(occurrences) == 1
        assert occurrences[0] == meeting.datetime
    
    def test_meeting_daily_recurrence(self):
        """Test daily recurrence"""
        admin = User.objects.create_superuser(username='admin', password='pass', email='admin@test.com')
        now = timezone.now()
        
        meeting = Meeting.objects.create(
            datetime=now + timedelta(days=1),
            type=MeetingTypeChoices.IN_PERSON.value,
            topic='Daily Meeting',
            created_by=admin,
            recurrence_type=RecurrenceTypeChoices.DAILY.value,
            recurrence_interval=1
        )
        
        occurrences = meeting.get_next_occurrences(count=3)
        assert len(occurrences) == 3
        
        # Check that occurrences are 1 day apart
        assert (occurrences[1] - occurrences[0]).days == 1
        assert (occurrences[2] - occurrences[1]).days == 1
    
    def test_meeting_weekly_recurrence(self):
        """Test weekly recurrence"""
        admin = User.objects.create_superuser(username='admin', password='pass', email='admin@test.com')
        now = timezone.now()
        
        meeting = Meeting.objects.create(
            datetime=now + timedelta(days=1),
            type=MeetingTypeChoices.IN_PERSON.value,
            topic='Weekly Meeting',
            created_by=admin,
            recurrence_type=RecurrenceTypeChoices.WEEKLY.value,
            recurrence_interval=1
        )
        
        occurrences = meeting.get_next_occurrences(count=3)
        assert len(occurrences) == 3
        
        # Check that occurrences are 1 week apart
        assert (occurrences[1] - occurrences[0]).days == 7
        assert (occurrences[2] - occurrences[1]).days == 7
    
    def test_meeting_recurrence_with_end_date(self):
        """Test recurrence with end date"""
        admin = User.objects.create_superuser(username='admin', password='pass', email='admin@test.com')
        now = timezone.now()
        
        meeting = Meeting.objects.create(
            datetime=now + timedelta(days=1),
            type=MeetingTypeChoices.IN_PERSON.value,
            topic='Limited Meeting',
            created_by=admin,
            recurrence_type=RecurrenceTypeChoices.DAILY.value,
            recurrence_interval=1,
            recurrence_end_date=now + timedelta(days=5)
        )
        
        occurrences = meeting.get_next_occurrences(count=10)
        # Should not exceed end date
        assert all(occ <= meeting.recurrence_end_date for occ in occurrences)
    
    def test_meeting_recurrence_with_count(self):
        """Test recurrence with count limit"""
        admin = User.objects.create_superuser(username='admin', password='pass', email='admin@test.com')
        now = timezone.now()
        
        meeting = Meeting.objects.create(
            datetime=now + timedelta(days=1),
            type=MeetingTypeChoices.IN_PERSON.value,
            topic='Counted Meeting',
            created_by=admin,
            recurrence_type=RecurrenceTypeChoices.DAILY.value,
            recurrence_interval=1,
            recurrence_count=3
        )
        
        occurrences = meeting.get_next_occurrences(count=10)
        # Should respect count limit (original + 2 more = 3 total)
        assert len(occurrences) <= 3
    
    def test_meeting_past_with_recurrence(self):
        """Test past meeting with recurrence finds next occurrence"""
        admin = User.objects.create_superuser(username='admin', password='pass', email='admin@test.com')
        now = timezone.now()
        
        meeting = Meeting.objects.create(
            datetime=now - timedelta(days=5),  # Past meeting
            type=MeetingTypeChoices.IN_PERSON.value,
            topic='Past Recurring Meeting',
            created_by=admin,
            recurrence_type=RecurrenceTypeChoices.DAILY.value,
            recurrence_interval=1
        )
        
        occurrences = meeting.get_next_occurrences(count=3)
        # Should find future occurrences
        assert len(occurrences) > 0
        assert all(occ > now for occ in occurrences)
    
    def test_meeting_past_without_recurrence(self):
        """Test past meeting without recurrence returns empty"""
        admin = User.objects.create_superuser(username='admin', password='pass', email='admin@test.com')
        now = timezone.now()
        
        meeting = Meeting.objects.create(
            datetime=now - timedelta(days=5),  # Past meeting
            type=MeetingTypeChoices.IN_PERSON.value,
            topic='Past One-time Meeting',
            created_by=admin,
            recurrence_type=RecurrenceTypeChoices.NONE.value
        )
        
        occurrences = meeting.get_next_occurrences(count=3)
        # Should return empty for past meetings without recurrence
        assert len(occurrences) == 0
    
    def test_meeting_recurrence_interval(self):
        """Test recurrence with custom interval"""
        admin = User.objects.create_superuser(username='admin', password='pass', email='admin@test.com')
        now = timezone.now()
        
        meeting = Meeting.objects.create(
            datetime=now + timedelta(days=1),
            type=MeetingTypeChoices.IN_PERSON.value,
            topic='Bi-weekly Meeting',
            created_by=admin,
            recurrence_type=RecurrenceTypeChoices.WEEKLY.value,
            recurrence_interval=2  # Every 2 weeks
        )
        
        occurrences = meeting.get_next_occurrences(count=3)
        assert len(occurrences) == 3
        
        # Check that occurrences are 2 weeks apart
        assert (occurrences[1] - occurrences[0]).days == 14
        assert (occurrences[2] - occurrences[1]).days == 14
