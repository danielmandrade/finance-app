# Deploy no Unraid — passo a passo

## 1. Copiar arquivos para o Unraid (rode no seu Mac)

```bash
rsync -av \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='data' \
  --exclude='.git' \
  ~/finance-app/ \
  root@IP_DO_UNRAID:/mnt/user/appdata/finance-app/
```

---

## 2. Rodar o setup (SSH no Unraid)

```bash
ssh root@IP_DO_UNRAID
chmod +x /mnt/user/appdata/finance-app/setup-unraid.sh
/mnt/user/appdata/finance-app/setup-unraid.sh
```

Isso instala dependências, builda o frontend e cria a rede Docker `finance-net`.

---

## 3. Criar o container do Backend no painel do Unraid

**Docker → Add Container → (modo básico)**

| Campo              | Valor                                                    |
|--------------------|----------------------------------------------------------|
| Name               | `finance-backend`                                        |
| Repository         | `node:20-alpine`                                         |
| Network Type       | `finance-net`                                            |
| Console shell      | `sh`                                                     |
| Extra Parameters   | `--workdir /app`                                         |

**Volumes (Add another Path):**

| Container Path | Host Path                                       |
|---------------|-------------------------------------------------|
| `/app`        | `/mnt/user/appdata/finance-app/backend`         |
| `/app/data`   | `/mnt/user/appdata/finance-app/data`            |

**Environment Variables (Add another Variable):**

| Name           | Value                          |
|----------------|-------------------------------|
| `DATABASE_URL` | `file:/app/data/finance.db`   |
| `NODE_ENV`     | `production`                  |
| `PORT`         | `3001`                        |

**Post Arguments (campo no final da tela):**
```
sh -c "node_modules/.bin/prisma migrate deploy && node dist/server.js"
```

> **Nota:** se o Unraid não tiver campo "Post Arguments", use o campo **CMD** ou **Command**.

Clique em **Apply**.

---

## 4. Criar o container do Frontend no painel do Unraid

| Campo        | Valor                  |
|--------------|------------------------|
| Name         | `finance-frontend`     |
| Repository   | `nginx:alpine`         |
| Network Type | `finance-net`          |
| Port         | Host `3000` → Container `80` |

**Volumes:**

| Container Path                          | Host Path                                               |
|-----------------------------------------|---------------------------------------------------------|
| `/usr/share/nginx/html`                 | `/mnt/user/appdata/finance-app/frontend/dist`           |
| `/etc/nginx/conf.d/default.conf`        | `/mnt/user/appdata/finance-app/nginx-unraid.conf`       |

Clique em **Apply**.

---

## 5. Acessar

```
http://IP_DO_UNRAID:3000
```

---

## Atualizar o app no futuro

```bash
# 1. Copie os arquivos novos (mesmo rsync do passo 1)
rsync -av --exclude='node_modules' --exclude='dist' --exclude='data' --exclude='.git' \
  ~/finance-app/ root@IP_DO_UNRAID:/mnt/user/appdata/finance-app/

# 2. Rode o setup novamente (instala novas deps, aplica migrations, rebuilda frontend)
ssh root@IP_DO_UNRAID /mnt/user/appdata/finance-app/setup-unraid.sh

# 3. Reinicie os containers no painel do Unraid (ou via terminal)
docker restart finance-backend finance-frontend
```

## Backup do banco de dados

```bash
ssh root@IP_DO_UNRAID \
  "cp /mnt/user/appdata/finance-app/data/finance.db \
      /mnt/user/appdata/finance-app/data/finance.backup.\$(date +%Y%m%d).db"
```
