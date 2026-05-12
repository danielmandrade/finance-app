import { useEffect, useState } from 'react'
import { api, Rule, Category, SpendingType } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react'

const SPENDING_OPTIONS: { value: SpendingType | 'none'; label: string; color: string; bg: string }[] = [
  { value: 'none',          label: 'Sem marcação',  color: '#6b7280', bg: '#f3f4f6' },
  { value: 'essential',     label: 'Essencial',     color: '#2563eb', bg: '#eff6ff' },
  { value: 'non_essential', label: 'Não essencial', color: '#d97706', bg: '#fffbeb' },
  { value: 'discretionary', label: 'Como quiser',   color: '#7c3aed', bg: '#f5f3ff' },
]

function SpendingBadge({ value }: { value: SpendingType | null }) {
  const opt = SPENDING_OPTIONS.find(o => o.value === (value ?? 'none'))
  if (!opt || opt.value === 'none') return <span className="text-muted-foreground text-xs">—</span>
  return (
    <span className="inline-block text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ color: opt.color, background: opt.bg }}>
      {opt.label}
    </span>
  )
}

const EMPTY = { pattern: '', categoryId: '', spendingType: 'none' as SpendingType | 'none', priority: '0' }

export default function Rules() {
  const [items, setItems] = useState<Rule[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState<Rule | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    load()
    api.categories.list().then(setCategories)
  }, [])

  async function load() { setItems(await api.rules.list()) }

  function openCreate() { setEditing(null); setForm(EMPTY); setOpen(true) }
  function openEdit(r: Rule) {
    setEditing(r)
    setForm({
      pattern: r.pattern,
      categoryId: String(r.categoryId),
      spendingType: r.spendingType ?? 'none',
      priority: String(r.priority),
    })
    setOpen(true)
  }

  async function save() {
    if (!form.pattern.trim() || !form.categoryId) return
    const payload = {
      pattern: form.pattern,
      categoryId: Number(form.categoryId),
      spendingType: form.spendingType !== 'none' ? form.spendingType : null,
      priority: Number(form.priority),
    }
    if (editing) await api.rules.update(editing.id, payload as any)
    else await api.rules.create(payload as any)
    setOpen(false)
    load()
  }

  async function remove(id: number) {
    try {
      await api.rules.delete(id)
      load()
    } catch (e: any) {
      alert(e.message || 'Erro ao excluir.')
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Regras de categorização</h2>
          <p className="text-sm text-muted-foreground">
            Se a descrição da despesa contiver a palavra-chave, aplica categoria e/ou marcação automaticamente.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" />Nova regra</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Nova'} regra</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Palavra-chave</label>
                <Input
                  value={form.pattern}
                  onChange={e => setForm(f => ({ ...f, pattern: e.target.value }))}
                  placeholder="Ex: UBER, IFOOD, MERCADO"
                />
                <p className="text-xs text-muted-foreground mt-1">Busca case-insensitive na descrição</p>
              </div>

              <div>
                <label className="text-sm font-medium">Categoria</label>
                <Select value={form.categoryId} onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Marcação automática</label>
                <div className="flex gap-2 mt-2 flex-wrap">
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

              <div>
                <label className="text-sm font-medium">Prioridade (maior = aplicado primeiro)</label>
                <Input
                  type="number"
                  value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                />
              </div>

              <Button className="w-full" onClick={save}>Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Palavra-chave</th>
              <th className="text-left p-3 font-medium">Categoria</th>
              <th className="text-left p-3 font-medium">Marcação</th>
              <th className="text-right p-3 font-medium">Prioridade</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map(r => (
              <tr key={r.id} className="border-t hover:bg-muted/30 transition-colors">
                <td className="p-3 font-mono font-medium">{r.pattern}</td>
                <td className="p-3">
                  {r.category && (
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: r.category.color + '22', color: r.category.color }}>
                      {r.category.name}
                    </span>
                  )}
                </td>
                <td className="p-3"><SpendingBadge value={r.spendingType} /></td>
                <td className="p-3 text-right text-muted-foreground">{r.priority}</td>
                <td className="p-3">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">
                <BookOpen className="h-6 w-6 mx-auto mb-2 opacity-30" />
                Nenhuma regra cadastrada ainda.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
