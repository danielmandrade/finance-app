# Finance App

Aplicativo de controle financeiro pessoal.

## Subir com Docker (produção)

```bash
cp .env.example .env
docker compose up -d --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Desenvolvimento local

### Backend
```bash
cd backend
cp ../.env.example .env
npm install
npx prisma migrate dev --name init
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```

O Vite já faz proxy de `/api/*` → `http://localhost:3001`.

## Funcionalidades

- **Dashboard** mensal com KPIs (despesas / receitas / saldo), gráfico de pizza por categoria, evolução diária e visão anual
- **Lançamentos** manuais com paginação e filtro por mês
- **Importação CSV** de fatura de cartão (Nubank, Inter, XP, genérico) com pré-visualização antes de confirmar — duplicatas ignoradas por hash
- **Despesas recorrentes** — templates que geram lançamentos para o mês selecionado (botão "Gerar recorrentes" no dashboard)
- **Categorias** com cor personalizada
- **Regras de categorização** automática por palavra-chave (case-insensitive, com prioridade)

## Banco de dados

SQLite em `./data/finance.db`. Backup: `cp data/finance.db data/finance.backup.db`.
