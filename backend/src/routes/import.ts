import { FastifyInstance } from 'fastify'
import prisma from '../lib/prisma'
import { parseCsv, applyRules } from '../services/csv-parser'

export default async function importRoute(app: FastifyInstance) {
  // POST /import/csv  — aceita campo opcional "paymentDate" (YYYY-MM-DD)
  app.post('/csv', async (req, reply) => {
    const parts = req.parts()

    let fileBuffer: Buffer | null = null
    let paymentDate: Date | null = null

    for await (const part of parts) {
      if (part.type === 'file' && part.fieldname === 'file') {
        fileBuffer = await part.toBuffer()
      } else if (part.type === 'field' && part.fieldname === 'paymentDate') {
        const val = part.value as string
        if (val) {
          const d = new Date(val + 'T00:00:00')
          if (!isNaN(d.getTime())) paymentDate = d
        }
      }
    }

    if (!fileBuffer) return reply.status(400).send({ error: 'No file uploaded' })

    const content = fileBuffer.toString('utf-8')
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
            date:         paymentDate ?? tx.date,
            originalDate: paymentDate ? tx.date : null,
            description:  tx.description,
            amount:       tx.amount,
            categoryId:   match?.categoryId ?? null,
            spendingType: match?.spendingType ?? null,
            source:       'csv-import',
            sourceRef:    tx.sourceRef,
          },
        })
        imported++
      } catch (e: any) {
        errors.push(e.message)
      }
    }

    return { imported, skipped, errors, total: parsed.length }
  })

  // POST /import/csv/preview — aceita campo opcional "paymentDate"
  app.post('/csv/preview', async (req, reply) => {
    const parts = req.parts()

    let fileBuffer: Buffer | null = null
    let paymentDate: Date | null = null

    for await (const part of parts) {
      if (part.type === 'file' && part.fieldname === 'file') {
        fileBuffer = await part.toBuffer()
      } else if (part.type === 'field' && part.fieldname === 'paymentDate') {
        const val = part.value as string
        if (val) {
          const d = new Date(val + 'T00:00:00')
          if (!isNaN(d.getTime())) paymentDate = d
        }
      }
    }

    if (!fileBuffer) return reply.status(400).send({ error: 'No file uploaded' })

    const content = fileBuffer.toString('utf-8')
    const rules = await prisma.rule.findMany({ orderBy: { priority: 'desc' } })
    const parsed = parseCsv(content)

    const previews = parsed.map((tx) => {
      const match = applyRules(tx.description, rules)
      return {
        ...tx,
        date:         (paymentDate ?? tx.date).toISOString(),
        originalDate: paymentDate ? tx.date.toISOString() : null,
        suggestedCategoryId:   match?.categoryId ?? null,
        suggestedSpendingType: match?.spendingType ?? null,
      }
    })

    return { total: previews.length, items: previews.slice(0, 100), paymentDate: paymentDate?.toISOString() ?? null }
  })
}
