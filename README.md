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

