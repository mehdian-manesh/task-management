"""
Secure image validation and sanitization utilities for profile pictures.
Session management utilities for IP extraction and User-Agent parsing.
"""
import os
import re
from io import BytesIO
from PIL import Image
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.core.exceptions import ValidationError

try:
    from user_agents import parse as parse_ua
    USER_AGENTS_AVAILABLE = True
except ImportError:
    USER_AGENTS_AVAILABLE = False


# Constants
MAX_FILE_SIZE = 1024 * 1024  # 1MB in bytes
MAX_WIDTH = 100
MAX_HEIGHT = 100
ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png']
ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png']


def sanitize_filename(filename):
    """
    Sanitize filename to prevent path traversal attacks.
    Returns a safe filename with only alphanumeric, dots, hyphens, and underscores.
    """
    # Remove path components
    filename = os.path.basename(filename)
    # Remove any non-alphanumeric characters except dots, hyphens, underscores
    filename = re.sub(r'[^a-zA-Z0-9._-]', '', filename)
    # Limit length
    if len(filename) > 255:
        name, ext = os.path.splitext(filename)
        filename = name[:255-len(ext)] + ext
    return filename


def validate_image_file(file):
    """
    Validate uploaded image file for security.
    
    Checks:
    - File size (must be <= 1MB)
    - MIME type (must be JPEG or PNG)
    - Actual image content (not just file extension)
    
    Note: Image dimensions are not checked here - oversized images will be
    automatically resized to 100x100px maximum in the sanitize_image function
    while maintaining aspect ratio.
    
    Args:
        file: Django UploadedFile object
        
    Returns:
        tuple: (PIL Image object, error_message)
        If validation fails, returns (None, error_message)
    """
    # Check file size
    if file.size > MAX_FILE_SIZE:
        return None, f"File size exceeds maximum allowed size of {MAX_FILE_SIZE // (1024 * 1024)}MB"
    
    # Check MIME type
    content_type = file.content_type
    if content_type not in ALLOWED_MIME_TYPES:
        return None, f"Invalid file type. Allowed types: JPEG, PNG"
    
    # Check file extension
    filename = file.name.lower()
    ext = os.path.splitext(filename)[1]
    if ext not in ALLOWED_EXTENSIONS:
        return None, f"Invalid file extension. Allowed extensions: .jpg, .jpeg, .png"
    
    try:
        # Open and verify it's actually an image
        # Reset file pointer to beginning
        file.seek(0)
        image = Image.open(file)
        
        # Verify image format
        if image.format not in ['JPEG', 'PNG']:
            return None, "Invalid image format. Only JPEG and PNG are allowed."
        
        # Note: Dimensions are not checked here - images will be automatically resized
        # to MAX_WIDTH x MAX_HEIGHT in the sanitize_image function
        
        # Verify image is not corrupted
        image.verify()
        
        # Reopen image after verify() (verify() closes the image)
        file.seek(0)
        image = Image.open(file)
        
        return image, None
        
    except Exception as e:
        return None, f"Invalid image file: {str(e)}"


def sanitize_image(image):
    """
    Sanitize image by removing EXIF data, resizing, and converting to RGB.
    
    Args:
        image: PIL Image object
        
    Returns:
        PIL Image object: Sanitized image
    """
    # Convert to RGB to remove alpha channel and ensure compatibility
    if image.mode in ('RGBA', 'LA', 'P'):
        # Create a white background for transparent images
        rgb_image = Image.new('RGB', image.size, (255, 255, 255))
        if image.mode == 'P':
            image = image.convert('RGBA')
        rgb_image.paste(image, mask=image.split()[-1] if image.mode in ('RGBA', 'LA') else None)
        image = rgb_image
    elif image.mode != 'RGB':
        image = image.convert('RGB')
    
    # Resize if needed while maintaining aspect ratio
    width, height = image.size
    
    if width > MAX_WIDTH or height > MAX_HEIGHT:
        # Calculate new dimensions maintaining aspect ratio
        ratio = min(MAX_WIDTH / width, MAX_HEIGHT / height)
        new_width = int(width * ratio)
        new_height = int(height * ratio)
        image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    # Return the sanitized image directly
    # The image has already been converted to RGB and resized
    # EXIF data is removed by the conversion process
    return image


def process_profile_picture(file):
    """
    Complete processing pipeline for profile picture upload.
    
    Validates, sanitizes, and prepares the image for storage.
    
    Args:
        file: Django UploadedFile object
        
    Returns:
        InMemoryUploadedFile: Processed image file ready for storage
        
    Raises:
        ValidationError: If validation fails
    """
    # Reset file pointer to beginning in case it was read before
    if hasattr(file, 'seek'):
        file.seek(0)
    
    # Validate the image
    image, error = validate_image_file(file)
    if error:
        raise ValidationError(error)
    
    # Sanitize the image
    sanitized_image = sanitize_image(image)
    
    # Convert to file-like object
    output = BytesIO()
    sanitized_image.save(output, format='JPEG', quality=85, optimize=True)
    
    # Get the actual size of the content (before seeking)
    file_size = output.tell()
    
    # Reset to beginning for InMemoryUploadedFile
    output.seek(0)
    
    # Create a new InMemoryUploadedFile
    filename = sanitize_filename(file.name)
    # Ensure .jpg extension for consistency
    name, ext = os.path.splitext(filename)
    if ext.lower() not in ['.jpg', '.jpeg']:
        filename = f"{name}.jpg"
    
    # Ensure the BytesIO is at the beginning and has content
    output.seek(0)
    content = output.read()
    output.seek(0)
    
    # Verify we have content
    if len(content) == 0:
        raise ValidationError("Processed image has no content")
    
    # Create a new BytesIO from the content to ensure it's fresh
    fresh_output = BytesIO(content)
    
    processed_file = InMemoryUploadedFile(
        fresh_output,
        'ImageField',
        filename,
        'image/jpeg',
        len(content),
        None
    )
    
    return processed_file


