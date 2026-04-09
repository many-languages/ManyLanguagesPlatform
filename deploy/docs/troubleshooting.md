# Troubleshooting

Common issues and their solutions. If your problem isn't listed here,
check `make logs` for error messages.

---

## 502 Bad Gateway / JATOS not ready

JATOS takes 30–60 seconds to start after MySQL is healthy. Wait and retry.

```bash
make logs
# or look at JATOS specifically:
docker compose logs jatos
```

If JATOS shows `Database 'default' is in an inconsistent state`, the MySQL
volume has stale state from a different JATOS version. Stop the stack,
remove the volume, and start again (**data loss**):

```bash
make down
docker volume rm compose_jatos-db-data
# then start your mode again
```

---

## Port conflicts / duplicate stacks

Only one deployment mode should own ports 80/443 at a time. Check what's
running:

```bash
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

If another stack is using the same ports, stop it before starting a new mode:

```bash
make down
```

To check if a specific port is in use outside Docker:

```bash
lsof -i :80
lsof -i :443
lsof -i :3000
lsof -i :5433
```

---

## JATOS token not working

1. **Verify the token is set** where your **app** reads it: **repository root**
   `.env` when you run `npm run dev` on the host, or **`deploy/env/<mode>.env`**
   when the app runs in Docker (**dev-fullstack** / **prod**). See
   [Environment variables — Two layers](environment-variables.md#two-layers-of-configuration).
2. **Check JATOS is reachable:**

   ```bash
   curl http://jatos.localhost/jatos
   ```

3. **Verify the token in the JATOS UI** — it may have expired.
4. **Run the validator:**

   ```bash
   make validate-token
   ```

   Or manually:

   ```bash
   JATOS_BASE=http://jatos.localhost JATOS_TOKEN=your-token \
     node scripts/validate-jatos-token.js
   ```

---

## JATOS not accessible / routing issues

1. **Check Traefik logs:**

   ```bash
   docker compose logs traefik
   ```

2. **Verify `JATOS_DOMAIN`** in your env file matches what you're accessing.

3. **Check /etc/hosts** (local development):

   ```bash
   echo "127.0.0.1 jatos.localhost app.localhost" | sudo tee -a /etc/hosts
   ```

4. **Try accessing JATOS directly** (bypassing Traefik):

   ```bash
   docker compose exec jatos curl -s http://localhost:9000/jatos
   ```

---

## Database connection issues

1. **Verify the database is running:**

   ```bash
   make ps
   ```

2. **Check database logs:**

   ```bash
   docker compose logs postgres
   docker compose logs jatos-db
   ```

3. **Verify `DATABASE_URL`** — in Docker modes it's auto-constructed from
   `POSTGRES_*` variables. On the host, set it manually:

   ```
   DATABASE_URL=postgresql://blitz:devpass@localhost:5433/manylanguagesplatform
   ```

---

## Low disk space

Docker images, build cache, and volumes consume significant disk. Check:

```bash
df -h                  # system disk
docker system df       # Docker disk usage
```

Clean up safely:

```bash
make prune             # removes stopped containers, dangling images, build cache
```

For more aggressive cleanup (removes all unused images):

```bash
make prune-all
```

> Pruning does **not** remove your data volumes (`postgres-data`,
> `jatos-db-data`, `jatos-study-data`).

---

## Low memory / app crashes

Symptoms: app crashes during file uploads, hangs during password hashing,
"Connection reset" errors, frequent container restarts, OOM errors in logs.

1. **Check memory:**

   ```bash
   free -h
   docker stats
   ```

2. **Enable swap** (if not already):

   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```

3. The app container has a 4 GB memory limit with a 3 GB Node.js heap
   (`NODE_OPTIONS=--max-old-space-size=3072`). Ensure at least 2–3 GB free
   on the host.

---

## HTTPS certificate errors (Let's Encrypt)

- **ACME timeout:** port 443 is blocked by the firewall.
- **Rate limited (429):** too many failed cert attempts — wait an hour.
- **Wrong domain:** verify DNS A records point to this server:

  ```bash
  dig +short app.your-domain.com
  dig +short jatos.your-domain.com
  ```

- **Restart Traefik** after fixing DNS:

  ```bash
  docker restart $(docker ps -qf name=traefik)
  ```

---

## HTTPS certificate errors (local mkcert)

1. Verify mkcert is installed and trusted: `mkcert -install`
2. Regenerate certificates: `make certs`
3. Restart: `make restart`

---

## Services not starting

1. **Check logs:**

   ```bash
   make logs
   ```

2. **Verify Docker is running:**

   ```bash
   docker info
   ```

3. **Check available resources:**

   ```bash
   docker stats
   df -h
   free -h
   ```

4. **Rebuild from scratch** (if images are corrupted):

   ```bash
   make down
   docker compose build --no-cache
   # then start your mode again
   ```
