"""
Comprehensive tests for core models
"""
import pytest
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta, date

from core.models import (
    Project, Task, WorkingDay, Report, Feedback,
    StatusChoices, ReportResultChoices, FeedbackTypeChoices
)


@pytest.mark.django_db
class TestProjectModel:
    """Tests for Project model"""
    
    def test_project_creation(self):
        """Test basic project creation"""
        project = Project.objects.create(
            name='Test Project',
            description='Test description',
            color='#FF0000',
            status=StatusChoices.BACKLOG.value
        )
        assert project.name == 'Test Project'
        assert project.description == 'Test description'
        assert project.color == '#FF0000'
        assert project.status == StatusChoices.BACKLOG.value
        assert project.estimated_hours == 0
        assert project.created_at is not None
        assert project.updated_at is not None
    
    def test_project_default_status(self):
        """Test that project defaults to backlog status"""
        project = Project.objects.create(name='Test Project')
        assert project.status == StatusChoices.BACKLOG.value
    
    def test_project_with_assignees(self):
        """Test project with assigned users"""
        user1 = User.objects.create_user(username='user1', password='pass')
        user2 = User.objects.create_user(username='user2', password='pass')
        
        project = Project.objects.create(name='Test Project')
        project.assignees.set([user1, user2])
        
        assert project.assignees.count() == 2
        assert user1 in project.assignees.all()
        assert user2 in project.assignees.all()
        assert project in user1.assigned_projects.all()
    
    def test_project_with_dates(self):
        """Test project with start_date and deadline"""
        start_date = date.today()
        deadline = start_date + timedelta(days=30)
        
        project = Project.objects.create(
            name='Test Project',
            start_date=start_date,
            deadline=deadline,
            estimated_hours=100
        )
        
        assert project.start_date == start_date
        assert project.deadline == deadline
        assert project.estimated_hours == 100
    
    def test_project_status_choices(self):
        """Test all valid status choices"""
        for status_choice in StatusChoices:
            project = Project.objects.create(
                name=f'Project {status_choice.value}',
                status=status_choice.value
            )
            assert project.status == status_choice.value
    
    def test_project_updated_at_auto_update(self):
        """Test that updated_at is automatically updated"""
        project = Project.objects.create(name='Test Project')
        original_updated = project.updated_at
        
        # Wait a bit and update
        import time
        time.sleep(0.1)
        project.name = 'Updated Project'
        project.save()
        
        assert project.updated_at > original_updated


@pytest.mark.django_db
class TestTaskModel:
    """Tests for Task model"""
    
    def test_task_creation(self):
        """Test basic task creation"""
        user = User.objects.create_user(username='user', password='pass')
        task = Task.objects.create(
            name='Test Task',
            description='Test description',
            color='#00FF00',
            created_by=user,
            status=StatusChoices.TODO.value,
            is_draft=False
        )
        
        assert task.name == 'Test Task'
        assert task.description == 'Test description'
        assert task.color == '#00FF00'
        assert task.created_by == user
        assert task.status == StatusChoices.TODO.value
        assert task.is_draft is False
        assert task.estimated_hours == 0
        assert task.phase == 0
    
    def test_task_default_values(self):
        """Test task default values"""
        task = Task.objects.create(name='Test Task')
        
        assert task.status == StatusChoices.BACKLOG.value
        assert task.is_draft is True
        assert task.estimated_hours == 0
        assert task.phase == 0
        assert task.created_at is not None
        assert task.updated_at is not None
    
    def test_task_with_project(self):
        """Test task linked to project"""
        project = Project.objects.create(name='Test Project')
        task = Task.objects.create(
            name='Test Task',
            project=project
        )
        
        assert task.project == project
        assert task in project.tasks.all()
    
    def test_task_without_project(self):
        """Test standalone task without project"""
        task = Task.objects.create(name='Standalone Task')
        assert task.project is None
    
    def test_task_with_assignees(self):
        """Test task with assigned users"""
        user1 = User.objects.create_user(username='user1', password='pass')
        user2 = User.objects.create_user(username='user2', password='pass')
        
        task = Task.objects.create(name='Test Task')
        task.assignees.set([user1, user2])
        
        assert task.assignees.count() == 2
        assert user1 in task.assignees.all()
        assert user2 in task.assignees.all()
        assert task in user1.assigned_tasks.all()
    
    def test_task_created_by_relationship(self):
        """Test task created_by relationship"""
        user = User.objects.create_user(username='creator', password='pass')
        task = Task.objects.create(name='Test Task', created_by=user)
        
        assert task.created_by == user
        assert task in user.created_tasks.all()
    
    def test_task_cascade_delete_created_by(self):
        """Test that task is deleted when created_by user is deleted"""
        user = User.objects.create_user(username='creator', password='pass')
        task = Task.objects.create(name='Test Task', created_by=user)
        task_id = task.id
        
        user.delete()
        
        assert not Task.objects.filter(id=task_id).exists()
    
    def test_task_set_null_on_project_delete(self):
        """Test that task.project is set to None when project is deleted"""
        project = Project.objects.create(name='Test Project')
        task = Task.objects.create(name='Test Task', project=project)
        
        project.delete()
        task.refresh_from_db()
        
        assert task.project is None
    
    def test_task_all_status_choices(self):
        """Test all valid status choices for tasks"""
        for status_choice in StatusChoices:
            task = Task.objects.create(
                name=f'Task {status_choice.value}',
                status=status_choice.value
            )
            assert task.status == status_choice.value
    
    def test_task_phase_field(self):
        """Test task phase field"""
        task = Task.objects.create(name='Test Task', phase=3)
        assert task.phase == 3
    
    def test_task_estimated_hours_positive(self):
        """Test task estimated_hours is positive integer"""
        task = Task.objects.create(name='Test Task', estimated_hours=50)
        assert task.estimated_hours == 50
        assert isinstance(task.estimated_hours, int)


