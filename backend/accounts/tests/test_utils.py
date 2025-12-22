"""
Tests for accounts utilities (image processing)
"""
import pytest
from io import BytesIO
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile, InMemoryUploadedFile
from django.core.exceptions import ValidationError

from accounts.utils import (
    sanitize_filename,
    validate_image_file,
    sanitize_image,
    process_profile_picture,
    MAX_FILE_SIZE,
    MAX_WIDTH,
    MAX_HEIGHT,
)


class TestSanitizeFilename:
    """Tests for filename sanitization"""
    
    def test_sanitize_simple_filename(self):
        """Test sanitizing a simple filename"""
        assert sanitize_filename("test.jpg") == "test.jpg"
        assert sanitize_filename("my-image.png") == "my-image.png"
        assert sanitize_filename("file_123.jpeg") == "file_123.jpeg"
    
    def test_sanitize_removes_path_components(self):
        """Test that path traversal attempts are removed"""
        assert sanitize_filename("../../../etc/passwd.jpg") == "passwd.jpg"
        assert sanitize_filename("/absolute/path/image.png") == "image.png"
        # os.path.basename handles both / and \ separators
        # The sanitization removes non-alphanumeric except dots, hyphens, underscores
        result = sanitize_filename("dir\\subdir\\file.jpg")
        # On Windows, basename might preserve backslashes, but regex removes them
        assert result.endswith(".jpg")
        assert "file" in result.lower()
    
    def test_sanitize_removes_special_chars(self):
        """Test that special characters are removed"""
        assert sanitize_filename("file!@#$%image.jpg") == "fileimage.jpg"
        assert sanitize_filename("test file.png") == "testfile.png"
        assert sanitize_filename("my-image(1).jpeg") == "my-image1.jpeg"
    
    def test_sanitize_long_filename(self):
        """Test that very long filenames are truncated"""
        long_name = "a" * 300 + ".jpg"
        result = sanitize_filename(long_name)
        assert len(result) <= 255
        assert result.endswith(".jpg")
    
    def test_sanitize_preserves_valid_chars(self):
        """Test that valid characters are preserved"""
        assert sanitize_filename("file_name-123.test.jpg") == "file_name-123.test.jpg"


class TestValidateImageFile:
    """Tests for image file validation"""
    
    def create_test_image(self, format='JPEG', size=(50, 50)):
        """Helper to create a test image"""
        img = Image.new('RGB', size, color='red')
        output = BytesIO()
        img.save(output, format=format)
        output.seek(0)
        return output
    
    def test_validate_valid_jpeg(self):
        """Test validation of valid JPEG file"""
        img_data = self.create_test_image('JPEG')
        file = SimpleUploadedFile("test.jpg", img_data.read(), content_type="image/jpeg")
        image, error = validate_image_file(file)
        assert image is not None
        assert error is None
        assert image.format == 'JPEG'
    
    def test_validate_valid_png(self):
        """Test validation of valid PNG file"""
        img_data = self.create_test_image('PNG')
        file = SimpleUploadedFile("test.png", img_data.read(), content_type="image/png")
        image, error = validate_image_file(file)
        assert image is not None
        assert error is None
        assert image.format == 'PNG'
    
    def test_validate_file_too_large(self):
        """Test validation fails for files exceeding size limit"""
        # Create a file larger than MAX_FILE_SIZE
        large_data = b'x' * (MAX_FILE_SIZE + 1000)
        file = SimpleUploadedFile("large.jpg", large_data, content_type="image/jpeg")
        image, error = validate_image_file(file)
        assert image is None
        assert error is not None
        assert "exceeds maximum" in error.lower()
    
    def test_validate_invalid_mime_type(self):
        """Test validation fails for invalid MIME types"""
        img_data = self.create_test_image('JPEG')
        file = SimpleUploadedFile("test.gif", img_data.read(), content_type="image/gif")
        image, error = validate_image_file(file)
        assert image is None
        assert error is not None
        assert "invalid file type" in error.lower()
    
    def test_validate_invalid_extension(self):
        """Test validation fails for invalid file extensions"""
        img_data = self.create_test_image('JPEG')
        file = SimpleUploadedFile("test.bmp", img_data.read(), content_type="image/jpeg")
        image, error = validate_image_file(file)
        assert image is None
        assert error is not None
        assert "invalid file extension" in error.lower()
    
    def test_validate_corrupted_file(self):
        """Test validation fails for corrupted image files"""
        corrupted_data = b'This is not an image file'
        file = SimpleUploadedFile("test.jpg", corrupted_data, content_type="image/jpeg")
        image, error = validate_image_file(file)
        assert image is None
        assert error is not None


