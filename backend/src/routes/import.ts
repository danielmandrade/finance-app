import { FastifyInstance } from 'fastify'
import prisma from '../lib/prisma'
import { parseCsv, applyRules } from '../services/csv-parser'

export default async function importRoute(app: FastifyInstance) {
  app.post('/csv', async (req, reply) => {
    const data = await req.file()
    if (!data) return reply.status(400).send({ error: 'No file uploaded' })

    const buffer = await data.toBuffer()
    const content = buffer.toString('utf-8')

    const rules = await prisma.rule.findMany({ orderBy: { priority: 'desc' } })
    const parsed = parseCsv(content)

    let imported = 0
    let skipped = 0
    const errors: string[] = []

    for (const tx of parsed) {
      try {
        const existing = await prisma.transaction.findFirst({ where: { sourceRef: tx.sourceRef } })
        if (existing) { skipped++; continue }

        const match = applyRules(tx.description, rules)

        await prisma.transaction.create({
          data: {
            date: tx.date,
            description: tx.description,
            amount: tx.amount,
            categoryId: match?.categoryId ?? null,
            spendingType: match?.spendingType ?? null,
            source: 'csv-import',
            sourceRef: tx.sourceRef,
          },
        })
        imported++
      } catch (e: any) {
        errors.push(e.message)
      }
    }

    return { imported, skipped, errors, total: parsed.length }
  })

  app.post('/csv/preview', async (req, reply) => {
    const data = await req.file()
    if (!data) return reply.status(400).send({ error: 'No file uploaded' })

    const buffer = await data.toBuffer()
    const content = buffer.toString('utf-8')
    const rules = await prisma.rule.findMany({ orderBy: { priority: 'desc' } })
    const parsed = parseCsv(content)

    const previews = parsed.map((tx) => {
      const match = applyRules(tx.description, rules)
      return {
        ...tx,
        date: tx.date.toISOString(),
        suggestedCategoryId: match?.categoryId ?? null,
        suggestedSpendingType: match?.spendingType ?? null,
      }
    })

    return { total: previews.length, items: previews.slice(0, 100) }
  })
}
