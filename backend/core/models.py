import enum

from django.contrib.auth.models import User
from django.db import models


class StatusChoices(enum.Enum):
    POSTPONE = 'postpone'
    BACKLOG = 'backlog'
    TODO = 'todo'
    DOING = 'doing'
    TEST = 'test'
    DONE = 'done'
    ARCHIVE = 'archive'


class ReportResultChoices(enum.Enum):
    ONGOING = 'ongoing'  # هنوز تمام نشده
    SUCCESS = 'success'  # با موفقیت انجام شد
    POSTPONED = 'postponed'  # به تعویق افتاد
    FAILED = 'failed'  # موفق به انجام آن نشدم
    CANCELLED = 'cancelled'  # کنسل شد


class FeedbackTypeChoices(enum.Enum):
    CRITICISM = 'criticism'  # انتقاد
    SUGGESTION = 'suggestion'  # پیشنهاد
    QUESTION = 'question'  # سوال


class MeetingTypeChoices(enum.Enum):
    IN_PERSON = 'in_person'  # حضوری
    ONLINE = 'online'  # آنلاین


class RecurrenceTypeChoices(enum.Enum):
    NONE = 'none'  # بدون تکرار
    DAILY = 'daily'  # روزانه
    WEEKLY = 'weekly'  # هفتگی
    MONTHLY = 'monthly'  # ماهانه
    YEARLY = 'yearly'  # سالانه


class Domain(models.Model):
    """
    Organizational structure domain using materialized path method for performance.
    Path format: /1/2/3/ where numbers are domain IDs.
    """
    name = models.CharField(max_length=255)
    path = models.CharField(max_length=1000, db_index=True)  # Materialized path
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['path']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        """Auto-generate path based on parent"""
        # Store old parent to detect moves
        old_parent = None
        if self.pk:
            try:
                old_instance = Domain.objects.get(pk=self.pk)
                old_parent = old_instance.parent
            except Domain.DoesNotExist:
                pass
        
        # Calculate new path - must happen before super().save() for new instances
        # For existing instances, we need to save first to get the ID, then update path
        is_new = self.pk is None
        
        if self.parent:
            # Ensure parent is saved first
            if not self.parent.pk:
                self.parent.save()
            new_path = f"{self.parent.path}{self.parent.id}/"
        else:
            new_path = "/"
        
        # For new instances, set path before saving
        if is_new:
            self.path = new_path
        
        super().save(*args, **kwargs)
        
        # For existing instances, update path if parent changed
        if not is_new:
            if old_parent != self.parent:
                self.path = new_path
                super().save(update_fields=['path'], *args, **kwargs)
        
        # Update children paths if parent changed or this is a new domain
        if is_new or (old_parent != self.parent):
            self._update_children_paths()

    def _update_children_paths(self):
        """Recursively update paths of all children"""
        for child in self.children.all():
            child.path = f"{self.path}{self.id}/"
            child.save(update_fields=['path'])
            child._update_children_paths()

    def get_ancestors(self):
        """Get all ancestor domains"""
        if not self.parent:
            return Domain.objects.none()
        # Extract IDs from path: /1/2/3/ -> [1, 2, 3]
        path_ids = [int(id) for id in self.path.strip('/').split('/') if id]
        return Domain.objects.filter(id__in=path_ids)

    def get_descendants(self):
        """Get all descendant domains (including self)"""
        return Domain.objects.filter(path__startswith=f"{self.path}{self.id}/")

    def get_all_descendant_ids(self):
        """Get all descendant domain IDs including self"""
        descendants = self.get_descendants()
        return list(descendants.values_list('id', flat=True)) + [self.id]

    def is_ancestor_of(self, other):
        """Check if this domain is an ancestor of another domain"""
        return other.path.startswith(f"{self.path}{self.id}/")

    def is_descendant_of(self, other):
        """Check if this domain is a descendant of another domain"""
        return self.path.startswith(f"{other.path}{other.id}/")


