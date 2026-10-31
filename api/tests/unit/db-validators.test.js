// ============================================================
// PRUEBA UNITARIA: helpers de validación contra BD (db-validators)
//
// Usamos vi.spyOn para "falsear" Usuario.findOne: así probamos la lógica
// del helper sin necesitar un MongoDB real.
// ============================================================
import { afterEach, describe, expect, it, vi } from "vitest";
import usuario from "../../models/usuario.js";
import { emailExiste, esRolValido } from "../../helpers/db-validators.js";

describe("helper esRolValido", () => {
    it("acepta el rol admin", () => {
        expect(esRolValido("admin")).toBe(true);
    });

    it("acepta el rol usuario", () => {
        expect(esRolValido("usuario")).toBe(true);
    });

    it.each(["jefe", "ADMIN", "", undefined, null])("rechaza el rol %j", (rol) => {
        expect(() => esRolValido(rol)).toThrow("El rol debe ser uno de: admin, usuario");
    });
});

describe("helper emailExiste", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("no falla si el email no está registrado", async () => {
        vi.spyOn(usuario, "findOne").mockResolvedValue(null);

        await expect(emailExiste("nuevo@test.com")).resolves.toBeUndefined();
    });

    it("busca el email normalizado (sin espacios y en minúsculas)", async () => {
        const findOne = vi.spyOn(usuario, "findOne").mockResolvedValue(null);

        await emailExiste("  TEST@TEST.com  ");

        expect(findOne).toHaveBeenCalledWith({ email: "test@test.com" });
    });

    it("falla si el email ya pertenece a otro usuario", async () => {
        vi.spyOn(usuario, "findOne").mockResolvedValue({ id: "otro-usuario" });

        await expect(emailExiste("test@test.com")).rejects.toThrow("Ese email ya está registrado");
    });

    it("permite conservar el propio email al actualizar el perfil", async () => {
        vi.spyOn(usuario, "findOne").mockResolvedValue({ id: "mi-id" });

        await expect(emailExiste("test@test.com", "mi-id")).resolves.toBeUndefined();
    });
});