class TestSanitizeImage:
    """Tests for image sanitization"""
    
    def create_test_image(self, mode='RGB', size=(200, 200)):
        """Helper to create a test image"""
        if mode == 'RGBA':
            img = Image.new('RGBA', size, color=(255, 0, 0, 128))
        elif mode == 'LA':
            img = Image.new('LA', size, color=(128, 255))
        elif mode == 'P':
            img = Image.new('P', size)
        else:
            img = Image.new(mode, size, color='red')
        return img
    
    def test_sanitize_rgb_image(self):
        """Test sanitizing RGB image (no conversion needed)"""
        img = self.create_test_image('RGB', (50, 50))
        result = sanitize_image(img)
        assert result.mode == 'RGB'
        assert result.size == (50, 50)
    
    def test_sanitize_rgba_image(self):
        """Test sanitizing RGBA image converts to RGB"""
        img = self.create_test_image('RGBA', (50, 50))
        result = sanitize_image(img)
        assert result.mode == 'RGB'
    
    def test_sanitize_large_image_resizes(self):
        """Test that large images are resized"""
        img = self.create_test_image('RGB', (500, 300))  # Larger than MAX_WIDTH
        result = sanitize_image(img)
        assert result.width <= MAX_WIDTH
        assert result.height <= MAX_HEIGHT
        # Check aspect ratio is maintained
        original_ratio = 500 / 300
        new_ratio = result.width / result.height
        assert abs(original_ratio - new_ratio) < 0.01
    
    def test_sanitize_small_image_no_resize(self):
        """Test that small images are not resized"""
        img = self.create_test_image('RGB', (50, 50))
        result = sanitize_image(img)
        assert result.size == (50, 50)
    
    def test_sanitize_maintains_aspect_ratio(self):
        """Test that aspect ratio is maintained during resize"""
        img = self.create_test_image('RGB', (200, 100))  # 2:1 ratio
        result = sanitize_image(img)
        assert result.width / result.height == pytest.approx(2.0, rel=0.1)


class TestProcessProfilePicture:
    """Tests for complete profile picture processing pipeline"""
    
    def create_test_image_file(self, format='JPEG', size=(50, 50)):
        """Helper to create a test image file"""
        img = Image.new('RGB', size, color='blue')
        output = BytesIO()
        img.save(output, format=format)
        output.seek(0)
        if format == 'JPEG':
            content_type = 'image/jpeg'
            filename = 'test.jpg'
        else:
            content_type = 'image/png'
            filename = 'test.png'
        return SimpleUploadedFile(filename, output.read(), content_type=content_type)
    
    @pytest.mark.django_db
    def test_process_valid_jpeg(self):
        """Test processing a valid JPEG file"""
        file = self.create_test_image_file('JPEG', (50, 50))
        result = process_profile_picture(file)
        assert isinstance(result, InMemoryUploadedFile)
        assert result.name.endswith('.jpg')
        assert result.content_type == 'image/jpeg'
        assert result.size > 0
    
    @pytest.mark.django_db
    def test_process_valid_png_converts_to_jpeg(self):
        """Test that PNG files are converted to JPEG"""
        file = self.create_test_image_file('PNG', (50, 50))
        result = process_profile_picture(file)
        assert isinstance(result, InMemoryUploadedFile)
        assert result.name.endswith('.jpg')
        assert result.content_type == 'image/jpeg'
    
    @pytest.mark.django_db
    def test_process_large_image_resizes(self):
        """Test that large images are resized during processing"""
        file = self.create_test_image_file('JPEG', (500, 500))
        result = process_profile_picture(file)
        # Verify the image was resized by checking it can be opened
        result.seek(0)
        img = Image.open(result)
        assert img.width <= MAX_WIDTH
        assert img.height <= MAX_HEIGHT
    
    @pytest.mark.django_db
    def test_process_invalid_file_raises_error(self):
        """Test that invalid files raise ValidationError"""
        invalid_file = SimpleUploadedFile("test.txt", b"not an image", content_type="text/plain")
        with pytest.raises(ValidationError):
            process_profile_picture(invalid_file)
    
    @pytest.mark.django_db
    def test_process_too_large_file_raises_error(self):
        """Test that files exceeding size limit raise ValidationError"""
        large_data = b'x' * (MAX_FILE_SIZE + 1000)
        large_file = SimpleUploadedFile("large.jpg", large_data, content_type="image/jpeg")
        with pytest.raises(ValidationError):
            process_profile_picture(large_file)
    
    @pytest.mark.django_db
    def test_process_filename_sanitized(self):
        """Test that filename is sanitized during processing"""
        file = self.create_test_image_file('JPEG', (50, 50))
        file.name = "../../../etc/passwd.jpg"
        result = process_profile_picture(file)
        assert "../" not in result.name
        assert result.name == "passwd.jpg"

