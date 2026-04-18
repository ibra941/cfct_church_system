# Translation middleware
from django.utils import translation
class LanguageMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
    def __call__(self, request):
        language = request.headers.get('Accept-Language', 'sw')
        translation.activate(language)
        response = self.get_response(request)
        return response
