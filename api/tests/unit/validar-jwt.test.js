import jwt from "jsonwebtoken";
import { afterEach, describe, expect, it, vi } from "vitest";
import Usuario from "../../models/usuario.js";
import { validarJWT } from "../../middlewares/validar-jwt.js";

const crearRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("middleware validarJWT", () => {
  afterEach(() => vi.restoreAllMocks());

  it("responde 401 si falta el token", async () => {
    const res = crearRes();
    const next = vi.fn();

    await validarJWT({ header: () => undefined }, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "No hay token en la petición" });
    expect(next).not.toHaveBeenCalled();
  });

  it("responde 401 si el token no se puede verificar", async () => {
    const res = crearRes();
    const next = vi.fn();

    await validarJWT({ header: () => "token-invalido" }, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Token no válido o expirado" });
    expect(next).not.toHaveBeenCalled();
  });

  it.each([
    ["no existe", null],
    ["está desactivado", { estado: false }],
  ])("rechaza un usuario que %s", async (_caso, usuario) => {
    vi.spyOn(Usuario, "findById").mockResolvedValue(usuario);
    const token = jwt.sign({ uid: "usuario-id" }, process.env.JWT_SECRET);
    const req = { header: () => token };
    const res = crearRes();
    const next = vi.fn();

    await validarJWT(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Usuario desactivado" });
    expect(next).not.toHaveBeenCalled();
  });

  it("adjunta el usuario activo y continúa", async () => {
    const usuario = { estado: true, rol: "usuario" };
    vi.spyOn(Usuario, "findById").mockResolvedValue(usuario);
    const token = jwt.sign({ uid: "usuario-id" }, process.env.JWT_SECRET);
    const req = { header: () => token };
    const res = crearRes();
    const next = vi.fn();

    await validarJWT(req, res, next);

    expect(req.usuario).toBe(usuario);
    expect(next).toHaveBeenCalledOnce();
  });

  it("responde 401 si la consulta del usuario falla", async () => {
    vi.spyOn(Usuario, "findById").mockRejectedValue(new Error("db offline"));
    const token = jwt.sign({ uid: "usuario-id" }, process.env.JWT_SECRET);
    const res = crearRes();

    await validarJWT({ header: () => token }, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Token no válido o expirado" });
  });
});
