# Longitudinal Health Analytics Platform
### Documentation

This platform provides an end-to-end, cloud-native solution for ingesting, storing, analyzing, and visualizing longitudinal clinical laboratory results.  
The system uses a serverless ingestion pipeline, containerized microservices, secure authentication, and automated infrastructure deployment.

---

# 1. Project Description

The platform enables:

- Secure patient authentication via AWS Cognito
- Bulk and single-record ingestion of clinical lab results
- Asynchronous background processing (Lambda + SQS)
- Structured, query-optimized storage in PostgreSQL (RDS)
- Microservices for patient management, catalog management, admin tools, and clinical operations
- Longitudinal trend analysis, including:
  - Moving averages
  - Month-to-month aggregation (materialized view)
  - Clinical risk analysis (percentage-based anomaly detection)
- Full infrastructure as code using Terraform

The system is designed for scalability, cost efficiency, and real-world medical workflows.


#  2. Prerequisites

### Local Prerequisites
- Python 3.10+
- Node.js 18+
- pip / virtualenv
- PostgreSQL 14+
- Docker (optional)
- Uvicorn (for FastAPI)

### AWS Prerequisites
- AWS account
- AWS CLI configured
- IAM admin or power-user permissions
- Terraform v1.5+


# 3. Setup Instructions

### 1. Clone the repository
```bash
git clone https://github.com/Oliveresm/Longitudinal_Health_Analytics_Platform
cd Longitudinal_Health_Analytics_Platform
