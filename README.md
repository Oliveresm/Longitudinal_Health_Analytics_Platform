# Longitudinal Health Analytics Platform

La Longitudinal Health Analytics Platform es una solución nativa de la nube para la ingesta, procesamiento, almacenamiento, visualización y análisis a largo plazo de resultados de laboratorio clínico. Está diseñada con una arquitectura serverless y orientada a eventos utilizando servicios gestionados de AWS (Cognito, API Gateway, Lambda, SQS, RDS PostgreSQL, CloudWatch) y microservicios implementados con FastAPI, desplegados mediante Terraform.

Objetivos clave
- Autenticación segura de pacientes y profesionales a través de AWS Cognito User Pools con RBAC (Patients, Doctors, Labs, Admins).
- Ingestión multi-fuente de resultados clínicos (API Gateway → Lambda Ingest, cargas bulk, SQS, procesador).
- Arquitectura de microservicios aislados: app (lógica de negocio), processor (procesamiento de mensajes), trends (cálculos analíticos).
- Capacidad analítica longitudinal: series temporales, promedios móviles, resúmenes mensuales (materialized views) y alertas de riesgo.
- Infraestructura reproducible con Terraform, incluido VPC, RDS PostgreSQL, colas SQS y recursos de vigilancia.

---

# 1. Descripción del Proyecto

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

#  2. Prerrequisitos

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

# 3. Setup Instructions

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

# 4. Cómo desplegar la infraestructura (Terraform)

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

Qué crea Terraform automáticamente 

- Networking y conectividad
  - VPC dedicada para el proyecto con:
    - Subnetworks públicas y privadas distribuidas en una o varias AZs para alta disponibilidad.
    - Tablas de enrutamiento asociadas a cada subnet, con rutas hacia internet (para públicas) y hacia NAT/gateways (para privadas).
    - Internet Gateway para conectividad de las subnets públicas.
    - NAT Gateway o NAT Instance para permitir que recursos en subredes privadas accedan a internet sin exponer directamente sus direcciones.
    - Grupos de seguridad (Security Groups) bien definidos para cada pila (p. ej., Lambda en private subnets, RDS en private subnets) con reglas de ingreso/egreso mínimas.
    - VPC Endpoints (opcional) para servicios de AWS (por ejemplo, S3, Secrets Manager) para evitar tráfico público.
  - Configuración de DNS/Hosting de dominios internos si se requiere (Route 53).
  - Políticas de red para garantizar aislamiento entre entornos (dev/stage/prod) mediante tags y módulos.

- Compute serverless y procesamiento
  - Lambda Ingest (función de ingesta de resultados) con:
    - Role y políticas mínimas necesarias.
    - Configuración de memoria, timeout y gestión de errores.
    - Integración con API Gateway y SQS (según flujo de ingestión).
    - Desencadenadores automáticos y permisos para escribir en RDS (a través de events si aplica).
  - Post-confirmation Trigger (trigger de post-confirmación) en Cognito:
    - Lambda que ejecuta acciones tras la confirmación del usuario (p. ej., asignación de grupos, inicialización de recursos).
  - SQS Worker (procesador de mensajes):
    - Lambda o configuración de consumidor para procesar mensajes de la cola SQS.
    - Políticas de reintentos, manejo de errores y, si se decide, DLQ (Dead Letter Queue) para mensajes fallidos.
    - Infraestructura para garantizar procesamiento idempotente y control de concurrencia.

- Seguridad y control de acceso
  - Roles IAM y políticas:
    - Roles para cada servicio (Lambda, API Gateway, etc.) con permisos mínimos.
    - Policies basadas en recursos para limitar accesos a recursos específicos (por ejemplo, permisos de escritura en tablas específicas de RDS, acceso de lectura a datos de ciertos esquemas).
  - Gestión de credenciales y secretos:
    - Integración con Secrets Manager o Parameter Store para credenciales de bases de datos, claves de API y otros secretos.
    - Configuración de rotación de secretos si procede.
  - Seguridad de la red y cumplimiento:
    - Grupos de seguridad que restringen tráfico entre componentes y hacia internet.
    - Encriptación en tránsito (TLS) y, si aplica, en reposo (RDS con KMS, cifrado de volúmenes, etc.).

