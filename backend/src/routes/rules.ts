import { FastifyInstance } from 'fastify'
import prisma from '../lib/prisma'

export default async function rulesRoute(app: FastifyInstance) {
  app.get('/', async () => {
    return prisma.rule.findMany({
      include: { category: true },
      orderBy: [{ priority: 'desc' }, { id: 'asc' }],
    })
  })

  app.post('/', async (req, reply) => {
    const { pattern, categoryId, spendingType, priority } = req.body as any
    if (!pattern || !categoryId) return reply.status(400).send({ error: 'pattern and categoryId required' })
    const rule = await prisma.rule.create({
      data: {
        pattern,
        categoryId: Number(categoryId),
        spendingType: spendingType || null,
        priority: priority ? Number(priority) : 0,
      },
      include: { category: true },
    })
    return reply.status(201).send(rule)
  })

  app.put('/:id', async (req, reply) => {
    const { id } = req.params as any
    const { pattern, categoryId, spendingType, priority } = req.body as any
    const rule = await prisma.rule.update({
      where: { id: Number(id) },
      data: {
        pattern,
        categoryId: categoryId ? Number(categoryId) : undefined,
        spendingType: spendingType !== undefined ? (spendingType || null) : undefined,
        priority: priority !== undefined ? Number(priority) : undefined,
      },
      include: { category: true },
    })
    return rule
  })

  app.delete('/:id', async (req, reply) => {
    const { id } = req.params as any
    await prisma.rule.delete({ where: { id: Number(id) } })
    return reply.status(204).send()
  })
}
