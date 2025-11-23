import boto3
import psycopg2
from fastapi import HTTPException
from .config import DB_SECRET_ARN, DB_HOST, DB_NAME, DB_USER, COGNITO_REGION

secrets_client = boto3.client("secretsmanager", region_name=COGNITO_REGION)

def get_db_connection():
    try:
        response = secrets_client.get_secret_value(SecretId=DB_SECRET_ARN)
        password = response['SecretString']
        return psycopg2.connect(
            host=DB_HOST, database=DB_NAME, user=DB_USER, password=password, connect_timeout=5
        )
    except Exception as e:
        print(f"Error BD: {e}")
        raise HTTPException(status_code=500, detail="Error de conexión a base de datos")

def init_db():
    """Ejecuta las migraciones iniciales al arrancar"""
    print("🔄 Startup: Verificando tablas...")
    try:
        conn = get_db_connection()
        conn.autocommit = True
        with conn.cursor() as cursor:
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS lab_results (
                id SERIAL PRIMARY KEY, patient_id VARCHAR(100), test_code VARCHAR(50), 
                test_name VARCHAR(150), value NUMERIC(10, 2), unit VARCHAR(30), 
                test_date TIMESTAMP, ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS patient_profiles (
                patient_id VARCHAR(100) PRIMARY KEY, full_name VARCHAR(200), 
                dob DATE, gender VARCHAR(20), email VARCHAR(255), 
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS test_types (
                code VARCHAR(50) PRIMARY KEY, name VARCHAR(150), unit VARCHAR(50)
            );
            """)
            # Seed inicial
            cursor.execute("SELECT COUNT(*) FROM test_types")
            if cursor.fetchone()[0] == 0:
                cursor.execute("INSERT INTO test_types VALUES ('HBA1C', 'Hemoglobina A1c', '%'), ('GLUCOSE', 'Glucosa', 'mg/dL') ON CONFLICT DO NOTHING;")
        conn.close()
        print("✅ Tablas verificadas.")
    except Exception as e:
        print(f"⚠️ Error no crítico en startup: {e}")