# ManyLanguages Platform

Deployment guide for running the ManyLanguages platform on AWS Lightsail
using Docker, Traefik, PostgreSQL, MySQL, and JATOS.

---

## 🚀 System Requirements

**Recommended Minimum:** - Ubuntu 22.04 LTS - 2 GB RAM (minimum) -
Static public IP attached - Ports 80 and 443 open

> ⚠️ 1GB instances are not sufficient for JATOS + Next.js + databases.

---

## 1️⃣ Create Lightsail Instance

1.  Create a new Ubuntu 22.04 instance.
2.  Attach a Static IP.
3.  Open **Networking → IPv4 Firewall**.
4.  Add:

Port Protocol Source

---

22 TCP 0.0.0.0/0
80 TCP 0.0.0.0/0
443 TCP 0.0.0.0/0

---

## 2️⃣ SSH Into Server

```bash
ssh ubuntu@YOUR_PUBLIC_IP
```

---

## 3️⃣ Update System

```bash
sudo apt update
sudo apt upgrade -y
```

---

## 4️⃣ Add Swap (Critical for Stability)

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Verify:

```bash
free -h
```

---

## 5️⃣ Install Docker

```bash
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
```

Add repository:

```bash
echo   "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu   $(. /etc/os-release && echo "$VERSION_CODENAME") stable" |   sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

Install Docker:

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

---

## 6️⃣ Install Git and Make

```bash
sudo apt install -y git make
```

---

## 7️⃣ Enable Docker Without sudo

```bash
sudo usermod -aG docker $USER
```

Log out and SSH back in.

---

## 8️⃣ Clone Repository

```bash
git clone YOUR_REPO_URL
cd ManyLanguagesPlatform
```

---

## 9️⃣ Create `.env`

```bash
nano .env
```

Example:

```env
MYSQL_ROOT_PASSWORD=LONGPASS
MYSQL_DATABASE=jatos
MYSQL_USER=jatos
MYSQL_PASSWORD=LONGPASS

POSTGRES_USER=postgres
POSTGRES_PASSWORD=LONGPASS
POSTGRES_DB=appdb

NEXT_PUBLIC_JATOS_BASE=https://jatos.many-languages.com
APP_DOMAIN=app.many-languages.com

JATOS_TOKEN=YOUR_TOKEN
```

---

## 🔟 Start Online HTTPS Stack

```bash
make dev-https-online
```

---

## 1️⃣1️⃣ Validate JATOS Token (Online Mode Only)

```bash
make validate-token-online
```

⚠️ Do NOT use `make validate-token` on Lightsail.

---

## 1️⃣2️⃣ Configure DNS

Create A records pointing to your Lightsail static IP:

Type Host Value

---

A app YOUR_IP
A jatos YOUR_IP

Verify:

```bash
dig @8.8.8.8 app.many-languages.com +short
```

---

## 🔐 HTTPS Certificates

Certificates are automatically issued by Traefik when:

- DNS is correct
- Port 443 is open
- First HTTPS request hits the server

Restart Traefik if needed:

```bash
docker restart manylanguagesplatform-traefik-1
```

---

## 🧠 Development Mode Memory Stabilization

`Dockerfile.dev` limits Node memory:

```dockerfile
ENV NODE_OPTIONS="--max-old-space-size=1024"
ENV NEXT_TELEMETRY_DISABLED=1
ENV TSC_COMPILE_ON_ERROR=true
```

Swap must be enabled.

---

## 🧪 Health Checks

```bash
docker ps
docker logs manylanguagesplatform-traefik-1
docker logs manylanguagesplatform-jatos-1
free -h
```

---

## 🚨 Common Issues

**ACME Timeout** - Port 443 blocked

**Rate Limited (429)** - Too many failed cert attempts

**RSC Payload Fetch Error** - Memory pressure → enable swap

**JATOS Using H2** - Wrong compose stack → use `make dev-https-online`

---

## 📌 Production Recommendation

When TypeScript errors are resolved:

- Switch to production build
- Remove Mailhog
- Keep 2GB+ instance
- Keep swap enabled

---

Deployment complete.