- Almacenamiento y datos
  - RDS PostgreSQL:
    - Instancia de base de datos PostgreSQL gestionada.
    - Configuración de almacenamiento (SSD, tamaño inicial) y backups automáticos.
    - Subnet Groups para RDS dentro de subredes privadas.
    - Grupos de seguridad que permiten acceso solo desde los recursos autorizados (p. ej., lambda en la misma VPC).
    - Configuración de mejoras de rendimiento (parámetros de PostgreSQL, pool de conexiones si aplica).
  - Estructura de esquemas y migraciones:
    - Esquemas iniciales y tablas base definidas como código.
    - Mecanismo para aplicar migraciones de base de datos (p. ej., herramientas de migración en pipeline).

- Persistencia de referencia y vistas
  - Materialized Views (vistas materializadas) y su infraestructura:
    - Definición de vistas materializadas para resúmenes mensuales y otros cálculos agregados.
    - Jobs/Cron de refresco programado:
      - Configuración para refrescar vistas mensuales (y/o diarias) mediante Lambda/EventBridge o tareas programadas.
    - Permisos y esquemas necesarios para crear y mantener las vistas.
  - Estructuras para soporte de análisis:
    - Tablas de hechos y tablas de dimensiones necesarias para consultas históricas y tendencias.
    - Índices recomendados para acelerar consultas comunes (por ejemplo, por patient_id, test_code, collection_date).

- Autenticación y administración de usuarios
  - Cognito User Pool:
    - Creación del User Pool con configuración de políticas de contraseñas, verificación y MFA si aplica.
    - Grupos predeterminados: Patients, Doctors, Labs, Admins.
    - Apps clients para diferentes flujos (web, móvil, servidor).
    - Autoasignación de usuarios a grupos cuando corresponda (si se maneja en el flujo de registro).
  - Integración de autorización:
    - Roles/authorizers de API Gateway para validar JWT y permisos basados en grupos.
    - Claims personalizados para RBAC en microservicios.

- API y orquestación
  - API Gateway REST API:
    - Crear endpoints, recursos y métodos (ingest, tendencias, análisis) con mapeos de integración a Lambda o a servicios correspondientes.
    - Configurar recursos de autenticación (Authorizers) y autorización basada en JWT.
  - Endpoints y despliegue:
    - Stage(s) (dev, prod) con despliegue automatizado.
    - Configuración de throttling y límites por método para proteger la API.
  - Documentación de contrato:
    - Esquemas de entrada/salida y rutas disponibles generados o mantenidos por Terraform.

- Observabilidad y seguridad operativa
  - CloudWatch:
    - Grupos de logs por servicio (app, processor, trends).
    - Alarmas básicas para errores, latencias y cuellos de botella.
  - E2E tracing (opcional):
    - Preparación para integración con OpenTelemetry o X-Ray para trazas distribuidas entre API Gateway, Lambdas y procesos.
  - Auditoría y cumplimiento:
    - Configuraciones de logging estructurado y retención de logs según políticas.

Notas y buenas prácticas
- Todo lo creado por Terraform está diseñado para estar aislado por entorno (dev/stage/prod) mediante variables y workspaces o módulos separados.
- Se recomienda usar módulos para componentes repetibles (p. ej., Lambda, API Gateway, SQS, RDS) y mantener un estado de Terraform en S3 con bloqueo (DynamoDB) para evitar conflictos.
- Mantén los secretos en Secrets Manager y evita incrustarlos en el código o en el repositorio.

Si quieres, te puedo proporcionar fragmentos de código específicos para alguno de estos componentes (por ejemplo, un módulo de Terraform para DLQ de SQS, un ejemplo de IAM policy para el Lambda Ingest, o un fragmento de FastAPI middleware para validar JWT). ¿Qué componente te gustaría ampliar primero?

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

