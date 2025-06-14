# Midtrans Express Backend

A simple Express.js backend for integrating with Midtrans payment gateway.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the root directory with the following variables:

```
PORT=3000
MIDTRANS_SERVER_KEY=your_server_key
MIDTRANS_CLIENT_KEY=your_client_key
MIDTRANS_IS_PRODUCTION=false
```

3. Start the server:

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

## API Endpoints

### Health Check

- **GET** `/health`
- Returns server status

### Create Snap Token

- **POST** `/snap-token`
- Request body:

```json
{
  "order_id": "ORDER-123",
  "amount": 100000,
  "customer_details": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "08123456789"
  }
}
```

- Response:

```json
{
  "token": "snap-token-here"
}
```

## Error Handling

The API includes proper error handling for:

- Missing required fields
- Invalid requests
- Server errors

All error responses follow the format:

```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```
