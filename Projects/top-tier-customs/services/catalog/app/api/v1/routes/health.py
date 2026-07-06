from fastapi import APIRouter

router = APIRouter(tags = ['Health'])

@router.get("/health")
async def health():
    return {
        'ok': True,
        'source': '<api.v0.catalog>: health()',
        'message': '/api/v0/catalog is live on localhost:8082'
    }