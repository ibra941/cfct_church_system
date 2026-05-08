import csv
from io import StringIO
from io import BytesIO

from django.db.models import Q, Sum
from django.utils import timezone

from apps.accounts.models import User
from apps.churches.models import Church
from apps.departments.models import Department
from apps.events.models import Event
from apps.offerings.models import Offering


def _report_rows(report_type, parameters):
    return [
        ['Report', f'{report_type} report'],
        ['Generated', 'Yes'],
        ['Parameters', str(parameters)],
    ]


def _safe_amount(value):
    return float(value or 0)


def _district_report_payload(parameters):
    district_id = parameters.get('district_id') or parameters.get('church_id')
    if not district_id:
        return {
            'district_name': 'District',
            'generated_at': timezone.now(),
            'totals': {'members': 0, 'offerings': 0.0, 'events': 0, 'departments': 0, 'local_churches': 0},
            'churches': [],
            'notes': 'No district_id provided.',
        }

    try:
        district = Church.objects.get(id=district_id, church_type='district')
    except Church.DoesNotExist:
        return {
            'district_name': 'Unknown District',
            'generated_at': timezone.now(),
            'totals': {'members': 0, 'offerings': 0.0, 'events': 0, 'departments': 0, 'local_churches': 0},
            'churches': [],
            'notes': 'District not found.',
        }

    now = timezone.now()
    local_churches = Church.objects.filter(parent_church=district, church_type='local').order_by('name')

    rows = []
    totals = {'members': 0, 'offerings': 0.0, 'events': 0, 'departments': 0, 'local_churches': local_churches.count()}

    for church in local_churches:
        members = User.objects.filter(church=church, role__in=['local_member', 'local_leader'], is_active=True).count()
        offerings = _safe_amount(Offering.objects.filter(church=church).aggregate(total=Sum('amount'))['total'])
        events = Event.objects.filter(church=church, is_active=True).filter(
            Q(end_date__gte=now) | Q(end_date__isnull=True, start_date__gte=now)
        ).count()
        departments = Department.objects.filter(church=church, is_active=True).count()
        pastor = User.objects.filter(church=church, role='local_leader', is_active=True).order_by('created_at').first()

        rows.append(
            {
                'church_name': church.name,
                'pastor_name': pastor.get_full_name() if pastor else '',
                'pastor_email': pastor.email if pastor else '',
                'members': members,
                'offerings': offerings,
                'events': events,
                'departments': departments,
            }
        )

        totals['members'] += members
        totals['offerings'] += offerings
        totals['events'] += events
        totals['departments'] += departments

    return {
        'district_name': district.name,
        'generated_at': timezone.now(),
        'totals': totals,
        'churches': rows,
        'notes': '',
    }


def _zone_report_payload(parameters):
    zone_id = parameters.get('zone_id') or parameters.get('church_id')
    if not zone_id:
        return {
            'zone_name': 'Zone',
            'generated_at': timezone.now(),
            'totals': {'members': 0, 'offerings': 0.0, 'events': 0, 'regions': 0, 'districts': 0, 'locals': 0},
            'regions': [],
            'notes': 'No zone_id provided.',
        }

    try:
        zone = Church.objects.get(id=zone_id, church_type='zone')
    except Church.DoesNotExist:
        return {
            'zone_name': 'Unknown Zone',
            'generated_at': timezone.now(),
            'totals': {'members': 0, 'offerings': 0.0, 'events': 0, 'regions': 0, 'districts': 0, 'locals': 0},
            'regions': [],
            'notes': 'Zone not found.',
        }

    now = timezone.now()
    regions = Church.objects.filter(parent_church=zone, church_type='region').order_by('name')
    rows = []
    totals = {'members': 0, 'offerings': 0.0, 'events': 0, 'regions': regions.count(), 'districts': 0, 'locals': 0}

    for region in regions:
        districts = Church.objects.filter(parent_church=region, church_type='district')
        locals_qs = Church.objects.filter(parent_church__in=districts, church_type='local')
        region_scope = Church.objects.filter(
            Q(id=region.id) | Q(parent_church=region) | Q(parent_church__parent_church=region)
        )

        members = User.objects.filter(church__in=region_scope, role__in=['local_member', 'local_leader'], is_active=True).count()
        offerings = _safe_amount(Offering.objects.filter(church__in=region_scope).aggregate(total=Sum('amount'))['total'])
        events = Event.objects.filter(church__in=region_scope, is_active=True).filter(
            Q(end_date__gte=now) | Q(end_date__isnull=True, start_date__gte=now)
        ).count()
        regional_leader = User.objects.filter(church=region, role='regional_leader', is_active=True).order_by('created_at').first()

        row = {
            'region_name': region.name,
            'regional_leader_name': regional_leader.get_full_name() if regional_leader else '',
            'regional_leader_email': regional_leader.email if regional_leader else '',
            'districts': districts.count(),
            'locals': locals_qs.count(),
            'members': members,
            'offerings': offerings,
            'events': events,
        }
        rows.append(row)

        totals['districts'] += row['districts']
        totals['locals'] += row['locals']
        totals['members'] += members
        totals['offerings'] += offerings
        totals['events'] += events

    return {
        'zone_name': zone.name,
        'generated_at': timezone.now(),
        'totals': totals,
        'regions': rows,
        'notes': '',
    }

