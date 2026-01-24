"""
Extended model tests for edge cases and validations
"""
import pytest
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta, date
from django.db import IntegrityError

from core.models import (
    Project, Task, WorkingDay, Report, Feedback,
    StatusChoices, ReportResultChoices, FeedbackTypeChoices
)


@pytest.mark.django_db
class TestProjectModelExtended:
    """Extended tests for Project model"""
    
    def test_project_name_max_length(self):
        """Test project name respects max_length"""
        long_name = 'x' * 255
        project = Project.objects.create(name=long_name)
        assert len(project.name) == 255
    
    def test_project_empty_name(self):
        """Test project can be created with empty name (if allowed by serializer)"""
        project = Project.objects.create(name='')
        assert project.name == ''
    
    def test_project_multiple_assignees(self):
        """Test project with many assignees"""
        users = [User.objects.create_user(username=f'user{i}', password='pass') for i in range(10)]
        project = Project.objects.create(name='Project')
        project.assignees.set(users)
        assert project.assignees.count() == 10
    
    def test_project_estimated_hours_negative(self):
        """Test project can have negative estimated hours (if allowed)"""
        project = Project.objects.create(name='Project', estimated_hours=-10)
        assert project.estimated_hours == -10
    
    def test_project_estimated_hours_zero(self):
        """Test project with zero estimated hours"""
        project = Project.objects.create(name='Project', estimated_hours=0)
        assert project.estimated_hours == 0
    
    def test_project_deadline_before_start_date(self):
        """Test project with deadline before start_date (business logic validation)"""
        start_date = date.today()
        deadline = start_date - timedelta(days=10)
        project = Project.objects.create(
            name='Project',
            start_date=start_date,
            deadline=deadline
        )
        # Model allows this, business logic should validate
        assert project.deadline < project.start_date
    
    def test_project_remove_assignees(self):
        """Test removing assignees from project"""
        user1 = User.objects.create_user(username='user1', password='pass')
        user2 = User.objects.create_user(username='user2', password='pass')
        project = Project.objects.create(name='Project')
        project.assignees.set([user1, user2])
        assert project.assignees.count() == 2
        
        project.assignees.remove(user1)
        assert project.assignees.count() == 1
        assert user2 in project.assignees.all()
    
    def test_project_clear_assignees(self):
        """Test clearing all assignees from project"""
        user = User.objects.create_user(username='user', password='pass')
        project = Project.objects.create(name='Project')
        project.assignees.set([user])
        project.assignees.clear()
        assert project.assignees.count() == 0


@pytest.mark.django_db
class TestTaskModelExtended:
    """Extended tests for Task model"""
    
    def test_task_name_max_length(self):
        """Test task name respects max_length"""
        long_name = 'x' * 255
        task = Task.objects.create(name=long_name)
        assert len(task.name) == 255
    
    def test_task_estimated_hours_large_value(self):
        """Test task with very large estimated hours"""
        task = Task.objects.create(name='Task', estimated_hours=999999)
        assert task.estimated_hours == 999999
    
    def test_task_phase_max_value(self):
        """Test task with maximum phase value"""
        task = Task.objects.create(name='Task', phase=32767)  # Max for PositiveSmallIntegerField
        assert task.phase == 32767
    
    def test_task_multiple_assignees(self):
        """Test task with many assignees"""
        users = [User.objects.create_user(username=f'user{i}', password='pass') for i in range(10)]
        task = Task.objects.create(name='Task')
        task.assignees.set(users)
        assert task.assignees.count() == 10
    
    def test_task_without_created_by(self):
        """Test task can exist without created_by"""
        task = Task.objects.create(name='Task', created_by=None)
        assert task.created_by is None
    
    def test_task_deadline_before_start_date(self):
        """Test task with deadline before start_date"""
        start_date = date.today()
        deadline = start_date - timedelta(days=5)
        task = Task.objects.create(
            name='Task',
            start_date=start_date,
            deadline=deadline
        )
        assert task.deadline < task.start_date
    
    def test_task_project_cascade_set_null(self):
        """Test that task.project is set to None when project deleted"""
        project = Project.objects.create(name='Project')
        task = Task.objects.create(name='Task', project=project)
        project_id = project.id
        task_id = task.id
        
        project.delete()
        task.refresh_from_db()
        assert task.project is None
        assert not Project.objects.filter(id=project_id).exists()
        assert Task.objects.filter(id=task_id).exists()
    
    def test_task_created_by_cascade_delete(self):
        """Test that task is deleted when created_by user is deleted"""
        user = User.objects.create_user(username='user', password='pass')
        task = Task.objects.create(name='Task', created_by=user)
        task_id = task.id
        
        user.delete()
        assert not Task.objects.filter(id=task_id).exists()
    
    def test_task_draft_to_approved(self):
        """Test changing task from draft to approved"""
        task = Task.objects.create(name='Task', is_draft=True)
        assert task.is_draft is True
        
        task.is_draft = False
        task.save()
        assert task.is_draft is False


