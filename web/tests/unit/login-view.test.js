import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import LoginView from "@/views/LoginView.vue"

const { loginMock, pushMock, routeState } = vi.hoisted(() => ({
    loginMock: vi.fn(),
    pushMock: vi.fn(),
    routeState: { query: {} },
}))

vi.mock("@/composables/useAuth.js", () => ({
    useAuth: () => ({ login: loginMock }),
}))

vi.mock("vue-router", () => ({
    useRouter: () => ({ push: pushMock }),
    useRoute: () => routeState,
}))

const createWrapper = () =>
    mount(LoginView, {
        global: {
            stubs: { RouterLink: { template: "<a><slot /></a>" } },
        },
    })

describe("LoginView", () => {
    beforeEach(() => {
        loginMock.mockReset()
        loginMock.mockResolvedValue(undefined)
        pushMock.mockReset()
        routeState.query = {}
    })

    it("validates email and password before making a network request", async () => {
        const wrapper = createWrapper()
        await wrapper.find('[data-test="login-form"]').trigger("submit")
        expect(wrapper.find('[data-test="login-email-error"]').text()).toBe("El email es obligatorio")
        expect(wrapper.find('[data-test="login-password-error"]').text()).toBe("La contraseña es obligatoria")
        expect(loginMock).not.toHaveBeenCalled()
    })

    it("rejects malformed email and does not call the auth service", async () => {
        const wrapper = createWrapper()
        await wrapper.find('[data-test="login-email"]').setValue("incorrecto")
        await wrapper.find('[data-test="login-password"]').setValue("password")
        await wrapper.find('[data-test="login-form"]').trigger("submit")
        expect(wrapper.find('[data-test="login-email-error"]').text()).toBe("El email no tiene un formato válido")
        expect(loginMock).not.toHaveBeenCalled()
    })

    it("logs in and redirects to a safe internal return path", async () => {
        routeState.query = { redirect: "/usuarios?pagina=2" }
        const wrapper = createWrapper()
        await wrapper.find('[data-test="login-email"]').setValue("ana@example.com")
        await wrapper.find('[data-test="login-password"]').setValue("secret")
        await wrapper.find('[data-test="login-form"]').trigger("submit")
        await flushPromises()

        expect(loginMock).toHaveBeenCalledWith({ email: "ana@example.com", password: "secret" })
        expect(pushMock).toHaveBeenCalledWith("/usuarios?pagina=2")
        expect(wrapper.find('[data-test="login-submit"]').text()).toContain("Entrar")
    })

    it.each(["//evil.example", "https://evil.example", undefined])(
        "uses the home route for unsafe or missing redirect values (%s)",
        async (redirect) => {
            routeState.query = redirect === undefined ? {} : { redirect }
            const wrapper = createWrapper()
            await wrapper.find('[data-test="login-email"]').setValue("ana@example.com")
            await wrapper.find('[data-test="login-password"]').setValue("secret")
            await wrapper.find('[data-test="login-form"]').trigger("submit")
            await flushPromises()
            expect(pushMock).toHaveBeenCalledWith({ name: "home" })
        },
    )

    it("renders a server error, clears the password, and resets submitting state on failure", async () => {
        loginMock.mockRejectedValue(new Error("Credenciales inválidas"))
        const wrapper = createWrapper()
        await wrapper.find('[data-test="login-email"]').setValue("ana@example.com")
        await wrapper.find('[data-test="login-password"]').setValue("wrong")
        await wrapper.find('[data-test="login-form"]').trigger("submit")
        await flushPromises()

        const alert = wrapper.find('[data-test="alert"]')
        expect(alert.exists()).toBe(true)
        expect(alert.text()).toBe("Credenciales inválidas")
        expect(wrapper.find('[data-test="login-password"]').element.value).toBe("")
        expect(wrapper.find('[data-test="login-submit"]').attributes("disabled")).toBeUndefined()
        expect(pushMock).not.toHaveBeenCalled()
    })
})
