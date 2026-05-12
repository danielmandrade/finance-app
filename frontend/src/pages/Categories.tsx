import { useEffect, useState } from 'react'
import { api, Category } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Tags, AlertTriangle } from 'lucide-react'

const PALETTE = [
  // Roxos e azuis
  '#6366f1','#4f46e5','#3b82f6','#0284c7','#0369a1',
  '#06b6d4','#0891b2','#8b5cf6','#7c3aed','#a855f7',
  // Verdes
  '#10b981','#059669','#14b8a6','#0d9488','#84cc16',
  '#65a30d','#22c55e','#16a34a',
  // Vermelhos, laranjas e amarelos
  '#ef4444','#dc2626','#e11d48','#f97316','#ea580c',
  '#f59e0b','#d97706','#eab308','#ca8a04',
  // Rosas
  '#ec4899','#db2777','#f43f5e',
  // Marrons e terrosos
  '#92400e','#78350f','#a16207','#854d0e',
  '#7c2d12','#6b3a2a','#5c3d2e',
  // Cinzas
  '#9ca3af','#6b7280','#4b5563','#374151','#1f2937',
  '#d1d5db','#e5e7eb',
  // Preto e branco
  '#111827','#f9fafb',
]

const EMPTY = { name: '', color: '#6366f1', icon: 'tag' }

export default function Categories() {
  const [items, setItems] = useState<Category[]>([])
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState<Category | null>(null)
  const [open, setOpen] = useState(false)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  async function load() { setItems(await api.categories.list()) }

  function openCreate() { setEditing(null); setForm(EMPTY); setOpen(true) }
  function openEdit(c: Category) { setEditing(c); setForm({ name: c.name, color: c.color, icon: c.icon }); setOpen(true) }

  async function save() {
    if (!form.name.trim()) return
    try {
      if (editing) await api.categories.update(editing.id, form)
      else await api.categories.create(form)
      setOpen(false)
      load()
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar.')
    }
  }

  async function remove(id: number) {
    try {
      await api.categories.delete(id)
      setConfirmId(null)
      load()
    } catch (e: any) {
      setConfirmId(null)
      alert(e.message || 'Erro ao excluir categoria.')
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Categorias</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" />Nova categoria</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Nova'} categoria</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><label className="text-sm font-medium">Nome</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Alimentação" />
              </div>
              <div>
                <label className="text-sm font-medium">Cor</label>
                <div className="flex flex-wrap gap-1.5 mt-2 max-h-36 overflow-y-auto pr-1">
                  {PALETTE.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                      className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 shrink-0"
                      style={{ background: c, borderColor: form.color === c ? '#000' : 'transparent' }}
                      title={c}
                    />
                  ))}
                  <input
                    type="color"
                    value={form.color}
                    onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    className="w-6 h-6 rounded-full cursor-pointer border border-input shrink-0"
                    title="Cor personalizada"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Cor selecionada: <span className="font-mono">{form.color}</span></p>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button className="w-full" onClick={save}>Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {items.map(c => (
          <div key={c.id} className="rounded-lg border hover:bg-muted/30 transition-colors overflow-hidden">
            {confirmId === c.id ? (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                <span className="text-xs text-red-700 dark:text-red-400 flex-1">Excluir "{c.name}"?</span>
                <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => remove(c.id)}>Sim</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setConfirmId(null)}>Não</Button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0" style={{ background: c.color }}>
                    {c.name.slice(0, 1).toUpperCase()}
                  </div>
                  <span className="font-medium text-sm">{c.name}</span>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setConfirmId(c.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                </div>
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <div className="col-span-2 p-8 text-center text-muted-foreground">
            <Tags className="h-8 w-8 mx-auto mb-2 opacity-30" />
            Nenhuma categoria. Crie uma para começar a categorizar seus gastos.
          </div>
        )}
      </div>
    </div>
  )
}
