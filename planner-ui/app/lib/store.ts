import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
    id: string
    name: string
    email: string
    role: 'admin' | 'planner' | 'dispatcher' | 'driver' | 'manager'
}

interface AuthState {
    user: User | null
    token: string | null
    setUser: (user: User | null, token: string | null) => void
    logout: () => void
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            setUser: (user, token) => set({ user, token }),
            logout: () => set({ user: null, token: null }),
        }),
        {
            name: 'auth-storage',
        }
    )
)
