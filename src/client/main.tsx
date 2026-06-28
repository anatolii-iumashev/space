/// <reference types="vite/client" />

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthGuard } from './components/AuthGuard'
import { AppShell } from './components/AppShell'
import { CalendarView } from './components/CalendarView'
import { FilesView } from './components/FilesView'
import { MailView } from './components/MailView'
import { SearchView } from './components/SearchView'
import './styles.css'
import './lib/i18n'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthGuard>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<Navigate to="/files" replace />} />
              <Route path="/calendar" element={<CalendarView />} />
              <Route path="/files" element={<FilesView />} />
              <Route path="/mail" element={<MailView />} />
              <Route path="/search" element={<SearchView />} />
            </Route>
          </Routes>
        </AuthGuard>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