def export_to_excel(report_type, parameters):
    """Export data to Excel format."""
    try:
        from openpyxl import Workbook
    except ImportError as exc:
        raise RuntimeError('Excel export requires openpyxl to be installed.') from exc

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = 'Report'

    if report_type == 'district':
        payload = _district_report_payload(parameters)
        sheet.append(['District Report'])
        sheet.append(['District', payload['district_name']])
        sheet.append(['Generated At', payload['generated_at'].strftime('%Y-%m-%d %H:%M:%S')])
        if payload['notes']:
            sheet.append(['Notes', payload['notes']])
        sheet.append([])
        sheet.append(['Local Church', 'Pastor', 'Pastor Email', 'Members', 'Offerings', 'Events', 'Departments'])
        for row in payload['churches']:
            sheet.append([
                row['church_name'],
                row['pastor_name'],
                row['pastor_email'],
                row['members'],
                row['offerings'],
                row['events'],
                row['departments'],
            ])
        sheet.append([])
        sheet.append(['Total Local Churches', payload['totals']['local_churches']])
        sheet.append(['Total Members', payload['totals']['members']])
        sheet.append(['Total Offerings', payload['totals']['offerings']])
        sheet.append(['Total Events', payload['totals']['events']])
        sheet.append(['Total Departments', payload['totals']['departments']])
    elif report_type == 'zone':
        payload = _zone_report_payload(parameters)
        sheet.append(['Zone Report'])
        sheet.append(['Zone', payload['zone_name']])
        sheet.append(['Generated At', payload['generated_at'].strftime('%Y-%m-%d %H:%M:%S')])
        if payload['notes']:
            sheet.append(['Notes', payload['notes']])
        sheet.append([])
        sheet.append(['Region', 'Regional Leader', 'Leader Email', 'Districts', 'Local Churches', 'Members', 'Offerings', 'Events'])
        for row in payload['regions']:
            sheet.append([
                row['region_name'],
                row['regional_leader_name'],
                row['regional_leader_email'],
                row['districts'],
                row['locals'],
                row['members'],
                row['offerings'],
                row['events'],
            ])
        sheet.append([])
        sheet.append(['Total Regions', payload['totals']['regions']])
        sheet.append(['Total Districts', payload['totals']['districts']])
        sheet.append(['Total Local Churches', payload['totals']['locals']])
        sheet.append(['Total Members', payload['totals']['members']])
        sheet.append(['Total Offerings', payload['totals']['offerings']])
        sheet.append(['Total Events', payload['totals']['events']])
    else:
        for row in _report_rows(report_type, parameters):
            sheet.append(row)

    output = BytesIO()
    workbook.save(output)
    output.seek(0)
    return output, f'{report_type}_report.xlsx'

