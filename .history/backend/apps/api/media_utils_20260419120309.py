def build_absolute_media_url(request, value):
    if not value:
        return None

    if hasattr(value, 'url'):
        value = value.url

    value = str(value)
    if value.startswith(('http://', 'https://')):
        return value

    if request is not None:
        return request.build_absolute_uri(value)

    return value


def normalize_media_list(request, values):
    if not values:
        return []

    if isinstance(values, str):
        values = [values]

    normalized = []
    for item in values:
        candidate = item
        if isinstance(item, dict):
            candidate = item.get('url') or item.get('image') or item.get('src') or item.get('path')

        absolute_url = build_absolute_media_url(request, candidate)
        if absolute_url:
            normalized.append(absolute_url)

    return normalized