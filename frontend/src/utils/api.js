import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { useSkillsStore } from '../store/skillsStore'
import {
  mockKpis, mockAlertes, mockCandidats, mockClients,
  mockEncarrecs, mockMatchingResults, mockNouCandidat,
} from './mockData'
import {
  SKILL_TESTS, PASS_SCORE, getTest, scoreAttempt, stripAnswers,
  encodeInviteToken, decodeInviteToken, inviteUrl,
} from './skillsEngine'

/**
 * Mode demo: actiu per defecte (la demo pública de GitHub Pages no té backend).
 * Per connectar el backend real: VITE_DEMO=false i VITE_API_URL=https://<backend>.
 */
export const DEMO = (import.meta.env.VITE_DEMO ?? 'true') !== 'false'
const API_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({ baseURL: `${API_URL}/api`, timeout: 30000 })

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
      // HashRouter: la ruta viu després del '#'
      window.location.hash = '#/login'
    }
    return Promise.reject(err)
  }
)

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms))
const ok = (data) => Promise.resolve({ data })

/** Cerca un candidat mock per id (inclou el candidat "nou" de la demo de pujada). */
const trobarCandidatMock = (id) =>
  mockCandidats.find((c) => c.id === +id) || (+id === mockNouCandidat.id ? mockNouCandidat : null)

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
    if (DEMO) { await delay(); return ok(trobarCandidatMock(id) || mockCandidats[0]) }
    return api.get(`/candidates/${id}`)
  },
  upload: async (_file) => {
    if (DEMO) {
      await delay(1200)
      return ok({
        id: mockNouCandidat.id,
        nom: `${mockNouCandidat.nom} ${mockNouCandidat.cognom}`,
        habilitats_tecniques: mockNouCandidat.habilitats_tecniques,
        idiomes: mockNouCandidat.idiomes,
        ultima_posicio: mockNouCandidat.ultima_posicio,
        missatge: 'CV processat correctament',
      })
    }
    const form = new FormData(); form.append('file', _file)
    return api.post('/candidates/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  uploadMassiu: async (files) => {
    if (DEMO) { await delay(2000); return ok({ processats: files.length, duplicats: 0, errors: [], candidats: [] }) }
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
    if (DEMO) {
      await delay()
      const id = 99
      if (data.proves_requerides?.length) useSkillsStore.getState().setProvesEncarrec(id, data.proves_requerides)
      return ok({ id, titol: data.titol, missatge: 'Creat' })
    }
    return api.post('/assignments', data)
  },
  llista: async (params) => {
    if (DEMO) { await delay(); return ok(mockEncarrecs) }
    return api.get('/assignments', { params })
  },
  detall: async (id) => {
    if (DEMO) {
      await delay()
      const enc = mockEncarrecs.find((e) => e.id === +id) || mockEncarrecs[0]
      // Enriquim el pipeline amb el nom del candidat i les proves associades (com fa el backend)
      const pipeline = (enc.pipeline || []).map((p) => {
        const c = trobarCandidatMock(p.candidate_id)
        return { ...p, nom: c ? `${c.nom} ${c.cognom || ''}`.trim() : `Candidat #${p.candidate_id}` }
      })
      const proves_requerides = useSkillsStore.getState().provesEncarrec[enc.id] || []
      return ok({ ...enc, pipeline, proves_requerides })
    }
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
  actualitzarProves: async (id, testIds) => {
    if (DEMO) { await delay(200); useSkillsStore.getState().setProvesEncarrec(+id, testIds); return ok({ proves_requerides: testIds }) }
    return api.patch(`/assignments/${id}/proves`, { proves_requerides: testIds })
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
    if (DEMO) {
      await delay()
      const resultats = Object.values(useSkillsStore.getState().resultats).flat()
      return ok({
        ...mockKpis,
        proves_completades: resultats.length,
        habilitats_verificades: resultats.filter((r) => r.passed).length,
      })
    }
    return api.get('/analytics/dashboard')
  },
}

// ─── Mini-proves d'habilitats (Skill Checks) ─────────────────────────────────
export const skillTestsApi = {
  /** Catàleg complet (en mode real el backend ja retorna les proves sense respostes). */
  catalog: async () => {
    if (DEMO) return ok(SKILL_TESTS.map(stripAnswers))
    return api.get('/skill-tests/catalog')
  },

  /** Resultats de proves d'un candidat. */
  resultatsCandidat: async (candidateId) => {
    if (DEMO) { await delay(150); return ok(useSkillsStore.getState().resultatsDe(+candidateId)) }
    return api.get(`/skill-tests/candidats/${candidateId}/resultats`)
  },

  /** Tots els resultats del tenant (per a la pàgina de proves). */
  resultatsTots: async () => {
    if (DEMO) {
      await delay(150)
      const { resultats } = useSkillsStore.getState()
      const llista = Object.entries(resultats).flatMap(([cid, rs]) => rs.map((r) => {
        const c = trobarCandidatMock(cid)
        return { ...r, candidate_id: +cid, candidat_nom: c ? `${c.nom} ${c.cognom || ''}`.trim() : `Candidat #${cid}` }
      }))
      llista.sort((a, b) => new Date(b.data) - new Date(a.data))
      return ok(llista)
    }
    return api.get('/skill-tests/resultats')
  },

  /** Genera una invitació (enllaç públic) perquè el candidat faci la prova. */
  crearInvitacio: async ({ candidate_id, test_id, assignment_id = null }) => {
    if (DEMO) {
      await delay(200)
      const c = trobarCandidatMock(candidate_id)
      const token = encodeInviteToken({
        candidateId: +candidate_id, testId: test_id, assignmentId: assignment_id,
        candidateName: c ? c.nom : null,
      })
      useSkillsStore.getState().afegirInvitacio({ token, candidate_id: +candidate_id, test_id, assignment_id, creat_el: new Date().toISOString(), completat: false })
      return ok({ token, url: inviteUrl(token) })
    }
    const res = await api.post('/skill-tests/invitacions', { candidate_id, test_id, assignment_id })
    return { data: { ...res.data, url: res.data.url || inviteUrl(res.data.token) } }
  },

  /** Vista pública: prova sense respostes + context de la invitació. */
  obtenirProva: async (token) => {
    if (DEMO) {
      await delay(300)
      const payload = decodeInviteToken(token)
      const test = payload && getTest(payload.testId)
      if (!test) return Promise.reject({ response: { status: 404 } })
      const inv = useSkillsStore.getState().invitacions.find((i) => i.token === token)
      return ok({
        test: stripAnswers(test),
        candidate_id: payload.candidateId,
        candidat_nom: payload.candidateName,
        assignment_id: payload.assignmentId,
        estat: inv?.completat ? 'completat' : 'pendent',
        pass_score: PASS_SCORE,
      })
    }
    return api.get(`/skill-tests/public/${token}`)
  },

  /** Vista pública: envia les respostes i rep la correcció. */
  respondre: async (token, respostes) => {
    if (DEMO) {
      await delay(600)
      const payload = decodeInviteToken(token)
      const test = payload && getTest(payload.testId)
      if (!test) return Promise.reject({ response: { status: 404 } })
      const r = scoreAttempt(test, respostes)
      const resultat = {
        test_id: test.id, skill: test.skill, score: r.score, passed: r.passed, level: r.level,
        correct: r.correct, total: r.total, data: new Date().toISOString(),
        assignment_id: payload.assignmentId,
      }
      const store = useSkillsStore.getState()
      if (payload.candidateId != null) store.afegirResultat(payload.candidateId, resultat)
      store.marcarInvitacioCompletada(token)
      return ok({ ...resultat, details: r.details })
    }
    return api.post(`/skill-tests/public/${token}/respostes`, { respostes })
  },
}

export default api
