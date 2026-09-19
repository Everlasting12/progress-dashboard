import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider } from './store/AppStore'
import { ToastProvider } from './components/ui/Toast'
import { EntrySheetProvider } from './components/EntrySheet'
import { Layout } from './components/layout/Layout'
import { Home } from './pages/Home'
import { Dashboards } from './pages/Dashboards'
import { DashboardView } from './pages/DashboardView'
import { Analytics } from './pages/Analytics'
import { History } from './pages/History'
import { Settings } from './pages/Settings'

// HashRouter (/#/analytics) works on GitHub Pages without any 404.html redirect trick.
export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <HashRouter>
          <EntrySheetProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="dashboards" element={<Dashboards />} />
                <Route path="d/:id" element={<DashboardView />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="history" element={<History />} />
                <Route path="settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </EntrySheetProvider>
        </HashRouter>
      </ToastProvider>
    </AppProvider>
  )
}
