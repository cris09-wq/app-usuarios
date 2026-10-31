// ============================================================
// PRUEBAS UNITARIAS: envoltorio HTTP (services/http.js)
//
// Aquí NO hay API real: sustituimos `fetch` por un mock con vi.stubGlobal.
// Probamos que se añada el token, se construya la query, se conviertan los
// errores en ApiError y se avise del 401.
// ============================================================
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, request, setUnauthorizedHandler, tokenStorage } from "@/services/http.js";

// Crea una respuesta falsa de fetch.
const respuesta = ({ ok = true, status = 200, data = {} } = {}) => ({
    ok,
    status,
    json: vi.fn().mockResolvedValue(data),
});

describe("tokenStorage", () => {
    it("guarda, lee y borra el token en localStorage", () => {
        expect(tokenStorage.get()).toBeNull();

        tokenStorage.set("abc123");
        expect(tokenStorage.get()).toBe("abc123");

        tokenStorage.clear();
        expect(tokenStorage.get()).toBeNull();
    });
});

describe("request", () => {
    let fetchMock;

    beforeEach(() => {
        fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
        setUnauthorizedHandler(() => {});
        tokenStorage.clear();
    });

    it("devuelve los datos cuando la respuesta es correcta", async () => {
        fetchMock.mockResolvedValue(respuesta({ data: { hola: "mundo" } }));

        const data = await request("/auth/perfil");

        expect(data).toEqual({ hola: "mundo" });
    });

    it("añade el header x-token si hay sesión", async () => {
        tokenStorage.set("mi-token");
        fetchMock.mockResolvedValue(respuesta());

        await request("/auth/perfil");

        const [, opciones] = fetchMock.mock.calls[0];
        expect(opciones.headers["x-token"]).toBe("mi-token");
    });

    it("no añade x-token si no hay sesión", async () => {
        fetchMock.mockResolvedValue(respuesta());

        await request("/auth/login", { method: "POST", body: { email: "a@a.com" } });

        const [, opciones] = fetchMock.mock.calls[0];
        expect(opciones.headers["x-token"]).toBeUndefined();
    });

    it("convierte el body a JSON y pone Content-Type", async () => {
        fetchMock.mockResolvedValue(respuesta());

        await request("/auth/login", { method: "POST", body: { email: "a@a.com" } });

        const [, opciones] = fetchMock.mock.calls[0];
        expect(opciones.method).toBe("POST");
        expect(opciones.headers["Content-Type"]).toBe("application/json");
        expect(opciones.body).toBe(JSON.stringify({ email: "a@a.com" }));
    });

    it("añade los parámetros de búsqueda y omite los vacíos", async () => {
        fetchMock.mockResolvedValue(respuesta());

        await request("/usuarios", { query: { buscar: "ana", rol: "", pagina: 2, limite: undefined } });

        const [url] = fetchMock.mock.calls[0];
        expect(url.searchParams.get("buscar")).toBe("ana");
        expect(url.searchParams.get("pagina")).toBe("2");
        expect(url.searchParams.has("rol")).toBe(false);
        expect(url.searchParams.has("limite")).toBe(false);
    });

    it("lanza ApiError con el mensaje general del backend", async () => {
        fetchMock.mockResolvedValue(respuesta({ ok: false, status: 401, data: { error: "Credenciales inválidas" } }));

        await expect(request("/auth/login", { method: "POST" })).rejects.toMatchObject({
            status: 401,
            message: "Credenciales inválidas",
        });
    });

    it("convierte los errores por campo en details", async () => {
        fetchMock.mockResolvedValue(
            respuesta({
                ok: false,
                status: 400,
                data: {
                    errores: [
                        { path: "email", msg: "El email no tiene un formato válido" },
                        { path: "password", msg: "La contraseña es obligatoria" },
                    ],
                },
            }),
        );

        await expect(request("/auth/registro", { method: "POST" })).rejects.toMatchObject({
            status: 400,
            message: "Revisa los datos del formulario",
            details: {
                email: "El email no tiene un formato válido",
                password: "La contraseña es obligatoria",
            },
        });
    });

    it("avisa al handler cuando hay 401 con token guardado", async () => {
        const onUnauthorized = vi.fn();
        setUnauthorizedHandler(onUnauthorized);
        tokenStorage.set("token-caducado");
        fetchMock.mockResolvedValue(respuesta({ ok: false, status: 401, data: { error: "x" } }));

        await expect(request("/auth/perfil")).rejects.toBeInstanceOf(ApiError);

        expect(onUnauthorized).toHaveBeenCalledTimes(1);
    });

    it("no avisa del 401 si no había token", async () => {
        const onUnauthorized = vi.fn();
        setUnauthorizedHandler(onUnauthorized);
        fetchMock.mockResolvedValue(respuesta({ ok: false, status: 401, data: { error: "x" } }));

        await expect(request("/auth/login", { method: "POST" })).rejects.toBeInstanceOf(ApiError);

        expect(onUnauthorized).not.toHaveBeenCalled();
    });

    it("lanza ApiError status 0 si no hay conexión", async () => {
        fetchMock.mockRejectedValue(new Error("network down"));

        await expect(request("/auth/perfil")).rejects.toMatchObject({
            status: 0,
            message: expect.stringContaining("No se pudo conectar"),
        });
    });
});
