# Longitudinal Health Analytics Platform  
### Documentation Cloud Project

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

## Clinical Result Ingestion  
Results can be submitted via:
- API Gateway → Lambda Ingest  
- Bulk upload via backend microservice  
- SQS queue for asynchronous ingestion  
- Lambda Worker processing messages one by one and inserting them into PostgreSQL  

##  Microservices Architecture  
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

## 2. Install Backend Dependencies
```bash
2. Install Backend Dependencies
cd services/app
pip install -r requirements.txt
3. Install Worker Dependencies
cd services/processor
pip install -r requirements.txt
4. Install Frontend Dependencies
cd healthtrends-frontend
npm install
📌 4. How to Deploy Infrastructure (Terraform)
This platform is fully reproducible with Infrastructure as Code using Terraform.
1. Enter the Terraform directory
cd terraform
2. Initialize Terraform
terraform init
3. Validate the configuration
terraform validate
4. Preview resources before deployment
terraform plan
5. Deploy the infrastructure
terraform apply
Terraform will automatically create:
Networking
VPC
Public and private subnets
Routing tables
Internet gateway
Compute / Serverless
Lambda Ingest Function
Lambda Post-confirmation Trigger
SQS Worker
Security
IAM Roles
Resource-scoped Policies
CloudWatch log groups
Storage
RDS PostgreSQL Instance
Materialized View infrastructure
Authentication
Cognito User Pool
Cognito Groups
App Clients
API
API Gateway REST API
Resource mappings
Authorizers
📌 5. How to Run the Project Locally
Run Backend (FastAPI)
cd services/app
uvicorn main:app --reload
Run Worker (SQS Processor)
cd services/processor
python worker.py
Run Frontend
cd healthtrends-frontend
npm start
You can access the local FastAPI docs here:
http://localhost:8000/docs
📌 6. How to Test the Platform
Example: Ingest Lab Result
curl -X POST https://<api-id>.execute-api.<region>.amazonaws.com/prod/ingest \
  -H "Content-Type: application/json" \
  -d '{ "patient_id":"x123", "test_code":"A1C", "value":6.5 }'
Trend Endpoints
GET /patient/{id}/test/{test_code}
GET /patient/{id}/monthly-trends/{test_code}
GET /patient/{id}/risk-analysis/{test_code}
📌 7. Cost Estimates (AWS)
| AWS Service              | Estimated Monthly Cost    |
| ------------------------ | ------------------------- |
| API Gateway              | $1–3                      |
| Lambda ingest            | ~$0.20 / million calls    |
| Lambda post-confirmation | ~$0.01                    |
| SQS                      | ~$0.40 / million messages |
| RDS PostgreSQL           | $15–30                    |
| CloudWatch Logs          | $1–3                      |
| Cognito                  | Free (up to 50K MAU)      |


RDS is the highest-cost component of the platform
Materialized views require scheduled refresh automation
SQS Worker does not yet implement a Dead Letter Queue
Risk analysis requires a minimum of 6 historical lab results
Cognito group assignment requires explicit IAM permissions
📌 9. Additional Documentation
API Documentation: docs/api.md
Cost Analysis: docs/cost_analysis.md
📌 10. Conclusion
This platform demonstrates a complete real-world cloud architecture using AWS services, microservices with FastAPI, event-driven ingestion pipelines, relational storage, and analytical processing. Its modular design, reproducible infrastructure, and scalable serverless components make it suitable for large-scale clinical workloads and longitudinal health analytics.

---

