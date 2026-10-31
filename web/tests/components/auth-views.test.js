import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import RegisterView from "@/views/RegisterView.vue"
import ProfileView from "@/views/ProfileView.vue"

const { register, push, success, updateProfile, changePassword, setUser, authState } = vi.hoisted(() => ({
    register: vi.fn(),
    push: vi.fn(),
    success: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
    setUser: vi.fn(),
    authState: {
        user: { uid: "u1", nombre: "Ana Ruiz", email: "ana@example.com", rol: "admin", createdAt: "2020-01-01T00:00:00Z" },
    },
}))

vi.mock("@/composables/useAuth.js", () => ({
    useAuth: () => ({ register, state: authState, setUser }),
}))
vi.mock("@/composables/useToast.js", () => ({
    useToast: () => ({ success, error: vi.fn() }),
}))
vi.mock("vue-router", () => ({ useRouter: () => ({ push }) }))
vi.mock("@/services/authApi.js", () => ({
    authApi: { actualizarPerfil: updateProfile, cambiarPassword: changePassword },
}))

const global = { stubs: { RouterLink: { template: "<a><slot /></a>" } } }
const input = (wrapper, key) => wrapper.find(`[data-test="${key}"]`)

describe("RegisterView", () => {
    beforeEach(() => {
        register.mockReset()
        register.mockResolvedValue(undefined)
        success.mockReset()
        push.mockReset()
    })

    it("shows all local validation errors and does not submit", async () => {
        const wrapper = mount(RegisterView, { global })
        await wrapper.find('[data-test="register-form"]').trigger("submit")
        expect(input(wrapper, "register-name-error").text()).toContain("obligatorio")
        expect(input(wrapper, "register-email-error").text()).toContain("obligatorio")
        expect(input(wrapper, "register-password-error").text()).toContain("obligatoria")
        expect(input(wrapper, "register-confirmation-error").text()).toContain("Repite")
        expect(register).not.toHaveBeenCalled()
    })

    it("registers valid data, displays a success toast, and navigates home", async () => {
        const wrapper = mount(RegisterView, { global })
        await input(wrapper, "register-name").setValue("Ana Ruiz")
        await input(wrapper, "register-email").setValue("ana@example.com")
        await input(wrapper, "register-password").setValue("Clave1234")
        await input(wrapper, "register-confirmation").setValue("Clave1234")
        await wrapper.find('[data-test="register-form"]').trigger("submit")
        await flushPromises()
        expect(register).toHaveBeenCalledWith({ nombre: "Ana Ruiz", email: "ana@example.com", password: "Clave1234" })
        expect(success).toHaveBeenCalledWith("¡Cuenta creada! Bienvenido.")
        expect(push).toHaveBeenCalledWith({ name: "home" })
    })

    it("shows field errors returned by the server", async () => {
        register.mockRejectedValue({ details: { email: "Ya existe" }, message: "Invalid" })
        const wrapper = mount(RegisterView, { global })
        await input(wrapper, "register-name").setValue("Ana")
        await input(wrapper, "register-email").setValue("ana@example.com")
        await input(wrapper, "register-password").setValue("Clave1234")
        await input(wrapper, "register-confirmation").setValue("Clave1234")
        await wrapper.find('[data-test="register-form"]').trigger("submit")
        await flushPromises()
        expect(input(wrapper, "register-email-error").text()).toBe("Ya existe")
    })

    it("shows a general server error and restores the submit button", async () => {
        register.mockRejectedValue({ details: {}, message: "Servicio no disponible" })
        const wrapper = mount(RegisterView, { global })
        await input(wrapper, "register-name").setValue("Ana")
        await input(wrapper, "register-email").setValue("ana@example.com")
        await input(wrapper, "register-password").setValue("Clave1234")
        await input(wrapper, "register-confirmation").setValue("Clave1234")
        await wrapper.find('[data-test="register-form"]').trigger("submit")
        await flushPromises()
        expect(wrapper.find('[data-test="alert"]').text()).toBe("Servicio no disponible")
        expect(wrapper.find('[data-test="register-submit"]').attributes("disabled")).toBeUndefined()
    })
})

