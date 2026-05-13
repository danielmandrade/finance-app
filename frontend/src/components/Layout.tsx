import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, List, Upload, RefreshCw, Tags, BookOpen, Sun, Moon, PieChart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/lib/theme'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Lançamentos', icon: List },
  { to: '/category-report', label: 'Por categoria', icon: PieChart },
  { to: '/import', label: 'Importar CSV', icon: Upload },
  { to: '/recurring', label: 'Recorrentes', icon: RefreshCw },
  { to: '/categories', label: 'Categorias', icon: Tags },
  { to: '/rules', label: 'Regras', icon: BookOpen },
]

export default function Layout() {
  const { theme, toggle } = useTheme()

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-56 border-r flex flex-col py-6 px-3 shrink-0">
        <div className="px-3 mb-6">
          <h1 className="text-lg font-bold text-primary">💰 Finanças</h1>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={toggle}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors mt-2"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
