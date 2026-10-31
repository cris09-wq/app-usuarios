// ============================================================
// PRUEBAS DE INTEGRACIÓN: CRUD de usuarios (solo admin)
//
// Antes de cada test creamos un admin y un usuario normal.
// El admin es quien puede listar/crear/editar/eliminar.
// ============================================================
import mongoose from "mongoose";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../../app.js";
import { setupTestDB } from "../helpers/setup-db.js";
import { crearAdminYUsuario, crearUsuario, auth } from "../helpers/fixtures.js";

setupTestDB();

describe("CRUD de usuarios", () => {
    let admin;
    let usuario;
    let adminToken;
    let usuarioToken;

    beforeEach(async () => {
        ({ admin, usuario, adminToken, usuarioToken } = await crearAdminYUsuario());
    });

    describe("control de acceso", () => {
        it("responde 401 sin token", async () => {
            const res = await request(app).get("/api/usuarios");

            expect(res.status).toBe(401);
        });

        it("responde 403 si el usuario no es admin", async () => {
            const res = await request(app).get("/api/usuarios").set(auth(usuarioToken));

            expect(res.status).toBe(403);
        });

        it("responde 401 con un token inválido", async () => {
            const res = await request(app).get("/api/usuarios").set(auth("basura"));

            expect(res.status).toBe(401);
        });
    });

    describe("GET /api/usuarios (listado)", () => {
        it("lista solo usuarios activos con metadatos de paginación", async () => {
            await crearUsuario({ nombre: "Baja", email: "baja@demo.com", estado: false });

            const res = await request(app).get("/api/usuarios").set(auth(adminToken));

            expect(res.status).toBe(200);
            expect(res.body.total).toBe(2); // admin + usuario (el inactivo no cuenta)
            expect(res.body.pagina).toBe(1);
            expect(res.body.limite).toBe(10);
            expect(res.body.totalPaginas).toBe(1);
            expect(res.body.usuarios.map((u) => u.email)).not.toContain("baja@demo.com");
        });

        it("filtra por rol", async () => {
            const res = await request(app).get("/api/usuarios?rol=admin").set(auth(adminToken));

            expect(res.status).toBe(200);
            expect(res.body.total).toBe(1);
            expect(res.body.usuarios[0].rol).toBe("admin");
        });

        it("busca por nombre o email (sin distinguir mayúsculas)", async () => {
            const res = await request(app).get("/api/usuarios?buscar=ANA").set(auth(adminToken));

            expect(res.status).toBe(200);
            expect(res.body.total).toBe(1);
            expect(res.body.usuarios[0].email).toBe("ana@demo.com");
        });

        it("pagina los resultados", async () => {
            await crearUsuario({ nombre: "Bruno Díaz", email: "bruno@demo.com" });
            await crearUsuario({ nombre: "Carla Paz", email: "carla@demo.com" });

            const res = await request(app)
                .get("/api/usuarios?pagina=2&limite=2")
                .set(auth(adminToken));

            expect(res.status).toBe(200);
            expect(res.body.total).toBe(4);
            expect(res.body.totalPaginas).toBe(2);
            expect(res.body.usuarios).toHaveLength(2);
            expect(res.body.pagina).toBe(2);
        });

        it("ordena alfabéticamente por nombre", async () => {
            await crearUsuario({ nombre: "Zoe Ruiz", email: "zoe@demo.com" });

            const res = await request(app).get("/api/usuarios").set(auth(adminToken));
            const nombres = res.body.usuarios.map((u) => u.nombre);

            expect(nombres).toEqual([...nombres].sort((a, b) => a.localeCompare(b, "es")));
        });

        it("rechaza pagina=0", async () => {
            const res = await request(app).get("/api/usuarios?pagina=0").set(auth(adminToken));

            expect(res.status).toBe(400);
            expect(res.body.errores[0].path).toBe("pagina");
        });

        it("rechaza un límite mayor de 50", async () => {
            const res = await request(app).get("/api/usuarios?limite=100").set(auth(adminToken));

            expect(res.status).toBe(400);
            expect(res.body.errores[0].path).toBe("limite");
        });

        it("rechaza un rol inexistente", async () => {
            const res = await request(app).get("/api/usuarios?rol=jefe").set(auth(adminToken));

            expect(res.status).toBe(400);
            expect(res.body.errores[0].path).toBe("rol");
        });
    });

    describe("GET /api/usuarios/:id", () => {
        it("devuelve el usuario por id", async () => {
            const res = await request(app).get(`/api/usuarios/${usuario.id}`).set(auth(adminToken));

            expect(res.status).toBe(200);
            expect(res.body.email).toBe("ana@demo.com");
        });

        it("responde 400 si el id no es un ObjectId válido", async () => {
            const res = await request(app).get("/api/usuarios/123").set(auth(adminToken));

            expect(res.status).toBe(400);
            expect(res.body.errores[0].path).toBe("id");
        });

        it("responde 404 si el usuario no existe", async () => {
            const id = new mongoose.Types.ObjectId().toString();

            const res = await request(app).get(`/api/usuarios/${id}`).set(auth(adminToken));

            expect(res.status).toBe(404);
            expect(res.body.error).toBe("Usuario no encontrado");
        });

        it("responde 404 si el usuario está desactivado", async () => {
            const baja = await crearUsuario({ email: "baja@demo.com", estado: false });

            const res = await request(app).get(`/api/usuarios/${baja.id}`).set(auth(adminToken));

            expect(res.status).toBe(404);
        });
    });

    describe("POST /api/usuarios (crear)", () => {
        const nuevo = { nombre: "Nuevo Admin", email: "nuevo@demo.com", password: "Clave1234", rol: "admin" };

        it("crea un usuario con el rol indicado", async () => {
            const res = await request(app).post("/api/usuarios").set(auth(adminToken)).send(nuevo);

            expect(res.status).toBe(201);
            expect(res.body.email).toBe("nuevo@demo.com");
            expect(res.body.rol).toBe("admin");
            expect(res.body.uid).toBeDefined();
        });

        it("usa rol usuario por defecto", async () => {
            const { rol, ...sinRol } = nuevo;

            const res = await request(app).post("/api/usuarios").set(auth(adminToken)).send(sinRol);

            expect(res.status).toBe(201);
            expect(res.body.rol).toBe("usuario");
        });

        it("rechaza un email duplicado", async () => {
            const res = await request(app)
                .post("/api/usuarios")
                .set(auth(adminToken))
                .send({ ...nuevo, email: "ana@demo.com" });

            expect(res.status).toBe(400);
            expect(res.body.errores[0].path).toBe("email");
        });

        it("rechaza una contraseña débil", async () => {
            const res = await request(app)
                .post("/api/usuarios")
                .set(auth(adminToken))
                .send({ ...nuevo, password: "1234" });

            expect(res.status).toBe(400);
            expect(res.body.errores[0].path).toBe("password");
        });

        it("rechaza un rol inexistente", async () => {
            const res = await request(app)
                .post("/api/usuarios")
                .set(auth(adminToken))
                .send({ ...nuevo, rol: "superadmin" });

            expect(res.status).toBe(400);
            expect(res.body.errores[0].path).toBe("rol");
        });
    });

    describe("PUT /api/usuarios/:id (actualizar)", () => {
        it("actualiza el nombre", async () => {
            const res = await request(app)
                .put(`/api/usuarios/${usuario.id}`)
                .set(auth(adminToken))
                .send({ nombre: "Ana Actualizada" });

            expect(res.status).toBe(200);
            expect(res.body.nombre).toBe("Ana Actualizada");
        });

        it("actualiza la contraseña y permite entrar con ella", async () => {
            const res = await request(app)
                .put(`/api/usuarios/${usuario.id}`)
                .set(auth(adminToken))
                .send({ password: "OtraClave1" });

            expect(res.status).toBe(200);

            const login = await request(app)
                .post("/api/auth/login")
                .send({ email: "ana@demo.com", password: "OtraClave1" });

            expect(login.status).toBe(200);
        });

        it("impide que el admin cambie su propio rol", async () => {
            const res = await request(app)
                .put(`/api/usuarios/${admin.id}`)
                .set(auth(adminToken))
                .send({ rol: "usuario" });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe("No puedes cambiar tu propio rol");
        });

        it("rechaza usar el email de otro usuario", async () => {
            const res = await request(app)
                .put(`/api/usuarios/${usuario.id}`)
                .set(auth(adminToken))
                .send({ email: "admin@demo.com" });

            expect(res.status).toBe(400);
            expect(res.body.errores[0].path).toBe("email");
        });

        it("responde 404 si el usuario no existe", async () => {
            const id = new mongoose.Types.ObjectId().toString();

            const res = await request(app)
                .put(`/api/usuarios/${id}`)
                .set(auth(adminToken))
                .send({ nombre: "Nadie" });

            expect(res.status).toBe(404);
        });

        it("responde 400 si el id no es válido", async () => {
            const res = await request(app)
                .put("/api/usuarios/abc")
                .set(auth(adminToken))
                .send({ nombre: "Nadie" });

            expect(res.status).toBe(400);
        });
    });

    describe("DELETE /api/usuarios/:id (borrado lógico)", () => {
        it("desactiva al usuario y ya no puede iniciar sesión", async () => {
            const res = await request(app)
                .delete(`/api/usuarios/${usuario.id}`)
                .set(auth(adminToken));

            expect(res.status).toBe(200);
            expect(res.body.mensaje).toBe("Usuario eliminado");

            const login = await request(app)
                .post("/api/auth/login")
                .send({ email: "ana@demo.com", password: "Usuario123" });

            expect(login.status).toBe(401);
            expect(login.body.error).toBe("Usuario desactivado");
        });

        it("el usuario eliminado deja de aparecer en el listado", async () => {
            await request(app).delete(`/api/usuarios/${usuario.id}`).set(auth(adminToken));

            const res = await request(app).get("/api/usuarios").set(auth(adminToken));

            expect(res.body.usuarios.map((u) => u.email)).not.toContain("ana@demo.com");
        });

        it("impide que el admin se elimine a sí mismo", async () => {
            const res = await request(app)
                .delete(`/api/usuarios/${admin.id}`)
                .set(auth(adminToken));

            expect(res.status).toBe(400);
            expect(res.body.error).toBe("No puedes eliminar tu propia cuenta");
        });

        it("responde 404 si el usuario no existe", async () => {
            const id = new mongoose.Types.ObjectId().toString();

            const res = await request(app).delete(`/api/usuarios/${id}`).set(auth(adminToken));

            expect(res.status).toBe(404);
        });

        it("responde 400 si el id no es válido", async () => {
            const res = await request(app).delete("/api/usuarios/xyz").set(auth(adminToken));

            expect(res.status).toBe(400);
        });
    });
});
