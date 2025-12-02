# Cost Analysis

This document presents a comprehensive cost analysis of the **Longitudinal Health Analytics Platform**, covering estimated monthly cost breakdowns, cost-per-result calculations, implemented optimization techniques, and future cost-saving opportunities.  
Because the system is fully serverless and event-driven, the platform achieves exceptionally low operational overhead while maintaining scalability, durability, and long-term reliability.

The purpose of this report is to provide a transparent view of how AWS billing is generated, how each service contributes to the total cost, and how the architecture is intentionally designed to minimize expenses while supporting healthcare-grade workloads.

---

# 1. Estimated Monthly Cost Breakdown

The following section offers a detailed analysis of the estimated monthly cost for each AWS component used in the platform. Costs depend on traffic volume, AWS region, peak concurrency, storage size, and user behavior.  
The values presented represent **low**, **medium**, and **high** usage scenarios for healthcare environments.

---

## 1.1 AWS Lambda

### Usage Assumptions  
- Functions invoked for ingestion, processing, and query operations  
- Average execution time: 80–150 ms  
- Memory allocation: 128–256 MB  
- Number of invocations per month: 300k–1.5M  

### Estimated Cost  
| Usage Level | Monthly Cost |
|-------------|--------------|
| Low (100k invokes) | ~$1.5 |
| Medium (500k invokes) | ~$6–$8 |
| High (1.5M invokes) | ~$12–$18 |

Lambda remains one of the most cost-efficient compute options due to its pay-per-invocation billing and the fact that the platform does not require 24/7 servers.

---

## 1.2 Amazon API Gateway

API Gateway provides the secure interface for all client requests.

### Usage Assumptions  
- 100k–800k API calls per month  
- REST API pricing model  

### Estimated Cost  
| Usage Level | Monthly Cost |
|-------------|--------------|
| Low | ~$3 |
| Medium | ~$8–$12 |
| High | ~$18–$25 |

The platform’s event-driven design ensures that API Gateway is called only for ingestion or queries—not for background workflows—reducing unexpected spikes.

---

## 1.3 Amazon S3 Storage

S3 stores:
- raw unprocessed lab results  
- processed/cleaned JSON files  
- historical datasets  
- machine-learning-ready exports  
- optional long-term archive files  

### Storage Size Assumptions  
- Raw data: 5–20 GB  
- Processed data: 5–15 GB  
- Lifecycle transitions to Infrequent Access  

### Estimated Cost  
| Storage Volume | Monthly Cost |
|----------------|--------------|
| Small (5GB) | ~$1 |
| Medium (20GB) | ~$3–$6 |
| Large (50GB+) | ~$8–$12 |

S3 pricing is extremely predictable and stable, making it ideal for clinical records that must be preserved for years.

---

## 1.4 DynamoDB

DynamoDB is used for fast, millisecond-latency queries of patient results.

### Assumptions  
- Table storing millions of items  
- On-demand billing mode  
- 2–10 million reads/writes per month  

### Estimated Cost  
| Usage Level | Monthly Cost |
|-------------|--------------|
| Low | ~$5 |
| Medium | ~$10–$18 |
| High | ~$25–$40 |

DynamoDB on-demand mode eliminates the risk of overprovisioning and saves cost for variable workloads.

---

## 1.5 SQS (Queue Service)

SQS decouples ingestion from asynchronous processing.

### Usage Assumptions  
- 300k–1M messages per month  
- Standard queue  

### Estimated Cost  
| Usage | Cost |
|-------|------|
| 300k msgs | ~$0.30 |
| 1M msgs | ~$0.80–$1.00 |
| 2M msgs | ~$2.00 |

SQS is one of the cheapest components of the entire system.

---

## 1.6 Cognito Authentication

### Usage Assumptions  
- <5,000 monthly active users  
- Hosted UI + token generation  

### Estimated Cost  
| Monthly Users | Cost |
|---------------|------|
| <= 1,000 | $0 |
| <= 5,000 | ~$0–$25 |
| > 10,000 | ~$50+ |

