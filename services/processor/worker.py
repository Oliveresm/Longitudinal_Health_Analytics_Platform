import os
import boto3
import json
import psycopg2 # Biblioteca de Python para conectarse a PostgreSQL
import time

# --- Configuración (leída desde variables de entorno) ---
SQS_QUEUE_URL = os.environ.get("SQS_QUEUE_URL")
DB_SECRET_ARN = os.environ.get("DB_SECRET_ARN") # ARN del secreto de la contraseña de RDS
DB_HOST = os.environ.get("DB_HOST")             # Endpoint de la instancia RDS
DB_NAME = "postgres"  # O el nombre que prefieras, 'postgres' es el por defecto
DB_USER = "postgres"

# --- Clientes de AWS ---
sqs_client = boto3.client("sqs")
secrets_client = boto3.client("secretsmanager")

def get_db_password():
    """Obtiene la contraseña de la BD desde AWS Secrets Manager."""
    print("Obteniendo contraseña de Secrets Manager...")
    try:
        response = secrets_client.get_secret_value(SecretId=DB_SECRET_ARN)
        # SIN json.loads AQUÍ
        return response['SecretString']
    except Exception as e:
        print(f"Error al obtener la contraseña: {e}")
        raise e

def connect_to_db(password):
    """Se conecta a la base de datos RDS PostgreSQL."""
    print(f"Conectando a la BD en host: {DB_HOST}...")
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=password,
            connect_timeout=5
        )
        print("Conexión a la BD exitosa.")
        return conn
    except Exception as e:
        print(f"Error al conectar a la BD: {e}")
        raise e

def process_message(msg, cursor):
    """Procesa un solo mensaje SQS y lo inserta en la BD."""
    try:
        print(f"Procesando mensaje: {msg['MessageId']}")
        body = json.loads(msg['Body'])

        # Asegúrate de que los nombres de las columnas coincidan con tu script SQL
        sql = """
        INSERT INTO lab_results (patient_id, test_code, test_name, value, unit, test_date)
        VALUES (%s, %s, %s, %s, %s, %s);
        """
        
        # Asume que tu script 'setup_database.sql' (que crearemos después)
        # crea una tabla con estas columnas.
        # (Ajusta los 'get' si tu JSON es diferente)
        params = (
            body.get('patient_id'),
            body.get('test_code'),
            body.get('test_name'),
            body.get('value'),
            body.get('unit'),
            body.get('test_date') # Asegúrate de que la Lambda de ingesta lo añada o ya venga
        )
        
        cursor.execute(sql, params)
        print(f"Mensaje {msg['MessageId']} insertado.")
        return True
    except Exception as e:
        print(f"Error al procesar mensaje {msg['MessageId']}: {e}")
        return False

def main_loop():
    """El bucle principal del worker."""

    print("Iniciando worker...")
    print("Iniciando worker... VERSION 2 (CORREGIDA)")
    
    # 1. Obtener contraseña y conectar a la BD (solo una vez al inicio)
    db_password = get_db_password()
    db_conn = connect_to_db(db_password)
    
    while True:
        try:
            print("Buscando mensajes en SQS...")
            
            # 2. Pedir mensajes a SQS
            response = sqs_client.receive_message(
                QueueUrl=SQS_QUEUE_URL,
                MaxNumberOfMessages=10, # Procesar en lotes de 10
                WaitTimeSeconds=20      # Espera 20 segundos por mensajes (Long Polling)
            )

            messages = response.get("Messages", [])
            
            if not messages:
                print("No hay mensajes, volviendo a esperar.")
                continue

            print(f"Recibidos {len(messages)} mensajes.")
            
            # 3. Procesar mensajes en una transacción
            with db_conn.cursor() as cursor:
                receipt_handles = [] # Lista de mensajes a borrar
                
                for msg in messages:
                    if process_message(msg, cursor):
                        receipt_handles.append(msg['ReceiptHandle'])

                # 4. Confirmar la transacción a la BD
                db_conn.commit()
                print("Lote de mensajes confirmado en la BD.")

                # 5. Borrar mensajes de SQS
                if receipt_handles:
                    print(f"Borrando {len(receipt_handles)} mensajes de SQS.")
                    for handle in receipt_handles:
                        sqs_client.delete_message(
                            QueueUrl=SQS_QUEUE_URL,
                            ReceiptHandle=handle
                        )

        except (psycopg2.OperationalError, psycopg2.InterfaceError) as e:
            print(f"Error de conexión a la BD: {e}. Reconectando...")
            # Si la conexión a la BD se pierde, vuelve a conectar
            db_conn.close()
            db_conn = connect_to_db(db_password)
            
        except Exception as e:
            print(f"Error en el bucle principal: {e}")
            time.sleep(5) # Esperar un poco antes de reintentar

# ... (Todo el código de arriba se queda IGUAL, no lo cambies) ...

# ... (Funciones get_db_password, connect_to_db, process_message, main_loop IGUALES) ...

if __name__ == "__main__":
    # --- Script para crear las tablas (Tarea 11.1) ---
    try:
        password = get_db_password()
        connection = connect_to_db(password)
        with connection.cursor() as c:
            print("Verificando tablas en la base de datos...")
            
            # 1. Tabla de Resultados (Ya existía)
            c.execute("""
            CREATE TABLE IF NOT EXISTS lab_results (
                id SERIAL PRIMARY KEY,
                patient_id VARCHAR(100),
                test_code VARCHAR(50),
                test_name VARCHAR(150),
                value NUMERIC(10, 2),
                unit VARCHAR(30),
                test_date TIMESTAMP,
                ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """)
            
            # 2. NUEVA TABLA: Perfiles de Pacientes
            # Aquí guardaremos lo que capturemos en el registro
            c.execute("""
            CREATE TABLE IF NOT EXISTS patient_profiles (
                patient_id VARCHAR(100) PRIMARY KEY, -- El email o username de Cognito
                full_name VARCHAR(200),
                dob DATE,
                gender VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """)
            
            connection.commit()
            print("✅ Tablas 'lab_results' y 'patient_profiles' listas.")
            
        connection.close()

        # Iniciar el bucle del worker
        main_loop()
        
    except Exception as e:
        print(f"Error crítico al iniciar el worker: {e}")
        exit(1)