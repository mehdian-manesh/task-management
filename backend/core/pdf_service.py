"""
PDF generation service for reports using WeasyPrint.
"""
from io import BytesIO
from django.template.loader import render_to_string
from weasyprint import HTML, CSS
from django.conf import settings
import os
import urllib.request
import shutil


def _ensure_vazir_font():
    """Ensure Vazir font file exists locally, download if needed"""
    font_dir = settings.BASE_DIR / 'core' / 'static' / 'fonts'
    font_dir.mkdir(parents=True, exist_ok=True)
    
    font_file = font_dir / 'Vazir-Regular.ttf'
    
    # Try multiple possible URLs
    font_urls = [
        'https://github.com/rastikerdar/vazir-font/raw/v30.1.0/dist/Vazir-Regular.ttf',
        'https://cdn.jsdelivr.net/gh/rastikerdar/vazir-font@v30.1.0/dist/Vazir-Regular.ttf',
    ]
    
    if not font_file.exists():
        for font_url in font_urls:
            try:
                urllib.request.urlretrieve(font_url, font_file)
                if font_file.exists() and font_file.stat().st_size > 0:
                    break
            except Exception:
                continue
        else:
            return None
    
    # Try to install font system-wide so WeasyPrint can find it via fontconfig
    try:
        system_font_dir = '/usr/share/fonts/truetype/vazir'
        os.makedirs(system_font_dir, exist_ok=True)
        system_font_file = os.path.join(system_font_dir, 'Vazir-Regular.ttf')
        if not os.path.exists(system_font_file):
            shutil.copy2(font_file, system_font_file)
            # Refresh font cache (might require root, but try anyway)
            os.system('fc-cache -f -v 2>/dev/null || true')
    except Exception:
        # Continue even if system install fails - will use local file via CSS
        pass
    
    return font_file


def generate_report_pdf(report_data, report_type='individual'):
    """
    Generate PDF from report data.
    
    Args:
        report_data: Dictionary containing report data (from report_service)
        report_type: 'individual' or 'team'
    
    Returns:
        BytesIO object containing PDF data
    """
    # Build HTML content
    html_content = build_report_html(report_data, report_type)
    
    # Generate PDF
    pdf_file = BytesIO()
    css = get_pdf_css()
    
    try:
        # Set base_url to font directory so WeasyPrint can resolve font paths in CSS
        font_file_obj = _ensure_vazir_font()
        base_url = None
        if font_file_obj and font_file_obj.exists():
            base_url = str(font_file_obj.parent.absolute().as_uri())
        
        html_obj = HTML(string=html_content, base_url=base_url) if base_url else HTML(string=html_content)
        html_obj.write_pdf(pdf_file, stylesheets=[css])
        pdf_file.seek(0)
    except Exception as e:
        raise
    
    return pdf_file


def build_report_html(report_data, report_type):
    """Build HTML content for report"""
    period = report_data.get('period', {})
    
    # Build sections
    sections_html = []
    
    # Period info
    period_html = f"""
    <div class="period-info">
        <h2>گزارش {period.get('formatted', '')}</h2>
        <p>از تاریخ: {period.get('start_date', '')} تا {period.get('end_date', '')}</p>
    </div>
    """
    sections_html.append(period_html)
    
    if report_type == 'individual':
        user = report_data.get('user', {})
        user_html = f"""
        <div class="user-info">
            <h3>کاربر: {user.get('first_name', '')} {user.get('last_name', '')} ({user.get('username', '')})</h3>
        </div>
        """
        sections_html.append(user_html)
    elif report_type == 'team':
        domain = report_data.get('domain', {})
        domain_html = f"""
        <div class="domain-info">
            <h3>حوزه: {domain.get('name', '')}</h3>
        </div>
        """
        sections_html.append(domain_html)
    
    # Completed tasks
    tasks = report_data.get('completed_tasks', [])
    if tasks:
        tasks_html = "<div class='section'><h3>وظایف انجام شده</h3><ul>"
        for task in tasks:
            task_name = task.get('name', '')
            task_status = task.get('status', '')
            reports_count = len(task.get('reports', []))
            tasks_html += f"<li><strong>{task_name}</strong> - وضعیت: {task_status} - تعداد گزارش‌ها: {reports_count}</li>"
        tasks_html += "</ul></div>"
        sections_html.append(tasks_html)
    
    # Projects
    projects = report_data.get('projects', [])
    if projects:
        projects_html = "<div class='section'><h3>پروژه‌ها</h3><ul>"
        for project in projects:
            project_name = project.get('name', '')
            project_status = project.get('status', '')
            assignees = project.get('assignees', [])
            assignee_names = ', '.join([f"{a.get('first_name', '')} {a.get('last_name', '')}" for a in assignees[:5]])
            if len(assignees) > 5:
                assignee_names += f" و {len(assignees) - 5} نفر دیگر"
            projects_html += f"<li><strong>{project_name}</strong> - وضعیت: {project_status}"
            if assignee_names:
                projects_html += f" - اعضا: {assignee_names}"
            projects_html += "</li>"
        projects_html += "</ul></div>"
        sections_html.append(projects_html)
    
    # Meetings
    meetings = report_data.get('meetings', [])
    if meetings:
        meetings_html = "<div class='section'><h3>جلسات</h3><ul>"
        for meeting in meetings:
            topic = meeting.get('topic', '')
            datetime_str = meeting.get('datetime', '')
            summary = meeting.get('summary', '')
            meeting_type = meeting.get('type', '')
            meetings_html += f"<li><strong>{topic}</strong> - نوع: {meeting_type} - زمان: {datetime_str}"
            if summary:
                meetings_html += f"<br/><em>خلاصه: {summary}</em>"
            meetings_html += "</li>"
        meetings_html += "</ul></div>"
        sections_html.append(meetings_html)
    
    # Working hours
    working_hours = report_data.get('working_hours', [])
    if working_hours:
        wh_html = "<div class='section'><h3>ساعات کاری</h3><table><tr><th>تاریخ</th>"
        if report_type == 'team':
            wh_html += "<th>کاربر</th>"
        wh_html += "<th>ورود</th><th>خروج</th><th>ساعات کار</th><th>تعداد گزارش‌ها</th></tr>"
        
        for wh in working_hours:
            wh_html += "<tr>"
            wh_html += f"<td>{wh.get('date', '')}</td>"
            if report_type == 'team':
                user_info = wh.get('user', {})
                wh_html += f"<td>{user_info.get('username', '')}</td>"
            check_in = wh.get('check_in', '')
            check_out = wh.get('check_out', '')
            total_hours = wh.get('total_hours', 0)
            reports_count = wh.get('reports_count', 0)
            wh_html += f"<td>{check_in[:19] if check_in else '-'}</td>"
            wh_html += f"<td>{check_out[:19] if check_out else '-'}</td>"
            wh_html += f"<td>{total_hours}</td>"
            wh_html += f"<td>{reports_count}</td>"
            wh_html += "</tr>"
        
        wh_html += "</table></div>"
        sections_html.append(wh_html)
    
    # Feedbacks
    feedbacks = report_data.get('feedbacks', [])
    if feedbacks:
        feedbacks_html = "<div class='section'><h3>بازخوردها</h3><ul>"
        for feedback in feedbacks:
            description = feedback.get('description', '')
            f_type = feedback.get('type', '')
            created_at = feedback.get('created_at', '')
            feedbacks_html += f"<li><strong>نوع: {f_type}</strong> - تاریخ: {created_at[:19]}<br/>{description}</li>"
        feedbacks_html += "</ul></div>"
        sections_html.append(feedbacks_html)
    
    # Admin notes
    admin_notes = report_data.get('admin_notes', [])
    if admin_notes:
        notes_html = "<div class='section'><h3>یادداشت‌های مدیر</h3><ul>"
        for note in admin_notes:
            note_text = note.get('note', '')
            created_by = note.get('created_by', '')
            created_at = note.get('created_at', '')
            notes_html += f"<li><strong>{created_by}</strong> - {created_at[:19]}<br/>{note_text}</li>"
        notes_html += "</ul></div>"
        sections_html.append(notes_html)
    
    # Combine all sections
    full_html = f"""
    <!DOCTYPE html>
    <html dir="rtl" lang="fa">
    <head>
        <meta charset="UTF-8">
        <title>گزارش کار</title>
    </head>
    <body>
        {'<br/>'.join(sections_html)}
    </body>
    </html>
    """
    
    return full_html


