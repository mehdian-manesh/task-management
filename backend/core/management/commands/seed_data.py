"""
Management command to seed the database with test data for report functionality.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta, date, datetime
import random
import jdatetime

from core.models import (
    Domain, Project, Task, WorkingDay, Report, Feedback, Meeting,
    ReportNote, SavedReport, StatusChoices, ReportResultChoices, FeedbackTypeChoices,
    MeetingTypeChoices, RecurrenceTypeChoices
)
from accounts.models import UserProfile
from core.jalali_utils import gregorian_to_jalali, jalali_to_gregorian


class Command(BaseCommand):
    help = 'Seed the database with test data for report functionality'

    def add_arguments(self, parser):
        parser.add_argument(
            '--flush',
            action='store_true',
            help='Flush the database before seeding',
        )

    def handle(self, *args, **options):
        if options['flush']:
            self.stdout.write(self.style.WARNING('Flushing database...'))
            # Delete in reverse dependency order
            ReportNote.objects.all().delete()
            SavedReport.objects.all().delete()
            Report.objects.all().delete()
            WorkingDay.objects.all().delete()
            Feedback.objects.all().delete()
            Meeting.objects.all().delete()
            Task.objects.all().delete()
            Project.objects.all().delete()
            UserProfile.objects.all().delete()
            # Delete all users (including superusers) - they will be recreated
            User.objects.all().delete()
            Domain.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Database flushed.'))

        self.stdout.write(self.style.SUCCESS('Starting to seed data...'))

        # Create domains
        domains = self.create_domains()
        self.stdout.write(self.style.SUCCESS(f'Created {len(domains)} domains.'))

        # Create users
        users = self.create_users(domains)
        self.stdout.write(self.style.SUCCESS(f'Created {len(users)} users.'))

        # Create projects
        projects = self.create_projects(domains, users)
        self.stdout.write(self.style.SUCCESS(f'Created {len(projects)} projects.'))

        # Create tasks
        tasks = self.create_tasks(projects, users, domains)
        self.stdout.write(self.style.SUCCESS(f'Created {len(tasks)} tasks.'))

        # Create working days and reports
        working_days, reports = self.create_working_days_and_reports(users, tasks)
        self.stdout.write(self.style.SUCCESS(f'Created {len(working_days)} working days and {len(reports)} reports.'))

        # Create meetings
        meetings = self.create_meetings(users)
        self.stdout.write(self.style.SUCCESS(f'Created {len(meetings)} meetings.'))

        # Create feedbacks
        feedbacks = self.create_feedbacks(users)
        self.stdout.write(self.style.SUCCESS(f'Created {len(feedbacks)} feedbacks.'))

        # Create report notes
        report_notes = self.create_report_notes(users, domains)
        self.stdout.write(self.style.SUCCESS(f'Created {len(report_notes)} report notes.'))

        self.stdout.write(self.style.SUCCESS('Data seeding completed successfully!'))

    def create_domains(self):
        """Create organizational domains"""
        domains = []
        
        # Root domains
        tech = Domain.objects.create(name='فناوری اطلاعات')
        domains.append(tech)
        
        marketing = Domain.objects.create(name='بازاریابی')
        domains.append(marketing)
        
        finance = Domain.objects.create(name='مالی')
        domains.append(finance)
        
        # Child domains
        dev_team = Domain.objects.create(name='تیم توسعه', parent=tech)
        domains.append(dev_team)
        
        qa_team = Domain.objects.create(name='تیم تست', parent=tech)
        domains.append(qa_team)
        
        digital_marketing = Domain.objects.create(name='بازاریابی دیجیتال', parent=marketing)
        domains.append(digital_marketing)
        
        return domains

    def create_users(self, domains):
        """Create users with profiles"""
        users = []
        
        # Admin user (use get_or_create to handle case where it already exists)
        admin, _ = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@example.com',
                'first_name': 'مدیر',
                'last_name': 'سیستم',
                'is_superuser': True,
                'is_staff': True
            }
        )
        admin.set_password('admin123')
        admin.save()
        admin.profile.domain = domains[0]  # Tech domain
        admin.profile.save()
        users.append(admin)
        
        # Regular users
        user_data = [
            ('ali', 'علی', 'احمدی', domains[3]),  # dev_team
            ('sara', 'سارا', 'محمدی', domains[3]),  # dev_team
            ('reza', 'رضا', 'کریمی', domains[4]),  # qa_team
            ('maryam', 'مریم', 'حسینی', domains[5]),  # digital_marketing
            ('hossein', 'حسین', 'رستمی', domains[2]),  # finance
        ]
        
        for username, first_name, last_name, domain in user_data:
            user, _ = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': f'{username}@example.com',
                    'first_name': first_name,
                    'last_name': last_name
                }
            )
            user.set_password('test123')
            user.save()
            user.profile.domain = domain
            user.profile.save()
            users.append(user)
        
        return users

    def create_projects(self, domains, users):
        """Create projects"""
        projects = []
        
        project_data = [
            ('پروژه وب سایت', 'توسعه وب سایت جدید', '#FF5733', domains[0], [users[1], users[2]], 'doing'),
            ('اپلیکیشن موبایل', 'اپلیکیشن اندروید و iOS', '#33FF57', domains[3], [users[1], users[2]], 'todo'),
            ('بازاریابی دیجیتال', 'کمپین بازاریابی', '#3357FF', domains[5], [users[4]], 'doing'),
            ('سیستم حسابداری', 'بهبود سیستم مالی', '#FF33F5', domains[2], [users[5]], 'backlog'),
        ]
        
        today = date.today()
        for name, desc, color, domain, assignees, status in project_data:
            project = Project.objects.create(
                name=name,
                description=desc,
                color=color,
                domain=domain,
                start_date=today - timedelta(days=random.randint(10, 60)),
                deadline=today + timedelta(days=random.randint(30, 120)),
                estimated_hours=random.randint(100, 500),
                status=status
            )
            project.assignees.set(assignees)
            projects.append(project)
        
        return projects

    def create_tasks(self, projects, users, domains):
        """Create tasks (both draft and approved)"""
        tasks = []
        
        # Approved tasks (assigned to projects)
        task_data = [
            ('طراحی UI/UX', 'طراحی رابط کاربری', projects[0], users[1], 'doing', False),
            ('پیاده‌سازی Backend', 'توسعه API', projects[0], users[1], 'doing', False),
            ('تست واحد', 'نوشتن تست‌های واحد', projects[1], users[2], 'todo', False),
            ('کمپین تبلیغاتی', 'طراحی کمپین', projects[2], users[4], 'doing', False),
            ('بهینه‌سازی دیتابیس', 'بهینه‌سازی کوئری‌ها', projects[0], users[2], 'test', False),
        ]
        
        for name, desc, project, assignee, status, is_draft in task_data:
            task = Task.objects.create(
                name=name,
                description=desc,
                project=project,
                domain=project.domain,
                created_by=assignee,
                start_date=date.today() - timedelta(days=random.randint(1, 30)),
                deadline=date.today() + timedelta(days=random.randint(5, 60)),
                estimated_hours=random.randint(8, 40),
                phase=random.randint(1, 5),
                is_draft=is_draft,
                status=status
            )
            task.assignees.set([assignee])
            tasks.append(task)
        
        # Draft tasks (created by users)
        draft_tasks = [
            ('بهبود عملکرد', 'بهینه‌سازی کد', None, users[1], 'todo', True),
            ('مستندسازی', 'نوشتن مستندات', None, users[2], 'backlog', True),
        ]
        
        for name, desc, project, assignee, status, is_draft in draft_tasks:
            task = Task.objects.create(
                name=name,
                description=desc,
                project=project,
                domain=assignee.profile.domain if assignee.profile.domain else None,
                created_by=assignee,
                status=status,
                is_draft=is_draft
            )
            task.assignees.set([assignee])
            tasks.append(task)
        
        return tasks

    def create_working_days_and_reports(self, users, tasks):
        """Create working days and reports with dates in current Jalali period"""
        working_days = []
        reports = []
        
        now = timezone.now()
        # Get current Jalali date
        jalali_now = gregorian_to_jalali(now.date())
        
        # Create working days for the last 2 weeks and current week
        for user in users[1:]:  # Skip admin
            # Create working days for last 14 days (some weekdays)
            for day_offset in range(-14, 1):
                # Skip some days randomly (not all users work every day)
                if random.random() < 0.6:  # 60% chance of working day
                    check_in_time = now + timedelta(days=day_offset, hours=random.randint(7, 9))
                    check_out_time = check_in_time + timedelta(hours=random.randint(6, 9))
                    
                    # Skip weekends (optional, can remove)
                    if check_in_time.weekday() < 5:  # Monday to Friday
                        working_day = WorkingDay.objects.create(
                            user=user,
                            check_in=check_in_time,
                            check_out=check_out_time,
                            is_on_leave=random.random() < 0.1  # 10% chance of leave
                        )
                        working_days.append(working_day)
                        
                        # Create 1-3 reports per working day
                        num_reports = random.randint(1, 3)
                        user_tasks = [t for t in tasks if user in t.assignees.all() or (t.created_by == user)]
                        
                        if user_tasks:
                            selected_tasks = random.sample(user_tasks, min(num_reports, len(user_tasks)))
                            
                            for task in selected_tasks:
                                # Create time slots within working day
                                report_start = check_in_time + timedelta(
                                    hours=random.randint(0, 4),
                                    minutes=random.randint(0, 59)
                                )
                                report_end = report_start + timedelta(
                                    hours=random.randint(1, 4),
                                    minutes=random.randint(0, 59)
                                )
                                
                                # Ensure report_end is within working day
                                if report_end > check_out_time:
                                    report_end = check_out_time
                                
                                # Ensure report_end is after report_start
                                if report_end <= report_start:
                                    report_end = report_start + timedelta(hours=1)
                                
                                result = random.choice([
                                    ReportResultChoices.SUCCESS.value,
                                    ReportResultChoices.ONGOING.value,
                                    ReportResultChoices.POSTPONED.value,
                                ])
                                
                                report = Report.objects.create(
                                    working_day=working_day,
                                    task=task,
                                    result=result,
                                    comment=random.choice([
                                        'پیشرفت خوب بود',
                                        'مشکلاتی پیش آمد',
                                        'نیاز به بررسی بیشتر',
                                        'کامل شد',
                                        ''
                                    ]),
                                    start_time=report_start,
                                    end_time=report_end
                                )
                                reports.append(report)
        
        return working_days, reports

    def create_meetings(self, users):
        """Create meetings"""
        meetings = []
        admin = users[0]
        
        now = timezone.now()
        
        # Past meetings (logs)
        for i in range(3):
            meeting = Meeting.objects.create(
                datetime=now - timedelta(days=random.randint(1, 10), hours=random.randint(0, 5)),
                type=random.choice([MeetingTypeChoices.IN_PERSON.value, MeetingTypeChoices.ONLINE.value]),
                topic=f'جلسه هفتگی - هفته {i+1}',
                location=random.choice(['اتاق کنفرانس', 'Zoom', 'Google Meet', '']),
                summary=random.choice(['بررسی پیشرفت پروژه‌ها', 'برنامه‌ریزی هفته آینده', '']),
                recurrence_type=RecurrenceTypeChoices.NONE.value,
                created_by=admin
            )
            # Add some participants
            participants = random.sample(users[1:], random.randint(2, len(users)-1))
            meeting.participants.set(participants)
            meetings.append(meeting)
        
        # Future meetings (scheduled)
        for i in range(2):
            meeting = Meeting.objects.create(
                datetime=now + timedelta(days=random.randint(1, 7), hours=random.randint(9, 17)),
                type=random.choice([MeetingTypeChoices.IN_PERSON.value, MeetingTypeChoices.ONLINE.value]),
                topic=f'جلسه آینده - {i+1}',
                location=random.choice(['اتاق کنفرانس', 'Zoom', '']),
                recurrence_type=random.choice([
                    RecurrenceTypeChoices.NONE.value,
                    RecurrenceTypeChoices.WEEKLY.value,
                ]),
                recurrence_interval=1,
                created_by=admin
            )
            participants = random.sample(users[1:], random.randint(2, len(users)-1))
            meeting.participants.set(participants)
            meetings.append(meeting)
        
        return meetings

    def create_feedbacks(self, users):
        """Create feedbacks"""
        feedbacks = []
        
        feedback_data = [
            ('پیشنهاد بهبود رابط کاربری', FeedbackTypeChoices.SUGGESTION.value),
            ('سوال درباره API جدید', FeedbackTypeChoices.QUESTION.value),
            ('انتقاد از عملکرد سیستم', FeedbackTypeChoices.CRITICISM.value),
            ('پیشنهاد استفاده از تکنولوژی جدید', FeedbackTypeChoices.SUGGESTION.value),
        ]
        
        now = timezone.now()
        for desc, ftype in feedback_data:
            user = random.choice(users[1:])
            feedback = Feedback.objects.create(
                user=user,
                description=desc,
                type=ftype
            )
            # Set created_at to various dates
            feedback.created_at = now - timedelta(days=random.randint(1, 30))
            feedback.save()
            feedbacks.append(feedback)
        
        return feedbacks

    def create_report_notes(self, users, domains):
        """Create report notes for admin"""
        report_notes = []
        admin = users[0]
        now = timezone.now()
        jalali_now = gregorian_to_jalali(now.date())
        
        # Create notes for current week
        note = ReportNote.objects.create(
            period_type='weekly',
            jalali_year=jalali_now['year'],
            jalali_week=self._get_current_jalali_week(jalali_now['year'], jalali_now['month'], jalali_now['day']),
            note='یادداشت هفتگی: پیشرفت خوبی در پروژه‌ها داشتیم',
            domain=None,  # Global note
            created_by=admin
        )
        report_notes.append(note)
        
        # Create domain-specific note
        if domains:
            note = ReportNote.objects.create(
                period_type='weekly',
                jalali_year=jalali_now['year'],
                jalali_week=self._get_current_jalali_week(jalali_now['year'], jalali_now['month'], jalali_now['day']),
                note='یادداشت تیم توسعه: نیاز به تمرکز بیشتر',
                domain=domains[3],  # dev_team
                created_by=admin
            )
            report_notes.append(note)
        
        return report_notes

    def _get_current_jalali_week(self, year, month, day):
        """Helper to get current Jalali week number"""
        from core.jalali_utils import get_jalali_week_number
        return get_jalali_week_number(year, month, day)

