# Bitespeed Identity Reconciliation API

## Deployed URL

- **Deployed API**: `https://bitespeed-identity-kevin.onrender.com`
- **Local testing**: `http://localhost:3000`
- **Route**: `https://bitespeed-identity-kevin.onrender.com/identify`

## Overview

BY - Kevin Tandon 22070122098
This project implements an Identity Reconciliation API for Bitespeed, enabling contact identification and deduplication by email and/or phone number. It manages primary and secondary contacts, merges duplicates, and returns consolidated contact data. Built with Node.js, Express, and Prisma, the API is deployed on Render.com with PostgreSQL for data persistence.

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Validation**: Zod for request validation
- **Testing**: Postman (primary), Jest (development)
- **Build & Dev**: TypeScript, ts-node, nodemon
- **Deployment**: Render.com
- **Dependencies**:
  - **Production**: express, zod, @prisma/client, @prisma/extension-accelerate, dotenv, supertest
  - **Development**: jest, @types/jest, ts-jest, @types/express, @types/node, typescript, ts-node, nodemon

## Database Schema

The database uses a single `Contact` table, defined in `prisma/schema.prisma`:

```prisma
model Contact {
  id              Int             @id @default(autoincrement())
  phoneNumber     String?
  email           String?
  linkedId        Int?
  linkPrecedence  LinkPrecedence
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  deletedAt       DateTime?

  @@index([email])
  @@index([phoneNumber])
}

enum LinkPrecedence {
  primary
  secondary
}
```

### Field Descriptions:

- **id**: Auto-incremented unique identifier
- **phoneNumber, email**: Nullable contact details
- **linkedId**: Links secondary contacts to a primary contact's id
- **linkPrecedence**: `primary` or `secondary`
- **createdAt, updatedAt**: Timestamps for creation and updates
- **deletedAt**: Nullable for soft deletes
- **Indexes**: On `email` and `phoneNumber` for efficient queries

## API Routes
**Sample Body Example to Test**
```json 
{"email":"lorraine@hillvalley.edu","phoneNumber":"123456"}
```
The API exposes one endpoint:

### POST `/identify`

**Purpose**: Identifies or creates contacts based on email and/or phoneNumber, returning a consolidated contact object.

**Request Body** (validated by Zod):

```json
{
  "email": "string | null",
  "phoneNumber": "string | null"
}
```

_At least one field must be non-null._

**Response** (200 OK):

```json
{
  "contact": {
    "primaryContatctId": number,
    "emails": string[],
    "phoneNumbers": string[],
    "secondaryContactIds": number[]
  }
}
```

**Error** (400 Bad Request):

```json
{
  "error": "Invalid input",
  "details": [...]
}
```

### Business Logic:

- Finds matching contacts by email or phone number (case-insensitive for email)
- Creates a new primary contact if no matches exist
- Creates a secondary contact linked to an existing primary if applicable
- Merges primary contacts by `createdAt`, converting the newer one to secondary
- Returns deduplicated emails and phone numbers, prioritizing primary contact data

## File Structure and Functions

### `src/utils/databaseOperations.ts`

Database utilities for contact management.

**Functions**:

- `findMatchingContacts`: Retrieves contacts by email or phone number
- `createPrimaryContact`: Creates a new primary contact
- `createSecondaryContact`: Creates a secondary contact linked to a primary
- `mergePrimaryContacts`: Merges primary contacts, updating linked records
- `buildConsolidatedContact`: Builds a deduplicated contact response

### `src/routes/identify.ts`

Defines the `/identify` endpoint, handling request validation and database operations.

### `src/tests/databaseOperations.test.ts`

Jest tests for database utilities (development use).

- Covers all functions in `databaseOperations.ts`

### `src/tests/identify.test.ts`

Jest tests for the `/identify` endpoint (development use).

- Tests primary/secondary contact creation, merging, duplicates, and invalid input

### `prisma/schema.prisma`

Defines the Contact model and LinkPrecedence enum.

### `Bitespeed_Identity_Reconciliation.postman_collection.json`

Postman collection for automated endpoint testing (recommended).

## Installation & Setup

### Prerequisites

- Node.js (v16 or higher)
- PostgreSQL database
- npm or yarn

### Local Development

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd bitespeed-identity-api
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:

   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/bitespeed_db"
   PORT=3000
   ```

4. **Database Setup**

   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the application**

   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm run build
   npm start
   ```

## Testing

### Using Postman (Recommended)

Import the `Bitespeed_Identity_Reconciliation.postman_collection.json` file into Postman for comprehensive endpoint testing.

### Using Jest (Development)

```bash
npm test
```

## Deployment

The application is configured for deployment on Render.com:

1. Connect your GitHub repository to Render
2. Set environment variables in Render dashboard
3. Deploy using the provided `render.yaml` configuration

## Example Usage

### Creating a new contact:

```bash
curl -X POST [https://your-render-url.onrender.com](https://bitespeed-identity-kevin.onrender.com)/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "john@example.com", "phoneNumber": "1234567890"}'
```

### Response:

```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["john@example.com"],
    "phoneNumbers": ["1234567890"],
    "secondaryContactIds": []
  }
}
```

## Contact Linking Examples

### Scenario 1: Linking by Phone Number

If a contact with phone `1234567890` exists, and a new request comes with the same phone but different email, a secondary contact is created.

### Scenario 2: Merging Primary Contacts

If two separate primary contacts are linked by a new request (e.g., same email), the newer primary becomes secondary to the older one.

## Error Handling

The API includes comprehensive error handling for:

- Invalid input validation
- Database connection issues
- Constraint violations
- Internal server errors

All errors return appropriate HTTP status codes with descriptive messages.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License.
