import os
import psycopg2
import random
from datetime import datetime, timedelta
from psycopg2.extras import RealDictCursor

# Configuración (Tomará las variables de entorno del contenedor)
DB_HOST = os.environ.get("DB_HOST")
DB_NAME = os.environ.get("DB_NAME", "postgres")
DB_USER = os.environ.get("DB_USER", "postgres")
# NOTA: En ECS, la contraseña suele inyectarse o obtenerse via Secrets Manager. 
# Si el contenedor usa Boto3 para la pass, este script necesitaría esa lógica. 
# Asumiré que el entorno ya tiene acceso o usaremos la lógica de tu `database.py`.

# --- IMPORTANTE: Si tu proyecto usa `database.py` para conectar, úsalo ---
# Intentaremos importar tu función de conexión existente para no reescribir la auth
try:
    from database import get_db_connection
except ImportError:
    # Fallback si se ejecuta fuera de contexto, pero en ECS debería funcionar
    print("⚠️ No se pudo importar get_db_connection, asegúrate de correr esto donde 'database.py' sea visible.")
    exit(1)

# Datos del Paciente
TARGET_EMAIL = "oliver.suarez@itzamna.tech"
TEST_CODE = "WBC"  # White Blood Cells
TEST_NAME = "Globulos Blancos"
UNIT = "10^3/uL"

def generate_data():
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # 1. Buscar el ID del paciente usando el email
            print(f"🔍 Buscando paciente con email: {TARGET_EMAIL}...")
            cur.execute("SELECT patient_id FROM patient_profiles WHERE email = %s", (TARGET_EMAIL,))
            user = cur.fetchone()
            
            if not user:
                print("❌ Error: Paciente no encontrado en la tabla 'patient_profiles'.")
                print("   Asegúrate de haber iniciado sesión con este usuario al menos una vez.")
                return

            patient_id = user['patient_id']
            print(f"✅ Paciente encontrado. ID: {patient_id}")

            # 2. Generar datos desde 2010 hasta hoy
            start_date = datetime(2010, 1, 1)
            end_date = datetime.now()
            current_date = start_date

            records_to_insert = []
            
            print("🚀 Generando datos históricos...")
            while current_date <= end_date:
                # Generar un dato cada ~2 meses (aleatorio)
                days_skip = random.randint(30, 90)
                current_date += timedelta(days=days_skip)
                
                if current_date > end_date:
                    break

                # Valor aleatorio realista para Glóbulos Blancos (4.5 - 11.0 es normal)
                # Agregamos algo de "ruido" para que la gráfica se vea interesante
                base_value = random.uniform(4.5, 11.0)
                
                # Ocasionalmente un valor anormal
                if random.random() < 0.1: 
                    base_value = random.uniform(11.5, 14.0) # Infección leve

                records_to_insert.append((
                    patient_id, 
                    TEST_CODE, 
                    TEST_NAME, 
                    round(base_value, 2), 
                    UNIT, 
                    current_date
                ))

            # 3. Insertar masivamente
            query = """
                INSERT INTO lab_results (patient_id, test_code, test_name, value, unit, test_date)
                VALUES (%s, %s, %s, %s, %s, %s)
            """
            cur.executemany(query, records_to_insert)
            conn.commit()
            print(f"🎉 ¡Éxito! Se insertaron {len(records_to_insert)} registros históricos para {TEST_NAME}.")

    except Exception as e:
        print(f"❌ Error crítico: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    generate_data()