@pytest.mark.django_db
class TestWorkingDayModel:
    """Tests for WorkingDay model"""
    
    def test_working_day_creation(self):
        """Test basic working day creation"""
        user = User.objects.create_user(username='user', password='pass')
        working_day = WorkingDay.objects.create(user=user)
        
        assert working_day.user == user
        assert working_day.check_in is not None
        assert working_day.check_out is None
        assert working_day.is_on_leave is False
        assert working_day in user.working_days.all()
    
    def test_working_day_with_checkout(self):
        """Test working day with check-out time"""
        user = User.objects.create_user(username='user', password='pass')
        check_in = timezone.now()
        check_out = check_in + timedelta(hours=8)
        
        working_day = WorkingDay.objects.create(
            user=user,
            check_in=check_in,
            check_out=check_out
        )
        
        # check_in is auto_now_add, so it will be set automatically
        # Just verify check_out was set correctly
        assert working_day.check_out == check_out
        assert working_day.check_in is not None
    
    def test_working_day_on_leave(self):
        """Test working day marked as leave"""
        user = User.objects.create_user(username='user', password='pass')
        working_day = WorkingDay.objects.create(
            user=user,
            is_on_leave=True
        )
        
        assert working_day.is_on_leave is True
    
    def test_working_day_cascade_delete_user(self):
        """Test that working days are deleted when user is deleted"""
        user = User.objects.create_user(username='user', password='pass')
        working_day = WorkingDay.objects.create(user=user)
        working_day_id = working_day.id
        
        user.delete()
        
        assert not WorkingDay.objects.filter(id=working_day_id).exists()
    
    def test_working_day_auto_check_in(self):
        """Test that check_in is automatically set on creation"""
        user = User.objects.create_user(username='user', password='pass')
        before_creation = timezone.now()
        
        working_day = WorkingDay.objects.create(user=user)
        
        assert working_day.check_in is not None
        assert working_day.check_in >= before_creation


@pytest.mark.django_db
class TestReportModel:
    """Tests for Report model"""
    
    def test_report_creation(self):
        """Test basic report creation"""
        user = User.objects.create_user(username='user', password='pass')
        working_day = WorkingDay.objects.create(user=user)
        task = Task.objects.create(name='Test Task')
        
        start_time = timezone.now()
        end_time = start_time + timedelta(hours=2)
        
        report = Report.objects.create(
            working_day=working_day,
            task=task,
            result=ReportResultChoices.SUCCESS.value,
            comment='Completed successfully',
            start_time=start_time,
            end_time=end_time
        )
        
        assert report.working_day == working_day
        assert report.task == task
        assert report.result == ReportResultChoices.SUCCESS.value
        assert report.comment == 'Completed successfully'
        assert report.start_time == start_time
        assert report.end_time == end_time
    
    def test_report_default_result(self):
        """Test that report defaults to ongoing result"""
        user = User.objects.create_user(username='user', password='pass')
        working_day = WorkingDay.objects.create(user=user)
        task = Task.objects.create(name='Test Task')
        
        report = Report.objects.create(
            working_day=working_day,
            task=task
        )
        
        assert report.result == ReportResultChoices.ONGOING.value
    
    def test_report_all_result_choices(self):
        """Test all valid result choices"""
        user = User.objects.create_user(username='user', password='pass')
        working_day = WorkingDay.objects.create(user=user)
        task = Task.objects.create(name='Test Task')
        
        for result_choice in ReportResultChoices:
            report = Report.objects.create(
                working_day=working_day,
                task=task,
                result=result_choice.value
            )
            assert report.result == result_choice.value
    
    def test_report_comment_max_length(self):
        """Test report comment field accepts long text"""
        user = User.objects.create_user(username='user', password='pass')
        working_day = WorkingDay.objects.create(user=user)
        task = Task.objects.create(name='Test Task')
        
        long_comment = 'x' * 1000
        report = Report.objects.create(
            working_day=working_day,
            task=task,
            comment=long_comment
        )
        
        assert len(report.comment) == 1000
    
    def test_report_cascade_delete_working_day(self):
        """Test that reports are deleted when working day is deleted"""
        user = User.objects.create_user(username='user', password='pass')
        working_day = WorkingDay.objects.create(user=user)
        task = Task.objects.create(name='Test Task')
        report = Report.objects.create(
            working_day=working_day,
            task=task
        )
        report_id = report.id
        
        working_day.delete()
        
        assert not Report.objects.filter(id=report_id).exists()
    
    def test_report_cascade_delete_task(self):
        """Test that reports are deleted when task is deleted"""
        user = User.objects.create_user(username='user', password='pass')
        working_day = WorkingDay.objects.create(user=user)
        task = Task.objects.create(name='Test Task')
        report = Report.objects.create(
            working_day=working_day,
            task=task
        )
        report_id = report.id
        
        task.delete()
        
        assert not Report.objects.filter(id=report_id).exists()
    
    def test_report_relationship_to_working_day(self):
        """Test report relationship to working day"""
        user = User.objects.create_user(username='user', password='pass')
        working_day = WorkingDay.objects.create(user=user)
        task = Task.objects.create(name='Test Task')
        
        report1 = Report.objects.create(working_day=working_day, task=task)
        report2 = Report.objects.create(working_day=working_day, task=task)
        
        assert working_day.reports.count() == 2
        assert report1 in working_day.reports.all()
        assert report2 in working_day.reports.all()
    
    def test_report_relationship_to_task(self):
        """Test report relationship to task"""
        user = User.objects.create_user(username='user', password='pass')
        working_day = WorkingDay.objects.create(user=user)
        task = Task.objects.create(name='Test Task')
        
        report1 = Report.objects.create(working_day=working_day, task=task)
        report2 = Report.objects.create(working_day=working_day, task=task)
        
        assert task.reports.count() == 2
        assert report1 in task.reports.all()
        assert report2 in task.reports.all()
    
    def test_report_without_times(self):
        """Test report can be created without start_time and end_time"""
        user = User.objects.create_user(username='user', password='pass')
        working_day = WorkingDay.objects.create(user=user)
        task = Task.objects.create(name='Test Task')
        
        report = Report.objects.create(
            working_day=working_day,
            task=task,
            comment='Report without times'
        )
        
        assert report.start_time is None
        assert report.end_time is None


