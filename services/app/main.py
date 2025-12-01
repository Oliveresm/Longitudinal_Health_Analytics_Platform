from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import init_db
from .routers import admin, catalog, patients, trends, lab

app = FastAPI(title="HealthTrends Enterprise API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar BD al arrancar
@app.on_event("startup")
def startup_event():
    init_db()

# Registrar Rutas
app.include_router(admin.router, prefix="/admin")       # Rutas de administración
app.include_router(catalog.router, prefix="/catalog")   # Ahora existirá /catalog/tests
app.include_router(patients.router, prefix="/patients") # Ahora existirá /patients/profile
app.include_router(trends.router, prefix="/trends")     # Para tendencias
app.include_router(lab.router) # <--- AGREGAR ESTO

@app.get("/")
def read_root():
    return {"message": "HealthTrends Modular API is Running"}