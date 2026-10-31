import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { reactive } from "vue"
import UsersView from "@/views/UsersView.vue"

const { routeHolder, auth, replace, success, errorToast, listUsers, deleteUser } = vi.hoisted(() => ({
    routeHolder: { current: null },
    auth: { state: { user: { uid: "self" } } },
    replace: vi.fn(),
    success: vi.fn(),
    errorToast: vi.fn(),
    listUsers: vi.fn(),
    deleteUser: vi.fn(),
}))

vi.mock("vue-router", () => ({
    useRoute: () => routeHolder.current,
    useRouter: () => ({ replace }),
}))
vi.mock("@/composables/useAuth.js", () => ({ useAuth: () => auth }))
vi.mock("@/composables/useToast.js", () => ({ useToast: () => ({ success, error: errorToast }) }))
vi.mock("@/services/usersApi.js", () => ({
    usersApi: { listar: listUsers, eliminar: deleteUser },
}))

const userList = () => ({
    usuarios: [
        { uid: "self", nombre: "Ana Ruiz", email: "ana@example.com", rol: "admin", createdAt: "2020-01-01T00:00:00Z" },
        { uid: "other", nombre: "Leo Pérez", email: "leo@example.com", rol: "usuario", createdAt: "2021-01-01T00:00:00Z" },
    ],
    total: 10,
    pagina: 1,
    limite: 8,
    totalPaginas: 2,
})
const global = { stubs: { RouterLink: { template: "<a><slot /></a>" } } }
const mountView = () => mount(UsersView, { global })

describe("UsersView", () => {
    beforeEach(() => {
        routeHolder.current = reactive({ query: {}, name: "users" })
        auth.state.user = { uid: "self" }
        replace.mockReset()
        replace.mockImplementation(({ query }) => {
            routeHolder.current.query = { ...query }
            return Promise.resolve()
        })
        success.mockReset()
        errorToast.mockReset()
        listUsers.mockReset()
        listUsers.mockResolvedValue(userList())
        deleteUser.mockReset()
        deleteUser.mockResolvedValue({})
    })

    it("loads users, shows roles/self marker, and prevents deleting yourself", async () => {
        const wrapper = mountView()
        await flushPromises()
        expect(listUsers).toHaveBeenCalledWith({ buscar: undefined, rol: undefined, pagina: 1, limite: 8 })
        expect(wrapper.findAll('[data-test="user-row"]')).toHaveLength(2)
        expect(wrapper.text()).toContain("Ana Ruiz")
        expect(wrapper.text()).toContain("Administrador")
        expect(wrapper.text()).toContain("Tú")
        expect(wrapper.findAll('[data-test="user-delete"]')[0].attributes("disabled")).toBeDefined()
        expect(wrapper.findAll('[data-test="user-delete"]')[1].attributes("disabled")).toBeUndefined()
        expect(wrapper.find('[data-test="pagination-bar"]').exists()).toBe(false)
        wrapper.unmount()
    })

    it("applies role filters, changes pages, and clears filters", async () => {
        routeHolder.current.query = { rol: "admin", pagina: "2" }
        const wrapper = mountView()
        await flushPromises()
        await wrapper.find('[data-test="users-role-filter"]').setValue("usuario")
        await flushPromises()
        expect(replace).toHaveBeenCalledWith({ query: { rol: "usuario", pagina: undefined } })
        await wrapper.find('[data-test="pagination-next"]').trigger("click")
        expect(replace).toHaveBeenCalledWith({ query: expect.objectContaining({ pagina: 2 }) })
        await wrapper.find('[data-test="users-clear-filters"]').trigger("click")
        expect(routeHolder.current.query).toEqual({})
        wrapper.unmount()
    })

    it("debounces trimmed search values and cancels pending search on unmount", async () => {
        vi.useFakeTimers()
        const wrapper = mountView()
        await flushPromises()
        await wrapper.find('[data-test="users-search"]').setValue("  ana  ")
        vi.advanceTimersByTime(299)
        expect(replace).not.toHaveBeenCalled()
        vi.advanceTimersByTime(1)
        await flushPromises()
        expect(replace).toHaveBeenCalledWith({ query: { buscar: "ana", pagina: undefined } })
        await wrapper.find('[data-test="users-search"]').setValue("pending")
        wrapper.unmount()
        vi.advanceTimersByTime(300)
        expect(replace).toHaveBeenCalledTimes(1)
    })

    it("shows an empty state and backs up from an emptied later page", async () => {
        routeHolder.current.query = { pagina: "2" }
        listUsers
            .mockResolvedValueOnce({ usuarios: [], total: 8, pagina: 2, limite: 8, totalPaginas: 1 })
            .mockResolvedValueOnce({ usuarios: [], total: 8, pagina: 1, limite: 8, totalPaginas: 1 })
        const wrapper = mountView()
        await flushPromises()
        expect(replace).toHaveBeenCalledWith({ query: { pagina: 1 } })
        expect(wrapper.find('[data-test="users-empty"]').text()).toContain("Todavía no hay usuarios")
        wrapper.unmount()
    })

    it("shows filter-aware empty text and retries failed list requests", async () => {
        routeHolder.current.query = { buscar: "missing" }
        listUsers.mockRejectedValueOnce(new Error("No disponible")).mockResolvedValueOnce({
            usuarios: [], total: 0, pagina: 1, limite: 8, totalPaginas: 1,
        })
        const wrapper = mountView()
        await flushPromises()
        expect(wrapper.find('[data-test="alert"]').text()).toBe("No disponible")
        expect(wrapper.find('[data-test="users-table"]').exists()).toBe(false)
        await wrapper.find('[data-test="users-retry"]').trigger("click")
        await flushPromises()
        expect(wrapper.find('[data-test="users-empty"]').text()).toContain("Ningún usuario coincide")
        wrapper.unmount()
    })

    it("confirms successful deletion and refreshes the list", async () => {
        const wrapper = mountView()
        await flushPromises()
        await wrapper.findAll('[data-test="user-delete"]')[1].trigger("click")
        expect(document.body.querySelector('[data-test="confirm-dialog"]')).not.toBeNull()
        document.body.querySelector('[data-test="confirm-accept"]').click()
        await flushPromises()
        expect(deleteUser).toHaveBeenCalledWith("other")
        expect(success).toHaveBeenCalledWith("Usuario Leo Pérez eliminado")
        expect(listUsers).toHaveBeenCalledTimes(2)
        wrapper.unmount()
    })

    it("shows a deletion error toast and keeps the dialog open", async () => {
        deleteUser.mockRejectedValue(new Error("No se pudo borrar"))
        const wrapper = mountView()
        await flushPromises()
        await wrapper.findAll('[data-test="user-delete"]')[1].trigger("click")
        document.body.querySelector('[data-test="confirm-accept"]').click()
        await flushPromises()
        expect(errorToast).toHaveBeenCalledWith("No se pudo borrar")
        expect(document.body.querySelector('[data-test="confirm-dialog"]')).not.toBeNull()
        wrapper.unmount()
    })
})
