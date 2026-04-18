from rest_framework import viewsets, generics, permissions, status
from rest_framework.response import Response
from django.http import HttpResponse
from .models import Report
from .serializers import ReportSerializer
from .export import export_to_excel, export_to_csv, export_to_pdf

class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Report.objects.filter(church=self.request.user.church)

class GenerateReportView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        report_type = request.data.get('report_type')
        format_type = request.data.get('format', 'pdf')
        parameters = request.data.get('parameters', {})
        
        if format_type == 'excel':
            file = export_to_excel(report_type, parameters)
        elif format_type == 'csv':
            file = export_to_csv(report_type, parameters)
        else:
            file = export_to_pdf(report_type, parameters)
        
        report = Report.objects.create(
            title=f"{report_type}_report_{request.user.username}",
            report_type=report_type,
            format=format_type,
            church=request.user.church,
            generated_by=request.user,
            parameters=parameters,
            file=file
        )
        
        return Response({'message': 'Report generated', 'id': report.id})

class ExportReportView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, report_type):
        format_type = request.query_params.get('format', 'pdf')
        parameters = request.query_params.dict()
        
        if format_type == 'excel':
            file_data, filename = export_to_excel(report_type, parameters)
            content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        elif format_type == 'csv':
            file_data, filename = export_to_csv(report_type, parameters)
            content_type = 'text/csv'
        else:
            file_data, filename = export_to_pdf(report_type, parameters)
            content_type = 'application/pdf'
        
        response = HttpResponse(file_data, content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response