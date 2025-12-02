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

{
  "message": "Lab result received",
  "id": "result_9831"
}
| Code | Meaning                   |
| ---- | ------------------------- |
| 400  | Invalid or missing fields |
| 401  | Token missing/invalid     |
| 500  | Internal ingestion error  |

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
| Code | Meaning           |
| ---- | ----------------- |
| 401  | Unauthorized      |
| 404  | Patient not found |
| 500  | Internal error    |

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
| Code | Meaning              |
| ---- | -------------------- |
| 400  | Invalid ID           |
| 401  | Unauthorized         |
| 404  | Lab result not found |

5. Error Codes (Global)

| Status Code                     | Meaning                                    |
| ------------------------------- | ------------------------------------------ |
| **400 – Bad Request**           | Missing fields, invalid JSON, wrong format |
| **401 – Unauthorized**          | Token missing, expired, or invalid         |
| **403 – Forbidden**             | User does not have required role           |
| **404 – Not Found**             | Resource does not exist                    |
| **429 – Too Many Requests**     | API Gateway rate limits exceeded           |
| **500 – Internal Server Error** | Lambda processing error                    |
| **502 – Bad Gateway**           | Upstream failure in Lambda                 |


6. Example curl Commands

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
