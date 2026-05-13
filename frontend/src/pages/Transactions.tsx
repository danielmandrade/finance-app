import { useEffect, useState } from 'react'
import { api, Transaction, Category, SpendingType } from '@/lib/api'
import { formatCurrency, formatDate, MONTHS } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Pencil, Trash2, Plus, ChevronLeft, ChevronRight } from 'lucide-react'

const EMPTY_FORM = {
  date: '', description: '', amount: '', categoryId: 'none',
  notes: '', type: 'expense', spendingType: 'none',
}

const SPENDING_OPTIONS: { value: SpendingType | 'none'; label: string; color: string; bg: string }[] = [
  { value: 'none',          label: 'Sem marcação',      color: '#6b7280', bg: '#f3f4f6' },
  { value: 'essential',     label: 'Essencial',         color: '#2563eb', bg: '#eff6ff' },
  { value: 'non_essential', label: 'Não essencial',     color: '#d97706', bg: '#fffbeb' },
  { value: 'discretionary', label: 'Como quiser',       color: '#7c3aed', bg: '#f5f3ff' },
]

function SpendingBadge({ value }: { value: SpendingType | null }) {
  const opt = SPENDING_OPTIONS.find(o => o.value === (value ?? 'none'))
  if (!opt || opt.value === 'none') return null
  return (
    <span
      className="inline-block text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ color: opt.color, background: opt.bg }}
    >
      {opt.label}
    </span>
  )
}

export default function Transactions() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [items, setItems] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [categories, setCategories] = useState<Category[]>([])
  const [filterSpending, setFilterSpending] = useState('all')
  const [form, setForm] = useState(EMPTY_FORM)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const LIMIT = 50

  useEffect(() => { api.categories.list().then(setCategories) }, [])
  useEffect(() => { load() }, [month, year, page, filterSpending])

  async function load() {
    const params: Record<string, string | number> = { month, year, page, limit: LIMIT }
    if (filterSpending !== 'all') params.spendingType = filterSpending
    const res = await api.transactions.list(params)
    setItems(res.items)
    setTotal(res.total)
  }

  function prevMonth() {
    setPage(1)
    if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1)
  }
  function nextMonth() {
    setPage(1)
    if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1)
  }

  function openCreate() {
    setEditing(null)
    setError('')
    setForm({ ...EMPTY_FORM, date: `${year}-${String(month).padStart(2, '0')}-01` })
    setOpen(true)
  }

  function openEdit(t: Transaction) {
    setEditing(t)
    setError('')
    setForm({
      date: t.date.slice(0, 10),
      description: t.description,
      amount: String(Math.abs(t.amount)),
      categoryId: t.categoryId ? String(t.categoryId) : 'none',
      notes: t.notes || '',
      type: t.amount >= 0 ? 'income' : 'expense',
      spendingType: t.spendingType ?? 'none',
    })
    setOpen(true)
  }

  async function save() {
    setError('')
    if (!form.date || !form.description || !form.amount) {
      setError('Preencha data, descrição e valor.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        date: form.date,
        description: form.description,
        amount: form.type === 'income' ? Math.abs(Number(form.amount)) : -Math.abs(Number(form.amount)),
        categoryId: form.categoryId !== 'none' ? Number(form.categoryId) : null,
        notes: form.notes || null,
        spendingType: form.spendingType !== 'none' ? form.spendingType as SpendingType : null,
      }
      if (editing) {
        await api.transactions.update(editing.id, payload)
      } else {
        await api.transactions.create(payload)
      }
      setOpen(false)
      load()
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: number) {
    try {
      await api.transactions.delete(id)
      load()
    } catch (e: any) {
      alert(e.message || 'Erro ao excluir.')
    }
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <h2 className="text-xl font-semibold w-40 text-center">{MONTHS[month - 1]} {year}</h2>
          <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> Novo lançamento</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Novo'} lançamento</DialogTitle></DialogHeader>
            <div className="space-y-3">
              {/* Tipo despesa/receita */}
              <div>
                <label className="text-sm font-medium">Tipo</label>
                <div className="flex mt-1 rounded-md border overflow-hidden">
                  {(['expense', 'income'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, type: t }))}
                      className={`flex-1 py-1.5 text-sm font-medium transition-colors ${
                        form.type === t
                          ? t === 'expense' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                          : 'bg-background text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {t === 'expense' ? 'Despesa' : 'Receita'}
                    </button>
                  ))}
                </div>
              </div>

              <div><label className="text-sm font-medium">Data</label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div><label className="text-sm font-medium">Descrição</label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div><label className="text-sm font-medium">Valor (R$)</label>
                <Input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div><label className="text-sm font-medium">Categoria</label>
                <Select value={form.categoryId} onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sem categoria" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Marcação de necessidade */}
              <div>
                <label className="text-sm font-medium">Marcação</label>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {SPENDING_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, spendingType: opt.value }))}
                      className="text-xs px-3 py-1 rounded-full border-2 font-medium transition-all"
                      style={{
                        color: form.spendingType === opt.value ? 'white' : opt.color,
                        background: form.spendingType === opt.value ? opt.color : opt.bg,
                        borderColor: opt.color,
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div><label className="text-sm font-medium">Notas</label>
                <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button className="w-full" onClick={save} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{total} lançamento(s)</span>
        <div className="flex gap-1 ml-auto">
          {[{ v: 'all', label: 'Todos' }, ...SPENDING_OPTIONS.filter(o => o.value !== 'none').map(o => ({ v: o.value, label: o.label }))].map(({ v, label }) => {
            const opt = SPENDING_OPTIONS.find(o => o.value === v)
            const active = filterSpending === v
            return (
              <button
                key={v}
                onClick={() => { setPage(1); setFilterSpending(v) }}
                className="text-xs px-3 py-1 rounded-full border font-medium transition-all"
                style={active && opt ? { color: 'white', background: opt.color, borderColor: opt.color } : {}}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Data</th>
              <th className="text-left p-3 font-medium">Descrição</th>
              <th className="text-left p-3 font-medium">Categoria</th>
              <th className="text-left p-3 font-medium">Marcação</th>
              <th className="text-right p-3 font-medium">Valor</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map(t => (
              <tr key={t.id} className="border-t hover:bg-muted/30 transition-colors">
                <td className="p-3 whitespace-nowrap">
                  <span className="text-muted-foreground">{formatDate(t.date)}</span>
                  {t.originalDate && (
                    <span className="block text-xs text-muted-foreground/60" title="Data original do extrato">
                      orig: {formatDate(t.originalDate)}
                    </span>
                  )}
                </td>
                <td className="p-3">
                  <div>{t.description}</div>
                  {t.notes && <div className="text-xs text-muted-foreground">{t.notes}</div>}
                </td>
                <td className="p-3">
                  {t.category && (
                    <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full" style={{ background: t.category.color + '22', color: t.category.color }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.category.color }} />
                      {t.category.name}
                    </span>
                  )}
                </td>
                <td className="p-3"><SpendingBadge value={t.spendingType} /></td>
                <td className={`p-3 text-right font-medium ${t.amount < 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {formatCurrency(t.amount)}
                </td>
                <td className="p-3">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(t.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhum lançamento neste mês.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
        </div>
      )}
    </div>
  )
}
