import { beforeEach, describe, expect, it, vi } from "vitest"
import { validarRol} from "../../middlewares/validar-rol.js"

const crearRes = () => {
    const res = {}
    res.status = vi.fn().mockReturnValue(res)
    res.json = vi.fn().mockReturnValue(res)

    return res
}

describe("Validar Roles", () => {
    let res
    let next

    beforeEach(()=>{
        res = crearRes()
        next = vi.fn()
    })
    it("Responder 403 si el rol no esta permitido", () =>{
        const req = {
            usuario:{
                rol:"usuario"
            }
        }

        validarRol("admin")(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()

    
    })
})