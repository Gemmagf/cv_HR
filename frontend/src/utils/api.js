import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import {
  mockKpis, mockAlertes, mockCandidats, mockClients,
  mockEncarrecs, mockMatchingResults,
} from './mockData'

// Mode demo: actiu sempre que no hi hagi backend real
const DEMO = true

const api = axios.create({ baseURL: '/api', timeout: 30000 })

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !DEMO) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms))
const ok = (data) => Promise.resolve({ data })

// ─── Auth ───────────────────────────────────────────────────────────────────
export const authApi = {
  login: async (email, _password) => {
    if (DEMO) {
      await delay()
      return ok({ access_token: 'demo-token', token_type: 'bearer', rol: 'admin', tenant_id: 1, nom: 'Anna García' })
    }
    return api.post('/auth/login', new URLSearchParams({ username: email, password: _password }))
  },
  registre: async (data) => {
    if (DEMO) {
      await delay()
      return ok({ access_token: 'demo-token', token_type: 'bearer', rol: 'admin', tenant_id: 1, nom: data.nom_usuari })
    }
    return api.post('/auth/registre', data)
  },
}

// ─── Candidats ───────────────────────────────────────────────────────────────
export const candidatesApi = {
  llista: async (params) => {
    if (DEMO) { await delay(); return ok(mockCandidats) }
    return api.get('/candidates', { params })
  },
  detall: async (id) => {
    if (DEMO) { await delay(); return ok(mockCandidats.find((c) => c.id === +id) || mockCandidats[0]) }
    return api.get(`/candidates/${id}`)
  },
  upload: async (_file) => {
    if (DEMO) { await delay(1200); return ok({ id: 99, nom: 'Candidat Demo', missatge: 'CV processat correctament' }) }
    const form = new FormData(); form.append('file', _file)
    return api.post('/candidates/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  uploadMassiu: async (files) => {
    if (DEMO) { await delay(2000); return ok({ processats: files.length, duplicats: 0, errors: [] }) }
    const form = new FormData(); files.forEach((f) => form.append('files', f))
    return api.post('/candidates/upload-massiu', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  actualitzar: async (id, data) => {
    if (DEMO) { await delay(); return ok({ missatge: 'Actualitzat' }) }
    return api.patch(`/candidates/${id}`, data)
  },
  eliminar: async (id) => {
    if (DEMO) { await delay(); return ok({}) }
    return api.delete(`/candidates/${id}`)
  },
}

// ─── Encàrrecs ───────────────────────────────────────────────────────────────
export const assignmentsApi = {
  crear: async (data) => {
    if (DEMO) { await delay(); return ok({ id: 99, titol: data.titol, missatge: 'Creat' }) }
    return api.post('/assignments', data)
  },
  llista: async (params) => {
    if (DEMO) { await delay(); return ok(mockEncarrecs) }
    return api.get('/assignments', { params })
  },
  detall: async (id) => {
    if (DEMO) { await delay(); return ok(mockEncarrecs.find((e) => e.id === +id) || mockEncarrecs[0]) }
    return api.get(`/assignments/${id}`)
  },
  actualitzarEstat: async (id, estat) => {
    if (DEMO) { await delay(); return ok({ missatge: `Estat → ${estat}` }) }
    return api.patch(`/assignments/${id}/estat`, null, { params: { estat } })
  },
  actualitzarEstatCandidatPipeline: async (aId, cId, data) => {
    if (DEMO) { await delay(); return ok({ missatge: `Estat → ${data.estat}` }) }
    return api.patch(`/assignments/${aId}/candidats/${cId}/estat`, data)
  },
  alertes: async () => {
    if (DEMO) { await delay(); return ok(mockAlertes) }
    return api.get('/assignments/alertes')
  },
}

// ─── Matching ────────────────────────────────────────────────────────────────
export const matchingApi = {
  cercar: async (assignmentId, params) => {
    if (DEMO) {
      await delay(800)
      const candidats = mockMatchingResults[+assignmentId] || mockMatchingResults[1]
      return ok({ encarrec_id: +assignmentId, titol: mockEncarrecs.find(e=>e.id===+assignmentId)?.titol || 'Encàrrec', total_candidats: candidats.length, candidats })
    }
    return api.get(`/matching/encarrec/${assignmentId}`, { params })
  },
  proposar: async (assignmentId, candidateIds) => {
    if (DEMO) { await delay(); return ok({ missatge: `${candidateIds.length} candidat(s) afegit(s) al pipeline`, afegits: candidateIds.length }) }
    return api.post(`/matching/encarrec/${assignmentId}/proposar`, candidateIds)
  },
  exportarPdf: async (assignmentId, params) => {
    if (DEMO) {
      await delay(1500)
      // Retorna un blob buit de demo
      return ok(new Blob(['PDF DEMO'], { type: 'application/pdf' }))
    }
    return api.get(`/matching/encarrec/${assignmentId}/exportar-pdf`, { params, responseType: 'blob' })
  },
}

// ─── Clients ─────────────────────────────────────────────────────────────────
export const clientsApi = {
  crear: async (data) => {
    if (DEMO) { await delay(); return ok({ id: 99, nom: data.nom }) }
    return api.post('/clients', data)
  },
  llista: async () => {
    if (DEMO) { await delay(); return ok(mockClients) }
    return api.get('/clients')
  },
  detall: async (id) => {
    if (DEMO) { await delay(); return ok(mockClients.find((c) => c.id === +id) || mockClients[0]) }
    return api.get(`/clients/${id}`)
  },
}

// ─── Analítica ───────────────────────────────────────────────────────────────
export const analyticsApi = {
  dashboard: async () => {
    if (DEMO) { await delay(); return ok(mockKpis) }
    return api.get('/analytics/dashboard')
  },
}

export default api
