import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import UserFormView from "@/views/UserFormView.vue"

const { auth, push, success, errorToast, getUser, createUser, updateUser } = vi.hoisted(() => ({
    auth: {
        state: { user: { uid: "admin1", rol: "admin" } },
        setUser: vi.fn(),
    },
    push: vi.fn(),
    success: vi.fn(),
    errorToast: vi.fn(),
    getUser: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
}))

vi.mock("@/composables/useAuth.js", () => ({ useAuth: () => auth }))
vi.mock("@/composables/useToast.js", () => ({ useToast: () => ({ success, error: errorToast }) }))
vi.mock("vue-router", () => ({ useRouter: () => ({ push }) }))
vi.mock("@/services/usersApi.js", () => ({
    usersApi: { obtener: getUser, crear: createUser, actualizar: updateUser },
}))

const global = { stubs: { RouterLink: { template: "<a><slot /></a>" } } }
const input = (wrapper, key) => wrapper.find(`[data-test="${key}"]`)
const fillValid = async (wrapper, { password = "Clave1234" } = {}) => {
    await input(wrapper, "user-name").setValue("Ana Ruiz")
    await input(wrapper, "user-email").setValue("ana@example.com")
    if (password) await input(wrapper, "user-password").setValue(password)
}

describe("UserFormView create mode", () => {
    beforeEach(() => {
        auth.state.user = { uid: "admin1", rol: "admin" }
        auth.setUser.mockReset()
        push.mockReset()
        success.mockReset()
        errorToast.mockReset()
        getUser.mockReset()
        createUser.mockReset()
        createUser.mockResolvedValue({})
        updateUser.mockReset()
    })

    it("validates the required name, email, and password", async () => {
        const wrapper = mount(UserFormView, { global })
        await wrapper.find('[data-test="user-form"]').trigger("submit")
        expect(input(wrapper, "user-name-error").exists()).toBe(true)
        expect(input(wrapper, "user-email-error").exists()).toBe(true)
        expect(input(wrapper, "user-password-error").exists()).toBe(true)
        expect(createUser).not.toHaveBeenCalled()
    })

    it("creates a user without an empty optional role error", async () => {
        const wrapper = mount(UserFormView, { global })
        await fillValid(wrapper)
        await input(wrapper, "user-role").setValue("admin")
        await wrapper.find('[data-test="user-form"]').trigger("submit")
        await flushPromises()
        expect(createUser).toHaveBeenCalledWith({
            nombre: "Ana Ruiz",
            email: "ana@example.com",
            rol: "admin",
            password: "Clave1234",
        })
        expect(success).toHaveBeenCalledWith("Usuario creado")
        expect(push).toHaveBeenCalledWith({ name: "users" })
    })

    it("renders field and general errors from create failures", async () => {
        createUser.mockRejectedValueOnce({ details: { email: "Duplicado" }, message: "Invalid" })
        const wrapper = mount(UserFormView, { global })
        await fillValid(wrapper)
        await wrapper.find('[data-test="user-form"]').trigger("submit")
        await flushPromises()
        expect(input(wrapper, "user-email-error").text()).toBe("Duplicado")

        createUser.mockRejectedValueOnce({ details: {}, message: "Servidor caído" })
        await wrapper.find('[data-test="user-form"]').trigger("submit")
        await flushPromises()
        expect(wrapper.find('[data-test="alert"]').text()).toBe("Servidor caído")
    })
})

describe("UserFormView edit mode", () => {
    beforeEach(() => {
        auth.state.user = { uid: "admin1", rol: "admin" }
        auth.setUser.mockReset()
        push.mockReset()
        success.mockReset()
        errorToast.mockReset()
        getUser.mockReset()
        updateUser.mockReset()
        updateUser.mockResolvedValue({ uid: "u2", nombre: "Updated" })
    })

    it("loads an existing record and allows an omitted password", async () => {
        getUser.mockResolvedValue({
            uid: "u2",
            nombre: "Eva Torres",
            email: "eva@example.com",
            rol: "usuario",
        })
        const wrapper = mount(UserFormView, { props: { id: "u2" }, global })
        await flushPromises()
        expect(input(wrapper, "user-name").element.value).toBe("Eva Torres")
        expect(input(wrapper, "user-password").element.value).toBe("")
        await input(wrapper, "user-name").setValue("Eva Ruiz")
        await wrapper.find('[data-test="user-form"]').trigger("submit")
        await flushPromises()
        expect(updateUser).toHaveBeenCalledWith("u2", {
            nombre: "Eva Ruiz",
            email: "eva@example.com",
            rol: "usuario",
        })
        expect(success).toHaveBeenCalledWith("Usuario actualizado")
        expect(auth.setUser).not.toHaveBeenCalled()
    })

    it("protects the current user's role and updates shared user data", async () => {
        auth.state.user = { uid: "self1", rol: "admin" }
        getUser.mockResolvedValue({ uid: "self1", nombre: "Admin", email: "a@example.com", rol: "admin" })
        const wrapper = mount(UserFormView, { props: { id: "self1" }, global })
        await flushPromises()
        expect(input(wrapper, "user-role").attributes("disabled")).toBeDefined()
        expect(wrapper.find('[data-test="self-edit-hint"]').exists()).toBe(true)
        await input(wrapper, "user-name").setValue("Admin Actualizado")
        await input(wrapper, "user-password").setValue("Nueva1234")
        await wrapper.find('[data-test="user-form"]').trigger("submit")
        await flushPromises()
        expect(updateUser).toHaveBeenCalledWith("self1", expect.objectContaining({ password: "Nueva1234" }))
        expect(auth.setUser).toHaveBeenCalledWith({ uid: "u2", nombre: "Updated" })
    })

    it.each([400, 404])("shows the missing-user state for HTTP %s", async (status) => {
        getUser.mockRejectedValue({ status, message: "No encontrado" })
        const wrapper = mount(UserFormView, { props: { id: "bad-id" }, global })
        await flushPromises()
        expect(wrapper.find('[data-test="user-not-found"]').exists()).toBe(true)
        expect(wrapper.find('[data-test="user-form"]').exists()).toBe(false)
    })

    it("shows a server load error and reloads when the id changes", async () => {
        getUser.mockRejectedValueOnce({ status: 500, message: "API no disponible" })
        getUser.mockResolvedValueOnce({ uid: "u3", nombre: "Leo", email: "leo@example.com", rol: "usuario" })
        const wrapper = mount(UserFormView, { props: { id: "u3" }, global })
        await flushPromises()
        expect(wrapper.find('[data-test="alert"]').text()).toBe("API no disponible")
        await wrapper.setProps({ id: "u4" })
        await flushPromises()
        expect(getUser).toHaveBeenLastCalledWith("u4")
        expect(input(wrapper, "user-name").element.value).toBe("Leo")
    })
})
