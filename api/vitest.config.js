import {defineConfig} from "vitest/config"

export default defineConfig({
    test:{
        environment: "node",
        include: ["tests//**/*.test.js"],
        env:{
            NODE_ENV: "test",
            JWT_SECRET: "secreto",
            JWT_EXPIRA: "1h"
        },
        hookTimeout: 60_000, 
        coverage:{
            provider: "v8",
            reporter: ["html", "text"],
            include: ["controllers/**", "helpers/**", "routes/**", "models/**", "middlewares/**"]
        }
    }
})