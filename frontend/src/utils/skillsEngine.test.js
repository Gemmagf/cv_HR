import { describe, it, expect } from 'vitest'
import {
  SKILL_TESTS, PASS_SCORE, normalize, pickText, findTestsForSkill,
  recommendTestsForCandidate, recommendTestsForAssignment,
  scoreAttempt, levelForScore, stripAnswers,
  encodeInviteToken, decodeInviteToken, verifiedSkills,
} from './skillsEngine'

describe('catàleg', () => {
  it('cada prova té 5 preguntes amb 4 opcions i una resposta vàlida en ca i en', () => {
    for (const t of SKILL_TESTS) {
      expect(t.questions.length).toBe(5)
      for (const q of t.questions) {
        expect(q.options.ca.length).toBe(4)
        expect(q.options.en.length).toBe(4)
        expect(q.answer).toBeGreaterThanOrEqual(0)
        expect(q.answer).toBeLessThan(4)
        expect(q.text.ca).toBeTruthy()
        expect(q.text.en).toBeTruthy()
      }
    }
  })

  it('els identificadors són únics', () => {
    const ids = SKILL_TESTS.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('normalize / pickText', () => {
  it('treu accents i majúscules', () => {
    expect(normalize('  Excel Avançat ')).toBe('excel avancat')
    expect(normalize(null)).toBe('')
  })
  it('fa fallback en → ca', () => {
    expect(pickText({ ca: 'Hola', en: 'Hello' }, 'de')).toBe('Hello')
    expect(pickText({ ca: 'Hola' }, 'en')).toBe('Hola')
    expect(pickText('text pla', 'ca')).toBe('text pla')
  })
})

describe('findTestsForSkill', () => {
  it('troba Excel encara que el CV digui "Excel Avançat"', () => {
    expect(findTestsForSkill('Excel Avançat').map((t) => t.id)).toContain('excel-avancat')
  })
  it('SAP HCM i SuccessFactors apunten a la mateixa prova', () => {
    expect(findTestsForSkill('SuccessFactors').map((t) => t.id)).toContain('sap-hcm')
    expect(findTestsForSkill('SAP HCM').map((t) => t.id)).toContain('sap-hcm')
  })
  it('no relaciona termes massa curts', () => {
    expect(findTestsForSkill('R')).toEqual([])
    expect(findTestsForSkill('Canva')).toEqual([])
  })
})

describe('recommendTestsForCandidate', () => {
  const marta = {
    ultima_posicio: 'Cap de Selecció',
    habilitats_tecniques: ['SAP HCM', 'LinkedIn Recruiter', 'Excel', 'Workday'],
    idiomes: [{ idioma: 'Català', nivell: 'Natiu' }, { idioma: 'Anglès', nivell: 'C1' }],
  }

  it('proposa proves per habilitat, idioma i rol, sense duplicats', () => {
    const recs = recommendTestsForCandidate(marta)
    const ids = recs.map((r) => r.test.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual(expect.arrayContaining(['sap-hcm', 'linkedin-recruiter', 'excel-avancat', 'workday', 'angles-b2', 'seleccio-competencies']))
    expect(recs.find((r) => r.test.id === 'angles-b2').reason).toBe('language')
    expect(recs.find((r) => r.test.id === 'seleccio-competencies').reason).toBe('role')
  })

  it('no proposa anglès si el nivell declarat és inferior a B1', () => {
    const recs = recommendTestsForCandidate({ habilitats_tecniques: [], idiomes: [{ idioma: 'Anglès', nivell: 'A2' }] })
    expect(recs.map((r) => r.test.id)).not.toContain('angles-b2')
  })

  it('marca les proves ja superades', () => {
    const recs = recommendTestsForCandidate(marta, [{ test_id: 'excel-avancat', passed: true, score: 100 }])
    expect(recs.find((r) => r.test.id === 'excel-avancat').verified.score).toBe(100)
    expect(recs.find((r) => r.test.id === 'sap-hcm').verified).toBeNull()
  })

  it('les habilitats van abans que el rol', () => {
    const recs = recommendTestsForCandidate(marta)
    const order = recs.map((r) => r.reason)
    expect(order.indexOf('role')).toBeGreaterThan(order.lastIndexOf('skill'))
  })

  it('retorna buit sense candidat', () => {
    expect(recommendTestsForCandidate(null)).toEqual([])
  })
})

describe('recommendTestsForAssignment', () => {
  it('accepta habilitats com a string separat per comes (formulari)', () => {
    const recs = recommendTestsForAssignment({ titol: 'Analista de dades', requisits_habilitats: 'SQL, Power BI, Excel' })
    const ids = recs.map((r) => r.test.id)
    expect(ids.slice(0, 3)).toEqual(expect.arrayContaining(['sql-intermedi', 'power-bi', 'excel-avancat']))
    expect(recs[0].reason).toBe('required')
  })

  it('dedueix proves del títol de la posició', () => {
    const recs = recommendTestsForAssignment({ titol: 'Responsable de Compres Senior', requisits_habilitats: [] })
    expect(recs.map((r) => r.test.id)).toContain('compres-negociacio')
    expect(recs[0].reason).toBe('role')
  })

  it('afegeix la prova d\'anglès si es requereix com a idioma o com a habilitat', () => {
    const a = recommendTestsForAssignment({ titol: 'HRBP', requisits_habilitats: ['Anglès C1'] })
    const b = recommendTestsForAssignment({ titol: 'HRBP', idiomes_requisits: [{ idioma: 'Anglès', nivell_min: 'B2' }] })
    expect(a.map((r) => r.test.id)).toContain('angles-b2')
    expect(b.map((r) => r.test.id)).toContain('angles-b2')
  })
})

describe('scoreAttempt', () => {
  const test = SKILL_TESTS.find((t) => t.id === 'sql-intermedi')
  const correct = test.questions.map((q) => q.answer)

  it('100% amb totes correctes → expert', () => {
    const r = scoreAttempt(test, correct)
    expect(r).toMatchObject({ correct: 5, total: 5, score: 100, passed: true, level: 'expert' })
  })
  it('3 de 5 supera el llindar', () => {
    const answers = correct.map((a, i) => (i < 3 ? a : (a + 1) % 4))
    const r = scoreAttempt(test, answers)
    expect(r.score).toBe(60)
    expect(r.passed).toBe(true)
    expect(r.level).toBe('competent')
    expect(PASS_SCORE).toBe(60)
  })
  it('respostes buides → no superat', () => {
    const r = scoreAttempt(test, [])
    expect(r).toMatchObject({ score: 0, passed: false, level: 'no_superat' })
  })
  it('levelForScore és monòton', () => {
    expect(levelForScore(80)).toBe('avancat')
    expect(levelForScore(40)).toBe('no_superat')
  })
})

describe('utilitats', () => {
  it('stripAnswers treu la resposta correcta', () => {
    const pub = stripAnswers(SKILL_TESTS[0])
    expect(pub.questions.every((q) => q.answer === undefined)).toBe(true)
    expect(SKILL_TESTS[0].questions[0].answer).toBeDefined()
  })

  it('el token d\'invitació és reversible (inclou caràcters no ASCII)', () => {
    const token = encodeInviteToken({ candidateId: 7, testId: 'excel-avancat', assignmentId: 3, candidateName: 'Laia Solà' })
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(decodeInviteToken(token)).toEqual({ candidateId: 7, testId: 'excel-avancat', assignmentId: 3, candidateName: 'Laia Solà' })
    expect(decodeInviteToken('no-es-un-token')).toBeNull()
  })

  it('verifiedSkills es queda amb el millor intent superat per prova', () => {
    const v = verifiedSkills([
      { test_id: 'sql-intermedi', passed: true, score: 60 },
      { test_id: 'sql-intermedi', passed: true, score: 80 },
      { test_id: 'excel-avancat', passed: false, score: 40 },
    ])
    expect(v).toHaveLength(1)
    expect(v[0].score).toBe(80)
  })
})