@pytest.mark.django_db
class TestFeedbackModel:
    """Tests for Feedback model"""
    
    def test_feedback_creation(self):
        """Test basic feedback creation"""
        user = User.objects.create_user(username='user', password='pass')
        feedback = Feedback.objects.create(
            user=user,
            description='This is a test feedback',
            type=FeedbackTypeChoices.SUGGESTION.value
        )
        
        assert feedback.user == user
        assert feedback.description == 'This is a test feedback'
        assert feedback.type == FeedbackTypeChoices.SUGGESTION.value
        assert feedback.created_at is not None
        assert feedback.updated_at is not None
    
    def test_feedback_without_type(self):
        """Test feedback can be created without type"""
        user = User.objects.create_user(username='user', password='pass')
        feedback = Feedback.objects.create(
            user=user,
            description='Feedback without type'
        )
        
        assert feedback.type is None
    
    def test_feedback_all_type_choices(self):
        """Test all valid feedback type choices"""
        user = User.objects.create_user(username='user', password='pass')
        
        for type_choice in FeedbackTypeChoices:
            feedback = Feedback.objects.create(
                user=user,
                description=f'Feedback {type_choice.value}',
                type=type_choice.value
            )
            assert feedback.type == type_choice.value
    
    def test_feedback_cascade_delete_user(self):
        """Test that feedbacks are deleted when user is deleted"""
        user = User.objects.create_user(username='user', password='pass')
        feedback = Feedback.objects.create(
            user=user,
            description='Test feedback'
        )
        feedback_id = feedback.id
        
        user.delete()
        
        assert not Feedback.objects.filter(id=feedback_id).exists()
    
    def test_feedback_relationship_to_user(self):
        """Test feedback relationship to user"""
        user = User.objects.create_user(username='user', password='pass')
        
        feedback1 = Feedback.objects.create(user=user, description='Feedback 1')
        feedback2 = Feedback.objects.create(user=user, description='Feedback 2')
        
        assert user.feedbacks.count() == 2
        assert feedback1 in user.feedbacks.all()
        assert feedback2 in user.feedbacks.all()
    
    def test_feedback_auto_timestamps(self):
        """Test that created_at and updated_at are automatically set"""
        user = User.objects.create_user(username='user', password='pass')
        before_creation = timezone.now()
        
        feedback = Feedback.objects.create(
            user=user,
            description='Test feedback'
        )
        
        assert feedback.created_at >= before_creation
        assert feedback.updated_at >= before_creation
    
    def test_feedback_updated_at_auto_update(self):
        """Test that updated_at is automatically updated"""
        user = User.objects.create_user(username='user', password='pass')
        feedback = Feedback.objects.create(
            user=user,
            description='Test feedback'
        )
        original_updated = feedback.updated_at
        
        # Wait a bit and update
        import time
        time.sleep(0.1)
        feedback.description = 'Updated feedback'
        feedback.save()
        
        assert feedback.updated_at > original_updated

