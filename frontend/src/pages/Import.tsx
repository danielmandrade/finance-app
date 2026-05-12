import { useState, useRef } from 'react'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react'

interface Preview {
  date: string; description: string; amount: number
  sourceRef: string; suggestedCategoryId: number | null
}

interface ImportResult { imported: number; skipped: number; errors: string[]; total: number }

export default function Import() {
  const [file, setFile] = useState<File | null>(null)
  const [previews, setPreviews] = useState<Preview[]>([])
  const [result, setResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setResult(null)
    setLoading(true)
    try {
      const res = await api.import.preview(f)
      setPreviews(res.items || [])
    } finally {
      setLoading(false)
    }
  }

  async function handleImport() {
    if (!file) return
    setLoading(true)
    try {
      const res = await api.import.csv(file)
      setResult(res)
      setPreviews([])
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-semibold mb-1">Importar fatura CSV</h2>
        <p className="text-sm text-muted-foreground">Suporte a Nubank, Inter, XP e formato genérico. Duplicatas são ignoradas automaticamente.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <label
            className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
            htmlFor="csv-upload"
          >
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <span className="text-sm font-medium">{file ? file.name : 'Clique ou arraste o arquivo CSV'}</span>
            <span className="text-xs text-muted-foreground mt-1">Máx. 10 MB</span>
          </label>
          <input id="csv-upload" ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
        </CardContent>
      </Card>

      {loading && <p className="text-sm text-muted-foreground">Processando...</p>}

      {result && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" />Importação concluída</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><span className="font-medium text-green-600">{result.imported}</span> importado(s)</p>
            <p><span className="font-medium text-muted-foreground">{result.skipped}</span> duplicata(s) ignorada(s)</p>
            {result.errors.length > 0 && (
              <div className="mt-2">
                <p className="flex items-center gap-1 text-red-500"><AlertCircle className="h-3.5 w-3.5" />{result.errors.length} erro(s)</p>
                {result.errors.slice(0, 3).map((e, i) => <p key={i} className="text-xs text-muted-foreground ml-5">{e}</p>)}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {previews.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {previews.length} transação(ões) detectada(s) — pré-visualização
            </p>
            <Button onClick={handleImport} disabled={loading}>
              {loading ? 'Importando...' : 'Confirmar importação'}
            </Button>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Data</th>
                  <th className="text-left p-3 font-medium">Descrição</th>
                  <th className="text-right p-3 font-medium">Valor</th>
                  <th className="text-left p-3 font-medium">Categoria sugerida</th>
                </tr>
              </thead>
              <tbody>
                {previews.map((p, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-3 text-muted-foreground whitespace-nowrap">{formatDate(p.date)}</td>
                    <td className="p-3 max-w-xs truncate">{p.description}</td>
                    <td className="p-3 text-right text-red-500 font-medium">{formatCurrency(p.amount)}</td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {p.suggestedCategoryId ? `#${p.suggestedCategoryId}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
