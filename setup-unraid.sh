#!/bin/sh
set -e
APP=/mnt/user/appdata/finance-app

echo "==> 1/4  Instalando dependências do backend..."
cd "$APP/backend"
npm install

echo "==> 2/4  Gerando cliente Prisma e aplicando migrations..."
npx prisma generate
npx prisma migrate deploy

echo "==> 3/4  Instalando dependências e buildando o frontend..."
cd "$APP/frontend"
npm install
npm run build

echo "==> 4/4  Criando rede Docker compartilhada..."
docker network create finance-net 2>/dev/null || echo "  (rede já existe, ok)"

echo ""
echo "✓ Setup concluído! Agora crie os dois containers no painel do Unraid."
echo "  Siga as instruções do README-UNRAID.md"
