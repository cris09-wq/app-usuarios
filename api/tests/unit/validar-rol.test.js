// ============================================================
// PRUEBA UNITARIA: middleware validarRol
//
// Qué probamos: que el middleware deje pasar al siguiente cuando el rol
// está permitido y que corte con 403 cuando no lo está.
// No tocamos BD ni rutas: fabricamos req/res "falsos" (mocks).
// ============================================================
import { beforeEach, describe, expect, it, vi } from "vitest";
import { validarRol } from "../../middlewares/validar-rol.js";

// Crea un res falso encadenable: res.status(...).json(...)
const crearRes = () => {
    const res = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

describe("middleware validarRol", () => {
    let res;
    let next;

    beforeEach(() => {
        res = crearRes();
        next = vi.fn();
    });

    it("responde 403 si el rol del usuario no está permitido", () => {
        const req = { usuario: { rol: "usuario" } };

        validarRol("admin")(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: "No tiene permisos para esto" });
        expect(next).not.toHaveBeenCalled();
    });

    it("llama a next() si el rol está permitido", () => {
        const req = { usuario: { rol: "admin" } };

        validarRol("admin")(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });

    it("acepta cualquiera de los roles listados", () => {
        const req = { usuario: { rol: "usuario" } };

        validarRol("admin", "usuario")(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
    });

    it("responde 500 si no se ejecutó validarJWT antes", () => {
        const req = {}; // sin req.usuario

        validarRol("admin")(req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(next).not.toHaveBeenCalled();
    });
});
