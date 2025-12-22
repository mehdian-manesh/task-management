"""
Tests for PDF generation service
"""
import pytest
from io import BytesIO

from core.pdf_service import generate_report_pdf, build_report_html, get_pdf_css


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

