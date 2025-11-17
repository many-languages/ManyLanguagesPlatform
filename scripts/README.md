# Scripts Directory

This directory contains utility scripts for the ManyLanguagesPlatform deployment.

## validate-jatos-token.js

Validates the JATOS API token by calling the JATOS API endpoint `/jatos/api/v1/admin/token`.

### Usage

```bash
# From the project root
make validate-token

# Or directly with Docker Compose
docker compose --profile validation run --rm jatos-token-validator
```

### What it does

1. Checks if `JATOS_TOKEN` environment variable is set
2. Waits for JATOS to be ready (checks if JATOS is accessible)
3. Validates the token by calling JATOS API
4. Provides clear instructions if token is missing or invalid

### Environment Variables

- `JATOS_BASE` - JATOS base URL (default: `http://jatos:9000`)
- `JATOS_TOKEN` - JATOS API token (required)

### Example Output

**Success:**
```
✅ JATOS token is valid!
   User: admin
   Expires: Never
```

**Failure:**
```
❌ JATOS_TOKEN environment variable is not set

📝 To create a JATOS API token:
   1. Start the Docker services: make dev
   2. Open JATOS UI: http://jatos.localhost
   3. Login with admin/admin
   4. Navigate to "My API tokens"
   5. Create a new token
   6. Add token to .env file: JATOS_TOKEN=your-token-here
   7. Restart services: make stop && make dev
```

