// ============================================================
// PRUEBAS UNITARIAS: utilidades de validación del frontend
//
// Son funciones puras: reciben un valor y devuelven un mensaje de error
// (o "" si es válido). No hace falta montar componentes ni simular la API.
// ============================================================
import { describe, expect, it } from "vitest";
import {
    isValid,
    validateEmail,
    validateName,
    validatePassword,
    validatePasswordConfirmation,
} from "@/utils/validators.js";

describe("validateName", () => {
    it("exige el nombre", () => {
        expect(validateName("")).toBe("El nombre es obligatorio");
        expect(validateName("   ")).toBe("El nombre es obligatorio");
    });

    it("exige al menos 2 caracteres", () => {
        expect(validateName("A")).toBe("El nombre debe tener entre 2 y 60 caracteres");
    });

    it("rechaza nombres de más de 60 caracteres", () => {
        expect(validateName("a".repeat(61))).toBe("El nombre debe tener entre 2 y 60 caracteres");
    });

    it("acepta un nombre válido", () => {
        expect(validateName("Ana Torres")).toBe("");
    });
});

describe("validateEmail", () => {
    it("exige el email", () => {
        expect(validateEmail("")).toBe("El email es obligatorio");
    });

    it("rechaza formatos inválidos", () => {
        expect(validateEmail("ana")).toBe("El email no tiene un formato válido");
        expect(validateEmail("ana@demo")).toBe("El email no tiene un formato válido");
    });

    it("acepta un email válido", () => {
        expect(validateEmail("ana@demo.com")).toBe("");
    });
});

describe("validatePassword", () => {
    it("exige la contraseña", () => {
        expect(validatePassword("")).toBe("La contraseña es obligatoria");
    });

    it("exige entre 8 y 64 caracteres", () => {
        expect(validatePassword("Ab1")).toBe("La contraseña debe tener entre 8 y 64 caracteres");
        expect(validatePassword(`Aa1${"x".repeat(62)}`)).toBe(
            "La contraseña debe tener entre 8 y 64 caracteres",
        );
    });

    it("exige al menos una mayúscula", () => {
        expect(validatePassword("clave1234")).toBe("La contraseña debe incluir al menos una mayúscula");
    });

    it("exige al menos una minúscula", () => {
        expect(validatePassword("CLAVE1234")).toBe("La contraseña debe incluir al menos una minúscula");
    });

    it("exige al menos un número", () => {
        expect(validatePassword("ClaveSegura")).toBe("La contraseña debe incluir al menos un número");
    });

    it("acepta una contraseña válida", () => {
        expect(validatePassword("Clave1234")).toBe("");
    });
});

describe("validatePasswordConfirmation", () => {
    it("exige repetir la contraseña", () => {
        expect(validatePasswordConfirmation("Clave1234", "")).toBe("Repite la contraseña");
    });

    it("detecta que no coinciden", () => {
        expect(validatePasswordConfirmation("Clave1234", "Otra1234")).toBe("Las contraseñas no coinciden");
    });

    it("acepta cuando coinciden", () => {
        expect(validatePasswordConfirmation("Clave1234", "Clave1234")).toBe("");
    });
});

describe("isValid", () => {
    it("es true cuando no hay ningún mensaje", () => {
        expect(isValid({ email: "", nombre: "" })).toBe(true);
    });

    it("es false cuando algún campo tiene mensaje", () => {
        expect(isValid({ email: "mal", nombre: "" })).toBe(false);
    });
});
