#!/bin/sh
set -e

echo "==> Construindo imagens..."
docker compose build --no-cache

echo "==> Subindo containers..."
docker compose up -d

echo "==> Aguardando backend ficar saudável..."
attempt=0
until docker compose exec -T backend wget -qO- http://localhost:3001/health > /dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ $attempt -ge 20 ]; then
    echo "ERRO: backend não respondeu em 60s"
    docker compose logs backend
    exit 1
  fi
  sleep 3
done

echo ""
echo "✓ Deploy concluído!"
echo "  Acesse: http://$(hostname -I | awk '{print $1}'):3000"
