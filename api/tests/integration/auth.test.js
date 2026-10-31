// ============================================================
// PRUEBAS DE INTEGRACIÓN: rutas de autenticación
//
// Aquí SÍ pasamos por Express completo: rutas + validadores + controladores
// + modelo + MongoDB en memoria. Supertest hace las peticiones HTTP sin
// abrir un puerto real.
//
// Flujo típico de un test:
//   1. Preparamos datos (crearUsuario / llamada a la API).
//   2. Hacemos la petición con request(app).
//   3. Comprobamos status y body.
// ============================================================
import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../../app.js";
import { setupTestDB } from "../helpers/setup-db.js";
import { crearUsuario, tokenDe, auth } from "../helpers/fixtures.js";

setupTestDB();

describe("app y rutas básicas", () => {
    it("GET /api/health responde ok", async () => {
        const res = await request(app).get("/api/health");

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ status: "ok" });
    });

    it("una ruta inexistente responde 404", async () => {
        const res = await request(app).get("/api/no-existe");

        expect(res.status).toBe(404);
        expect(res.body.error).toBe("Ruta no encontrada");
    });
});

describe("POST /api/auth/registro", () => {
    const datosValidos = { nombre: "Nuevo Usuario", email: "nuevo@test.com", password: "Clave1234" };

    it("crea el usuario, devuelve token y nunca la contraseña", async () => {
        const res = await request(app).post("/api/auth/registro").send(datosValidos);

        expect(res.status).toBe(201);
        expect(res.body.token).toBeTypeOf("string");
        expect(res.body.usuario.email).toBe("nuevo@test.com");
        expect(res.body.usuario.rol).toBe("usuario");
        expect(res.body.usuario.password).toBeUndefined();
        expect(res.body.usuario.uid).toBeDefined();
    });

    it("normaliza el email a minúsculas y sin espacios", async () => {
        const res = await request(app)
            .post("/api/auth/registro")
            .send({ ...datosValidos, email: "  NUEVO@TEST.COM  " });

        expect(res.status).toBe(201);
        expect(res.body.usuario.email).toBe("nuevo@test.com");
    });

    it("rechaza un email con formato inválido", async () => {
        const res = await request(app)
            .post("/api/auth/registro")
            .send({ ...datosValidos, email: "no-es-email" });

        expect(res.status).toBe(400);
        expect(res.body.errores[0].path).toBe("email");
    });

    it("rechaza una contraseña débil (sin mayúscula ni número)", async () => {
        const res = await request(app)
            .post("/api/auth/registro")
            .send({ ...datosValidos, password: "sololetras" });

        expect(res.status).toBe(400);
        expect(res.body.errores[0].path).toBe("password");
    });

    it("rechaza un nombre demasiado corto", async () => {
        const res = await request(app)
            .post("/api/auth/registro")
            .send({ ...datosValidos, nombre: "A" });

        expect(res.status).toBe(400);
        expect(res.body.errores[0].path).toBe("nombre");
    });

    it("rechaza un email ya registrado", async () => {
        await crearUsuario({ email: "nuevo@test.com" });

        const res = await request(app).post("/api/auth/registro").send(datosValidos);

        expect(res.status).toBe(400);
        expect(res.body.errores[0]).toEqual({ path: "email", msg: "Ese email ya está registrado" });
    });
});

describe("POST /api/auth/login", () => {
    it("devuelve token y usuario con credenciales correctas", async () => {
        await crearUsuario({ email: "ana@demo.com", password: "Usuario123" });

        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "ana@demo.com", password: "Usuario123" });

        expect(res.status).toBe(200);
        expect(res.body.token).toBeTypeOf("string");
        expect(res.body.usuario.email).toBe("ana@demo.com");
        expect(res.body.usuario.password).toBeUndefined();
    });

    it("acepta el email con otra capitalización", async () => {
        await crearUsuario({ email: "ana@demo.com", password: "Usuario123" });

        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "ANA@DEMO.COM", password: "Usuario123" });

        expect(res.status).toBe(200);
    });

    it("responde 401 si la contraseña es incorrecta", async () => {
        await crearUsuario({ email: "ana@demo.com", password: "Usuario123" });

        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "ana@demo.com", password: "Incorrecta1" });

        expect(res.status).toBe(401);
        expect(res.body.error).toBe("Credenciales inválidas");
    });

    it("responde 401 si el email no existe", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "nadie@demo.com", password: "Usuario123" });

        expect(res.status).toBe(401);
        expect(res.body.error).toBe("Credenciales inválidas");
    });

    it("responde 400 si el email no tiene formato válido", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "malo", password: "Usuario123" });

        expect(res.status).toBe(400);
        expect(res.body.errores[0].path).toBe("email");
    });

    it("responde 400 si falta la contraseña", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "ana@demo.com" });

        expect(res.status).toBe(400);
        expect(res.body.errores[0].path).toBe("password");
    });

    it("responde 401 si el usuario está desactivado", async () => {
        await crearUsuario({ email: "baja@demo.com", password: "Usuario123", estado: false });

        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "baja@demo.com", password: "Usuario123" });

        expect(res.status).toBe(401);
        expect(res.body.error).toBe("Usuario desactivado");
    });

    it("responde 400 si el JSON del body está mal formado", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .set("Content-Type", "application/json")
            .send('{"email": ');

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/JSON/);
    });
});

