from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import boto3
import psycopg2
from psycopg2.extras import RealDictCursor
from jose import jwt, JWTError
import requests
import time

app = FastAPI()

# --- CONFIGURACIÓN ---
COGNITO_REGION = "us-east-1"
USER_POOL_ID = os.environ.get("USER_POOL_ID") 
APP_CLIENT_ID = os.environ.get("APP_CLIENT_ID")

JWKS_URL = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{USER_POOL_ID}/.well-known/jwks.json"

DB_SECRET_ARN = os.environ.get("DB_SECRET_ARN")
DB_HOST = os.environ.get("DB_HOST")
DB_NAME = "postgres"
DB_USER = "postgres"

# --- CLIENTES AWS ---
secrets_client = boto3.client("secretsmanager", region_name=COGNITO_REGION)
# Nuevo cliente para gestionar usuarios (requiere los permisos que acabamos de dar en IAM)
cognito_client = boto3.client("cognito-idp", region_name=COGNITO_REGION)

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELOS DE DATOS ---
class RoleRequest(BaseModel):
    email: str
    role: str  # 'Labs', 'Doctors', 'Patients'

# --- UTILIDADES ---
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

async def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Falta header de autorización")

    token = authorization.replace("Bearer ", "")
    
    try:
        # Descargar llaves públicas (cachear esto en producción)
        jwks = requests.get(JWKS_URL).json()
        
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

        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            audience=APP_CLIENT_ID,
            issuer=f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{USER_POOL_ID}"
        )
        
        return payload 

    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Token inválido: {str(e)}")
    except Exception as e:
        print(f"Error Auth: {e}")
        raise HTTPException(status_code=401, detail="Error de autenticación interno")

# --- ENDPOINTS ---

@app.get("/")
def read_root():
    return {"message": "HealthTrends Pro API Running"}

# === NUEVO: ENDPOINT ADMINISTRATIVO ===
@app.post("/admin/assign-role")
def assign_role(request: RoleRequest, user: dict = Depends(get_current_user)):
    # 1. Verificar que quien llama sea un Admin
    groups = user.get("cognito:groups", [])
    if "Admins" not in groups:
        raise HTTPException(status_code=403, detail="⛔ Acceso Denegado: Se requieren permisos de Administrador.")

    # 2. Validar que el rol sea válido
    valid_roles = ["Labs", "Doctors", "Patients", "Admins"]
    if request.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Rol inválido. Use: {valid_roles}")

    # 3. Llamar a AWS Cognito para añadir al usuario al grupo
    try:
        # Primero buscamos al usuario por email para obtener su Username real (Cognito a veces usa UUIDs)
        # Nota: Asumimos que el email es único y verificado.
        response = cognito_client.list_users(
            UserPoolId=USER_POOL_ID,
            Filter=f'email = "{request.email}"',
            Limit=1
        )
        
        if not response['Users']:
            raise HTTPException(status_code=404, detail="Usuario no encontrado con ese email.")
            
        username = response['Users'][0]['Username']

        # Añadir al grupo
        cognito_client.admin_add_user_to_group(
            UserPoolId=USER_POOL_ID,
            Username=username,
            GroupName=request.role
        )
        
        return {"message": f"✅ Éxito: Usuario {request.email} añadido al grupo {request.role}"}

    except Exception as e:
        print(f"Error asignando rol: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno de Cognito: {str(e)}")


# === ENDPOINTS REGULARES ===

@app.get("/patients")
def list_patients(user: dict = Depends(get_current_user)):
    groups = user.get("cognito:groups", [])
    if "Doctors" not in groups and "Labs" not in groups and "Admins" not in groups:
        raise HTTPException(status_code=403, detail="Acceso denegado.")

    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("SELECT DISTINCT patient_id FROM lab_results ORDER BY patient_id;")
            results = cursor.fetchall()
            return [row['patient_id'] for row in results]
    finally:
        conn.close()

@app.get("/patient/{patient_id}/dashboard")
def get_patient_dashboard(patient_id: str, user: dict = Depends(get_current_user)):
    groups = user.get("cognito:groups", [])
    
    # Admin y Doctores ven todo. Pacientes solo lo suyo.
    if "Patients" in groups and "Doctors" not in groups and "Admins" not in groups:
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

@app.get("/patient/{patient_id}/trends/{test_code}")
def get_patient_trends(patient_id: str, test_code: str, user: dict = Depends(get_current_user)):
    groups = user.get("cognito:groups", [])
    if "Patients" in groups and "Doctors" not in groups and "Admins" not in groups:
        user_patient_id = user.get("custom:patient_id")
        if user_patient_id != patient_id:
             raise HTTPException(status_code=403, detail="No puedes ver datos de otros pacientes.")

    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            sql = """
            SELECT test_date, value, unit,
                AVG(value) OVER (ORDER BY test_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) as moving_avg_3_points
            FROM lab_results
            WHERE patient_id = %s AND test_code = %s
            ORDER BY test_date ASC;
            """
            cursor.execute(sql, (patient_id, test_code))
            results = cursor.fetchall()
            return {"patient_id": patient_id, "test_code": test_code, "history": results}
    finally:
        conn.close()