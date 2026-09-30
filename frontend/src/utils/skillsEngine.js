/**
 * Motor de mini-proves d'habilitats (Skill Checks).
 *
 * Funcions pures que:
 *  - relacionen les habilitats d'un CV amb les proves del catàleg (proactiu per al candidat),
 *  - proposen quines proves tècniques són rellevants per a una posició nova (per a l'empresa),
 *  - corregeixen un intent i en calculen el nivell assolit.
 *
 * El catàleg (`src/data/skillTests.json`) és la mateixa font que fa servir el backend
 * (`backend/app/data/skill_tests.json`), així els resultats coincideixen en mode demo i real.
 */
import catalog from '../data/skillTests.json'

export const SKILL_TESTS = catalog.tests
export const PASS_SCORE = catalog.pass_score
export const LEVELS = catalog.levels

const MIN_MATCH_LEN = 3

/** Minúscules, sense accents ni espais sobrants. */
export function normalize(str) {
  return (str || '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Text localitzat d'un camp { ca, en, es } amb fallback a en → ca. */
export function pickText(obj, lang) {
  if (obj == null) return ''
  if (typeof obj === 'string') return obj
  const code = (lang || 'ca').split('-')[0]
  return obj[code] ?? obj.en ?? obj.ca ?? Object.values(obj)[0] ?? ''
}

export function getTest(testId) {
  return SKILL_TESTS.find((t) => t.id === testId) || null
}

/** Termes que identifiquen una prova: la pròpia habilitat i els seus àlies. */
function testTerms(test) {
  return [test.skill, ...(test.aliases || [])].map(normalize).filter(Boolean)
}

/** Coincidència tolerant entre una habilitat del CV i un terme del catàleg. */
function termsMatch(skill, term) {
  if (!skill || !term) return false
  if (skill === term) return true
  if (skill.length < MIN_MATCH_LEN || term.length < MIN_MATCH_LEN) return false
  // "excel avançat" conté "excel"; "sap hcm" conté "sap"
  return skill.includes(term) || term.includes(skill)
}

/** Proves que cobreixen una habilitat concreta. */
export function findTestsForSkill(skill) {
  const s = normalize(skill)
  if (!s) return []
  return SKILL_TESTS.filter((t) => testTerms(t).some((term) => termsMatch(s, term)))
}

const ORDRE_CEFR = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6, Natiu: 7, Native: 7 }

/**
 * Recomanacions proactives per a un candidat a partir del seu CV.
 * Retorna [{ test, reason: 'skill'|'language'|'role', matched, verified }]
 * on `verified` és el resultat previ si ja ha superat la prova.
 */
export function recommendTestsForCandidate(candidat, resultats = []) {
  if (!candidat) return []
  const found = new Map()
  const add = (test, reason, matched) => {
    if (!found.has(test.id)) found.set(test.id, { test, reason, matched })
  }

  for (const skill of candidat.habilitats_tecniques || []) {
    findTestsForSkill(skill).forEach((t) => add(t, 'skill', skill))
  }

  for (const idioma of candidat.idiomes || []) {
    const nom = normalize(idioma?.idioma)
    if (!nom) continue
    const nivell = ORDRE_CEFR[idioma?.nivell] || 0
    // Només proposem la prova d'anglès si el CV declara B1 o superior
    if ((nom.includes('angl') || nom.includes('engl') || nom.includes('ingl')) && nivell >= ORDRE_CEFR.B1) {
      findTestsForSkill('Anglès').forEach((t) => add(t, 'language', idioma.idioma))
    }
  }

  const rol = normalize(candidat.ultima_posicio)
  if (rol) {
    for (const t of SKILL_TESTS) {
      if ((t.role_keywords || []).some((k) => rol.includes(normalize(k)))) add(t, 'role', candidat.ultima_posicio)
    }
  }

  const passed = new Map((resultats || []).filter((r) => r.passed).map((r) => [r.test_id, r]))
  return Array.from(found.values())
    .map((rec) => ({ ...rec, verified: passed.get(rec.test.id) || null }))
    .sort((a, b) => REASON_ORDER[a.reason] - REASON_ORDER[b.reason])
}

const REASON_ORDER = { required: 0, skill: 1, language: 2, role: 3 }

/**
 * Proves rellevants per a una posició (formulari d'encàrrec o encàrrec existent).
 * Accepta { titol, requisits_habilitats, descripcio, idiomes_requisits }.
 * Retorna [{ test, reason: 'required'|'language'|'role', matched }]
 */
export function recommendTestsForAssignment(encarrec) {
  if (!encarrec) return []
  const found = new Map()
  const add = (test, reason, matched) => {
    if (!found.has(test.id)) found.set(test.id, { test, reason, matched })
  }

  const habilitats = Array.isArray(encarrec.requisits_habilitats)
    ? encarrec.requisits_habilitats
    : String(encarrec.requisits_habilitats || '').split(',')

  for (const h of habilitats) {
    const skill = (h || '').trim()
    if (!skill) continue
    findTestsForSkill(skill).forEach((t) => add(t, 'required', skill))
  }

  for (const req of encarrec.idiomes_requisits || []) {
    const nom = normalize(req?.idioma)
    if (nom.includes('angl') || nom.includes('engl') || nom.includes('ingl')) {
      findTestsForSkill('Anglès').forEach((t) => add(t, 'language', req.idioma))
    }
  }

  const text = normalize(`${encarrec.titol || ''} ${encarrec.descripcio || ''}`)
  if (text) {
    for (const t of SKILL_TESTS) {
      if ((t.role_keywords || []).some((k) => text.includes(normalize(k)))) add(t, 'role', encarrec.titol)
    }
  }

  return Array.from(found.values()).sort((a, b) => REASON_ORDER[a.reason] - REASON_ORDER[b.reason])
}

/** Nivell assolit segons la puntuació (0-100). */
export function levelForScore(score) {
  const sorted = [...LEVELS].sort((a, b) => b.min - a.min)
  return (sorted.find((l) => score >= l.min) || sorted[sorted.length - 1]).code
}

/**
 * Corregeix un intent. `answers` és un array amb l'índex triat per pregunta (o null).
 * Retorna { correct, total, score, passed, level, details: [{ id, correct }] }
 */
export function scoreAttempt(test, answers = []) {
  if (!test) throw new Error('Prova desconeguda')
  const details = test.questions.map((q, i) => ({ id: q.id, correct: answers[i] === q.answer }))
  const correct = details.filter((d) => d.correct).length
  const total = test.questions.length
  const score = total ? Math.round((correct / total) * 100) : 0
  return { correct, total, score, passed: score >= PASS_SCORE, level: levelForScore(score), details }
}

/** Versió pública d'una prova: sense les respostes correctes. */
export function stripAnswers(test) {
  if (!test) return null
  return { ...test, questions: test.questions.map(({ answer: _a, ...q }) => q) }
}

// ─── Tokens d'invitació (mode demo) ──────────────────────────────────────────
// En mode real el token el genera el backend; aquí codifiquem el payload en base64url.

function toBase64Url(str) {
  const b64 = typeof btoa === 'function'
    ? btoa(unescape(encodeURIComponent(str)))
    : Buffer.from(str, 'utf8').toString('base64')
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (str.length % 4)) % 4)
  return typeof atob === 'function'
    ? decodeURIComponent(escape(atob(b64)))
    : Buffer.from(b64, 'base64').toString('utf8')
}

export function encodeInviteToken({ candidateId, testId, assignmentId = null, candidateName = null }) {
  return toBase64Url(JSON.stringify({ c: candidateId, t: testId, a: assignmentId, n: candidateName, v: 1 }))
}

export function decodeInviteToken(token) {
  try {
    const p = JSON.parse(fromBase64Url(token))
    if (!p || !p.t) return null
    return { candidateId: p.c ?? null, testId: p.t, assignmentId: p.a ?? null, candidateName: p.n ?? null }
  } catch {
    return null
  }
}

/** URL pública de la prova (HashRouter → /#/prova/<token>). */
export function inviteUrl(token, origin) {
  const base = origin ?? (typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}`
    : '')
  return `${base}#/prova/${token}`
}

/** Resum de les habilitats verificades d'un candidat: una entrada per prova superada (la millor). */
export function verifiedSkills(resultats = []) {
  const best = new Map()
  for (const r of resultats || []) {
    if (!r.passed) continue
    const prev = best.get(r.test_id)
    if (!prev || r.score > prev.score) best.set(r.test_id, r)
  }
  return Array.from(best.values())
}
