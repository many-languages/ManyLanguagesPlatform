# Docker Secrets for Production

This directory contains Docker secrets files for production deployment. **These files should NEVER be committed to version control.**

## Required Secret Files

Create the following files in this directory for production deployment:

- `postgres_password.txt` - PostgreSQL database password
- `session_secret_key.txt` - Blitz session encryption key (should be a strong random string)
- `jatos_token.txt` - JATOS API token
- `mysql_root_password.txt` - MySQL root password for JATOS database
- `mysql_password.txt` - MySQL user password for JATOS database

## Setup Instructions

1. **Create the secret files** (one secret per file, no newlines):

   ```bash
   # Generate a strong password for PostgreSQL
   echo -n "your-strong-postgres-password" > secrets/postgres_password.txt

   # Generate a strong session secret (use a random string generator)
   echo -n "your-strong-session-secret-key" > secrets/session_secret_key.txt

   # Add your JATOS token
   echo -n "your-jatos-token" > secrets/jatos_token.txt

   # Generate MySQL passwords
   echo -n "your-strong-mysql-root-password" > secrets/mysql_root_password.txt
   echo -n "your-strong-mysql-user-password" > secrets/mysql_password.txt
   ```

2. **Set proper file permissions** (recommended):

   ```bash
   chmod 600 secrets/*.txt
   ```

3. **Verify secrets are not tracked by Git**:

   ```bash
   git status
   ```

   The `secrets/` directory should not appear in git status (it's in `.gitignore`).

## Security Best Practices

- ✅ **Never commit secrets to version control**
- ✅ **Use strong, unique passwords** for each secret
- ✅ **Restrict file permissions** (chmod 600) on secret files
- ✅ **Rotate secrets regularly** in production
- ✅ **Use a secrets manager** (AWS Secrets Manager, HashiCorp Vault, etc.) for production environments
- ✅ **Backup secrets securely** (encrypted, separate from code)
- ❌ **Don't share secrets via email or chat**
- ❌ **Don't store secrets in environment variables** in production (use this secrets mechanism instead)

## Using Secrets in Production

When deploying with `docker-compose.prod.yml`, Docker Compose will automatically mount these secrets into containers at `/run/secrets/<secret_name>`. The application reads these files and uses them as environment variables.

## Alternative: Using a Secrets Manager

For production environments, consider using a secrets manager instead of files:

- **AWS Secrets Manager** - For AWS deployments
- **HashiCorp Vault** - For on-premises or cloud deployments
- **Docker Swarm secrets** - For Docker Swarm clusters
- **Kubernetes secrets** - For Kubernetes deployments

If using a secrets manager, you'll need to modify `docker-compose.prod.yml` to fetch secrets from your chosen service instead of reading from files.

