from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(['GET'])
def health(request):
    return Response({
        'ok': True,
        'source': '<api.v0.catalog>: health()',
        'message': '/api/v0/catalog is live on localhost:8082'
    })