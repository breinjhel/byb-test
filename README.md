# BYB Secure PDF Download Service

This repository contains a proof-of-concept implementation for the Before You Buy (BYB) platform's secure PDF download feature. The solution allows customers who have purchased property inspection reports to securely download these reports with appropriate validation, expiration, and access controls.

## Architecture

The solution uses a token-based approach to secure the download links:

1. When a customer purchases a report, the system generates a secure download token
2. The token contains encrypted information about:
   - The user who purchased the report
   - The report being downloaded
   - An expiration timestamp
   - A unique identifier
3. This token is included in the download URL sent to the customer
4. When the download URL is accessed, the system:
   - Validates the token's authenticity
   - Checks if it has expired
   - Verifies the user has permission to access the requested file
   - Serves the PDF if all checks pass, or returns an appropriate error

## Security Features

Token-based Authentication: Uses JWT tokens to validate download requests
Time-limited Access: Download links automatically expire after a configurable period (default 24 hours)
Single-use Links: Each download link can only be used once
IP Tracking: Records the IP address of download attempts for security monitoring
Rate Limiting: Prevents abuse through request rate limiting
Error Handling: Shows appropriate errors for invalid download attempts

## Technology Stack

- **Backend**: Node.js with Express
- **Language**: TypeScript
- **Authentication**: JWT (JSON Web Tokens)
- **Testing**: Jest

## Project Structure

```
byb-secure-download/
├── src/
│   ├── config/            # Configuration files
│   ├── controllers/       # Request handlers
│   ├── middlewares/       # Express middlewares
│   ├── models/            # Data models (mock)
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   ├── utils/             # Utility functions
│   └── app.ts             # Express application setup
├── tests/                 # Unit and integration tests
├── .env.example           # Environment variables template
├── package.json           # Project dependencies
├── tsconfig.json          # TypeScript configuration
└── README.md              # Project documentation
```

## How to Run

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Copy `.env.example` to `.env` and set appropriate values
4. Run the development server:
   ```
   npm run dev
   ```
5. For testing:
   ```
   npm test
   ```

## API Endpoints

### POST /api/download-tokens
Creates a new download token for a purchased report.

**Request Body**:
```json
{
  "orderId": "order1",
  "userId": "user1"
}
```

**Response**:
```json
{
  "downloadUrl": "http://localhost:3000/api/download/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### GET /api/download/:token
Downloads the PDF report using the provided token.

## Mock Implementation Details

Since this is a proof-of-concept, the following aspects are mocked:
- Database operations use in-memory data
- File storage operations simulate downloading from S3
- User authentication is simplified