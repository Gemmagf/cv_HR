import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'

import Layout from './components/ui/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import CandidatesPage from './pages/CandidatesPage'
import CandidateDetailPage from './pages/CandidateDetailPage'
import AssignmentsPage from './pages/AssignmentsPage'
import AssignmentDetailPage from './pages/AssignmentDetailPage'
import MatchingPage from './pages/MatchingPage'
import ClientsPage from './pages/ClientsPage'
import UploadPage from './pages/UploadPage'

function PrivateRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/registre" element={<RegisterPage />} />
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
        <Route path="candidats/:id"                      element={<CandidateDetailPage />} />
        <Route path="candidats/upload"                   element={<UploadPage />} />
        <Route path="encarrecs"                          element={<AssignmentsPage />} />
        <Route path="encarrecs/:id"                      element={<AssignmentDetailPage />} />
        <Route path="encarrecs/:id/matching"             element={<MatchingPage />} />
        <Route path="clients"                            element={<ClientsPage />} />
      </Route>
    </Routes>
  )
}
