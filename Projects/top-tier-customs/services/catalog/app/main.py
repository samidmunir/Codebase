from fastapi import FastAPI
from app.api.v1.routes.health import router

app = FastAPI(
    title = 'Top Tier Customs Catalog API',
    description = 'Catalog microservice for Products and Services CRUD',
    version = '1.0.0'
)

app.include_router(router, prefix = '/api/v0')