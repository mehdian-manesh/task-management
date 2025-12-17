"""
Django management command to auto-generate saved reports.
Should be run on schedule (weekly, monthly, yearly).
"""
import jdatetime
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from core.models import SavedReport, Domain
from core.report_service import ReportService
from core.pdf_service import generate_report_pdf
from core.jalali_utils import get_current_jalali_date, get_jalali_date_range
from django.core.files.base import ContentFile
import json


class Command(BaseCommand):
    help = 'Generate saved reports for the previous period (weekly, monthly, or yearly)'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--period-type',
            type=str,
            choices=['weekly', 'monthly', 'yearly'],
            required=True,
            help='Period type to generate reports for',
        )
        parser.add_argument(
            '--year',
            type=int,
            help='Jalali year (default: previous period)',
        )
        parser.add_argument(
            '--month',
            type=int,
            help='Jalali month (for monthly reports)',
        )
        parser.add_argument(
            '--week',
            type=int,
            help='Jalali week number (for weekly reports)',
        )
    
    def handle(self, *args, **options):
        period_type = options['period_type']
        now_jalali = get_current_jalali_date()
        
        # Determine the period to generate reports for (previous period by default)
        if period_type == 'weekly':
            year = options.get('year') or now_jalali['year']
            week = options.get('week')
            if week is None:
                # Generate for previous week
                week = now_jalali['week'] - 1
                if week <= 0:
                    week = 52  # Last week of previous year
                    year -= 1
            month = None
        elif period_type == 'monthly':
            year = options.get('year') or now_jalali['year']
            month = options.get('month')
            if month is None:
                # Generate for previous month
                month = now_jalali['month'] - 1
                if month <= 0:
                    month = 12
                    year -= 1
            week = None
        elif period_type == 'yearly':
            year = options.get('year') or (now_jalali['year'] - 1)
            month = None
            week = None
        
        self.stdout.write(
            self.style.SUCCESS(f'Generating {period_type} reports for Jalali year {year}')
        )
        
        # Generate individual reports for all active users
        active_users = User.objects.filter(is_active=True)
        individual_count = 0
        
        for user in active_users:
            try:
                # Check if report already exists
                existing = SavedReport.objects.filter(
                    report_type='individual',
                    period_type=period_type,
                    jalali_year=year,
                    jalali_month=month,
                    jalali_week=week,
                    user=user
                ).first()
                
                if existing:
                    self.stdout.write(
                        self.style.WARNING(f'Report already exists for user {user.username}, skipping...')
                    )
                    continue
                
                # Generate report data
                report_data = ReportService.generate_individual_report(
                    user, period_type, year, month=month, week=week
                )
                
                # Generate PDF
                pdf_file = generate_report_pdf(report_data, report_type='individual')
                
                # Create saved report
                saved_report = SavedReport.objects.create(
                    report_type='individual',
                    period_type=period_type,
                    jalali_year=year,
                    jalali_month=month,
                    jalali_week=week,
                    user=user,
                    report_data=report_data
                )
                
                # Save PDF file
                pdf_filename = f"report_individual_{user.id}_{year}_{period_type}.pdf"
                saved_report.pdf_file.save(
                    pdf_filename,
                    ContentFile(pdf_file.read()),
                    save=True
                )
                
                individual_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Generated individual report for {user.username}')
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error generating report for {user.username}: {str(e)}')
                )
        
        # Generate team reports for all domains
        domains = Domain.objects.all()
        team_count = 0
        
        for domain in domains:
            try:
                # Check if report already exists
                existing = SavedReport.objects.filter(
                    report_type='team',
                    period_type=period_type,
                    jalali_year=year,
                    jalali_month=month,
                    jalali_week=week,
                    domain=domain
                ).first()
                
                if existing:
                    self.stdout.write(
                        self.style.WARNING(f'Report already exists for domain {domain.name}, skipping...')
                    )
                    continue
                
                # Generate report data
                report_data = ReportService.generate_team_report(
                    domain, period_type, year, month=month, week=week
                )
                
                # Generate PDF
                pdf_file = generate_report_pdf(report_data, report_type='team')
                
                # Create saved report
                saved_report = SavedReport.objects.create(
                    report_type='team',
                    period_type=period_type,
                    jalali_year=year,
                    jalali_month=month,
                    jalali_week=week,
                    domain=domain,
                    report_data=report_data
                )
                
                # Save PDF file
                pdf_filename = f"report_team_{domain.id}_{year}_{period_type}.pdf"
                saved_report.pdf_file.save(
                    pdf_filename,
                    ContentFile(pdf_file.read()),
                    save=True
                )
                
                team_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Generated team report for {domain.name}')
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error generating report for {domain.name}: {str(e)}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully generated {individual_count} individual reports and {team_count} team reports'
            )
        )
