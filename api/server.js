import "dotenv/config";
import { pathToFileURL } from "node:url";
import app from "./app.js";
import { dbConnection } from "./database/config.js";
import { crearAdminInicial } from "./database/seed.js";

export async function iniciarServidor() {
  await dbConnection();
  const admin = await crearAdminInicial();
  if (admin) console.log(`Administrador inicial creado: ${admin.email}`);

  const puerto = process.env.PUERTO ?? 3000;
  const server = app.listen(puerto, () => {
    console.log(`API en http://localhost:${puerto}/api`);
  });

  server.on("error", (error) => {
    console.log(`No se pudo usar el puerto ${puerto}:`, error.message);
    process.exitCode = 1;
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  iniciarServidor().catch((error) => {
    console.log("No se pudo iniciar:", error.message);
    process.exitCode = 1;
  });
}
