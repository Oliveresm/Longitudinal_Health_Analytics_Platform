# Longitudinal Health Analytics Platform

La Longitudinal Health Analytics Platform es una solución nativa de la nube para la ingesta, procesamiento, almacenamiento, visualización y análisis a largo plazo de resultados de laboratorio clínico. Está diseñada con una arquitectura serverless y orientada a eventos utilizando servicios gestionados de AWS (Cognito, API Gateway, Lambda, SQS, RDS PostgreSQL, CloudWatch) y microservicios implementados con FastAPI, desplegados mediante Terraform.

Objetivos clave
- Autenticación segura de pacientes y profesionales a través de AWS Cognito User Pools con RBAC (Patients, Doctors, Labs, Admins).
- Ingestión multi-fuente de resultados clínicos (API Gateway → Lambda Ingest, cargas bulk, SQS, procesador).
- Arquitectura de microservicios aislados: app (lógica de negocio), processor (procesamiento de mensajes), trends (cálculos analíticos).
- Capacidad analítica longitudinal: series temporales, promedios móviles, resúmenes mensuales (materialized views) y alertas de riesgo.
- Infraestructura reproducible con Terraform, incluido VPC, RDS PostgreSQL, colas SQS y recursos de vigilancia.

---

# 📌 1. Descripción del Proyecto

- Seguridad y autenticación:
  - Inicio de sesión mediante Cognito User Pools.
  - Cuatro grupos de usuarios: `Patients`, `Doctors`, `Labs`, `Admins`.
  - Validación de JWT en cada microservicio para control de acceso.

- Ingesta de resultados:
  - API Gateway → Lambda Ingest
  - Cargas bulk desde dashboards de laboratorios
  - Ingesta asíncrona vía **Amazon SQS**
  - Procesador (Worker) que inserta en PostgreSQL

- Microservicios:
  - **services/app**: gestión de usuarios, pacientes, catálogos, envíos de laboratorios, ops administrativas
  - **services/processor**: procesa mensajes SQS e inserta resultados en PostgreSQL
  - **services/trends**: cálculos de promedios móviles, resúmenes mensuales, clasificación de riesgo

- Análisis longitudinal:
  - Consultas de series temporales históricas
  - Análisis de tendencias clínicas
  - Promedios móviles de 3 puntos
  - Resúmenes mensuales y alertas de condiciones clínicas en deterioro

---

# 📌 2. Prerrequisitos

## Requisitos locales
- Python 3.10+
- pip y virtualenv
- Node.js 18+
- PostgreSQL 14+
- Docker (opcional)
- Uvicorn para desarrollo

## Requisitos de AWS
- AWS CLI configurado con credenciales
- Terraform 1.5+
- Permisos IAM para crear:
  - Lambdas, API Gateway
  - Cognito User Pool y Grupos
  - RDS PostgreSQL
  - SQS
  - CloudWatch Logs
  - Roles y Policies

---

# 📌 3. Setup Instructions

## 3.1 Clonar repositorio
ash
git clone https://github.com/Oliveresm/Longitudinal_Health_Analytics_Platform
cd Longitudinal_Health_Analytics_Platform

## 3.2 Instalar dependencias backend (app)
ash
cd services/app
pip install -r requirements.txt


## 3.3 Instalar dependencias del worker (processor)
ash
cd services/processor
pip install -r requirements.txt


## 3.4 Instalar dependencias frontend (opcional)
ash
cd healthtrends-frontend
npm install


---

# � 4. Cómo desplegar la infraestructura (Terraform)

1. Entrar al directorio de Terraform

ash
cd terraform


2. Inicializar Terraform
ash
terraform init


3. Validar la configuración
ash
terraform validate


4. Vista previa de recursos
ash
terraform plan


5. Desplegar la infraestructura
ash
terraform apply


Qué crea Terraform automáticamente (resumen)
- Networking, VPC, subredes públicas/privadas, tablas de enrutamiento, gateway
- Compute serverless: Lambda Ingest, post-confirmation trigger, SQS Worker
- Seguridad: roles IAM y políticas
- Almacenamiento: RDS PostgreSQL
- Materialized views e infraestructura de actualizaciones
- Autenticación: Cognito User Pool, grupos y apps clients
- API: API Gateway REST API, autorizadores y mapeos de recursos

---

# 5. Cómo ejecutar localmente

### Ejecutar Backend (FastAPI)
ash
cd services/app
uvicorn main:app --reload


### Ejecutar Worker (SQS Processor)
ash
cd services/processor
python worker.py


### Ejecutar Frontend (opcional)
ash
cd healthtrends-frontend
npm start


# 6. Cómo probar la plataforma

Ejemplo de ingestión de resultado de laboratorio (usando API Gateway en la nube)
curl -X POST https://<api-id>.execute-api.<region>.amazonaws.com/prod/ingest \
  -H "Content-Type: application/json" \
  -d '{ "patient_id":"x123", "test_code":"A1C", "value":6.5 }'

EndPoints de Tendencias
- GET /patient/{id}/test/{test_code}
- GET /patient/{id}/monthly-trends/{test_code}
- GET /patient/{id}/risk-analysis/{test_code}

Para pruebas locales, simula el endpoint correspondiente en FastAPI o usa proxies para endpoints de AWS.

---

#  7. Costos estimados (AWS)

| Servicio AWS | Costo estimado mensual |
|---|---|
| API Gateway | 1–3 USD |
| Lambda ingest | ~0.20 USD / millón de invocaciones |
| Lambda post-confirmation | ~0.01 USD |
| SQS | ~0.40 USD / millón de mensajes |
| RDS PostgreSQL | 15–30 USD |
| CloudWatch Logs | 1–3 USD |
| Cognito | Gratis (hasta 50K MAU) |
| Total estimado | ~20–40 USD / mes |

Notas:
- Estos números son aproximados y dependen del volumen real de ingestas y de la configuración de escalado.

---

# 8. Limitaciones conocidas

- RDS es el componente de mayor costo en el sistema.
- Las materialized views requieren una automatización de refresco programado.
- SQS Worker actualmente sin Dead Letter Queue (DLQ) configurada; se recomienda agregar.
- El análisis de riesgo requiere al menos 6 resultados históricos para ser significativo.
- La asignación de grupos Cognito requiere permisos explícitos en IAM.

---

# 9. Documentación adicional

- API Documentation: docs/api.md
- Cost Analysis: docs/cost_analysis.md

---

# 10. Contribución y mantenimiento

- Si quieres contribuir, crea una nueva rama, realiza cambios y abre un pull request.
- Mantén las dependencias acotadas a versiones soportadas en Terraform y runtimes de Python/Node descritos en Prerrequisitos.
- Añade pruebas unitarias e integraciones para las rutas de ingestión y análisis.

---

# Estructuras de archivos clave

- docs/
  - api.md           # Detalles de endpoints, formatos de requests/responses, errores, ejemplos curl
  - cost_analysis.md # Desglose de costos estimados, costos por resultado, estrategias de optimización
- services/
  - app/
  - processor/
  - trends/
- terraform/
  - IaC para toda la infraestructura (VPC, RDS, API Gateway, Lambda, SQS, Cognito)

---
