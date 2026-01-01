from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
import os
import uuid


def profile_picture_upload_path(instance, filename):
    """Generate a secure upload path for profile pictures"""
    # Sanitize filename and add UUID to prevent collisions
    ext = os.path.splitext(filename)[1].lower()
    # Only allow image extensions
    if ext not in ['.jpg', '.jpeg', '.png']:
        ext = '.jpg'
    filename = f"{uuid.uuid4().hex}{ext}"
    return os.path.join('profile_pictures', filename)


class UserProfile(models.Model):
    """Extended user profile with profile picture and domain"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    profile_picture = models.ImageField(
        upload_to=profile_picture_upload_path,
        null=True,
        blank=True,
        max_length=255
    )
    domain = models.ForeignKey('core.Domain', on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    
    def __str__(self):
        return f"{self.user.username}'s Profile"
    
    def delete(self, *args, **kwargs):
        """Delete the profile picture file when profile is deleted"""
        if self.profile_picture:
            if os.path.isfile(self.profile_picture.path):
                os.remove(self.profile_picture.path)
        super().delete(*args, **kwargs)


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Automatically create a UserProfile when a User is created"""
    if created:
        UserProfile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Automatically save the UserProfile when User is saved"""
    if hasattr(instance, 'profile'):
        instance.profile.save()


class UserSession(models.Model):
    """Track active user sessions with device and browser information"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    token_jti = models.CharField(max_length=255, db_index=True)  # JWT token ID
    refresh_token_jti = models.CharField(max_length=255, null=True, blank=True)  # Refresh token ID
    ip_address = models.GenericIPAddressField()  # Real IP address
    user_agent = models.TextField()  # Raw User-Agent string
    browser_name = models.CharField(max_length=100)  # Parsed browser name
    browser_version = models.CharField(max_length=50, null=True, blank=True)  # Browser version
    device_type = models.CharField(max_length=50)  # mobile/desktop/tablet
    device_name = models.CharField(max_length=200, null=True, blank=True)  # Device name/model
    os_name = models.CharField(max_length=100)  # Operating system
    os_version = models.CharField(max_length=50, null=True, blank=True)  # OS version
    screen_width = models.IntegerField(null=True, blank=True)  # Screen width
    screen_height = models.IntegerField(null=True, blank=True)  # Screen height
    login_date = models.DateTimeField(auto_now_add=True)  # When session started
    last_activity = models.DateTimeField(auto_now=True)  # Last activity timestamp
    is_active = models.BooleanField(default=True)  # Session status
    
    class Meta:
        ordering = ['-login_date']
        indexes = [
            models.Index(fields=['user', '-login_date']),
            models.Index(fields=['token_jti']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.browser_name} on {self.os_name} ({self.ip_address})"
