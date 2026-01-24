"""
Tests for PDF generation service
"""
import pytest
from io import BytesIO
from unittest.mock import patch, MagicMock, Mock
from pathlib import Path
import os

from core.pdf_service import generate_report_pdf, build_report_html, get_pdf_css, _ensure_vazir_font


class TestBuildReportHTML:
    """Tests for HTML building"""
    
    def test_build_report_html_individual_empty(self):
        """Test building HTML for empty individual report"""
        report_data = {
            'period': {
                'formatted': 'هفته 1 سال 1403',
                'start_date': '2024-01-01',
                'end_date': '2024-01-07',
            },
            'user': {
                'username': 'testuser',
                'first_name': 'Test',
                'last_name': 'User',
            },
            'completed_tasks': [],
            'projects': [],
            'meetings': [],
            'working_hours': [],
            'feedbacks': [],
            'admin_notes': [],
        }
        
        html = build_report_html(report_data, 'individual')
        assert isinstance(html, str)
        assert 'testuser' in html
        assert 'هفته 1 سال 1403' in html
    
    def test_build_report_html_team_empty(self):
        """Test building HTML for empty team report"""
        report_data = {
            'period': {
                'formatted': 'هفته 1 سال 1403',
                'start_date': '2024-01-01',
                'end_date': '2024-01-07',
            },
            'domain': {
                'name': 'Test Domain',
            },
            'completed_tasks': [],
            'projects': [],
            'meetings': [],
            'working_hours': [],
            'feedbacks': [],
            'admin_notes': [],
        }
        
        html = build_report_html(report_data, 'team')
        assert isinstance(html, str)
        assert 'Test Domain' in html
    
    def test_build_report_html_with_tasks(self):
        """Test building HTML with tasks"""
        report_data = {
            'period': {
                'formatted': 'هفته 1 سال 1403',
                'start_date': '2024-01-01',
                'end_date': '2024-01-07',
            },
            'user': {
                'username': 'testuser',
            },
            'completed_tasks': [
                {
                    'name': 'Task 1',
                    'status': 'done',
                    'reports': [{'id': 1}, {'id': 2}],
                }
            ],
            'projects': [],
            'meetings': [],
            'working_hours': [],
            'feedbacks': [],
            'admin_notes': [],
        }
        
        html = build_report_html(report_data, 'individual')
        assert 'Task 1' in html
        assert 'done' in html
    
    def test_build_report_html_with_projects(self):
        """Test building HTML with projects"""
        report_data = {
            'period': {
                'formatted': 'هفته 1 سال 1403',
                'start_date': '2024-01-01',
                'end_date': '2024-01-07',
            },
            'user': {
                'username': 'testuser',
            },
            'completed_tasks': [],
            'projects': [
                {
                    'name': 'Project 1',
                    'status': 'doing',
                    'assignees': [
                        {'first_name': 'John', 'last_name': 'Doe'},
                    ],
                }
            ],
            'meetings': [],
            'working_hours': [],
            'feedbacks': [],
            'admin_notes': [],
        }
        
        html = build_report_html(report_data, 'individual')
        assert 'Project 1' in html
        assert 'John Doe' in html
    
    def test_build_report_html_with_working_hours_individual(self):
        """Test building HTML with working hours for individual report"""
        report_data = {
            'period': {
                'formatted': 'هفته 1 سال 1403',
                'start_date': '2024-01-01',
                'end_date': '2024-01-07',
            },
            'user': {
                'username': 'testuser',
            },
            'completed_tasks': [],
            'projects': [],
            'meetings': [],
            'working_hours': [
                {
                    'date': '2024-01-01',
                    'check_in': '2024-01-01T08:00:00Z',
                    'check_out': '2024-01-01T17:00:00Z',
                    'total_hours': 8.0,
                    'reports_count': 3,
                }
            ],
            'feedbacks': [],
            'admin_notes': [],
        }
        
        html = build_report_html(report_data, 'individual')
        assert '2024-01-01' in html
        assert '8.0' in html or '8' in html
    
    def test_build_report_html_with_working_hours_team(self):
        """Test building HTML with working hours for team report"""
        report_data = {
            'period': {
                'formatted': 'هفته 1 سال 1403',
                'start_date': '2024-01-01',
                'end_date': '2024-01-07',
            },
            'domain': {
                'name': 'Test Domain',
            },
            'completed_tasks': [],
            'projects': [],
            'meetings': [],
            'working_hours': [
                {
                    'user': {
                        'username': 'user1',
                    },
                    'date': '2024-01-01',
                    'check_in': '2024-01-01T08:00:00Z',
                    'total_hours': 8.0,
                    'reports_count': 3,
                }
            ],
            'feedbacks': [],
            'admin_notes': [],
        }
        
        html = build_report_html(report_data, 'team')
        assert 'user1' in html
        assert '2024-01-01' in html


