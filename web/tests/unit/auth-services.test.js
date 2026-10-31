import { beforeEach, describe, expect, it, vi } from "vitest"
import { authApi } from "@/services/authApi.js"
import { usersApi } from "@/services/usersApi.js"

const response = (data) => ({ ok: true, json: vi.fn().mockResolvedValue(data) })

describe("authApi", () => {
    beforeEach(() => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ ok: true })))
    })

    it("posts login and registration credentials", async () => {
        await authApi.login({ email: "ana@example.com", password: "Abcd1234" })
        await authApi.registro({ nombre: "Ana", email: "ana@example.com" })
        expect(fetch).toHaveBeenNthCalledWith(1, expect.any(URL), expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ email: "ana@example.com", password: "Abcd1234" }),
        }))
        expect(fetch).toHaveBeenNthCalledWith(2, expect.any(URL), expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ nombre: "Ana", email: "ana@example.com" }),
        }))
    })

    it("gets profile and posts profile/password updates", async () => {
        await authApi.perfil()
        await authApi.actualizarPerfil({ nombre: "Ana" })
        await authApi.cambiarPassword({ passwordActual: "old", passwordNueva: "new" })
        expect(fetch).toHaveBeenNthCalledWith(1, expect.any(URL), expect.objectContaining({ method: "GET" }))
        expect(fetch).toHaveBeenNthCalledWith(2, expect.any(URL), expect.objectContaining({
            method: "PUT",
            body: JSON.stringify({ nombre: "Ana" }),
        }))
        expect(fetch).toHaveBeenNthCalledWith(3, expect.any(URL), expect.objectContaining({
            method: "PUT",
            body: JSON.stringify({ passwordActual: "old", passwordNueva: "new" }),
        }))
    })
})

describe("usersApi", () => {
    beforeEach(() => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ users: [] })))
    })

    it("lists users with query filters and reads an encoded user id", async () => {
        await usersApi.listar({ buscar: "Ana", rol: "admin", pagina: 2, limite: 8 })
        await usersApi.obtener("id with spaces")
        const [listUrl] = fetch.mock.calls[0]
        const [userUrl] = fetch.mock.calls[1]
        expect(listUrl.pathname).toBe("/api/usuarios")
        expect(listUrl.searchParams.get("buscar")).toBe("Ana")
        expect(listUrl.searchParams.get("pagina")).toBe("2")
        expect(userUrl.pathname).toBe("/api/usuarios/id%20with%20spaces")
    })

    it("creates, updates, and deletes users with the expected HTTP verbs", async () => {
        await usersApi.crear({ nombre: "Ana" })
        await usersApi.actualizar("42", { rol: "admin" })
        await usersApi.eliminar("42")
        expect(fetch.mock.calls.map(([, options]) => options.method)).toEqual(["POST", "PUT", "DELETE"])
        expect(fetch.mock.calls[0][1].body).toBe('{"nombre":"Ana"}')
        expect(fetch.mock.calls[1][0].pathname).toBe("/api/usuarios/42")
        expect(fetch.mock.calls[2][0].pathname).toBe("/api/usuarios/42")
    })
})
