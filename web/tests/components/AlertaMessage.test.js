import {describe, expect, it} from "vitest"
import { mount} from "@vue/test-utils"
import AlertaMessage from "@/components/AlertaMessage.vue"

describe("component/AlertaMessage", ()=>{
    it("No pinta nada si no hay mensaje", ()=>{
        const wrapper = mount(AlertaMessage, {props: {
            message:"Credenciales invalidas"
        }})

        const alerta = wrapper.get('[data-test="alert"]')

        expect(alerta.text()).toBe("")
    })

    it("Muestra el mensaje de error en el alertMessage", ()=>{
        const wrapper = mount(AlertaMessage, {props:{message: "Credenciales Invalidas"}})

    const alerta = wrapper.get('[data-test="alert"]')

    expect(alerta.text()).toBe("Credenciales Invalidas")

    expect(alerta.attributes("role")).toBe("alert")
    })

    it.each(['error', 'success', 'info'])('Aplica la clase del tipo %s', (type)=>{
        const wrapper = mount(AlertaMessage, {props:{
            message: "x",
            type
        }})

        expect(wrapper.get('[data-test = "alert"]').classes()).toContain("")
    })
})