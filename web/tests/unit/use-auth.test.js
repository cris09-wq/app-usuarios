import { beforeEach, describe, expect, it, vi } from "vitest"

const { loginApi, registerApi, profileApi } = vi.hoisted(() => ({
    loginApi: vi.fn(),
    registerApi: vi.fn(),
    profileApi: vi.fn(),
}))

vi.mock("@/services/authApi.js", () => ({
    authApi: {
        login: loginApi,
        registro: registerApi,
        perfil: profileApi,
    },
}))

describe("useAuth", () => {
    beforeEach(() => {
        vi.resetModules()
        vi.clearAllMocks()
        localStorage.clear()
    })

    it("starts unauthenticated and restores an empty session only once", async () => {
        const { useAuth } = await import("@/composables/useAuth.js")
        const auth = useAuth()
        expect(auth.isAuthenticated.value).toBe(false)
        expect(auth.isAdmin.value).toBe(false)
        expect(auth.state.loaded).toBe(false)
        await auth.restoreSession()
        expect(auth.state.loaded).toBe(true)
        expect(profileApi).not.toHaveBeenCalled()
        await auth.restoreSession()
        expect(profileApi).not.toHaveBeenCalled()
    })

    it("logs in, exposes authentication and role, updates user, and logs out", async () => {
        const { useAuth } = await import("@/composables/useAuth.js")
        loginApi.mockResolvedValue({ token: "jwt", usuario: { uid: "u1", rol: "admin", nombre: "Ana" } })
        const auth = useAuth()
        await auth.login({ email: "ana@example.com" })
        expect(loginApi).toHaveBeenCalledWith({ email: "ana@example.com" })
        expect(localStorage.getItem("x-token")).toBe("jwt")
        expect(auth.isAuthenticated.value).toBe(true)
        expect(auth.isAdmin.value).toBe(true)
        expect(auth.state.user.nombre).toBe("Ana")
        auth.setUser({ uid: "u1", rol: "usuario", nombre: "Ana Ruiz" })
        expect(auth.isAdmin.value).toBe(false)
        expect(auth.state.user.nombre).toBe("Ana Ruiz")
        auth.logout()
        expect(auth.isAuthenticated.value).toBe(false)
        expect(auth.state.user).toBeNull()
        expect(localStorage.getItem("x-token")).toBeNull()
    })

    it("registers and starts a session", async () => {
        const { useAuth } = await import("@/composables/useAuth.js")
        registerApi.mockResolvedValue({ token: "registered", usuario: { uid: "u2", rol: "usuario" } })
        const auth = useAuth()
        await auth.register({ nombre: "Eva" })
        expect(registerApi).toHaveBeenCalledWith({ nombre: "Eva" })
        expect(auth.isAuthenticated.value).toBe(true)
        expect(auth.state.token).toBe("registered")
    })

    it("restores a saved session from the profile endpoint", async () => {
        localStorage.setItem("x-token", "saved-token")
        const { useAuth } = await import("@/composables/useAuth.js")
        profileApi.mockResolvedValue({ uid: "u3", rol: "usuario", nombre: "Leo" })
        const auth = useAuth()
        expect(auth.state.token).toBe("saved-token")
        await auth.restoreSession()
        expect(profileApi).toHaveBeenCalledOnce()
        expect(auth.state.user.nombre).toBe("Leo")
        expect(auth.isAuthenticated.value).toBe(true)
        expect(auth.state.loaded).toBe(true)
    })

    it("clears an invalid saved session after a profile error", async () => {
        localStorage.setItem("x-token", "expired")
        const { useAuth } = await import("@/composables/useAuth.js")
        profileApi.mockRejectedValue(new Error("expired"))
        const auth = useAuth()
        await auth.restoreSession()
        expect(auth.state.user).toBeNull()
        expect(auth.state.token).toBeNull()
        expect(auth.state.loaded).toBe(true)
        expect(localStorage.getItem("x-token")).toBeNull()
    })

    it("can clear session explicitly", async () => {
        const { useAuth } = await import("@/composables/useAuth.js")
        loginApi.mockResolvedValue({ token: "jwt", usuario: { uid: "u1" } })
        const auth = useAuth()
        await auth.login({})
        auth.clearSession()
        expect(auth.state.token).toBeNull()
        expect(auth.state.user).toBeNull()
        expect(auth.state.loaded).toBe(true)
    })
})
