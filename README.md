# Longitudinal Health Analytics Platform  
### Complete Documentation – Cloud Project

This platform implements a fully cloud-native solution for the ingestion, processing, storage, and longitudinal analysis of clinical laboratory results. The system was built using AWS-managed services (Cognito, API Gateway, Lambda, SQS, RDS PostgreSQL) combined with microservices written in FastAPI and automated deployment via Terraform.

The design focuses on scalability, cost-efficiency, low latency, and real-world medical workflows.

---

#  1. Project Description

The platform enables:

## ✔ Patient Authentication  
Users authenticate through AWS Cognito. Each user belongs to one of the following groups:
- Patients
- Doctors
- Labs
- Admins

Access is controlled via JWT validation in each microservice.

## ✔ Clinical Result Ingestion  
Results can be submitted via:
- API Gateway → Lambda Ingest  
- Bulk upload via backend microservice  
- SQS queue for asynchronous ingestion  
- Lambda Worker processing messages one by one and inserting them into PostgreSQL  

## ✔ Microservices Architecture  
The backend is divided into multiple services:

### **services/app**  
- Patients module  
- Catalog module  
- Admin module  
- Lab operations module  

### **services/trends**  
Performs:
- Moving average calculations  
- Monthly aggregation using materialized views  
- Clinical risk analysis with dynamic percentage changes  

### **services/processor**  
SQS Worker for high-volume insertion.

## ✔ Longitudinal Data Analytics  
The system supports:
- Historical queries
- Smoothing using 3-point moving averages
- Long-term monthly trends
- Risk classification by analyzing six-month percentage change patterns

---

# 2. Prerequisites

## Local
- Python 3.10+
- pip and venv
- Node.js 18+
- PostgreSQL 14+
- Docker (optional)
- Uvicorn for development

## AWS
- AWS CLI configured
- Terraform 1.5+
- IAM user with permissions to create:
  - Lambda
  - API Gateway
  - Cognito
  - RDS
  - IAM Roles
  - CloudWatch
  - SQS

---

# 3. Setup Instructions

## 1. Clone Repository
```bash
git clone https://github.com/Oliveresm/Longitudinal_Health_Analytics_Platform
cd Longitudinal_Health_Analytics_Platform

2. Install Backend Dependencies
cd services/app
pip install -r requirements.txt

3. Install Worker Dependencies
cd services/processor
pip install -r requirements.txt

4. Install Frontend Dependencies
cd healthtrends-frontend
npm install

4. How to Deploy Infrastructure
1. Enter the Terraform directory:
cd terraform
2. Initialize Terraform:
terraform init
3. Validate:
terraform validate
4. Preview:
terraform plan

5. Deploy:
terraform apply
Terraform automatically provisions:
VPC, subnets, routing
RDS PostgreSQL instance
Cognito User Pool + Groups
SQS queue
Lambda Ingest
Lambda Post-confirmation
API Gateway REST API
IAM roles, policies
CloudWatch logs

5. How to Run Locally
Backend (FastAPI)
cd services/app
uvicorn main:app --reload
Worker (SQS Processor)
cd services/processor
python worker.py
Frontend
cd healthtrends-frontend
npm start

6. How to Test
FastAPI Documentation (local):
http://localhost:8000/docs
Example: Ingest Lab Result
curl -X POST https://<api-id>.execute-api.<region>.amazonaws.com/prod/ingest \
     -H "Content-Type: application/json" \
     -d '{ "patient_id":"x123", "test_code":"A1C", "value":6.5 }'
Example: Trend Analysis
GET /patient/{id}/test/{test_code}
GET /patient/{id}/monthly-trends/{test_code}
GET /patient/{id}/risk-analysis/{test_code}

� 7. Cost Estimates
| AWS Service              | Estimated Monthly Cost |
| ------------------------ | ---------------------- |
| API Gateway              | $1–3                   |
| Lambda ingest            | $0.20 / million calls  |
| Lambda post-confirmation | ~$0.01                 |
| SQS                      | ~$0.40 / million msgs  |
| RDS PostgreSQL           | $15–30                 |
| CloudWatch Logs          | $1–3                   |
| Cognito                  | FREE (up to 50k MAU)   |


8. Known Limitations
RDS is the highest cost component.
Materialized views require manual refresh.
Worker lacks DLQ (Dead Letter Queue).
Risk analysis requires 6+ historical records.
Cognito group assignment requires IAM policies.