describe("GET /api/auth/perfil", () => {
    it("responde 401 sin token", async () => {
        const res = await request(app).get("/api/auth/perfil");

        expect(res.status).toBe(401);
        expect(res.body.error).toBe("No hay token en la petición");
    });

    it("responde 401 con token inválido", async () => {
        const res = await request(app).get("/api/auth/perfil").set(auth("token-falso"));

        expect(res.status).toBe(401);
        expect(res.body.error).toBe("Token no válido o expirado");
    });

    it("devuelve el usuario autenticado con token válido", async () => {
        const usuario = await crearUsuario({ email: "ana@demo.com" });

        const res = await request(app).get("/api/auth/perfil").set(auth(tokenDe(usuario)));

        expect(res.status).toBe(200);
        expect(res.body.email).toBe("ana@demo.com");
        expect(res.body.uid).toBe(usuario.id);
    });

    it("responde 401 si el usuario del token está desactivado", async () => {
        const usuario = await crearUsuario({ estado: false });

        const res = await request(app).get("/api/auth/perfil").set(auth(tokenDe(usuario)));

        expect(res.status).toBe(401);
        expect(res.body.error).toBe("Usuario desactivado");
    });
});

describe("PUT /api/auth/perfil", () => {
    it("actualiza nombre y email del usuario autenticado", async () => {
        const usuario = await crearUsuario({ nombre: "Ana", email: "ana@demo.com" });

        const res = await request(app)
            .put("/api/auth/perfil")
            .set(auth(tokenDe(usuario)))
            .send({ nombre: "Ana María", email: "ana.maria@demo.com" });

        expect(res.status).toBe(200);
        expect(res.body.nombre).toBe("Ana María");
        expect(res.body.email).toBe("ana.maria@demo.com");
    });

    it("permite guardar el mismo email que ya tiene", async () => {
        const usuario = await crearUsuario({ email: "ana@demo.com" });

        const res = await request(app)
            .put("/api/auth/perfil")
            .set(auth(tokenDe(usuario)))
            .send({ email: "ana@demo.com" });

        expect(res.status).toBe(200);
        expect(res.body.email).toBe("ana@demo.com");
    });

    it("rechaza el email de otro usuario", async () => {
        const usuario = await crearUsuario({ email: "ana@demo.com" });
        await crearUsuario({ email: "ocupado@demo.com" });

        const res = await request(app)
            .put("/api/auth/perfil")
            .set(auth(tokenDe(usuario)))
            .send({ email: "ocupado@demo.com" });

        expect(res.status).toBe(400);
        expect(res.body.errores[0]).toEqual({ path: "email", msg: "Ese email ya está registrado" });
    });

    it("rechaza un nombre demasiado corto", async () => {
        const usuario = await crearUsuario();

        const res = await request(app)
            .put("/api/auth/perfil")
            .set(auth(tokenDe(usuario)))
            .send({ nombre: "A" });

        expect(res.status).toBe(400);
        expect(res.body.errores[0].path).toBe("nombre");
    });

    it("responde 401 sin token", async () => {
        const res = await request(app).put("/api/auth/perfil").send({ nombre: "Nuevo" });

        expect(res.status).toBe(401);
    });
});

describe("PUT /api/auth/password", () => {
    it("cambia la contraseña y permite entrar con la nueva", async () => {
        const usuario = await crearUsuario({ email: "ana@demo.com", password: "Usuario123" });

        const res = await request(app)
            .put("/api/auth/password")
            .set(auth(tokenDe(usuario)))
            .send({ passwordActual: "Usuario123", passwordNueva: "NuevaClave1" });

        expect(res.status).toBe(200);
        expect(res.body.mensaje).toBe("Contraseña actualizada");

        const login = await request(app)
            .post("/api/auth/login")
            .send({ email: "ana@demo.com", password: "NuevaClave1" });

        expect(login.status).toBe(200);
    });

    it("rechaza si la contraseña actual no es correcta", async () => {
        const usuario = await crearUsuario({ password: "Usuario123" });

        const res = await request(app)
            .put("/api/auth/password")
            .set(auth(tokenDe(usuario)))
            .send({ passwordActual: "MalaClave1", passwordNueva: "NuevaClave1" });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("La contraseña actual no es correcta");
    });

    it("rechaza que la nueva contraseña sea igual a la actual", async () => {
        const usuario = await crearUsuario({ password: "Usuario123" });

        const res = await request(app)
            .put("/api/auth/password")
            .set(auth(tokenDe(usuario)))
            .send({ passwordActual: "Usuario123", passwordNueva: "Usuario123" });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("La nueva contraseña debe ser distinta de la actual");
    });

    it("rechaza una contraseña nueva débil", async () => {
        const usuario = await crearUsuario({ password: "Usuario123" });

        const res = await request(app)
            .put("/api/auth/password")
            .set(auth(tokenDe(usuario)))
            .send({ passwordActual: "Usuario123", passwordNueva: "debil" });

        expect(res.status).toBe(400);
        expect(res.body.errores[0].path).toBe("passwordNueva");
    });
});