describe("ProfileView", () => {
    beforeEach(() => {
        authState.user = {
            uid: "u1",
            nombre: "Ana Ruiz",
            email: "ana@example.com",
            rol: "admin",
            createdAt: "2020-01-01T00:00:00Z",
        }
        updateProfile.mockReset()
        updateProfile.mockResolvedValue({ ...authState.user, nombre: "Ana Pérez", email: "ana2@example.com" })
        changePassword.mockReset()
        changePassword.mockResolvedValue({})
        setUser.mockReset()
        success.mockReset()
    })

    it("shows profile information and validates before saving", async () => {
        const wrapper = mount(ProfileView, { global })
        expect(wrapper.find('[data-test="profile-role"]').text()).toContain("Administrador")
        expect(wrapper.text()).toContain("Miembro desde")
        await input(wrapper, "profile-name").setValue("A")
        await input(wrapper, "profile-email").setValue("bad")
        await wrapper.find('[data-test="profile-form"]').trigger("submit")
        expect(input(wrapper, "profile-name-error").exists()).toBe(true)
        expect(input(wrapper, "profile-email-error").exists()).toBe(true)
        expect(updateProfile).not.toHaveBeenCalled()
    })

    it("saves profile data and updates shared auth state", async () => {
        const wrapper = mount(ProfileView, { global })
        await input(wrapper, "profile-name").setValue("Ana")
        await input(wrapper, "profile-email").setValue("ana@example.com")
        await wrapper.find('[data-test="profile-form"]').trigger("submit")
        await flushPromises()
        expect(updateProfile).toHaveBeenCalledWith({ nombre: "Ana", email: "ana@example.com" })
        expect(setUser).toHaveBeenCalledWith(expect.objectContaining({ nombre: "Ana Pérez" }))
        expect(input(wrapper, "profile-name").element.value).toBe("Ana Pérez")
        expect(success).toHaveBeenCalledWith("Perfil actualizado")
    })

    it("shows field and general errors from profile updates", async () => {
        updateProfile.mockRejectedValueOnce({ details: { email: "Ocupado" }, message: "Invalid" })
        const wrapper = mount(ProfileView, { global })
        await wrapper.find('[data-test="profile-form"]').trigger("submit")
        await flushPromises()
        expect(input(wrapper, "profile-email-error").text()).toBe("Ocupado")
        updateProfile.mockRejectedValueOnce({ details: {}, message: "Offline" })
        await wrapper.find('[data-test="profile-form"]').trigger("submit")
        await flushPromises()
        expect(wrapper.find('[data-test="alert"]').text()).toContain("Offline")
    })

    it("validates and changes passwords, clearing successful form data", async () => {
        const wrapper = mount(ProfileView, { global })
        await wrapper.find('[data-test="password-form"]').trigger("submit")
        expect(input(wrapper, "password-current-error").exists()).toBe(true)
        expect(input(wrapper, "password-new-error").exists()).toBe(true)
        await input(wrapper, "password-current").setValue("Current1")
        await input(wrapper, "password-new").setValue("Newpass1")
        await input(wrapper, "password-confirmation").setValue("Newpass1")
        await wrapper.find('[data-test="password-form"]').trigger("submit")
        await flushPromises()
        expect(changePassword).toHaveBeenCalledWith({ passwordActual: "Current1", passwordNueva: "Newpass1" })
        expect(input(wrapper, "password-current").element.value).toBe("")
        expect(success).toHaveBeenCalledWith("Contraseña actualizada")
    })

    it("renders a non-admin role and handles password errors from the server", async () => {
        authState.user.rol = "usuario"
        changePassword.mockRejectedValueOnce({ details: { passwordNueva: "Comprometida" }, message: "Invalid" })
        const wrapper = mount(ProfileView, { global })
        expect(wrapper.find('[data-test="profile-role"]').text()).toContain("Usuario")
        await input(wrapper, "password-current").setValue("Current1")
        await input(wrapper, "password-new").setValue("Newpass1")
        await input(wrapper, "password-confirmation").setValue("Newpass1")
        await wrapper.find('[data-test="password-form"]').trigger("submit")
        await flushPromises()
        expect(input(wrapper, "password-new-error").text()).toBe("Comprometida")
    })
})
