import { FastifyInstance } from 'fastify'
import prisma from '../lib/prisma'

export default async function transactionsRoute(app: FastifyInstance) {
  app.get('/', async (req) => {
    const { month, year, categoryId, spendingType, page = '1', limit = '50' } = req.query as any
    const where: any = {}
    if (month && year) {
      const start = new Date(Number(year), Number(month) - 1, 1)
      const end = new Date(Number(year), Number(month), 0, 23, 59, 59)
      where.date = { gte: start, lte: end }
    }
    if (categoryId) where.categoryId = Number(categoryId)
    if (spendingType) where.spendingType = spendingType

    const skip = (Number(page) - 1) * Number(limit)
    const [items, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { category: true },
        orderBy: { date: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.transaction.count({ where }),
    ])
    return { items, total, page: Number(page), limit: Number(limit) }
  })

  app.post('/', async (req, reply) => {
    const { date, description, amount, categoryId, notes, source, spendingType } = req.body as any
    if (!date || !description || amount === undefined) {
      return reply.status(400).send({ error: 'date, description and amount required' })
    }
    const transaction = await prisma.transaction.create({
      data: {
        date: new Date(date),
        description,
        amount: Number(amount),
        categoryId: categoryId ? Number(categoryId) : null,
        notes,
        source: source || 'manual',
        spendingType: spendingType || null,
      },
      include: { category: true },
    })
    return reply.status(201).send(transaction)
  })

  app.put('/:id', async (req, reply) => {
    const { id } = req.params as any
    const { date, description, amount, categoryId, notes, spendingType } = req.body as any
    const transaction = await prisma.transaction.update({
      where: { id: Number(id) },
      data: {
        date: date ? new Date(date) : undefined,
        description,
        amount: amount !== undefined ? Number(amount) : undefined,
        categoryId: categoryId !== undefined ? (categoryId ? Number(categoryId) : null) : undefined,
        notes,
        spendingType: spendingType !== undefined ? (spendingType || null) : undefined,
      },
      include: { category: true },
    })
    return transaction
  })

  app.delete('/:id', async (req, reply) => {
    const { id } = req.params as any
    await prisma.transaction.delete({ where: { id: Number(id) } })
    return reply.status(204).send()
  })
}
