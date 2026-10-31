// ============================================================
// PRUEBA UNITARIA: helper generarJWT
//
// Verificamos que el token generado:
//   - se pueda verificar con el secreto correcto,
//   - lleve el uid y el rol del usuario,
//   - caduque según JWT_EXPIRA.
// ============================================================
import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { generarJWT } from "../../helpers/generar-jwt.js";

const usuarioFalso = { id: "507f1f77bcf86cd799439011", rol: "admin" };

describe("helper generarJWT", () => {
    it("genera un token verificable con el secreto configurado", () => {
        const token = generarJWT(usuarioFalso);

        const payload = jwt.verify(token, process.env.JWT_SECRET);

        expect(payload.uid).toBe(usuarioFalso.id);
        expect(payload.rol).toBe("admin");
    });

    it("incluye una fecha de expiración", () => {
        const token = generarJWT(usuarioFalso);

        const payload = jwt.decode(token);

        expect(payload.exp).toBeGreaterThan(payload.iat);
    });

    it("el token no se puede verificar con otro secreto", () => {
        const token = generarJWT(usuarioFalso);

        expect(() => jwt.verify(token, "otro-secreto")).toThrow();
    });
});
