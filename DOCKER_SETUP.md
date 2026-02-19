# Docker Setup Summary

This document provides a quick overview of the Docker setup for ManyLanguagesPlatform.

## 📁 Files Created

### Core Docker Files

- `Dockerfile` - Production build for Next.js/Blitz app
- `Dockerfile.dev` - Development build with hot reload
- `docker-compose.yml` - Main compose file with all services
- `docker-compose.prod.yml` - Production overrides
- `.dockerignore` - Files to exclude from Docker builds

### Configuration Files

- `Makefile` - Convenient commands for Docker operations
- `.env.example` - Environment variables template (see DEPLOYMENT.md for contents)
- `DEPLOYMENT.md` - Comprehensive deployment guide

### Scripts

- `scripts/validate-jatos-token.js` - Validates JATOS API token
- `scripts/README.md` - Documentation for scripts

## 🏗️ Architecture

The Docker setup includes:

1. **PostgreSQL** (host port 5433, container port 5432)

   - Database for Blitz app
   - Persistent volume: `postgres-data`
   - Uses port 5433 on host to avoid conflicts with local PostgreSQL

2. **MySQL** (internal only)

   - Database for JATOS
   - Persistent volume: `jatos-db-data`

3. **JATOS** (port 9000, exposed via Traefik on port 80)

   - Study management server
   - Persistent volume: `jatos-study-data`
   - Configuration: `deploy/jatos/jatos.conf`

4. **Traefik** (port 80)

   - Reverse proxy for routing
   - Routes JATOS requests based on `JATOS_DOMAIN`

5. **Next.js/Blitz App** (port 3000)
   - Main application
   - Development: hot reload enabled
   - Production: optimized build

## 🔧 Quick Start

```bash
# 1. Create .env file
cp .env.example .env

# 2. Edit .env and add JATOS_TOKEN (see DEPLOYMENT.md)

# 3. Start services
make dev

# 4. Access services
# - App: http://localhost:3000
# - JATOS: http://jatos.localhost
```

## 🔁 Docker modes

| Target                  | Description                                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| `make dev`              | Local development with HTTP (default compose file)                                                              |
| `make dev-https`        | Local HTTPS using mkcert certificates (`docker-compose.local-https.yml`)                                        |
| `make dev-https-online` | Online HTTPS via Traefik/Lightsail resolver (`docker-compose.online-https.yml`, needs real domains + TLS email) |
| `make prod`             | Production stack with optimized builds plus Traefik/Let's Encrypt                                               |

### Notes

- `make dev-https` relies on mkcert certificates stored in `certs/` (generated via `make certs`).
- `make dev-https-online` expects `APP_DOMAIN` and `JATOS_DOMAIN` to resolve to this host and `TLS_EMAIL` to be set (Traefik uses it for ACME contact info).
- Traefik stores ACME metadata in `traefik/acme.json`. The Makefile target creates and locks the file, but you can also run `mkdir -p traefik && touch traefik/acme.json && chmod 600 traefik/acme.json` manually if needed.
- Stop the stack (`make stop`) before switching between docker modes to avoid duplicate Traefik instances.

## 📋 Makefile Commands

- `make dev` - Start development environment
- `make prod` - Start production environment
- `make stop` - Stop all services
- `make logs` - View logs
- `make clean` - Remove all containers and volumes (⚠️ data loss)
- `make build` - Build containers
- `make validate-token` - Validate JATOS token
- `make prune` - Prune unused Docker resources (safe, keeps volumes)
- `make prune-all` - Prune all unused Docker resources including volumes (⚠️ more aggressive)

## 🔑 JATOS Token Setup

JATOS requires a manually created API token:

1. Start services: `make dev`
2. Open JATOS UI: http://jatos.localhost
3. Login with: `admin` / `admin`
4. Create API token in user profile
5. Add token to `.env`: `JATOS_TOKEN=your-token-here`
6. Restart: `make stop && make dev`
7. Validate: `make validate-token`

## 🌐 Networking

Services communicate via Docker's internal network:

- **App → PostgreSQL**: `postgres:5432` (internal)
- **App → JATOS**: `jatos:9000` (internal)
- **JATOS → MySQL**: `jatos-db:3306` (internal)
- **Browser → App**: `localhost:3000`
- **Browser → JATOS**: `jatos.localhost` (via Traefik)
- **Host → PostgreSQL**: `localhost:5433` (for external access)

