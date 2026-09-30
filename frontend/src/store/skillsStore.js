import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { mockResultatsProves, mockProvesEncarrec } from '../utils/mockData'

/**
 * Emmagatzematge local (mode demo) dels resultats de les mini-proves,
 * de les invitacions emeses i de les proves associades a cada encàrrec.
 * En mode real aquestes dades viuen al backend (taula skill_test_attempts).
 */
export const useSkillsStore = create(
  persist(
    (set, get) => ({
      // { [candidateId]: [{ test_id, skill, score, passed, level, data, assignment_id }] }
      resultats: mockResultatsProves,
      // { [assignmentId]: [testId, ...] }
      provesEncarrec: mockProvesEncarrec,
      // [{ token, candidate_id, test_id, assignment_id, creat_el, completat }]
      invitacions: [],

      afegirResultat: (candidateId, resultat) => set((s) => ({
        resultats: {
          ...s.resultats,
          [candidateId]: [...(s.resultats[candidateId] || []), resultat],
        },
      })),

      resultatsDe: (candidateId) => get().resultats[candidateId] || [],

      setProvesEncarrec: (assignmentId, testIds) => set((s) => ({
        provesEncarrec: { ...s.provesEncarrec, [assignmentId]: testIds },
      })),

      afegirInvitacio: (inv) => set((s) => ({ invitacions: [inv, ...s.invitacions] })),

      marcarInvitacioCompletada: (token) => set((s) => ({
        invitacions: s.invitacions.map((i) => (i.token === token ? { ...i, completat: true } : i)),
      })),
    }),
    { name: 'cv-hunter-skills', version: 1 }
  )
)
