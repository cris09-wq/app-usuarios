// ============================================================
// Fixtures: datos de prueba reutilizables.
// "Fixture" = un objeto de ejemplo listo para usar en los tests.
// ============================================================
import Usuario from "../../models/usuario.js";
import { generarJWT } from "../../helpers/generar-jwt.js";

// Crea un usuario REAL en la BD de prueba (dispara el hash del modelo).
export async function crearUsuario({
    nombre = "Ana Torres",
    email = "ana@demo.com",
    password = "Usuario123",
    rol = "usuario",
    estado = true,
} = {}) {
    const usuario = new Usuario({ nombre, email, password, rol, estado });
    await usuario.save();
    return usuario;
}

// Genera el token que viajaría en el header x-token.
export const tokenDe = (usuario) => generarJWT(usuario);

// Cabecera de autenticación lista para Supertest.
export const auth = (token) => ({ "x-token": token });

// Admin + usuario normal ya creados y con token. Muy útil en integración.
export async function crearAdminYUsuario() {
    const admin = await crearUsuario({
        nombre: "Admin Principal",
        email: "admin@demo.com",
        password: "Admin123!",
        rol: "admin",
    });
    const usuario = await crearUsuario({
        nombre: "Ana Torres",
        email: "ana@demo.com",
        password: "Usuario123",
        rol: "usuario",
    });

    return {
        admin,
        usuario,
        adminToken: tokenDe(admin),
        usuarioToken: tokenDe(usuario),
    };
}
