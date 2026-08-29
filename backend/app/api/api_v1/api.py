from fastapi import APIRouter, Depends
from app.api.api_v1.endpoints import auth, users, ventes, rapports, prevendeur, admin, objectifs, distributors, geo
from app.api.deps import get_current_user

api_router = APIRouter()

# Public — no auth required
api_router.include_router(auth.router,  prefix="/auth",  tags=["Auth"])

# Protected — valid JWT required
api_router.include_router(users.router,        prefix="/users",        tags=["Users"],        dependencies=[Depends(get_current_user)])
api_router.include_router(ventes.router,       prefix="/ventes",       tags=["Ventes"],       dependencies=[Depends(get_current_user)])
api_router.include_router(rapports.router,     prefix="/rapports",     tags=["Rapports"],     dependencies=[Depends(get_current_user)])
api_router.include_router(prevendeur.router,   prefix="/prevendeur",   tags=["Prevendeur"],   dependencies=[Depends(get_current_user)])
api_router.include_router(distributors.router, prefix="/distributors", tags=["Distributors"], dependencies=[Depends(get_current_user)])
api_router.include_router(admin.router,        prefix="/admin",        tags=["Admin"])
api_router.include_router(objectifs.router,    prefix="/objectifs",    tags=["Objectifs"],    dependencies=[Depends(get_current_user)])
api_router.include_router(geo.router,          prefix="/geo",          tags=["Geo"],          dependencies=[Depends(get_current_user)])