class Project(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=7, blank=True)  # e.g., hex code
    domain = models.ForeignKey(Domain, on_delete=models.PROTECT, related_name='projects', null=True, blank=True)
    assignees = models.ManyToManyField(User, related_name='assigned_projects', blank=True)
    start_date = models.DateField(null=True, blank=True)
    deadline = models.DateField(null=True, blank=True)
    estimated_hours = models.IntegerField(default=0)
    status = models.CharField(
        max_length=20,
        choices=[(status.value, status.name.capitalize()) for status in StatusChoices],
        default=StatusChoices.BACKLOG.value
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Task(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=7, blank=True)  # e.g., hex code
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    domain = models.ForeignKey(Domain, on_delete=models.PROTECT, related_name='tasks', null=True, blank=True)
    assignees = models.ManyToManyField(User, related_name='assigned_tasks', blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_tasks', null=True, blank=True)
    start_date = models.DateField(null=True, blank=True)
    deadline = models.DateField(null=True, blank=True)
    estimated_hours = models.PositiveIntegerField(default=0)
    phase = models.PositiveSmallIntegerField(default=0)  # Integer field for project phase
    is_draft = models.BooleanField(default=True)  # To distinguish draft from approved
    status = models.CharField(
        max_length=20,
        choices=[(status.value, status.name.capitalize()) for status in StatusChoices],
        default=StatusChoices.BACKLOG.value
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        """Auto-assign domain from project if not set"""
        if not self.domain and self.project and self.project.domain:
            self.domain = self.project.domain
        super().save(*args, **kwargs)


class WorkingDay(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='working_days')
    check_in = models.DateTimeField(auto_now_add=True)  # Automatically set on creation (check-in)
    check_out = models.DateTimeField(null=True, blank=True)  # Set manually on check-out
    is_on_leave = models.BooleanField(default=False)  # Mark if user is on leave


class Report(models.Model):
    working_day = models.ForeignKey(WorkingDay, on_delete=models.CASCADE, related_name='reports')
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='reports')
    result = models.CharField(
        max_length=20,
        choices=[(result.value, result.name.capitalize()) for result in ReportResultChoices],
        default=ReportResultChoices.ONGOING.value
    )
    comment = models.TextField(max_length=1000, blank=True)  # Optional, up to 1000 characters
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)


class Feedback(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='feedbacks')
    description = models.TextField()  # Mandatory explanation text
    type = models.CharField(
        max_length=20,
        choices=[(ftype.value, ftype.name.capitalize()) for ftype in FeedbackTypeChoices],
        null=True,
        blank=True
    )  # Optional
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Meeting(models.Model):
    """
    Meeting entity - only admins can create meetings.
    Participants can be app users or external participants (non-app users).
    Compatible with Google Calendar for future sync.
    """
    datetime = models.DateTimeField()  # Required: date and time of the meeting (Gregorian calendar)
    type = models.CharField(
        max_length=20,
        choices=[(mtype.value, mtype.name.replace('_', ' ').title()) for mtype in MeetingTypeChoices],
        default=MeetingTypeChoices.IN_PERSON.value
    )  # Required: in-person or online
    topic = models.CharField(max_length=255)  # Required: meeting topic
    location = models.CharField(max_length=500, blank=True)  # Venue if in-person, URL if online
    summary = models.TextField(blank=True)  # Meeting summary
    
    # Recurrence fields (all based on Gregorian calendar)
    recurrence_type = models.CharField(
        max_length=20,
        choices=[(rtype.value, rtype.name.capitalize()) for rtype in RecurrenceTypeChoices],
        default=RecurrenceTypeChoices.NONE.value
    )
    recurrence_end_date = models.DateTimeField(null=True, blank=True)  # End date for recurrence
    recurrence_count = models.PositiveIntegerField(null=True, blank=True)  # Number of occurrences (alternative to end_date)
    recurrence_interval = models.PositiveIntegerField(default=1)  # Interval (e.g., every 2 weeks)
    
    # Google Calendar compatibility fields
    google_calendar_event_id = models.CharField(max_length=255, blank=True, null=True)  # Google Calendar event ID
    google_calendar_synced = models.BooleanField(default=False)  # Whether synced with Google Calendar
    google_calendar_sync_token = models.CharField(max_length=255, blank=True, null=True)  # For incremental sync
    
    participants = models.ManyToManyField(User, related_name='meetings', blank=True)  # App user participants
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_meetings')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['datetime']  # Order by datetime ascending for future meetings

    def __str__(self):
        return f"{self.topic} - {self.datetime}"
    
    def is_future(self):
        """Check if meeting is in the future"""
        from django.utils import timezone
        return self.datetime > timezone.now()
    
    def is_past_or_present(self):
        """Check if meeting is in the past or present (log)"""
        from django.utils import timezone
        return self.datetime <= timezone.now()
    
    def get_next_occurrences(self, count=3):
        """
        Get next occurrences of this meeting based on recurrence rules.
        Returns list of datetime objects (all in the future).
        All dates are based on Gregorian calendar.
        """
        from django.utils import timezone
        from datetime import timedelta
        from dateutil.relativedelta import relativedelta
        
        occurrences = []
        current = self.datetime
        now = timezone.now()
        
        # If meeting is in the past and no recurrence, return empty
        if current <= now and self.recurrence_type == RecurrenceTypeChoices.NONE.value:
            return []
        
        # If meeting is in the future and no recurrence, return just this one
        if current > now and self.recurrence_type == RecurrenceTypeChoices.NONE.value:
            return [current]
        
        # If meeting is in the past but has recurrence, find the next occurrence
        if current <= now and self.recurrence_type != RecurrenceTypeChoices.NONE.value:
            # Calculate how many intervals have passed
            while current <= now:
                if self.recurrence_type == RecurrenceTypeChoices.DAILY.value:
                    current = current + timedelta(days=self.recurrence_interval)
                elif self.recurrence_type == RecurrenceTypeChoices.WEEKLY.value:
                    current = current + timedelta(weeks=self.recurrence_interval)
                elif self.recurrence_type == RecurrenceTypeChoices.MONTHLY.value:
                    current = current + relativedelta(months=self.recurrence_interval)
                elif self.recurrence_type == RecurrenceTypeChoices.YEARLY.value:
                    current = current + relativedelta(years=self.recurrence_interval)
                else:
                    return []  # Unknown recurrence type
                
                # Check if we've exceeded end date
                if self.recurrence_end_date and current > self.recurrence_end_date:
                    return []
        
        # Calculate next occurrences based on recurrence
        iteration = 0
        max_iterations = 1000  # Safety limit
        
        while len(occurrences) < count and iteration < max_iterations:
            if current > now:  # Only add future occurrences
                occurrences.append(current)
            
            # Calculate next occurrence
            if self.recurrence_type == RecurrenceTypeChoices.DAILY.value:
                current = current + timedelta(days=self.recurrence_interval)
            elif self.recurrence_type == RecurrenceTypeChoices.WEEKLY.value:
                current = current + timedelta(weeks=self.recurrence_interval)
            elif self.recurrence_type == RecurrenceTypeChoices.MONTHLY.value:
                current = current + relativedelta(months=self.recurrence_interval)
            elif self.recurrence_type == RecurrenceTypeChoices.YEARLY.value:
                current = current + relativedelta(years=self.recurrence_interval)
            else:
                break  # No recurrence
            
            # Check if we've exceeded end date or count
            if self.recurrence_end_date and current > self.recurrence_end_date:
                break
            if self.recurrence_count:
                # Count total occurrences from original datetime
                total_occurrences = 1  # Original meeting
                temp_current = self.datetime
                while temp_current < current:
                    total_occurrences += 1
                    if self.recurrence_type == RecurrenceTypeChoices.DAILY.value:
                        temp_current = temp_current + timedelta(days=self.recurrence_interval)
                    elif self.recurrence_type == RecurrenceTypeChoices.WEEKLY.value:
                        temp_current = temp_current + timedelta(weeks=self.recurrence_interval)
                    elif self.recurrence_type == RecurrenceTypeChoices.MONTHLY.value:
                        temp_current = temp_current + relativedelta(months=self.recurrence_interval)
                    elif self.recurrence_type == RecurrenceTypeChoices.YEARLY.value:
                        temp_current = temp_current + relativedelta(years=self.recurrence_interval)
                    if total_occurrences >= self.recurrence_count:
                        break
                if total_occurrences >= self.recurrence_count:
                    break
            
            iteration += 1
        
        return occurrences[:count]


class MeetingExternalParticipant(models.Model):
    """
    External participants (non-app users) for meetings.
    """
    meeting = models.ForeignKey(Meeting, on_delete=models.CASCADE, related_name='external_participants')
    name = models.CharField(max_length=255)  # Name of the external participant

    class Meta:
        unique_together = ['meeting', 'name']

    def __str__(self):
        return f"{self.name} - {self.meeting.topic}"


class ReportNote(models.Model):
    """Admin notes for specific time periods"""
    PERIOD_TYPE_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('yearly', 'Yearly'),
    ]
    
    period_type = models.CharField(max_length=20, choices=PERIOD_TYPE_CHOICES)
    jalali_year = models.IntegerField()
    jalali_month = models.IntegerField(null=True, blank=True)  # For monthly/yearly
    jalali_day = models.IntegerField(null=True, blank=True)  # For daily
    jalali_week = models.IntegerField(null=True, blank=True)  # For weekly (week number in year)
    domain = models.ForeignKey(Domain, on_delete=models.CASCADE, null=True, blank=True, related_name='report_notes')  # None = global note
    note = models.TextField()
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_report_notes')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        period_str = f"{self.jalali_year}"
        if self.period_type == 'daily' and self.jalali_day:
            period_str += f"/{self.jalali_month}/{self.jalali_day}"
        elif self.period_type == 'weekly' and self.jalali_week:
            period_str += f" week {self.jalali_week}"
        elif self.period_type == 'monthly' and self.jalali_month:
            period_str += f"/{self.jalali_month}"
        return f"{self.period_type} note for {period_str}"


