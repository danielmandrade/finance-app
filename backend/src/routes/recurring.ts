import { FastifyInstance } from 'fastify'
import prisma from '../lib/prisma'

export default async function recurringRoute(app: FastifyInstance) {
  app.get('/', async () => {
    return prisma.recurring.findMany({
      include: { category: true },
      orderBy: { description: 'asc' },
    })
  })

  app.post('/', async (req, reply) => {
    const { description, amount, categoryId, frequency, dayOfMonth, startDate, endDate, spendingType } = req.body as any
    if (!description || amount === undefined || !frequency || !startDate) {
      return reply.status(400).send({ error: 'description, amount, frequency and startDate required' })
    }
    const recurring = await prisma.recurring.create({
      data: {
        description,
        amount: Number(amount),
        categoryId: categoryId ? Number(categoryId) : null,
        frequency,
        dayOfMonth: dayOfMonth ? Number(dayOfMonth) : null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        spendingType: spendingType || null,
      },
      include: { category: true },
    })
    return reply.status(201).send(recurring)
  })

  app.put('/:id', async (req, reply) => {
    const { id } = req.params as any
    const data = req.body as any
    const recurring = await prisma.recurring.update({
      where: { id: Number(id) },
      data: {
        description: data.description,
        amount: data.amount !== undefined ? Number(data.amount) : undefined,
        categoryId: data.categoryId !== undefined ? (data.categoryId ? Number(data.categoryId) : null) : undefined,
        frequency: data.frequency,
        dayOfMonth: data.dayOfMonth !== undefined ? Number(data.dayOfMonth) : undefined,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate !== undefined ? (data.endDate ? new Date(data.endDate) : null) : undefined,
        active: data.active,
        spendingType: data.spendingType !== undefined ? (data.spendingType || null) : undefined,
      },
      include: { category: true },
    })
    return recurring
  })

  app.delete('/:id', async (req, reply) => {
    const { id } = req.params as any
    await prisma.recurring.delete({ where: { id: Number(id) } })
    return reply.status(204).send()
  })

  app.post('/generate', async (req, reply) => {
    const { month, year } = req.body as any
    if (!month || !year) return reply.status(400).send({ error: 'month and year required' })

    const targetMonth = Number(month)
    const targetYear = Number(year)
    const periodStart = new Date(targetYear, targetMonth - 1, 1)
    const periodEnd = new Date(targetYear, targetMonth, 0)

    const actives = await prisma.recurring.findMany({
      where: {
        active: true,
        startDate: { lte: periodEnd },
        OR: [{ endDate: null }, { endDate: { gte: periodStart } }],
      },
    })

    const created: any[] = []
    for (const r of actives) {
      const day = r.dayOfMonth || 1
      const txDate = new Date(targetYear, targetMonth - 1, day)
      const sourceRef = `recurring-${r.id}-${targetYear}-${targetMonth}`

      const exists = await prisma.transaction.findFirst({ where: { sourceRef } })
      if (exists) continue

      const tx = await prisma.transaction.create({
        data: {
          date: txDate,
          description: r.description,
          amount: r.amount,
          categoryId: r.categoryId,
          spendingType: r.spendingType,
          source: 'recurring',
          sourceRef,
        },
      })
      created.push(tx)
    }
    return { generated: created.length, transactions: created }
  })
}
