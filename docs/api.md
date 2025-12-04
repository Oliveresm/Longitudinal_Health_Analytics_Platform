# API Documentation

The Longitudinal Health Analytics Platform exposes a secure, serverless REST API designed for the ingestion, retrieval, and management of clinical laboratory data.  
All API interactions occur through **AWS API Gateway**, with authentication handled by **Amazon Cognito** and business logic executed within **AWS Lambda**.

This document serves as the authoritative reference for developers, data engineers, integration systems, and client applications consuming the platform’s APIs.

---

# 1. Overview

The API provides the following core functionalities:

- Ingesting new lab results
- Querying historical lab data per patient
- Retrieving lists of registered patients
- Deleting lab records (admin-only)
- Authenticating via Cognito JWT tokens
- Ensuring secure, encrypted and compliant data transfers

The API is fully serverless, scalable, and built for high reliability. Every request is encrypted, authenticated, validated, and processed asynchronously for optimal performance.

---

# 2. Base URL Structure

The base URL is provided by AWS API Gateway:
https://<api-id>.execute-api.<region>.amazonaws.com/prod


All endpoints below should be appended to the `/prod` stage unless otherwise configured.

---

# 3. Authentication Requirements

## 3.1 Authentication Model
All endpoints require **JWT-based authentication** using Amazon Cognito. Authentication is mandatory—no public endpoints exist to maintain data integrity and privacy.

Each request must include:
Authorization: Bearer <jwt_token>


## 3.2 Token Types Supported
- **ID Token**  
- **Access Token** (recommended)

## 3.3 Token Expiration
Tokens typically expire within:
- **1 hour** (default)
- Configurable via Cognito settings

Expired or tampered tokens result in:
- `401 Unauthorized`

## 3.4 Required Scopes (Optional Feature)
If role-based access control is enabled:

| Role | Permissions |
|------|-------------|
| **admin** | create, read, delete lab results, list patients |
| **clinician** | create, read lab data |
| **researcher** | read-only access |
| **patient** | read only their own data (if enabled) |

---

# 4. Global Rules & Headers

## Required Headers

| Header | Description |
|--------|-------------|
| `Content-Type: application/json` | Required for all POST requests |
| `Authorization: Bearer <token>` | Required for all requests |
| `X-Request-Source` (optional) | For logging request origin |

---

# 5. Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| **POST** | `/labs` | Ingest a new laboratory result |
| **GET** | `/labs/{patientId}` | Retrieve longitudinal results for a patient |
| **GET** | `/patients` | List all registered patients |
| **DELETE** | `/labs/{id}` | Delete a lab record (admin only) |

Additional endpoints (future):
- `/patients/{id}/summary`
- `/labs/{id}/audit`
- `/labs/bulk`

---

# 6. Detailed Endpoint Specifications

---

# 6.1 POST /labs  
**Create a new laboratory result**

This endpoint is the main ingestion entry point into the system.  
It is optimized for high-throughput, low-latency writes and automatically forwards data to the SQS ingestion queue.

---

### Request Format

#### Headers
Content-Type: application/json
Authorization: Bearer <token>


