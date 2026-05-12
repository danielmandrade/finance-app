import { parse } from 'csv-parse/sync'

export interface ParsedTransaction {
  date: Date
  description: string
  amount: number
  sourceRef: string
}

type Row = Record<string, string>

// Tries to detect Nubank, Inter, XP, generic patterns
function detectFormat(headers: string[]): 'nubank' | 'inter' | 'xp' | 'generic' {
  const h = headers.map((x) => x.toLowerCase().trim())
  if (h.includes('título') || h.includes('categoria') && h.includes('valor')) return 'nubank'
  if (h.includes('descrição') && h.includes('valor (r$)')) return 'inter'
  if (h.some((x) => x.includes('estabelecimento'))) return 'xp'
  return 'generic'
}

function parseAmount(raw: string): number {
  // Handles "1.234,56" and "1234.56" and "-1234.56"
  const cleaned = raw.replace(/[^\d,.-]/g, '')
  const normalized = cleaned.includes(',') && cleaned.includes('.')
    ? cleaned.replace('.', '').replace(',', '.')
    : cleaned.includes(',')
    ? cleaned.replace(',', '.')
    : cleaned
  return parseFloat(normalized) || 0
}

function parseDate(raw: string): Date {
  // Supports DD/MM/YYYY, YYYY-MM-DD
  const parts = raw.trim().split(/[\/\-]/)
  if (parts[0].length === 4) {
    return new Date(`${parts[0]}-${parts[1]}-${parts[2]}`)
  }
  return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
}

function hashRow(date: Date, description: string, amount: number): string {
  return Buffer.from(`${date.toISOString()}|${description}|${amount}`).toString('base64')
}

export function parseCsv(content: string): ParsedTransaction[] {
  const records: Row[] = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  })

  if (records.length === 0) return []

  const headers = Object.keys(records[0])
  const format = detectFormat(headers)
  const results: ParsedTransaction[] = []

  for (const row of records) {
    try {
      let date: Date
      let description: string
      let amount: number

      if (format === 'nubank') {
        date = parseDate(row['date'] || row['Data'])
        description = row['title'] || row['Título'] || row['description'] || ''
        amount = -Math.abs(parseAmount(row['amount'] || row['Valor']))
      } else if (format === 'inter') {
        date = parseDate(row['Data'] || row['data'])
        description = row['Descrição'] || row['descrição'] || ''
        amount = -Math.abs(parseAmount(row['Valor (R$)'] || row['valor (r$)'] || '0'))
      } else {
        // Generic: find likely columns by name similarity
        const dateKey = headers.find((h) => /data|date/i.test(h)) || headers[0]
        const descKey = headers.find((h) => /desc|nome|estabelec|title|histórico/i.test(h)) || headers[1]
        const amtKey = headers.find((h) => /valor|amount|value/i.test(h)) || headers[2]
        date = parseDate(row[dateKey] || '')
        description = row[descKey] || ''
        amount = parseAmount(row[amtKey] || '0')
        if (amount > 0) amount = -amount // treat as expense
      }

      if (!description || isNaN(date.getTime())) continue

      results.push({
        date,
        description: description.trim(),
        amount,
        sourceRef: hashRow(date, description, amount),
      })
    } catch {
      // skip malformed rows
    }
  }

  return results
}

export interface RuleMatch {
  categoryId: number
  spendingType: string | null
}

export function applyRules(
  description: string,
  rules: Array<{ pattern: string; categoryId: number; spendingType: string | null; priority: number }>
): RuleMatch | null {
  const sorted = [...rules].sort((a, b) => b.priority - a.priority)
  const lower = description.toLowerCase()
  for (const rule of sorted) {
    if (lower.includes(rule.pattern.toLowerCase())) {
      return { categoryId: rule.categoryId, spendingType: rule.spendingType }
    }
  }
  return null
}
