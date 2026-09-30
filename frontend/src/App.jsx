import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/ui/Layout'

// Code-splitting per ruta: cada pàgina és un chunk independent
const LoginPage            = lazy(() => import('./pages/LoginPage'))
const RegisterPage         = lazy(() => import('./pages/RegisterPage'))
const DashboardPage        = lazy(() => import('./pages/DashboardPage'))
const CandidatesPage       = lazy(() => import('./pages/CandidatesPage'))
const CandidateDetailPage  = lazy(() => import('./pages/CandidateDetailPage'))
const AssignmentsPage      = lazy(() => import('./pages/AssignmentsPage'))
const AssignmentDetailPage = lazy(() => import('./pages/AssignmentDetailPage'))
const MatchingPage         = lazy(() => import('./pages/MatchingPage'))
const ClientsPage          = lazy(() => import('./pages/ClientsPage'))
const UploadPage           = lazy(() => import('./pages/UploadPage'))
const SkillTestsPage       = lazy(() => import('./pages/SkillTestsPage'))
const PublicTestPage       = lazy(() => import('./pages/PublicTestPage'))

function PrivateRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  return token ? children : <Navigate to="/login" replace />
}

function Loader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-primary-800 border-t-transparent rounded-full" />
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/registre" element={<RegisterPage />} />
        {/* Ruta pública: el candidat fa la mini-prova sense registrar-se */}
        <Route path="/prova/:token" element={<PublicTestPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"                          element={<DashboardPage />} />
          <Route path="candidats"                          element={<CandidatesPage />} />
          <Route path="candidats/upload"                   element={<UploadPage />} />
          <Route path="candidats/:id"                      element={<CandidateDetailPage />} />
          <Route path="encarrecs"                          element={<AssignmentsPage />} />
          <Route path="encarrecs/:id"                      element={<AssignmentDetailPage />} />
          <Route path="encarrecs/:id/matching"             element={<MatchingPage />} />
          <Route path="clients"                            element={<ClientsPage />} />
          <Route path="proves"                             element={<SkillTestsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}
