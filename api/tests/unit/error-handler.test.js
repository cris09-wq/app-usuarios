import { afterEach, describe, expect, it, vi } from "vitest";
import { manejarErrores } from "../../app.js";

const crearRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("manejador global de errores", () => {
  afterEach(() => vi.restoreAllMocks());

  it("convierte JSON mal formado en 400", () => {
    const res = crearRes();

    manejarErrores({ type: "entity.parse.failed" }, {}, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "El cuerpo de la petición no es un JSON válido",
    });
  });

  it("convierte un email duplicado de Mongo en 400", () => {
    const res = crearRes();

    manejarErrores({ code: 11000 }, {}, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Ese email ya está registrado" });
  });

  it("expone errores de validación del modelo como 400", () => {
    const res = crearRes();

    manejarErrores({ name: "ValidationError", message: "Falta el nombre" }, {}, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Falta el nombre" });
  });

  it("responde 500 y registra errores inesperados", () => {
    const res = crearRes();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    manejarErrores({ message: "fallo" }, {}, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Error interno" });
    expect(log).toHaveBeenCalledWith("ERROR:", "fallo");
  });
});