class SavedReport(models.Model):
    """Static snapshot of reports - immutable after creation"""
    REPORT_TYPE_CHOICES = [
        ('individual', 'Individual'),
        ('team', 'Team'),
    ]
    
    PERIOD_TYPE_CHOICES = [
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('yearly', 'Yearly'),
    ]
    
    report_type = models.CharField(max_length=20, choices=REPORT_TYPE_CHOICES)
    period_type = models.CharField(max_length=20, choices=PERIOD_TYPE_CHOICES)
    jalali_year = models.IntegerField()
    jalali_month = models.IntegerField(null=True, blank=True)
    jalali_week = models.IntegerField(null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='saved_reports')  # For individual reports
    domain = models.ForeignKey(Domain, on_delete=models.CASCADE, null=True, blank=True, related_name='saved_reports')  # For team reports
    report_data = models.JSONField()  # Static snapshot of all report data
    pdf_file = models.FileField(upload_to='reports/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = [
            ['report_type', 'period_type', 'jalali_year', 'jalali_month', 'jalali_week', 'user', 'domain']
        ]

    def __str__(self):
        period_str = f"{self.jalali_year}"
        if self.period_type == 'weekly' and self.jalali_week:
            period_str += f" week {self.jalali_week}"
        elif self.period_type == 'monthly' and self.jalali_month:
            period_str += f"/{self.jalali_month}"
        report_target = self.user.username if self.user else (self.domain.name if self.domain else "Global")
        return f"{self.report_type} {self.period_type} report for {report_target} - {period_str}"
