import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import transactionsRoute from './routes/transactions'
import categoriesRoute from './routes/categories'
import recurringRoute from './routes/recurring'
import importRoute from './routes/import'
import rulesRoute from './routes/rules'
import dashboardRoute from './routes/dashboard'

async function main() {
  const app = Fastify({ logger: true })

  await app.register(cors, { origin: true })
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } })

  await app.register(transactionsRoute, { prefix: '/api/transactions' })
  await app.register(categoriesRoute, { prefix: '/api/categories' })
  await app.register(recurringRoute, { prefix: '/api/recurring' })
  await app.register(importRoute, { prefix: '/api/import' })
  await app.register(rulesRoute, { prefix: '/api/rules' })
  await app.register(dashboardRoute, { prefix: '/api/dashboard' })

  app.get('/health', async () => ({ status: 'ok' }))

  const port = Number(process.env.PORT) || 3001
  await app.listen({ port, host: '0.0.0.0' })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
