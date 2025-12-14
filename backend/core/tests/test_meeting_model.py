"""
Tests for Meeting model
"""
import pytest
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta

from core.models import Meeting, MeetingExternalParticipant, MeetingTypeChoices


@pytest.mark.django_db
class TestMeetingModel:
    """Tests for Meeting model"""
    
    def test_meeting_creation(self):
        """Test basic meeting creation"""
        admin = User.objects.create_superuser(username='admin', password='pass', email='admin@test.com')
        datetime = timezone.now() + timedelta(days=1)
        
        meeting = Meeting.objects.create(
            datetime=datetime,
            type=MeetingTypeChoices.IN_PERSON.value,
            topic='Team Meeting',
            location='Conference Room A',
            summary='Discussion about project progress',
            created_by=admin
        )
        
        assert meeting.datetime == datetime
        assert meeting.type == MeetingTypeChoices.IN_PERSON.value
        assert meeting.topic == 'Team Meeting'
        assert meeting.location == 'Conference Room A'
        assert meeting.summary == 'Discussion about project progress'
        assert meeting.created_by == admin
        assert meeting.created_at is not None
        assert meeting.updated_at is not None
    
    def test_meeting_with_participants(self):
        """Test meeting with app user participants"""
        admin = User.objects.create_superuser(username='admin', password='pass', email='admin@test.com')
        user1 = User.objects.create_user(username='user1', password='pass')
        user2 = User.objects.create_user(username='user2', password='pass')
        
        meeting = Meeting.objects.create(
            datetime=timezone.now() + timedelta(days=1),
            type=MeetingTypeChoices.ONLINE.value,
            topic='Online Meeting',
            created_by=admin
        )
        meeting.participants.set([user1, user2])
        
        assert meeting.participants.count() == 2
        assert user1 in meeting.participants.all()
        assert user2 in meeting.participants.all()
    
    def test_meeting_with_external_participants(self):
        """Test meeting with external (non-app user) participants"""
        admin = User.objects.create_superuser(username='admin', password='pass', email='admin@test.com')
        
        meeting = Meeting.objects.create(
            datetime=timezone.now() + timedelta(days=1),
            type=MeetingTypeChoices.IN_PERSON.value,
            topic='Client Meeting',
            created_by=admin
        )
        
        external1 = MeetingExternalParticipant.objects.create(meeting=meeting, name='John Doe')
        external2 = MeetingExternalParticipant.objects.create(meeting=meeting, name='Jane Smith')
        
        assert meeting.external_participants.count() == 2
        assert external1 in meeting.external_participants.all()
        assert external2 in meeting.external_participants.all()
    
    def test_meeting_mixed_participants(self):
        """Test meeting with both app users and external participants"""
        admin = User.objects.create_superuser(username='admin', password='pass', email='admin@test.com')
        user1 = User.objects.create_user(username='user1', password='pass')
        
        meeting = Meeting.objects.create(
            datetime=timezone.now() + timedelta(days=1),
            type=MeetingTypeChoices.ONLINE.value,
            topic='Mixed Meeting',
            created_by=admin
        )
        meeting.participants.set([user1])
        MeetingExternalParticipant.objects.create(meeting=meeting, name='External Person')
        
        assert meeting.participants.count() == 1
        assert meeting.external_participants.count() == 1
    
    def test_meeting_type_choices(self):
        """Test all valid meeting type choices"""
        admin = User.objects.create_superuser(username='admin', password='pass', email='admin@test.com')
        
        for type_choice in MeetingTypeChoices:
            meeting = Meeting.objects.create(
                datetime=timezone.now() + timedelta(days=1),
                type=type_choice.value,
                topic=f'Meeting {type_choice.value}',
                created_by=admin
            )
            assert meeting.type == type_choice.value
    
    def test_meeting_ordering(self):
        """Test that meetings are ordered by datetime ascending (for future meetings)"""
        admin = User.objects.create_superuser(username='admin', password='pass', email='admin@test.com')
        now = timezone.now()
        
        meeting1 = Meeting.objects.create(
            datetime=now + timedelta(days=1),
            type=MeetingTypeChoices.IN_PERSON.value,
            topic='Future Meeting',
            created_by=admin
        )
        meeting2 = Meeting.objects.create(
            datetime=now + timedelta(days=2),
            type=MeetingTypeChoices.IN_PERSON.value,
            topic='Later Meeting',
            created_by=admin
        )
        meeting3 = Meeting.objects.create(
            datetime=now - timedelta(days=1),
            type=MeetingTypeChoices.IN_PERSON.value,
            topic='Past Meeting',
            created_by=admin
        )
        
        meetings = list(Meeting.objects.all())
        # Should be ordered by datetime (ascending - earliest first)
        assert meetings[0] == meeting3  # Oldest (past)
        assert meetings[1] == meeting1  # Future
        assert meetings[2] == meeting2  # Latest future
    
    def test_meeting_location_optional(self):
        """Test that location is optional"""
        admin = User.objects.create_superuser(username='admin', password='pass', email='admin@test.com')
        
        meeting = Meeting.objects.create(
            datetime=timezone.now() + timedelta(days=1),
            type=MeetingTypeChoices.IN_PERSON.value,
            topic='Meeting Without Location',
            created_by=admin
        )
        
        assert meeting.location == ''
    
    def test_meeting_summary_optional(self):
        """Test that summary is optional"""
        admin = User.objects.create_superuser(username='admin', password='pass', email='admin@test.com')
        
        meeting = Meeting.objects.create(
            datetime=timezone.now() + timedelta(days=1),
            type=MeetingTypeChoices.ONLINE.value,
            topic='Meeting Without Summary',
            created_by=admin
        )
        
        assert meeting.summary == ''
    
    def test_meeting_cascade_delete_created_by(self):
        """Test that meetings are deleted when created_by user is deleted"""
        admin = User.objects.create_superuser(username='admin', password='pass', email='admin@test.com')
        
        meeting = Meeting.objects.create(
            datetime=timezone.now() + timedelta(days=1),
            type=MeetingTypeChoices.IN_PERSON.value,
            topic='Test Meeting',
            created_by=admin
        )
        meeting_id = meeting.id
        
        admin.delete()
        
        assert not Meeting.objects.filter(id=meeting_id).exists()
    
    def test_meeting_external_participant_unique(self):
        """Test that external participants are unique per meeting"""
        admin = User.objects.create_superuser(username='admin', password='pass', email='admin@test.com')
        
        meeting = Meeting.objects.create(
            datetime=timezone.now() + timedelta(days=1),
            type=MeetingTypeChoices.IN_PERSON.value,
            topic='Test Meeting',
            created_by=admin
        )
        
        MeetingExternalParticipant.objects.create(meeting=meeting, name='John Doe')
        
        # Try to create duplicate - should raise IntegrityError
        from django.db import IntegrityError
        with pytest.raises(IntegrityError):
            MeetingExternalParticipant.objects.create(meeting=meeting, name='John Doe')
    
    def test_meeting_external_participant_cascade_delete(self):
        """Test that external participants are deleted when meeting is deleted"""
        admin = User.objects.create_superuser(username='admin', password='pass', email='admin@test.com')
        
        meeting = Meeting.objects.create(
            datetime=timezone.now() + timedelta(days=1),
            type=MeetingTypeChoices.IN_PERSON.value,
            topic='Test Meeting',
            created_by=admin
        )
        
        external = MeetingExternalParticipant.objects.create(meeting=meeting, name='John Doe')
        external_id = external.id
        
        meeting.delete()
        
        assert not MeetingExternalParticipant.objects.filter(id=external_id).exists()
