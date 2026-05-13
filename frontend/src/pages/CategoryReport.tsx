import { useEffect, useState } from 'react'
import { api, Transaction } from '@/lib/api'
import { formatCurrency, formatDate, MONTHS } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { useMonth } from '@/lib/month-context'

interface CategoryRow {
  categoryId: number | null
  name: string
  color: string
  total: number
  count: number
}

const DEFAULT_COLORS = [
  '#6366f1','#f59e0b','#10b981','#ef4444','#3b82f6',
  '#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16',
]

function rowKey(c: CategoryRow) {
  return c.categoryId !== null ? String(c.categoryId) : 'null'
}

export default function CategoryReport() {
  const { month, year, prevMonth, nextMonth } = useMonth()
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [txMap, setTxMap] = useState<Record<string, Transaction[]>>({})
  const [txLoading, setTxLoading] = useState<Set<string>>(new Set())

  useEffect(() => {
    load()
  }, [month, year])

  async function load() {
    setLoading(true)
    setExpanded(new Set())
    setTxMap({})
    try {
      const summary = await api.dashboard.monthly(month, year)
      setCategories(summary.byCategory)
    } finally {
      setLoading(false)
    }
  }

  async function toggleExpand(cat: CategoryRow) {
    const key = rowKey(cat)
    const next = new Set(expanded)

    if (next.has(key)) {
      next.delete(key)
      setExpanded(next)
      return
    }

    next.add(key)
    setExpanded(next)

    if (!txMap[key]) {
      setTxLoading(s => new Set(s).add(key))
      try {
        const params: Record<string, string | number> = { month, year, limit: 500, sortBy: 'date', sortDir: 'asc' }
        if (cat.categoryId !== null) params.categoryId = cat.categoryId
        else params.categoryId = 'null'
        const res = await api.transactions.list(params)
        setTxMap(m => ({ ...m, [key]: res.items }))
      } finally {
        setTxLoading(s => { const n = new Set(s); n.delete(key); return n })
      }
    }
  }

  const grandTotal = categories.reduce((s, c) => s + c.total, 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
        <h2 className="text-xl font-semibold w-40 text-center">{MONTHS[month - 1]} {year}</h2>
        <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </div>
      )}

      {!loading && categories.length === 0 && (
        <p className="text-muted-foreground text-sm">Nenhuma despesa neste mês.</p>
      )}

      {/* Tabela de categorias */}
      {categories.length > 0 && (
        <div className="rounded-lg border overflow-hidden">
          {/* Cabeçalho */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">
            <span>Categoria</span>
            <span className="w-16 text-center">Qtd</span>
            <span className="w-28 text-right">% do total</span>
            <span className="w-32 text-right pr-2">Total</span>
          </div>

          {categories.map((cat, idx) => {
            const key = rowKey(cat)
            const isOpen = expanded.has(key)
            const isLoadingTx = txLoading.has(key)
            const txList = txMap[key] || []
            const pct = grandTotal > 0 ? (cat.total / grandTotal) * 100 : 0
            const color = cat.color !== '#888888' ? cat.color : DEFAULT_COLORS[idx % DEFAULT_COLORS.length]

            return (
              <div key={key} className="border-t">
                {/* Linha da categoria */}
                <button
                  className="w-full grid grid-cols-[1fr_auto_auto_auto] items-center px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                  onClick={() => toggleExpand(cat)}
                >
                  {/* Nome + cor */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    {isOpen
                      ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    }
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                    <span className="text-sm font-medium truncate">{cat.name}</span>
                  </div>

                  {/* Qtd */}
                  <span className="w-16 text-center text-sm text-muted-foreground">{cat.count}</span>

                  {/* Barra de progresso + % */}
                  <div className="w-28 flex items-center gap-2 justify-end">
                    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">{pct.toFixed(0)}%</span>
                  </div>

                  {/* Total */}
                  <span className="w-32 text-right text-sm font-semibold text-red-500 pr-2">
                    {formatCurrency(cat.total)}
                  </span>
                </button>

                {/* Transações expandidas */}
                {isOpen && (
                  <div className="border-t bg-muted/20">
                    {isLoadingTx ? (
                      <div className="flex items-center gap-2 px-8 py-3 text-sm text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando lançamentos...
                      </div>
                    ) : txList.length === 0 ? (
                      <p className="px-8 py-3 text-sm text-muted-foreground">Nenhum lançamento.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-muted-foreground border-b">
                            <th className="text-left px-8 py-1.5 font-medium">Data</th>
                            <th className="text-left px-3 py-1.5 font-medium">Descrição</th>
                            <th className="text-right px-4 py-1.5 font-medium">Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {txList.map(t => (
                            <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                              <td className="px-8 py-2 whitespace-nowrap text-muted-foreground">
                                {formatDate(t.date)}
                              </td>
                              <td className="px-3 py-2">
                                <div>{t.description}</div>
                                {t.notes && <div className="text-xs text-muted-foreground">{t.notes}</div>}
                              </td>
                              <td className={`px-4 py-2 text-right font-medium ${t.amount < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                {formatCurrency(t.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t bg-muted/30">
                            <td colSpan={2} className="px-8 py-2 text-xs font-medium text-muted-foreground">
                              {txList.length} lançamento(s)
                            </td>
                            <td className="px-4 py-2 text-right text-sm font-bold text-red-500">
                              {formatCurrency(cat.total)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* Rodapé com total geral */}
          <div className="border-t bg-muted/50 grid grid-cols-[1fr_auto_auto_auto] items-center px-4 py-3">
            <span className="text-sm font-semibold">Total</span>
            <span className="w-16 text-center text-sm text-muted-foreground">
              {categories.reduce((s, c) => s + c.count, 0)}
            </span>
            <span className="w-28" />
            <span className="w-32 text-right text-sm font-bold text-red-500 pr-2">
              {formatCurrency(grandTotal)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
