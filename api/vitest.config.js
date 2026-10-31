import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: ["tests/**/*.test.js"],

        // Las pruebas de integración levantan un MongoDB en memoria.
        // Los archivos corren en secuencia para no arrancar varios a la vez.
        fileParallelism: false,
        testTimeout: 30_000,
        hookTimeout: 180_000,

        // Variables que la app espera. En tests no usamos el .env real.
        env: {
            NODE_ENV: "test",
            JWT_SECRET: "secreto",
            JWT_EXPIRA: "1h",
        },
        coverage: {
            provider: "v8",
            reporter: ["html", "text", "json-summary"],
            include: ["app.js", "controllers/**/*.js", "helpers/**/*.js", "routes/**/*.js", "models/**/*.js", "middlewares/**/*.js"],
            thresholds: {
                lines: 80,
                functions: 80,
                statements: 80,
                branches: 70,
            },
        },
    },
});
