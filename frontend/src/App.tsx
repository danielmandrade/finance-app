import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Import from './pages/Import'
import Recurring from './pages/Recurring'
import Categories from './pages/Categories'
import Rules from './pages/Rules'
import CategoryReport from './pages/CategoryReport'
import { MonthProvider } from './lib/month-context'

export default function App() {
  return (
    <MonthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="category-report" element={<CategoryReport />} />
            <Route path="import" element={<Import />} />
            <Route path="recurring" element={<Recurring />} />
            <Route path="categories" element={<Categories />} />
            <Route path="rules" element={<Rules />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </MonthProvider>
  )
}
