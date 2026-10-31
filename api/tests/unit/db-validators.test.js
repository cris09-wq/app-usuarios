

import { afterEach, describe, expect, it, vi } from "vitest";
import usuario from "../../models/usuario.js";
import {emailExiste, esRolValido} from "../../helpers/db-validators.js"

describe("test Helper db-validators", () =>{

    describe("Si el Rol es valido", ()=>{

        it("acepta el Rol admin",()=>{

            expect(esRolValido("admin")).toBe(true)

        })
        it("acepta el Rol usuario",()=>{

            expect(esRolValido("usuario")).toBe(true)
            
        })
        it.each(["jefe", "ADMIN", "", undefined])("rechaza el Rol %j",(rol)=>{

            expect(() => esRolValido(rol)).toThrow("El rol debe ser uno de: admin, usuario")
        }
        )
    })
    describe("Existe Email", ()=>{

        afterEach(()=>{
            vi.restoreAllMocks()
        })

        it("No falla si no existe el email o no esta registrado", async ()=>{

            vi.spyOn(usuario, "findOne").mockResolvedValue(null)

            await expect(emailExiste("trtes@gmail.com")).resolves.toBeUndefined()
        })

        it("creacion y validacion de busqueda de usuario", async ()=>{
            const findOne = vi.spyOn(usuario, "findOne").mockResolvedValue(null)

            await emailExiste("test@test.com")

            expect(findOne).toHaveBeenCalledWith({email: "test@test.com"})
        })

        it("Error si existe el email en la base de datos",  async ()=>{

            vi.spyOn(usuario, "findOne").mockResolvedValue({ id: "otro-usuario" })

            await expect(emailExiste("test@test.com")).rejects.toThrow("Ese email ya está registrado")
        })


    })
})