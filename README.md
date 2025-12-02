# Longitudinal Health Analytics Platform

The **Longitudinal Health Analytics Platform** is a fully serverless, cloud-native system designed to ingest, validate, process, store, and analyze clinical laboratory results over time.  
It provides a secure and scalable infrastructure for healthcare organizations that need long-term patient data retention, analytics readiness, and minimal operational overhead.

This platform uses AWS managed services to guarantee high availability, automatic scaling, event-driven pipelines, and low cost per transaction. All components are implemented using Infrastructure as Code (IaC) via Terraform or OpenTofu.

---

# 1. Project Description

The purpose of this platform is to enable healthcare providers, research institutions, and analytics systems to:

- Upload laboratory results in real time  
- Process and validate incoming records asynchronously  
- Store raw and processed results with long-term durability  
- Retrieve longitudinal patient histories on demand  
- Support analytics, dashboards, BI tools, and ML workloads  
- Scale automatically with varying workload patterns  
- Ensure secure access through AWS Cognito and IAM  

The architecture is composed of:

- **API Gateway** – Secure public API layer  
- **Cognito** – User authentication and identity management  
- **AWS Lambda** – Serverless compute layer for ingestion and processing  
- **SQS** – Decoupled and fault-tolerant processing pipeline  
- **DynamoDB** – Low-latency NoSQL storage for patient records  
- **S3** – Durable storage for raw and processed lab results  
- **CloudWatch** – Logging, monitoring, and alerting  
- **Terraform** – Full infrastructure lifecycle management  

The system is designed to be modular, easily extensible, and compliant with healthcare data requirements (encryption at rest, encryption in transit, auditability, and strict IAM policies).

---

# 2. Prerequisites

Before deploying or running the platform, ensure you have the following installed and configured:

### Required Tools
- **AWS CLI** (configured with valid IAM credentials)
- **Terraform / OpenTofu**
- **Node.js 18+**
- **Python 3.10+**
- **Git**
- **Docker** (optional for local Lambda testing)
- **SAM CLI** (optional for local API simulation)

### AWS Requirements
- An AWS Account  
- IAM permissions to manage:
  - Lambda functions  
  - S3 buckets  
  - DynamoDB tables  
  - SQS queues  
  - IAM roles  
  - API Gateway  
  - Cognito User Pools  

You must also configure AWS credentials locally:

```bash
aws configure

3. Setup Instructions
3.1 Clone the Repository

git clone https://github.com/<your-org>/<your-repo>.git
cd Longitudinal-Health-Analytics-Platform


3.2 Install Backend Dependencies
cd backend
npm install


3.3 Prepare Terraform Infrastructure
cd infrastructure
terraform init

4. How to Deploy Infrastructure
Deployment is handled entirely through Terraform.
Step 1 — Initialize Terraform
terraform init

Step 2 — Review the Execution Plan
terraform plan
Step 3 — Deploy Resources
terraform apply

Terraform will automatically create:
AWS Lambda functions
API Gateway routes
S3 storage buckets
DynamoDB tables
SQS queues
Cognito authentication resources
IAM execution roles and policies
CloudWatch log groups
Output values will include:
API Gateway URL
Cognito User Pool ID
Lambda function ARNs
DynamoDB table names
5. How to Run Locally
There are several options for local development.
Option A — Run Lambdas Locally
sam local start-api
Option B — Run Backend Logic in Node
You can directly invoke logic without deployment:
node src/handlers/createLabResult.js
Option C — Docker Local Runtime
docker build -t health-platform .
docker run -p 8080:8080 health-platform

6. How to Test
6.1 Unit Tests
Backend functions include unit tests under /backend/tests.
Run:
npm test
6.2 Manual Lambda Invocation
aws lambda invoke \
  --function-name processLabResult \
  --payload file://tests/events/sample.json \
  output.json
6.3 API Testing with curl
curl -X POST https://<api-id>.execute-api.amazonaws.com/prod/labs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"patientId":"123","test":"LDL","value":90}'
6.4 Using Postman
Import the API Gateway URL and attach your Cognito Bearer token.
All requests must use HTTPS.

7. Cost Estimates
The platform is designed to be extremely cost-efficient due to its serverless nature.
Estimated monthly cost (assuming moderate usage):

| Service     | Estimate              |
| ----------- | --------------------- |
| Lambda      | $3–$12                |
| API Gateway | $3–$18                |
| DynamoDB    | $5–$25                |
| S3 Storage  | $1–$6                 |
| SQS         | $0.50–$3              |
| Cognito     | $0–$25                |
| CloudWatch  | $1–$8                 |
| **Total**   | **$20–$97 per month** |


Cost per lab result (avg):
$0.001 per processed lab result
Full cost analysis is available in:
➡ docs/cost_analysis.md

8. Known Limitations
While optimized for cost and scalability, the platform includes several known limitations:
8.1 Cold Starts
Lambda cold starts may introduce latency, especially in infrequent workloads.
8.2 S3 Eventual Consistency
Newly uploaded objects may not appear immediately.
8.3 DynamoDB Data Modeling Constraints
Query flexibility depends entirely on partition and sort keys.
8.4 Rate Limits
API Gateway has soft limits:
10,000 req/sec per region
8.5 HIPAA Compliance Requires Extra Layers
HIPAA certification is not included by default.
Requires:
VPC endpoints
Private API Gateway
KMS CMEK-managed keys
Audit logging retention 7+ years
8.6 No Built-In Dashboard
The platform provides APIs, not a front-end analytics interface.
Additional Documentation
API Reference: docs/api.md
Architecture Explanation: docs/architecture.md
Cost Analysis: docs/cost_analysis.md
Troubleshooting: docs/troubleshooting.md (optional)
License
MIT or applicable license.
