from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
import os
import boto3
import psycopg2
from psycopg2.extras import RealDictCursor
from jose import jwt, JWTError
import requests
import time

app = FastAPI()

# --- CONFIGURACIÓN (Leída de variables de entorno de ECS) ---
COGNITO_REGION = "us-east-1"
# Terraform nos inyecta estos valores:
USER_POOL_ID = os.environ.get("USER_POOL_ID") 
APP_CLIENT_ID = os.environ.get("APP_CLIENT_ID")

# URL para descargar las llaves públicas de firma de Cognito
JWKS_URL = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{USER_POOL_ID}/.well-known/jwks.json"

# Configuración de Base de Datos
DB_SECRET_ARN = os.environ.get("DB_SECRET_ARN")
DB_HOST = os.environ.get("DB_HOST")
DB_NAME = "postgres"
DB_USER = "postgres"

# --- CORS (Permitir acceso desde React) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

secrets_client = boto3.client("secretsmanager", region_name=COGNITO_REGION)

# --- CONEXIÓN A BASE DE DATOS ---
def get_db_connection():
    try:
        response = secrets_client.get_secret_value(SecretId=DB_SECRET_ARN)
        password = response['SecretString']
        conn = psycopg2.connect(
            host=DB_HOST, database=DB_NAME, user=DB_USER, password=password, connect_timeout=5
        )
        return conn
    except Exception as e:
        print(f"Error BD: {e}")
        raise HTTPException(status_code=500, detail="Error de conexión a base de datos")

# --- SEGURIDAD: VALIDACIÓN DE TOKEN ---
async def get_current_user(authorization: str = Header(None)):
    """
    Verifica que el usuario tenga un token válido de Cognito.
    Retorna los datos del usuario (incluyendo su grupo y ID de paciente).
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Falta header de autorización")

    token = authorization.replace("Bearer ", "")
    
    try:
        # 1. Obtener llaves públicas de Cognito
        jwks = requests.get(JWKS_URL).json()
        
        # 2. Encontrar la llave correcta para este token
        header = jwt.get_unverified_header(token)
        rsa_key = {}
        for key in jwks["keys"]:
            if key["kid"] == header["kid"]:
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "use": key["use"],
                    "n": key["n"],
                    "e": key["e"]
                }
        
        if not rsa_key:
            raise HTTPException(status_code=401, detail="Llave de token no encontrada")

        # 3. Decodificar y validar el token
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            audience=APP_CLIENT_ID,
            issuer=f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{USER_POOL_ID}"
        )
        
        return payload # Éxito: devolvemos los datos del usuario

    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Token inválido: {str(e)}")
    except Exception as e:
        print(f"Error Auth: {e}")
        raise HTTPException(status_code=401, detail="Error de autenticación interno")

# --- ENDPOINTS ---

@app.get("/")
def read_root():
    return {"message": "HealthTrends Secure API is running!"}

# 1. LISTA DE PACIENTES (Solo para Doctores y Labs)
@app.get("/patients")
def list_patients(user: dict = Depends(get_current_user)):
    groups = user.get("cognito:groups", [])
    
    # Validación de Rol
    if "Doctors" not in groups and "Labs" not in groups:
        raise HTTPException(status_code=403, detail="Acceso denegado. Solo doctores o laboratorios.")

    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("SELECT DISTINCT patient_id FROM lab_results ORDER BY patient_id;")
            results = cursor.fetchall()
            # Convertir lista de dicts a lista simple: ["TEST001", "TEST002"]
            return [row['patient_id'] for row in results]
    finally:
        conn.close()

# 2. DASHBOARD (Últimos valores)
@app.get("/patient/{patient_id}/dashboard")
def get_patient_dashboard(patient_id: str, user: dict = Depends(get_current_user)):
    groups = user.get("cognito:groups", [])
    
    # Seguridad: Si es Paciente, solo puede ver SU propio ID
    if "Patients" in groups:
        user_patient_id = user.get("custom:patient_id")
        if user_patient_id != patient_id:
             raise HTTPException(status_code=403, detail="No puedes ver datos de otros pacientes.")

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

# 3. TENDENCIAS (Historial)
@app.get("/patient/{patient_id}/trends/{test_code}")
def get_patient_trends(patient_id: str, test_code: str, user: dict = Depends(get_current_user)):
    # Seguridad (Misma lógica)
    groups = user.get("cognito:groups", [])
    if "Patients" in groups:
        user_patient_id = user.get("custom:patient_id")
        if user_patient_id != patient_id:
             raise HTTPException(status_code=403, detail="No puedes ver datos de otros pacientes.")

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