@pytest.mark.django_db
class TestWorkingDayModelExtended:
    """Extended tests for WorkingDay model"""
    
    def test_working_day_checkout_before_checkin(self):
        """Test working day with checkout before checkin (should be allowed by model)"""
        check_in = timezone.now()
        check_out = check_in - timedelta(hours=1)
        user = User.objects.create_user(username='user', password='pass')
        
        # Model allows this, business logic should validate
        working_day = WorkingDay.objects.create(
            user=user,
            check_in=check_in,
            check_out=check_out
        )
        assert working_day.check_out < working_day.check_in
    
    def test_working_day_same_checkin_checkout(self):
        """Test working day with same checkin and checkout time"""
        user = User.objects.create_user(username='user', password='pass')
        working_day = WorkingDay.objects.create(user=user)
        # check_in is auto_now_add, so set check_out to same time
        working_day.check_out = working_day.check_in
        working_day.save()
        assert working_day.check_in == working_day.check_out
    
    def test_working_day_long_duration(self):
        """Test working day with very long duration"""
        user = User.objects.create_user(username='user', password='pass')
        working_day = WorkingDay.objects.create(user=user)
        # check_in is auto_now_add, so calculate check_out from it
        check_out = working_day.check_in + timedelta(hours=24)
        working_day.check_out = check_out
        working_day.save()
        # Allow small difference due to timing
        duration = (working_day.check_out - working_day.check_in).total_seconds()
        assert abs(duration - 86400) < 1  # Within 1 second
    
    def test_working_day_multiple_per_user(self):
        """Test multiple working days for same user"""
        user = User.objects.create_user(username='user', password='pass')
        for i in range(10):
            WorkingDay.objects.create(user=user)
        assert WorkingDay.objects.filter(user=user).count() == 10
    
    def test_working_day_on_leave_with_checkout(self):
        """Test working day marked as leave with checkout time"""
        user = User.objects.create_user(username='user', password='pass')
        check_in = timezone.now()
        check_out = check_in + timedelta(hours=8)
        working_day = WorkingDay.objects.create(
            user=user,
            check_in=check_in,
            check_out=check_out,
            is_on_leave=True
        )
        assert working_day.is_on_leave is True
        assert working_day.check_out is not None


@pytest.mark.django_db
class TestReportModelExtended:
    """Extended tests for Report model"""
    
    def test_report_comment_max_length(self):
        """Test report comment respects max_length"""
        long_comment = 'x' * 1000
        user = User.objects.create_user(username='user', password='pass')
        working_day = WorkingDay.objects.create(user=user)
        task = Task.objects.create(name='Task')
        report = Report.objects.create(
            working_day=working_day,
            task=task,
            comment=long_comment
        )
        assert len(report.comment) == 1000
    
    def test_report_empty_comment(self):
        """Test report with empty comment"""
        user = User.objects.create_user(username='user', password='pass')
        working_day = WorkingDay.objects.create(user=user)
        task = Task.objects.create(name='Task')
        report = Report.objects.create(
            working_day=working_day,
            task=task,
            comment=''
        )
        assert report.comment == ''
    
    def test_report_end_time_before_start_time(self):
        """Test report with end_time before start_time (model allows, business logic should validate)"""
        user = User.objects.create_user(username='user', password='pass')
        working_day = WorkingDay.objects.create(user=user)
        task = Task.objects.create(name='Task')
        start_time = timezone.now()
        end_time = start_time - timedelta(hours=1)
        
        report = Report.objects.create(
            working_day=working_day,
            task=task,
            start_time=start_time,
            end_time=end_time
        )
        assert report.end_time < report.start_time
    
    def test_report_same_start_end_time(self):
        """Test report with same start and end time"""
        user = User.objects.create_user(username='user', password='pass')
        working_day = WorkingDay.objects.create(user=user)
        task = Task.objects.create(name='Task')
        time = timezone.now()
        
        report = Report.objects.create(
            working_day=working_day,
            task=task,
            start_time=time,
            end_time=time
        )
        assert report.start_time == report.end_time
    
    def test_report_without_times(self):
        """Test report without start_time and end_time"""
        user = User.objects.create_user(username='user', password='pass')
        working_day = WorkingDay.objects.create(user=user)
        task = Task.objects.create(name='Task')
        
        report = Report.objects.create(
            working_day=working_day,
            task=task,
            result=ReportResultChoices.ONGOING.value
        )
        assert report.start_time is None
        assert report.end_time is None
    
    def test_report_multiple_per_working_day(self):
        """Test multiple reports for same working day"""
        user = User.objects.create_user(username='user', password='pass')
        working_day = WorkingDay.objects.create(user=user)
        task = Task.objects.create(name='Task')
        
        for i in range(10):
            Report.objects.create(working_day=working_day, task=task)
        assert Report.objects.filter(working_day=working_day).count() == 10
    
    def test_report_multiple_per_task(self):
        """Test multiple reports for same task"""
        user = User.objects.create_user(username='user', password='pass')
        working_day = WorkingDay.objects.create(user=user)
        task = Task.objects.create(name='Task')
        
        for i in range(5):
            wd = WorkingDay.objects.create(user=user)
            Report.objects.create(working_day=wd, task=task)
        assert Report.objects.filter(task=task).count() == 5


