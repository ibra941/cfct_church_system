import csv
from io import StringIO
from io import BytesIO


def _report_rows(report_type, parameters):
    return [
        ['Report', f'{report_type} report'],
        ['Generated', 'Yes'],
        ['Parameters', str(parameters)],
    ]

def export_to_excel(report_type, parameters):
    """Export data to Excel format."""
    try:
        from openpyxl import Workbook
    except ImportError as exc:
        raise RuntimeError('Excel export requires openpyxl to be installed.') from exc

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = 'Report'
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