class TestGetPDFCSS:
    """Tests for CSS generation"""
    
    def test_get_pdf_css_returns_css(self):
        """Test that CSS is returned"""
        css = get_pdf_css()
        assert css is not None
        # WeasyPrint CSS objects have a string representation
        assert hasattr(css, 'string') or hasattr(css, '__str__')


class TestGenerateReportPDF:
    """Tests for PDF generation"""
    
    def test_generate_report_pdf_individual(self):
        """Test generating PDF for individual report"""
        report_data = {
            'period': {
                'formatted': 'هفته 1 سال 1403',
                'start_date': '2024-01-01',
                'end_date': '2024-01-07',
            },
            'user': {
                'username': 'testuser',
                'first_name': 'Test',
                'last_name': 'User',
            },
            'completed_tasks': [],
            'projects': [],
            'meetings': [],
            'working_hours': [],
            'feedbacks': [],
            'admin_notes': [],
        }
        
        try:
            pdf_file = generate_report_pdf(report_data, 'individual')
            assert isinstance(pdf_file, BytesIO)
            assert pdf_file.tell() == 0  # Should be at beginning
            # Read some bytes to verify it's a PDF (PDFs start with %PDF)
            content = pdf_file.read(4)
            assert content.startswith(b'%PDF')
        except ImportError:
            # Skip if WeasyPrint is not installed
            pytest.skip("WeasyPrint not available")
    
    def test_generate_report_pdf_team(self):
        """Test generating PDF for team report"""
        report_data = {
            'period': {
                'formatted': 'هفته 1 سال 1403',
                'start_date': '2024-01-01',
                'end_date': '2024-01-07',
            },
            'domain': {
                'name': 'Test Domain',
            },
            'completed_tasks': [],
            'projects': [],
            'meetings': [],
            'working_hours': [],
            'feedbacks': [],
            'admin_notes': [],
        }
        
        try:
            pdf_file = generate_report_pdf(report_data, 'team')
            assert isinstance(pdf_file, BytesIO)
            content = pdf_file.read(4)
            assert content.startswith(b'%PDF')
        except ImportError:
            pytest.skip("WeasyPrint not available")
    
    def test_generate_report_pdf_with_meetings(self):
        """Test generating PDF with meetings data"""
        report_data = {
            'period': {
                'formatted': 'هفته 1 سال 1403',
                'start_date': '2024-01-01',
                'end_date': '2024-01-07',
            },
            'user': {
                'username': 'testuser',
            },
            'completed_tasks': [],
            'projects': [],
            'meetings': [
                {
                    'topic': 'Test Meeting',
                    'datetime': '2024-01-01T10:00:00Z',
                    'summary': 'Meeting summary',
                    'type': 'internal',
                }
            ],
            'working_hours': [],
            'feedbacks': [],
            'admin_notes': [],
        }
        
        try:
            pdf_file = generate_report_pdf(report_data, 'individual')
            assert isinstance(pdf_file, BytesIO)
            content = pdf_file.read(4)
            assert content.startswith(b'%PDF')
        except ImportError:
            pytest.skip("WeasyPrint not available")
    
    def test_generate_report_pdf_with_feedbacks(self):
        """Test generating PDF with feedbacks"""
        report_data = {
            'period': {
                'formatted': 'هفته 1 سال 1403',
                'start_date': '2024-01-01',
                'end_date': '2024-01-07',
            },
            'user': {
                'username': 'testuser',
            },
            'completed_tasks': [],
            'projects': [],
            'meetings': [],
            'working_hours': [],
            'feedbacks': [
                {
                    'description': 'Good work',
                    'type': 'positive',
                    'created_at': '2024-01-01T12:00:00Z',
                }
            ],
            'admin_notes': [],
        }
        
        try:
            pdf_file = generate_report_pdf(report_data, 'individual')
            assert isinstance(pdf_file, BytesIO)
            content = pdf_file.read(4)
            assert content.startswith(b'%PDF')
        except ImportError:
            pytest.skip("WeasyPrint not available")
    
    def test_generate_report_pdf_with_admin_notes(self):
        """Test generating PDF with admin notes"""
        report_data = {
            'period': {
                'formatted': 'هفته 1 سال 1403',
                'start_date': '2024-01-01',
                'end_date': '2024-01-07',
            },
            'user': {
                'username': 'testuser',
            },
            'completed_tasks': [],
            'projects': [],
            'meetings': [],
            'working_hours': [],
            'feedbacks': [],
            'admin_notes': [
                {
                    'note': 'Please improve',
                    'created_by': 'admin',
                    'created_at': '2024-01-01T14:00:00Z',
                }
            ],
        }
        
        try:
            pdf_file = generate_report_pdf(report_data, 'individual')
            assert isinstance(pdf_file, BytesIO)
            content = pdf_file.read(4)
            assert content.startswith(b'%PDF')
        except ImportError:
            pytest.skip("WeasyPrint not available")
    
    def test_generate_report_pdf_with_many_assignees(self):
        """Test generating PDF with project that has many assignees"""
        report_data = {
            'period': {
                'formatted': 'هفته 1 سال 1403',
                'start_date': '2024-01-01',
                'end_date': '2024-01-07',
            },
            'user': {
                'username': 'testuser',
            },
            'completed_tasks': [],
            'projects': [
                {
                    'name': 'Project 1',
                    'status': 'doing',
                    'assignees': [
                        {'first_name': f'User{i}', 'last_name': 'Test'}
                        for i in range(7)  # More than 5 to test truncation
                    ],
                }
            ],
            'meetings': [],
            'working_hours': [],
            'feedbacks': [],
            'admin_notes': [],
        }
        
        try:
            pdf_file = generate_report_pdf(report_data, 'individual')
            assert isinstance(pdf_file, BytesIO)
            content = pdf_file.read(4)
            assert content.startswith(b'%PDF')
        except ImportError:
            pytest.skip("WeasyPrint not available")
    
    @patch('core.pdf_service._ensure_vazir_font')
    @patch('core.pdf_service.HTML')
    def test_generate_report_pdf_with_font_base_url(self, mock_html_class, mock_font):
        """Test that base_url is set when font file exists"""
        mock_font_file = MagicMock()
        mock_font_file.exists.return_value = True
        mock_font_file.parent.absolute.return_value.as_uri.return_value = 'file:///test/fonts'
        mock_font.return_value = mock_font_file
        
        mock_html_instance = MagicMock()
        mock_html_class.return_value = mock_html_instance
        
        report_data = {
            'period': {'formatted': 'test', 'start_date': '2024-01-01', 'end_date': '2024-01-07'},
            'user': {'username': 'test'},
            'completed_tasks': [],
            'projects': [],
            'meetings': [],
            'working_hours': [],
            'feedbacks': [],
            'admin_notes': [],
        }
        
        try:
            generate_report_pdf(report_data, 'individual')
            # Verify HTML was called with base_url
            mock_html_class.assert_called_once()
            call_kwargs = mock_html_class.call_args[1]
            assert 'base_url' in call_kwargs
            assert call_kwargs['base_url'] == 'file:///test/fonts'
        except ImportError:
            pytest.skip("WeasyPrint not available")
    
    @patch('core.pdf_service._ensure_vazir_font')
    @patch('core.pdf_service.HTML')
    def test_generate_report_pdf_without_font(self, mock_html_class, mock_font):
        """Test that base_url is not set when font file doesn't exist"""
        mock_font.return_value = None
        
        mock_html_instance = MagicMock()
        mock_html_class.return_value = mock_html_instance
        
        report_data = {
            'period': {'formatted': 'test', 'start_date': '2024-01-01', 'end_date': '2024-01-07'},
            'user': {'username': 'test'},
            'completed_tasks': [],
            'projects': [],
            'meetings': [],
            'working_hours': [],
            'feedbacks': [],
            'admin_notes': [],
        }
        
        try:
            generate_report_pdf(report_data, 'individual')
            # Verify HTML was called without base_url or with None
            mock_html_class.assert_called_once()
            call_kwargs = mock_html_class.call_args[1] if mock_html_class.call_args[1] else {}
            # base_url should not be set or should be None
            if 'base_url' in call_kwargs:
                assert call_kwargs['base_url'] is None
        except ImportError:
            pytest.skip("WeasyPrint not available")


