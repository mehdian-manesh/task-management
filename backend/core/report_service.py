"""
Report generation service for creating consolidated work reports.
"""
from django.db.models import Q, Prefetch
from django.utils import timezone
from .models import (
    Task, Project, Report, WorkingDay, Feedback, Meeting,
    ReportNote, Domain, User, StatusChoices
)
from .jalali_utils import get_jalali_date_range, format_jalali_period, gregorian_to_jalali
from .serializers import (
    TaskDetailSerializer, ProjectSerializer, ReportDetailSerializer,
    FeedbackSerializer, MeetingDetailSerializer, UserSerializer
)


class ReportService:
    """Service for generating individual and team reports"""
    
    @staticmethod
    def generate_individual_report(user, period_type, year, month=None, day=None, week=None):
        """
        Generate report for an individual user.
        
        Args:
            user: User instance
            period_type: 'daily', 'weekly', 'monthly', or 'yearly'
            year: Jalali year
            month: Jalali month (for daily, monthly)
            day: Jalali day (for daily)
            week: Jalali week number (for weekly)
        
        Returns:
            Dictionary containing all report data
        """
        # Get date range
        start_datetime, end_datetime = get_jalali_date_range(
            period_type, year, month=month, day=day, week=week
        )
        
        # Get period info
        period_info = {
            'type': period_type,
            'jalali_year': year,
            'jalali_month': month,
            'jalali_day': day,
            'jalali_week': week,
            'start_date': start_datetime.date().isoformat(),
            'end_date': end_datetime.date().isoformat(),
            'formatted': format_jalali_period(period_type, year, month=month, week=week, day=day),
        }
        
        # Get completed tasks (tasks with reports that have success result in this period)
        completed_reports = Report.objects.filter(
            working_day__user=user,
            start_time__gte=start_datetime,
            start_time__lte=end_datetime,
            result='success'
        ).select_related('task', 'task__project').prefetch_related('task__assignees')
        
        completed_tasks = []
        task_ids_seen = set()
        for report in completed_reports:
            if report.task_id not in task_ids_seen:
                task_ids_seen.add(report.task_id)
                task_data = TaskDetailSerializer(report.task, context={'request': None}).data
                # Add report info to task
                task_reports = Report.objects.filter(
                    working_day__user=user,
                    task=report.task,
                    start_time__gte=start_datetime,
                    start_time__lte=end_datetime
                )
                task_data['reports'] = ReportDetailSerializer(task_reports, many=True).data
                completed_tasks.append(task_data)
        
        # Get projects (projects user is assigned to that have activity in this period)
        user_projects = Project.objects.filter(
            assignees=user
        ).prefetch_related('assignees', 'tasks')
        
        # Filter projects that have tasks with reports in this period
        projects = []
        project_ids_seen = set()
        for project in user_projects:
            project_tasks = Task.objects.filter(
                project=project,
                reports__working_day__user=user,
                reports__start_time__gte=start_datetime,
                reports__start_time__lte=end_datetime
            ).distinct()
            
            if project_tasks.exists() or project.id not in project_ids_seen:
                project_ids_seen.add(project.id)
                project_data = ProjectSerializer(project, context={'request': None}).data
                projects.append(project_data)
        
        # Get meetings user attended in this period
        meetings = Meeting.objects.filter(
            participants=user,
            datetime__gte=start_datetime,
            datetime__lte=end_datetime
        ).prefetch_related('participants', 'external_participants', 'created_by')
        
        meetings_data = MeetingDetailSerializer(meetings, many=True, context={'request': None}).data
        
        # Get working hours schedule
        working_days = WorkingDay.objects.filter(
            user=user,
            check_in__gte=start_datetime,
            check_in__lte=end_datetime
        ).order_by('check_in')
        
        working_hours = []
        for wd in working_days:
            # Get reports for this working day
            day_reports = Report.objects.filter(working_day=wd).select_related('task')
            total_hours = 0
            for report in day_reports:
                if report.start_time and report.end_time:
                    delta = report.end_time - report.start_time
                    total_hours += delta.total_seconds() / 3600
            
            working_hours.append({
                'date': wd.check_in.date().isoformat(),
                'check_in': wd.check_in.isoformat(),
                'check_out': wd.check_out.isoformat() if wd.check_out else None,
                'is_on_leave': wd.is_on_leave,
                'total_hours': round(total_hours, 2),
                'reports_count': day_reports.count(),
            })
        
        # Get feedbacks added in this period
        feedbacks = Feedback.objects.filter(
            user=user,
            created_at__gte=start_datetime,
            created_at__lte=end_datetime
        ).order_by('-created_at')
        
        feedbacks_data = FeedbackSerializer(feedbacks, many=True, context={'request': None}).data
        
        # Get admin notes for this period (global notes and user's domain notes)
        notes_query = Q(
            period_type=period_type,
            jalali_year=year,
        )
        
        if period_type == 'daily':
            notes_query &= Q(jalali_month=month, jalali_day=day)
        elif period_type == 'weekly':
            notes_query &= Q(jalali_week=week)
        elif period_type == 'monthly':
            notes_query &= Q(jalali_month=month)
        
        # Get user's domain
        user_domain = None
        try:
            user_domain = user.profile.domain
        except AttributeError:
            pass
        
        # Notes are either global (domain=None) or for user's domain
        domain_notes_query = Q(domain=None) | Q(domain=user_domain) if user_domain else Q(domain=None)
        
        report_notes = ReportNote.objects.filter(
            notes_query & domain_notes_query
        ).select_related('created_by', 'domain').order_by('-created_at')
        
        admin_notes = []
        for note in report_notes:
            admin_notes.append({
                'id': note.id,
                'note': note.note,
                'domain': note.domain.name if note.domain else None,
                'created_by': note.created_by.username,
                'created_at': note.created_at.isoformat(),
            })
        
        return {
            'period': period_info,
            'user': {
                'id': user.id,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
            },
            'completed_tasks': completed_tasks,
            'projects': projects,
            'meetings': meetings_data,
            'working_hours': working_hours,
            'feedbacks': feedbacks_data,
            'admin_notes': admin_notes,
        }
    
    @staticmethod
    def generate_team_report(domain, period_type, year, month=None, week=None):
        """
        Generate report for a team/domain.
        
        Args:
            domain: Domain instance
            period_type: 'daily', 'weekly', 'monthly', or 'yearly'
            year: Jalali year
            month: Jalali month (for daily, monthly)
            week: Jalali week number (for weekly)
            day: Not used for team reports (daily team reports not typical)
        
        Returns:
            Dictionary containing all report data
        """
        # Get date range
        start_datetime, end_datetime = get_jalali_date_range(
            period_type, year, month=month, week=week
        )
        
        # Get period info
        period_info = {
            'type': period_type,
            'jalali_year': year,
            'jalali_month': month,
            'jalali_week': week,
            'start_date': start_datetime.date().isoformat(),
            'end_date': end_datetime.date().isoformat(),
            'formatted': format_jalali_period(period_type, year, month=month, week=week),
        }
        
        # Get all users in this domain
        domain_user_ids = []
        try:
            from accounts.models import UserProfile
            domain_users = User.objects.filter(profile__domain=domain)
            domain_user_ids = list(domain_users.values_list('id', flat=True))
        except Exception:
            pass
        
        if not domain_user_ids:
            # No users in domain
            return {
                'period': period_info,
                'domain': {
                    'id': domain.id,
                    'name': domain.name,
                },
                'completed_tasks': [],
                'projects': [],
                'meetings': [],
                'working_hours': [],
                'feedbacks': [],
                'admin_notes': [],
            }
        
        # Get completed tasks (all tasks with successful reports from domain users)
        completed_reports = Report.objects.filter(
            working_day__user__id__in=domain_user_ids,
            start_time__gte=start_datetime,
            start_time__lte=end_datetime,
            result='success'
        ).select_related('task', 'task__project', 'working_day__user').prefetch_related('task__assignees')
        
        completed_tasks = []
        task_ids_seen = set()
        for report in completed_reports:
            if report.task_id not in task_ids_seen:
                task_ids_seen.add(report.task_id)
                task_data = TaskDetailSerializer(report.task, context={'request': None}).data
                # Add report info with user information
                task_reports = Report.objects.filter(
                    working_day__user__id__in=domain_user_ids,
                    task=report.task,
                    start_time__gte=start_datetime,
                    start_time__lte=end_datetime
                ).select_related('working_day__user')
                reports_data = []
                for tr in task_reports:
                    report_data = ReportDetailSerializer(tr, context={'request': None}).data
                    report_data['user'] = {
                        'id': tr.working_day.user.id,
                        'username': tr.working_day.user.username,
                    }
                    reports_data.append(report_data)
                task_data['reports'] = reports_data
                completed_tasks.append(task_data)
        
        # Get all projects in this domain
        domain_projects = Project.objects.filter(domain=domain).prefetch_related('assignees')
        projects = []
        for project in domain_projects:
            project_data = ProjectSerializer(project, context={'request': None}).data
            # Include assignees info
            projects.append(project_data)
        
        # Get all meetings that domain users attended
        meetings = Meeting.objects.filter(
            participants__id__in=domain_user_ids,
            datetime__gte=start_datetime,
            datetime__lte=end_datetime
        ).prefetch_related('participants', 'external_participants', 'created_by').distinct()
        
        meetings_data = MeetingDetailSerializer(meetings, many=True, context={'request': None}).data
        
        # Get working hours schedule for all domain users
        working_days = WorkingDay.objects.filter(
            user__id__in=domain_user_ids,
            check_in__gte=start_datetime,
            check_in__lte=end_datetime
        ).select_related('user').order_by('check_in')
        
        working_hours = []
        for wd in working_days:
            # Get reports for this working day
            day_reports = Report.objects.filter(working_day=wd).select_related('task')
            total_hours = 0
            for report in day_reports:
                if report.start_time and report.end_time:
                    delta = report.end_time - report.start_time
                    total_hours += delta.total_seconds() / 3600
            
            working_hours.append({
                'user': {
                    'id': wd.user.id,
                    'username': wd.user.username,
                    'first_name': wd.user.first_name,
                    'last_name': wd.user.last_name,
                },
                'date': wd.check_in.date().isoformat(),
                'check_in': wd.check_in.isoformat(),
                'check_out': wd.check_out.isoformat() if wd.check_out else None,
                'is_on_leave': wd.is_on_leave,
                'total_hours': round(total_hours, 2),
                'reports_count': day_reports.count(),
            })
        
        # Get all feedbacks from domain users in this period
        feedbacks = Feedback.objects.filter(
            user__id__in=domain_user_ids,
            created_at__gte=start_datetime,
            created_at__lte=end_datetime
        ).select_related('user').order_by('-created_at')
        
        feedbacks_data = FeedbackSerializer(feedbacks, many=True, context={'request': None}).data
        
        # Get admin notes for this period (global and domain-specific)
        notes_query = Q(
            period_type=period_type,
            jalali_year=year,
        )
        
        if period_type == 'daily':
            if month:
                notes_query &= Q(jalali_month=month)
        elif period_type == 'weekly':
            if week:
                notes_query &= Q(jalali_week=week)
        elif period_type == 'monthly':
            if month:
                notes_query &= Q(jalali_month=month)
        
        # Notes are either global (domain=None) or for this domain
        report_notes = ReportNote.objects.filter(
            notes_query & (Q(domain=None) | Q(domain=domain))
        ).select_related('created_by', 'domain').order_by('-created_at')
        
        admin_notes = []
        for note in report_notes:
            admin_notes.append({
                'id': note.id,
                'note': note.note,
                'domain': note.domain.name if note.domain else None,
                'created_by': note.created_by.username,
                'created_at': note.created_at.isoformat(),
            })
        
        return {
            'period': period_info,
            'domain': {
                'id': domain.id,
                'name': domain.name,
            },
            'completed_tasks': completed_tasks,
            'projects': projects,
            'meetings': meetings_data,
            'working_hours': working_hours,
            'feedbacks': feedbacks_data,
            'admin_notes': admin_notes,
        }