Cognito often costs nothing unless user volume is extremely high.

---

## 1.7 CloudWatch

CloudWatch is used for:
- Lambda logs  
- API logs  
- Metric alarms  
- Error tracking  

### Estimated Cost  
| Logging Level | Cost |
|---------------|------|
| Low | ~$2 |
| Medium | ~$5–$8 |
| Heavy logging | ~$12–$18 |

Most costs come from Lambda logs; tuning verbosity reduces long-term cost.

---

## 1.8 Total Monthly System Estimate

| Scenario | Estimated Monthly Total |
|----------|--------------------------|
| **Low Traffic** | **$20–$35** |
| **Medium Traffic** | **$45–$70** |
| **High Traffic** | **$90–$130** |

The platform remains extremely cost-efficient thanks to its serverless design.

---

# 2. Cost Per Lab Result Processed

To determine financial efficiency, we calculate the cost per processed lab result.

### Assumptions:
- Medium scenario total cost: **$50/month**
- Monthly lab results processed: **50,000**

### Formula:
Cost per lab result = Total monthly cost / Number of processed results


### Calculation:
$50 / 50,000 = $0.001


### Conclusion:
## **The platform processes each lab result for approximately $0.001 (0.1 cents).**  
This cost is extremely low compared to traditional systems, which may cost $0.05–$0.18 per transaction.

---

# 3. Optimization Strategies Implemented

The architecture includes multiple design choices specifically aimed at reducing cost without sacrificing reliability.

## 3.1 Serverless Compute  
Using AWS Lambda eliminates:
- EC2 costs  
- server management  
- idle compute billing  

You only pay per execution and per millisecond of compute time.

---

## 3.2 SQS-Based Decoupling  
Processing work happens asynchronously, reducing:
- API Gateway calls  
- Lambda execution time  
- retry costs  
- error-handling overhead  

---

## 3.3 DynamoDB On-Demand Mode  
Perfect for unpredictable workloads.  
Avoids:
- overprovisioning  
- unused read/write capacity  
- manual scaling  

---

## 3.4 S3 Lifecycle Rules  
Raw and processed data can automatically transition to:
- **S3 Standard-IA**  
- **S3 One Zone-IA**  
- **Glacier Flexible Retrieval**  
- **Glacier Deep Archive**  

This reduces long-term storage cost by up to **90%**.

---

## 3.5 Optimal Lambda Memory Tuning  
Memory is configured for the "sweet spot" where:
- execution time is minimized  
- cost per 100ms remains low  

---

## 3.6 Reduced CloudWatch Verbosity  
Non-critical Lambdas log only:
- warnings  
- errors  

This prevents log storage from growing exponentially.

---

# 4. Future Optimization Opportunities

The following enhancements can further reduce monthly costs as the platform scales.

## 4.1 Athena for Analytics  
Running queries directly on S3 using Athena is:
- cost-effective  
- serverless  
- scalable  

It prevents unnecessary DynamoDB scans.

---

## 4.2 Kinesis for High Throughput  
For workloads exceeding **5 million records per hour**, Kinesis may be more efficient than Lambda+SQS pipelines.

---

## 4.3 Storage Compression  
Storing data using:
- GZIP  
- Parquet  
- ORC  

reduces S3 size and significantly lowers Athena query costs.

---

## 4.4 Batch Writes to DynamoDB  
Combining multiple writes reduces write units by up to **40%**.

---

## 4.5 Switch to HTTP API Gateway  
Replacing REST API Gateway with HTTP API:
- cuts API cost by ~70%  
- maintains JWT auth  

---

## 4.6 CloudWatch Log Retention Policies  
Setting logs to **3–7 days** avoids long-term storage costs.

---

# 5. Summary

The Longitudinal Health Analytics Platform is architected for both performance and cost-efficiency.  
Its fully serverless design ensures:

- minimal maintenance  
- automatic scaling  
- extremely low operational cost  
- predictable billing  
- healthcare-grade reliability  

With a cost-per-result of **$0.001**, this solution is significantly cheaper than traditional clinical informatics systems.

---
