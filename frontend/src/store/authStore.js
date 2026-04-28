import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      tenantId: null,

      login: (token, user, tenantId) => set({ token, user, tenantId }),
      logout: () => set({ token: null, user: null, tenantId: null }),
    }),
    { name: 'cv-hunter-auth' }
  )
)
