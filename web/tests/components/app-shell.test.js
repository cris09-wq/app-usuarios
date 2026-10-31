import { mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ref } from "vue"
import App from "@/App.vue"
import AppHeader from "@/components/AppHeader.vue"
import ToastContainer from "@/components/ToastContainer.vue"
import NotFoundView from "@/views/NotFoundView.vue"
import { useToast } from "@/composables/useToast.js"

const { auth, push } = vi.hoisted(() => ({
    auth: {
        state: { user: { uid: "u1", nombre: "Ana Ruiz", rol: "admin" } },
        isAuthenticated: { value: true },
        isAdmin: { value: true },
        logout: vi.fn(),
    },
    push: vi.fn(),
}))
auth.isAuthenticated = ref(true)
auth.isAdmin = ref(true)

vi.mock("@/composables/useAuth.js", () => ({ useAuth: () => auth }))
vi.mock("vue-router", () => ({ useRouter: () => ({ push }) }))

describe("AppHeader", () => {
    beforeEach(() => {
        auth.state.user = { uid: "u1", nombre: "Ana Ruiz", rol: "admin" }
        auth.isAdmin.value = true
        auth.logout.mockReset()
        push.mockReset()
    })

    it("renders admin navigation and derives initials", () => {
        const wrapper = mount(AppHeader, { global: { stubs: { RouterLink: { template: "<a><slot /></a>" } } } })
        expect(wrapper.find('[data-test="nav-users"]').exists()).toBe(true)
        expect(wrapper.find('[data-test="nav-profile"]').exists()).toBe(true)
        expect(wrapper.find(".avatar").text()).toBe("AR")
        expect(wrapper.find('[data-test="current-user-name"]').text()).toBe("Ana Ruiz")
        expect(wrapper.text()).toContain("Administrador")
    })

    it("omits admin navigation for users and toggles/closes the responsive menu", async () => {
        auth.isAdmin.value = false
        auth.state.user = { uid: "u2", nombre: "Eva", rol: "usuario" }
        const wrapper = mount(AppHeader, { global: { stubs: { RouterLink: { template: "<a><slot /></a>" } } } })
        const toggle = wrapper.find(".header__toggle")
        expect(wrapper.find('[data-test="nav-users"]').exists()).toBe(false)
        expect(wrapper.text()).toContain("Usuario")
        await toggle.trigger("click")
        expect(toggle.attributes("aria-expanded")).toBe("true")
        expect(wrapper.find(".header__nav").classes()).toContain("header__nav--open")
        await wrapper.find(".header__nav").trigger("click")
        expect(toggle.attributes("aria-expanded")).toBe("false")
    })

    it("logs out and navigates to login", async () => {
        const wrapper = mount(AppHeader, { global: { stubs: { RouterLink: { template: "<a><slot /></a>" } } } })
        await wrapper.find('[data-test="logout"]').trigger("click")
        expect(auth.logout).toHaveBeenCalledOnce()
        expect(push).toHaveBeenCalledWith({ name: "login" })
    })
})

describe("App shell and toast container", () => {
    it("centers unauthenticated content and hides the header", () => {
        auth.isAuthenticated.value = false
        const wrapper = mount(App, {
            global: { stubs: { RouterView: true, ToastContainer: true, AppHeader: true } },
        })
        expect(wrapper.find("app-header-stub").exists()).toBe(false)
        expect(wrapper.find("main").classes()).toContain("layout__content--centered")
    })

    it("shows the header for authenticated users", () => {
        auth.isAuthenticated.value = true
        const wrapper = mount(App, {
            global: { stubs: { RouterView: true, ToastContainer: true, AppHeader: true } },
        })
        expect(wrapper.find("app-header-stub").exists()).toBe(true)
        expect(wrapper.find("main").classes()).not.toContain("layout__content--centered")
    })

    it("renders toast notifications and dismisses them from the close button", async () => {
        const toast = useToast()
        const id = toast.success("Guardado")
        const wrapper = mount(ToastContainer)
        expect(wrapper.find('[data-test="toast"]').text()).toContain("Guardado")
        await wrapper.find(".toast__close").trigger("click")
        expect(toast.toasts.find((item) => item.id === id)).toBeUndefined()
    })
})

describe("NotFoundView", () => {
    it("offers a route back home", () => {
        const wrapper = mount(NotFoundView, { global: { stubs: { RouterLink: { template: "<a><slot /></a>" } } } })
        expect(wrapper.text()).toContain("Página no encontrada")
        expect(wrapper.find('[data-test="go-home"]').text()).toBe("Ir al inicio")
    })
})
