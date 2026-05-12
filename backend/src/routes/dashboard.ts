import { FastifyInstance } from 'fastify'
import prisma from '../lib/prisma'

export default async function dashboardRoute(app: FastifyInstance) {
  // Monthly summary
  app.get('/monthly', async (req) => {
    const { month, year } = req.query as any
    const m = Number(month) || new Date().getMonth() + 1
    const y = Number(year) || new Date().getFullYear()

    const start = new Date(y, m - 1, 1)
    const end = new Date(y, m, 0, 23, 59, 59)

    const transactions = await prisma.transaction.findMany({
      where: { date: { gte: start, lte: end } },
      include: { category: true },
    })

    const totalExpenses = transactions
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    const totalIncome = transactions
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0)

    // By category
    const byCategory: Record<string, { name: string; color: string; total: number; count: number }> = {}
    for (const t of transactions.filter((t) => t.amount < 0)) {
      const key = t.categoryId ? String(t.categoryId) : 'uncategorized'
      const name = t.category?.name || 'Sem categoria'
      const color = t.category?.color || '#888888'
      if (!byCategory[key]) byCategory[key] = { name, color, total: 0, count: 0 }
      byCategory[key].total += Math.abs(t.amount)
      byCategory[key].count++
    }

    // By spending type
    const expenses = transactions.filter((t) => t.amount < 0)
    const bySpendingType = {
      essential:     expenses.filter(t => t.spendingType === 'essential').reduce((s, t) => s + Math.abs(t.amount), 0),
      non_essential: expenses.filter(t => t.spendingType === 'non_essential').reduce((s, t) => s + Math.abs(t.amount), 0),
      discretionary: expenses.filter(t => t.spendingType === 'discretionary').reduce((s, t) => s + Math.abs(t.amount), 0),
      unmarked:      expenses.filter(t => !t.spendingType).reduce((s, t) => s + Math.abs(t.amount), 0),
    }

    // Daily evolution
    const byDay: Record<string, number> = {}
    for (const t of transactions) {
      const day = t.date.toISOString().slice(0, 10)
      byDay[day] = (byDay[day] || 0) + t.amount
    }
    const dailyEvolution = Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amount }))

    return {
      month: m,
      year: y,
      totalExpenses,
      totalIncome,
      balance: totalIncome - totalExpenses,
      transactionCount: transactions.length,
      bySpendingType,
      byCategory: Object.values(byCategory).sort((a, b) => b.total - a.total),
      dailyEvolution,
    }
  })

  // Year overview — one bar per month
  app.get('/yearly', async (req) => {
    const { year } = req.query as any
    const y = Number(year) || new Date().getFullYear()

    const start = new Date(y, 0, 1)
    const end = new Date(y, 11, 31, 23, 59, 59)

    const transactions = await prisma.transaction.findMany({
      where: { date: { gte: start, lte: end } },
    })

    const months: { month: number; income: number; expenses: number }[] = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      income: 0,
      expenses: 0,
    }))

    for (const t of transactions) {
      const m = t.date.getMonth()
      if (t.amount > 0) months[m].income += t.amount
      else months[m].expenses += Math.abs(t.amount)
    }

    return { year: y, months }
  })

  // Category trend — last N months for a category
  app.get('/category-trend', async (req) => {
    const { categoryId, months = '6' } = req.query as any
    const n = Number(months)
    const now = new Date()
    const result: { month: number; year: number; total: number }[] = []

    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const start = new Date(d.getFullYear(), d.getMonth(), 1)
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
      const where: any = { date: { gte: start, lte: end }, amount: { lt: 0 } }
      if (categoryId) where.categoryId = Number(categoryId)

      const agg = await prisma.transaction.aggregate({ where, _sum: { amount: true } })
      result.push({
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        total: Math.abs(agg._sum.amount || 0),
      })
    }
    return result
  })
}
