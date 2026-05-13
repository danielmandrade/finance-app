const BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const hasBody = options?.body !== undefined
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...options?.headers,
    },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// --- Types ---
export interface Category { id: number; name: string; color: string; icon: string }
export type SpendingType = 'essential' | 'non_essential' | 'discretionary'

export interface Transaction {
  id: number; date: string; description: string; amount: number
  categoryId: number | null; category: Category | null; source: string; notes: string | null
  spendingType: SpendingType | null
  originalDate: string | null // data original do extrato quando importado com data de pagamento
}
export interface Recurring {
  id: number; description: string; amount: number; categoryId: number | null
  category: Category | null; frequency: string; dayOfMonth: number | null
  startDate: string; endDate: string | null; active: boolean
  spendingType: SpendingType | null
}
export interface Rule { id: number; pattern: string; categoryId: number; category: Category; spendingType: SpendingType | null; priority: number }
export interface MonthlySummary {
  month: number; year: number; totalExpenses: number; totalIncome: number; balance: number
  transactionCount: number
  bySpendingType: { essential: number; non_essential: number; discretionary: number; unmarked: number }
  byCategory: { name: string; color: string; total: number; count: number }[]
  dailyEvolution: { date: string; amount: number }[]
}
export interface YearlySummary {
  year: number
  months: { month: number; income: number; expenses: number }[]
}

// --- Categories ---
export const api = {
  categories: {
    list: () => request<Category[]>('/categories'),
    create: (data: Partial<Category>) => request<Category>('/categories', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Category>) => request<Category>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/categories/${id}`, { method: 'DELETE' }),
  },
  transactions: {
    list: (params: Record<string, string | number>) => {
      const q = new URLSearchParams(params as any).toString()
      return request<{ items: Transaction[]; total: number }>(`/transactions?${q}`)
    },
    create: (data: Partial<Transaction>) => request<Transaction>('/transactions', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Transaction>) => request<Transaction>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/transactions/${id}`, { method: 'DELETE' }),
  },
  recurring: {
    list: () => request<Recurring[]>('/recurring'),
    create: (data: Partial<Recurring>) => request<Recurring>('/recurring', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Recurring>) => request<Recurring>(`/recurring/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/recurring/${id}`, { method: 'DELETE' }),
    generate: (month: number, year: number) =>
      request<{ generated: number }>('/recurring/generate', { method: 'POST', body: JSON.stringify({ month, year }) }),
  },
  rules: {
    list: () => request<Rule[]>('/rules'),
    create: (data: Partial<Rule>) => request<Rule>('/rules', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Rule>) => request<Rule>(`/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/rules/${id}`, { method: 'DELETE' }),
  },
  dashboard: {
    monthly: (month: number, year: number) =>
      request<MonthlySummary>(`/dashboard/monthly?month=${month}&year=${year}`),
    yearly: (year: number) =>
      request<YearlySummary>(`/dashboard/yearly?year=${year}`),
  },
  import: {
    csv: (file: File, paymentDate?: string) => {
      const form = new FormData()
      form.append('file', file)
      if (paymentDate) form.append('paymentDate', paymentDate)
      return fetch(`${BASE}/import/csv`, { method: 'POST', body: form }).then((r) => r.json())
    },
    preview: (file: File, paymentDate?: string) => {
      const form = new FormData()
      form.append('file', file)
      if (paymentDate) form.append('paymentDate', paymentDate)
      return fetch(`${BASE}/import/csv/preview`, { method: 'POST', body: form }).then((r) => r.json())
    },
  },
}
