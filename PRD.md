# Requisitos de la App de usuarios

## Alcance

Aplicación con API REST Express y cliente Vue. La API ofrece registro e inicio de sesión, consulta y edición del perfil, cambio de contraseña y administración de usuarios. La web consume la API, conserva la sesión en `localStorage` y protege páginas según autenticación y rol.

## API

- `POST /api/auth/registro`: crea cuentas con rol `usuario`; la contraseña debe tener al menos 8 caracteres, mayúscula, minúscula y número.
- `POST /api/auth/login`: autentica cuentas activas y devuelve token y usuario.
- `GET /api/auth/perfil` y `PUT /api/auth/perfil`: consultar y actualizar el perfil autenticado.
- `PUT /api/auth/password`: cambiar contraseña con verificación de la contraseña actual.
- `/api/usuarios`: CRUD administrativo, búsqueda por nombre/email, filtro por rol y paginación.
- Las rutas protegidas requieren el token `x-token`. Solo `admin` puede administrar usuarios.
- Los usuarios se desactivan con borrado lógico. Un administrador no puede cambiar su propio rol ni eliminarse a sí mismo.
- Las respuestas públicas nunca incluyen la contraseña ni su hash.

## Web

- Las cuentas no autenticadas pueden iniciar sesión o registrarse.
- Todo usuario autenticado puede consultar/editar su perfil y cambiar su contraseña.
- Solo administradores pueden acceder a la lista y al CRUD de usuarios.
- Usuarios de prueba del seed: `admin@demo.com` / `Admin123!` y `ana@demo.com` / `Usuario123`.