class TestEnsureVazirFont:
    """Tests for font ensuring function"""
    
    @patch('core.pdf_service.urllib.request.urlretrieve')
    @patch('core.pdf_service.shutil.copy2')
    @patch('core.pdf_service.os.system')
    @patch('core.pdf_service.os.makedirs')
    def test_ensure_vazir_font_downloads_and_installs(self, mock_makedirs, mock_system, mock_copy2, mock_urlretrieve):
        """Test that font is downloaded and installed system-wide"""
        from django.conf import settings
        from pathlib import Path
        
        font_dir = settings.BASE_DIR / 'core' / 'static' / 'fonts'
        font_file = font_dir / 'Vazir-Regular.ttf'
        
        # Ensure font file doesn't exist
        if font_file.exists():
            font_file.unlink()
        
        # Mock successful download
        def mock_urlretrieve_side_effect(url, dest):
            # Create the font file
            font_file.parent.mkdir(parents=True, exist_ok=True)
            font_file.write_bytes(b'fake font data')
        
        mock_urlretrieve.side_effect = mock_urlretrieve_side_effect
        
        result = _ensure_vazir_font()
        
        assert result is not None
        assert result == font_file
        mock_urlretrieve.assert_called()
        # System install should be attempted
        mock_makedirs.assert_called()
        # Cleanup
        if font_file.exists():
            font_file.unlink()
    
    @patch('core.pdf_service.urllib.request.urlretrieve')
    def test_ensure_vazir_font_handles_download_failure(self, mock_urlretrieve):
        """Test that function returns None when all downloads fail"""
        from django.conf import settings
        from pathlib import Path
        
        font_dir = settings.BASE_DIR / 'core' / 'static' / 'fonts'
        font_file = font_dir / 'Vazir-Regular.ttf'
        
        # Ensure font file doesn't exist
        if font_file.exists():
            font_file.unlink()
        
        # Mock all downloads failing
        mock_urlretrieve.side_effect = Exception("Download failed")
        
        result = _ensure_vazir_font()
        
        assert result is None
    
    @patch('core.pdf_service.shutil.copy2')
    @patch('core.pdf_service.os.system')
    @patch('core.pdf_service.os.makedirs')
    def test_ensure_vazir_font_handles_system_install_failure(self, mock_makedirs, mock_system, mock_copy2):
        """Test that function continues when system install fails"""
        from django.conf import settings
        from pathlib import Path
        
        font_dir = settings.BASE_DIR / 'core' / 'static' / 'fonts'
        font_file = font_dir / 'Vazir-Regular.ttf'
        
        # Create font file so download is skipped
        font_file.parent.mkdir(parents=True, exist_ok=True)
        font_file.write_bytes(b'fake font data')
        
        # Mock system install failure
        mock_makedirs.side_effect = PermissionError("Permission denied")
        
        # Should not raise, should return font file
        result = _ensure_vazir_font()
        assert result is not None
        
        # Cleanup
        if font_file.exists():
            font_file.unlink()


