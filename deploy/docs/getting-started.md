# Getting Started — Run Your Own Instance

This guide walks you through deploying the ManyLanguages Platform on a
cloud server (such as AWS Lightsail, DigitalOcean, or any Ubuntu VPS).
No Docker or DevOps experience is assumed beyond basic terminal comfort.

By the end you will have:

- The platform running at `https://app.your-domain.com`
- JATOS running at `https://jatos.your-domain.com`
- Automatic HTTPS certificates via Let's Encrypt

---

## Prerequisites

- A cloud server running **Ubuntu 22.04 LTS** (or newer)
  - Minimum 2 GB RAM (1 GB is not enough)
  - At least 10 GB disk space
  - A static / elastic IP address
- A **domain name** you control (e.g. `many-languages.com`)
- **Ports 80, 443, and 22** open in your server's firewall

> Lightsail users: create a new Ubuntu 22.04 instance, attach a Static IP,
> and open ports 80 + 443 under Networking → IPv4 Firewall.

---

## Step 1 — Connect to your server

```bash
ssh ubuntu@YOUR_SERVER_IP
```

---

## Step 2 — Update the system

```bash
sudo apt update && sudo apt upgrade -y
```

---

## Step 3 — Add swap space

Swap prevents out-of-memory crashes on smaller instances.

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Verify with `free -h` — you should see 2 GB swap.

---

## Step 4 — Install Docker

```bash
# Dependencies
sudo apt install -y ca-certificates curl gnupg

# Add Docker's GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add the Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin

# Allow running Docker without sudo
sudo usermod -aG docker $USER
```

**Log out and log back in** for the group change to take effect, then verify:

```bash
docker --version
```

---

## Step 5 — Install Git and Make

```bash
sudo apt install -y git make
```

---

## Step 6 — Clone the repository

```bash
git clone https://github.com/many-languages/ManyLanguagesPlatform.git
cd ManyLanguagesPlatform
```

---

## Step 7 — Configure your environment

On the server, the full stack runs in Docker — configure it with **`deploy/env/prod.env`** only. (Contributors who run the app on their laptop use a **repository root** `.env` for `npm run dev`; that split is explained in [Environment variables — Two layers](environment-variables.md#two-layers-of-configuration).)

```bash
cp deploy/env/prod.env.example deploy/env/prod.env
nano deploy/env/prod.env
```

Fill in **every** value. At minimum you must set:

| Variable              | What to put                       |
| --------------------- | --------------------------------- |
| `JATOS_DOMAIN`        | `jatos.your-domain.com`           |
| `APP_DOMAIN`          | `app.your-domain.com`             |
| `TLS_EMAIL`           | your email (for Let's Encrypt)    |
| `MYSQL_PASSWORD`      | a strong random password          |
| `MYSQL_ROOT_PASSWORD` | a strong random password          |
| `POSTGRES_PASSWORD`   | a strong random password          |
| `SESSION_SECRET_KEY`  | a long random string              |
| `JATOS_TOKEN`         | leave empty for now (see step 10) |

> Tip: generate random passwords with `openssl rand -base64 24`

---

## Step 8 — Set up DNS

In your domain registrar (or DNS provider), create two **A records** pointing
to your server's IP address:

| Type | Host    | Value            |
| ---- | ------- | ---------------- |
| A    | `app`   | `YOUR_SERVER_IP` |
| A    | `jatos` | `YOUR_SERVER_IP` |

Wait a few minutes for DNS to propagate, then verify:

```bash
dig +short app.your-domain.com
dig +short jatos.your-domain.com
```

Both should return your server IP.

---

## Step 9 — Start the platform

```bash
make prod-up-letsencrypt
```

This builds and starts all services. The first run takes a few minutes
(Docker needs to download images and build the app).

Check that containers are running:

```bash
make ps
```

You should see `app`, `postgres`, `jatos`, `jatos-db`, `traefik`, and
`cron-study-status` all running.

> HTTPS certificates are issued automatically by Traefik when DNS is correct
> and port 443 is open. If you see certificate errors in the browser, wait
> a minute and refresh.

---

## Step 10 — Create a JATOS API token

The platform needs an API token to communicate with JATOS.

1. Open `https://jatos.your-domain.com` in your browser.
2. Log in with the default credentials: **admin / admin**.
3. **Change the admin password** immediately.
4. Click your username (top-right) → **API Tokens**.
5. Click **New Token**, name it (e.g. `mlp-token`), and click **Generate**.
6. **Copy the token** — it is shown only once.

Now add the token to your environment file:

```bash
nano deploy/env/prod.env
```

Set `JATOS_TOKEN=your-token-here`, save, then restart:

```bash
make restart
```

---

## Step 11 — Verify everything works

```bash
make validate-token
```

Then open `https://app.your-domain.com` in your browser. You should see
the ManyLanguages Platform login page.

---

## What's next

- Read the [Production Guide](production.md) for security hardening,
  backups, and maintenance.
- See [Troubleshooting](troubleshooting.md) if something isn't working.
- See [Environment Variables](environment-variables.md) for the full
  configuration reference.

---

## Updating to a newer version

```bash
cd ManyLanguagesPlatform
git pull
make prod-up-letsencrypt
```

The `make` command rebuilds the app image and restarts services.
Database migrations run automatically on startup.
