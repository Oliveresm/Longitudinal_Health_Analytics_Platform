import boto3
import requests
import pytest
import os
from dotenv import load_dotenv

# 1. Cargar variables de entorno desde el archivo .env
# Esto busca un archivo llamado .env en la misma carpeta o superiores
load_dotenv()

# --- CONFIGURACIÓN ---
# Ahora leemos todo del archivo .env en lugar de escribirlo aquí
API_URL = os.getenv("API_URL")
REGION = os.getenv("AWS_REGION")
CLIENT_ID = os.getenv("COGNITO_CLIENT_ID")
USERNAME = os.getenv("TEST_USERNAME")
PASSWORD = os.getenv("TEST_PASSWORD")

# Validación preventiva: Si falta algo en el .env, avisamos antes de empezar
if not all([API_URL, REGION, CLIENT_ID, USERNAME, PASSWORD]):
    missing = []
    if not API_URL: missing.append("API_URL")
    if not CLIENT_ID: missing.append("COGNITO_CLIENT_ID")
    if not PASSWORD: missing.append("TEST_PASSWORD")
    pytest.exit(f"❌ Error de Configuración: Faltan variables en el archivo .env: {', '.join(missing)}")

@pytest.fixture(scope="session")
def auth_token():
    """
    Esta función se ejecuta UNA vez antes de todos los tests.
    Se conecta a AWS Cognito y obtiene un Token JWT válido.
    """
    client = boto3.client("cognito-idp", region_name=REGION)
    
    try:
        print(f"\n🔐 Autenticando usuario: {USERNAME}...")
        response = client.initiate_auth(
            ClientId=CLIENT_ID,
            AuthFlow="USER_PASSWORD_AUTH",
            AuthParameters={
                "USERNAME": USERNAME,
                "PASSWORD": PASSWORD,
            },
        )
        # Retornamos el ID Token que es el que usa tu Backend
        print("✅ Token obtenido exitosamente.")
        return response["AuthenticationResult"]["IdToken"]
    except Exception as e:
        pytest.fail(f"❌ No se pudo autenticar con Cognito: {str(e)}")

@pytest.fixture
def api_headers(auth_token):
    """Crea los headers con el token para las peticiones"""
    return {
        "Authorization": auth_token,
        "Content-Type": "application/json"
    }

# --- TESTS DE ENDPOINTS ---

def test_health_check():
    """Verifica que el servidor esté vivo (sin autenticación)"""
    # Usamos /docs o /openapi.json que suelen ser públicos en FastAPI
    url = f"{API_URL}/docs"
    print(f"\nProbando: {url}")
    try:
        response = requests.get(url, timeout=5)
        assert response.status_code == 200, "El servidor no responde en /docs"
    except requests.exceptions.ConnectionError:
        pytest.fail(f"❌ No se pudo conectar a {url}. Verifica que el ALB sea correcto.")

def test_get_catalog_tests(api_headers):
    """Verifica que podamos descargar el catálogo de exámenes"""
    url = f"{API_URL}/catalog/tests"
    print(f"\nProbando: {url}")
    
    response = requests.get(url, headers=api_headers)
    
    # 1. Validar Status 200
    assert response.status_code == 200, f"Falló con {response.status_code}: {response.text}"
    
    # 2. Validar que sea una lista JSON
    data = response.json()
    assert isinstance(data, list), "El catálogo debería ser una lista"
    
    # 3. Validar estructura de un item (si hay datos)
    if len(data) > 0:
        item = data[0]
        assert "code" in item, "El item del catálogo no tiene 'code'"
        assert "name" in item, "El item del catálogo no tiene 'name'"

def test_get_patients_list(api_headers):
    """Verifica que podamos ver la lista de pacientes (Requiere Rol Doctor)"""
    url = f"{API_URL}/patients"
    print(f"\nProbando: {url}")
    
    response = requests.get(url, headers=api_headers)
    
    assert response.status_code == 200, f"Falló con {response.status_code}. ¿Tienes rol de Doctor?"
    data = response.json()
    assert isinstance(data, list), "La respuesta de pacientes debe ser una lista"
    print(f"✅ Se encontraron {len(data)} pacientes.")

def test_create_patient_profile(api_headers):
    """Prueba crear/actualizar un perfil (Smoke Test)"""
    url = f"{API_URL}/patients/profile"
    payload = {
        "full_name": "Test Automation User",
        "dob": "1990-01-01",
        "gender": "M"
    }
    
    response = requests.post(url, json=payload, headers=api_headers)
    assert response.status_code == 200 or response.status_code == 201
    assert "message" in response.json()