#### Body
```json
{
  "patientId": "P001",
  "test": "glucose",
  "value": 96.4,
  "unit": "mg/dL",
  "referenceRange": "70-110",
  "timestamp": "2025-03-02T12:00:00Z",
  "metadata": {
    "labId": "LAB-93823",
    "instrument": "Analyzer X20",
    "performedBy": "Technician-01"
  }
}


Field Definitions

| Field          | Type           | Required | Description                       |
| -------------- | -------------- | -------- | --------------------------------- |
| patientId      | string         | YES      | Unique patient identifier         |
| test           | string         | YES      | Type of laboratory test performed |
| value          | number         | YES      | Numeric result                    |
| unit           | string         | YES      | Measurement unit                  |
| referenceRange | string         | NO       | Normal expected range             |
| timestamp      | ISO8601 string | YES      | Time result was generated         |
| metadata       | object         | NO       | Optional additional context       |


Success Response (201)
{
  "message": "Lab result received",
  "id": "result_9831",
  "status": "queued_for_processing"
}

Validation Errors (400)
Missing required fields
Invalid timestamp
Wrong data types
Value out of logical range
Example:
{
  "error": "Invalid input",
  "details": ["value must be numeric"]
}

6.2 GET /labs/{patientId}
Retrieve all historical lab results for a patient
This endpoint aggregates data from DynamoDB and responds with a time-ordered list of results.
Example Request
GET /labs/P001
Authorization: Bearer <token>

Response (200)
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

Features
Chronological sorting
Automatic pagination (via DynamoDB)
Optional filters (future):
?test=glucose
?startDate=...&endDate=...
Common Errors

| Code | Meaning           |
| ---- | ----------------- |
| 401  | Invalid token     |
| 404  | Patient not found |
| 500  | DB read failure   |


6.3 GET /patients
Retrieve the list of all registered patients
Response (200)

[
  { "id": "P001", "name": "Alice Torres" },
  { "id": "P002", "name": "John Carter" }
]


6.4 DELETE /labs/{id}
Admin-only endpoint to remove a lab record.
Example
DELETE /labs/result_9831


Response (200)
{
  "message": "Record deleted successfully"
}

Error Responses
403 Forbidden — non-admin trying to delete
404 Not Found — record does not exist

7. Input Validation Rules
Required fields
patientId
test
value
timestamp
Formats
timestamp must be ISO8601:
Example: 2025-03-02T12:00:00Z

| Field     | Allowed Types       |
| --------- | ------------------- |
| value     | integer or float    |
| patientId | alphanumeric string |
| metadata  | object              |


8. Error Codes (Global Specification)
| Code                          | Description                  | Typical Causes               |
| ----------------------------- | ---------------------------- | ---------------------------- |
| **400 Bad Request**           | Input validation failure     | Invalid JSON, missing fields |
| **401 Unauthorized**          | Token invalid/missing        | Expired JWT                  |
| **403 Forbidden**             | Role mismatch                | Non-admin deleting data      |
| **404 Not Found**             | Resource missing             | Invalid patient ID           |
| **409 Conflict**              | Duplicate insertion          | Re-ingesting same ID         |
| **429 Too Many Requests**     | API rate limit exceeded      | Burst traffic                |
| **500 Internal Server Error** | Lambda processing failure    | DB connectivity              |
| **502 Bad Gateway**           | Lambda error surfaced to API | Unhandled exception          |
| **503 Service Unavailable**   | Downstream AWS outage        | Rare, regional               |


9. Example curl Commands
Upload lab result

curl -X POST https://<api>/labs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "patientId": "P001",
    "test": "HDL",
    "value": 52,
    "unit": "mg/dL",
    "timestamp": "2025-03-02T15:40:00Z"
  }'


Retrieve all results for patient

curl -X GET https://<api>/labs/P001 \
  -H "Authorization: Bearer <token>"


List patients

curl -X GET https://<api>/patients \
  -H "Authorization: Bearer <token>"


Delete a lab record

curl -X DELETE https://<api>/labs/result_93812 \
  -H "Authorization: Bearer <token>"


10. Security Considerations
All requests must use HTTPS
S3 and DynamoDB are encrypted at rest (AES-256)
Logs do not store PHI unless anonymized
JWT tokens must be short-lived
No sensitive test values should appear in URLs
Request body is never stored unencrypted

11. Future API Extensions
Planned new endpoints:
1. GET /patients/{id}/summary
Return calculated averages, trends, percentile scores
2. GET /labs/{id}/audit
Track history of modifications
3. POST /labs/bulk
Bulk upload (10k–100k records)
4. /stats
Aggregate statistics for clinicians and researchers


