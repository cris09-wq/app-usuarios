import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"
import AlertMessage from "@/components/AlertMessage.vue"

describe("AlertMessage", () => {
    it("renders nothing when there is no message", () => {
        const wrapper = mount(AlertMessage, { props: { message: "" } })
        expect(wrapper.find('[data-test="alert"]').exists()).toBe(false)
    })

    it("renders the message with alert semantics", () => {
        const wrapper = mount(AlertMessage, { props: { message: "Credenciales inválidas" } })
        const alert = wrapper.get('[data-test="alert"]')
        expect(alert.text()).toBe("Credenciales inválidas")
        expect(alert.attributes("role")).toBe("alert")
        expect(alert.classes()).toContain("alert--error")
    })

    it.each(["error", "success", "info"])("applies the %s modifier class", (type) => {
        const wrapper = mount(AlertMessage, { props: { message: "Aviso", type } })
        expect(wrapper.get('[data-test="alert"]').classes()).toContain(`alert--${type}`)
    })
})