@pytest.mark.django_db
class TestFeedbackModelExtended:
    """Extended tests for Feedback model"""
    
    def test_feedback_long_description(self):
        """Test feedback with very long description"""
        user = User.objects.create_user(username='user', password='pass')
        long_description = 'x' * 10000
        feedback = Feedback.objects.create(
            user=user,
            description=long_description
        )
        assert len(feedback.description) == 10000
    
    def test_feedback_empty_description(self):
        """Test feedback with empty description (should fail validation)"""
        user = User.objects.create_user(username='user', password='pass')
        # This should be caught by serializer validation, not model
        feedback = Feedback.objects.create(user=user, description='')
        assert feedback.description == ''
    
    def test_feedback_multiple_per_user(self):
        """Test multiple feedbacks from same user"""
        user = User.objects.create_user(username='user', password='pass')
        for i in range(20):
            Feedback.objects.create(
                user=user,
                description=f'Feedback {i}'
            )
        assert Feedback.objects.filter(user=user).count() == 20
    
    def test_feedback_all_types(self):
        """Test creating feedbacks with all types"""
        user = User.objects.create_user(username='user', password='pass')
        for ftype in FeedbackTypeChoices:
            feedback = Feedback.objects.create(
                user=user,
                description=f'Feedback {ftype.value}',
                type=ftype.value
            )
            assert feedback.type == ftype.value
    
    def test_feedback_type_none(self):
        """Test feedback with type=None"""
        user = User.objects.create_user(username='user', password='pass')
        feedback = Feedback.objects.create(
            user=user,
            description='Feedback without type',
            type=None
        )
        assert feedback.type is None


@pytest.mark.django_db
class TestModelRelationships:
    """Tests for model relationships and cascades"""
    
    def test_project_tasks_relationship(self):
        """Test project.tasks relationship"""
        project = Project.objects.create(name='Project')
        tasks = [Task.objects.create(name=f'Task {i}', project=project) for i in range(5)]
        
        assert project.tasks.count() == 5
        for task in tasks:
            assert task in project.tasks.all()
    
    def test_user_assigned_projects(self):
        """Test user.assigned_projects relationship"""
        user = User.objects.create_user(username='user', password='pass')
        projects = [Project.objects.create(name=f'Project {i}') for i in range(3)]
        for project in projects:
            project.assignees.set([user])
        
        assert user.assigned_projects.count() == 3
    
    def test_user_assigned_tasks(self):
        """Test user.assigned_tasks relationship"""
        user = User.objects.create_user(username='user', password='pass')
        tasks = [Task.objects.create(name=f'Task {i}') for i in range(4)]
        for task in tasks:
            task.assignees.set([user])
        
        assert user.assigned_tasks.count() == 4
    
    def test_user_created_tasks(self):
        """Test user.created_tasks relationship"""
        user = User.objects.create_user(username='user', password='pass')
        tasks = [Task.objects.create(name=f'Task {i}', created_by=user) for i in range(3)]
        
        assert user.created_tasks.count() == 3
    
    def test_user_working_days(self):
        """Test user.working_days relationship"""
        user = User.objects.create_user(username='user', password='pass')
        for i in range(5):
            WorkingDay.objects.create(user=user)
        
        assert user.working_days.count() == 5
    
    def test_user_feedbacks(self):
        """Test user.feedbacks relationship"""
        user = User.objects.create_user(username='user', password='pass')
        for i in range(3):
            Feedback.objects.create(user=user, description=f'Feedback {i}')
        
        assert user.feedbacks.count() == 3
    
    def test_working_day_reports(self):
        """Test working_day.reports relationship"""
        user = User.objects.create_user(username='user', password='pass')
        working_day = WorkingDay.objects.create(user=user)
        task = Task.objects.create(name='Task')
        
        for i in range(4):
            Report.objects.create(working_day=working_day, task=task)
        
        assert working_day.reports.count() == 4
    
    def test_task_reports(self):
        """Test task.reports relationship"""
        user = User.objects.create_user(username='user', password='pass')
        task = Task.objects.create(name='Task')
        
        for i in range(3):
            wd = WorkingDay.objects.create(user=user)
            Report.objects.create(working_day=wd, task=task)
        
        assert task.reports.count() == 3

