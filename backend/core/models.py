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