**Note:** PostgreSQL is accessible on port 5433 from the host to avoid conflicts with local PostgreSQL installations.

## 📊 Data Persistence

All data is persisted in Docker volumes:

- `postgres-data` - PostgreSQL database
- `jatos-db-data` - MySQL database (JATOS)
- `jatos-study-data` - JATOS study files

Data persists across container restarts. Use `make clean` to remove all data.

## 🔒 Security Notes

1. **Change default passwords** in production
2. **Set strong `SESSION_SECRET_KEY`** in production
3. **Use HTTPS** in production (configure Traefik)
4. **Rotate JATOS tokens** periodically
5. **Backup databases** regularly

## 📚 Documentation

- **DEPLOYMENT.md** - Complete deployment guide
- **README.md** - Project overview and quick start
- **scripts/README.md** - Script documentation

## 🐛 Troubleshooting

### Services not starting

- Check logs: `make logs`
- Verify ports are available
- Check Docker resources: `docker stats`

### Low memory / App crashes

If the app crashes or hangs due to memory issues:

1. **Check available disk space**:

   ```bash
   df -h
   ```

   Ensure you have at least 2-3GB free on the root filesystem (`/`)

2. **Check Docker disk usage**:

   ```bash
   docker system df
   ```

3. **Prune unused Docker resources**:

   ```bash
   # Safe cleanup (keeps your data volumes)
   make prune

   # Or more aggressive cleanup
   docker system prune -a --volumes -f
   ```

4. **Check container memory limits**:

   ```bash
   docker stats
   ```

   The app container has a 4GB memory limit. If you see OOM (Out of Memory) kills, you may need to:

   - Free up system memory
   - Increase Docker's memory allocation
   - Reduce the number of running containers

5. **Verify Node.js memory settings**:
   The app uses `NODE_OPTIONS=--max-old-space-size=3072` (3GB heap). This is configured in `docker-compose.yml`.

**Common symptoms of low memory:**

- App crashes during file uploads
- App hangs during password hashing
- "Connection reset" errors
- Container restarts frequently
- OOM (Out of Memory) errors in logs

### JATOS token issues

- Validate token: `make validate-token`
- Check JATOS is accessible: `curl http://jatos.localhost/jatos`
- Verify token in JATOS UI

### Database connection issues

- Verify database is running: `docker compose ps`
- Check database logs: `docker compose logs postgres`
- Verify `DATABASE_URL` in `.env`

## 🧹 Maintenance

### Pruning Unused Docker Resources

Docker can accumulate unused images, containers, and volumes over time. Regular cleanup helps free up disk space:

**Safe cleanup (recommended after `make stop`):**

```bash
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

This removes everything unused, including unused volumes (⚠️ does NOT affect your project's data volumes like `postgres-data`).

**Manual cleanup:**

```bash
# Check what would be removed
docker system df

# Prune unused resources
docker system prune -a --volumes -f
```

**Note:** Pruning does NOT affect your project's data volumes (`postgres-data`, `jatos-db-data`, `jatos-study-data`). These are protected and will persist.

## 🔄 Updates

To update the setup:

1. Pull latest changes
2. Rebuild containers: `make build`
3. Restart services: `make stop && make dev`

For production updates:

1. Pull latest changes
2. Rebuild: `docker compose -f docker-compose.yml -f docker-compose.prod.yml build`
3. Restart: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`

## 📝 Environment Variables

Key environment variables (see `.env.example` or `DEPLOYMENT.md` for full list):

- `JATOS_TOKEN` - **Required** - JATOS API token
- `DATABASE_URL` - Auto-constructed from `POSTGRES_*` vars
- `SESSION_SECRET_KEY` - Blitz session encryption key
- `JATOS_DOMAIN` - JATOS domain for Traefik routing
- `NEXT_PUBLIC_JATOS_BASE` - Public JATOS URL for browser access

## 🎯 Next Steps

1. Review `DEPLOYMENT.md` for detailed instructions
2. Create `.env` file from template
3. Start services: `make dev`
4. Create JATOS token (see instructions above)
5. Validate setup: `make validate-token`
6. Access app: http://localhost:3000

For production deployment, see `DEPLOYMENT.md` for security considerations and HTTPS setup.
