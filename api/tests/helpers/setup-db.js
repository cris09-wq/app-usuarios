// ============================================================
// Helper de base de datos para los tests de integración.
//
// ¿Por qué una BD aparte?
//   - Los tests BORRAN las colecciones entre prueba y prueba.
//   - Cada archivo levanta su propia instancia aislada y no requiere MongoDB
//     instalado ni toca bases de datos externas.
//
// Uso en un archivo de test:
//   import { setupTestDB } from "../helpers/setup-db.js";
//   setupTestDB(); // registra beforeAll / afterEach / afterAll
// ============================================================
import { afterAll, afterEach, beforeAll } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

export function setupTestDB() {
  let mongo;

  // Se ejecuta UNA vez por archivo de test.
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create({
      binary: { version: process.env.MONGOMS_VERSION ?? "6.0.14" },
    });
    await mongoose.connect(mongo.getUri(), { serverSelectionTimeoutMS: 10_000 });
  });

  // Limpia las colecciones entre test y test para que no se contaminen.
  afterEach(async () => {
    const collections = await mongoose.connection.db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  });

  // Borra la base de datos de prueba y cierra la conexión.
  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
    await mongo?.stop();
  });
}
