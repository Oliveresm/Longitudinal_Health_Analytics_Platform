# API Documentation

This document describes all available endpoints in the **Longitudinal Health Analytics Platform**, including authentication requirements, request/response formats, error codes, and example curl commands.

All endpoints are protected by **AWS Cognito JWT tokens** and require an `Authorization: Bearer <token>` header.

---

# 1. Authentication Requirements

Access to all API routes requires:

- A valid **Cognito User Pool token**
- HTTPS requests
- JWT included in headers:

Authorization: Bearer <your_jwt_token>

If the token is expired, missing, or invalid, API Gateway returns **401 Unauthorized**.

---

# 2. Base URL

Your API Gateway base URL (Terraform output):

https://<api-id>.execute-api.<region>.amazonaws.com/prod

All endpoints below assume the `/prod` stage.

---

# 3. Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/labs` | Upload a new lab result |
| GET | `/labs/{patientId}` | Get all lab results for a specific patient |
| GET | `/patients` | List all patients |
| DELETE | `/labs/{id}` | Delete a lab result by ID |

---

# 4. Endpoints in Detail

---

## 📌 **POST /labs**

Uploads a new laboratory result into the ingestion pipeline.

### **Request**
```json
{
  "patientId": "P001",
  "test": "glucose",
  "value": 96,
  "unit": "mg/dL",
  "timestamp": "2025-03-02T12:00:00Z"
}
Successful Response – 201 Created
{
  "message": "Lab result received",
  "id": "result_9831"
}
Possible Errors
Code	Meaning
400	Invalid or missing fields
401	Token missing/invalid
500	Internal ingestion error
📌 GET /labs/{patientId}
Retrieves all historical lab results for a specific patient.
Response Example – 200 OK
[
  {
    "test": "glucose",
    "value": 96,
    "unit": "mg/dL",
    "timestamp": "2025-03-02T12:00:00Z"
  },
  {
    "test": "LDL",
    "value": 90,
    "unit": "mg/dL",
    "timestamp": "2025-03-01T11:30:00Z"
  }
]
Possible Errors
Code	Meaning
401	Unauthorized
404	Patient not found
500	Internal error

📌 GET /patients
Returns a list of all registered patients.
Response – 200 OK
[
  { "id": "P001", "name": "Alice Torres" },
  { "id": "P002", "name": "John Carter" }
]

📌 DELETE /labs/{id}
Deletes a lab result by its unique ID.
Response – 200 OK
{
  "message": "Deleted"
}
Possible Errors
Code	Meaning
400	Invalid ID
401	Unauthorized
404	Lab result not found
5. Error Codes (Global)
Status Code	Meaning
400 – Bad Request	Missing fields, invalid JSON, wrong format
401 – Unauthorized	Token missing, expired, or invalid
403 – Forbidden	User does not have required role
404 – Not Found	Resource does not exist
429 – Too Many Requests	API Gateway rate limits exceeded
500 – Internal Server Error	Lambda processing error
502 – Bad Gateway	Upstream failure in Lambda
6. Example curl Commands
Example: Upload lab result
curl -X POST https://<api>/labs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "patientId": "P001",
    "test": "glucose",
    "value": 92,
    "unit": "mg/dL",
    "timestamp": "2025-03-02T12:00:00Z"
  }'
Example: Get all results for patient
curl -X GET https://<api>/labs/P001 \
  -H "Authorization: Bearer <token>"
Example: List all patients
curl -X GET https://<api>/patients \
  -H "Authorization: Bearer <token>"
Example: Delete a lab result
curl -X DELETE https://<api>/labs/result_9831 \
  -H "Authorization: Bearer <token>"
7. Notes
All timestamps must follow ISO 8601 format.
All requests must be sent over HTTPS.
API Gateway applies throttling by default.
JWT tokens must be renewed before expiration.
End of API Documentation

---

Si quieres también:

✔ `docs/cost_analysis.md`  
✔ `docs/troubleshooting.md`  
✔ `docs/architecture.png` (imagen real con iconos AWS)

Solo dime: **“dame cost_analysis.md”** o **“dame el diagrama AWS en PNG”**.
Dijiste:
ahora este

Cost Analysis (docs/cost_analysis.md):

Estimated monthly cost breakdown
Cost per lab result processed
Optimization strategies implemented
Further optimization opportunities
ChatGPT dijo:
Aquí tienes docs/cost_analysis.md exactamente como te lo pidieron: claro, profesional, completo, en inglés y listo para pegar en tu GitHub.
Incluye:
✔ Estimated monthly cost breakdown
✔ Cost per lab result processed
✔ Optimization strategies implemented
✔ Further optimization opportunities

✅ docs/cost_analysis.md (copy/paste tal cual)
# Cost Analysis

This document provides a detailed financial overview of the Longitudinal Health Analytics Platform.  
All calculations assume a serverless, event-driven workload deployed on AWS using Lambda, API Gateway, S3, DynamoDB, SQS, Cognito, and CloudWatch.

---

# 1. Estimated Monthly Cost Breakdown

The following table reflects estimated costs under a moderate workload (50,000 lab results per month).  
Costs vary depending on traffic volume, region, and request patterns.

| AWS Service | Usage Assumption | Estimated Monthly Cost |
|-------------|------------------|-------------------------|
| **AWS Lambda** | ~1M invocations, 128–256MB RAM, avg 100ms | **$6–$12** |
| **API Gateway** | ~300k API calls | **$3–$18** |
| **S3 Storage** | 20GB stored + 1M PUT/GET operations | **$3–$6** |
| **DynamoDB** | 25GB data, ~5M reads/writes | **$10–$25** |
| **SQS** | 1 million messages per month | **$0.50–$3** |
| **Cognito** | Up to 5k users | **$0–$25** |
| **CloudWatch Logs** | Lambda logs + metrics | **$3–$8** |
| **IAM** | No direct cost | **$0** |
| **TOTAL ESTIMATE** | — | **$25–$97 per month** |

This system remains extremely cost-efficient due to its serverless, pay-per-use design.

---

# 2. Cost Per Lab Result Processed

To determine the cost efficiency, we calculate the cost per processed lab result.

### Assumptions:
- **Monthly total cost:** $50 (average scenario)
- **Lab results processed per month:** 50,000

### Formula:
Cost per lab result = total monthly cost / number of results

### Calculation:
$50 / 50,000 = $0.001

### Result:
⭐ **Each lab result costs approximately $0.001** (one-tenth of a cent)  
This means the platform can operate at scale at extremely low cost.

---

# 3. Optimization Strategies Implemented

Several cost-saving measures are already integrated into the architecture:

## ✔ Serverless Architecture
You only pay when Lambda functions run—no idle servers, no EC2 costs.

## ✔ Asynchronous Processing (SQS)
- Reduces API Gateway usage  
- Allows batching  
- Avoids costly retries and failures  

## ✔ DynamoDB On-Demand Mode
- Automatically scales with traffic  
- Removes the need to overprovision capacity

## ✔ S3 Lifecycle Policies
- Raw and processed data can automatically move to cheaper storage tiers (IA, Glacier)

## ✔ Small Lambda Memory Footprint
- Functions sized to maintain optimal balance between speed and cost

## ✔ API Gateway Throttling
- Prevents accidental cost spikes  
- Controls abusive traffic patterns

## ✔ CloudWatch Log Retention Policies
- Avoids high long-term logging storage costs

---

# 4. Further Optimization Opportunities

There are several ways the system can be improved to reduce cost even further:

## 🔹 Move Analytics to Athena
Instead of computing aggregates in Lambda, Athena can query S3 data with lower cost per TB.

## 🔹 Use Kinesis for High-Throughput Workloads
For >1M records per hour, Kinesis may be more cost-efficient than SQS.

## 🔹 Compress Stored Objects (GZIP / Parquet)
- Reduces S3 size  
- Reduces Athena query cost  
- Speeds up downstream pipelines  

## 🔹 Batch DynamoDB Writes
Combining writes into batch operations can significantly reduce read/write unit consumption.

## 🔹 Introduce Tiered Storage
Move historical datasets to:
- S3 Glacier  
- S3 Deep Glacier  
- Glacier Instant Retrieval (for periodic analytics)

## 🔹 Reduce CloudWatch Verbosity
Switch non-critical Lambdas to `ERROR`-only log level.

---

# 5. Conclusion

The Longitudinal Health Analytics Platform is **highly cost-effective**, scalable, and optimized for long-term clinical data processing. With an average operational cost of **$25–$97/month**, it provides enterprise-level capabilities at a very accessible price point. Additional optimization paths allow the platform to scale efficiently without dramatic cost increases.

---

# End of Cost Analysis