class TestGetPDFCSS:
    """Tests for CSS generation"""
    
    def test_get_pdf_css_returns_css(self):
        """Test that CSS is returned"""
        css = get_pdf_css()
        assert css is not None
        # WeasyPrint CSS objects have a string representation
        assert hasattr(css, 'string') or hasattr(css, '__str__')
    
    @patch('core.pdf_service._ensure_vazir_font')
    def test_get_pdf_css_with_local_font(self, mock_font):
        """Test CSS generation with local font"""
        from pathlib import Path
        mock_font_file = MagicMock()
        mock_font_file.exists.return_value = True
        mock_font_file.name = 'Vazir-Regular.ttf'
        mock_font.return_value = mock_font_file
        
        css = get_pdf_css()
        assert css is not None
        # Check that CSS was generated (WeasyPrint CSS object)
        assert hasattr(css, 'string') or hasattr(css, '__str__')
        # Verify font function was called
        mock_font.assert_called_once()
    
    @patch('core.pdf_service._ensure_vazir_font')
    def test_get_pdf_css_without_font_fallback(self, mock_font):
        """Test CSS generation falls back to external URL when font not available"""
        mock_font.return_value = None
        
        css = get_pdf_css()
        assert css is not None
        # Check that CSS was generated (WeasyPrint CSS object)
        assert hasattr(css, 'string') or hasattr(css, '__str__')
        # Verify font function was called
        mock_font.assert_called_once()

