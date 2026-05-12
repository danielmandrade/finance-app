import { useEffect, useState } from 'react'
import { api, MonthlySummary, YearlySummary } from '@/lib/api'
import { formatCurrency, MONTHS } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line,
} from 'recharts'
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Wallet, RefreshCw, FileDown } from 'lucide-react'
import { generateMonthlyReport } from '@/lib/pdf'

const DEFAULT_COLORS = [
  '#6366f1','#f59e0b','#10b981','#ef4444','#3b82f6',
  '#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16',
]

export default function Dashboard() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [summary, setSummary] = useState<MonthlySummary | null>(null)
  const [yearly, setYearly] = useState<YearlySummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    load()
  }, [month, year])

  async function load() {
    setLoading(true)
    try {
      const [m, y] = await Promise.all([
        api.dashboard.monthly(month, year),
        api.dashboard.yearly(year),
      ])
      setSummary(m)
      setYearly(y)
    } finally {
      setLoading(false)
    }
  }

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  async function handleGenerate() {
    setGenerating(true)
    try {
      const res = await api.recurring.generate(month, year)
      alert(`${res.generated} lançamento(s) recorrente(s) gerado(s).`)
      load()
    } finally {
      setGenerating(false)
    }
  }

  const pieData = summary?.byCategory.map((c, i) => ({
    name: c.name,
    value: c.total,
    color: c.color !== '#888888' ? c.color : DEFAULT_COLORS[i % DEFAULT_COLORS.length],
  })) || []

  const yearlyData = yearly?.months.map((m) => ({
    name: MONTHS[m.month - 1].slice(0, 3),
    Despesas: m.expenses,
    Receitas: m.income,
  })) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <h2 className="text-xl font-semibold w-40 text-center">
            {MONTHS[month - 1]} {year}
          </h2>
          <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating}>
            <RefreshCw className="h-4 w-4" />
            {generating ? 'Gerando...' : 'Gerar recorrentes'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => summary && generateMonthlyReport(summary)}
            disabled={!summary}
          >
            <FileDown className="h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {loading && <p className="text-muted-foreground text-sm">Carregando...</p>}

      {/* KPIs */}
      {summary && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><TrendingDown className="h-4 w-4 text-red-500" />Despesas</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-red-500">{formatCurrency(summary.totalExpenses)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-500" />Receitas</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-green-500">{formatCurrency(summary.totalIncome)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Wallet className="h-4 w-4" />Saldo</CardTitle></CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatCurrency(summary.balance)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Breakdown por marcação */}
          {summary.bySpendingType && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Despesas por marcação</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { key: 'essential',     label: 'Essencial',     cls: 'bg-blue-50   dark:bg-blue-950/40  text-blue-700   dark:text-blue-300',  bar: 'bg-blue-500'   },
                    { key: 'non_essential', label: 'Não essencial', cls: 'bg-amber-50  dark:bg-amber-950/40 text-amber-700  dark:text-amber-300', bar: 'bg-amber-500'  },
                    { key: 'discretionary', label: 'Como quiser',   cls: 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300', bar: 'bg-violet-500' },
                    { key: 'unmarked',      label: 'Sem marcação',  cls: 'bg-gray-100  dark:bg-gray-800      text-gray-600   dark:text-gray-400',  bar: 'bg-gray-400'   },
                  ].map(({ key, label, cls, bar }) => {
                    const val = summary.bySpendingType[key as keyof typeof summary.bySpendingType]
                    const pct = summary.totalExpenses > 0 ? ((val / summary.totalExpenses) * 100) : 0
                    return (
                      <div key={key} className={`rounded-lg p-3 ${cls}`}>
                        <p className="text-xs font-medium mb-1 opacity-80">{label}</p>
                        <p className="text-base font-bold">{formatCurrency(val)}</p>
                        <div className="mt-2 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                          <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <p className="text-xs mt-1 opacity-60">{pct.toFixed(0)}%</p>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Pie por categoria */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Gastos por categoria</CardTitle></CardHeader>
              <CardContent>
                {pieData.length === 0
                  ? <p className="text-muted-foreground text-sm">Sem dados</p>
                  : (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  )
                }
              </CardContent>
            </Card>

            {/* Top categorias */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Top categorias</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {summary.byCategory.slice(0, 8).map((c, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: c.color !== '#888888' ? c.color : DEFAULT_COLORS[i % DEFAULT_COLORS.length] }} />
                        <span className="text-sm">{c.name}</span>
                      </div>
                      <span className="text-sm font-medium">{formatCurrency(c.total)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Evolução diária */}
          {summary.dailyEvolution.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Evolução diária</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={summary.dailyEvolution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(d) => d.slice(8)} />
                    <YAxis tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Line type="monotone" dataKey="amount" stroke="#6366f1" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Visão anual */}
      {yearly && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Visão anual {year}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={yearlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
