import { createContext, useContext, useState, ReactNode } from 'react'

interface MonthCtx {
  month: number
  year: number
  setMonth: (m: number) => void
  setYear: (y: number) => void
  prevMonth: () => void
  nextMonth: () => void
}

const now = new Date()

const MonthContext = createContext<MonthCtx>({
  month: now.getMonth() + 1,
  year: now.getFullYear(),
  setMonth: () => {},
  setYear: () => {},
  prevMonth: () => {},
  nextMonth: () => {},
})

export function MonthProvider({ children }: { children: ReactNode }) {
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  return (
    <MonthContext.Provider value={{ month, year, setMonth, setYear, prevMonth, nextMonth }}>
      {children}
    </MonthContext.Provider>
  )
}

export const useMonth = () => useContext(MonthContext)
