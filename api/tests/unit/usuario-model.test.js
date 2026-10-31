import { describe, expect, it } from "vitest";
import Usuario from "../../models/usuario.js";
import { setupTestDB } from "../helpers/setup-db.js";

setupTestDB();

describe("modelo Usuario", () => {
  it("hashea la contraseña al guardar y permite validarla", async () => {
    const usuario = new Usuario({
      nombre: "Prueba",
      email: "modelo@demo.com",
      password: "Clave1234",
    });

    await usuario.save();

    expect(usuario.password).not.toBe("Clave1234");
    expect(usuario.validarPassword("Clave1234")).toBe(true);
    expect(usuario.validarPassword("OtraClave1")).toBe(false);
  });

  it("no vuelve a hashear la contraseña si no cambió", async () => {
    const usuario = new Usuario({
      nombre: "Prueba",
      email: "modelo@demo.com",
      password: "Clave1234",
    });
    await usuario.save();
    const hashOriginal = usuario.password;

    usuario.nombre = "Nombre actualizado";
    await usuario.save();

    expect(usuario.password).toBe(hashOriginal);
    expect(usuario.validarPassword("Clave1234")).toBe(true);
  });

  it("serializa uid y nunca expone hash ni versión", () => {
    const usuario = new Usuario({
      nombre: "Prueba",
      email: "modelo@demo.com",
      password: "Clave1234",
    });

    const json = usuario.toJSON();

    expect(json.uid.toString()).toBe(usuario.id);
    expect(json.password).toBeUndefined();
    expect(json.__v).toBeUndefined();
  });

  it("rechaza un rol fuera del enum", async () => {
    const usuario = new Usuario({
      nombre: "Prueba",
      email: "modelo@demo.com",
      password: "Clave1234",
      rol: "superadmin",
    });

    await expect(usuario.validate()).rejects.toMatchObject({
      name: "ValidationError",
    });
  });
});
