# Longitudinal Health Analytics Platform

The **Longitudinal Health Analytics Platform** is a serverless, event-driven cloud system designed to ingest, process, store, and analyze clinical laboratory results over time.  
It leverages AWS managed services to ensure scalability, low operational overhead, and long-term reliability for healthcare analytics workloads.

---

## 📌 Project Description

This platform enables healthcare organizations to:

- Upload and validate clinical lab results in real time  
- Process data asynchronously through an event-driven pipeline  
- Store patient records and historical results securely  
- Provide REST APIs for querying longitudinal health data  
- Prepare data for dashboards, statistics, and ML pipelines  
- Operate with minimal infrastructure management using serverless components  

Core AWS services include:

- **API Gateway** (public API layer)  
- **Lambda** (compute & business logic)  
- **S3** (raw + processed dataset storage)  
- **DynamoDB** (patient & lab record storage)  
- **SQS** (decoupled ingestion queue)  
- **Cognito** (authentication & user identity)  
- **CloudWatch** (monitoring & logs)  
- **Terraform** (infrastructure as code)

---

## 📌 Prerequisites

Before deploying or running the platform, make sure you have:

### **Tools Required**
- Node.js 18+
- Python 3.10+
- AWS CLI configured with valid credentials
- Terraform / OpenTofu installed  
- Git
- Docker (optional, for local testing)

### **AWS Requirements**
- AWS Account  
- IAM permissions for:
  - Lambda creation  
  - S3 buckets  
  - DynamoDB tables  
  - SQS queues  
  - API Gateway  
  - Cognito  
  - CloudWatch  
  - IAM roles & policies  

---

## 📌 Setup Instructions

### **1. Clone repository**
git clone https://github.com/Oliveresm/Longitudinal_Health_Analytics_Platform

### 2. Install backend dependencies
cd backend
npm install

### 3. Initialize Terraform
cd infrastructure
terraform init

### 📌 How to Deploy Infrastructure
## 1. Initialize Terraform
   terraform init

## 2. Review resources
terraform plan

## 3. Deploy
terraform apply

Terraform will automatically create:
S3 buckets
Lambda functions
SQS queue
API Gateway
DynamoDB table
Cognito User Pool
CloudWatch logs
IAM roles & permissions
All API URLs and resource IDs will appear in the Terraform output.

📌 How to Run Locally
Option A — Local Lambda execution with SAM
sam local start-api
Option B — Local backend mock
The /tests/events folder contains local test payloads.
Option C — Docker
docker build -t health-platform .
docker run -p 8080:8080 health-platform
📌 How to Test
Unit Tests
cd backend
npm test
Invoke Lambda manually
aws lambda invoke \
  --function-name processLabResult \
  --payload file://tests/events/create_event.json \
  output.json
API Test via curl
curl -X POST https://<api-id>.execute-api.amazonaws.com/prod/labs \
  -H "Authorization: Bearer <token>" \
  -d '{"patientId":"123","test":"LDL","value":90}'
📌 Cost Estimates
| AWS Service        | Estimated Cost        |
| ------------------ | --------------------- |
| Lambda             | $3–$12                |
| API Gateway        | $3–$18                |
| S3 Storage         | $1–$6                 |
| SQS                | $0.50–$3              |
| DynamoDB           | $5–$25                |
| Cognito            | $0–$25                |
| CloudWatch         | $1–$8                 |
| **Total Estimate** | **$13–$70 per month** |

📌 Known Limitations
Cold starts may introduce latency under low traffic.
S3 eventual consistency may delay visibility of newly uploaded objects.
DynamoDB query patterns require strict index design.
For high-volume workloads, Kinesis may be required instead of SQS.
Default setup is not HIPAA compliant; additional security hardening is required.
No built-in analytics dashboard (external BI tools must be integrated).
API Gateway rate limit: 10,000 req/sec per region.