def get_pdf_css():
    """Get CSS styles for PDF"""
    # Try to ensure font is available locally
    font_file = _ensure_vazir_font()
    
    # Build font-face declaration  
    if font_file and font_file.exists():
        # Use relative path - will be resolved via base_url in HTML
        font_filename = font_file.name  # 'Vazir-Regular.ttf'
        font_face = f"""
    @font-face {{
        font-family: 'Vazir';
        src: url('./{font_filename}') format('truetype');
        font-weight: normal;
        font-style: normal;
    }}"""
        font_family = "'Vazir', 'DejaVu Sans', 'Tahoma', 'Arial Unicode MS', 'Segoe UI', 'Arial', sans-serif"
    else:
        # Fallback to external URL
        font_face = """
    @font-face {
        font-family: 'Vazir';
        src: url('https://cdn.jsdelivr.net/gh/rastikerdar/vazirfont@v30.1.0/dist/Vazir-Regular.ttf') format('truetype');
        font-weight: normal;
        font-style: normal;
    }"""
        font_family = "'Vazir', 'DejaVu Sans', 'Tahoma', 'Arial Unicode MS', 'Segoe UI', 'Arial', sans-serif"
    
    css_content = font_face + """
    @page {
        size: A4;
        margin: 2cm;
    }
    
    body {
        font-family: """ + font_family + """;
        font-size: 12pt;
        line-height: 1.6;
        direction: rtl;
        text-align: right;
        unicode-bidi: embed;
    }
    
    h2 {
        font-size: 18pt;
        margin-bottom: 10pt;
        color: #2c3e50;
        border-bottom: 2pt solid #3498db;
        padding-bottom: 5pt;
    }
    
    h3 {
        font-size: 14pt;
        margin-top: 15pt;
        margin-bottom: 10pt;
        color: #34495e;
    }
    
    .period-info {
        margin-bottom: 20pt;
    }
    
    .user-info, .domain-info {
        margin-bottom: 15pt;
        padding: 10pt;
        background-color: #ecf0f1;
        border-right: 4pt solid #3498db;
    }
    
    .section {
        margin-bottom: 20pt;
        page-break-inside: avoid;
    }
    
    ul {
        margin: 10pt 0;
        padding-right: 25pt;
    }
    
    li {
        margin-bottom: 8pt;
    }
    
    table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10pt;
        font-size: 10pt;
    }
    
    th, td {
        border: 1pt solid #bdc3c7;
        padding: 6pt;
        text-align: right;
    }
    
    th {
        background-color: #3498db;
        color: white;
        font-weight: bold;
    }
    
    tr:nth-child(even) {
        background-color: #f8f9fa;
    }
    
    strong {
        color: #2c3e50;
    }
    
    em {
        color: #7f8c8d;
        font-style: italic;
    }
    """
    return CSS(string=css_content)
