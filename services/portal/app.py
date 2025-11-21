from fastapi import FastAPI, HTTPException
# 1. IMPORTAR EL MIDDLEWARE
from fastapi.middleware.cors import CORSMiddleware
import os
import boto3
import json
import psycopg2
from psycopg2.extras import RealDictCursor

app = FastAPI()

# 2. CONFIGURAR CORS (¡ESTO ES LO NUEVO!)
# Esto permite que tu localhost hable con el servidor
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permite CUALQUIER origen (localhost, vercel, etc.)
    allow_credentials=True,
    allow_methods=["*"],  # Permite GET, POST, PUT, DELETE...
    allow_headers=["*"],  # Permite cualquier header
)

# --- Configuración ---
DB_SECRET_ARN = os.environ.get("DB_SECRET_ARN")
DB_HOST = os.environ.get("DB_HOST")
DB_NAME = "postgres"
DB_USER = "postgres"

secrets_client = boto3.client("secretsmanager", region_name="us-east-1")

def get_db_connection():
    """Obtiene conexión a la BD usando el secreto."""
    try:
        response = secrets_client.get_secret_value(SecretId=DB_SECRET_ARN)
        password = response['SecretString']
        
        conn = psycopg2.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=password,
            connect_timeout=5
        )
        return conn
    except Exception as e:
        print(f"Error de conexión: {e}")
        raise HTTPException(status_code=500, detail="Error conectando a la base de datos")

@app.get("/")
def read_root():
    return {"message": "HealthTrends API is running!"}

@app.get("/patient/{patient_id}/dashboard")
def get_patient_dashboard(patient_id: str):
    """Obtiene el último valor de cada test para un paciente (Dashboard)."""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            sql = """
            SELECT DISTINCT ON (test_code)
                test_code, test_name, value, unit, test_date
            FROM lab_results
            WHERE patient_id = %s
            ORDER BY test_code, test_date DESC;
            """
            cursor.execute(sql, (patient_id,))
            results = cursor.fetchall()
            return {"patient_id": patient_id, "dashboard": results}
    finally:
        conn.close()

@app.get("/patient/{patient_id}/trends/{test_code}")
def get_patient_trends(patient_id: str, test_code: str):
    """Obtiene el historial completo y calcula el promedio móvil."""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            sql = """
            SELECT 
                test_date, 
                value, 
                unit,
                AVG(value) OVER (
                    ORDER BY test_date 
                    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
                ) as moving_avg_3_points
            FROM lab_results
            WHERE patient_id = %s AND test_code = %s
            ORDER BY test_date ASC;
            """
            cursor.execute(sql, (patient_id, test_code))
            results = cursor.fetchall()
            return {
                "patient_id": patient_id, 
                "test_code": test_code, 
                "history": results
            }
    finally:
        conn.close()