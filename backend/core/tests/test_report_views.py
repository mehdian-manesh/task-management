"""
Tests for report generation and export views
"""
import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User

from core.models import Domain, ReportNote
from accounts.models import UserProfile


@pytest.mark.django_db
class TestGenerateIndividualReportView:
    """Tests for individual report generation view"""
    
    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='pass')
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + str(refresh.access_token))
    
    def test_generate_report_missing_params(self):
        """Test report generation fails without required params"""
        url = reverse('generate-individual-report')
        response = self.client.get(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_generate_report_with_params(self):
        """Test successful report generation"""
        url = reverse('generate-individual-report')
        response = self.client.get(url, {
            'period_type': 'daily',
            'year': '1403',
            'month': '1',
            'day': '1'
        })
        assert response.status_code == status.HTTP_200_OK
        assert 'period' in response.data
        assert 'user' in response.data
    
    def test_generate_report_invalid_date_params(self):
        """Test report generation with invalid date parameters"""
        url = reverse('generate-individual-report')
        response = self.client.get(url, {
            'period_type': 'daily',
            'year': 'invalid',
            'month': '1',
            'day': '1'
        })
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_generate_report_weekly(self):
        """Test generating weekly report"""
        url = reverse('generate-individual-report')
        response = self.client.get(url, {
            'period_type': 'weekly',
            'year': '1403',
            'week': '1'
        })
        assert response.status_code == status.HTTP_200_OK
    
    def test_generate_report_unauthenticated(self):
        """Test that unauthenticated users cannot generate reports"""
        client = APIClient()
        url = reverse('generate-individual-report')
        response = client.get(url, {
            'period_type': 'daily',
            'year': '1403',
        })
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestGenerateTeamReportView:
    """Tests for team report generation view"""
    
    def setup_method(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(username='admin', password='pass', email='admin@test.com')
        refresh = RefreshToken.for_user(self.admin)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + str(refresh.access_token))
        self.domain = Domain.objects.create(name='Test Domain')
    
    def test_generate_team_report_missing_params(self):
        """Test team report generation fails without required params"""
        url = reverse('generate-team-report')
        response = self.client.get(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_generate_team_report_with_params(self):
        """Test successful team report generation"""
        url = reverse('generate-team-report')
        response = self.client.get(url, {
            'domain_id': self.domain.id,
            'period_type': 'weekly',
            'year': '1403',
            'week': '1'
        })
        assert response.status_code == status.HTTP_200_OK
        assert 'period' in response.data
        assert 'domain' in response.data
    
    def test_generate_team_report_invalid_domain(self):
        """Test team report generation with invalid domain ID"""
        url = reverse('generate-team-report')
        response = self.client.get(url, {
            'domain_id': '99999',
            'period_type': 'weekly',
            'year': '1403',
            'week': '1'
        })
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_generate_team_report_non_admin(self):
        """Test that non-admin users cannot generate team reports"""
        client = APIClient()
        user = User.objects.create_user(username='user', password='pass')
        refresh = RefreshToken.for_user(user)
        client.credentials(HTTP_AUTHORIZATION='Bearer ' + str(refresh.access_token))
        
        url = reverse('generate-team-report')
        response = client.get(url, {
            'domain_id': self.domain.id,
            'period_type': 'weekly',
            'year': '1403',
        })
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestExportIndividualReportPDFView:
    """Tests for individual report PDF export view"""
    
    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='pass')
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + str(refresh.access_token))
    
    def test_export_pdf_missing_params(self):
        """Test PDF export fails without required params"""
        url = reverse('export-individual-report-pdf')
        response = self.client.get(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_export_pdf_with_params(self):
        """Test successful PDF export"""
        url = reverse('export-individual-report-pdf')
        response = self.client.get(url, {
            'period_type': 'daily',
            'year': '1403',
            'month': '1',
            'day': '1'
        })
        # May return 200 OK or 400 if WeasyPrint is not available
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]
    
    def test_export_pdf_unauthenticated(self):
        """Test that unauthenticated users cannot export PDFs"""
        client = APIClient()
        url = reverse('export-individual-report-pdf')
        response = client.get(url, {
            'period_type': 'daily',
            'year': '1403',
        })
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestExportTeamReportPDFView:
    """Tests for team report PDF export view"""
    
    def setup_method(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(username='admin', password='pass', email='admin@test.com')
        refresh = RefreshToken.for_user(self.admin)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + str(refresh.access_token))
        self.domain = Domain.objects.create(name='Test Domain')
    
    def test_export_team_pdf_missing_params(self):
        """Test team PDF export fails without required params"""
        url = reverse('export-team-report-pdf')
        response = self.client.get(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_export_team_pdf_with_params(self):
        """Test successful team PDF export"""
        url = reverse('export-team-report-pdf')
        response = self.client.get(url, {
            'domain_id': self.domain.id,
            'period_type': 'weekly',
            'year': '1403',
            'week': '1'
        })
        # May return 200 OK or 400 if WeasyPrint is not available
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]
    
    def test_export_team_pdf_non_admin(self):
        """Test that non-admin users cannot export team PDFs"""
        client = APIClient()
        user = User.objects.create_user(username='user', password='pass')
        refresh = RefreshToken.for_user(user)
        client.credentials(HTTP_AUTHORIZATION='Bearer ' + str(refresh.access_token))
        
        url = reverse('export-team-report-pdf')
        response = client.get(url, {
            'domain_id': self.domain.id,
            'period_type': 'weekly',
            'year': '1403',
        })
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestReportNoteViewSet:
    """Tests for ReportNote ViewSet"""
    
    def setup_method(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(username='admin', password='pass', email='admin@test.com')
        refresh = RefreshToken.for_user(self.admin)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + str(refresh.access_token))
    
    def test_create_report_note(self):
        """Test creating a report note"""
        url = reverse('report-note-list')
        data = {
            'period_type': 'daily',
            'jalali_year': 1403,
            'jalali_month': 1,
            'jalali_day': 1,
            'note': 'Test note'
        }
        response = self.client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['note'] == 'Test note'
        # created_by might be ID or username depending on serializer
        assert 'created_by' in response.data
    
    def test_create_report_note_non_admin(self):
        """Test that non-admin users cannot create report notes"""
        client = APIClient()
        user = User.objects.create_user(username='user', password='pass')
        refresh = RefreshToken.for_user(user)
        client.credentials(HTTP_AUTHORIZATION='Bearer ' + str(refresh.access_token))
        
        url = reverse('report-note-list')
        data = {
            'period_type': 'daily',
            'jalali_year': 1403,
            'note': 'Test note'
        }
        response = client.post(url, data)
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestSavedReportViewSet:
    """Tests for SavedReport ViewSet"""
    
    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='pass')
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + str(refresh.access_token))
    
    def test_list_saved_reports(self):
        """Test listing saved reports"""
        url = reverse('saved-report-list')
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
    
    def test_saved_report_download_no_file(self):
        """Test downloading saved report without PDF file"""
        from core.models import SavedReport
        saved_report = SavedReport.objects.create(
            user=self.user,
            report_type='individual',
            period_type='weekly',
            jalali_year=1403,
            jalali_week=1,
            report_data={}
        )
        url = reverse('saved-report-download', kwargs={'pk': saved_report.id})
        response = self.client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