def export_to_csv(report_type, parameters):
    """Export data to CSV format."""
    text_buffer = StringIO()
    writer = csv.writer(text_buffer)

    if report_type == 'district':
        payload = _district_report_payload(parameters)
        writer.writerow(['District Report'])
        writer.writerow(['District', payload['district_name']])
        writer.writerow(['Generated At', payload['generated_at'].strftime('%Y-%m-%d %H:%M:%S')])
        if payload['notes']:
            writer.writerow(['Notes', payload['notes']])
        writer.writerow([])
        writer.writerow(['Local Church', 'Pastor', 'Pastor Email', 'Members', 'Offerings', 'Events', 'Departments'])
        for row in payload['churches']:
            writer.writerow([
                row['church_name'],
                row['pastor_name'],
                row['pastor_email'],
                row['members'],
                row['offerings'],
                row['events'],
                row['departments'],
            ])
        writer.writerow([])
        writer.writerow(['Total Local Churches', payload['totals']['local_churches']])
        writer.writerow(['Total Members', payload['totals']['members']])
        writer.writerow(['Total Offerings', payload['totals']['offerings']])
        writer.writerow(['Total Events', payload['totals']['events']])
        writer.writerow(['Total Departments', payload['totals']['departments']])
    elif report_type == 'zone':
        payload = _zone_report_payload(parameters)
        writer.writerow(['Zone Report'])
        writer.writerow(['Zone', payload['zone_name']])
        writer.writerow(['Generated At', payload['generated_at'].strftime('%Y-%m-%d %H:%M:%S')])
        if payload['notes']:
            writer.writerow(['Notes', payload['notes']])
        writer.writerow([])
        writer.writerow(['Region', 'Regional Leader', 'Leader Email', 'Districts', 'Local Churches', 'Members', 'Offerings', 'Events'])
        for row in payload['regions']:
            writer.writerow([
                row['region_name'],
                row['regional_leader_name'],
                row['regional_leader_email'],
                row['districts'],
                row['locals'],
                row['members'],
                row['offerings'],
                row['events'],
            ])
        writer.writerow([])
        writer.writerow(['Total Regions', payload['totals']['regions']])
        writer.writerow(['Total Districts', payload['totals']['districts']])
        writer.writerow(['Total Local Churches', payload['totals']['locals']])
        writer.writerow(['Total Members', payload['totals']['members']])
        writer.writerow(['Total Offerings', payload['totals']['offerings']])
        writer.writerow(['Total Events', payload['totals']['events']])
    else:
        writer.writerow(['Field', 'Value'])
        writer.writerows(_report_rows(report_type, parameters))

    output = BytesIO()
    output.write(text_buffer.getvalue().encode('utf-8'))
    output.seek(0)
    return output, f'{report_type}_report.csv'

def export_to_pdf(report_type, parameters):
    """Export data to PDF format."""
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib import colors
    except ImportError as exc:
        raise RuntimeError('PDF export requires reportlab to be installed.') from exc

    output = BytesIO()
    doc = SimpleDocTemplate(output, pagesize=letter)
    styles = getSampleStyleSheet()
    
    elements = []
    elements.append(Paragraph(f"{report_type.upper()} REPORT", styles['Title']))

    if report_type == 'district':
        payload = _district_report_payload(parameters)
        elements.append(Paragraph(f"District: {payload['district_name']}", styles['Normal']))
        elements.append(Paragraph(f"Generated: {payload['generated_at'].strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
        if payload['notes']:
            elements.append(Paragraph(f"Notes: {payload['notes']}", styles['Normal']))

        data = [['Local Church', 'Pastor', 'Members', 'Offerings', 'Events', 'Departments']]
        for row in payload['churches']:
            data.append([
                row['church_name'],
                row['pastor_name'] or '-',
                str(row['members']),
                f"{row['offerings']:.2f}",
                str(row['events']),
                str(row['departments']),
            ])
        data.append(['TOTAL', '', str(payload['totals']['members']), f"{payload['totals']['offerings']:.2f}", str(payload['totals']['events']), str(payload['totals']['departments'])])
    elif report_type == 'zone':
        payload = _zone_report_payload(parameters)
        elements.append(Paragraph(f"Zone: {payload['zone_name']}", styles['Normal']))
        elements.append(Paragraph(f"Generated: {payload['generated_at'].strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
        if payload['notes']:
            elements.append(Paragraph(f"Notes: {payload['notes']}", styles['Normal']))

        data = [['Region', 'Regional Leader', 'Districts', 'Locals', 'Members', 'Offerings', 'Events']]
        for row in payload['regions']:
            data.append([
                row['region_name'],
                row['regional_leader_name'] or '-',
                str(row['districts']),
                str(row['locals']),
                str(row['members']),
                f"{row['offerings']:.2f}",
                str(row['events']),
            ])
        data.append([
            'TOTAL',
            '',
            str(payload['totals']['districts']),
            str(payload['totals']['locals']),
            str(payload['totals']['members']),
            f"{payload['totals']['offerings']:.2f}",
            str(payload['totals']['events']),
        ])
    else:
        elements.append(Paragraph("Generated Report", styles['Normal']))
        data = [['Report Type', report_type], ['Parameters', str(parameters)]]

    table = Table(data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 14),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    elements.append(table)
    
    doc.build(elements)
    output.seek(0)
    return output, f'{report_type}_report.pdf'