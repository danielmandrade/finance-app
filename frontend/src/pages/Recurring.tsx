import { useEffect, useState } from 'react'
import { api, Recurring, Category, SpendingType } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react'

const FREQ = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'yearly', label: 'Anual' },
  { value: 'weekly', label: 'Semanal' },
]

const SPENDING_OPTIONS: { value: SpendingType | 'none'; label: string; color: string; bg: string }[] = [
  { value: 'none',          label: 'Sem marcação',  color: '#6b7280', bg: '#f3f4f6' },
  { value: 'essential',     label: 'Essencial',     color: '#2563eb', bg: '#eff6ff' },
  { value: 'non_essential', label: 'Não essencial', color: '#d97706', bg: '#fffbeb' },
  { value: 'discretionary', label: 'Como quiser',   color: '#7c3aed', bg: '#f5f3ff' },
]

const EMPTY = {
  description: '', amount: '', categoryId: 'none',
  frequency: 'monthly', dayOfMonth: '', startDate: '', endDate: '',
  type: 'expense', spendingType: 'none' as SpendingType | 'none',
}

export default function RecurringPage() {
  const [items, setItems] = useState<Recurring[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState<Recurring | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
    api.categories.list().then(setCategories)
  }, [])

  async function load() {
    setItems(await api.recurring.list())
  }

  function openCreate() {
    setEditing(null)
    setError('')
    setForm({ ...EMPTY, startDate: new Date().toISOString().slice(0, 10) })
    setOpen(true)
  }

  function openEdit(r: Recurring) {
    setEditing(r)
    setError('')
    setForm({
      description: r.description,
      amount: String(Math.abs(r.amount)),
      categoryId: r.categoryId ? String(r.categoryId) : 'none',
      frequency: r.frequency,
      dayOfMonth: r.dayOfMonth ? String(r.dayOfMonth) : '',
      startDate: r.startDate.slice(0, 10),
      endDate: r.endDate ? r.endDate.slice(0, 10) : '',
      type: r.amount >= 0 ? 'income' : 'expense',
      spendingType: r.spendingType ?? 'none',
    })
    setOpen(true)
  }

  async function save() {
    setError('')
    if (!form.description || !form.amount || !form.startDate) {
      setError('Preencha descrição, valor e data de início.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        description: form.description,
        amount: form.type === 'income' ? Math.abs(Number(form.amount)) : -Math.abs(Number(form.amount)),
        categoryId: form.categoryId !== 'none' ? Number(form.categoryId) : null,
        frequency: form.frequency,
        dayOfMonth: form.dayOfMonth ? Number(form.dayOfMonth) : null,
        startDate: form.startDate,
        endDate: form.endDate || null,
        spendingType: form.spendingType !== 'none' ? form.spendingType : null,
      }
      if (editing) await api.recurring.update(editing.id, payload)
      else await api.recurring.create(payload)
      setOpen(false)
      load()
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function toggle(r: Recurring) {
    await api.recurring.update(r.id, { active: !r.active } as any)
    load()
  }

  async function remove(id: number) {
    try {
      await api.recurring.delete(id)
      load()
    } catch (e: any) {
      alert(e.message || 'Erro ao excluir.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Lançamentos recorrentes</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" />Novo recorrente</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar' : 'Novo'} lançamento recorrente</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">

              {/* Tipo */}
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
              {/* Marcação */}
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

              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium">Frequência</label>
                  <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FREQ.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><label className="text-sm font-medium">Dia do mês</label>
                  <Input type="number" min="1" max="31" value={form.dayOfMonth} onChange={e => setForm(f => ({ ...f, dayOfMonth: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium">Início</label>
                  <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div><label className="text-sm font-medium">Fim (opcional)</label>
                  <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button className="w-full" onClick={save} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Descrição</th>
              <th className="text-left p-3 font-medium">Categoria</th>
              <th className="text-left p-3 font-medium">Frequência</th>
              <th className="text-left p-3 font-medium">Dia</th>
              <th className="text-right p-3 font-medium">Valor</th>
              <th className="text-center p-3 font-medium">Ativo</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map(r => (
              <tr key={r.id} className={`border-t transition-colors ${r.active ? 'hover:bg-muted/30' : 'opacity-50'}`}>
                <td className="p-3 font-medium">{r.description}</td>
                <td className="p-3">
                  {r.category && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: r.category.color + '22', color: r.category.color }}>
                      {r.category.name}
                    </span>
                  )}
                </td>
                <td className="p-3 text-muted-foreground">{FREQ.find(f => f.value === r.frequency)?.label}</td>
                <td className="p-3 text-muted-foreground">{r.dayOfMonth || '—'}</td>
                <td className={`p-3 text-right font-medium ${r.amount < 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {r.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(r.amount))}
                </td>
                <td className="p-3 text-center">
                  <button
                    onClick={() => toggle(r)}
                    className={`w-8 h-4 rounded-full transition-colors ${r.active ? 'bg-primary' : 'bg-muted'}`}
                  >
                    <span className={`block w-3 h-3 rounded-full bg-white mx-auto transition-transform ${r.active ? 'translate-x-2' : '-translate-x-2'}`} />
                  </button>
                </td>
                <td className="p-3">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">
                <RefreshCw className="h-6 w-6 mx-auto mb-2 opacity-30" />
                Nenhum lançamento recorrente cadastrado.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
