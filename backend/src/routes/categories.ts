import { FastifyInstance } from 'fastify'
import prisma from '../lib/prisma'

export default async function categoriesRoute(app: FastifyInstance) {
  app.get('/', async () => {
    return prisma.category.findMany({ orderBy: { name: 'asc' } })
  })

  app.post('/', async (req, reply) => {
    const { name, color, icon } = req.body as any
    if (!name) return reply.status(400).send({ error: 'name required' })
    const category = await prisma.category.create({ data: { name, color, icon } })
    return reply.status(201).send(category)
  })

  app.put('/:id', async (req, reply) => {
    const { id } = req.params as any
    const { name, color, icon } = req.body as any
    const category = await prisma.category.update({
      where: { id: Number(id) },
      data: { name, color, icon },
    })
    return category
  })

  app.delete('/:id', async (req, reply) => {
    const { id } = req.params as any
    await prisma.category.delete({ where: { id: Number(id) } })
    return reply.status(204).send()
  })
}
