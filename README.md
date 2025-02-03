# FS Splitwise

A simple Node.js + TypeScript expense splitting application using PostgreSQL (Amazon RDS).

## Overview

This project exposes a REST API that allows:
- Creating Users
- Adding Group Expenses (shared among a set of users)
- Recording Settlements between users within a group

Email notifications are sent via **Nodemailer** to members involved in expenses or settlements.

Batch expense uploads are supported through CSV files. The process involves:
1. Requesting a pre-signed URL from the API.
2. Uploading the `.csv` file to that URL.
3. Notifying the API to process the uploaded file.

A **Makefile** is provided for common operations.  
A **Postman collection** is available to simplify API testing.

Expenses remainders are always handled by the payer.

---

## Routes

- **POST /users** - Create a user (body: user data)
- **GET /users** - Get all users
- **GET /groups** - List all groups
- **POST /groups** - Create a new group (body: group name, memberIds)
- **POST /groups/:groupId/expenses** - Add an expense (params: groupId, body: expense data)
- **GET /groups/:groupId/expenses** - Get all expenses (params: groupId)
- **GET /groups/:groupId/expenses/upload/presigned-url** - Get pre-signed URL for CSV upload (params: groupId)
- **POST /groups/:groupId/expenses/upload/process** - Process uploaded CSV (params: groupId)
- **GET /groups/:groupId/balances** - Get group balances (params: groupId)
- **POST /groups/:groupId/settlements** - Settle debt (params: groupId, body: payerId, receiverId)

---

## Entities

### User
- `id`: UUID, PK
- `name`: text
- `email`: text
- `createdAt`: timestamp

### Group
- `id`: UUID, PK
- `name`: text
- `createdAt`: timestamp

### GroupMember
- `userId`: UUID, FK → User.id, PK
- `groupId`: UUID, FK → Group.id, PK
- `joinedAt`: timestamp

### Expense
- `id`: UUID, PK
- `groupId`: UUID, FK → Group.id
- `payerId`: UUID, FK → User.id
- `description`: text
- `amount`: integer (in cents)
- `createdAt`: timestamp

### Balance
- `groupId`: UUID, FK → Group.id, PK
- `userId`: UUID, FK → User.id, PK (the user who owes money)
- `fromUserId`: UUID, FK → User.id, PK (the user they owe money to)
- `owed`: integer (amount owed, positive or negative)

### Relationships
- Users can belong to multiple groups via the **GroupMembers** table (many-to-many).
- Groups have multiple expenses, each linked to a payer (User).
- **Balances** track how much a User owes another within a specific group.

**Data Integrity:**  
- Cascading deletes maintain referential integrity.
- Normalized schema reduces redundancy.

**Sharding (Future work):**  
- Data can be sharded by `group_id`, ensuring all group-related data resides on the same DB instance.  
- Potential hot spots are mitigated through even distribution of groups.

**Indexes:**
- Every entity holding a "groupId" column has an index on this column to speed up reads. 

---

## Tech Stack Overview

### TypeScript & Node.js
- Strong community support, mature ecosystem, efficient for rapid prototyping.
- Chosen due to familiarity and tight project deadlines.

### PostgreSQL (Amazon RDS)

Before choosing PostgreSQL hosted on Amazon RDS, I considered the project requirements and the specific characteristics needed in a database:

1. **Relational Data Needs:**  
   The core entities—Users, Groups, GroupMembers, Expenses, Balances—exhibit strong relational characteristics. Using a normalized relational schema helps reduce storage costs and ensures that updates are consistent across related records.

2. **Transactional Integrity:**  
   Adding an expense or recording a settlement requires updating multiple user balances. This introduces potential conflicts, especially when concurrent operations target the same records. To handle this:
   - I prioritized **ACID transactions** for strong consistency guarantees.
   - This ensures that an expense or settlement is only successful if all associated records are updated atomically.
   - While this approach may slightly reduce write throughput, it significantly enhances reliability, especially for a read-heavy application like this one.

3. **Scalability Considerations:**  
   PostgreSQL supports:
   - **Read Replicas** to scale read operations.
   - **Sharding** to distribute data across instances, although relational databases often face challenges with cross-shard queries.

   **Sharding Strategy:**
   - **User** data is centralized, as each record is lightweight (let say around 256 bytes a record). Even with a million users, this remains manageable (around 256 MB).
   - **Group-related tables** (Group, Expense, GroupMember, Balance) are sharded by `group_id`, ensuring data locality and minimizing cross-instance communication.

4. **Why Not NoSQL?**  
   I considered NoSQL solutions like Cassandra, which excel at handling large-scale reads and writes with ease. However:
   - Ensuring ACID compliance in NoSQL databases often requires complex workarounds.
   - Relational databases naturally support transactions, making them a better fit for this project's consistency requirements.

**Conclusion:**  
PostgreSQL, with its ACID compliance, scalability options, and strong community support, was the ideal choice. Hosting it on Amazon RDS reduces operational overhead and leverages AWS's managed services, which was also aligned with the project's requirements.

### Amazon S3
- Used for storing batch-uploaded CSVs.
- Pre-signed URLs allow secure, time-limited uploads.
- Chosen for reliability, cost-efficiency, and seamless AWS integration.

### Nodemailer
- Handles email notifications via SMTP.
- Simple, well-supported, ideal for our prototype.

---

## Limitations

- Cannot modify group members after creation.
- No detailed expense splits (only payer and total amount).
- Settlements are applied directly; no historical tracking.
- Lacks:
  - Rate limiting
  - Authentication/Authorization
  - Request validation
  - Caching mechanisms
- All groups are publicly accessible (not secure for production).
- Batch uploads are processed synchronously; one failure halts the entire batch.
- No retries for failed DB operations.
- No monitoring or external logging.
- Local deployment only; PostgreSQL runs on a free-tier instance.
- Read replication and sharding are future-proofed but not yet active.

---

## Future Improvements

- **Microservices:** Split into User, Group, Expense services for better scalability.
- **Event-Driven Architecture:** Use Kafka for handling batch uploads and cross-service communication.
- **Data Analytics:** Enable data lakes and advanced analytics pipelines.
- **Enhanced Reliability:** Implement retries, monitoring, and distributed tracing.
- **Read replicas** To improve the overall read throughput
- **Sharding** Increase overall write throughput & storage limitations

---

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure `.env`:**
   ```env
   DATABASE_URL=<rds url>

   # Email notification (if Gmail)
   SMTP_HOST=smtp.gmail.com 
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=<smtp password>

   # AWS
   AWS_ACCESS_KEY_ID=<aws key>
   AWS_SECRET_ACCESS_KEY=<aws secret>
   AWS_REGION=<region>
   S3_BUCKET_NAME=fs-splitwise

   # App settings
   PORT=3000
   NODE_ENV=Development
   ```

3. **Run migrations:**
   ```bash
   npx drizzle-kit push
   ```

4. **Start the application:**
   ```bash
   npm run dev
   ```
