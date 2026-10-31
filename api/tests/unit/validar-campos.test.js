import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("express-validator", () => ({ validationResult: vi.fn() }));

import { validationResult } from "express-validator";
import { validarCampos } from "../../middlewares/validar-campos.js";

const crearRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("middleware validarCampos", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {};
    res = crearRes();
    next = vi.fn();
    vi.clearAllMocks();
  });

  it("continúa cuando no hay errores de validación", () => {
    validationResult.mockReturnValue({ isEmpty: () => true });

    validarCampos(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("responde 400 con el path y mensaje, sin filtrar valores enviados", () => {
    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: vi.fn().mockReturnValue([
        { path: "password", msg: "Contraseña inválida", value: "secreto" },
      ]),
    });

    validarCampos(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      errores: [{ path: "password", msg: "Contraseña inválida" }],
    });
    expect(next).not.toHaveBeenCalled();
  });
});
