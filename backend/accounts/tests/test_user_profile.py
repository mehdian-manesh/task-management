"""
Comprehensive tests for UserProfile model
"""
import pytest
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
import io

from accounts.models import UserProfile


@pytest.mark.django_db
class TestUserProfileModel:
    """Tests for UserProfile model"""
    
    def test_user_profile_auto_creation(self):
        """Test that UserProfile is automatically created when User is created"""
        user = User.objects.create_user(username='testuser', password='password')
        assert hasattr(user, 'profile')
        assert isinstance(user.profile, UserProfile)
    
    def test_user_profile_one_to_one_relationship(self):
        """Test UserProfile has one-to-one relationship with User"""
        user = User.objects.create_user(username='testuser', password='password')
        profile = user.profile
        
        assert profile.user == user
        assert UserProfile.objects.filter(user=user).exists()
    
    def test_user_profile_str(self):
        """Test UserProfile string representation"""
        user = User.objects.create_user(username='testuser', password='password')
        profile = user.profile
        assert str(profile) == "testuser's Profile"
    
    def test_user_profile_picture_upload_path(self):
        """Test profile picture upload path generation"""
        user = User.objects.create_user(username='testuser', password='password')
        profile = user.profile
        
        # Create a simple image file
        img = Image.new('RGB', (100, 100), color='red')
        img_io = io.BytesIO()
        img.save(img_io, format='JPEG')
        img_io.seek(0)
        
        image_file = SimpleUploadedFile(
            "test_image.jpg",
            img_io.read(),
            content_type="image/jpeg"
        )
        
        profile.profile_picture = image_file
        profile.save()
        
        assert profile.profile_picture is not None
        assert 'profile_pictures' in profile.profile_picture.name
        assert profile.profile_picture.name.endswith('.jpg')
    
    def test_user_profile_delete_picture_on_delete(self):
        """Test that profile picture file is deleted when profile is deleted"""
        import os
        from django.conf import settings
        
        user = User.objects.create_user(username='testuser', password='password')
        profile = user.profile
        
        # Create and save a profile picture
        img = Image.new('RGB', (100, 100), color='red')
        img_io = io.BytesIO()
        img.save(img_io, format='JPEG')
        img_io.seek(0)
        
        image_file = SimpleUploadedFile(
            "test_image.jpg",
            img_io.read(),
            content_type="image/jpeg"
        )
        
        profile.profile_picture = image_file
        profile.save()
        
        picture_path = profile.profile_picture.path
        assert os.path.exists(picture_path)
        
        # Delete profile (should delete picture file)
        profile.delete()
        
        # File should be deleted
        assert not os.path.exists(picture_path)
    
    def test_user_profile_save_signal(self):
        """Test that UserProfile is saved when User is saved"""
        user = User.objects.create_user(username='testuser', password='password')
        profile = user.profile
        
        # Modify user
        user.first_name = 'Updated'
        user.save()
        
        # Profile should still exist
        profile.refresh_from_db()
        assert profile.user == user

