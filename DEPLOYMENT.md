# Deployment Guide

This guide explains how to deploy the ManyLanguagesPlatform using Docker Compose. The setup includes:

- **Next.js/Blitz app** - The main application
- **PostgreSQL** - Database for the Blitz app
- **JATOS** - Study management server
- **MySQL** - Database for JATOS
- **Traefik** - Reverse proxy for routing

## Important Security Notes

- 🔒 **Never commit `.env` files** - They are excluded from version control
- 🔒 **Use `.env.example` as a template** - Copy it to `.env` and fill in your values
- 🔒 **Production uses Docker secrets** - See [Production Deployment](#production-deployment) section
- 🔒 **No default passwords** - All credentials must be explicitly set

## Prerequisites

- Docker and Docker Compose installed
- At least 4GB of RAM available
- At least 10GB of free disk space (Docker images, volumes, and build cache can use significant space)
- Ports 3000, 80, 443, and 5433 available (PostgreSQL uses 5433 on host to avoid conflicts with local PostgreSQL)

## Quick Start

### 1. Clone the repository

```bash
git clone <repository-url>
cd ManyLanguagesPlatform
```

### 2. Create environment file

```bash
cp .env.example .env
```

Edit `.env` and configure all required variables. The `.env.example` file contains a template with all required environment variables. **Important:** Replace all placeholder values (especially those marked `CHANGE_ME_IN_PRODUCTION`) with secure values.

**Security Note:** The `.env` file is excluded from version control (via `.gitignore`). Never commit your `.env` file or share it publicly. For production deployments, see the [Production Deployment](#production-deployment) section which uses Docker secrets instead of `.env` files.

### 3. Start the services

```bash
make dev
```

This will:

- Start all Docker containers
- Wait for services to be ready
- Run database migrations automatically
- Start the development server

### 4. Create JATOS API token

The JATOS API token must be created manually through the JATOS UI:

1. **Open JATOS UI** in your browser:

   ```
   http://jatos.localhost
   ```

   (If this doesn't work, try `http://localhost` or check your `/etc/hosts` file)

2. **Login** with default credentials:

   - Username: `admin`
   - Password: `admin`

3. **Navigate to API Tokens**:

   - Click your username in the top-right corner
   - Select "My API tokens" or "API Tokens"

4. **Create a new token**:

   - Click "New Token" or "Create Token"
   - Provide a name (e.g., "docker-token")
   - Set expiration (optional)
   - Click "Generate"

5. **Copy the token** (it will only be shown once!)

6. **Add token to `.env` file**:

   ```env
   JATOS_TOKEN=your-token-here
   ```

7. **Restart the services**:
   ```bash
   make stop
   make dev
   ```

### 5. Validate the token

```bash
make validate-token
```

This will verify that the token is valid and can communicate with JATOS.

## Development Mode

Development mode includes:

- Hot reload for code changes
- Source code mounted as volumes
- Development database with sample data
- Debug logging enabled

### Start development

```bash
make dev
```

### View logs

```bash
make logs
```

### Stop services

```bash
make stop
```

### Prune unused Docker resources

After stopping services, you can clean up unused Docker resources to free up disk space:

```bash
# Safe cleanup (keeps your data volumes)
make prune

# More aggressive cleanup (removes unused volumes too)
make prune-all
```

See the [Maintenance](#maintenance) section for more details.

## Production Mode

Production mode includes:

- Optimized production build
- No source code mounted
- Production database
- HTTPS support (if configured)
- **Docker secrets** for secure credential management

### Production Deployment

Production deployments use **Docker secrets** instead of `.env` files for enhanced security. This ensures sensitive credentials are never stored in environment variables or committed to version control.

#### 1. Create Docker Secrets

Create the required secret files in the `secrets/` directory:

```bash
# Create secrets directory (if it doesn't exist)
mkdir -p secrets

# Generate strong passwords and create secret files
echo -n "your-strong-postgres-password" > secrets/postgres_password.txt
echo -n "your-strong-session-secret" > secrets/session_secret_key.txt
echo -n "your-jatos-token" > secrets/jatos_token.txt
echo -n "your-strong-mysql-root-password" > secrets/mysql_root_password.txt
echo -n "your-strong-mysql-user-password" > secrets/mysql_password.txt

# Set secure file permissions
chmod 600 secrets/*.txt
```

**Important:**

- Use **strong, unique passwords** for each secret
- Never commit the `secrets/` directory to version control (it's in `.gitignore`)
- See `secrets/README.md` for detailed instructions

#### 2. Create Production Environment File

Create a `.env` file with non-sensitive configuration values:

```env
# PostgreSQL Configuration (non-sensitive)
POSTGRES_USER=blitz
POSTGRES_DB=manylanguagesplatform

# MySQL Configuration (non-sensitive)
MYSQL_DATABASE=jatos
MYSQL_USER=jatos

# JATOS Configuration
JATOS_DOMAIN=your-production-domain.com
NEXT_PUBLIC_JATOS_BASE=https://your-production-domain.com

# App Domain
APP_DOMAIN=your-app-domain.com

# Node Environment
NODE_ENV=production
PORT=3000
```

**Note:** Sensitive values (passwords, tokens, secrets) are stored in the `secrets/` directory, not in `.env`.

#### 3. Start Production

```bash
make prod
```

This will use `docker-compose.prod.yml` which reads secrets from the `secrets/` directory.

### Production Configuration Checklist

For production, ensure:

1. ✅ **All Docker secrets are created** with strong, unique values
2. ✅ **File permissions are secure** (`chmod 600` on secret files)
3. ✅ **`.env` file contains only non-sensitive values**
4. ✅ **`JATOS_DOMAIN` is configured** for your production domain
5. ✅ **SSL certificates are set up** for HTTPS
6. ✅ **`NEXT_PUBLIC_JATOS_BASE` matches** your public JATOS URL (use HTTPS)
7. ✅ **Database ports are not exposed** to the internet (remove port mappings in production)
8. ✅ **Regular backups** are configured for databases
9. ✅ **Secrets are rotated** periodically

## Service URLs

After starting the services:

- **Blitz app**: http://localhost:3000
- **JATOS**: http://jatos.localhost (or http://localhost)
- **PostgreSQL**: localhost:5433 (mapped from container port 5432)
- **MySQL (JATOS)**: Internal only (not exposed)

**Note:** PostgreSQL uses port 5433 on the host to avoid conflicts with local PostgreSQL installations. Inside Docker, services connect to `postgres:5432` (internal Docker network).

## Troubleshooting

### JATOS token not working

1. **Verify token is set**:

   ```bash
   make validate-token
   ```

2. **Check JATOS is accessible**:

   ```bash
   curl http://jatos.localhost/jatos
   ```

3. **Verify token in JATOS UI**:
   - Login to JATOS
   - Check if token exists and is not expired
   - Create a new token if needed

### Services not starting

1. **Check logs**:

   ```bash
   make logs
   ```

2. **Verify ports are available**:

   ```bash
   # Check if ports are in use
   lsof -i :3000
   lsof -i :80
   lsof -i :5433  # PostgreSQL uses 5433 on host
   ```

3. **Check Docker resources**:
   ```bash
   docker system df
   docker stats
   ```

### Low memory / App crashes

If the app crashes, hangs, or shows "connection reset" errors, it may be due to low memory or disk space:

**Symptoms:**

- App crashes during file uploads
- App hangs during password hashing or other operations
- "Connection reset" errors in browser
- Container restarts frequently
- OOM (Out of Memory) errors in logs

**Solutions:**

1. **Check available disk space**:

   ```bash
   df -h
   ```

   Ensure you have at least 2-3GB free on the root filesystem (`/`). Docker stores data on the root filesystem by default.

2. **Check Docker disk usage**:

   ```bash
   docker system df
   docker system df -v  # Detailed breakdown
   ```

3. **Prune unused Docker resources**:

   ```bash
   # After stopping services
   make stop

   # Safe cleanup (recommended)
   make prune

   # Or more aggressive cleanup
   docker system prune -a --volumes -f
   ```

   This can free up several GB of space by removing unused images, containers, and build cache.

4. **Check container memory usage**:

   ```bash
   docker stats
   ```

   The app container has a 4GB memory limit. If you see high memory usage or OOM kills:

   - Free up system memory
   - Close other applications
   - Reduce the number of running containers

5. **Verify Node.js memory settings**:
   The app is configured with `NODE_OPTIONS=--max-old-space-size=3072` (3GB heap) in `docker-compose.yml`. This should be sufficient for most operations.

**Important:** If your root filesystem (`/`) is nearly full (less than 500MB free), Docker operations may fail. Clean up Docker resources or move Docker's data directory to a drive with more space.

### Database connection issues

1. **Verify database is running**:

   ```bash
   docker compose ps
   ```

2. **Check database logs**:

   ```bash
   docker compose logs postgres
   ```

3. **Verify DATABASE_URL** in `.env` matches docker-compose configuration

### JATOS not accessible

1. **Check Traefik routing**:

   ```bash
   docker compose logs traefik
   ```

2. **Verify JATOS_DOMAIN** in `.env`

3. **Check /etc/hosts** (for localhost domains):

   ```bash
   echo "127.0.0.1 jatos.localhost" | sudo tee -a /etc/hosts
   ```

4. **Try accessing directly**:
   ```bash
   curl http://localhost/jatos
   ```

## Maintenance

### Pruning Unused Docker Resources

Docker accumulates unused images, containers, networks, and build cache over time. Regular cleanup helps free up disk space and can prevent memory-related issues.

**Check Docker disk usage:**

```bash
docker system df
docker system df -v  # Detailed breakdown
```

**Safe cleanup (recommended):**

```bash
# After stopping services
make stop

# Prune unused resources (keeps your data volumes)
make prune
```

This removes:

- Stopped containers
- Unused networks
- Dangling images
- Build cache

**More aggressive cleanup:**

```bash
make prune-all
```

This removes everything unused, including unused volumes. **Note:** This does NOT affect your project's data volumes (`postgres-data`, `jatos-db-data`, `jatos-study-data`). These are protected and will persist.

**Manual cleanup commands:**

```bash
# Prune unused containers, networks, images, and build cache
docker system prune -a -f

# Prune everything including unused volumes
docker system prune -a --volumes -f

# Prune only unused volumes
docker volume prune -f

# Prune only unused images
docker image prune -a -f
```

**When to prune:**

- After stopping services (`make stop`)
- When disk space is low
- When experiencing memory-related crashes
- Periodically to keep Docker clean

**Note:** Pruning does NOT affect your project's data volumes. Your databases and JATOS study files are safe.

## Clean Installation

To remove all data and start fresh:

```bash
make clean
```

⚠️ **Warning**: This will delete all databases and volumes!

## Environment Variables Reference

### Development (using `.env` file)

All environment variables are defined in `.env.example`. Copy this file to `.env` and fill in the values:

```bash
cp .env.example .env
```

**Required Variables:**

- `POSTGRES_USER` - PostgreSQL username
- `POSTGRES_PASSWORD` - PostgreSQL password
- `POSTGRES_DB` - PostgreSQL database name
- `MYSQL_ROOT_PASSWORD` - MySQL root password
- `MYSQL_DATABASE` - MySQL database name
- `MYSQL_USER` - MySQL username
- `MYSQL_PASSWORD` - MySQL password
- `JATOS_TOKEN` - JATOS API token (created manually via JATOS UI)
- `SESSION_SECRET_KEY` - Blitz session encryption key (use a strong random string)

**Optional Variables:**

- `JATOS_DOMAIN` - JATOS domain for Traefik routing (default: `jatos.localhost`)
- `NEXT_PUBLIC_JATOS_BASE` - Public JATOS URL for browser access (default: `http://jatos.localhost`)
- `APP_DOMAIN` - App domain for Traefik routing (default: `app.localhost`)
- `NODE_ENV` - Node environment (default: `development`)
- `PORT` - Application port (default: `3000`)

**Note:** `DATABASE_URL` is automatically constructed from `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`.

### Production (using Docker Secrets)

In production, sensitive values are stored as Docker secrets in the `secrets/` directory:

**Docker Secrets (required):**

- `secrets/postgres_password.txt` - PostgreSQL password
- `secrets/session_secret_key.txt` - Blitz session encryption key
- `secrets/jatos_token.txt` - JATOS API token
- `secrets/mysql_root_password.txt` - MySQL root password
- `secrets/mysql_password.txt` - MySQL user password

**Environment Variables (non-sensitive, in `.env`):**

- `POSTGRES_USER` - PostgreSQL username
- `POSTGRES_DB` - PostgreSQL database name
- `MYSQL_DATABASE` - MySQL database name
- `MYSQL_USER` - MySQL username
- `JATOS_DOMAIN` - JATOS domain
- `NEXT_PUBLIC_JATOS_BASE` - Public JATOS URL
- `APP_DOMAIN` - App domain
- `NODE_ENV` - Set to `production`

See `secrets/README.md` for detailed instructions on creating and managing secrets.

## Data Persistence

Data is persisted in Docker volumes:

- `postgres-data` - PostgreSQL database
- `jatos-db-data` - MySQL database (JATOS)
- `jatos-study-data` - JATOS study files

To backup data:

```bash
docker compose exec postgres pg_dump -U blitz manylanguagesplatform > backup.sql
```

To restore data:

```bash
docker compose exec -T postgres psql -U blitz manylanguagesplatform < backup.sql
```

## Network Configuration

Services communicate through Docker's internal network:

- **App → PostgreSQL**: `postgres:5432`
- **App → JATOS**: `jatos:9000`
- **JATOS → MySQL**: `jatos-db:3306`
- **Browser → App**: `localhost:3000`
- **Browser → JATOS**: `jatos.localhost` (via Traefik)

## Security Considerations

### Development

- ✅ Use `.env` file for local development (already in `.gitignore`)
- ✅ Never commit `.env` file to version control
- ✅ Use `.env.example` as a template (safe to commit)

### Production

1. **Use Docker secrets** instead of `.env` files for sensitive values
2. **Set strong, unique passwords** for all secrets
3. **Restrict file permissions** on secret files (`chmod 600`)
4. **Never commit secrets** to version control (secrets directory is in `.gitignore`)
5. **Set up HTTPS** for production (configure Traefik with Let's Encrypt)
6. **Limit database access** (don't expose PostgreSQL/MySQL ports in production)
7. **Regularly update** Docker images
8. **Backup databases** regularly
9. **Rotate secrets** periodically (passwords, tokens, session keys)
10. **Use a secrets manager** for large-scale deployments (AWS Secrets Manager, HashiCorp Vault, etc.)

### Best Practices

- 🔒 **Never hardcode secrets** in docker-compose files or code
- 🔒 **Use different passwords** for development and production
- 🔒 **Generate strong passwords** using a password manager or generator
- 🔒 **Store secrets securely** (encrypted backups, separate from code)
- 🔒 **Monitor for exposed secrets** using tools like GitGuardian
- 🔒 **Rotate credentials** after any potential exposure

## Advanced Configuration

### Custom Domain

To use a custom domain:

1. Update `JATOS_DOMAIN` in `.env`
2. Configure DNS to point to your server
3. Update Traefik labels in `docker-compose.yml`
4. Set up SSL certificates (Let's Encrypt or custom)

### HTTPS with Let's Encrypt

1. Configure Traefik with Let's Encrypt (see `deploy/jatos/README.md`)
2. Update `docker-compose.prod.yml` with SSL configuration
3. Set `NEXT_PUBLIC_JATOS_BASE` to `https://your-domain.com`

### Custom Ports

To use different ports, update `docker-compose.yml`:

```yaml
services:
  app:
    ports:
      - "8080:3000" # Use port 8080 instead of 3000

  postgres:
    ports:
      - "5434:5432" # Use port 5434 on host instead of 5433
```

**Note:** The default PostgreSQL port is 5433 on the host to avoid conflicts with local PostgreSQL. Inside Docker, services always connect to `postgres:5432`.

## Support

For issues or questions:

1. Check the logs: `make logs`
2. Validate configuration: `make validate-token`
3. Review this documentation
4. Check JATOS documentation: https://www.jatos.org
5. Check Blitz documentation: https://blitzjs.com