def get_client_ip(request):
    """
    Extract the real client IP address from request, handling proxy headers.
    
    Priority order:
    1. X-Forwarded-For header (first IP if multiple)
    2. X-Real-IP header
    3. REMOTE_ADDR
    
    Args:
        request: Django HttpRequest object
        
    Returns:
        str: Client IP address
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        # X-Forwarded-For can contain multiple IPs, take the first one
        ip = x_forwarded_for.split(',')[0].strip()
        return ip
    
    x_real_ip = request.META.get('HTTP_X_REAL_IP')
    if x_real_ip:
        return x_real_ip.strip()
    
    return request.META.get('REMOTE_ADDR', '0.0.0.0')


def parse_user_agent(user_agent_string):
    """
    Parse User-Agent string to extract browser, device, and OS information.
    
    Uses user-agents library if available, falls back to basic parsing.
    
    Args:
        user_agent_string: Raw User-Agent string
        
    Returns:
        dict: {
            'browser_name': str,
            'browser_version': str or None,
            'os_name': str,
            'os_version': str or None,
            'device_type': str ('desktop', 'mobile', or 'tablet'),
            'device_name': str or None
        }
    """
    if not user_agent_string:
        return {
            'browser_name': 'Unknown',
            'browser_version': None,
            'os_name': 'Unknown',
            'os_version': None,
            'device_type': 'desktop',
            'device_name': None,
        }
    
    if USER_AGENTS_AVAILABLE:
        ua = parse_ua(user_agent_string)
        
        # Determine device type
        if ua.is_mobile:
            device_type = 'mobile'
        elif ua.is_tablet:
            device_type = 'tablet'
        else:
            device_type = 'desktop'
        
        return {
            'browser_name': ua.browser.family or 'Unknown',
            'browser_version': f"{ua.browser.version_string}" if ua.browser.version_string else None,
            'os_name': ua.os.family or 'Unknown',
            'os_version': f"{ua.os.version_string}" if ua.os.version_string else None,
            'device_type': device_type,
            'device_name': ua.device.family if ua.device.family != 'Other' else None,
        }
    else:
        # Fallback basic parsing
        ua_lower = user_agent_string.lower()
        
        # Browser detection
        if 'chrome' in ua_lower and 'edg' not in ua_lower:
            browser_name = 'Chrome'
            browser_version = _extract_version(ua_lower, 'chrome')
        elif 'firefox' in ua_lower:
            browser_name = 'Firefox'
            browser_version = _extract_version(ua_lower, 'firefox')
        elif 'safari' in ua_lower and 'chrome' not in ua_lower:
            browser_name = 'Safari'
            browser_version = _extract_version(ua_lower, 'version')
        elif 'edg' in ua_lower:
            browser_name = 'Edge'
            browser_version = _extract_version(ua_lower, 'edg')
        else:
            browser_name = 'Unknown'
            browser_version = None
        
        # OS detection
        if 'windows' in ua_lower:
            os_name = 'Windows'
            os_version = _extract_version(ua_lower, 'windows nt')
        elif 'mac os x' in ua_lower or 'macintosh' in ua_lower:
            os_name = 'macOS'
            os_version = _extract_version(ua_lower, 'mac os x')
        elif 'linux' in ua_lower:
            os_name = 'Linux'
            os_version = None
        elif 'android' in ua_lower:
            os_name = 'Android'
            os_version = _extract_version(ua_lower, 'android')
        elif 'iphone' in ua_lower or 'ipad' in ua_lower:
            os_name = 'iOS'
            os_version = _extract_version(ua_lower, 'os ')
        else:
            os_name = 'Unknown'
            os_version = None
        
        # Device type
        if 'mobile' in ua_lower or 'iphone' in ua_lower or 'android' in ua_lower:
            if 'ipad' in ua_lower:
                device_type = 'tablet'
            else:
                device_type = 'mobile'
        elif 'ipad' in ua_lower:
            device_type = 'tablet'
        else:
            device_type = 'desktop'
        
        return {
            'browser_name': browser_name,
            'browser_version': browser_version,
            'os_name': os_name,
            'os_version': os_version,
            'device_type': device_type,
            'device_name': None,
        }


def _extract_version(ua_string, keyword):
    """Helper to extract version number from user agent string"""
    import re
    pattern = rf'{re.escape(keyword)}[\/\s]+([\d\.]+)'
    match = re.search(pattern, ua_string, re.IGNORECASE)
    if match:
        return match.group(1)
    return None


def can_delete_session(user, current_session, target_session):
    """
    Check if a user can delete a target session using their current session.
    
    Rules:
    - User must own both sessions
    - Current session must be older than target session (older can delete newer)
    - Sessions must have different login dates (can't delete same-age session)
    
    Args:
        user: User object
        current_session: UserSession object (the session making the request)
        target_session: UserSession object (the session to be deleted)
        
    Returns:
        bool: True if deletion is allowed, False otherwise
    """
    # Both sessions must belong to the same user
    if current_session.user != user or target_session.user != user:
        return False
    
    # Cannot delete the same session
    if current_session.id == target_session.id:
        return False
    
    # Current session must be older than target session
    if current_session.login_date >= target_session.login_date:
        return False
    
    return True

