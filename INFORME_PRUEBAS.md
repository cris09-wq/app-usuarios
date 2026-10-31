# Informe de pruebas automatizadas

## Alcance y entorno

Se probaron la API Express, la aplicación Vue y los flujos principales de usuario. Las pruebas API usan Vitest, Supertest y MongoDB en memoria. Las pruebas de cliente usan Vitest, Vue Test Utils y jsdom, simulando las llamadas de red. Playwright ejecuta los flujos contra la API y la web en Chromium y Firefox.

## Resultados

| Suite | Resultado |
|---|---:|
| API (Vitest + Supertest) | 95 pruebas aprobadas; 10 archivos |
| Web (Vitest + Vue Test Utils) | 111 pruebas aprobadas; 14 archivos |
| E2E (Playwright) | 18 ejecuciones aprobadas: 9 flujos en Chromium y Firefox |

Comandos de validación:

- `cd api && npm run coverage`
- `cd web && npm run coverage`
- `cd web && npm run test:run`
- `cd web && npx playwright test --config=playwright.config.js`

## Cobertura Vitest

| Proyecto | Líneas | Sentencias | Funciones | Ramas |
|---|---:|---:|---:|---:|
| API | 95,18 % | 94,41 % | 100 % | 95,18 % |
| Web | 98,79 % | 98,75 % | 95,74 % | 95,79 % |
| Umbral solicitado | 80 % | 80 % | 80 % | 70 % |

Los cuatro umbrales se cumplen en ambos proyectos. Los resúmenes JSON y capturas de las tablas generales y archivos con líneas sin cubrir están en [evidencias/coverage/](./evidencias/coverage/). Los reportes HTML completos los genera Vitest en `api/coverage/` y `web/coverage/`.

### Líneas que siguen sin cubrir

- **API:** las líneas no cubiertas de `controllers/auth.js` y `controllers/usuarios.js` corresponden principalmente a los bloques `catch` para fallos inesperados de base de datos. El flujo normal y las reglas de negocio se ejercitan mediante pruebas unitarias y de integración. `generar-jwt.js` conserva una rama de configuración alternativa sin cubrir.
- **Web:** queda una parte pequeña de `router/index.js` sin cubrir, vinculada a decisiones de redirección de sesión/ruta que no se activan en todos los flujos. Las guardas de autenticación y rol sí se prueban en la suite y en los E2E.

Las suites agregadas cubren autenticación, permisos, perfil, validaciones, operaciones CRUD, componentes, composables, servicios y navegación. Las ramas residuales son casos defensivos o alternos; no se bajaron los umbrales ni se excluyó código para alcanzar los porcentajes.

## Flujos E2E

Se automatizaron nueve flujos: credenciales incorrectas, registro, redirección sin sesión, restricciones por rol, creación/búsqueda/edición, borrado lógico y bloqueo de login, filtro/paginación, cambio de contraseña con nuevo login y ruta 404. La configuración genera el reporte HTML de Playwright en `web/playwright-report/` y evidencia de fallos en `web/test-results/`.

## TestSprite

TestSprite queda pendiente: no está disponible un servidor MCP de TestSprite conectado en este entorno ni se proporcionó una clave configurada. Por tanto, no se generaron planes, casos o reportes de TestSprite y no se presentan resultados como si se hubiera ejecutado. Para completar este punto, configurar el MCP y la clave de forma local (sin subirla al repositorio), ejecutar una prueba backend y otra frontend, y guardar sus reportes en `evidencias/testsprite/api/` y `evidencias/testsprite/web/`.
