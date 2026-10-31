import { beforeEach, describe, expect, it, vi } from "vitest"

const { auth } = vi.hoisted(() => ({
    auth: {
        isAuthenticated: { value: false },
        isAdmin: { value: false },
        restoreSession: vi.fn(),
    },
}))

vi.mock("@/composables/useAuth.js", () => ({ useAuth: () => auth }))

describe("router access control and titles", () => {
    let router

    beforeEach(async () => {
        vi.resetModules()
        auth.isAuthenticated.value = false
        auth.isAdmin.value = false
        auth.restoreSession.mockReset()
        document.title = ""
        router = (await import("@/router/index.js")).default
        await router.push("/login")
    })

    it("redirects unauthenticated protected routes to login with a return path", async () => {
        await router.push("/usuarios?rol=admin")
        expect(router.currentRoute.value.name).toBe("login")
        expect(router.currentRoute.value.query.redirect).toBe("/usuarios?rol=admin")
        expect(auth.restoreSession).toHaveBeenCalled()
    })

    it("does not preserve the home redirect and sends authenticated guests home", async () => {
        await router.push("/")
        expect(router.currentRoute.value.name).toBe("login")
        expect(router.currentRoute.value.query).toEqual({})
        auth.isAuthenticated.value = true
        auth.isAdmin.value = true
        await router.push("/registro")
        expect(router.currentRoute.value.name).toBe("users")
    })

    it("routes authenticated non-admins away from admin pages", async () => {
        auth.isAuthenticated.value = true
        auth.isAdmin.value = false
        await router.push("/usuarios")
        expect(router.currentRoute.value.name).toBe("profile")
    })

    it("allows authenticated routes and updates the document title", async () => {
        auth.isAuthenticated.value = true
        await router.push("/perfil")
        expect(router.currentRoute.value.name).toBe("profile")
        expect(document.title).toBe("Mi perfil · Gestión de usuarios")
        await router.push("/somewhere-else")
        expect(router.currentRoute.value.name).toBe("not-found")
        expect(document.title).toBe("Página no encontrada · Gestión de usuarios")
    })
})
