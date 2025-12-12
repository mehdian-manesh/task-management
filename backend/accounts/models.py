from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
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
    """Extended user profile with profile picture"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    profile_picture = models.ImageField(
        upload_to=profile_picture_upload_path,
        null=True,
        blank=True,
        max_length=255
    )
    
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
