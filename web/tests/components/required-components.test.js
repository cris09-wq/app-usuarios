import { mount } from "@vue/test-utils"
import { describe, expect, it, vi } from "vitest"
import AlertMessage from "@/components/AlertMessage.vue"
import ConfirmDialog from "@/components/ConfirmDialog.vue"
import FormField from "@/components/FormField.vue"
import PaginationBar from "@/components/PaginationBar.vue"
import { useToast } from "@/composables/useToast.js"

describe("FormField", () => {
    it("renders label, input attributes, hint, and updates its model", async () => {
        const wrapper = mount(FormField, {
            props: {
                label: "Correo",
                modelValue: "ana@example.com",
                type: "email",
                autocomplete: "email",
                placeholder: "tu@email.com",
                hint: "Usa tu correo",
                testId: "email",
            },
        })

        expect(wrapper.find("label").text()).toBe("Correo")
        expect(wrapper.find("input").element.value).toBe("ana@example.com")
        expect(wrapper.find("input").attributes()).toMatchObject({
            type: "email",
            autocomplete: "email",
            placeholder: "tu@email.com",
            "aria-invalid": "false",
            "aria-describedby": wrapper.find(".field__hint").attributes("id"),
            "data-test": "email",
        })
        await wrapper.find("input").setValue("new@example.com")
        expect(wrapper.emitted("update:modelValue")).toEqual([["new@example.com"]])
    })

    it("prioritizes errors over hints and exposes accessible error state", () => {
        const wrapper = mount(FormField, {
            props: { label: "Nombre", error: "Obligatorio", hint: "Ayuda", testId: "name" },
        })

        expect(wrapper.find(".field").classes()).toContain("field--error")
        expect(wrapper.find("input").attributes("aria-invalid")).toBe("true")
        expect(wrapper.find("input").attributes("aria-describedby")).toBe(wrapper.find(".field__error").attributes("id"))
        expect(wrapper.find('[data-test="name-error"]').text()).toBe("Obligatorio")
        expect(wrapper.find(".field__hint").exists()).toBe(false)
    })

    it("toggles password visibility and labels accessibly", async () => {
        const wrapper = mount(FormField, {
            props: { label: "Contraseña", type: "password", testId: "password" },
        })
        const input = wrapper.find("input")
        const toggle = wrapper.find('[data-test="password-toggle"]')

        expect(input.attributes("type")).toBe("password")
        expect(toggle.attributes("aria-label")).toBe("Mostrar contraseña")
        await toggle.trigger("click")
        expect(input.attributes("type")).toBe("text")
        expect(toggle.attributes("aria-label")).toBe("Ocultar contraseña")
        await toggle.trigger("click")
        expect(input.attributes("type")).toBe("password")
    })

    it("uses the default input settings and supports a disabled field", () => {
        const wrapper = mount(FormField, { props: { label: "Campo", disabled: true } })
        expect(wrapper.find("input").attributes("type")).toBe("text")
        expect(wrapper.find("input").attributes("autocomplete")).toBe("off")
        expect(wrapper.find("input").attributes("disabled")).toBeDefined()
        expect(wrapper.find(".field__hint").exists()).toBe(false)
    })
})

describe("PaginationBar", () => {
    it("shows page range and disables previous at the first page", () => {
        const wrapper = mount(PaginationBar, {
            props: { page: 1, totalPages: 3, total: 25, limit: 10 },
        })
        expect(wrapper.find('[data-test="pagination-info"]').text()).toBe("Mostrando 1–10 de 25")
        expect(wrapper.find('[data-test="pagination-page"]').text()).toBe("Página 1 de 3")
        expect(wrapper.find('[data-test="pagination-prev"]').attributes("disabled")).toBeDefined()
        expect(wrapper.find('[data-test="pagination-next"]').attributes("disabled")).toBeUndefined()
    })

    it("emits previous and next page changes and disables next on the last page", async () => {
        const wrapper = mount(PaginationBar, {
            props: { page: 3, totalPages: 3, total: 25, limit: 10 },
        })
        await wrapper.find('[data-test="pagination-prev"]').trigger("click")
        await wrapper.find('[data-test="pagination-next"]').trigger("click")
        expect(wrapper.emitted("change")).toEqual([[2]])
        expect(wrapper.find('[data-test="pagination-info"]').text()).toBe("Mostrando 21–25 de 25")
        expect(wrapper.find('[data-test="pagination-next"]').attributes("disabled")).toBeDefined()
    })

    it("shows an empty range for no results", () => {
        const wrapper = mount(PaginationBar, {
            props: { page: 1, totalPages: 0, total: 0, limit: 10 },
        })
        expect(wrapper.find('[data-test="pagination-info"]').text()).toBe("Mostrando 0–0 de 0")
        expect(wrapper.find('[data-test="pagination-prev"]').attributes("disabled")).toBeDefined()
        expect(wrapper.find('[data-test="pagination-next"]').attributes("disabled")).toBeDefined()
    })
})

describe("ConfirmDialog", () => {
    it("renders accessible dialog content, custom labels, and initially focuses cancel", async () => {
        const focus = vi.spyOn(HTMLElement.prototype, "focus")
        const wrapper = mount(ConfirmDialog, {
            attachTo: document.body,
            props: { open: false, title: "Eliminar usuario", message: "No se puede deshacer", confirmText: "Eliminar" },
        })
        await wrapper.setProps({ open: true })
        await new Promise((resolve) => setTimeout(resolve, 0))

        const dialog = document.body.querySelector('[data-test="confirm-dialog"]')
        expect(dialog.getAttribute("role")).toBe("alertdialog")
        expect(dialog.getAttribute("aria-modal")).toBe("true")
        expect(document.body.querySelector("#dialog-title").textContent).toBe("Eliminar usuario")
        expect(document.body.querySelector("#dialog-message").textContent).toBe("No se puede deshacer")
        expect(focus).toHaveBeenCalledOnce()
        expect(document.body.querySelector('[data-test="confirm-accept"]').textContent).toContain("Eliminar")
        wrapper.unmount()
    })

    it("emits confirm and cancel from their buttons", async () => {
        const wrapper = mount(ConfirmDialog, { attachTo: document.body, props: { open: true } })
        document.body.querySelector('[data-test="confirm-accept"]').click()
        document.body.querySelector('[data-test="confirm-cancel"]').click()
        expect(wrapper.emitted("confirm")).toHaveLength(1)
        expect(wrapper.emitted("cancel")).toHaveLength(1)
        wrapper.unmount()
    })

    it("allows escape and backdrop cancellation when not loading", async () => {
        const wrapper = mount(ConfirmDialog, { attachTo: document.body, props: { open: true } })
        document.body.querySelector(".dialog-backdrop").dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
        document.body.querySelector(".dialog-backdrop").dispatchEvent(new MouseEvent("click", { bubbles: true }))
        expect(wrapper.emitted("cancel")).toHaveLength(2)
        wrapper.unmount()
    })

    it("prevents cancellation and disables actions while loading", async () => {
        const wrapper = mount(ConfirmDialog, {
            attachTo: document.body,
            props: { open: true, loading: true },
        })
        document.body.querySelector(".dialog-backdrop").dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
        document.body.querySelector(".dialog-backdrop").dispatchEvent(new MouseEvent("click", { bubbles: true }))
        expect(wrapper.emitted("cancel")).toBeUndefined()
        expect(document.body.querySelector('[data-test="confirm-cancel"]').disabled).toBe(true)
        expect(document.body.querySelector('[data-test="confirm-accept"]').disabled).toBe(true)
        expect(document.body.querySelector('[data-test="confirm-accept"]').textContent).toBe("Procesando…")
        wrapper.unmount()
    })
})

describe("AlertMessage", () => {
    it("does not render when the message is empty", () => {
        expect(mount(AlertMessage).find('[data-test="alert"]').exists()).toBe(false)
    })

    it.each(["error", "success", "info"])("renders an %s alert", (type) => {
        const wrapper = mount(AlertMessage, { props: { type, message: "Operación completada" } })
        expect(wrapper.find('[data-test="alert"]').attributes("role")).toBe("alert")
        expect(wrapper.find('[data-test="alert"]').classes()).toContain(`alert--${type}`)
        expect(wrapper.text()).toBe("Operación completada")
    })
})

describe("useToast", () => {
    it("creates success/error messages and safely dismisses notifications", () => {
        const { toasts, success, error, dismiss } = useToast()
        const successId = success("Guardado")
        const errorId = error("No guardado")
        expect(toasts.map(({ message, type }) => [message, type])).toEqual([
            ["Guardado", "success"],
            ["No guardado", "error"],
        ])
        dismiss(-1)
        expect(toasts).toHaveLength(2)
        dismiss(successId)
        dismiss(errorId)
        expect(toasts).toHaveLength(0)
    })

    it("automatically dismisses notifications after their configured duration", () => {
        vi.useFakeTimers()
        const { toasts, success, error } = useToast()
        const successId = success("Temporal")
        const errorId = error("Error temporal")
        vi.advanceTimersByTime(3500)
        expect(toasts.find(({ id }) => id === successId)).toBeUndefined()
        expect(toasts.find(({ id }) => id === errorId)).toBeDefined()
        vi.advanceTimersByTime(1500)
        expect(toasts.find(({ id }) => id === errorId)).toBeUndefined()
    })
})
